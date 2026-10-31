# NoteHub — Homework 9: Authentication

Homework 8 extended with cookie authentication, protected notes routes, and
profile viewing/editing. Uses Next.js 16 App Router, TypeScript, Axios, TanStack
Query, Zustand, and CSS Modules.

## Local setup

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open [NoteHub locally](http://localhost:3000).

`NEXT_PUBLIC_API_URL` must be this Next.js application's origin, including its
port, without a trailing slash or `/api` suffix. The supplied `/api` handlers
forward requests to the [GoIT backend](https://notehub-api.goit.study/docs/).

If port 3000 is occupied, set another port in `.env.local` and use the same port
in the command, for example `npm run dev -- --port 3109`. Restart development or
rebuild production after changing a `NEXT_PUBLIC_` variable. Grafana occupied
port 3000 during verification; browser tests used a temporary build override for
port 3109. The checked-in example and ignored local configuration use port 3000.

## Vercel

Set `NEXT_PUBLIC_API_URL` to the application's actual production origin before
building. Optionally set `NEXT_PUBLIC_SITE_URL` to that origin for SEO metadata.
Redeploy after updating environment variables. No production URL is hardcoded.
`.env.local` remains ignored; no legacy NoteHub API token is required.

## Routes and cookies

- `/`: public home.
- `/sign-in`, `/sign-up`: auth forms; authenticated users redirect to `/profile`.
- `/notes`: redirects to `/notes/filter/all`.
- `/notes/filter/[...slug]`, `/notes/[id]`, `/notes/action/create`, `/profile`,
  `/profile/edit`: protected by `proxy.ts`.

The private layout owns note routes and `@modal`, preserving previews and direct
note navigation. Typed query metadata, SSR hydration, search, pagination,
filtering, and persisted note drafts remain.

`lib/api/api.ts` configures shared Axios. `clientApi.ts` uses browser credentials;
`serverApi.ts` forwards request-specific cookies. Proxy validates the actual user
and forwards refreshed cookies to both the browser and the current SSR request.
Authentication tokens never enter Zustand or localStorage.

## Checks

```powershell
npm run lint
npm run build
npx tsc --noEmit
npx prettier --check .
npm test
git diff --check
```

The 27 isolated tests make no backend mutations. The official `app/api` tree is
excluded from Prettier to keep its contents unchanged.

See [HW9-REPORT.md](HW9-REPORT.md) for the route tree, file inventory, cookie flow,
official-file verification, live browser/API results, and remaining limitations.
