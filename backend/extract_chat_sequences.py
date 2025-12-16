import json
import os
import google.generativeai as genai
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

# Debug prints removed
    
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY not found in .env file.")

# default prompt as fallback
DEFAULT_SYSTEM_PROMPT = """**Role:**
You are an expert Visa Consultant for the Destination Thailand Visa (DTV). Your goal is to assist clients in applying for the DTV, qualifying their eligibility, troubleshooting issues, and guiding them to use the agency's mobile app for document submission.

**Tone & Style:**

  * **Professional yet Friendly:** Use polite language, but remain efficient.
  * **Empathetic:** Acknowledge frustrations (especially regarding rejections or payment issues).
  * **Emoji Use:** Use emojis sparingly but effectively to maintain a warm tone (e.g., 🇹🇭, 🎉, 📱, 💪).
  * **Clear Formatting:** Use numbered lists for requirements or steps to ensure readability.

**Knowledge Base (Strict Adherence Required):**

1.  **Visa Eligibility & Rules:**

      * **Remote Workers:** Must work for companies *outside* Thailand. Cannot have Thai clients or bill Thai entities.
      * **Soft Power:** Muay Thai and Cooking classes require a course enrollment of at least 6 months.
      * **Freelancers:** Must prove income and location independence. No Thai clients allowed.
      * **Location:** Applicants *must* be outside Thailand to apply. Tourist visas cannot be converted inside the country.

2.  **Financial Requirements:**

      * **Bank Balance:** Must show 500,000 THB (~$15,000 USD/20,000 SGD) equivalent.
      * **Retention:** Funds should ideally be held for 3 months prior to application.
      * **Asset Types:** Cash in bank only. Crypto and Stocks are *not* accepted as primary proof.

3.  **Pricing & Service Fees:**

      * **Standard (Malaysia, Vietnam, Indonesia, Singapore, etc.):** 18,000 THB (includes government fees).
      * **Laos (Rejection/Difficult Cases):** 5,000 THB Service Fee (paid to agency) + 10,000 THB Government Fee (paid in cash at embassy). Total approx 15,000-18,000 THB.
      * **Refunds:** Money-back guarantee applies if rejected (exceptions apply for Taiwan or specific high-risk cases).

4.  **Processing Times:**

      * **Standard:** 10-14 business days.
      * **Laos:** ~2 weeks (requires in-person interview).
      * **Urgent:** Can be expedited by flying to Malaysia/Vietnam immediately if documents are ready.

5.  **Application Workflow:**

      * Step 1: Consult & Qualify.
      * Step 2: User downloads App and uploads documents for free review.
      * Step 3: Legal team reviews.
      * Step 4: Payment (Bank Transfer or Card).
      * Step 5: Submission.

**Input Format:**
You will receive a JSON object containing:

  * `client_profile`: (Optional) Known details about the user (e.g., nationality, current location).
  * `chat_history`: An array of previous message objects `{"role": "user"|"assistant", "content": "..."}`.
  * `incoming_messages`: An array of new strings sent by the user (treat these as a single block of thought).

**Output Format:**
Return a **single JSON object** containing the key `reply`.
Example: `{"reply": "Hello! I can certainly help with that..."}`

**Directives:**

  * If the user is new, always ask for their **Nationality** and **Current Location** to determine the best application strategy.
  * If a user mentions a rejection, suggest **Laos** as the solution.
  * If a user asks about payment, encourage them to wait for the **free document review** in the app first.
  * If the user has technical document issues (e.g., address proof), suggest alternatives like driver's licenses or gov letters."""


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

def get_system_prompt():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: SUPABASE_URL or SUPABASE_PUBLISHABLE_DEFAULT_KEY not found. Using fallback prompt.")
        return DEFAULT_SYSTEM_PROMPT

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Fetch the most recent prompt (or just the first one)
        response = supabase.table("system_prompt").select("prompt").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            prompt = row.get("prompt")
            if prompt:
                print("Successfully fetched system prompt from Supabase.")
                return prompt
            else:
                print("Warning: Retrieved row from 'system_prompt' but 'prompt' column was empty/null. Using fallback.")
                return DEFAULT_SYSTEM_PROMPT
        else:
            print("Warning: 'system_prompt' table is empty. Using fallback.")
            return DEFAULT_SYSTEM_PROMPT

    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
        return DEFAULT_SYSTEM_PROMPT

def update_system_prompt(new_prompt):
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

    except Exception as e:
        print(f"Error updating Supabase: {e}")

SYSTEM_PROMPT = get_system_prompt()

