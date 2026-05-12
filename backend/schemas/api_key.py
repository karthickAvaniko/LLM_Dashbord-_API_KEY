from pydantic import BaseModel
from typing import Optional, List

class RegisterKeyRequest(BaseModel):
    name: str
    email: str

class CreateKeyRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    environment: Optional[str] = "production"   # production | development | testing
    rate_limit: Optional[int] = 500             # requests per day
    token_budget: Optional[int] = 500000        # max tokens per day (0 = unlimited)
    expires_in_days: Optional[int] = 0          # 0 = never expires
    allowed_endpoints: Optional[List[str]] = [] # empty = all endpoints allowed

class ChatRequest(BaseModel):
    messages: list
    max_tokens: Optional[int] = 8192
    temperature: Optional[float] = 0.0
    enable_thinking: Optional[bool] = False

class GenerateRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: Optional[int] = 8192
    temperature: Optional[float] = 0.7
