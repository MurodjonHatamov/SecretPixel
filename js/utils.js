// ===== UTILITY FUNCTIONS =====

function showToast(msg, type = 'info') {
  const icons = {
    success: '<i class="fas fa-check-circle text-green-400"></i>',
    error:   '<i class="fas fa-times-circle text-red-400"></i>',
    info:    '<i class="fas fa-info-circle text-cyan-400"></i>',
    warning: '<i class="fas fa-exclamation-circle text-amber-400"></i>',
  };
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info} <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

function showProcessing(msg = 'Processing...') {
  const overlay = document.getElementById('processingOverlay');
  const msgEl   = document.getElementById('processingMsg');
  const barEl   = document.getElementById('processingBar');
  if (msgEl) msgEl.textContent = msg;
  if (barEl) barEl.style.width = '0%';
  if (overlay) overlay.classList.remove('hidden');
  return {
    update(pct) { if (barEl) barEl.style.width = Math.min(100, pct) + '%'; },
    done()      {
      if (barEl) barEl.style.width = '100%';
      setTimeout(() => { if (overlay) overlay.classList.add('hidden'); }, 450);
    }
  };
}

function spawnParticles(originEl) {
  const chars = ['0','1','•','█','▓','▒','░'];
  const rect  = originEl
    ? originEl.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    p.className   = 'particle';
    p.textContent = chars[Math.floor(Math.random() * chars.length)];
    const tx = (Math.random() - 0.5) * 220;
    const ty = (Math.random() - 0.5) * 220;
    const tr = (Math.random() - 0.5) * 360 + 'deg';
    p.style.cssText = `left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;--tx:${tx}px;--ty:${ty}px;--tr:${tr};`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

function triggerRipple(btn, e) {
  btn.classList.remove('rippling');
  void btn.offsetWidth;
  if (e) {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--rx', (e.clientX - r.left) + 'px');
    btn.style.setProperty('--ry', (e.clientY - r.top)  + 'px');
  }
  btn.classList.add('rippling');
  btn.addEventListener('animationend', () => btn.classList.remove('rippling'), { once: true });
}

function showMessageReveal(btn, resultWrap) {
  const ripple = document.getElementById('messageRevealRipple');
  if (!ripple || !btn || !resultWrap) {
    if (resultWrap) resultWrap.classList.remove('hidden');
    return;
  }
  
  const rect = btn.getBoundingClientRect();
  ripple.style.left = (rect.left + rect.width / 2) + 'px';
  ripple.style.top = (rect.top + rect.height / 2) + 'px';
  
  ripple.classList.remove('spreading');
  void ripple.offsetWidth;
  ripple.classList.add('spreading');
  
  setTimeout(() => {
    resultWrap.classList.remove('hidden');
  }, 200);
  
  setTimeout(() => ripple.classList.remove('spreading'), 600);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function readFileAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const fr  = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsArrayBuffer(file);
  });
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function getDocIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map = {
    pdf:  { icon: 'fa-file-pdf',         color: 'text-red-400',    bg: 'bg-red-500/20'    },
    docx: { icon: 'fa-file-word',        color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
    doc:  { icon: 'fa-file-word',        color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
    pptx: { icon: 'fa-file-powerpoint',  color: 'text-orange-400', bg: 'bg-orange-500/20' },
    ppt:  { icon: 'fa-file-powerpoint',  color: 'text-orange-400', bg: 'bg-orange-500/20' },
    xlsx: { icon: 'fa-file-excel',       color: 'text-green-400',  bg: 'bg-green-500/20'  },
    xls:  { icon: 'fa-file-excel',       color: 'text-green-400',  bg: 'bg-green-500/20'  },
    txt:  { icon: 'fa-file-alt',         color: 'text-gray-400',   bg: 'bg-gray-500/20'   },
    odt:  { icon: 'fa-file-alt',         color: 'text-cyan-400',   bg: 'bg-cyan-500/20'   },
  };
  return map[ext] || { icon: 'fa-file', color: 'text-gray-400', bg: 'bg-gray-500/20' };
}

function strToBytes(str) { return new TextEncoder().encode(str); }
function bytesToStr(buf) { return new TextDecoder().decode(buf); }

// Global ripple on every ripple-btn click
document.addEventListener('click', e => {
  const btn = e.target.closest('.ripple-btn');
  if (btn) triggerRipple(btn, e);
});

// ─── Shared helpers used by all stego modules ─────────────────────────────────
function tick()    { return new Promise(r => setTimeout(r, 20)); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function glowSuccess(el) {
  if (!el) return;
  el.classList.add('success-glow');
  setTimeout(() => el.classList.remove('success-glow'), 1100);
}

// Tab switcher helper (re-used across sections)
function initTabs(sectionEl) {
  sectionEl.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sectionEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab;
      sectionEl.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('hidden', c.id !== 'tab-' + id);
      });
    });
  });
}
