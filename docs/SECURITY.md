# Security

- `SERPAPI_API_KEY` stays on the server. `.env.local` is gitignored. A `NEXT_PUBLIC_` key is ignored and does not mark live search as ready.
- `.env.example` has empty placeholders only.
- Errors from SerpApi are sanitized before they are stored or shown. Long tokens are redacted.
- Public page fetches are limited to HTTPS, skip private hosts, and stop on access-denied or captcha pages. The app does not log in, solve challenges, or bypass robots controls.
- TenderWatch does not submit bids or automate government accounts.

If a secret is committed, remove it from history before pushing again.
