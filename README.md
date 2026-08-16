# TheSocialBook

A social network built in India, for India — Facebook-style app with phone-based signup (10-digit Indian mobile number), password login, password reset via phone, real-time notifications, stories, and photo sharing.

## 📱 Download App

[![Download APK](https://img.shields.io/badge/APK%20v1.2.5-Download-d73a49?style=for-the-badge&logo=android)](https://github.com/Akhil24thakur/thesocialbook/releases/latest)

**[Get the Latest APK →](https://github.com/Akhil24thakur/thesocialbook/releases/latest)**

- ✅ Phone/username + password login
- ✅ Forgot password via phone verification
- ✅ Change password in the app menu
- ✅ Posts, likes, comments, follow
- ✅ Real-time notifications (likes, comments, follows)
- ✅ Stories with 24-hour expiry
- ✅ Photo uploads

<details>
<summary><b>📲 How to Install APK</b></summary>
<br>

1. Visit the [latest release](https://github.com/Akhil24thakur/thesocialbook/releases/latest)
2. Download `TheSocialBook.apk` from the "Assets" section
3. Open your Downloads folder and tap the APK file
4. If prompted, enable "Unknown sources" in Settings → Security
5. Tap **Install** and open the app
</details>

---

## Stack

| Layer    | Tech                                   |
| -------- | -------------------------------------- |
| Mobile   | React Native (Expo SDK 57) + React Navigation |
| Backend  | Node.js + Express (TypeScript)         |
| Database | Prisma ORM — SQLite (dev) → PostgreSQL (prod, trivial switch) |
| Auth     | JWT (30-day token) + bcrypt            |

## Structure

```
thesocialbook/
├── backend/          # Express API (port 4000)
│   ├── prisma/       # schema, migrations, seed
│   └── src/          # routes: auth, posts, users
└── mobile/           # Expo Android app
    └── src/          # screens, components, auth context
```

## Run it

### 1. Backend

```bash
cd backend
npm run dev          # starts API on http://0.0.0.0:4000
```

First-time setup (already done in this repo, but re-run after DB changes):

```bash
npm run db:migrate   # prisma migrate dev
npm run db:seed      # demo users + posts
```

Demo logins (seed): `9876500001..9876500003` / `password123`

### 2. Mobile app (Android)

1. Install **Expo Go** on your Android phone (Play Store).
2. `cd mobile && npm start`
3. Scan the QR code with Expo Go.

The phone reaches your PC's backend through your LAN IP, configured in
`mobile/.env` (`EXPO_PUBLIC_API_URL`). **If your network IP changes, update it** —
or set it once and change the PC address when needed.

### API endpoints

| Method | Path                     | Description                     |
| ------ | ------------------------ | ------------------------------- |
| POST   | `/api/auth/register`     | Signup (name, phone, password)  |
| POST   | `/api/auth/login`        | Login (phone, password)         |
| GET    | `/api/auth/me`           | Current user                    |
| PATCH  | `/api/auth/me`           | Update name/bio                 |
| GET    | `/api/posts/feed`        | Newsfeed (newest 50)            |
| POST   | `/api/posts`             | Create post                     |
| DELETE | `/api/posts/:id`         | Delete own post                 |
| POST   | `/api/posts/:id/like`    | Toggle like                     |
| GET    | `/api/posts/:id/comments`| Comments on post                |
| POST   | `/api/posts/:id/comments`| Add comment                     |
| GET    | `/api/users/:id`         | User profile                    |
| GET    | `/api/users/:id/posts`   | User's posts                    |

## Planned increments

1. ✅ Core MVP (this)
2. Follow/unfollow, friends list, notifications
3. Image uploads (posts + avatar), stories
4. Hindi + regional language support, dark mode
5. Chat / DMs, groups & communities
6. Feed algorithm, moderation & safety tooling
7. PostgreSQL + production deployment, scale-out
