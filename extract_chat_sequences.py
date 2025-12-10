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

def generate_ai_reply(client_seq, history):
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
    
    full_prompt = f"{SYSTEM_PROMPT}\n\nInput:\n{json.dumps(prompt_input, indent=2)}"
    
    try:
        response = model.generate_content(full_prompt)
        text_response = response.text
        if text_response.startswith("```json"):
            text_response = text_response.strip("```json").strip("```")
        elif text_response.startswith("```"):
             text_response = text_response.strip("```")
             
        response_json = json.loads(text_response)
        return response_json.get("reply", "Error parsing reply")
    except Exception as e:
        return f"Error generating reply: {e}"

def main():
    json_file = 'conversations.json'
    extracted_data = extract_sequences(json_file)
    
    print(f"Total extracted pairs: {len(extracted_data)}\n")
    
    # Process only first 1 sample
    for idx, item in enumerate(extracted_data[:1]):
        print(f"--- Sample {idx + 1} ---")
        
        print("CLIENT:")
        client_texts = [m['text'] for m in item['client_sequence']]
        print('\n'.join(client_texts))
        print()

        print("CHAT HISTORY:")
        if not item['history']:
            print("(No history)")
        else:
            reversed_history = item['history'][::-1]
            for msg in reversed_history:
                role_label = "CONSULTANT" if msg['direction'] == 'out' else "CLIENT"
                print(f"({role_label}) {msg['text']}")
        print()
        
        ai_reply = generate_ai_reply(item['client_sequence'], item['history'])
        print(f"AI REPLY: {ai_reply}")
        
        print("\n" + "="*50 + "\n")

    print("Stopped after 1 sample to avoid rate limits during verification.")

if __name__ == "__main__":
    main()
