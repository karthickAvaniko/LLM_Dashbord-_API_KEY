"""
Avaniko AI — Python SDK
Gemini-style: ONE API key, ALL skills.

Quick start:
    import avaniko_ai as ai
    ai.configure(api_key="ak_xxx")

    # Chat
    reply = ai.chat.send([{"role": "user", "content": "Hello!"}])

    # Document extraction
    invoice = ai.documents.extract_invoice("path/to/invoice.pdf")
    receipt = ai.documents.extract_receipt("path/to/receipt.jpg")

    # Code generation
    code = ai.code.write("Python function to reverse a string")

    # Text utilities
    summary = ai.text.summarize(long_article)
    translation = ai.text.translate("Hello", to_lang="Tamil")

    # Generic
    answer = ai.text.generate("Explain photosynthesis")
"""
from .client import configure, get_client, AvanikoClient
from . import chat, documents, code, text, vision

__version__ = "0.2.0"
__all__ = ["configure", "get_client", "AvanikoClient", "chat", "documents", "code", "text", "vision"]
