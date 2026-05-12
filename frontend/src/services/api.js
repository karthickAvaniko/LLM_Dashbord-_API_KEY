const BASE = ''

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const data = await res.json()
      msg = data.detail || data.message || msg
    } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ─── Auth ────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  me: () =>
    fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(handleResponse),

  myStats: () =>
    fetch(`${BASE}/auth/my-stats`, { headers: authHeaders() }).then(handleResponse),

  adminStats: () =>
    fetch(`${BASE}/auth/stats`, { headers: authHeaders() }).then(handleResponse),

  listUsers: () =>
    fetch(`${BASE}/auth/users`, { headers: authHeaders() }).then(handleResponse),

  createUser: (data) =>
    fetch(`${BASE}/auth/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  deleteUser: (id) =>
    fetch(`${BASE}/auth/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse),

  // Alias — uses the keysApi list endpoint for the Limits page
  listKeys: () =>
    fetch(`${BASE}/keys/list`, { headers: authHeaders() }).then(handleResponse),

  updateKeyLimits: (keyId, limits) =>
    fetch(`${BASE}/keys/${keyId}/limits`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(limits),
    }).then(handleResponse),
}

// ─── API Keys ────────────────────────────────────────────────────────
export const keysApi = {
  // GET /keys/list — returns { keys: [...] }
  list: () =>
    fetch(`${BASE}/keys/list`, { headers: authHeaders() }).then(handleResponse),

  // POST /keys/create — requires JWT session
  create: (data) =>
    fetch(`${BASE}/keys/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // POST /v1/keys/register — public, no auth
  register: (data) =>
    fetch(`${BASE}/v1/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // DELETE /keys/{key_id} — pass the numeric DB id, not the key string
  revoke: (keyId) =>
    fetch(`${BASE}/keys/${keyId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse),
}

// ─── Usage / Activity Log ────────────────────────────────────────────
export const usageApi = {
  getLogs: (keyId) => {
    const qs = keyId ? `?api_key_id=${keyId}` : ''
    return fetch(`${BASE}/usage${qs}`, { headers: authHeaders() }).then(handleResponse)
  },

  exportCsv: async () => {
    const res = await fetch(`${BASE}/usage/export`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'usage_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  },
}

// ─── AI / Modes ──────────────────────────────────────────────────────
export const aiApi = {
  getModes: (apiKey) =>
    fetch(`${BASE}/v1/modes`, {
      headers: { 'X-API-Key': apiKey },
    }).then(handleResponse),
}
