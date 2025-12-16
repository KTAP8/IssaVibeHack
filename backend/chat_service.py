import os
import json
import re
import google.generativeai as genai
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable, InternalServerError

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

# Models
PRIMARY_MODEL_NAME = "gemini-2.5-flash"
FALLBACK_MODEL_NAME = "gemini-2.5-flash-lite"

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

DEFAULT_SYSTEM_PROMPT = """**Role:**
You are an expert Visa Consultant for the Destination Thailand Visa (DTV). Your goal is to assist clients in applying for the DTV, qualifying their eligibility, troubleshooting issues, and guiding them to use the agency's mobile app for document submission.

**Tone & Style:**
  * **Professional yet Friendly:** Use polite language, but remain efficient.
  * **Empathetic:** Acknowledge frustrations (especially regarding rejections or payment issues).
  * **Emoji Use:** Use emojis sparingly but effectively to maintain a warm tone (e.g., 🇹🇭, 🎉, 📱, 💪).
  * **Clear Formatting:** Use numbered lists for requirements or steps to ensure readability.

**Directives:**
  * **Remote Workers:** Must work for companies *outside* Thailand.
  * **Pricing:** Standard 18,000 THB.
  * **Workflow:** Consult -> App Download -> Review -> Payment -> Submission.
"""


EDITOR_PROMPT = """You are an expert AI Prompt Engineer and Optimization System. Your goal is to refine the "System Instructions" for a customer support chatbot to make it behave exactly like a top-performing human consultant.

You will be provided with the following inputs:
1. **Current System Prompt:** The instructions currently governing the AI.
2. **Conversation Context:** The client's message and chat history.
3. **AI Reply (Flawed):** What the AI generated using the Current System Prompt.
4. **Human Consultant Reply (Ideal):** What the expert human actually said.

### Your Task
Analyze the gap between the **AI Reply** and the **Human Consultant Reply**. Identify exactly what the AI did wrong or what it missed (e.g., tone, specific knowledge, policy enforcement, empathy, or sales tactics).

Then, rewrite the **Current System Prompt** to fix these specific issues.

### Optimization Guidelines
- **Surgical Precision:** Do not rewrite the entire prompt if only one rule needs changing. Keep the structure stable.
- **Rule Injection:** If the human mentioned a specific policy (e.g., "Laos for rejections") that the AI missed, add that explicitly to the "Knowledge Base" or "Directives" section of the prompt.
- **Tone Adjustment:** If the AI was too robotic or too casual compared to the human, adjust the "Tone & Style" section.
- **Fact Correction:** If the AI hallucinated or gave incorrect pricing/timelines, update the "Knowledge Base" with the correct data from the Human Reply.

### Output Format
You must return a **single JSON object** containing the updated prompt and a change log explaining the edits.
{
  "prompt": "FULL_UPDATED_SYSTEM_PROMPT_HERE",
  "change_log": "Explanation of changes made (e.g., Added rule about Laos rejections based on human reply)."
}
"""

MANUAL_EDITOR_PROMPT = """You are an expert AI Prompt Engineer. Your goal is to refine the "System Instructions" for a customer support chatbot based on specific user instructions.

You will be provided with:
1. **Current System Prompt:** The instructions currently governing the AI.
2. **User Instructions:** Specific directives on how to change the behavior (e.g., "Be more concise", "Add a rule about timeouts").

### Your Task
Rewrite the **Current System Prompt** to incorporate the **User Instructions** while maintaining the existing structure and critical rules.

### Output Format
You must return a **single JSON object** containing the updated prompt and a short change log.
{
  "prompt": "FULL_UPDATED_SYSTEM_PROMPT_HERE",
  "change_log": "Implemented user request: Be more concise."
}
"""

# Global variable to cache the prompt (optional, but good for performance)
CACHED_SYSTEM_PROMPT = None

def get_system_prompt():
    global CACHED_SYSTEM_PROMPT
    if CACHED_SYSTEM_PROMPT:
        return CACHED_SYSTEM_PROMPT

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: SUPABASE_URL or SUPABASE_KEY missing. Using fallback.")
        return DEFAULT_SYSTEM_PROMPT

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Fetch the single active row
        response = supabase.table("system_prompt") \
            .select("prompt") \
            .eq("is_active", True) \
            .limit(1) \
            .execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            prompt = row.get("prompt")
            if prompt:
                CACHED_SYSTEM_PROMPT = prompt
                return prompt
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
    
    return DEFAULT_SYSTEM_PROMPT