def extract_sequences(file_path):
    """
    Extracts chat sequences from a JSON file.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return []

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            conversations = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        return []

    results = []

    for conv in conversations:
        messages = conv.get('conversation', [])
        messages.sort(key=lambda x: x.get('timestamp', 0))

        history = []
        i = 0
        n = len(messages)

        while i < n:
            current_msg = messages[i]
            
            if current_msg.get('direction') == 'in':
                client_seq = []
                while i < n and messages[i].get('direction') == 'in':
                    client_seq.append(messages[i])
                    i += 1
                
                if i < n and messages[i].get('direction') == 'out':
                    consultant_seq = []
                    while i < n and messages[i].get('direction') == 'out':
                        consultant_seq.append(messages[i])
                        i += 1
                    
                    results.append({
                        'client_sequence': client_seq,
                        'consultant_reply_sequence': consultant_seq,
                        'history': list(history)
                    })
                    
                    history.extend(client_seq)
                    history.extend(consultant_seq)
                else:
                    history.extend(client_seq)
            else:
                history.append(current_msg)
                i += 1
                
    return results

def format_history_for_prompt(history):
    formatted = []
    for msg in history:
        role = "user" if msg['direction'] == 'in' else "assistant"
        formatted.append({"role": role, "content": msg['text']})
    return formatted

def generate_ai_reply(client_seq, history, current_system_prompt):
    if not GEMINI_API_KEY:
        return "Error: API Key missing"

    # Using gemini-flash-latest with manual retry/error handling context if needed
    model = genai.GenerativeModel("gemini-flash-latest")
    
    formatted_history = format_history_for_prompt(history)
    incoming_messages = [msg['text'] for msg in client_seq]
    
    prompt_input = {
        "chat_history": formatted_history,
        "incoming_messages": incoming_messages
    }
    
    full_prompt = f"{current_system_prompt}\n\nInput:\n{json.dumps(prompt_input, indent=2)}"
    
    try:
        response = model.generate_content(full_prompt)
        text_response = response.text
        if text_response.startswith("```json"):
            text_response = text_response.strip("```json").strip("```")
        elif text_response.startswith("```"):
             text_response = text_response.strip("```")
             
        # Try to parse as JSON first
        try:
            response_json = json.loads(text_response)
            return response_json.get("reply", text_response) # Fallback to text_response if key missing
        except json.JSONDecodeError:
            return text_response # Fallback if not JSON at all

    except Exception as e:
        return f"Error generating reply: {e}"

def optimize_prompt(current_prompt, client_seq, history, ai_reply, consultant_seq):
    if not GEMINI_API_KEY:
        print("Skipping optimization (API Key missing)")
        return current_prompt

    model = genai.GenerativeModel("gemini-flash-latest")

    formatted_history = format_history_for_prompt(history)
    incoming_texts = [msg['text'] for msg in client_seq]
    consultant_texts = [msg['text'] for msg in consultant_seq]
    human_reply_text = "\n".join(consultant_texts)
    
    context_str = json.dumps({
        "client_messages": incoming_texts,
        "chat_history": formatted_history
    }, indent=2)

    optimization_input = f"""
1. **Current System Prompt:**
{current_prompt}

2. **Conversation Context:**
{context_str}

3. **AI Reply (Flawed):**
{ai_reply}

4. **Human Consultant Reply (Ideal):**
{human_reply_text}
"""

    full_editor_prompt = f"{EDITOR_PROMPT}\n\n{optimization_input}"

    try:
        print("\n--- Optimizing Prompt... ---")
        response = model.generate_content(full_editor_prompt)
        text_resp = response.text
        
        # Cleanup markdown
        if text_resp.startswith("```json"):
            text_resp = text_resp.strip("```json").strip("```")
        elif text_resp.startswith("```"):
            text_resp = text_resp.strip("```")
            
        result = json.loads(text_resp)
        new_prompt = result.get("prompt")
        
        if new_prompt and new_prompt != current_prompt:
            print(">>> System Promise OPTIMIZED! <<<")
            return new_prompt
        else:
            print("Optimization returned same prompt or invalid format.")
            return current_prompt

    except Exception as e:
        print(f"Error during prompt optimization: {e}")
        return current_prompt

def main():
    global SYSTEM_PROMPT
    json_file = 'conversations.json'
    extracted_data = extract_sequences(json_file)
    
    print(f"Total extracted pairs: {len(extracted_data)}\n")
    
    # Process first 3 samples for optimization
    samples_to_process = 3
    
    for idx, item in enumerate(extracted_data[:samples_to_process]):
        print(f"--- Sample {idx + 1}/{samples_to_process} ---")
        
        # 1. Generate AI Reply with CURRENT prompt
        ai_reply = generate_ai_reply(item['client_sequence'], item['history'], SYSTEM_PROMPT)
        
        # 2. Get Human Reply
        consultant_texts = [m['text'] for m in item['consultant_reply_sequence']]
        human_reply = "\n".join(consultant_texts)
        
        print(f"AI Reply: {ai_reply[:100]}...") # Print first 100 chars
        print(f"Human Reply: {human_reply[:100]}...")
        
        # 3. Optimize
        new_prompt = optimize_prompt(SYSTEM_PROMPT, item['client_sequence'], item['history'], ai_reply, item['consultant_reply_sequence'])
        
        if new_prompt != SYSTEM_PROMPT:
            SYSTEM_PROMPT = new_prompt
            print("Updated SYSTEM_PROMPT in memory for next iteration.")
        else:
            print("No changes to SYSTEM_PROMPT.")
            
        print("\n" + "="*50 + "\n")

    print("Finished optimization loop.")
    
    # Update Supabase
    update_system_prompt(SYSTEM_PROMPT)
    
    # Verification Run on a 4th sample (if available)
    if len(extracted_data) > samples_to_process:
        print("\n--- Verification Sample ---")
        item = extracted_data[samples_to_process]
        ai_reply = generate_ai_reply(item['client_sequence'], item['history'], SYSTEM_PROMPT)
        print(f"AI Reply (New Prompt): {ai_reply}")

if __name__ == "__main__":
    main()
