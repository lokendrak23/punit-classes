# Mobile usability and reliability update

## Fixed
- Faculty dashboard now starts with four clear shortcuts: Upload lesson, Import test, Go live, and Manage class.
- Switching between Paste link and Upload file does not reconstruct the publishing form or wipe typed title, chapter, or selected file.
- Background classroom synchronization does not reconstruct faculty forms or question-review fields every ten seconds.
- Admin page updates preserve document and AI review scroll position; on narrow mobile screens, question review is a single continuous page instead of a nested scroll area.
- Mobile buttons and forms have larger touch targets, better wrapping, and mobile-sized layout. Input sizes avoid Android browser zoom on focus.

## Deployment
Keep the existing GitHub repository's `.git` folder and local `.env` file. Copy the project source files over your checked-out repository, then `git add .`, `git commit`, and `git push origin main`. Render must deploy the new commit for the APK WebView to receive these changes.

## Notes
No database migration or new environment variables are needed. These fixes do not require rebuilding the Android APK because the current Android shell loads the hosted website. Test uploads and 100-question review on an actual phone after deploying.
