# Punit Classes — Full-stack Classroom (v3)

A responsive classroom web app with a **real Node.js backend**, **Appwrite account sessions and private TablesDB**, **Cloudinary signed uploads**, and secure faculty-only operations.

> **Integration status:** The backend and frontend code and local mock tests are included. No live Appwrite/Cloudinary services or production domain were connected in this build. Deployment is not complete until you set credentials, initialize the database, test sign-in/upload against your accounts, and run the launch checklist below.

## Features

| Students | Punit Sir (Faculty) |
| --- | --- |
| Student registration with protected batch code | Admin role tied to a server-configured Appwrite user ID |
| Persistent account login | Publish/remove lectures and PDFs |
| Access shared resources and class links | Start/end YouTube live class links |
| Watch embedded YouTube videos or direct Cloudinary video | Add/delete MCQ questions |
| Post live chat and questions with image attachments | Moderate chat and doubts |
| Take +4/−1 MCQ tests and view ranked results | Clear leaderboards and tests |

- **Secure sign-in:** Appwrite handles password authentication; the Node backend rewrites Appwrite session cookies as first-party HTTP-only cookies on the classroom domain. No token or admin PIN is stored in JavaScript or localStorage.
- **Private database:** Appwrite TablesDB table permissions are empty. Only the Node API (using a secret server API key) accesses data; every request authenticates the current Appwrite account and checks enrollment/teacher role.
- **Secure grading:** Correct MCQ answers are not sent to student browsers until they submit. The backend checks answers, assigns scores, and stores one ranked attempt per student for the current test version.
- **Media:** Authorized uploads get short-lived **server-signed** Cloudinary parameters; the browser uploads directly to Cloudinary instead of saturating the backend. PDF/video max upload size in the client is 100 MB (larger videos should use YouTube unlisted links). Doubt photos are compressed and uploaded to a separate `doubts` folder.
- **Near-real-time updates:** The browser refreshes classroom state every 10 seconds when visible. It is **polling**, not WebSockets or a video-conferencing server. Actual live video is supplied via YouTube Live or a supported video URL.
- **No dependency installation:** Runs on Node.js 22 or later using built-in Node libraries and native browser modules.

## 1. Appwrite setup

