# Homework 9 implementation and verification

Implemented on 30 October 2026 in `D:\GoIT_Projects\TS homework\09-auth`.
Grader-required modal relocation completed on 1 November 2026.
The existing Homework 8 application and history were retained. No staging,
commit, push, deployment, or writes to Homework 6, 7, or 8 directories occurred.

## Grader correction — 1 November 2026

All seven real modal files were moved to `app/@modal/`, including
`app/@modal/(.)notes/[id]/page.tsx`, its client, error boundary, CSS, and null
default/home/catch-all routes. There is no placeholder or duplicate private slot.
The root layout owns the slot within the original provider hierarchy.

The preview server page records the current user's email alongside its dehydrated
note query. The client renders/fetches only when that owner matches the current
authenticated user and the current pathname is the note URL. Restored account A
modal payloads therefore stay hidden after logout or account B login. Error
modals are also hidden outside authenticated notes navigation. Existing auth
cache-clearing and request-specific server cookies remain unchanged.

Changed files in this correction:

- Seven relocated files under `app/@modal/` (server page, client, error, CSS,
  `default.tsx`, `page.tsx`, and `[...catchAll]/page.tsx`).
- `app/layout.tsx`, `app/(private routes)/layout.tsx`.
- `app/(private routes)/[...catchAll]/page.tsx`: corrected its scope comment.
- `scripts/modal-routes.test.mjs`, `README.md`, `HW9-REPORT.md`.

Live Chrome verification on the production build:

- Clicking View details opens the root preview over the hydrated notes list.
- Escape, backdrop, Back, and Forward close/reopen it correctly.
- Direct note navigation/reload renders full-page details with zero dialogs.
- Sign-in/sign-up render without a modal; authenticated sign-up redirects to profile.
- Logging out while a preview is open clears it and shows sign-in. Back after
  logout shows no preview or private note heading.
- Unauthenticated profile editing redirects to sign-in.
- Inspected browser logs contained no warnings/errors or hydration warnings.

Live HTTP checks passed for all six private URL variants, both authenticated
auth-page redirects, public pages without dialogs, 12 server-rendered note
headings/query hydration state, direct details SSR, and not-found metadata.
The test session was logged out. No live 429 was observed.

All nine API files matched their pre-change SHA-256 hashes after the move.
`git diff --exit-code -- app/api proxy.ts "app/(private routes)/notes"` also
confirmed the official handlers, Proxy, and full notes routes were unchanged.

## Changes

Added registration, login, logout, session restoration, an in-memory Zustand auth
store, protected routes, a server-rendered profile, and username editing. Added
the required `cookie` dependency without upgrading existing dependencies. Renamed
the package to `09-auth`.

Preserved SSR prefetch/hydration, debounced search, pagination, five tag filters,
note creation/deletion, persisted drafts, full-page details, intercepted previews,
metadata, fonts, and CSS Modules. IDs remain strings; nullable note content is
handled safely.

## Exact route tree

