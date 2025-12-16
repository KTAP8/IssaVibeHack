from flask import Flask, request, jsonify
from flask_cors import CORS
from chat_service import generate_reply, optimize_prompt, update_system_prompt_with_instructions, get_system_prompt, rollback_prompt

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello_world():
    return 'Hello World'

@app.route('/generate-reply', methods=['POST'])
def generate_reply_endpoint():
    data = request.json
    
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    client_sequence = data.get('clientSequence')
    chat_history_raw = data.get('chatHistory', [])
    
    if not client_sequence:
         return jsonify({"error": "clientSequence is required"}), 400

    # Map history to internal format (consultant -> assistant, client -> user)
    formatted_history = []
    for msg in chat_history_raw:
        role = msg.get('role', '').lower()
        if role == 'consultant':
            mapped_role = 'assistant'
        elif role == 'client':
            mapped_role = 'user'
        else:
            mapped_role = 'user' # Default fallback
            
        formatted_history.append({
            "role": mapped_role,
            "content": msg.get('message', '')
        })

    reply = generate_reply(client_sequence, formatted_history)
    
    return jsonify({"aiReply": reply})

@app.route('/improve-ai', methods=['POST'])
def improve_ai_endpoint():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    client_sequence = data.get('clientSequence')
    chat_history_raw = data.get('chatHistory', [])
    consultant_reply = data.get('consultantReply')

    if not client_sequence or not consultant_reply:
        return jsonify({"error": "clientSequence and consultantReply are required"}), 400

    # Map history
    formatted_history = []
    for msg in chat_history_raw:
        role = msg.get('role', '').lower()
        if role == 'consultant':
            mapped_role = 'assistant'
        elif role == 'client':
             mapped_role = 'user'
        else:
             mapped_role = 'user'
        
        formatted_history.append({
            "role": mapped_role,
            "content": msg.get('message', '')
        })

    # 1. Generate current predicted reply
    predicted_reply = generate_reply(client_sequence, formatted_history)

    # 2. Optimize prompt using comparison
    result = optimize_prompt(client_sequence, formatted_history, predicted_reply, consultant_reply)
    
    # Handle the dict return or fallback
    if isinstance(result, dict):
        updated_prompt = result.get("prompt")
        change_log = result.get("change_log")
    else:
        updated_prompt = result
        change_log = None
    
    if not updated_prompt:
         updated_prompt = get_system_prompt() # Fallback

    return jsonify({
        "predictedReply": predicted_reply,
        "updatedPrompt": updated_prompt,
        "changeLog": change_log
    })

@app.route('/improve-ai-manually', methods=['POST'])
def improve_ai_manually_endpoint():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    instructions = data.get('instructions')
    if not instructions:
        return jsonify({"error": "instructions are required"}), 400

    result = update_system_prompt_with_instructions(instructions)
    
    if isinstance(result, dict):
        updated_prompt = result.get("prompt")
        change_log = result.get("change_log")
    else:
        updated_prompt = result
        change_log = None
    
    if not updated_prompt:
        updated_prompt = get_system_prompt()

    return jsonify({
        "updatedPrompt": updated_prompt,
        "changeLog": change_log
    })

@app.route('/rollback-system-prompt', methods=['POST'])
def rollback_endpoint():
    data = request.json or {}
    steps = data.get('steps', 1)
    
    try:
        steps = int(steps)
    except ValueError:
        return jsonify({"error": "steps must be an integer"}), 400
        
    if rollback_prompt(steps):
        current_prompt = get_system_prompt()
        return jsonify({
            "message": f"Successfully rolled back {steps} version(s).",
            "activePrompt": current_prompt
        })
    else:
        return jsonify({"error": "Rollback failed. Check server logs."}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')
