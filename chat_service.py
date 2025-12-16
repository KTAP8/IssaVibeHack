import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

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
You must return a **single JSON object** containing the full, updated text of the new system prompt.
{
  "prompt": "FULL_UPDATED_SYSTEM_PROMPT_HERE"
}
"""

MANUAL_EDITOR_PROMPT = """You are an expert AI Prompt Engineer. Your goal is to refine the "System Instructions" for a customer support chatbot based on specific user instructions.

You will be provided with:
1. **Current System Prompt:** The instructions currently governing the AI.
2. **User Instructions:** Specific directives on how to change the behavior (e.g., "Be more concise", "Add a rule about timeouts").

### Your Task
Rewrite the **Current System Prompt** to incorporate the **User Instructions** while maintaining the existing structure and critical rules.

### Output Format
You must return a **single JSON object** containing the full, updated text of the new system prompt.
{
  "prompt": "FULL_UPDATED_SYSTEM_PROMPT_HERE"
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
        response = supabase.table("system_prompt").select("prompt").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            prompt = row.get("prompt")
            if prompt:
                CACHED_SYSTEM_PROMPT = prompt
                return prompt
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
    
    return DEFAULT_SYSTEM_PROMPT

def update_system_prompt(new_prompt):
    global CACHED_SYSTEM_PROMPT
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: Cannot update Supabase (missing credentials).")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Check if a row exists
        response = supabase.table("system_prompt").select("id").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            row_id = response.data[0]['id']
            supabase.table("system_prompt").update({"prompt": new_prompt}).eq("id", row_id).execute()
            print(f"Successfully updated system prompt in Supabase (ID: {row_id}).")
        else:
            supabase.table("system_prompt").insert({"prompt": new_prompt}).execute()
            print("Successfully inserted new system prompt into Supabase.")
            
        # Update cache
        CACHED_SYSTEM_PROMPT = new_prompt

    except Exception as e:
        print(f"Error updating Supabase: {e}")

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
    model = genai.GenerativeModel("gemini-flash-latest")
    
    prompt_input = {
        "chat_history": chat_history,
        "incoming_messages": [client_message]
    }
    
    full_prompt = f"{system_prompt}\n\nInput:\n{json.dumps(prompt_input, indent=2)}"
    
    try:
        response = model.generate_content(full_prompt)
        text_response = response.text
        
        # Cleanup
        if text_response.startswith("```json"):
            text_response = text_response.strip("```json").strip("```")
        elif text_response.startswith("```"):
             text_response = text_response.strip("```")
             
        try:
            response_json = json.loads(text_response)
            return response_json.get("reply", text_response)
        except json.JSONDecodeError:
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
    model = genai.GenerativeModel("gemini-flash-latest")

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
        response = model.generate_content(full_editor_prompt)
        text_resp = response.text
        
        # Cleanup
        if text_resp.startswith("```json"):
            text_resp = text_resp.strip("```json").strip("```")
        elif text_resp.startswith("```"):
            text_resp = text_resp.strip("```")
            
        result = json.loads(text_resp)
        new_prompt = result.get("prompt")
        
        if new_prompt and new_prompt != current_prompt:
            update_system_prompt(new_prompt)
            return new_prompt
        
        return current_prompt

    except Exception as e:
        print(f"Error during prompt optimization: {e}")
        return current_prompt

def update_system_prompt_with_instructions(instructions):
    """
    Manually updates the prompt based on instructions.
    """
    if not GEMINI_API_KEY:
        return None

    current_prompt = get_system_prompt()
    model = genai.GenerativeModel("gemini-flash-latest")
    
    input_text = f"""
1. **Current System Prompt:**
{current_prompt}

2. **User Instructions:**
{instructions}
"""
    
    full_prompt = f"{MANUAL_EDITOR_PROMPT}\n\n{input_text}"
    
    try:
        response = model.generate_content(full_prompt)
        text_resp = response.text
        
        # Cleanup
        if text_resp.startswith("```json"):
            text_resp = text_resp.strip("```json").strip("```")
        elif text_resp.startswith("```"):
            text_resp = text_resp.strip("```")
            
        result = json.loads(text_resp)
        new_prompt = result.get("prompt")
        
        if new_prompt and new_prompt != current_prompt:
            update_system_prompt(new_prompt)
            return new_prompt
        
        return current_prompt
        
    except Exception as e:
        print(f"Error manual prompt update: {e}")
        return current_prompt
