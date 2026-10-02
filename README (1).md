# OMMS - Occupational Medicine Management System
## Run
1. `npm install`
2. `createdb omms && psql omms -f database/omms.sql`
3. Put a random 32+ char `JWT_SECRET` in `.env` (command inside the file)
4. `npm start` -> http://localhost:3000
Login: `admin@omms.local` / `ChangeMe!123` (temporary - change immediately).
Without the server, open `login.html` from any static host: the UI runs in demo mode (data in localStorage, any password accepted).
## Status
- Pages read/write the demo store; `server/api.js` endpoints are ready but pages are not wired to them yet.
- Reminders create real in-app notifications only. Email/SMS/WhatsApp providers are not implemented (never reported as sent).
- Inline `onclick` handlers need `script-src-attr 'unsafe-inline'` in the CSP; remove them to tighten it.
