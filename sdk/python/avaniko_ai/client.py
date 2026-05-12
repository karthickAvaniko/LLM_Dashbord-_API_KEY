"""
Core client — handles auth, transport, retries, streaming.
"""
from __future__ import annotations
import os
import json
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Iterator, Union
import requests


@dataclass
class _Config:
    api_key: Optional[str] = None
    base_url: str = "https://wo50dppqmt72bl-1111.proxy.runpod.net"
    timeout: float = 120.0
    retries: int = 3
    retry_backoff: float = 1.0


_GLOBAL_CONFIG = _Config()


def configure(api_key: Optional[str] = None,
              base_url: Optional[str] = None,
              timeout: float = 120.0,
              retries: int = 3) -> None:
    """Set global config. API key falls back to AVANIKO_API_KEY env var."""
    if api_key:
        _GLOBAL_CONFIG.api_key = api_key
    elif os.getenv("AVANIKO_API_KEY"):
        _GLOBAL_CONFIG.api_key = os.getenv("AVANIKO_API_KEY")
    if base_url:
        _GLOBAL_CONFIG.base_url = base_url.rstrip("/")
    _GLOBAL_CONFIG.timeout = timeout
    _GLOBAL_CONFIG.retries = retries


def get_client() -> "AvanikoClient":
    if not _GLOBAL_CONFIG.api_key:
        # Last try
        _GLOBAL_CONFIG.api_key = os.getenv("AVANIKO_API_KEY")
    if not _GLOBAL_CONFIG.api_key:
        raise RuntimeError(
            "API key missing. Call avaniko_ai.configure(api_key='ak_...') "
            "or set AVANIKO_API_KEY env var."
        )
    return AvanikoClient(_GLOBAL_CONFIG)


# ────────────────────────────────────────────────────────────────
# Response object — Gemini-like ergonomics
# ────────────────────────────────────────────────────────────────
@dataclass
class Response:
    text: str
    model: str = ""
    finish_reason: str = "stop"
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    raw: Dict[str, Any] = field(default_factory=dict)
    pages: Optional[int] = None
    mode: Optional[str] = None

    def __str__(self): return self.text
    def __repr__(self): return f"<Response tokens={self.total_tokens} reason={self.finish_reason}>"

    def json(self) -> Dict[str, Any]:
        """If text is JSON, parse it. Otherwise return {}."""
        try:
            t = self.text.strip()
            if t.startswith("```"):
                t = t.split("```", 2)[1]
                if t.startswith("json"): t = t[4:]
            return json.loads(t.strip())
        except Exception:
            return {}

    @classmethod
    def from_api(cls, data: Dict[str, Any]) -> "Response":
        u = data.get("usage", {})
        return cls(
            text=data.get("text", "") or data.get("result", ""),
            model=data.get("model", ""),
            finish_reason=data.get("finish_reason", "stop"),
            input_tokens=u.get("input_tokens", 0),
            output_tokens=u.get("output_tokens", 0),
            total_tokens=u.get("total_tokens", 0),
            pages=data.get("pages"),
            mode=data.get("mode"),
            raw=data,
        )


# ────────────────────────────────────────────────────────────────
# Main client
# ────────────────────────────────────────────────────────────────
class AvanikoClient:
    """Low-level client. Most users use module helpers (ai.chat, ai.documents, etc.)."""

    def __init__(self, config: _Config):
        self.config = config

    @property
    def headers(self) -> Dict[str, str]:
        return {"X-API-Key": self.config.api_key, "Content-Type": "application/json"}

    @property
    def headers_no_ct(self) -> Dict[str, str]:
        """For multipart uploads where requests sets its own content-type."""
        return {"X-API-Key": self.config.api_key}

    def _request_with_retry(self, method: str, url: str, **kwargs) -> requests.Response:
        last_err = None
        for attempt in range(self.config.retries):
            try:
                resp = requests.request(method, url, timeout=self.config.timeout, **kwargs)
                if resp.status_code in (429, 502, 503, 504):
                    raise requests.HTTPError(f"{resp.status_code}: {resp.text[:200]}")
                return resp
            except (requests.HTTPError, requests.RequestException) as e:
                last_err = e
                if attempt < self.config.retries - 1:
                    time.sleep(self.config.retry_backoff * (2 ** attempt))
        raise last_err

    # ── Generic generation ──
    def generate(self, prompt: str, *,
                 system: Optional[str] = None,
                 max_tokens: int = 2048,
                 temperature: float = 0.7) -> Response:
        body = {"prompt": prompt, "max_tokens": max_tokens, "temperature": temperature}
        if system: body["system"] = system
        r = self._request_with_retry("POST", f"{self.config.base_url}/v1/generate",
                                     headers=self.headers, json=body)
        r.raise_for_status()
        return Response.from_api(r.json())

    def stream_generate(self, prompt: str, *,
                        system: Optional[str] = None,
                        max_tokens: int = 2048,
                        temperature: float = 0.7) -> Iterator[str]:
        """Yields text chunks as they arrive."""
        body = {"prompt": prompt, "max_tokens": max_tokens, "temperature": temperature}
        if system: body["system"] = system
        with requests.post(f"{self.config.base_url}/v1/generate/stream",
                           headers=self.headers, json=body,
                           stream=True, timeout=self.config.timeout) as r:
            r.raise_for_status()
            for line in r.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"): continue
                try:
                    evt = json.loads(line[5:].strip())
                    if evt.get("event") == "delta":
                        yield evt.get("text", "")
                    elif evt.get("event") == "error":
                        raise RuntimeError(evt.get("error"))
                except json.JSONDecodeError:
                    continue

    # ── Chat (multi-turn) ──
    def chat_completion(self, messages: List[Dict[str, str]], *,
                        max_tokens: int = 2048,
                        temperature: float = 0.7) -> Dict[str, Any]:
        body = {"messages": messages, "max_tokens": max_tokens, "temperature": temperature}
        r = self._request_with_retry("POST", f"{self.config.base_url}/v1/chat/completions",
                                     headers=self.headers, json=body)
        r.raise_for_status()
        return r.json()

    # ── Vision (file upload) ──
    def analyze_file(self, file_path: str, *,
                     prompt: str = "Describe this.",
                     mode: Optional[str] = None,
                     max_tokens: int = 4096,
                     temperature: float = 0.0) -> Response:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f.read(), "application/octet-stream")}
        data = {"prompt": prompt, "max_tokens": str(max_tokens),
                "temperature": str(temperature)}
        if mode: data["mode"] = mode
        r = self._request_with_retry(
            "POST", f"{self.config.base_url}/v1/vision/analyze",
            headers=self.headers_no_ct, files=files, data=data,
        )
        r.raise_for_status()
        return Response.from_api(r.json())

    def list_modes(self) -> List[Dict[str, Any]]:
        r = self._request_with_retry("GET", f"{self.config.base_url}/v1/modes",
                                     headers=self.headers)
        r.raise_for_status()
        return r.json().get("modes", [])
