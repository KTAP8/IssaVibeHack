# IssaVibeHack

A Flask-based AI Visa Consultant for the Destination Thailand Visa (DTV) paired with a modern React Frontend. This system uses Google Gemini and Supabase to maintain a self-improving system prompt with "Time Machine" version control.

## Setup

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

## Running the Application

### Backend
Start the Flask server from `backend/`:
```bash
python app.py
```
Runs at `http://127.0.0.1:5000`.

### Frontend
Start the Vite dev server from `frontend/`:
```bash
npm run dev
```
Runs at `http://localhost:5173`.

---

## API Reference

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

### 4. Rollback System Prompt (Time Machine)
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