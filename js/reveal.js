// ===== UNIVERSAL REVEAL =====

let _revealFile = null;

function initReveal() {
  const dropZone  = document.getElementById('revealDropZone');
  const dropInput = document.getElementById('revealDropInput');

  dropZone.addEventListener('click', () => dropInput.click());

  dropInput.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    _revealFile = file;
    setDropZoneFile(file);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0]; if (!file) return;
    _revealFile = file;
    setDropZoneFile(file);
  });

  document.getElementById('revealBtn').addEventListener('click', async e => {
    const password = document.getElementById('revealPass').value;
    const text     = document.getElementById('revealTextInput').value.trim();

    if (!_revealFile && !text) {
      showToast("Fayl yuklang yoki matn kiriting.", 'warning'); return;
    }

    if (_revealFile) {
      await doFileReveal(_revealFile, password, e.currentTarget);
    } else {
      await doTextReveal(text, password, e.currentTarget);
    }
  });
}

function setDropZoneFile(file) {
  const zone = document.getElementById('revealDropZone');
  zone.innerHTML = `
    <div class="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
      ${fileIconHTML(file.name)}
    </div>
    <p class="font-semibold text-gray-300 mb-1 truncate max-w-xs mx-auto">${file.name}</p>
    <p class="text-sm text-gray-500">${formatBytes(file.size)}</p>
    <p class="text-xs text-rose-400 mt-2 font-medium">
      <i class="fas fa-arrow-down mr-1"></i>Reveal tugmasini bosing
    </p>`;
}

function fileIconHTML(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['png','jpg','jpeg','gif','bmp','webp'].includes(ext))
    return '<i class="fas fa-image text-cyan-400 text-2xl"></i>';
  if (['wav','mp3','ogg','webm','flac','m4a'].includes(ext))
    return '<i class="fas fa-music text-pink-400 text-2xl"></i>';
  if (['mp4','webm','avi','mov','mkv'].includes(ext))
    return '<i class="fas fa-video text-amber-400 text-2xl"></i>';
  if (['pdf','docx','doc','pptx','ppt','xlsx','xls','txt','odt'].includes(ext))
    return '<i class="fas fa-file-alt text-green-400 text-2xl"></i>';
  return '<i class="fas fa-file text-gray-400 text-2xl"></i>';
}

async function doFileReveal(file, password, btn) {
  const ext  = (file.name.split('.').pop() || '').toLowerCase();
  const proc = showProcessing('Avtomatik aniqlash va ochish…');
  spawnParticles(btn);

  let result   = null;
  let typeName = 'Noma\'lum';

  try {
    if (ext === 'png') {
      typeName = 'Rasm (PNG)';
      result   = await window.imageReveal(file, password);
    } else if (['wav','mp3','ogg','flac','m4a'].includes(ext)) {
      typeName = 'Audio';
      result   = await window.audioReveal(file, password);
    } else if (['webm'].includes(ext)) {
      // Could be audio or video — try audio first, then video
      typeName = 'Audio/Video';
      try { result = await window.audioReveal(file, password); } catch(_) {}
      if (!result || !result.ok) {
        result = await window.videoReveal(file, password);
      }
    } else if (['mp4','avi','mov','mkv'].includes(ext)) {
      typeName = 'Video';
      result   = await window.videoReveal(file, password);
    } else if (['pdf','docx','doc','pptx','ppt','xlsx','xls','txt','odt'].includes(ext)) {
      typeName = 'Hujjat';
      result   = await window.docReveal(file, password);
    } else {
      // unknown — try doc method (binary append)
      typeName = 'Ikkilik fayl';
      result   = await window.docReveal(file, password);
    }

    proc.done();

    if (!result) {
      showToast('Bu faylda yashirin xabar topilmadi.', 'info'); return;
    }
    if (!result.ok) {
      showToast(result.error, 'warning'); return;
    }
    showRevealOutput(result.message, typeName);
    showToast('Yashirin xabar topildi!', 'success');
  } catch (err) {
    proc.done(); showToast(err.message, 'error');
  }
}

async function doTextReveal(text, password, btn) {
  const proc = showProcessing('Matndan dekodlanmoqda…');
  spawnParticles(btn);
  await tick();

  try {
    const result = window.textReveal(text, password);
    proc.done();
    if (!result) { showToast('Bu matnda yashirin xabar topilmadi.', 'info'); return; }
    if (!result.ok) { showToast(result.error, 'warning'); return; }
    showRevealOutput(result.message, 'Matn');
    showToast('Yashirin xabar topildi!', 'success');
  } catch (err) {
    proc.done(); showToast(err.message, 'error');
  }
}

function showRevealOutput(message, type) {
  const wrap = document.getElementById('revealResult');
  const btn = document.getElementById('revealBtn');
  document.getElementById('revealOutput').textContent = message;
  document.getElementById('revealDetectedType').textContent = type;
  showMessageReveal(btn, wrap);
}