```text
app/
├── (auth routes)/
│   ├── sign-in/
│   │   ├── page.tsx
│   │   └── SignInPage.module.css
│   ├── sign-up/
│   │   ├── page.tsx
│   │   └── SignUpPage.module.css
│   └── layout.tsx
├── (private routes)/
│   ├── [...catchAll]/
│   │   └── page.tsx
│   ├── notes/
│   │   ├── [id]/
│   │   │   ├── error.tsx
│   │   │   ├── NoteDetails.client.tsx
│   │   │   ├── NoteDetails.module.css
│   │   │   └── page.tsx
│   │   ├── action/
│   │   │   └── create/
│   │   │       ├── CreateNote.module.css
│   │   │       └── page.tsx
│   │   ├── filter/
│   │   │   ├── [...slug]/
│   │   │   │   ├── error.tsx
│   │   │   │   ├── Notes.client.tsx
│   │   │   │   ├── NotesPage.module.css
│   │   │   │   └── page.tsx
│   │   │   ├── @sidebar/
│   │   │   │   ├── default.tsx
│   │   │   │   └── SidebarNotes.module.css
│   │   │   ├── layout.tsx
│   │   │   └── LayoutNotes.module.css
│   │   └── page.tsx
│   ├── profile/
│   │   ├── edit/
│   │   │   ├── EditProfilePage.module.css
│   │   │   └── page.tsx
│   │   ├── error.tsx
│   │   ├── page.tsx
│   │   └── ProfilePage.module.css
│   └── layout.tsx
├── @modal/
│   ├── (.)notes/
│   │   └── [id]/
│   │       ├── error.tsx
│   │       ├── NotePreview.client.tsx
│   │       ├── NotePreview.module.css
│   │       └── page.tsx
│   ├── [...catchAll]/
│   │   └── page.tsx
│   ├── default.tsx
│   └── page.tsx
├── api/
│   ├── _utils/
│   │   └── utils.ts
│   ├── auth/
│   │   ├── login/
│   │   │   └── route.ts
│   │   ├── logout/
│   │   │   └── route.ts
│   │   ├── register/
│   │   │   └── route.ts
│   │   └── session/
│   │       └── route.ts
│   ├── notes/
│   │   ├── [id]/
│   │   │   └── route.ts
│   │   └── route.ts
│   ├── users/
│   │   └── me/
│   │       └── route.ts
│   └── api.ts
├── favicon.ico
├── globals.css
├── layout.tsx
├── loading.tsx
├── not-found.module.css
├── not-found.tsx
├── page.module.css
└── page.tsx
```

`/notes` redirects to `/notes/filter/all`. Groups/slots do not appear in URLs.
The real preview now occupies the grader-required `app/@modal/(.)notes/[id]/`.
The root layout renders `children` and `modal` inside TanStackProvider and
AuthProvider. The private layout renders only `children`; full-page note details
remain under `app/(private routes)/notes/[id]`. The existing fallback remains
inside the private group. Next.js 16.4.3 strict route validation passes with no
conflicting or duplicate routes and no loose-route compatibility flag.

## File inventory

Created:

- `.env.example`, `HW9-REPORT.md`, `proxy.ts`, `types/user.ts`.
- Auth layout and sign-in/sign-up pages/CSS Modules shown above.
- Private layout, `/notes` redirect, profile/edit pages/CSS Modules, profile error
  boundary shown above.
- All nine official `app/api` files shown above.
- `components/AuthNavigation/AuthNavigation.tsx` and its CSS Module.
- `components/AuthProvider/AuthProvider.tsx`; no unnecessary stylesheet.
- `lib/api/api.ts`, `lib/api/clientApi.ts`, `lib/api/serverApi.ts`.
- `lib/store/authStore.ts`, `lib/user.ts`, `scripts/auth.test.mjs`.
- `scripts/modal-routes.test.mjs`: seven root-slot, hydration, and account-isolation regressions.

Moved, including every child/CSS file shown in the route tree:

- `app/notes/` → `app/(private routes)/notes/`.
- `app/(private routes)/@modal/` → `app/@modal/` (grader correction on 1 November).
- `app/[...catchAll]/page.tsx` →
  `app/(private routes)/[...catchAll]/page.tsx`.

Modified:

- `app/layout.tsx`, `components/Header/Header.tsx`: providers/auth navigation.
- Existing `NoteForm`, `NoteList`, details/preview clients, list/detail/preview
  server pages, sidebar, and create link: new API imports, moved references,
  cookie-aware server fetching, explicit navigation without private-route prefetch.
- `lib/notes-query.ts`, `lib/metadata.ts`, `types/note.ts`, `next.config.ts`.
- `package.json`, `package-lock.json`, `.gitignore`, `.prettierignore`, `README.md`.
- `scripts/hw8.test.mjs`, `scripts/notes-query.test.mjs`: imports and SSR regression.

Removed obsolete token API modules: `lib/api.ts`, `lib/api/client.ts`,
`lib/api/notes.ts`, `lib/api/index.ts`, `lib/api/server.ts`. The cached note helper
now lives in `serverApi.ts`. Prettier also normalized existing text files to the
configured LF endings without changing their behavior or instructions.

## API architecture and query behavior

