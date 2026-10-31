# Homework 9 implementation and verification

Implemented on 30 October 2026 in `D:\GoIT_Projects\TS homework\09-auth`.
The existing Homework 8 application and history were retained. No staging,
commit, push, deployment, or writes to Homework 6, 7, or 8 directories occurred.

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
├── layout.tsx
├── page.tsx
├── page.module.css
├── globals.css
├── loading.tsx
├── not-found.tsx
├── not-found.module.css
├── favicon.ico
├── (auth routes)/
│   ├── layout.tsx
│   ├── sign-in/
│   │   ├── page.tsx
│   │   └── SignInPage.module.css
│   └── sign-up/
│       ├── page.tsx
│       └── SignUpPage.module.css
├── (private routes)/
│   ├── layout.tsx
│   ├── [...catchAll]/page.tsx
│   ├── @modal/
│   │   ├── default.tsx
│   │   ├── page.tsx
│   │   ├── [...catchAll]/page.tsx
│   │   └── (.)notes/[id]/
│   │       ├── page.tsx
│   │       ├── error.tsx
│   │       ├── NotePreview.client.tsx
│   │       └── NotePreview.module.css
│   ├── notes/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   ├── error.tsx
│   │   │   ├── NoteDetails.client.tsx
│   │   │   └── NoteDetails.module.css
│   │   ├── action/create/
│   │   │   ├── page.tsx
│   │   │   └── CreateNote.module.css
│   │   └── filter/
│   │       ├── layout.tsx
│   │       ├── LayoutNotes.module.css
│   │       ├── @sidebar/
│   │       │   ├── default.tsx
│   │       │   └── SidebarNotes.module.css
│   │       └── [...slug]/
│   │           ├── page.tsx
│   │           ├── error.tsx
│   │           ├── Notes.client.tsx
│   │           └── NotesPage.module.css
│   └── profile/
│       ├── page.tsx
│       ├── error.tsx
│       ├── ProfilePage.module.css
│       └── edit/
│           ├── page.tsx
│           └── EditProfilePage.module.css
└── api/
    ├── api.ts
    ├── _utils/utils.ts
    ├── auth/
    │   ├── login/route.ts
    │   ├── logout/route.ts
    │   ├── register/route.ts
    │   └── session/route.ts
    ├── notes/
    │   ├── route.ts
    │   └── [id]/route.ts
    └── users/me/route.ts
```

`/notes` redirects to `/notes/filter/all`. Groups/slots do not appear in URLs.
The modal and full details page share the private layout. The fallback moved into
that scope because Next.js 16.4.3 strict parallel-route validation rejected its
old root location after the modal move. No loose-route compatibility flag is used.

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

Moved, including every child/CSS file shown in the route tree:

- `app/notes/` → `app/(private routes)/notes/`.
- `app/@modal/` → `app/(private routes)/@modal/`.
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

**27 isolated tests passed, zero failures**: the previous 15 draft/form/query
tests, 11 auth/session/Proxy tests, and one SSR-fetcher/hydration-key test. New
tests cover forged cookies, refresh, concurrent cookie isolation, redirects,
cookie propagation, and temporary rate-limit failure handling.

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
| `npm test`               | Passed: 27 tests                                            |
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
- The cached note helper was consolidated into `serverApi.ts` after browser
  checks; final build and isolated tests cover that refactor.

## Git status

Branch: `main`. Final status: 42 modified files, 27 deleted old paths, and 56
untracked files, including line-ending normalization and moved files at their
new paths.

All work remains unstaged and uncommitted. Route moves appear as old-path
deletions plus untracked files in the required groups until reviewed/staged.
The worktree contains the new auth/API/tests, modified implementation/config,
and LF normalization of existing text files. No Git mutation, commit, or push
was performed.
