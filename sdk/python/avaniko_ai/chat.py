"""
Chat — multi-turn conversational AI.

Quick:
    import avaniko_ai as ai
    reply = ai.chat.send([{"role": "user", "content": "Hello!"}])

Stateful conversation:
    bot = ai.chat.Conversation(system="You are a helpful assistant.")
    bot.say("What is Tamil literature famous for?")
    bot.say("Give me 3 examples")
    print(bot.history)
"""
from typing import List, Dict, Optional, Iterator
from .client import get_client, Response


def send(messages: List[Dict[str, str]], *,
         max_tokens: int = 2048,
         temperature: float = 0.7) -> str:
    """Send a list of messages, get the assistant's reply text."""
    client = get_client()
    raw = client.chat_completion(messages, max_tokens=max_tokens, temperature=temperature)
    return raw["choices"][0]["message"].get("content", "")


def stream(messages: List[Dict[str, str]], *,
           max_tokens: int = 2048,
           temperature: float = 0.7) -> Iterator[str]:
    """Stream chat reply token by token. Builds prompt from messages internally."""
    # Convert chat → flat prompt for /v1/generate/stream
    parts = []
    system = None
    for m in messages:
        role = m["role"]
        if role == "system":
            system = m["content"]
        elif role == "user":
            parts.append(f"User: {m['content']}")
        elif role == "assistant":
            parts.append(f"Assistant: {m['content']}")
    parts.append("Assistant:")
    prompt = "\n\n".join(parts)
    client = get_client()
    yield from client.stream_generate(prompt, system=system, max_tokens=max_tokens, temperature=temperature)


class Conversation:
    """Stateful multi-turn chat. Keeps history automatically."""

    def __init__(self, system: Optional[str] = None,
                 max_history: int = 20,
                 temperature: float = 0.7,
                 max_tokens: int = 2048):
        self.history: List[Dict[str, str]] = []
        if system:
            self.history.append({"role": "system", "content": system})
        self.system = system
        self.max_history = max_history
        self.temperature = temperature
        self.max_tokens = max_tokens

    def say(self, message: str) -> str:
        """Send a user message, get + store assistant reply."""
        self.history.append({"role": "user", "content": message})
        # Truncate if too long
        if len(self.history) > self.max_history:
            keep_system = [m for m in self.history[:1] if m["role"] == "system"]
            self.history = keep_system + self.history[-(self.max_history - len(keep_system)):]
        reply = send(self.history, max_tokens=self.max_tokens, temperature=self.temperature)
        self.history.append({"role": "assistant", "content": reply})
        return reply

    def stream_say(self, message: str) -> Iterator[str]:
        """Same as say(), but yields tokens. Final assistant reply added to history."""
        self.history.append({"role": "user", "content": message})
        full = []
        for piece in stream(self.history, max_tokens=self.max_tokens, temperature=self.temperature):
            full.append(piece)
            yield piece
        self.history.append({"role": "assistant", "content": "".join(full)})

    def reset(self):
        self.history = []
        if self.system:
            self.history.append({"role": "system", "content": self.system})