| Layer                  | Responsibility                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `lib/api/api.ts`       | Shared Axios: `NEXT_PUBLIC_API_URL + "/api"`, credentials, timeout, sanitized errors                   |
| `lib/api/clientApi.ts` | Typed note CRUD, auth/session, current user, username update                                           |
| `lib/api/serverApi.ts` | Note/user reads, per-request cookie forwarding, session validation/refresh, cached note metadata reads |
| `app/api/`             | Unchanged handlers forwarding to `https://notehub-api.goit.study`                                      |

The server module imports only API types from the client module and never mutates
Axios default headers. Cookies stay within each request. React `cache` shares
metadata/page reads within a render rather than across users.

SSR injects its server fetcher into the existing notes query factory. Client and
server use identical keys and typed `meta.tag`. Placeholder data survives
page/search changes only when the tag matches. All/specific-tag transitions do
not share placeholders. The mentor's fix remains; no `queryKey[4]` lookup exists.

## Authentication flow and CSR/SSR cookies

Login/registration submit email/password to the supplied local handlers. They set
backend authentication cookies, while the returned user enters Zustand and the
router goes to `/profile`. AuthProvider checks the session and fetches the user
on initialization. Loading/errors and in-flight login changes are handled without
redirect loops or hiding server-rendered content.

`setUser` updates both user and authentication state; `clearIsAuthenticated`
clears both. Auth tokens never enter Zustand persistence or localStorage. The
existing note draft remains persisted. Logout calls the API, cancels/clears query
data, clears auth state, and navigates to `/sign-in`. Login/registration also clear
previous query data to avoid reusing another account's cached notes.

In CSR, Axios `withCredentials: true` lets the browser attach cookies to the
application's `/api`. In SSR/Proxy, cookies are explicitly copied into the HTTP
`Cookie` header; Node requests do not inherit browser credentials automatically.
The official handlers then forward cookies to GoIT.

The official session handler accepts any existing access cookie, so Proxy also
validates `/users/me`. Invalid tokens returning 401 or 403 can trigger one refresh
attempt without the bad access cookie. Renewed `Set-Cookie` headers reach the
browser, and the renewed `Cookie` header reaches the current SSR render. Live
checks verified refresh-only and invalid-access-plus-valid-refresh recovery.

## Proxy redirects

| Visitor/target                            | Result                                   |
| ----------------------------------------- | ---------------------------------------- |
| Unauthenticated `/notes` or descendants   | `/sign-in`                               |
| Unauthenticated `/profile` or descendants | `/sign-in`                               |
| Authenticated `/sign-in` or `/sign-up`    | `/profile`                               |
| Authenticated private page                | Continue with verified/refreshed cookies |
| Unauthenticated auth page                 | Continue; remove invalid auth cookies    |
| Backend verification outage/throttling    | Temporary 503; preserve cookies          |

Matcher: `/notes/:path*`, `/profile/:path*`, `/sign-in`, `/sign-up`. API routes,
home, static assets, and unrelated URLs are excluded.

## Official files and legacy token

