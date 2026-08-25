# SOCIALBOOK - PROJECT BRAIN

> Single source of truth for the entire codebase. Read this first before touching any file.
> Last updated: v4.1.1 (Aug 25, 2026)

---

## 1. PROJECT OVERVIEW

SocialBook is an Indian social network (like Instagram) with posts, stories, reels, messaging, live streaming, and E2E encryption.

**Monorepo structure:**
```
S:\thesocialbook\
  package.json           # workspaces: ["backend", "mobile"] (web is independent)
  backend\               # Node/Express/Prisma (PostgreSQL)
  mobile\                # Expo SDK 57 / React Native 0.86.2
  web\                   # Next.js 16 static export (GitHub Pages)
  .github\workflows\     # CI/CD
```

**Backend:** `https://thesocialbook-sp3c.onrender.com` (Render free tier)
**Website:** `https://akhil24thakur.github.io/thesocialbook/`
**GitHub:** `Akhil24thakur/thesocialbook`
**Package ID:** `com.thesocialbook.app`
**Deep link scheme:** `socialbook://`

---

## 2. KEY FILES CHEAT SHEET

### Mobile - Quick Access

| Need to change... | File |
|---|---|
| App crash / startup | `mobile/App.tsx` (line ~36 imports, ~640 stack screens) |
| Navigation / tabs | `mobile/App.tsx` (line ~470 tabItems, ~505 PagerView) |
| Feed posts | `mobile/src/screens/FeedScreen.tsx` |
| Post card UI | `mobile/src/components/PostCard.tsx` |
| Comments | `mobile/src/screens/PostDetailScreen.tsx` |
| Stories | `mobile/src/components/home/StoriesStrip.tsx` (strip), `StoryViewer.tsx` (viewer) |
| Reels | `mobile/src/screens/ReelsScreen.tsx` (YouTube WebView) |
| Chat/Messages | `mobile/src/screens/ChatScreen.tsx` (E2E encrypted) |
| Live streaming | `mobile/src/screens/LiveStreamScreen.tsx` |
| Profile (self) | `mobile/src/screens/ProfileScreen.tsx` |
| Profile (other) | `mobile/src/screens/UserProfileScreen.tsx` |
| API client | `mobile/src/api.ts` |
| WebSocket | `mobile/src/ws.ts` |
| Auth context | `mobile/src/auth/AuthContext.tsx` |
| Theme colors | `mobile/src/theme.ts` (lightColors/darkColors) |
| Theme context | `mobile/src/theme-context.tsx` |
| E2E encryption | `mobile/src/crypto.ts` |
| Types/interfaces | `mobile/src/types.ts` |
| Config (API URL) | `mobile/src/config.ts` |
| App version | `mobile/app.json` (version + versionCode) |
| Android signing | `mobile/android/app/build.gradle` |
| Crash logging | `mobile/src/crashLog.ts` |

### Backend - Quick Access

| Need to change... | File |
|---|---|
| Server entry | `backend/src/index.ts` |
| Route mounts | `backend/src/app.ts` |
| Auth (login/register) | `backend/src/routes/auth.ts` |
| Posts CRUD | `backend/src/routes/posts.ts` |
| Comments | `backend/src/routes/posts.ts` (comments sub-routes) |
| Stories | `backend/src/routes/stories.ts` |
| Reels (YouTube) | `backend/src/routes/reels.ts` |
| Messages | `backend/src/routes/conversations.ts` |
| Notifications | `backend/src/routes/notifications.ts` |
| User search/profile | `backend/src/routes/users.ts` |
| Image upload | `backend/src/routes/upload.ts` |
| Live streaming | `backend/src/routes/live.ts` |
| In-app updates | `backend/src/routes/update.ts` |
| Crash reports | `backend/src/routes/crash.ts` |
| WebSocket server | `backend/src/lib/ws.ts` |
| Push notifications | `backend/src/lib/fcm.ts` |
| File storage (R2) | `backend/src/lib/storage.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| JWT auth middleware | `backend/src/middleware/auth.ts` |
| Rate limiting | `backend/src/middleware/rateLimit.ts` |
| OTP/SMS (MSG91) | `backend/src/lib/otp.ts` |
| Notification creator | `backend/src/lib/notify.ts` |
| Bot system | `backend/src/bots/` (postScheduler, followScheduler, imageGenerator) |

### Web

| Need to change... | File |
|---|---|
| Homepage | `web/src/app/page.tsx` |
| Features page | `web/src/app/features/page.tsx` |
| Deep-link viewer | `web/src/app/post/page.tsx` |
| Download button | `web/src/components/DownloadButton.tsx` |
| Config | `web/next.config.ts` (basePath: /thesocialbook) |

---

## 3. MOBILE APP ARCHITECTURE

### Navigation Structure

```
SafeAreaProvider > ThemeProvider > AppContent
  KeyboardProvider > AuthProvider > NavigationContainer
    RootNavigator (Stack)
      Not logged in:
        Login, Signup
      Logged in:
        Home (PagerView tabs - no React Navigation tabs!)
        CreatePost, Search, PostDetail, UserProfile, EditProfile,
        ChangePassword, ForgotPassword, Notifications, Stories, Chat, Live
