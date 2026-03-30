// ===== TEXT-IN-VIDEO STEGANOGRAPHY =====
// Appends a custom binary block after the video bytes

const VID_SIG_S = new Uint8Array([0x53,0x54,0x45,0x47,0x4F,0x56,0x49,0x44]); // STEGOVID
const VID_SIG_E = new Uint8Array([0x45,0x4E,0x44,0x53,0x54,0x45,0x47,0x4F]); // ENDSTEGO

let _vidBuffer  = null;
let _vidStream  = null;
let _vidRec     = null;
let _vidTimer   = null;
let _vidSecs    = 0;
let _vidChunks  = [];
let _vidRecExt  = 'webm';

function embedInVideo(buf, payload) {
  const hdr = new Uint8Array(4);
  new DataView(hdr.buffer).setUint32(0, payload.length);
  const out = new Uint8Array(buf.byteLength + VID_SIG_S.length + 4 + payload.length + VID_SIG_E.length);
  let o = 0;
  out.set(new Uint8Array(buf), o); o += buf.byteLength;
  out.set(VID_SIG_S, o);          o += VID_SIG_S.length;
  out.set(hdr, o);                o += 4;
  out.set(payload, o);            o += payload.length;
  out.set(VID_SIG_E, o);
  return out.buffer;
}