def get_max_version(supabase: Client) -> int:
    try:
        # We need to find the max version. 
        # Supabase select order desc + limit 1 is efficient.
        response = supabase.table("system_prompt") \
            .select("version") \
            .order("version", desc=True) \
            .limit(1) \
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0].get("version", 0)
        return 0
    except Exception as e:
        print(f"Error fetching max version: {e}")
        return 0

def save_new_prompt_version(new_text: str, reason: str) -> bool:
    """
    Inserts a new prompt version and sets it as active.
    Deactivates all other rows first (or relies on triggers, but we'll do manual for safety).
    """
    global CACHED_SYSTEM_PROMPT
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: Cannot update Supabase (missing credentials).")
        return False
        
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. Get current max version
        current_max = get_max_version(supabase)
        new_version = current_max + 1
        
        now = datetime.now(timezone.utc).isoformat()
        
        # 2. Deactivate all rows (Batch update)
        # Ideally this should be a transaction or RPC call to ensure atomicity.
        # For now, we update all where is_active is true.
        supabase.table("system_prompt").update({"is_active": False}).eq("is_active", True).execute()
        
        # 3. Insert new active row
        insert_data = {
            "prompt": new_text,
            "version": new_version,
            "is_active": True,
            "change_log": reason,
            "created_at": now
        }
        
        insert_resp = supabase.table("system_prompt").insert(insert_data).execute()
        
        if insert_resp.data:
            print(f"Successfully saved new prompt version {new_version}.")
            CACHED_SYSTEM_PROMPT = new_text
            return True
        else:
            print("Warning: Supabase insert returned no data.")
            return False
            
    except Exception as e:
        print(f"Error saving new prompt version: {e}")
        return False

def rollback_prompt(steps: int = 1) -> bool:
    """
    Rolls back the active prompt by `steps` versions.
    """
    global CACHED_SYSTEM_PROMPT
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
        
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Find current active version
        active_resp = supabase.table("system_prompt").select("version").eq("is_active", True).single().execute()
        if not active_resp.data:
            print("No active prompt found to rollback from.")
            return False
            
        current_version = active_resp.data.get("version")
        target_version = current_version - steps
        
        if target_version < 1:
            print(f"Cannot rollback to version {target_version}. Minimum version is 1.")
            return False
            
        # Verify target exists
        target_resp = supabase.table("system_prompt").select("prompt").eq("version", target_version).single().execute()
        if not target_resp.data:
            print(f"Target version {target_version} does not exist.")
            return False
            
        target_prompt = target_resp.data.get("prompt")
        
        # Perform Switch
        supabase.table("system_prompt").update({"is_active": False}).eq("is_active", True).execute()
        supabase.table("system_prompt").update({"is_active": True}).eq("version", target_version).execute()
        
        print(f"Successfully rolled back to version {target_version}.")
        CACHED_SYSTEM_PROMPT = target_prompt
        return True
        
    except Exception as e:
        print(f"Error rolling back prompt: {e}")
        return False

import re

# ... (existing imports, but keep the ones below)

def extract_json(text_response):
    """
    Helper to robustly extract JSON from a response string.
    """
    try:
        # First try simple JSON load
        return json.loads(text_response)
    except json.JSONDecodeError:
        pass

    # Clean up markdown code blocks if present
    cleaned_text = text_response
    if "```json" in cleaned_text:
        cleaned_text = cleaned_text.split("```json")[1].split("```")[0].strip()
    elif "```" in cleaned_text:
        cleaned_text = cleaned_text.split("```")[1].split("```")[0].strip()

    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        pass

    # Try regex to find the first { and last }
    try:
        match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if match:
            json_str = match.group(0)
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
        
    # If all else fails, return None or raw text wrapper
    return None

