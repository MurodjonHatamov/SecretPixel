# 🔐 Steganography — Secret Message Studio

A fully client-side steganography web application built with **HTML**, **JavaScript**, and **Tailwind CSS**. Hide secret messages inside text, images, audio, video, and documents — all processed locally in your browser. No data is ever sent to a server.

---

## ✅ Completed Features

### 🔤 Text-in-Text
- Zero-width Unicode character encoding (U+200B / U+200C)
- Inject secret payload after the first word of cover text
- Full hide & reveal workflow
- Optional password protection (XOR cipher)

### 🖼️ Text-in-Image
- LSB (Least Significant Bit) pixel-level encoding on the R channel
- Accepts JPG, PNG, WEBP as input
- Always outputs PNG (lossless, to preserve hidden bits)
- 32-bit length header for reliable extraction
- **Built-in camera capture** (take a photo directly)
- Animated progress bar during encoding

### 🎵 Text-in-Audio
- LSB encoding on Float32 PCM audio samples
- Accepts MP3, WAV, OGG, WEBM audio
- Output: WAV (PCM, lossless)
- **Built-in microphone recorder** with timer
- Animated progress bar during encoding

### 🎬 Text-in-Video
- Binary chunk appended at the end of the video container
- Custom magic signature `STEGOVID` / `ENDSTEGO`
- Accepts MP4, WEBM, MOV, AVI
- Output format matches input extension
- **Built-in camera video recorder** with start/stop controls

### 📄 Text-in-Document
- Binary chunk appended at end of document file
- Custom magic signature `STEGODC1` / `ENDSTDOC`
- Supports PDF, DOCX, PPTX, XLSX, DOC, PPT, TXT, ODT
- Document remains fully functional after embedding
- Password protection support

### 🔍 Universal Reveal / Decode
- **Drag-and-drop** or click-to-browse file selector
- Auto-detects file type (image, audio, video, document, text)
- Paste stego-text directly for text steganography
- Password input for encrypted messages

### 🔑 Password Protection
- Available for ALL modes
- XOR cipher with base64 encoding
- Graceful "wrong password" error handling

### 🎨 UI/UX
- **Dark/Light mode** with Telegram-style full-screen spreading animation
- **Ripple effects** on all buttons and cards
- **Binary particle** encoding animations (spawn on action)
- Floating background binary particles
- Processing overlay with spinning rings animation
- Toast notifications (success / error / info / warning)
- **Mobile-first** responsive design
- Sticky navigation sidebar (desktop) + slide-out drawer (mobile)
- Glassmorphism card design
- Gradient accents (violet → cyan)

---

## 🌐 Entry Points

| Path | Description |
|------|-------------|
| `/` or `index.html` | Main application |
| `#home` → section-home | Landing / mode selector |
| `#text` → section-text | Text-in-text steganography |
| `#image` → section-image | Text-in-image steganography |
| `#audio` → section-audio | Text-in-audio steganography |
| `#video` → section-video | Text-in-video steganography |
| `#doc` → section-doc | Text-in-document steganography |
| `#reveal` → section-reveal | Universal reveal / decode |

---

## 📁 File Structure

```
index.html          — Main HTML shell
css/
  style.css         — Custom CSS (glassmorphism, animations, ripple, theme)
js/
  utils.js          — Shared utilities (toast, processing, download, ripple)
  crypto.js         — XOR encryption/decryption + payload wrapping
  stego-text.js     — Zero-width character steganography
  stego-image.js    — LSB image steganography + camera
  stego-audio.js    — LSB audio steganography + microphone recorder
  stego-video.js    — Binary-append video steganography + video recorder
  stego-doc.js      — Binary-append document steganography
  reveal.js         — Universal reveal / decode module
  app.js            — Navigation, theme toggle, app controller
```

---

## ⚙️ Technical Details

| Feature | Method |
|---------|--------|
| Text-in-text encoding | Zero-width Unicode chars (ZWC) |
| Image encoding | LSB on R channel, 1 bit/pixel |
| Audio encoding | LSB on Float32 PCM samples |
| Video encoding | Appended binary chunk w/ magic bytes |
| Document encoding | Appended binary chunk w/ magic bytes |
| Password | XOR cipher + Base64, with 1-byte flag |
| Payload format | `MAGIC + flag(0/1) + : + content` |

---

## 🔮 Recommended Next Steps

- [ ] Upgrade encryption to **AES-256-GCM** using Web Crypto API
- [ ] Add **QR code** output for encoded text messages
- [ ] Support **multi-channel audio** steganography
- [ ] Add **steganography strength indicator** for images
- [ ] Progressive Web App (PWA) with offline support
- [ ] Batch processing mode
- [ ] Export/import settings profile
- [ ] History of encoded/decoded items (local storage)

---

## 🛡️ Privacy

All processing happens **100% in your browser**. No files, messages, or passwords are ever transmitted to any server.

---

*Built with ❤️ using HTML, JavaScript, and Tailwind CSS*
