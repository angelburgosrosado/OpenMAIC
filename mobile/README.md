# QuéWhat Android app

One Android app for **phones, Fire tablets, Android TV and Fire TV**. It opens
https://www.quewhat.com in a full-screen app window ([Capacitor](https://capacitorjs.com)), so every website
release reaches the apps right away. On a TV the website switches to its remote-friendly 10-foot layout.

| Thing | Value |
| --- | --- |
| App ID | `com.quewhat.app` |
| Shows on | phone/tablet launcher **and** Android TV / Fire TV home (leanback) |
| Offline | `www/offline.html`, bilingual "no connection — try again" screen |
| Icons, TV banner, splash | from the QuéWhat brand asset packages |

## Get a test build (no Android Studio needed)

Every change under `mobile/` runs **GitHub → Actions → "Android app"**. Open the latest run and download the
`quewhat-debug-apk` artifact. Install it on an Android phone, or sideload it to a Fire TV with the
Downloader app or `adb install`. You can also start a run by hand with **Run workflow**.

## Signed builds for the stores

1. Create an upload key once, on your own computer, and keep it safe (if you lose it you need Google's help
   to replace it):

   ```sh
   keytool -genkeypair -v -keystore quewhat-upload.keystore -alias quewhat -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 quewhat-upload.keystore > keystore.b64   # macOS: base64 -i quewhat-upload.keystore -o keystore.b64
   ```

2. In GitHub, go to **Settings → Secrets and variables → Actions** and add:
   `ANDROID_KEYSTORE_BASE64` (contents of `keystore.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
   (`quewhat`), `ANDROID_KEY_PASSWORD`.
3. The next run also uploads `quewhat-release`:
   - `app-release.aab` → **Google Play Console** (phone, tablet and Android TV tracks)
   - `app-release.apk` → **Amazon Appstore** (Fire tablets and Fire TV)

Store listing images (icons, feature graphic, TV banner, Fire TV background) are in the brand asset packages.

## Local development (optional)

```sh
cd mobile
npm install
npx cap sync android
npx cap open android   # opens Android Studio
```

To point the app at a preview deployment, change `server.url` in `capacitor.config.ts` (don't commit it).
