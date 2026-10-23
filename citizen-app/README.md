# ResQ Bharat — Citizen SOS App (Expo Go)

Real-time, mobile-first Emergency Reporting & 1-Click SOS application built with **React Native & Expo Go**, integrated directly into the **ResQ Bharat Autonomous Multi-Agent Command Dashboard**.

---

## 🚀 Key Capabilities

1. **Google OAuth 2.0 Citizen Authentication**:
   - One-tap sign-in with official Google profile verification.
   - Embeds authenticated civilian identity (Name, Email, Google Photo) in every distress transmission to eliminate spoofed reports.

2. **1-Click High Alert SOS**:
   - Giant tactile SOS trigger.
   - **Haptic Vibration**: Triple rapid pulsing vibration alert (`Vibration.vibrate([0, 400, 200, 400, 200, 600])`).
   - High-accuracy GPS location capture (`expo-location`) with reverse-geocoded landmark address.
   - Instant emergency ambient audio capture (`expo-audio`).
   - Automated priority dispatch: Ingested as **CRITICAL Priority 1** with automatic Police Dial 100 PCR cruiser dispatch.

3. **Multimodal Evidence Reporting**:
   - **Audio Intercept**: In-app recording of civilian distress speech, ambient sounds, cries for help.
   - **Photo Evidence**: Camera & gallery photo capture of floods, fire, vehicle crashes, or criminal acts (`expo-image-picker`).
   - **Text / Voice Transcript**: Rapid categorization (Flood, Fire, Medical, Police / Dial 100 Crime, Earthquake).

4. **Multilingual Interface**:
   - Seamless toggling between **English**, **हिंदी (Hindi)**, and **Hinglish** for rapid accessibility across Indian civilians during high-stress crises.

5. **Command Center Isolation Guarantee**:
   - The ResQ Bharat command dashboard features an **`[📡 CITIZEN: LIVE / ISOLATED]`** toggle.
   - When set to **ISOLATED**, the hackathon 11-incident deterministic simulation runs completely uninterrupted without external signal contamination.
   - When set to **LIVE ONLINE**, incoming citizen signals appear in real-time, auto-triggering the Gemini Hierarchical Agent pipeline and dialing out Dial 100 PCR & NDRF units!

---

## 🔑 Google Cloud Console Configuration

For your Client ID:
- **Client ID**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`

### 1. Authorized JavaScript Origins
Add the following entries under **Authorized JavaScript origins**:
- `http://localhost:3000` *(Next.js Command Center & Web Companion)*
- `http://localhost:8081` *(Expo Web dev server)*
- `https://auth.expo.io` *(Expo AuthSession service)*

### 2. Authorized Redirect URIs
Add the following entries under **Authorized redirect URIs**:
- `http://localhost:3000/citizen` *(Web Companion Redirect)*
- `http://localhost:8081` *(Local Expo Web session)*
- `https://auth.expo.io/@anonymous/resq-citizen` *(Default Expo Go Auth session)*
- `https://auth.expo.io`

---

## 📱 Running with Expo Go (Physical Phone or Emulator)

### Prerequisites
1. Install **Node.js** (v18+) on your computer.
2. Install the **Expo Go** app on your iOS (App Store) or Android (Google Play Store) phone.
3. Ensure both your computer and phone are connected to the same Wi-Fi network.

### Steps

1. Navigate to the `citizen-app` folder:
   ```bash
   cd citizen-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Scan the displayed QR code with your phone camera (iOS) or the Expo Go app (Android).

5. In the app settings on your phone, set the **Command Center URL** to your computer's local IP address:
   ```
   http://<YOUR_LAPTOP_IP>:3000
   ```
   *(e.g., `http://192.168.1.15:3000`)*.

---

## 🌐 Web Companion Mode (Immediate Testing in Browser)

You can also test the Citizen experience immediately in any desktop or mobile browser without installing Expo:

1. Open your browser and navigate to:
   ```
   http://localhost:3000/citizen
   ```
2. Sign in with Google Auth, grant browser Location & Microphone permissions.
3. Press **🚨 1-CLICK SOS** or file a report.
4. Switch to the main dashboard at `http://localhost:3000`, turn on the **`[📡 CITIZEN: LIVE ONLINE]`** toggle, and watch your signal appear live!
