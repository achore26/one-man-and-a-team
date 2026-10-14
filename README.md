# 🛠️ One Man and a Team - Offline Quote & Invoice Generator

A lightweight, mobile-first, **100% offline** quote and invoice generator created specifically for **Owen** under the banner **"One Man and a Team"** (covering CCTV, Building, and Mechanical services).

---

## 📱 How to Use on Owen's Phone (PWA Install)

### On iPhone (Safari):
1. Open the hosted link in **Safari**.
2. Tap the **Share** button (box with an upward arrow at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. The **"OMT Quotes"** app icon is now on his home screen and launches full-screen **even without an internet connection (Airplane mode)**.

### On Android (Chrome):
1. Open the hosted link in **Chrome**.
2. Tap the three dots menu (top right) or the banner at the bottom.
3. Tap **"Install app"** or **"Add to Home Screen"**.
4. The app is installed natively on his device and works completely offline.

---

## ⚡ Key Features

- **100% Offline Capability**: Runs directly inside the phone's browser cache using a Service Worker and local storage. No server required.
- **Client-Side PDF Engine**: Generates crisp, professional PDF quotes in milliseconds via `jspdf`.
- **One-Tap WhatsApp & Native Share**: Sends quotes directly to customers via WhatsApp or native share sheet.
- **Quick-Fill Trade Presets**: Tap quick chips to instantly insert common jobs (CCTV 4-cam kit, full-day labor, mechanical diagnostics, cabling, building prep).
- **Quote & Invoice Switcher**: Toggle between an estimate/quote and a final tax invoice.
- **Deposit & Milestone Calculations**: Configurable deposit percentages (e.g. 50% upfront for materials).
- **Auto-Saving & History**: Never loses typed progress; past quotes are saved locally to reload or duplicate anytime.
- **Customizable Business Profile**: Owen can edit his phone number, email, address, and bank/Zelle payment details in settings (`⚙️`).

---

## 🚀 How to Run Locally

```bash
# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Free 1-Minute Deployment Options

Owen can host this for free so he can open it on his phone:

### Option A: Vercel (Recommended - 30 seconds)
1. Run `npx vercel` in this folder.
2. Follow the 2 prompts.
3. You get a free HTTPS link (e.g. `https://onemanandteam.vercel.app`) ready to add to his home screen!

### Option B: Netlify Drop
1. Run `npm run build`.
2. Drag and drop the `dist` folder directly onto [app.netlify.com/drop](https://app.netlify.com/drop).
3. Done!

### Option C: GitHub Pages
1. Push this repository to GitHub.
2. In Repository Settings $\rightarrow$ Pages $\rightarrow$ select `dist` or GitHub Actions $\rightarrow$ Deploy!
