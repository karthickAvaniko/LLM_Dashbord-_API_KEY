"""
Vision — generic image understanding (when no specific document mode fits).

    import avaniko_ai as ai

    desc = ai.vision.describe("photo.jpg")
    text = ai.vision.ocr("scan.png")
    answer = ai.vision.ask("chart.png", "What's the trend?")
"""
from typing import Optional
from .client import get_client


def describe(file_path: str, *, prompt: Optional[str] = None) -> str:
    """Describe what's in an image."""
    return get_client().analyze_file(
        file_path,
        prompt=prompt or "Describe this image in detail.",
        max_tokens=1500, temperature=0.3,
    ).text


def ocr(file_path: str) -> str:
    """Extract all visible text from an image."""
    return get_client().analyze_file(
        file_path,
        prompt="Extract all visible text from this image, preserving layout. Output text only — no commentary.",
        max_tokens=4096, temperature=0,
    ).text


def ask(file_path: str, question: str, *, max_tokens: int = 1500) -> str:
    """Ask a question about an image."""
    return get_client().analyze_file(
        file_path,
        prompt=question,
        max_tokens=max_tokens, temperature=0.3,
    ).text


def analyze_chart(file_path: str) -> str:
    """Analyze a chart/graph and return insights."""
    return get_client().analyze_file(
        file_path,
        prompt=(
            "Analyze this chart. Identify: 1) chart type, 2) key data points, "
            "3) trends, 4) anomalies, 5) main takeaway. Be specific."
        ),
        max_tokens=2000, temperature=0.3,
    ).text
