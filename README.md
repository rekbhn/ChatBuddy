# ChatBuddy (React + Local Python Model)

This project is a chatbot in React with a local FastAPI backend.

Create your own token in hugging face. backend uses hugging face transformers.
CLI: hf auth login
https://hf.co/oauth/device

No API keys, no recurring costs, full privacy — your prompts and responses stay on your machine. 
Download model once and it's offline!
Delete chat as you want. Only for fun. This model may not be suitable for any serious work.

What else can you do with it? homework helper maybe?

- Frontend: React + Vite (`src/`)
- Backend: FastAPI + Transformers (`backend/`)
- Model: `Qwen/Qwen2.5-3B-Instruct`
- Persona: telnet-era "buddy" voice with philosophical replies.
- My config: 60GB RAM and a Ryzen AI MAX+ 395. Seems pretty decent response.

## Run It

Open two terminals in `C:\Users\rekha\Desktop\CODE\ChatBuddy`.

### Terminal 1 - backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --app-dir backend --reload
```

Backend runs at `http://127.0.0.1:8000`.

### Terminal 2 - frontend

```bash
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

The Vite dev server proxies `/api/*` to the backend, so no extra frontend env var is needed.

## Features

- Chat UI with conversation bubbles and loading state
- Session memory with reset button
- Temperature control slider (0.2 to 1.4)
- Persona-preserving generation with exemplars
- ASCII cleanup for the telnet style

## API Endpoints

- `GET /health`
- `GET /session/new`
- `POST /chat` body:
  - `session_id` (string, optional)
  - `message` (string, required)
  - `temperature` (float > 0, optional)
- `POST /session/{session_id}/reset`

## Important Files

- `backend/app.py`: API routes, session handling, model orchestration
- `backend/model_loader.py`: model/tokenizer load + generation params
- `backend/persona.py`: system prompt + style exemplars
- `src/App.jsx`: React chat UI and API calls
- `vite.config.js`: `/api` proxy to backend


# Personal use only. 