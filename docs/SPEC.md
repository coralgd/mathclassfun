# Product Specification (RU)

## Pages

- `/` — вход/регистрация
- `/verify` — подтверждение email + заявка на верификацию
- `/home` — главное меню
- `/voting` — заполнение 5 категорий голосования
- `/moderator` — модерация игроков/отправок/заявок
- `/elder` — расширенные права (роли + блокировки устройств)
- `/banned` — страница блокировки
- `/leaderboard` — таблица лидеров

## Firestore Collections

- `users`
- `verificationRequests`
- `votes`
- `leaderboardResults`
- `blockedDevices`
- `activityLogs`

## Critical Security Constraints

Client MUST NOT directly:

- change roles
- set verified status for others
- modify leaderboard results
- block/unblock devices
- moderate чужие votes

These actions must go through Cloud Functions with role checks.

## Voting Scoring

Points by place:

1 -> 9, 2 -> 8, 3 -> 7, 4 -> 6, 5 -> 5,
6 -> 4, 7 -> 3, 8 -> 2, 9 -> 1, 10 -> 0

## Device Fingerprint

Use FingerprintJS and store as `users.deviceFingerprint`.
