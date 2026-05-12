"""
Document extraction — invoice, receipt, ID card, custom.

Each function returns a parsed Python dict (validated by JSON schema on backend).

    import avaniko_ai as ai
    invoice = ai.documents.extract_invoice("invoice.pdf")
    print(invoice["total"])

    receipt = ai.documents.extract_receipt("receipt.jpg")
    print(receipt["merchant"], receipt["total"])

    id_data = ai.documents.extract_id_card("aadhaar.jpg")

    # Custom mode (admin must register schema first via /admin/modes API)
    cv = ai.documents.extract("resume.pdf", mode="resume")
"""
from typing import Dict, Any, Optional
from .client import get_client


def extract(file_path: str, *,
            mode: str,
            prompt: Optional[str] = None,
            max_tokens: int = 4096) -> Dict[str, Any]:
    """Generic extraction by mode name. Returns parsed dict."""
    client = get_client()
    response = client.analyze_file(
        file_path,
        prompt=prompt or f"Extract this {mode}. Output valid JSON only.",
        mode=mode,
        max_tokens=max_tokens,
        temperature=0,
    )
    return response.json()


def extract_invoice(file_path: str) -> Dict[str, Any]:
    """Extract invoice → structured JSON.
    Returns: {invoice_number, date, vendor, bill_to, items, total, ...}"""
    return extract(file_path, mode="invoice")


def extract_receipt(file_path: str) -> Dict[str, Any]:
    """Extract retail/restaurant receipt → JSON.
    Returns: {merchant, date, items, total, ...}"""
    return extract(file_path, mode="receipt")


def extract_id_card(file_path: str) -> Dict[str, Any]:
    """Extract Aadhaar/PAN/Passport/DL → JSON.
    Returns: {document_type, name, id_number, date_of_birth, ...}"""
    return extract(file_path, mode="id_card")


def describe(file_path: str, prompt: Optional[str] = None) -> str:
    """Generic image/PDF description (no schema)."""
    client = get_client()
    response = client.analyze_file(
        file_path,
        prompt=prompt or "Describe this in detail.",
        max_tokens=2048,
        temperature=0.3,
    )
    return response.text


def ocr(file_path: str) -> str:
    """Extract all visible text (OCR)."""
    client = get_client()
    response = client.analyze_file(
        file_path,
        prompt="Extract all text visible in this image, preserving the layout. Output text only.",
        max_tokens=4096,
        temperature=0,
    )
    return response.text


def list_available_modes() -> list:
    """Discover what extraction modes are available on this server."""
    return get_client().list_modes()
