"""
FastAPI backend for the ChatBuddy React client.
"""

from typing import Dict, List, Literal, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from chat_memory import ChatMemory
from model_loader import DEFAULT_MODEL, DEFAULT_TEMPERATURE, ModelLoader
from persona import (
    FALLBACK_REPLY,
    GREETING,
    build_system_prompt,
    exemplar_messages,
    to_ascii,
)

app = FastAPI(title="ChatBuddy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

loader = ModelLoader(DEFAULT_MODEL)
sessions: Dict[str, ChatMemory] = {}


def ensure_model_loaded() -> None:
    """Load model once on first demand."""
    if loader.model is None or loader.tokenizer is None:
        loader.load()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: Optional[str] = None
    temperature: float = Field(default=DEFAULT_TEMPERATURE, gt=0.0, le=2.0)
    traits: List[Literal["funny", "light", "sarcastic", "rude", "buddha"]] = Field(
        default_factory=list
    )


class ChatResponse(BaseModel):
    session_id: str
    reply: str


@app.on_event("startup")
def startup_event() -> None:
    ensure_model_loaded()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/session/new")
def new_session() -> Dict[str, str]:
    session_id = str(uuid4())
    sessions[session_id] = ChatMemory(max_turns=6)
    return {"session_id": session_id, "greeting": GREETING}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    ensure_model_loaded()
    session_id = req.session_id or str(uuid4())
    if session_id not in sessions:
        sessions[session_id] = ChatMemory(max_turns=6)

    memory = sessions[session_id]
    try:
        messages = memory.get_messages(
            build_system_prompt(req.traits),
            req.message,
            exemplars=exemplar_messages(req.traits),
        )
        raw_reply = loader.generate_reply(messages, temperature=req.temperature)
        reply = to_ascii(raw_reply).split("\n\n")[0].strip()
        for label in ("buddy:", "bot:"):
            if reply.lower().startswith(label):
                reply = reply[len(label) :].strip()
        if len(reply) < 2:
            reply = FALLBACK_REPLY
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    memory.add_turn(req.message, reply)
    return ChatResponse(session_id=session_id, reply=reply)


@app.post("/session/{session_id}/reset")
def reset_session(session_id: str) -> Dict[str, str]:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions[session_id].clear()
    return {"status": "reset"}
