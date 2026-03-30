// ===== TEXT-IN-AUDIO STEGANOGRAPHY (LSB on PCM) =====

let _audBuffer  = null; // ArrayBuffer
let _audMediaRec = null;
let _audStream   = null;
let _audTimer    = null;
let _audSecs     = 0;
let _audChunks   = [];

// ─── WAV encoder ─────────────────────────────────────────────────────────────
function encodeWAV(samples, sampleRate) {
  const bps      = 16;
  const ch       = 1;
  const dataLen  = samples.length * 2;
  const buf      = new ArrayBuffer(44 + dataLen);
  const view     = new DataView(buf);
  const ws = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true);
  ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, ch, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * ch * bps / 8, true);
  view.setUint16(32, ch * bps / 8, true); view.setUint16(34, bps, true);
  ws(36, 'data'); view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buf;
}

// ─── LSB encode ──────────────────────────────────────────────────────────────
async function lsbEncodeAudio(samples, payloadBytes, onPct) {
  const hdr  = new Uint8Array(4);
  new DataView(hdr.buffer).setUint32(0, payloadBytes.length);
  const full = new Uint8Array(4 + payloadBytes.length);
  full.set(hdr, 0); full.set(payloadBytes, 4);

  if (full.length * 8 > samples.length)
    throw new Error('Audio juda qisqa — xabar sig\'madi.');

  let idx = 0;
  for (let i = 0; i < full.length; i++) {
    const b = full[i];
    for (let k = 7; k >= 0; k--) {
      const val = samples[idx];
      const scaled = val * 32768;
      let s = scaled > 0 ? Math.floor(scaled) : Math.ceil(scaled);
      s = (s & ~1) | ((b >> k) & 1);
      samples[idx] = s / 32768;
      idx++;
    }
    if (i % 3000 === 0 && onPct) { onPct(Math.round(i / full.length * 90)); await tick(); }
  }
}