```

### Bottom Tabs (Custom PagerView - NOT @react-navigation/bottom-tabs)

| Index | Label | Component | Notes |
|---|---|---|---|
| 0 | Home | FeedScreen | Wrapped with TopAppBar |
| 1 | Reels | ReelsScreen | YouTube WebView feed |
| 2 | Messages | MessagesScreen | Badge: chatUnread |
| 3 | Search | SearchScreen | |
| 4 | Profile | ProfileScreen | |

Live is NOT a tab - it's a stack screen accessed via "+" menu > "Go Live".

### Modals in HomeTabs
- `CreateMenu` - bottom sheet: Create Post, Upload Photo, Go Live
- Profile menu sheet - Theme, Change Password, Logout
- Theme picker - System/Dark/Light

### Auth Flow
- `AuthContext.tsx` provides `user`, `token`, `login`, `register`, `logout`
- Token persisted via `expo-secure-store`
- Login accepts phone, username, or email
- Password reset: phone OTP -> verify -> set new password

### Real-time Events (WebSocket)
- `ws.ts` manages connection with auto-reconnect (exponential backoff)
- Events: `new_message`, `message_read`, `viewer_count`, `viewer_joined`, `viewer_left`, `live_started`, `live_ended`
- `sendWs()` sends payloads, `onWsEvent()` subscribes by event type

### E2E Encryption
- tweetnacl keypair generated on first login, stored in SecureStore
- Public key registered with server via `PUT /api/users/me/public-key`
- Messages prefixed with `enc:v1:` when encrypted
- Decryption handled in `ChatScreen` via `crypto.ts`

---

## 4. BACKEND ARCHITECTURE

### Server Stack
- **Runtime:** Node.js with Express 4
- **Database:** PostgreSQL via Prisma ORM (Neon serverless)
- **Auth:** JWT (7-day expiry), `requireAuth` middleware
- **WebSocket:** ws library on `/ws` path, JWT-authenticated
- **Storage:** Cloudflare R2 (primary), Supabase (fallback)
- **Push:** Firebase Admin FCM + Expo Push API
- **SMS:** MSG91 for OTP
- **Bots:** 4 quote-posting bots (sadhguru, dilkiawaaz, sochkasafar, sheroshayari)

### Middleware Chain
```
cors() -> express.json() -> routes -> 404 -> 500 handler
```

### Database Models (17 total)

| Model | Purpose |
|---|---|
| User | Users with name, username, phone/email, avatar, verified badge, E2E public key |
| Post | Text posts with optional image |
| Like | Post likes (unique per user+post) |
| Comment | Post comments with nested replies |
| PostView | Tracks which posts a user has seen (for feed ranking) |
| Story | 24h-expiring stories with optional music metadata |
| Follow | Follower/following relationships |
| Conversation | Chat conversation container |
| ConversationMember | Per-user conversation membership + unread count |
| Message | Chat messages (E2E encrypted) |
| Notification | In-app notifications (like, comment, follow, message, etc.) |
| DeviceToken | Push notification device tokens |
| Reel | YouTube Shorts proxy cache |
| ReelLike / ReelComment | Reel engagement |
| LiveSession | Live streaming session (host, status, stream key, RTMP URL) |
| LiveViewer | Who's watching a live stream |
| LiveComment | Comments during a live stream |
| CrashReport | Client crash reports |
| OtpCode | Phone OTP codes for password reset |

### Feed Ranking Algorithm
`GET /api/posts/feed` uses:
1. Unread-first (posts not yet in PostView)
2. Time decay (newer posts score higher)
3. Popularity (likes + comments boost)
4. Random seed for variety
5. Cursor-based pagination

### Bot System
- 4 bots post categorized quotes 4x daily via node-cron
- Categories: sadhguru (motivation), dilkiawaaz (love), sochkasafar (motivation), sheroshayari (shayari)
- Images generated via @napi-rs/canvas (1080x1080 for posts, 1080x1920 for stories)
- Follow scheduler: each bot follows 7 random users daily at 3 AM

---

## 5. ALL API ENDPOINTS

### Auth (`/api/auth`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/register` | Register (phone or email + password) |
| POST | `/login` | Login (phone/username/email + password, rate-limited) |
| GET | `/me` | Get current user profile with counts |
| PATCH | `/me` | Update profile (name, username, bio, avatar, email) |
| POST | `/forgot-password` | Send OTP to phone |
| POST | `/reset-password` | Verify OTP + set new password |
| PATCH | `/password` | Change password (requires current password) |

