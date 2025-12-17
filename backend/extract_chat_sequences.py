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

EDITOR_PROMPT_BATCH = """You are an expert AI Prompt Engineer and Optimization System. Your goal is to refine the "System Instructions" for a customer support chatbot to make it behave exactly like a top-performing human consultant.

You will be provided with:
1. **Current System Prompt:** The instructions currently governing the AI.
2. **Batch of Training Examples:** A list of independent conversations where we have the "Conversation Context" and the "Ideal Human Reply".

### Your Task
For EACH example in the batch, analyze how the **Ideal Human Reply** handles the situation (tone, specific knowledge, policy enforcement, empathy).
Then, rewrite the **Current System Prompt** to ensure the AI would generate a similar response in future scenarios.

### Optimization Guidelines
- **Generalize Rules:** If multiple examples show the human being empathetic about rejections, verify the prompt enforces empathy.
- **Specific Knowledge:** If the human mentions specific fees (e.g., "5,000 THB for Laos"), ensure this is in the "Knowledge Base".
- **Tone Consistency:** Ensure the "Tone & Style" section matches the aggregate persona of the human examples.
- **Do NOT Overfit:** Don't add extremely specific rules for one-off oddities unless they represent important policies.

### Output Format
You must return a **single JSON object** containing the full, updated text of the new system prompt.
{
  "prompt": "FULL_UPDATED_SYSTEM_PROMPT_HERE"
}
"""

def optimize_prompt_batch(current_prompt, batch_items):
    """
    Optimizes the prompt using a batch of examples.
    batch_items: list of dicts { 'client_sequence': [], 'consultant_reply_sequence': [], 'history': [] }
    """
    if not GEMINI_API_KEY:
        print("Skipping optimization (API Key missing)")
        return current_prompt

    model = genai.GenerativeModel("gemma-3-27b-it") # Using a high-context model for batches if available, or fallback to flash

    batch_input_str = ""
    for idx, item in enumerate(batch_items):
        incoming_texts = [msg['text'] for msg in item['client_sequence']]
        consultant_texts = [msg['text'] for msg in item['consultant_reply_sequence']]
        human_reply_text = "\n".join(consultant_texts)
        
        # We simplify history to last 5 messages to save tokens but keep context
        short_history = item['history'][-5:] 
        formatted_history = format_history_for_prompt(short_history)

        batch_input_str += f"""
--- Example {idx + 1} ---
**Context (Last few messages):**
{json.dumps(formatted_history, indent=2)}

**Incoming Client Message:**
{json.dumps(incoming_texts, indent=2)}

**Ideal Human Reply:**
{human_reply_text}
"""

    full_editor_prompt = f"{EDITOR_PROMPT_BATCH}\n\n1. **Current System Prompt:**\n{current_prompt}\n\n2. **Batch of Training Examples:**\n{batch_input_str}"

    try:
        print(f"--- Optimizing Prompt with Batch of {len(batch_items)} Examples... ---")
        # Estimate tokens if needed, but flash has 1M context.
        response = model.generate_content(full_editor_prompt)
        text_resp = response.text
        
        # Cleanup markdown
        if text_resp.startswith("```json"):
            text_resp = text_resp.strip("```json").strip("```")
        elif text_resp.startswith("```"):
            text_resp = text_resp.strip("```")
            
        result = json.loads(text_resp)
        new_prompt = result.get("prompt")
        
        if new_prompt and len(new_prompt) > 100: # Basic validation
            print(">>> System Prompt OPTIMIZED based on Batch! <<<")
            return new_prompt
        else:
            print("Optimization returned invalid prompt. Keeping old one.")
            return current_prompt

    except Exception as e:
        print(f"Error during batch optimization: {e}")
        return current_prompt


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

def main():
    global SYSTEM_PROMPT
    # Use absolute path or relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_file = os.path.join(script_dir, 'conversations.json')
    
    extracted_data = extract_sequences(json_file)
    
    print(f"Total extracted pairs: {len(extracted_data)}\n")
    
    BATCH_SIZE = 10 
    
    # Process ALL data in batches
    total_batches = (len(extracted_data) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in range(0, len(extracted_data), BATCH_SIZE):
        batch = extracted_data[i : i + BATCH_SIZE]
        current_batch_num = (i // BATCH_SIZE) + 1
        print(f"\n=== Processing Batch {current_batch_num}/{total_batches} (Size: {len(batch)}) ===")
        
        # Optimize using the batch (No individual AI generation needed for this approach, creating efficiency)
        new_prompt = optimize_prompt_batch(SYSTEM_PROMPT, batch)
        
        if new_prompt != SYSTEM_PROMPT:
            SYSTEM_PROMPT = new_prompt
            print("Updated SYSTEM_PROMPT in memory.")
        else:
            print("No changes to SYSTEM_PROMPT this round.")

    print("\nFinished optimization loop.")
    
    # Save to file instead of Supabase
    output_file = "optimized_system_prompt.txt"
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(SYSTEM_PROMPT)
        print(f"Successfully saved optimized prompt to {output_file}")
    except Exception as e:
        print(f"Error saving to file: {e}")

if __name__ == "__main__":
    main()
