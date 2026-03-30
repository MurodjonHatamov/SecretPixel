// ===== CRYPTO — XOR + payload wrap =====

const STEGO_MAGIC = '\x00\x01STEGO\x01\x00'; // 9-char prefix

function xorEncrypt(text, key) {
  if (!key) return text;
  const kb = strToBytes(key);
  const mb = strToBytes(text);
  const out = new Uint8Array(mb.length);
  for (let i = 0; i < mb.length; i++) out[i] = mb[i] ^ kb[i % kb.length];
  return btoa(String.fromCharCode(...out));
}

function xorDecrypt(encoded, key) {
  if (!key) return encoded;
  try {
    const raw = atob(encoded);
    const eb  = new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    const kb  = strToBytes(key);
    const out = new Uint8Array(eb.length);
    for (let i = 0; i < eb.length; i++) out[i] = eb[i] ^ kb[i % kb.length];
    return bytesToStr(out);
  } catch { return null; }
}

function preparePayload(secret, password) {
  const content = password ? xorEncrypt(secret, password) : secret;
  return STEGO_MAGIC + (password ? '1:' : '0:') + content;
}

function extractPayload(raw, password) {
  if (!raw || !raw.startsWith(STEGO_MAGIC)) {
    return { ok: false, error: 'No hidden message found or wrong file.' };
  }
  const body = raw.slice(STEGO_MAGIC.length);
  const isEnc = body.startsWith('1:');
  const content = body.slice(2);
  if (isEnc) {
    if (!password) return { ok: false, error: 'This message is password-protected. Please enter the password.' };
    const dec = xorDecrypt(content, password);
    if (dec === null) return { ok: false, error: 'Wrong password or corrupted data.' };
    return { ok: true, message: dec };
  }
  return { ok: true, message: content };
}