1. Use an Appwrite Cloud project (you may reuse your existing Punit Classes project). Find its **Project ID** and **API endpoint** under Settings.
2. In Appwrite, enable **Email/Password authentication**. Configure your email provider, verification policy, backups, and other Auth settings before inviting real students. This starter does **not** yet implement email verification or password-reset UI: use Appwrite's console/account flows until you add them.
3. Create a server API key. For the default **TablesDB**, allow these scopes:
   - `databases.read`, `databases.write`
   - `tables.read`, `tables.write`
   - `rows.read`, `rows.write`
   The setup script needs database/table **write**; the running API primarily needs document read/write, so preferably use *separate* setup and runtime keys with least privilege. See [Appwrite API key scopes](https://appwrite.io/docs/partners/project/api-keys).
4. Copy `.env.example` to `.env`, fill `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, and `APPWRITE_ENDPOINT`.
5. Initialize a **new isolated TablesDB database** and its eight private tables:

   ```bash
   npm run db:setup
   ```

   Default database ID: `punit_classes_prod`. The setup is idempotent if the database/tables already exist. **Do not point it at your old `punit_db` without reviewing its existing schema and permissions first.**

   This implementation specifically uses **TablesDB**, not legacy Appwrite Databases. For old `punit_db` data, plan an explicit migration into these new tables instead of changing the database type.

## 2. Faculty account setup

1. Generate an unpredictable batch code (at least 12 characters). Set `BATCH_ACCESS_CODE` on the server.
2. Have Punit Sir create an account using the student registration screen with that batch code, or create his account directly in the Appwrite Console.
3. Copy **Punit Sir's actual Appwrite user ID**, not his phone number, into `TEACHER_USER_IDS` in `.env`. Multiple faculty user IDs may be comma-separated.
4. Restart the Node server. Punit Sir signs in using his own email/password; the API now recognizes his user ID as `admin`.

Important: faculty roles **cannot** be assigned using browser data, a public batch code, a hard-coded PIN, or a login-page toggle. Only somebody with access to the server configuration can grant the faculty role.

## 3. Cloudinary uploads (optional but recommended)

1. Get Cloudinary's **Cloud Name**, **API Key**, and **API Secret** from the Cloudinary console.
2. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to `.env` on the **backend only**.
3. **Disable or tightly restrict the old unsigned upload preset `fnjq45mg`** from your original HTML if you no longer need it. Otherwise third parties could still upload using the public preset, bypassing these new signed-upload checks. Rotate any other legacy secrets that were exposed in old public code.
4. Use Cloudinary security controls to restrict allowed formats, abuse, and quota for your account. Prefer YouTube for long videos (signed single-request direct uploads are limited to **100 MB** here; Cloudinary uses chunked methods for large videos).
5. Uploads are signed through `POST /api/uploads/sign` for authorized members. **Only admins can sign classroom content uploads.** Members can sign images for doubt posts.

Do **not** put your Cloudinary API secret, Appwrite API key, or batch code in `index.html`, a JavaScript file, a screenshot, or GitHub.

## 4. Run locally

```bash
# Install Node 22+ first
cp .env.example .env
# Edit .env using a local editor and keep it secret
npm run db:setup
npm run dev
```

Visit **http://localhost:5173**. `npm run test` runs backend authorization/integration tests using a mock Appwrite adapter; `npm run check` verifies JavaScript syntax.

The app can serve its login page without working secrets, but actual registration, login, shared data, and uploading **require configured live services**.

## 5. Deployment (Render / Docker)

1. Push the project source (excluding `.env`) to a **private** GitHub repository.
2. In Render, create a Blueprint using `render.yaml`, or deploy the included `Dockerfile` as a web service.
3. Enter all environment variables in Render **secret settings**. Set `NODE_ENV=production` and **APP_ORIGIN to the exact HTTPS origin**, e.g. `https://classes.example.com`.
4. Run `npm run db:setup` once from a trusted machine or one-off job, not on every production startup.
5. Configure your custom hostname, HTTPS and redirects. Check `/api/health` and test login/logout from an actual browser.
6. Enable monitoring, backups, quotas/alerting, and abuse protection for Appwrite and Cloudinary before enrolling students.

**Render free-tier sleep, multi-instance rate limiting, Appwrite/Cloudinary pricing and bandwidth** can affect the experience. The app has an in-memory per-instance throttle: for higher traffic, replace it with an external/shared rate limiter, implement pagination and stronger caching, and load-test it. For large live classes, use a realtime backend or push service rather than polling every 10 seconds.

## 6. Backend layout

```
index.html
src/
  main.js                 # Frontend events, API integration and navigation
  lib/api.js              # Same-origin API client and Cloudinary signed uploads
  lib/store.js            # Temporary UI snapshot, not a database
  pages/                  # Login, dashboard, lectures, materials, tests, doubts, admin
  components/             # Shared layout, chat, video, UI and icons
  styles.css              # Responsive UI theme
server/
  index.mjs               # HTTP server, CSP, CSRF protection, static assets
  api.mjs                 # Authentication/authorization and classroom API
  appwrite.mjs            # Private Appwrite REST adapter
  security.mjs            # Validation, scoring, cookies and rate limit helpers
  setup.mjs               # Idempotent TablesDB table provisioning
tests/api.test.mjs       # Backend security and behavior tests
Dockerfile
render.yaml
.env.example
```

## 7. API overview

- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/join`
- `GET /api/auth/me`, `/api/classroom`, `/api/config`, `/api/health`
- `POST /api/chat`, `/api/doubts`, `/api/test/submit`
- `POST /api/uploads/sign` — purpose `content` (faculty) or `doubt` (member)
- **Faculty-only:** `POST /api/publish`, `/api/live`, `/api/test/questions`, `/api/test/clear`, `/api/test/leaderboard/clear`, `/api/chat/clear`; `DELETE /api/{lectures|notes|doubts|test/questions}/{id}`

Every write requires `X-Punit-CSRF: 1`, an application JSON body, and an authorized Appwrite session cookie (except register/login). The API checks request origins and roles, and protects state from direct browser writes.

## 8. Launch-readiness checklist (still required)

- [ ] Install/configure Node 22+, Appwrite endpoint, runtime API key, teacher user ID, strong batch code
- [ ] Run TablesDB setup and verify private table permissions
- [ ] Test student registration, teacher login, session persistence, and logout using your actual Appwrite project
- [ ] Configure account email verification/password recovery and a faculty-assisted enrollment/revocation process
- [ ] Configure Cloudinary signed uploads, moderation, upload quotas, image deletion/retention, and protected content delivery if required
- [ ] Perform real end-to-end tests on mobile and desktop with two separate physical accounts
- [ ] Verify live YouTube/video links, PDF permissions, student result persistence, and data backup/restore
- [ ] Add privacy policy, retention/deletion, contact/support, monitoring and alerting before collecting student data
- [ ] Security review, penetration testing and load testing before a large-scale public release

**Not implemented yet:** actual video conferencing/live streaming infrastructure; payment system; push notifications; email verification/password recovery UI; private/DRM video authorization; multi-batch isolation; durable distributed rate limiting. The current architecture is suitable as a production-oriented **foundation**, not a claim that an unconfigured project is ready for a public launch.


## TablesDB migration (v3.1)

Set `APPWRITE_DATABASE_TYPE=tablesdb`. Use a Serverless TablesDB database with ID matching `APPWRITE_DATABASE_ID`; the setup script can also create it if your API key has provisioning permissions. The setup creates eight private tables and their columns. It is safe to rerun (existing resources are skipped). If you created a database with an auto-generated ID, copy that exact ID into `.env`. `TEACHER_USER_IDS` can be empty while testing student accounts. Appwrite table column provisioning may take a short time; if initial row creation reports a column is not ready, rerun `npm run db:setup`.

**Security:** rotate any Appwrite/Cloudinary secrets exposed in screenshots. Keep `.env` private.

### Reusing an existing TablesDB database

If you already created a database in Appwrite Console, set `APPWRITE_DATABASE_ID` to its **database ID** (not its display name). `npm run db:setup` will reuse that database and create the missing tables. On Free plans, creating a second database may fail due to a database-count limit.


## Render deployment (TablesDB)

1. Push this directory to a **private** GitHub repository. Never commit `.env`.
2. In Render choose **New > Blueprint**, connect the repository, and select the `render.yaml` blueprint. It creates a Docker web service.
3. Set required secret environment variables in Render: `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `BATCH_ACCESS_CODE`, `APP_ORIGIN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Set `APP_ORIGIN` to the exact public Render URL, e.g. `https://punit-classes.onrender.com` (no trailing slash). Leave `TEACHER_USER_IDS` blank until a faculty account exists.
4. Check `APPWRITE_DATABASE_ID` matches the existing TablesDB database ID. `APPWRITE_ENDPOINT` must be `https://fra.cloud.appwrite.io/v1` and `APPWRITE_DATABASE_TYPE` must be `tablesdb`.
5. Do not run database setup as a Render build command. Your database and tables were already created locally.
6. Deploy, open `/api/health`, and test student signup/login. Update `APP_ORIGIN` if the service URL differs, then redeploy.
7. Later set `TEACHER_USER_IDS` to the Appwrite user ID and redeploy to enable faculty access.

**Security:** Rotate previously exposed cloud secrets before going public. The APK must use the HTTPS Render domain, not localhost. Free-tier services can spin down and incur cold-start latency; review Render's current plan limits before distributing to students.

## AI-assisted question paper import

Faculty dashboard → **Import PDF / Word question paper**. Accepts `.pdf` and `.docx` (not legacy `.doc`) up to **8 MB**. Set `GEMINI_API_KEY` in Render → Environment (or local `.env`) and optionally `GEMINI_IMPORT_MODEL` (default `gemini-2.5-flash`). The key must remain on the Node server; never put it in the APK, GitHub or browser code. **Gemini free-tier requests are rate-limited and subject to Google’s data-use policies**; uploaded documents are sent to Google for processing. Free-tier eligibility depends on your Google AI Studio project. Do not upload confidential third-party documents without permission. The preview is not saved in TablesDB until faculty checks questions, options, answers, and confirms publish. Questions with unknown answers cannot be published. Import appends up to 100 questions to the existing test, and publishing increments its version and invalidates previous scores. PDF scanning/diagram recognition is best effort; split large 100-question papers into smaller sections for more reliable output. DOCX extraction reads document body text, not embedded chart/image contents. Export image-heavy Word documents as PDF for vision-assisted extraction. Existing students' WebView APK reflects server-side frontend updates on its next reload; no APK rebuild required.
