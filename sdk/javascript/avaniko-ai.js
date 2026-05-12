/**
 * Avaniko AI — JavaScript SDK (browser + Node ≥ 18)
 *
 * Quick start:
 *   import * as ai from 'avaniko-ai';
 *   ai.configure({ apiKey: 'ak_xxx' });
 *
 *   // Chat
 *   const reply = await ai.chat.send([{ role: 'user', content: 'Hello!' }]);
 *
 *   // Document extraction
 *   const invoice = await ai.documents.extractInvoice(fileOrPath);
 *
 *   // Code
 *   const code = await ai.code.write('Express middleware for rate limiting');
 *
 *   // Text utilities
 *   const summary = await ai.text.summarize(longArticle);
 *   const tamil = await ai.text.translate('Hello', { toLang: 'Tamil' });
 *
 *   // Streaming
 *   for await (const chunk of ai.text.stream('Tell me a story')) {
 *     process.stdout.write(chunk);
 *   }
 */

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const _config = {
  apiKey: null,
  baseUrl: 'https://wo50dppqmt72bl-1111.proxy.runpod.net',
  timeout: 120000,
  retries: 3,
};

export function configure({ apiKey, baseUrl, timeout, retries } = {}) {
  if (apiKey) _config.apiKey = apiKey;
  if (!_config.apiKey && typeof process !== 'undefined' && process.env?.AVANIKO_API_KEY) {
    _config.apiKey = process.env.AVANIKO_API_KEY;
  }
  if (baseUrl) _config.baseUrl = baseUrl.replace(/\/+$/, '');
  if (timeout) _config.timeout = timeout;
  if (retries != null) _config.retries = retries;
}

function _ensureKey() {
  if (!_config.apiKey && typeof process !== 'undefined') {
    _config.apiKey = process.env?.AVANIKO_API_KEY;
  }
  if (!_config.apiKey) {
    throw new Error('API key missing. Call configure({ apiKey: "ak_..." }) or set AVANIKO_API_KEY env.');
  }
}