function extractFromVideo(buf) {
  const bytes = new Uint8Array(buf);
  for (let i = bytes.length - VID_SIG_S.length - 5; i >= 0; i--) {
    if (bytes[i] !== VID_SIG_S[0]) continue;
    let ok = true;
    for (let j = 1; j < VID_SIG_S.length; j++) { if (bytes[i+j] !== VID_SIG_S[j]) { ok=false; break; } }
    if (!ok) continue;
    const lenStart = i + VID_SIG_S.length;
    const len = new DataView(buf, lenStart, 4).getUint32(0);
    const start = lenStart + 4;
    if (start + len > bytes.length) return null;
    return bytes.slice(start, start + len);
  }
  return null;
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function initVideoStego() {
  const section = document.getElementById('section-video');
  initTabs(section);

  // file browse
  document.getElementById('vidFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    _vidRecExt = file.name.split('.').pop().toLowerCase() || 'mp4';
    const reader = new FileReader();
    reader.onload = ev => {
      _vidBuffer = ev.target.result;
      document.getElementById('vidPreview').src = URL.createObjectURL(file);
      document.getElementById('vidPreviewWrap').classList.remove('hidden');
    };
    reader.readAsArrayBuffer(file);
  });

  // open camera
  document.getElementById('vidRecordBtn').addEventListener('click', async () => {
    try {
      _vidStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('vidCameraFeed').srcObject = _vidStream;
      document.getElementById('vidRecordingUI').classList.remove('hidden');
      document.getElementById('vidStartRecord').classList.remove('hidden');
      document.getElementById('vidStopRecord').classList.add('hidden');
    } catch (err) { showToast('Kamera: ' + err.message, 'error'); }
  });

  // start recording
  document.getElementById('vidStartRecord').addEventListener('click', () => {
    if (!_vidStream) return;
    _vidChunks = [];
    _vidRec = new MediaRecorder(_vidStream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    _vidRec.ondataavailable = e => _vidChunks.push(e.data);
    _vidRec.onstop = async () => {
      clearInterval(_vidTimer); _vidSecs = 0;
      _vidStream.getTracks().forEach(t => t.stop()); _vidStream = null;
      document.getElementById('vidCameraFeed').srcObject = null;
      document.getElementById('vidRecordingUI').classList.add('hidden');
      const blob = new Blob(_vidChunks, { type: 'video/webm' });
      _vidBuffer = await blob.arrayBuffer();
      _vidRecExt = 'webm';
      document.getElementById('vidPreview').src = URL.createObjectURL(blob);
      document.getElementById('vidPreviewWrap').classList.remove('hidden');
      showToast('Video yozildi!', 'success');
    };
    _vidRec.start();
    _vidSecs = 0;
    document.getElementById('vidRecDot').classList.remove('hidden');
    document.getElementById('vidStartRecord').classList.add('hidden');
    document.getElementById('vidStopRecord').classList.remove('hidden');
    _vidTimer = setInterval(() => {
      _vidSecs++;
      const m = String(Math.floor(_vidSecs/60)).padStart(2,'0');
      const s = String(_vidSecs%60).padStart(2,'0');
      document.getElementById('vidRecTimer').textContent = `${m}:${s}`;
    }, 1000);
  });

  document.getElementById('vidStopRecord').addEventListener('click', () => {
    if (_vidRec && _vidRec.state !== 'inactive') _vidRec.stop();
  });

  document.getElementById('vidCancelRecord').addEventListener('click', () => {
    if (_vidRec && _vidRec.state !== 'inactive') {
      _vidRec.ondataavailable = null; _vidRec.onstop = null; _vidRec.stop();
    }
    if (_vidStream) { _vidStream.getTracks().forEach(t => t.stop()); _vidStream = null; }
    clearInterval(_vidTimer); _vidSecs = 0;
    document.getElementById('vidCameraFeed').srcObject = null;
    document.getElementById('vidRecordingUI').classList.add('hidden');
    _vidBuffer = null;
  });

  // ── Hide ──
  document.getElementById('vidHideBtn').addEventListener('click', async e => {
    if (!_vidBuffer) { showToast("Avval video tanlang yoki yozing.", 'warning'); return; }
    const secret   = document.getElementById('vidSecretMsg').value.trim();
    const password = document.getElementById('vidHidePass').value;
    if (!secret) { showToast("Secret xabar kiriting.", 'warning'); return; }

    const proc = showProcessing('Videoga yashirilyapti…');
    spawnParticles(e.currentTarget);
    proc.update(30); await delay(120);

    try {
      const payload = strToBytes(preparePayload(secret, password));
      proc.update(60); await delay(100);
      const result  = embedInVideo(_vidBuffer, payload);
      proc.update(90); await delay(80);
      const mime = _vidRecExt === 'mp4' ? 'video/mp4' : 'video/webm';
      downloadBlob(new Blob([result], { type: mime }), `stego_video.${_vidRecExt}`);
      proc.done();
      showToast('Videoga yashirildi va yuklab olindi!', 'success');
    } catch (err) { proc.done(); showToast(err.message, 'error'); }
  });

  // reveal file
  document.getElementById('vidRevealFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('vidRevealPreview').src = URL.createObjectURL(file);
    document.getElementById('vidRevealPreviewWrap').classList.remove('hidden');
  });

  // ── Reveal ──
  document.getElementById('vidRevealBtn').addEventListener('click', async e => {
    const file = document.getElementById('vidRevealFile').files[0];
    if (!file) { showToast("Video fayl tanlang.", 'warning'); return; }
    const password = document.getElementById('vidRevealPass').value;

    const proc = showProcessing('Videodan ma\'lumot olinmoqda…');
    spawnParticles(e.currentTarget);

    try {
      const ab  = await readFileAsArrayBuffer(file);
      proc.update(55);
      const pb  = extractFromVideo(ab);
      if (!pb) throw new Error("Bu videoda yashirin ma\'lumot topilmadi.");
      const res = extractPayload(bytesToStr(pb), password);
      proc.done();
      if (!res.ok) { showToast(res.error, 'warning'); return; }
      const wrap = document.getElementById('vidRevealResult');
      const btn = document.getElementById('vidRevealBtn');
      document.getElementById('vidRevealOutput').textContent = res.message;
      showMessageReveal(btn, wrap);
      showToast('Yashirin xabar topildi!', 'success');
    } catch (err) { proc.done(); showToast(err.message, 'error'); }
  });
}

// export
window.videoReveal = async (file, password) => {
  const ab = await readFileAsArrayBuffer(file);
  const pb = extractFromVideo(ab);
  if (!pb) return null;
  return extractPayload(bytesToStr(pb), password);
};
