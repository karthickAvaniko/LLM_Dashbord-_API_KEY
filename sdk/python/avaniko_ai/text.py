"""
Text utilities — generic generation, summarization, translation, classification.

    import avaniko_ai as ai

    # Generic
    answer = ai.text.generate("Explain photosynthesis simply")

    # Stream
    for chunk in ai.text.stream("Tell me a story"):
        print(chunk, end="", flush=True)

    # Summarize long article
    summary = ai.text.summarize(article, length="short")

    # Translate
    tamil = ai.text.translate("Hello, how are you?", to_lang="Tamil")

    # Classify sentiment
    label = ai.text.classify(review, labels=["positive", "negative", "neutral"])

    # Extract entities
    entities = ai.text.extract_entities("Apple Inc. CEO Tim Cook visited Chennai.")
"""
from typing import Iterator, List, Dict, Any
from .client import get_client


def generate(prompt: str, *,
             system: str = None,
             max_tokens: int = 2048,
             temperature: float = 0.7) -> str:
    """Generic free-form generation."""
    return get_client().generate(prompt, system=system, max_tokens=max_tokens, temperature=temperature).text


def stream(prompt: str, *,
           system: str = None,
           max_tokens: int = 2048,
           temperature: float = 0.7) -> Iterator[str]:
    """Stream tokens as they're generated."""
    yield from get_client().stream_generate(prompt, system=system, max_tokens=max_tokens, temperature=temperature)


def summarize(text: str, *, length: str = "medium", max_tokens: int = 1500) -> str:
    """Summarize long text. length: short | medium | long"""
    instructions = {
        "short":  "Summarize in 2-3 sentences.",
        "medium": "Summarize in 5-7 bullet points.",
        "long":   "Provide a detailed summary with key insights, structured under headings.",
    }
    instr = instructions.get(length, instructions["medium"])
    prompt = f"{instr}\n\nText:\n{text}"
    return generate(prompt, max_tokens=max_tokens, temperature=0.3)


def translate(text: str, *, to_lang: str, from_lang: str = "auto", max_tokens: int = 2048) -> str:
    """Translate text to target language."""
    sys = "You are a professional translator. Output ONLY the translated text — no commentary, no quotes."
    prompt = f"Translate this to {to_lang}:\n\n{text}"
    if from_lang != "auto":
        prompt = f"Translate this {from_lang} to {to_lang}:\n\n{text}"
    return generate(prompt, system=sys, max_tokens=max_tokens, temperature=0.2)


def classify(text: str, *, labels: List[str], max_tokens: int = 50) -> str:
    """Classify text into one of the given labels."""
    sys = (
        f"You are a text classifier. Output ONLY one of these exact labels (no quotes, no extra text): "
        f"{', '.join(labels)}"
    )
    return generate(f"Text: {text}\n\nLabel:", system=sys, max_tokens=max_tokens, temperature=0).strip()


def extract_entities(text: str, *, types: List[str] = None) -> Dict[str, List[str]]:
    """Extract named entities (people, places, orgs, dates, etc.)."""
    types = types or ["people", "organizations", "places", "dates", "money"]
    schema_fields = ", ".join('"' + t + '": [string]' for t in types)
    sys = (
        "You are an entity extraction engine. Output ONLY valid JSON. "
        "Schema: { " + schema_fields + " }"
    )
    prompt = f"Extract entities from:\n\n{text}"
    response = get_client().generate(prompt, system=sys, max_tokens=1500, temperature=0)
    return response.json()


def question_answer(question: str, *, context: str = None, max_tokens: int = 1024) -> str:
    """Answer a question, optionally grounded in provided context."""
    if context:
        sys = "Answer ONLY from the given context. If the context doesn't contain the answer, say 'Not found in context'."
        prompt = f"Context:\n{context}\n\nQuestion: {question}"
    else:
        sys = "Answer the question concisely and accurately."
        prompt = question
    return generate(prompt, system=sys, max_tokens=max_tokens, temperature=0.3)


def sentiment(text: str) -> str:
    """Classify sentiment as positive / negative / neutral."""
    return classify(text, labels=["positive", "negative", "neutral"])


def rewrite(text: str, *, tone: str = "professional", max_tokens: int = 1500) -> str:
    """Rewrite text in a given tone (professional, casual, formal, friendly, ...)."""
    sys = f"Rewrite the user's text in a {tone} tone. Preserve meaning. Output ONLY the rewritten text."
    return generate(text, system=sys, max_tokens=max_tokens, temperature=0.4)