function _headers(json = true) {
  _ensureKey();
  const h = { 'X-API-Key': _config.apiKey };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function _withRetry(fn) {
  let lastErr;
  for (let i = 0; i < _config.retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < _config.retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

// ────────────────────────────────────────────────────────────
// Low-level core
// ────────────────────────────────────────────────────────────
async function _post(path, body, opts = {}) {
  return _withRetry(async () => {
    const res = await fetch(`${_config.baseUrl}${path}`, {
      method: 'POST',
      headers: opts.formData ? { 'X-API-Key': _config.apiKey } : _headers(),
      body: opts.formData ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  });
}

async function* _postStream(path, body) {
  _ensureKey();
  const res = await fetch(`${_config.baseUrl}${path}`, {
    method: 'POST',
    headers: _headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        const evt = JSON.parse(data);
        if (evt.event === 'delta') yield evt.text || '';
        else if (evt.event === 'error') throw new Error(evt.error);
      } catch {}
    }
  }
}

// ────────────────────────────────────────────────────────────
// CHAT module
// ────────────────────────────────────────────────────────────
export const chat = {
  async send(messages, { maxTokens = 2048, temperature = 0.7 } = {}) {
    const data = await _post('/v1/chat/completions', {
      messages, max_tokens: maxTokens, temperature,
    });
    return data.choices?.[0]?.message?.content || '';
  },

  async *stream(messages, { maxTokens = 2048, temperature = 0.7 } = {}) {
    let system = null;
    const parts = [];
    for (const m of messages) {
      if (m.role === 'system') system = m.content;
      else if (m.role === 'user') parts.push(`User: ${m.content}`);
      else if (m.role === 'assistant') parts.push(`Assistant: ${m.content}`);
    }
    parts.push('Assistant:');
    yield* _postStream('/v1/generate/stream', {
      prompt: parts.join('\n\n'),
      system,
      max_tokens: maxTokens,
      temperature,
    });
  },
};

export class Conversation {
  constructor({ system = null, maxHistory = 20, temperature = 0.7, maxTokens = 2048 } = {}) {
    this.history = system ? [{ role: 'system', content: system }] : [];
    this.system = system;
    this.maxHistory = maxHistory;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async say(message) {
    this.history.push({ role: 'user', content: message });
    if (this.history.length > this.maxHistory) {
      const sys = this.history[0]?.role === 'system' ? [this.history[0]] : [];
      this.history = sys.concat(this.history.slice(-(this.maxHistory - sys.length)));
    }
    const reply = await chat.send(this.history, { maxTokens: this.maxTokens, temperature: this.temperature });
    this.history.push({ role: 'assistant', content: reply });
    return reply;
  }

  async *streamSay(message) {
    this.history.push({ role: 'user', content: message });
    let full = '';
    for await (const piece of chat.stream(this.history, { maxTokens: this.maxTokens, temperature: this.temperature })) {
      full += piece;
      yield piece;
    }
    this.history.push({ role: 'assistant', content: full });
  }

  reset() {
    this.history = this.system ? [{ role: 'system', content: this.system }] : [];
  }
}

// ────────────────────────────────────────────────────────────
// TEXT module
// ────────────────────────────────────────────────────────────
export const text = {
  async generate(prompt, { system, maxTokens = 2048, temperature = 0.7 } = {}) {
    const data = await _post('/v1/generate', {
      prompt, system, max_tokens: maxTokens, temperature,
    });
    return data.text || '';
  },

  async *stream(prompt, { system, maxTokens = 2048, temperature = 0.7 } = {}) {
    yield* _postStream('/v1/generate/stream', {
      prompt, system, max_tokens: maxTokens, temperature,
    });
  },

  async summarize(content, { length = 'medium', maxTokens = 1500 } = {}) {
    const instr = {
      short:  'Summarize in 2-3 sentences.',
      medium: 'Summarize in 5-7 bullet points.',
      long:   'Provide a detailed summary structured under headings.',
    }[length] || 'Summarize concisely.';
    return text.generate(`${instr}\n\nText:\n${content}`, { maxTokens, temperature: 0.3 });
  },

  async translate(content, { toLang, fromLang = 'auto', maxTokens = 2048 } = {}) {
    const sys = 'You are a professional translator. Output ONLY the translated text — no commentary.';
    const prompt = fromLang === 'auto'
      ? `Translate this to ${toLang}:\n\n${content}`
      : `Translate this ${fromLang} to ${toLang}:\n\n${content}`;
    return text.generate(prompt, { system: sys, maxTokens, temperature: 0.2 });
  },

  async classify(content, { labels, maxTokens = 50 } = {}) {
    const sys = `You are a text classifier. Output ONLY one of these exact labels: ${labels.join(', ')}`;
    return (await text.generate(`Text: ${content}\n\nLabel:`, { system: sys, maxTokens, temperature: 0 })).trim();
  },

  async sentiment(content) {
    return text.classify(content, { labels: ['positive', 'negative', 'neutral'] });
  },

  async qa(question, { context, maxTokens = 1024 } = {}) {
    const sys = context
      ? "Answer ONLY from the given context. If not in context, say 'Not found in context'."
      : 'Answer concisely and accurately.';
    const prompt = context ? `Context:\n${context}\n\nQuestion: ${question}` : question;
    return text.generate(prompt, { system: sys, maxTokens, temperature: 0.3 });
  },

  async rewrite(content, { tone = 'professional', maxTokens = 1500 } = {}) {
    const sys = `Rewrite the user's text in a ${tone} tone. Preserve meaning. Output ONLY the rewritten text.`;
    return text.generate(content, { system: sys, maxTokens, temperature: 0.4 });
  },
};

// ────────────────────────────────────────────────────────────
// CODE module
// ────────────────────────────────────────────────────────────
const CODE_SYSTEM = 'You are a senior software engineer. Write clean, idiomatic, well-commented, production-quality code with type hints, error handling, and tests.';

export const code = {
  async write(description, { language = 'javascript', maxTokens = 2048 } = {}) {
    return text.generate(
      `Write ${language} code for: ${description}\n\nInclude tests and example usage.`,
      { system: CODE_SYSTEM, maxTokens, temperature: 0.2 },
    );
  },

  async explain(snippet, { language = 'auto', maxTokens = 1500 } = {}) {
    return text.generate(
      `Explain what this ${language} code does, step by step.\n\n\`\`\`\n${snippet}\n\`\`\``,
      { system: CODE_SYSTEM, maxTokens, temperature: 0.3 },
    );
  },

  async fix(snippet, { error = '', language = 'auto', maxTokens = 2048 } = {}) {
    return text.generate(
      `Fix this ${language} code.\n\n\`\`\`\n${snippet}\n\`\`\`\n\nError: ${error || '(unspecified)'}\n\nReturn corrected code with brief explanation.`,
      { system: CODE_SYSTEM, maxTokens, temperature: 0.2 },
    );
  },

  async review(snippet, { language = 'auto', maxTokens = 1800 } = {}) {
    return text.generate(
      `Review this ${language} code for bugs, security, performance, style.\n\n\`\`\`\n${snippet}\n\`\`\``,
      { system: CODE_SYSTEM, maxTokens, temperature: 0.3 },
    );
  },

  async sql(question, { schema = '', maxTokens = 800 } = {}) {
    const sys = 'You are a SQL expert. Output ONLY valid SQL — no markdown, no prose.';
    const prompt = schema
      ? `Schema:\n${schema}\n\nQuestion: ${question}\n\nSQL:`
      : `Question: ${question}\n\nSQL:`;
    return text.generate(prompt, { system: sys, maxTokens, temperature: 0 });
  },
};

// ────────────────────────────────────────────────────────────
// DOCUMENTS module
// ────────────────────────────────────────────────────────────
function _safeJsonParse(s) {
  if (!s) return {};
  let t = s.trim();
  if (t.startsWith('```')) {
    t = t.split('```')[1];
    if (t.startsWith('json')) t = t.slice(4);
    t = t.trim();
  }
  try { return JSON.parse(t); }
  catch {
    const start = t.indexOf('{'), end = t.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try { return JSON.parse(t.slice(start, end + 1)); } catch {}
    }
    return { _raw_text: s, _parse_error: true };
  }
}

async function _uploadFile(file, prompt, mode, { maxTokens = 4096, temperature = 0 } = {}) {
  const fd = new FormData();
  // file can be: File/Blob (browser), or { stream, name } object (Node fs.createReadStream wrapped), or path
  if (typeof file === 'string') {
    if (typeof window !== 'undefined') throw new Error('In browser, pass a File/Blob, not a path');
    const fs = await import('fs');
    const path = await import('path');
    const buf = fs.readFileSync(file);
    fd.append('file', new Blob([buf]), path.basename(file));
  } else {
    fd.append('file', file, file.name || 'upload');
  }
  fd.append('prompt', prompt);
  fd.append('max_tokens', String(maxTokens));
  fd.append('temperature', String(temperature));
  if (mode) fd.append('mode', mode);
  return _post('/v1/vision/analyze', fd, { formData: true });
}

export const documents = {
  async extract(file, { mode, prompt, maxTokens = 4096 } = {}) {
    const data = await _uploadFile(file, prompt || `Extract this ${mode}. Output valid JSON only.`, mode, { maxTokens, temperature: 0 });
    return _safeJsonParse(data.text || data.result || '');
  },

  extractInvoice(file)  { return documents.extract(file, { mode: 'invoice'  }); },
  extractReceipt(file)  { return documents.extract(file, { mode: 'receipt'  }); },
  extractIdCard(file)   { return documents.extract(file, { mode: 'id_card'  }); },

  async describe(file, prompt) {
    const data = await _uploadFile(file, prompt || 'Describe this in detail.', null, { maxTokens: 2048, temperature: 0.3 });
    return data.text || data.result || '';
  },

  async ocr(file) {
    const data = await _uploadFile(file, 'Extract all visible text, preserving layout. Text only.', null, { maxTokens: 4096, temperature: 0 });
    return data.text || data.result || '';
  },

  async listAvailableModes() {
    const res = await fetch(`${_config.baseUrl}/v1/modes`);
    return (await res.json()).modes || [];
  },
};

// ────────────────────────────────────────────────────────────
// VISION module (alias to documents for non-document images)
// ────────────────────────────────────────────────────────────
export const vision = {
  describe: documents.describe,
  ocr: documents.ocr,
  async ask(file, question, { maxTokens = 1500 } = {}) {
    const data = await _uploadFile(file, question, null, { maxTokens, temperature: 0.3 });
    return data.text || data.result || '';
  },
  async analyzeChart(file) {
    return vision.ask(file, 'Analyze this chart. Identify type, key data points, trends, anomalies, main takeaway.', { maxTokens: 2000 });
  },
};

// ────────────────────────────────────────────────────────────
// CommonJS compatibility
// ────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { configure, chat, text, code, documents, vision, Conversation };
}
