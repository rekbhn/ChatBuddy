"""
chat_memory.py
Manages conversation history with a sliding window buffer.
"""

from collections import deque
from typing import Deque, Dict, List, Optional, Tuple


class ChatMemory:
    """Maintains conversation history using a sliding window approach."""

    def __init__(self, max_turns: int = 6):
        self.max_turns = max_turns
        self.history: Deque[Tuple[str, str]] = deque(maxlen=max_turns)

    def add_turn(self, user_input: str, bot_reply: str) -> None:
        self.history.append((user_input, bot_reply))

    def clear(self) -> None:
        self.history.clear()

    def get_messages(
        self,
        system_prompt: str,
        user_input: str,
        exemplars: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        messages = [{"role": "system", "content": system_prompt}]
        if exemplars:
            messages.extend(exemplars)
        for past_user, past_bot in self.history:
            messages.append({"role": "user", "content": past_user})
            messages.append({"role": "assistant", "content": past_bot})
        messages.append({"role": "user", "content": user_input})
        return messages