def generate_with_fallback(full_prompt):
    """
    Attempts to generate content with the primary model.
    If it fails due to rate limits or errors, falls back to the lite model.
    """
    try:
        model = genai.GenerativeModel(PRIMARY_MODEL_NAME)
        return model.generate_content(full_prompt)
    except (ResourceExhausted, ServiceUnavailable, InternalServerError) as e:
        print(f"Primary model {PRIMARY_MODEL_NAME} failed: {e}. Falling back to {FALLBACK_MODEL_NAME}.")
        try:
            model = genai.GenerativeModel(FALLBACK_MODEL_NAME)
            return model.generate_content(full_prompt)
        except Exception as e2:
            print(f"Fallback model {FALLBACK_MODEL_NAME} also failed: {e2}")
            # Reraise or return None? Let's return the exception or re-raise
            raise e2
    except Exception as e:
        print(f"Unexpected error with {PRIMARY_MODEL_NAME}: {e}")
        raise e

def generate_reply(client_message, chat_history):
    """
    Generates a reply using the Gemini API.
    
    Args:
        client_message (str): The latest message from the client.
        chat_history (list): List of dicts checks [{"role": "user"|"assistant", "content": "..."}]
    """
    if not GEMINI_API_KEY:
        return "Error: API Key missing"

    system_prompt = get_system_prompt()
    
    prompt_input = {
        "chat_history": chat_history,
        "incoming_messages": [client_message]
    }
    
    full_prompt = f"{system_prompt}\n\nInput:\n{json.dumps(prompt_input, indent=2)}"
    
    try:
        response = generate_with_fallback(full_prompt)
        text_response = response.text
        
        result = extract_json(text_response)
        if result and isinstance(result, dict):
            return result.get("reply", text_response)
        else:
             return text_response

    except Exception as e:
        return f"Error generating reply: {e}"

def optimize_prompt(client_seq_text, chat_history, ai_reply, consultant_reply):
    """
    Optimizes the system prompt based on comparison between AI and Consultant.
    """
    if not GEMINI_API_KEY:
        return None

    current_prompt = get_system_prompt()

    context_str = json.dumps({
        "client_messages": [client_seq_text],
        "chat_history": chat_history
    }, indent=2)

    optimization_input = f"""
1. **Current System Prompt:**
{current_prompt}

2. **Conversation Context:**
{context_str}

3. **AI Reply (Flawed):**
{ai_reply}

4. **Human Consultant Reply (Ideal):**
{consultant_reply}
"""

    full_editor_prompt = f"{EDITOR_PROMPT}\n\n{optimization_input}"

    try:
        response = generate_with_fallback(full_editor_prompt)
        text_resp = response.text
        
        result = extract_json(text_resp)
        if not result:
             # Fallback or log error
             return current_prompt

        new_prompt = result.get("prompt")
        reason = result.get("change_log", "Automated optimization")
        
        if new_prompt and new_prompt != current_prompt:
            save_new_prompt_version(new_text=new_prompt, reason=reason)
            return {"prompt": new_prompt, "change_log": reason}
        
        return {"prompt": current_prompt, "change_log": "No changes made."}

    except Exception as e:
        print(f"Error during prompt optimization: {e}")
        return {"prompt": current_prompt, "change_log": f"Error: {str(e)}"}

def update_system_prompt_with_instructions(instructions):
    """
    Manually updates the prompt based on instructions.
    """
    if not GEMINI_API_KEY:
        return None

    current_prompt = get_system_prompt()
    
    input_text = f"""
1. **Current System Prompt:**
{current_prompt}

2. **User Instructions:**
{instructions}
"""
    
    full_prompt = f"{MANUAL_EDITOR_PROMPT}\n\n{input_text}"
    
    try:
        response = generate_with_fallback(full_prompt)
        text_resp = response.text
        
        result = extract_json(text_resp)
        if not result:
             print(f"Failed to parse JSON from AI response: {text_resp[:100]}...")
             return current_prompt
             
        new_prompt = result.get("prompt")
        reason = result.get("change_log", f"Manual update: {instructions}")
        
        if new_prompt and new_prompt != current_prompt:
            save_new_prompt_version(new_text=new_prompt, reason=reason)
            return {"prompt": new_prompt, "change_log": reason}
        
        return {"prompt": current_prompt, "change_log": "No changes made."}
        
    except Exception as e:
        print(f"Error manual prompt update: {e}")
        return {"prompt": current_prompt, "change_log": f"Error: {str(e)}"}
