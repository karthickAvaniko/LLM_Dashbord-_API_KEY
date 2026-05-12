"""
Code generation, review, debugging.

    import avaniko_ai as ai

    # Write code
    snippet = ai.code.write("Python REST API for a TODO app", language="python")

    # Explain
    explanation = ai.code.explain(my_code)

    # Fix
    fixed = ai.code.fix(buggy_code, error="IndexError on line 12")

    # Review
    review = ai.code.review(my_module)

    # Translate (e.g., Python → Go)
    go_code = ai.code.translate(python_code, from_lang="python", to_lang="go")
"""
from .client import get_client

_SYSTEM = (
    "You are a senior software engineer. Write clean, idiomatic, "
    "well-commented, production-quality code with type hints, error handling, "
    "and test cases where appropriate."
)


def write(description: str, *, language: str = "python", max_tokens: int = 2048) -> str:
    prompt = (
        f"Write {language} code for the following task. "
        f"Include test cases and example usage.\n\n"
        f"Task: {description}"
    )
    return get_client().generate(prompt, system=_SYSTEM, max_tokens=max_tokens, temperature=0.2).text


def explain(code: str, *, language: str = "auto", max_tokens: int = 1500) -> str:
    prompt = (
        f"Explain what this {language} code does, step by step. "
        f"Note any bugs or improvements.\n\n```\n{code}\n```"
    )
    return get_client().generate(prompt, system=_SYSTEM, max_tokens=max_tokens, temperature=0.3).text


def fix(code: str, *, error: str = "", language: str = "auto", max_tokens: int = 2048) -> str:
    prompt = (
        f"Fix the bug in this {language} code.\n\n"
        f"Code:\n```\n{code}\n```\n\n"
        f"Error: {error or '(unspecified — find and fix any obvious bugs)'}\n\n"
        f"Return the corrected code with a brief explanation of what was wrong."
    )
    return get_client().generate(prompt, system=_SYSTEM, max_tokens=max_tokens, temperature=0.2).text


def review(code: str, *, language: str = "auto", max_tokens: int = 1800) -> str:
    prompt = (
        f"Review this {language} code for: bugs, security issues, performance, "
        f"style, naming, and idiomatic patterns. Be specific. Suggest improvements.\n\n"
        f"```\n{code}\n```"
    )
    return get_client().generate(prompt, system=_SYSTEM, max_tokens=max_tokens, temperature=0.3).text


def translate(code: str, *, from_lang: str, to_lang: str, max_tokens: int = 2048) -> str:
    prompt = (
        f"Translate this {from_lang} code to idiomatic {to_lang}. "
        f"Preserve behavior and add comments where the language idioms differ.\n\n"
        f"```\n{code}\n```"
    )
    return get_client().generate(prompt, system=_SYSTEM, max_tokens=max_tokens, temperature=0.2).text


def generate_sql(question: str, *, schema: str = "", max_tokens: int = 800) -> str:
    """Natural language → SQL query."""
    sys = (
        "You are a SQL expert. Generate ONLY valid SQL — no markdown, no prose. "
        "Use standard ANSI SQL unless told otherwise."
    )
    prompt = f"Schema:\n{schema}\n\nQuestion: {question}\n\nSQL:" if schema else f"Question: {question}\n\nSQL:"
    return get_client().generate(prompt, system=sys, max_tokens=max_tokens, temperature=0).text