### Users (`/api/users`)
| Method | Path | Purpose |
|---|---|---|
| PUT | `/me/public-key` | Save E2E public key |
| PUT | `/me/version` | Save app version |
| GET | `/search?q=&limit=` | Search users |
| GET | `/:id` | Get user profile |
| POST | `/:id/follow` | Follow user |
| DELETE | `/:id/follow` | Unfollow user |
| GET | `/:id/posts` | Get user's posts |

### Posts (`/api/posts`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/feed` | Ranked feed with pagination |
| POST | `/seen` | Mark posts as seen |
| POST | `/` | Create post |
| GET | `/:id/view` | View single post (no auth required) |
| DELETE | `/:id` | Delete own post |
| POST | `/:id/like` | Toggle like |
| GET | `/:id/comments` | List comments (nested replies) |
| POST | `/:id/comments` | Add comment/reply |
| POST | `/:id/share-story` | Share post as story |

### Stories (`/api/stories`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List active stories (24h TTL, auto-deletes expired) |
| POST | `/` | Create story (image + optional music) |
| DELETE | `/:id` | Delete own story |

### Reels (`/api/reels`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | YouTube Shorts feed (proxied, cached 30min, deduped) |

### Notifications (`/api/notifications`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List notifications |
| GET | `/unread-count` | Unread count |
| PATCH | `/read` | Mark all as read |
| POST | `/device-token` | Register push token |

### Conversations/Messages (`/api/conversations`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Create/get 1:1 conversation |
| GET | `/` | List conversations |
| GET | `/unread-count` | Total unread conversations |
| GET | `/:id` | Get conversation |
| GET | `/:id/messages` | Get messages (marks read, WS broadcast) |
| POST | `/:id/messages` | Send message (push + WS) |

### Upload (`/api/upload`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Upload image (multipart, 5MB max) |

### Live (`/api/live`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/start` | Start live session (generates stream key) |
| POST | `/:id/end` | End live session |
| GET | `/:id` | Get session details |
| GET | `/` | List live sessions |
| POST | `/:id/join` | Join as viewer |
| POST | `/:id/leave` | Leave session |
| GET | `/:id/comments` | Get live comments |
| POST | `/:id/comments` | Post live comment |
| GET | `/:id/viewer-count` | Get viewer count |
| GET | `/:id/viewers` | List active viewers (up to 200) |

### Other
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/update-info` | Check for app updates (GitHub Releases) |
| POST | `/api/crash-report/` | Submit crash report |
| GET | `/api/health` | Health check |

---

## 6. BUILD & DEPLOY

### CI/CD Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `build-apk.yml` | Push to `main` (mobile/**) | Build universal release APK |
| `deploy-web.yml` | Push to `main` (web/**) | Deploy website to GitHub Pages |
| `keep-alive.yml` | Cron every 10 min | Ping Render to prevent sleep |

### APK Build Process
1. Checkout -> Node 20 -> Java 17 -> Android SDK
2. `npm ci` (root + workspaces)
3. Decode `GOOGLE_SERVICES_JSON` from secrets
4. `npx expo prebuild --platform android --no-install`
5. `configure-signing.mjs` patches build.gradle with release keystore from secrets
6. `./gradlew assembleRelease`
7. Upload artifact `app-preview-apk`

**Secrets required:** `GOOGLE_SERVICES_JSON`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

### Local Build (arm64 only)
```bash
cd mobile/android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
# Output: mobile/android/app/build/outputs/apk/release/app-release.apk
```
**Note:** Local build uses different keystore than CI. Must uninstall before switching.

### Release Process
1. Bump version in `mobile/app.json` (version + versionCode)
2. Commit + push to `main`
3. CI auto-builds universal APK
4. `gh release create v4.x.x SocialBook.apk#SocialBook.apk --notes-file release-notes.md`
5. `gh release edit v4.x.x --draft=false`
6. Users get in-app update prompt via `/api/update-info`

### In-App Update Flow
- On login, app calls `GET /api/update-info`
- Backend fetches latest GitHub Release via API
- Compares with installed version (from `Constants.expoConfig.version`)
- If newer: shows "Update Available" modal -> downloads APK -> opens Android installer
- Supports stable/beta channels (beta users: `BETA_USER_IDS` env var)

### Backend Deploy
- Auto-deploys on Render when `main` is pushed (connected to GitHub)
- Uses `npm run build` (tsc) then `npm start`
- Database migrations: `npx prisma db push` (safe, no data loss)

### Website Deploy
- `peaceiris/actions-gh-pages@v4` pushes `web/out/` to `gh-pages` branch
- Served at `https://akhil24thakur.github.io/thesocialbook/`
- `basePath: "/thesocialbook"` in next.config.ts

