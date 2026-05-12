import sqlite3
import os
import json
from datetime import datetime
from backend.core.config import settings
from backend.core.security import hash_password

def get_db():
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def _add_column_if_missing(conn, table: str, column: str, col_type: str):
    """Safely add a column only if it does not already exist (SQLite migration helper)."""
    cols = [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name          TEXT NOT NULL,
            role          TEXT DEFAULT 'user',
            created_at    TEXT NOT NULL,
            is_active     INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS api_keys (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER,
            key            TEXT UNIQUE NOT NULL,
            name           TEXT NOT NULL,
            description    TEXT DEFAULT '',
            environment    TEXT DEFAULT 'production',
            created_at     TEXT NOT NULL,
            expires_at     TEXT DEFAULT NULL,
            is_active      INTEGER DEFAULT 1,
            rate_limit     INTEGER DEFAULT 500,
            token_budget   INTEGER DEFAULT 0,
            allowed_endpoints TEXT DEFAULT '',
            total_requests INTEGER DEFAULT 0,
            total_tokens   INTEGER DEFAULT 0,
            total_cost     REAL DEFAULT 0.0
        );
        CREATE TABLE IF NOT EXISTS usage_logs (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            api_key_id        INTEGER,
            endpoint          TEXT NOT NULL,
            prompt_tokens     INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            cost              REAL DEFAULT 0.0,
            timestamp         TEXT NOT NULL,
            status            TEXT DEFAULT 'success'
        );
        CREATE TABLE IF NOT EXISTS extraction_modes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT UNIQUE NOT NULL,
            label           TEXT NOT NULL,
            description     TEXT DEFAULT '',
            icon            TEXT DEFAULT '',
            json_schema     TEXT NOT NULL,
            system_prompt   TEXT NOT NULL,
            default_prompt  TEXT DEFAULT '',
            temperature     REAL DEFAULT 0.0,
            max_tokens      INTEGER DEFAULT 8192,
            is_active       INTEGER DEFAULT 1,
            created_by      INTEGER,
            created_at      TEXT NOT NULL,
            updated_at      TEXT
        );
    """)

    # ── Safe migration: add any columns missing in older DB files on disk ──
    _add_column_if_missing(conn, "api_keys", "user_id",           "INTEGER")
    _add_column_if_missing(conn, "api_keys", "description",       "TEXT DEFAULT ''")
    _add_column_if_missing(conn, "api_keys", "environment",       "TEXT DEFAULT 'production'")
    _add_column_if_missing(conn, "api_keys", "expires_at",        "TEXT DEFAULT NULL")
    _add_column_if_missing(conn, "api_keys", "token_budget",      "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "api_keys", "allowed_endpoints", "TEXT DEFAULT ''")
    _add_column_if_missing(conn, "api_keys", "total_requests",    "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "api_keys", "total_tokens",      "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "api_keys", "total_cost",        "REAL DEFAULT 0.0")
    _add_column_if_missing(conn, "usage_logs", "api_key_id",        "INTEGER")
    _add_column_if_missing(conn, "usage_logs", "prompt_tokens",     "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "usage_logs", "completion_tokens", "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "usage_logs", "cost",              "REAL DEFAULT 0.0")
    _add_column_if_missing(conn, "usage_logs", "status",            "TEXT DEFAULT 'success'")
    conn.commit()

    # ── Seed admin user ──
    try:
        conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, name, role, created_at) VALUES (?,?,?,?,?)",
            (settings.ADMIN_EMAIL, hash_password(settings.ADMIN_PASSWORD), settings.ADMIN_NAME, "admin", datetime.now().isoformat())
        )
        conn.commit()
    except Exception:
        pass

    # ── Seed default extraction modes (only if table is empty) ──
    try:
        count = conn.execute("SELECT COUNT(*) FROM extraction_modes").fetchone()[0]
        if count == 0:
            _seed_default_modes(conn)
    except Exception as e:
        print(f"[init_db] mode seeding skipped: {e}")
    conn.close()


def _seed_default_modes(conn):
    """Seed factory-default extraction modes. Admin can edit/delete via API."""
    now = datetime.now().isoformat()

    invoice_schema = {
        "type": "object", "additionalProperties": False,
        "required": ["invoice_number", "date", "total", "items"],
        "properties": {
            "invoice_number": {"type": "string"},
            "date": {"type": "string"},
            "reference_no": {"type": ["string", "null"]},
            "po_ref_no": {"type": ["string", "null"]},
            "vendor": {"type": "object", "properties": {
                "name": {"type": "string"}, "gstin": {"type": ["string", "null"]},
                "address": {"type": ["string", "null"]}, "contact": {"type": ["string", "null"]}}},
            "bill_to": {"type": "object", "properties": {
                "name": {"type": "string"}, "gstin": {"type": ["string", "null"]},
                "address": {"type": ["string", "null"]}, "customer_code": {"type": ["string", "null"]}}},
            "ship_to": {"type": "object", "properties": {
                "name": {"type": ["string", "null"]}, "gstin": {"type": ["string", "null"]},
                "address": {"type": ["string", "null"]}, "customer_code": {"type": ["string", "null"]}}},
            "items": {"type": "array", "minItems": 1, "items": {
                "type": "object", "additionalProperties": False,
                "required": ["description", "qty", "rate", "amount"],
                "properties": {
                    "s_no": {"type": ["integer", "string", "null"]},
                    "description": {"type": "string"},
                    "hsn": {"type": ["string", "null"]},
                    "qty": {"type": "number"}, "uom": {"type": ["string", "null"]},
                    "rate": {"type": "number"}, "amount": {"type": "number"},
                    "cash_discount": {"type": ["number", "null"]},
                    "other_discount": {"type": ["number", "null"]},
                    "taxable_value": {"type": ["number", "null"]},
                    "cgst_rate": {"type": ["number", "null"]}, "cgst_amount": {"type": ["number", "null"]},
                    "sgst_rate": {"type": ["number", "null"]}, "sgst_amount": {"type": ["number", "null"]},
                    "igst_rate": {"type": ["number", "null"]}, "igst_amount": {"type": ["number", "null"]}}}},
            "subtotal": {"type": ["number", "null"]},
            "total_cash_discount": {"type": ["number", "null"]},
            "total_other_discount": {"type": ["number", "null"]},
            "total_taxable_value": {"type": ["number", "null"]},
            "tcs": {"type": ["number", "null"]},
            "total_cgst": {"type": ["number", "null"]}, "total_sgst": {"type": ["number", "null"]},
            "total_igst": {"type": ["number", "null"]},
            "total": {"type": "number"},
            "amount_in_words": {"type": ["string", "null"]},
            "currency": {"type": "string"},
            "irn_number": {"type": ["string", "null"]}}}

    receipt_schema = {
        "type": "object", "additionalProperties": False,
        "required": ["merchant", "date", "items", "total"],
        "properties": {
            "merchant": {"type": "string"}, "date": {"type": "string"},
            "time": {"type": ["string", "null"]}, "address": {"type": ["string", "null"]},
            "items": {"type": "array", "items": {
                "type": "object", "required": ["name", "amount"],
                "properties": {
                    "name": {"type": "string"}, "qty": {"type": ["number", "null"]},
                    "price": {"type": ["number", "null"]}, "amount": {"type": "number"}}}},
            "subtotal": {"type": ["number", "null"]}, "tax": {"type": ["number", "null"]},
            "total": {"type": "number"}, "currency": {"type": "string"},
            "payment_method": {"type": ["string", "null"]}}}

    id_card_schema = {
        "type": "object", "additionalProperties": False,
        "required": ["document_type", "name"],
        "properties": {
            "document_type": {"type": "string", "enum": ["aadhaar", "pan", "passport", "driving_license", "voter_id", "other"]},
            "name": {"type": "string"}, "id_number": {"type": ["string", "null"]},
            "date_of_birth": {"type": ["string", "null"]}, "gender": {"type": ["string", "null"]},
            "father_name": {"type": ["string", "null"]}, "address": {"type": ["string", "null"]},
            "issue_date": {"type": ["string", "null"]}, "expiry_date": {"type": ["string", "null"]}}}

    defaults = [
        ("invoice", "Invoice", "Tax invoice / GST invoice extraction", "🧾",
         json.dumps(invoice_schema),
         "You are an invoice OCR engine. Extract every visible field exactly. Do NOT think aloud. Do NOT verify. Do NOT explain. Output ONLY a single valid JSON object matching the schema. Read digits and characters EXACTLY as they appear, even if unusual. If a field is missing, use null (not empty string).",
         "Extract this invoice. Output strict JSON only."),
        ("receipt", "Receipt", "Retail / restaurant receipt extraction", "🧾",
         json.dumps(receipt_schema),
         "You are a receipt OCR engine. Extract every visible field exactly. Output ONLY valid JSON. No prose, no thinking.",
         "Extract this receipt. Output strict JSON only."),
        ("id_card", "ID Card", "Aadhaar / PAN / Passport / Driving License", "🪪",
         json.dumps(id_card_schema),
         "You are an ID document OCR engine. Extract every visible field exactly. Output ONLY valid JSON. No prose, no thinking. For Indian Aadhaar use format XXXX XXXX XXXX. PAN: 5 letters + 4 digits + 1 letter.",
         "Extract this ID document. Output strict JSON only."),
    ]
    for (name, label, desc, icon, schema, sys_prompt, default_prompt) in defaults:
        conn.execute(
            """INSERT INTO extraction_modes
               (name, label, description, icon, json_schema, system_prompt, default_prompt,
                temperature, max_tokens, is_active, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (name, label, desc, icon, schema, sys_prompt, default_prompt,
             0.0, 4096, 1, now)
        )
    conn.commit()
