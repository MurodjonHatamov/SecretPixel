// ===== TEXT-IN-DOCUMENT STEGANOGRAPHY =====
// Appends hidden binary block at end of any binary document

const DOC_SIG_S = new Uint8Array([0x53,0x54,0x45,0x47,0x4F,0x44,0x43,0x31]); // STEGODC1
const DOC_SIG_E = new Uint8Array([0x45,0x4E,0x44,0x53,0x54,0x44,0x4F,0x43]); // ENDSTDOC

let _docBuffer = null;
let _docName   = 'document';

function embedInDoc(buf, payload) {
  const hdr = new Uint8Array(4);
  new DataView(hdr.buffer).setUint32(0, payload.length);
  const out = new Uint8Array(buf.byteLength + DOC_SIG_S.length + 4 + payload.length + DOC_SIG_E.length);
  let o = 0;
  out.set(new Uint8Array(buf), o); o += buf.byteLength;
  out.set(DOC_SIG_S, o);          o += DOC_SIG_S.length;
  out.set(hdr, o);                o += 4;
  out.set(payload, o);            o += payload.length;
  out.set(DOC_SIG_E, o);
  return out.buffer;
}

function extractFromDoc(buf) {
  const bytes = new Uint8Array(buf);
  for (let i = bytes.length - DOC_SIG_S.length - 5; i >= 0; i--) {
    if (bytes[i] !== DOC_SIG_S[0]) continue;
    let ok = true;
    for (let j = 1; j < DOC_SIG_S.length; j++) { if (bytes[i+j] !== DOC_SIG_S[j]) { ok=false; break; } }
    if (!ok) continue;
    const lenStart = i + DOC_SIG_S.length;
    const len = new DataView(buf, lenStart, 4).getUint32(0);
    const start = lenStart + 4;
    if (start + len > bytes.length) return null;
    return bytes.slice(start, start + len);
  }
  return null;
}

function docMime(ext) {
  return ({
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc:  'application/msword',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt:  'application/vnd.ms-powerpoint',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    txt:  'text/plain',
    odt:  'application/vnd.oasis.opendocument.text',
  })[ext] || 'application/octet-stream';
}

function showDocInfo(file, prefix) {
  const ico = getDocIcon(file.name);
  const iconEl = document.getElementById(prefix + 'FileIcon');
  const nameEl = document.getElementById(prefix + 'FileName');
  const sizeEl = document.getElementById(prefix + 'FileSize');
  const wrap   = document.getElementById(prefix + 'PreviewWrap');
  if (iconEl) { iconEl.className = `w-10 h-10 rounded-xl flex items-center justify-center text-xl ${ico.bg}`; iconEl.innerHTML = `<i class="fas ${ico.icon} ${ico.color}"></i>`; }
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = formatBytes(file.size);
  if (wrap)   wrap.classList.remove('hidden');
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function initDocStego() {
  const section = document.getElementById('section-doc');
  initTabs(section);

  // hide file
  document.getElementById('docFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    _docName = file.name;
    const reader = new FileReader();
    reader.onload = ev => { _docBuffer = ev.target.result; showDocInfo(file, 'doc'); };
    reader.readAsArrayBuffer(file);
  });

  // ── Hide ──
  document.getElementById('docHideBtn').addEventListener('click', async e => {
    if (!_docBuffer) { showToast("Hujjat tanlang.", 'warning'); return; }
    const secret   = document.getElementById('docSecretMsg').value.trim();
    const password = document.getElementById('docHidePass').value;
    if (!secret) { showToast("Secret xabar kiriting.", 'warning'); return; }

    const proc = showProcessing('Hujjatga yashirilyapti…');
    spawnParticles(e.currentTarget);
    proc.update(40); await delay(120);

    try {
      const payload = strToBytes(preparePayload(secret, password));
      const result  = embedInDoc(_docBuffer, payload);
      proc.update(90); await delay(80);
      const ext  = _docName.split('.').pop();
      downloadBlob(new Blob([result], { type: docMime(ext) }), 'stego_' + _docName);
      proc.done();
      showToast('Hujjatga yashirildi va yuklab olindi!', 'success');
    } catch (err) { proc.done(); showToast(err.message, 'error'); }
  });

  // reveal file
  document.getElementById('docRevealFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    showDocInfo(file, 'docReveal');
  });

  // ── Reveal ──
  document.getElementById('docRevealBtn').addEventListener('click', async e => {
    const file = document.getElementById('docRevealFile').files[0];
    if (!file) { showToast("Hujjat tanlang.", 'warning'); return; }
    const password = document.getElementById('docRevealPass').value;

    const proc = showProcessing('Hujjatdan ma\'lumot olinmoqda…');
    spawnParticles(e.currentTarget);

    try {
      const ab  = await readFileAsArrayBuffer(file);
      proc.update(55);
      const pb  = extractFromDoc(ab);
      if (!pb) throw new Error("Bu hujjatda yashirin ma\'lumot topilmadi.");
      const res = extractPayload(bytesToStr(pb), password);
      proc.done();
      if (!res.ok) { showToast(res.error, 'warning'); return; }
      const wrap = document.getElementById('docRevealResult');
      const btn = document.getElementById('docRevealBtn');
      document.getElementById('docRevealOutput').textContent = res.message;
      showMessageReveal(btn, wrap);
      showToast('Yashirin xabar topildi!', 'success');
    } catch (err) { proc.done(); showToast(err.message, 'error'); }
  });
}

// export
window.docReveal = async (file, password) => {
  const ab = await readFileAsArrayBuffer(file);
  const pb = extractFromDoc(ab);
  if (!pb) return null;
  return extractPayload(bytesToStr(pb), password);
};

// also export extractFromDoc for reveal.js
window._extractFromDoc = extractFromDoc;
