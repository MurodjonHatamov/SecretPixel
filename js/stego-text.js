// ===== TEXT-IN-TEXT STEGANOGRAPHY =====
// Zero-width character (ZWC) encoding

const ZWC_ZERO = '\u200B'; // bit 0
const ZWC_ONE  = '\u200C'; // bit 1
const ZWC_SEP  = '\u200D'; // byte separator
const ZWC_END  = '\uFEFF'; // end-of-payload

function textToZWC(text) {
  const bytes = strToBytes(text);
  let out = '';
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit--)
      out += (byte >> bit) & 1 ? ZWC_ONE : ZWC_ZERO;
    out += ZWC_SEP;
  }
  return out + ZWC_END;
}

function zwcToText(zwc) {
  const endIdx = zwc.indexOf(ZWC_END);
  if (endIdx === -1) return null;
  const parts = zwc.slice(0, endIdx).split(ZWC_SEP).filter(p => p.length > 0);
  const bytes = [];
  for (const part of parts) {
    if (part.length !== 8) return null;
    let byte = 0;
    for (let i = 0; i < 8; i++) byte = (byte << 1) | (part[i] === ZWC_ONE ? 1 : 0);
    bytes.push(byte);
  }
  return bytesToStr(new Uint8Array(bytes));
}

function extractZWC(text) {
  return [...text].filter(c => [ZWC_ZERO,ZWC_ONE,ZWC_SEP,ZWC_END].includes(c)).join('');
}

function injectIntoText(cover, payload) {
  const sp = cover.indexOf(' ');
  return sp === -1 ? cover + payload : cover.slice(0, sp) + payload + cover.slice(sp);
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function initTextStego() {
  const section = document.getElementById('section-text');
  initTabs(section);

  // ── Hide ──
  document.getElementById('txtHideBtn').addEventListener('click', async e => {
    const cover    = document.getElementById('txtCoverText').value.trim();
    const secret   = document.getElementById('txtSecretMsg').value.trim();
    const password = document.getElementById('txtHidePass').value;
    if (!cover)  { showToast('Cover text bo\'sh!', 'warning'); return; }
    if (!secret) { showToast('Secret xabar bo\'sh!', 'warning'); return; }

    const proc = showProcessing('Matnga yashirilyapti…');
    spawnParticles(e.currentTarget);
    await tick();

    try {
      const zwc    = textToZWC(preparePayload(secret, password));
      const result = injectIntoText(cover, zwc);
      proc.update(80); await delay(150); proc.done();

      const wrap = document.getElementById('txtHideResult');
      document.getElementById('txtHideOutput').value = result;
      wrap.classList.remove('hidden');
      glowSuccess(wrap);
      showToast('Yashirildi! Nusxa oling va ulashing.', 'success');
    } catch (err) {
      proc.done(); showToast(err.message, 'error');
    }
  });

  // Copy
  document.getElementById('txtHideCopy').addEventListener('click', () => {
    const val = document.getElementById('txtHideOutput').value;
    navigator.clipboard.writeText(val)
      .then(() => showToast('Nusxa olindi!', 'success'))
      .catch(() => showToast("Nusxa olishda xato.", 'error'));
  });

  // ── Reveal ──
  document.getElementById('txtRevealBtn').addEventListener('click', async e => {
    const stego    = document.getElementById('txtRevealInput').value;
    const password = document.getElementById('txtRevealPass').value;
    if (!stego) { showToast('Stego matn kiriting!', 'warning'); return; }

    const proc = showProcessing('Yashirin xabar qidirilmoqda…');
    spawnParticles(e.currentTarget);
    await tick();

    try {
      const zwc = extractZWC(stego);
      if (!zwc) throw new Error('Bu matnda yashirin xabar topilmadi.');
      const raw = zwcToText(zwc);
      if (!raw) throw new Error('Ma\'lumot dekod qilinmadi. To\'liq matni joylashtiring.');
      const res = extractPayload(raw, password);
      proc.done();
      if (!res.ok) { showToast(res.error, 'warning'); return; }
      const wrap = document.getElementById('txtRevealResult');
      const btn = document.getElementById('txtRevealBtn');
      document.getElementById('txtRevealOutput').textContent = res.message;
      showMessageReveal(btn, wrap);
      showToast('Yashirin xabar topildi!', 'success');
    } catch (err) {
      proc.done(); showToast(err.message, 'error');
    }
  });
}

// Export for universal reveal
window.textReveal = (text, password) => {
  const zwc = extractZWC(text);
  if (!zwc) return null;
  const raw = zwcToText(zwc);
  if (!raw) return null;
  return extractPayload(raw, password);
};

// (tick, delay, glowSuccess are defined in utils.js)
