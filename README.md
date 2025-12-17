# IssaVibeHack

A Flask-based AI Visa Consultant for the Destination Thailand Visa (DTV) paired with a modern React Frontend. This system uses **Google Gemini** and **Supabase** to maintain a self-improving system prompt with "Time Machine" version control.

## 🚀 Live Demo

Access the live application here:

- **Frontend App**: [issa-vibe-hack-frontend.vercel.app](https://issa-vibe-hack-frontend.vercel.app)
- **Backend API**: [issavibehack-backend.onrender.com](https://issavibehack-backend.onrender.com)

---

## ✨ Features & How to Use

### 🧬 Vibe Cloner
Located in the sidebar, this tool allows you to instantly clone the personal of a human agent.
1. **Paste Chat Logs**: Copy raw text or JSON chat logs from a top-performing agent.
2. **Clone**: Click "Clone Persona". The AI analyzes tone, emoji usage, and structure.
3. **Review**: The system prompt's "Tone & Style" section is automatically updated.

### 🧠 Auto-Improve AI
Train the AI using real-world examples.
1. **Input Scenario**: Enter the client's message.
2. **Provide Solution**: Enter the *ideal* response a human expert would give.
3. **Improve**: The AI compares its initial prediction with your ideal answer and updates its system prompt rules to match your logic.

### 🛠️ Manual Prompt Update
Directly steer the AI's behavior.
1. **Instruct**: Type instructions like "Be more empathetic" or "Always mention the 500k THB requirement".
2. **Update**: The system prompt is modified to incorporate your directive.

### 💬 AI Playground (Generate Reply)
Test the current AI persona.
1. **Chat**: Simulate a conversation with a client.
2. **Verify**: Check if the responses match the style and logic you've trained it on.

---

## 💻 Developer Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Supabase Account

### 2. Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in `backend/` with:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
   ```
4. **Database Setup**: Ensure your Supabase `system_prompt` table uses the new versioned schema:
   - `id` (int8, primary key)
   - `prompt` (text)
   - `version` (int8)
   - `is_active` (boolean)
   - `change_log` (text)
   - `created_at` (timestamptz)
   - `last_edited` (timestamptz)

### 3. Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `frontend/` with:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

---

## 🔌 API Reference

### 1. Generate AI Reply
**Endpoint:** `POST /generate-reply`
Generates a response using the currently active system prompt version.

### 2. Auto-Improve AI Prompt
**Endpoint:** `POST /improve-ai`
Compares AI predictions with human expert replies to improve the prompt.
**Returns:**
```json
{
  "predictedReply": "...",
  "updatedPrompt": "...",
  "changeLog": "Added rule about remote work..."
}
```

### 3. Manually Improve AI Prompt
**Endpoint:** `POST /improve-ai-manually`
Updates the system prompt based on user instructions.
**Returns:**
```json
{
  "updatedPrompt": "...",
  "changeLog": "User requested more emojis."
}
```

### 4. Clone Vibe (Persona Extraction)
**Endpoint:** `POST /clone-vibe`
Analyzes chat logs to extract and apply a persona to the system prompt.
**Body:**
```json
{ "chatLogs": "Agent: Hey! ... Client: Hi..." }
```
**Returns:**
```json
{
  "updatedPrompt": "...",
  "changeLog": "Vibe Clone Update: ..."
}
```

### 5. Rollback System Prompt (Time Machine)
**Endpoint:** `POST /rollback-system-prompt`
Reverts the active prompt to a previous version.
**Body:**
```json
{ "steps": 1 }
```
**Returns:**
```json
{
  "message": "Successfully rolled back 1 version(s).",
  "activePrompt": "..."
}
```