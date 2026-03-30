// ===== TEXT-IN-IMAGE STEGANOGRAPHY (LSB) =====

let _imgStream = null;
let _imgDataURL = null;

// ─── LSB encode into ImageData ────────────────────────────────────────────────
async function lsbEncodeImage(imageData, payloadBytes, onPct) {
  const data = imageData.data;
  // 4-byte length header + payload
  const hdr  = new Uint8Array(4);
  new DataView(hdr.buffer).setUint32(0, payloadBytes.length);
  const full = new Uint8Array(4 + payloadBytes.length);
  full.set(hdr, 0); full.set(payloadBytes, 4);

  if (full.length * 8 > data.length / 4)
    throw new Error('Rasm juda kichik — xabar sig\'madi.');

  let bit = 0;
  for (let i = 0; i < full.length; i++) {
    const b = full[i];
    for (let k = 7; k >= 0; k--) {
      data[bit * 4] = (data[bit * 4] & 0xFE) | ((b >> k) & 1);
      bit++;
    }
    if (i % 600 === 0 && onPct) { onPct(Math.round(i / full.length * 90)); await tick(); }
  }
  return imageData;
}

// ─── LSB decode from ImageData ────────────────────────────────────────────────
function lsbDecodeImage(imageData) {
  const data = imageData.data;
  let lenStr = '';
  for (let i = 0; i < 32; i++) lenStr += (data[i * 4] & 1);
  const len = parseInt(lenStr, 2);
  if (!len || len > data.length / 32) return null;
  const bytes = [];
  for (let b = 0; b < len; b++) {
    let byte = 0;
    for (let k = 7; k >= 0; k--) {
      const idx = (32 + b * 8 + (7 - k)) * 4;
      byte = (byte << 1) | (data[idx] & 1);
    }
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function initImageStego() {
  const section = document.getElementById('section-image');
  initTabs(section);

  // file browse
  document.getElementById('imgFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadImgDataURL(ev.target.result);
    reader.readAsDataURL(file);
  });

  // camera open
  document.getElementById('imgCameraBtn').addEventListener('click', async () => {
    try {
      _imgStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const feed = document.getElementById('imgCameraFeed');
      feed.srcObject = _imgStream;
      document.getElementById('imgPreviewWrap').classList.remove('hidden');
      document.getElementById('imgPreview').classList.add('hidden');
      feed.classList.remove('hidden');
      document.getElementById('imgCameraControls').classList.remove('hidden');
    } catch (err) { showToast('Kamera: ' + err.message, 'error'); }
  });

  // capture photo
  document.getElementById('imgCapture').addEventListener('click', () => {
    const feed = document.getElementById('imgCameraFeed');
    const cv   = document.getElementById('imgCanvas');
    cv.width   = feed.videoWidth  || 640;
    cv.height  = feed.videoHeight || 480;
    cv.getContext('2d').drawImage(feed, 0, 0);
    stopImgCamera();
    loadImgDataURL(cv.toDataURL('image/png'));
    showToast('Rasm olindi!', 'success');
  });

  document.getElementById('imgCameraClose').addEventListener('click', stopImgCamera);

  // ── Hide ──
  document.getElementById('imgHideBtn').addEventListener('click', async e => {
    if (!_imgDataURL) { showToast("Avval rasm tanlang yoki oling.", 'warning'); return; }
    const secret   = document.getElementById('imgSecretMsg').value.trim();
    const password = document.getElementById('imgHidePass').value;
    if (!secret) { showToast("Secret xabar kiriting.", 'warning'); return; }

    const pbWrap = document.getElementById('imgProgress');
    const pbBar  = document.getElementById('imgProgressBar');
    const pbPct  = document.getElementById('imgProgressPct');
    pbWrap.classList.remove('hidden');
    spawnParticles(e.currentTarget);

    try {
      const payload = strToBytes(preparePayload(secret, password));
      const img = new Image();
      img.src   = _imgDataURL;
      await new Promise(r => { img.onload = r; });

      const cv  = document.createElement('canvas');
      cv.width  = img.naturalWidth;
      cv.height = img.naturalHeight;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const idata = ctx.getImageData(0, 0, cv.width, cv.height);

      await lsbEncodeImage(idata, payload, pct => {
        pbBar.style.width = pct + '%'; pbPct.textContent = pct + '%';
      });

      ctx.putImageData(idata, 0, 0);
      pbBar.style.width = '100%'; pbPct.textContent = '100%';

      cv.toBlob(blob => {
        downloadBlob(blob, 'stego_image.png');
        showToast('Rasimga yashirildi va yuklab olindi!', 'success');
        setTimeout(() => pbWrap.classList.add('hidden'), 2200);
      }, 'image/png');
    } catch (err) {
      showToast(err.message, 'error');
      setTimeout(() => pbWrap.classList.add('hidden'), 2200);
    }
  });

  // reveal file
  document.getElementById('imgRevealFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const url  = URL.createObjectURL(file);
    document.getElementById('imgRevealPreview').src = url;
    document.getElementById('imgRevealPreviewWrap').classList.remove('hidden');
  });

  // ── Reveal ──
  document.getElementById('imgRevealBtn').addEventListener('click', async e => {
    const file = document.getElementById('imgRevealFile').files[0];
    if (!file) { showToast("PNG fayl tanlang.", 'warning'); return; }
    const password = document.getElementById('imgRevealPass').value;

    const proc = showProcessing('Rasmdan ma\'lumot olinmoqda…');
    spawnParticles(e.currentTarget);

    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src   = url;
      await new Promise(r => { img.onload = r; });
      const cv  = document.createElement('canvas');
      cv.width  = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext('2d').drawImage(img, 0, 0);
      const idata   = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
      proc.update(55);
      const pBytes  = lsbDecodeImage(idata);
      if (!pBytes) throw new Error('Bu rasmda yashirin ma\'lumot topilmadi.');
      const res = extractPayload(bytesToStr(pBytes), password);
      proc.done();
      if (!res.ok) { showToast(res.error, 'warning'); return; }
      const wrap = document.getElementById('imgRevealResult');
      const btn = document.getElementById('imgRevealBtn');
      document.getElementById('imgRevealOutput').textContent = res.message;
      showMessageReveal(btn, wrap);
      showToast('Yashirin xabar topildi!', 'success');
    } catch (err) { proc.done(); showToast(err.message, 'error'); }
  });
}

function stopImgCamera() {
  if (_imgStream) { _imgStream.getTracks().forEach(t => t.stop()); _imgStream = null; }
  const feed = document.getElementById('imgCameraFeed');
  feed.srcObject = null;
  feed.classList.add('hidden');
  document.getElementById('imgCameraControls').classList.add('hidden');
  if (_imgDataURL) document.getElementById('imgPreview').classList.remove('hidden');
}

function loadImgDataURL(url) {
  _imgDataURL = url;
  const img = document.getElementById('imgPreview');
  img.src   = url; img.classList.remove('hidden');
  document.getElementById('imgPreviewWrap').classList.remove('hidden');
  document.getElementById('imgCameraFeed').classList.add('hidden');
  document.getElementById('imgCameraControls').classList.add('hidden');
}

// export
window.imageReveal = async (file, password) => {
  const url = URL.createObjectURL(file);
  const img = new Image(); img.src = url;
  await new Promise(r => { img.onload = r; });
  const cv  = document.createElement('canvas');
  cv.width  = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext('2d').drawImage(img, 0, 0);
  const idata = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  const pb    = lsbDecodeImage(idata);
  if (!pb) return null;
  return extractPayload(bytesToStr(pb), password);
};