// ─── LSB decode ──────────────────────────────────────────────────────────────
function lsbDecodeAudio(samples) {
  let ls = '';
  for (let i = 0; i < 32; i++) {
    const val = samples[i];
    const scaled = val * 32768;
    const intVal = scaled > 0 ? Math.floor(scaled) : Math.ceil(scaled);
    ls += (intVal & 1);
  }
  const len = parseInt(ls, 2);
  if (!len || len > samples.length / 8 || len > 1000000 || len < 0) return null;
  const bytes = [];
  for (let b = 0; b < len; b++) {
    let byte = 0;
    for (let k = 0; k < 8; k++) {
      const idx = 32 + b * 8 + k;
      if (idx >= samples.length) break;
      const val = samples[idx];
      const scaled = val * 32768;
      const intVal = scaled > 0 ? Math.floor(scaled) : Math.ceil(scaled);
      byte = (byte << 1) | (intVal & 1);
    }
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function initAudioStego() {
  const section = document.getElementById('section-audio');
  initTabs(section);

  // file browse
  document.getElementById('audFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _audBuffer = ev.target.result;
      document.getElementById('audPreview').src = URL.createObjectURL(file);
      document.getElementById('audPreviewWrap').classList.remove('hidden');
    };
    reader.readAsArrayBuffer(file);
  });

  // start recording
  document.getElementById('audRecordBtn').addEventListener('click', async () => {
    try {
      _audStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _audChunks = [];
      _audMediaRec = new MediaRecorder(_audStream);
      _audMediaRec.ondataavailable = e => _audChunks.push(e.data);
      _audMediaRec.onstop = async () => {
        clearInterval(_audTimer); _audSecs = 0;
        _audStream.getTracks().forEach(t => t.stop());
        document.getElementById('audRecordingUI').classList.add('hidden');
        const blob = new Blob(_audChunks, { type: 'audio/webm' });
        _audBuffer = await blob.arrayBuffer();
        document.getElementById('audPreview').src = URL.createObjectURL(blob);
        document.getElementById('audPreviewWrap').classList.remove('hidden');
        showToast('Ovoz yozildi!', 'success');
      };
      _audMediaRec.start();
      document.getElementById('audRecordingUI').classList.remove('hidden');
      _audTimer = setInterval(() => {
        _audSecs++;
        const m = String(Math.floor(_audSecs / 60)).padStart(2, '0');
        const s = String(_audSecs % 60).padStart(2, '0');
        document.getElementById('audRecTimer').textContent = `${m}:${s}`;
      }, 1000);
    } catch (err) { showToast('Mikrofon: ' + err.message, 'error'); }
  });

  document.getElementById('audStopRecord').addEventListener('click', () => {
    if (_audMediaRec && _audMediaRec.state !== 'inactive') _audMediaRec.stop();
  });

  document.getElementById('audCancelRecord').addEventListener('click', () => {
    if (_audMediaRec && _audMediaRec.state !== 'inactive') {
      _audMediaRec.ondataavailable = null; _audMediaRec.onstop = null;
      _audMediaRec.stop();
    }
    if (_audStream) _audStream.getTracks().forEach(t => t.stop());
    clearInterval(_audTimer); _audSecs = 0;
    document.getElementById('audRecordingUI').classList.add('hidden');
    _audBuffer = null;
  });

  // ── Hide ──
  document.getElementById('audHideBtn').addEventListener('click', async e => {
    if (!_audBuffer) { showToast("Avval audio tanlang yoki yozing.", 'warning'); return; }
    const secret   = document.getElementById('audSecretMsg').value.trim();
    const password = document.getElementById('audHidePass').value;
    if (!secret) { showToast("Secret xabar kiriting.", 'warning'); return; }

    const pbWrap = document.getElementById('audProgress');
    const pbBar  = document.getElementById('audProgressBar');
    const pbPct  = document.getElementById('audProgressPct');
    pbWrap.classList.remove('hidden');
    spawnParticles(e.currentTarget);

    try {
      const payload = strToBytes(preparePayload(secret, password));
      const ctx     = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await ctx.decodeAudioData(_audBuffer.slice(0));
      
      let samples;
      if (audioBuf.numberOfChannels === 1) {
        samples = new Float32Array(audioBuf.getChannelData(0));
      } else {
        const left = audioBuf.getChannelData(0);
        const right = audioBuf.getChannelData(1);
        samples = new Float32Array(left.length);
        for (let i = 0; i < samples.length; i++) {
          samples[i] = (left[i] + right[i]) / 2;
        }
      }

      await lsbEncodeAudio(samples, payload, pct => {
        pbBar.style.width = pct + '%'; pbPct.textContent = pct + '%';
      });

      pbBar.style.width = '100%'; pbPct.textContent = '100%';
      const wav = encodeWAV(samples, audioBuf.sampleRate);
      downloadBlob(new Blob([wav], { type: 'audio/wav' }), 'stego_audio.wav');
      showToast('Audioga yashirildi va yuklab olindi (WAV)!', 'success');
      setTimeout(() => pbWrap.classList.add('hidden'), 2200);
    } catch (err) {
      showToast(err.message, 'error');
      setTimeout(() => pbWrap.classList.add('hidden'), 2200);
    }
  });

  // reveal file
  document.getElementById('audRevealFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('audRevealPreview').src = URL.createObjectURL(file);
    document.getElementById('audRevealPreviewWrap').classList.remove('hidden');
  });

  // ── Reveal ──
  document.getElementById('audRevealBtn').addEventListener('click', async e => {
    const file = document.getElementById('audRevealFile').files[0];
    if (!file) { showToast("Audio fayl tanlang.", 'warning'); return; }
    const password = document.getElementById('audRevealPass').value;

    const proc = showProcessing('Audiodan ma\'lumot olinmoqda…');
    spawnParticles(e.currentTarget);

    try {
      const ab   = await readFileAsArrayBuffer(file);
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const abuf = await ctx.decodeAudioData(ab);
      
      if (abuf.numberOfChannels > 1) {
        showToast('Iltimos, mono audio fayl tanlang.', 'warning');
        proc.done();
        return;
      }
      
      const samples = abuf.getChannelData(0);
      if (samples.length < 256) {
        showToast('Audio juda qisqa.', 'warning');
        proc.done();
        return;
      }
      
      proc.update(55);
      const pb   = lsbDecodeAudio(samples);
      
      if (!pb || pb.length === 0) {
        showToast('Bu audioda yashirin ma\'lumot topilmadi yoki audio format noto\'g\'ri.', 'error');
        proc.done();
        return;
      }
      
      const decodedStr = bytesToStr(pb);
      if (!decodedStr.includes('STEGO')) {
        showToast('Yashirin ma\'lumot topilmadi.', 'error');
        proc.done();
        return;
      }
      
      const res = extractPayload(decodedStr, password);
      proc.done();
      if (!res.ok) { showToast(res.error, 'warning'); return; }
      const wrap = document.getElementById('audRevealResult');
      const btn = document.getElementById('audRevealBtn');
      document.getElementById('audRevealOutput').textContent = res.message;
      showMessageReveal(btn, wrap);
      showToast('Yashirin xabar topildi!', 'success');
    } catch (err) { proc.done(); showToast(err.message, 'error'); }
  });
}

// export
window.audioReveal = async (file, password) => {
  const ab   = await readFileAsArrayBuffer(file);
  const ctx  = new (window.AudioContext || window.webkitAudioContext)();
  const abuf = await ctx.decodeAudioData(ab);
  
  let samples;
  if (abuf.numberOfChannels === 1) {
    samples = abuf.getChannelData(0);
  } else {
    const left = abuf.getChannelData(0);
    const right = abuf.getChannelData(1);
    samples = new Float32Array(left.length);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = (left[i] + right[i]) / 2;
    }
  }
  
  const pb   = lsbDecodeAudio(samples);
  if (!pb) return null;
  const decodedStr = bytesToStr(pb);
  if (!decodedStr.includes('STEGO')) return null;
  return extractPayload(decodedStr, password);
};
