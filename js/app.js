// ===== MAIN APP CONTROLLER =====

const NAV_ITEMS = [
  { id: 'home',   label: 'Home',            icon: 'fa-home',      color: 'text-violet-400', bg: 'bg-violet-500/20' },
  { id: 'text',   label: 'Text in Text',    icon: 'fa-font',      color: 'text-violet-400', bg: 'bg-violet-500/20' },
  { id: 'image',  label: 'Text in Image',   icon: 'fa-image',     color: 'text-cyan-400',   bg: 'bg-cyan-500/20'   },
  { id: 'audio',  label: 'Text in Audio',   icon: 'fa-music',     color: 'text-pink-400',   bg: 'bg-pink-500/20'   },
  { id: 'video',  label: 'Text in Video',   icon: 'fa-video',     color: 'text-amber-400',  bg: 'bg-amber-500/20'  },
  { id: 'doc',    label: 'Text in Doc',     icon: 'fa-file-alt',  color: 'text-green-400',  bg: 'bg-green-500/20'  },
  { id: 'reveal', label: 'Reveal / Decode', icon: 'fa-eye',       color: 'text-rose-400',   bg: 'bg-rose-500/20'   },
];

// Mapping for bottom nav
const BOTTOM_NAV_MAP = {
  'home': 'home',
  'text': 'text',
  'image': 'image',
  'audio': 'audio',
  'video': 'video',
  'doc': 'doc',
  'reveal': 'reveal'
};

let currentSection = 'home';
let isDark = true;

// ─── Build sidebar & mobile nav ───────────────────────────────────────────────
function buildNav() {
  const desktopNav  = document.getElementById('desktopNav');
  const mobileLinks = document.getElementById('mobileNavLinks');
  desktopNav.innerHTML  = '';
  mobileLinks.innerHTML = '';

  NAV_ITEMS.forEach(item => {
    [desktopNav, mobileLinks].forEach((container, idx) => {
      const btn = document.createElement('button');
      btn.className      = 'nav-item ripple-btn';
      btn.dataset.navId  = item.id;
      btn.innerHTML = `
        <span class="nav-icon ${item.bg}">
          <i class="fas ${item.icon} ${item.color}"></i>
        </span>
        <span>${item.label}</span>`;
      btn.addEventListener('click', () => {
        navigateTo(item.id);
        if (idx === 1) closeMobileNav();
      });
      container.appendChild(btn);
    });
  });
}

function updateNavActive(id) {
  document.querySelectorAll('[data-nav-id]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.navId === id);
  });
  
  // Update bottom nav (mobile)
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === id);
  });
}

// ─── Navigate between sections ────────────────────────────────────────────────
function navigateTo(id) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById('section-' + id);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  currentSection = id;
  updateNavActive(id);
}

// ─── Hero card nav-link buttons ───────────────────────────────────────────────
function bindNavLinks() {
  document.querySelectorAll('.nav-link[data-target]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.target));
  });
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────
function closeMobileNav() {
  document.getElementById('mobileNav').classList.add('hidden');
}

// ─── Theme toggle (Telegram-style water-ripple) ───────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('stego-theme');
  if (saved === 'light') {
    isDark = false;
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.getElementById('themeIcon').className = 'fas fa-sun text-amber-400 text-sm';
  }

  document.getElementById('themeToggle').addEventListener('click', e => {
    const ripple   = document.getElementById('themeRipple');
    const newDark  = !isDark;
    ripple.style.background = newDark ? '#030712' : '#f1f5f9';

    const rect = e.currentTarget.getBoundingClientRect();
    ripple.style.top   = rect.top  + 'px';
    ripple.style.right = (window.innerWidth - rect.right) + 'px';

    ripple.classList.remove('spreading');
    void ripple.offsetWidth;
    ripple.classList.add('spreading');

    setTimeout(() => {
      isDark = newDark;
      document.documentElement.classList.toggle('dark',   isDark);
      document.documentElement.classList.toggle('light', !isDark);
      document.getElementById('themeIcon').className = isDark
        ? 'fas fa-moon text-violet-400 text-sm'
        : 'fas fa-sun text-amber-400 text-sm';
      localStorage.setItem('stego-theme', isDark ? 'dark' : 'light');
    }, 300);

    setTimeout(() => ripple.classList.remove('spreading'), 750);
  });
}

// ─── Floating binary background particles ────────────────────────────────────
function spawnBgParticles() {
  const chars = ['0','1','0','1','■','▪','·','0','1'];
  function create() {
    const p       = document.createElement('div');
    p.className   = 'bg-particle';
    p.textContent = chars[Math.floor(Math.random() * chars.length)];
    const dur  = 14 + Math.random() * 18;
    const left = Math.random() * 100;
    p.style.cssText = `left:${left}vw;bottom:-20px;animation-duration:${dur}s;animation-delay:${Math.random()*dur}s;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), (dur + 3) * 1000);
  }
  for (let i = 0; i < 22; i++) create();
  setInterval(create, 1200);
}

// ─── PWA Service Worker ───────────────────────────────────────────────────────
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('SW registered'))
      .catch((err) => console.log('SW error:', err));
  }

  let deferredPrompt;
  const installBtn = document.getElementById('pwaInstallBtn');
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
    showToast('App installed successfully!', 'success');
  });

  const updateOnlineStatus = () => {
    if (!navigator.onLine) {
      showToast('You are offline. App works offline!', 'info');
    }
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu open
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('mobileNav').classList.remove('hidden');
  });
  document.getElementById('closeMobileNav').addEventListener('click', closeMobileNav);
  document.getElementById('mobileNav').addEventListener('click', e => {
    if (e.target === document.getElementById('mobileNav')) closeMobileNav();
  });

  initPWA();
  initTheme();
  buildNav();
  bindNavLinks();
  navigateTo('home');

  // Init stego modules
  initTextStego();
  initImageStego();
  initAudioStego();
  initVideoStego();
  initDocStego();
  initReveal();

  spawnBgParticles();
});
