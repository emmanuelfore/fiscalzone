## FISCZIM Pause (Expo / React Native)

This is a small companion mobile app that connects to the **same Supabase project** and talks to the **same backend `/api/*` routes** used by the web app.

### What it does

- **Login** via Supabase email/password (same users as web)
- **Select company** from `GET /api/companies`
- **Pause / Resume** a “terminal pause” state (stored locally on-device)
- **Resume requires Manager PIN** via `POST /api/companies/:companyId/auth/verify-manager-pin`

### Setup

1) Create your env file.

- Copy `mobile/.env.example` to `mobile/.env`
- Fill in:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_API_BASE_URL`

Important: if you are testing on a **real phone**, `EXPO_PUBLIC_API_BASE_URL` must be your computer’s **LAN IP**, not `localhost`.

2) Install dependencies (requires Node.js + npm).

```bash
cd mobile
npm install
```

3) Start Expo.

```bash
npm run start
```

### Deployment (EAS Build)

To build standalone binaries for Android or iOS:

1. **Install EAS CLI**: `npm install -g eas-cli`
2. **Login**: `eas login`
3. **Build**:
   - **Android APK**: `eas build --platform android --profile preview`
   - **Android AAB**: `eas build --platform android --profile production`
   - **iOS**: `eas build --platform ios --profile production`

### Notes

- The app uses `@supabase/supabase-js` with `AsyncStorage` for persisted sessions.
- If you later want this to be a true “pause the POS shift” feature, we can connect it to the POS shift routes:
  - `GET /api/pos/shifts/current`
  - `POST /api/pos/shifts/open`
  - `POST /api/pos/shifts/:id/close`