The complete [official API branch](https://github.com/goitacademy/react-notehub-styles/tree/hw-09-api-files)
was downloaded and copied into `app/api`. SHA-256 comparisons confirmed all
**nine files are byte-for-byte unchanged**. That tree is excluded from Prettier.

The five relevant CSS Modules came from the
[official styles branch](https://github.com/goitacademy/react-notehub-styles/tree/hw-09-styles).
Classes were retained; markup was checked against the open GoIT homework page.
Avatars use Next.js Image, the required `ac.goit.global` pattern, and a safe default.
Request/response contracts were checked against the
[new backend documentation](https://notehub-api.goit.study/docs/).

Application source scans found no old token variable, old public-backend URL,
Authorization header, TypeScript `any`, or positional query-key lookup.

## Regression results

**34 isolated tests passed, zero failures**: the previous 27 tests plus seven
root-modal regressions. These verify the exact grader paths, absence of the old
slot, provider placement, default/catch-all clearing, history-based closing,
account ownership and path guards, and server prefetch/hydration. Existing tests
still cover drafts, query metadata, auth/session/Proxy behavior, concurrent
cookie isolation, and temporary rate-limit failures.

The following note-creation/deletion results are the original 30 October tests.
The 1 November relocation checks reused the existing approved account without
creating accounts, changing profiles, or creating/deleting notes.

After explicit approval, live testing used one generated account and exactly
13 disposable notes: 12 API-created and one browser-created. One was deleted in
Chrome; the other 12 were removed through the API. Final search confirmed **zero
test notes remain**. GoIT's automatically seeded example notes were preserved.
Browser/API sessions were logged out and the temporary local credential/cookie
file was removed. The test account remains, as approved, because no deletion
endpoint exists.

| Check                                   | Executed result                                                  |
| --------------------------------------- | ---------------------------------------------------------------- |
| Registration/login/logout               | Passed in Chrome; invalid-login error also verified              |
| Refresh session restoration             | Passed in Chrome                                                 |
| Refresh-only first SSR profile render   | Passed live HTTP                                                 |
| Invalid access + valid refresh recovery | Passed live HTTP                                                 |
| Forged access cookie                    | Rejected with redirect after actual user validation              |
| Protected redirects                     | All six required private URL variants passed live HTTP           |
| Authenticated auth-route redirects      | Both passed HTTP; sign-in also passed Chrome                     |
| Profile/save/Cancel                     | Passed Chrome; saved username survives refresh                   |
| Notes SSR/hydration                     | 12 HTML headings and query state verified; browser interactive   |
| Debounced search/pagination             | Passed Chrome; 13 results split across two pages                 |
| Filters                                 | All five APIs/SSR routes passed; Shopping/Work checked in Chrome |
| Draft/creation                          | Cancel/return/reload/submit/reset passed Chrome                  |
| Last-page deletion                      | Passed Chrome; returns to page one and updates pagination        |
| Preview modal                           | Open, Escape, backdrop, Back, Forward passed Chrome              |
| Direct note/reload                      | Full details, zero dialogs, note-specific title                  |
| Browser diagnostics                     | No warn/error entries or hydration warnings in inspected logs    |
| Fallback                                | 404 content/title and noindex verified                           |

No live 429 occurred; rate-limit handling was tested with mocks. Initial live
testing exposed GoIT's 403 for invalid tokens; handling was corrected and the
check passed. An initial HTTP hydration assertion expected an incorrect field
name; the actual rendered headings/query state check passed. No failed assertion
is represented as a pass before correction.

## Final quality gates

| Command                  | Result                                                      |
| ------------------------ | ----------------------------------------------------------- |
| `npm run lint`           | Passed                                                      |
| `npm run build`          | Passed: Next.js 16.4.3, TypeScript, strict route validation |
| `npx tsc --noEmit`       | Passed                                                      |
| `npx prettier --check .` | Passed                                                      |
| `npm test`               | Passed: 34 tests                                            |
| `git diff --check`       | Passed                                                      |

The first sandboxed build could not fetch existing Roboto files; the build passed
with permitted network access. No font change was needed. Final production build
uses `.env.local` with `http://localhost:3000`. Runtime tests used a temporary
build override for port 3109 because Grafana owns 3000. The test server is stopped.

## Environment and remaining limitations

- `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3000`; ignored and untracked.
  `.env.example` is available for review.
- Vercel: set `NEXT_PUBLIC_API_URL` to the real production origin, without `/api`
  or a trailing slash. Set optional `NEXT_PUBLIC_SITE_URL` to that origin for SEO.
  Redeploy after changing build-time environment variables.
- No production URL was invented and no deployment performed. Live Vercel
  verification awaits the real deployment.
- Port 3000 remains occupied by Grafana. Free it or configure a matching app port
  and API URL locally.
- The unchanged official session handler maps refresh failures to `success:false`,
  limiting detailed upstream error reporting for that endpoint.
- The fallback streams HTTP 200 with correct 404 content/title and noindex once
  streaming begins, following Next.js behavior.
- Cross-account preview protection was tested using two distinct mocked user
  identities with the first account's cached note retained. Browser logout/Back
  was also tested; a second live account was not created.

## Git status

Branch: `main`. All changes for the 1 November correction remain unstaged and
uncommitted. Seven modal files moved from the private group to `app/@modal/`;
Git shows the old paths deleted and the new paths untracked until review/staging.
The root/private layouts, preview server/client/error components, fallback comment,
README, report, and new regression test are the affected files. `proxy.ts`, full
notes/profile routes, dependency files, and all nine official API files have no
changes in this correction. No commit, push, or deployment was performed.
