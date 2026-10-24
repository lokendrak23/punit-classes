# Punit Classes — mobile usability update

This drop replaces the older `punit-classes-mobile-fixes.zip` build. It targets the live Render website and the existing Android WebView APK.

## Fixed

1. **Mobile navigation**: The bottom bar now shows five evenly spaced items: Home, Videos, Notes, Tests, and Doubts. Teachers access the admin dashboard using the **Manage** button in the mobile header (sidebar Control center is unchanged on desktop). Safe-area bottom spacing is included. A min-content overflow in dashboard cards that caused the bar to extend beyond the right edge on 320px screens was fixed.
2. **Video Lectures / Watch lesson**: Selecting a lesson displays a player inside the Video Lectures page with the title, a Library return button, and an Open original link. It no longer navigates to Overview. Background updates do not destroy and restart the player while the student is watching.
3. **Login and registration**: Clearer mobile layout with a compact Punit Classes header, Sign in / Join class selector, larger inputs, show/hide password, and simplified copy.
4. **AI extraction progress**: Displays actual file-read progress, then an **indeterminate** animated activity bar while Gemini processes the PDF/DOCX, followed by faculty review. An honest percent-complete for Gemini cannot be obtained from a single synchronous API request; the interface explicitly indicates that the animated bar is not a percentage. Errors remain visible beside the upload field.
5. **Additional student UI fixes**: Search field on mobile Videos and Notes pages; quiz answer selection retains scroll position; small-screen cards no longer force the viewport wider than the phone; mobile buttons and media cards are easier to tap.
6. **Fresh frontend assets**: Static JS and CSS are served with `Cache-Control: no-cache` so an updated Android WebView loads new frontend changes on the next reload instead of keeping an outdated cached UI for 10 minutes.

## Deploy

Extract the ZIP and copy the source over your existing **Git repository working tree**. Preserve `.git`, `.env`, and any local files holding secrets. Do not copy any secret `.env` into Git. In PowerShell, from the repo root:

```powershell
git status
git add .
git commit -m "Improve mobile navigation, lesson player and AI extraction UX"
git push origin main
```

On Render, verify that the new commit has deployed (or use **Manual Deploy → Deploy latest commit**). Reload the website or close/reopen the existing Punit Classes APK.

## Verification done

- `npm test`: all 13 API / security / importer tests passed.
- `npm run check`: backend and frontend JavaScript syntax checks passed.
- Browser smoke tested with a **mock backend** in Chromium at 320px and 390px: responsive layout, login mode and password toggle, five bottom tabs, faculty Manage entry, in-page video playback selection, background refresh keeping the same player, and AI import activity UI + draft review.
- The live Render site, Gemini API, YouTube playback on an actual Android device, and signed APK were **not** tested in this environment.

## Technical notes

- No TablesDB schema changes and no new API keys or environment variables.
- Your Android APK loads the Render website. **Website-only changes normally do not need a new APK**. If the phone's native Android navigation bar itself overlays the webpage due to Android 15 edge-to-edge behavior, that specific issue may require an APK/WebView layout update in Android Studio.
