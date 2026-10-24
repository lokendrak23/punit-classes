# Punit Classes v5 — Android system bars, Admin access, Logout

## Why the previous fix was not enough

The website's `env(safe-area-inset-*)` handling alone cannot reserve space for Android 15 system bars inside a native Android WebView. The Android Studio wrapper targeted SDK 35 and used a full-screen WebView as the Activity root. On some Android 15+ phones, the website could consequently appear under the notification/status and gesture/navigation areas. This also made header controls hard to tap.

The v5 release includes **two coordinated deliverables**:

1. **This website/backend project:** mobile header now has a full-size `Log out` action, and teachers get a clearly labelled `Admin panel` action above the five student tabs. All existing teacher functionality remains, and web safe-area rules cover browser/PWA mode. Faculty content publishing is shown before AI import.
2. **Punit-Classes-Android-v2.zip (separate download):** Android's native root view consumes the real status/navigation bar insets, avoiding overlaps on Android 15 and gesture-navigation devices. Android `versionCode` is now 2.

## Deploy the website

Copy the extracted project files into your existing local Git repo (preserve `.git` and `.env`). Run:

```powershell
git add .
git commit -m "Fix mobile system bar layout, logout and faculty access"
git push origin main
```

If Render does not auto-deploy: Manual Deploy → Deploy latest commit. Check that the updated desktop/mobile website displays `Log out` and the faculty account's `Admin panel` entry.

## Rebuild the Android APK (required for Android system-bar fix)

Open **Punit-Classes-Android-v2.zip** as a separate Android Studio project. Build debug APK for your own testing, then generate a signed release APK using the **same signing keystore and application ID** as previous signed releases, with a higher `versionCode`. Do **not** send a keystore or passwords to ChatGPT, GitHub or Render. If the previous installed APK was a debug build signed with a different key, uninstalling it may be required before installing a release build (back up any local-only data first).

The Android app remains a WebView of `https://punit-classes.onrender.com`; it does not contain any Appwrite, Cloudinary or Gemini API secrets.

## Testing notes

- API tests and static UI regression tests (both roles): `npm test`.
- JS syntax: `npm run check`.
- Static rendered mobile layouts tested at 320px and 390px: no horizontal overflow; visible 44px Logout; five student tabs; Admin button for faculty; no console errors.
- Native Android `WindowInsets` code reviewed, but physical Android 15 testing and an Android SDK build are still required on your computer.
