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

## Сообщение в Firestore: что нужно сделать с нуля

Ниже текст, который можно отправить как одно сообщение в Firestore (например, в коллекцию `activityLogs` или отдельную `adminMessages`):

```text
[ИНСТРУКЦИЯ ДЛЯ ЗАПУСКА ПРОЕКТА С НУЛЯ]
1) Firebase Console:
   - Создать проект.
   - Включить Authentication -> Email/Password.
   - Включить Firestore в Production mode.
   - Включить Functions, Hosting, App Check.

2) Локальная настройка:
   - firebase login
   - firebase use <project-id>
   - firebase deploy --only firestore:rules
   - firebase deploy --only firestore:indexes
   - firebase deploy --only functions
   - firebase deploy --only hosting

3) Обязательные коллекции:
   - users
   - verificationRequests
   - votes
   - leaderboardResults
   - blockedDevices
   - activityLogs

4) Проверка ролей и доступа:
   - player: только обычный доступ.
   - moder: /moderator + модерация заявок и голосов.
   - elder: всё moder + смена ролей и блокировки устройств.

5) Обязательные проверки перед релизом:
   - Нельзя зайти на /home, /voting, /leaderboard без verified.
   - Нельзя зайти на /moderator без role moder/elder.
   - Нельзя зайти на /elder без role elder.
   - Заблокированный пользователь уходит на /banned.

6) Серверные действия только через Functions:
   - calculateLeaderboard
   - verifyPlayer
   - moderateVote
   - blockDevice
   - setRole

7) Минимальный smoke test:
   - Регистрация -> письмо -> /verify.
   - Подтверждение email.
   - Подача verification request.
   - Верификация модератором.
   - Вход verified-пользователем на /home.
   - Отправка голосования.
   - Подтверждение отправки модератором.
   - Пересчет лидерборда.
```
