# MathClassFun

Firebase backend + minimal protected frontend pages for the ranking/voting platform.

## Included

- Product spec in `docs/SPEC.md`.
- Firestore security rules in `firestore.rules`.
- Firestore indexes in `firestore.indexes.json`.
- Cloud Functions in `functions/index.js`.
- Hosting pages in `public/` with route guards.

## Frontend routes

- `/` — login/registration
- `/verify` — email verification and verification request
- `/home` — main page for verified users
- `/voting` — verified-only page
- `/leaderboard` — verified-only page
- `/moderator` — roles `moder|elder` only
- `/elder` — role `elder` only
- `/banned` — blocked-device page

## Security model

- Client guards prevent navigation to pages without required auth/verification/role.
- Firestore rules and Cloud Functions enforce server-side authorization and data integrity.
- Critical actions remain server-side (`verifyPlayer`, `moderateVote`, `blockDevice`, `setRole`).