---

## 7. EXPO PLUGINS & NATIVE MODULES

| Plugin/Module | Purpose |
|---|---|
| `./plugins/with-notification-manifest` | Patches AndroidManifest.xml for notification reply service |
| `expo-image-picker` | Photo/camera permissions |
| `expo-notifications` | Notification channel, icon, accent color |
| `modules/notification-reply` (custom native module) | `setAuth()`, `getInitialNotification()`, `attachKeyboardHeight()` |

---

## 8. ENVIRONMENT VARIABLES

### Backend (`.env`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `DIRECT_URL` | Direct DB connection (for migrations) |
| `JWT_SECRET` | JWT signing secret (REQUIRED, fatal if missing) |
| `PORT` | Server port (default: 4000) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 S3 access key |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret key |
| `R2_BUCKET` | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | R2 CDN URL |
| `STORAGE_PROVIDER` | "r2" (default) or "supabase" |
| `SUPABASE_URL` | Supabase URL (fallback storage) |
| `SUPABASE_SERVICE_KEY` | Supabase key |
| `MSG91_AUTH_KEY` | MSG91 SMS auth key |
| `MSG91_TEMPLATE_ID` | OTP template ID |
| `OTP_DEV_MODE` | "true" to return OTP in response |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (for reels) |
| `MUX_RTMP_URL` | RTMP ingest URL (default: rtmp://global-live.mux.com/app) |
| `FCM_SERVICE_ACCOUNT` | Firebase Admin service account JSON |
| `BETA_USER_IDS` | Comma-separated beta user IDs |

### Mobile (`EXPO_PUBLIC_*`)
| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API URL (defaults to Render URL) |

---

## 9. THEME SYSTEM

Colors defined in `mobile/src/theme.ts`:

| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | `#8B5CF6` | `#8B5CF6` | Buttons, links, accents |
| `primaryDark` | `#7C3AED` | `#7C3AED` | Darker primary |
| `purple` | `#8B5CF6` | `#8B5CF6` | Brand purple |
| `saffron` | `#FF9933` | `#FF9933` | Indian flag |
| `green` | `#138808` | `#138808` | Indian flag |
| `background` | `#FFFFFF` | `#0F0B1C` | Screen background |
| `card` | `#FFFFFF` | `#1A1A2E` | Card background |
| `text` | `#111827` | `#F9FAFB` | Primary text |
| `textSecondary` | `#6B7280` | `#9CA3AF` | Secondary text |
| `border` | `#E5E7EB` | `#374151` | Borders |
| `danger` | `#EF4444` | `#EF4444` | Errors, delete |
| `amber` | `#FFB020` | `#FFB020` | Warnings |

Theme persisted via AsyncStorage. Supports System/Dark/Light modes.

---

## 10. COMMON PITFALLS

1. **Local vs CI keystore mismatch:** Local builds use debug keystore, CI uses release keystore. Must uninstall app when switching.
2. **expo-av removed:** Was causing ABI mismatch crash with RN 0.86.2. Audio permissions now use `expo-audio` (`requestRecordingPermissionsAsync`).
3. **Camera component:** Use `CameraView` (not `Camera`) for expo-camera 57. `Camera` is the static permissions object only.
4. **Live routes were never mounted:** Fixed in v4.1.0 - now mounted at `/api/live`.
5. **Prisma schema drift:** Use `npx prisma db push` instead of `npx prisma migrate dev` to avoid data loss on production DB.
6. **ADB is slow:** USB connection takes 3-4 min per command. Use long timeouts (300000ms).
7. **PagerView tabs:** Bottom tabs are custom PagerView implementation, NOT @react-navigation/bottom-tabs.
8. **Web is NOT a workspace:** `web/` has independent `npm ci`, not part of root workspaces.
9. **broadcastToLive must be exported from ws.ts:** Live routes import it. If missing, all `/api/live/*` routes return 404.

---

## 11. VERSION HISTORY

| Version | Key Changes |
|---|---|
| v3.2.12 | Last working version before v4.x rewrite (built locally, stale deps) |
| v4.0.0 | Crash fix attempt: removed expo-av, added expo-camera, DeepLinkHandler |
| v4.0.1 | Added missing LiveStreamScreen import |
| v4.0.2 | Fixed LiveStreamScreen crash (insets, CameraView, sendWs, flash icon) |
| v4.1.0 | Live feature (start/stop, viewer list), removed Live from tabs, fixed follower/following truncation, mounted backend live routes + DB models |
| v4.1.1 | Removed live title popup (starts immediately), fixed 'Route not found' (broadcastToLive missing from ws.ts), fixed chat bubble text truncation, moved blue tick after name in messages list, added WS join_live/leave_live handling |
