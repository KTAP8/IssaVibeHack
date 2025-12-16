# IssaVibeHack

A Flask-based AI Visa Consultant for the Destination Thailand Visa (DTV). This system uses Google Gemini and Supabase to maintain a self-improving system prompt that adapts to better mimic human expert consultants.

## Setup

### 1. Prerequisites
- Python 3.11+
- Pip

### 2. Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Environment Variables
Create a `.env` file in the root directory with the following keys:
```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
```

### 4. Database Setup
Ensure your Supabase instance has a table named `system_prompt` with the columns:
- `id` (int8, primary key)
- `prompt` (text)

---

## Running the Server

Start the Flask application:
```bash
python3 app.py
```
The server will start at `http://127.0.0.1:5000`.

---

## API Reference

### 1. Generate AI Reply
Generates a response based on the current system prompt.

**Endpoint:** `POST /generate-reply`

**Body:**
```json
{
  "clientSequence": "I'm American and currently in Bali. Can I apply from Indonesia?",
  "chatHistory": [
    { "role": "consultant", "message": "Hi there!..." },
    { "role": "client", "message": "Hello, I'm interested..." }
  ]
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:5000/generate-reply \
  -H "Content-Type: application/json" \
  -d '{
    "clientSequence": "I am American and currently in Bali. Can I apply from Indonesia?",
    "chatHistory": []
}'
```

---

### 2. Auto-Improve AI Prompt
Compares the AI's predicted reply against a human consultant's actual reply to refine the system prompt dynamically.

**Endpoint:** `POST /improve-ai`

**Body:**
```json
{
  "clientSequence": "I work for a Thai company remotely.",
  "chatHistory": [],
  "consultantReply": "Unfortunately, you cannot apply for the DTV if you are employed by a Thai company."
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:5000/improve-ai \
  -H "Content-Type: application/json" \
  -d '{
    "clientSequence": "I work for a Thai company remotely.",
    "chatHistory": [],
    "consultantReply": "Unfortunately, that is not allowed. You must work for a foreign company."
}'
```

---

### 3. Manually Improve AI Prompt
Updates the system prompt based on specific natural language instructions.

**Endpoint:** `POST /improve-ai-manually`

**Body:**
```json
{
  "instructions": "Be more more enthusiastic and use more emojis."
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:5000/improve-ai-manually \
  -H "Content-Type: application/json" \
  -d '{
    "instructions": "Be concise and strictly professional. No emojis."
}'
```