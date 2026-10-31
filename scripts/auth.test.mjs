import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import * as cookie from "cookie";
import { NextRequest, NextResponse } from "next/server.js";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);

function loadSource(file, mocks = {}) {
  const compiled = ts.transpileModule(
    fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const sourceModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: sourceModule,
    exports: sourceModule.exports,
    require: (id) =>
      Object.hasOwn(mocks, id) ? mocks[id] : requireDependency(id),
    Headers,
    URL,
    Promise,
  });
  return sourceModule.exports;
}

class ApiError extends Error {
  constructor(status) {
    super("Sanitized request error");
    this.status = status;
  }
}

function serverApi(get, cookieReader = () => "") {
  return loadSource("lib/api/serverApi.ts", {
    "server-only": {},
    "next/headers": { cookies: async () => ({ toString: cookieReader }) },
    cookie,
    "./api": { api: { get }, NoteHubApiError: ApiError },
  });
}

const user = { email: "test@example.com", username: "Test", avatar: "" };

test("auth store sets and clears the user without persisting tokens", () => {
  const { useAuthStore } = loadSource("lib/store/authStore.ts");
  assert.equal(useAuthStore.getState().isAuthenticated, false);
  useAuthStore.getState().setUser(user);
  assert.equal(useAuthStore.getState().user, user);
  assert.equal(useAuthStore.getState().isAuthenticated, true);
  useAuthStore.getState().clearIsAuthenticated();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().isAuthenticated, false);
  assert.equal(useAuthStore.persist, undefined);
});

test("an arbitrary cookie cannot authenticate a request", async () => {
  const api = serverApi(() => {
    throw new Error("No request expected");
  });
  assert.equal((await api.checkSession("theme=dark")).success, false);
});

test("a forged access cookie fails actual user verification", async () => {
  const calls = [];
  const api = serverApi(async (path) => {
    calls.push(path);
    if (path === "/auth/session")
      return { data: { success: true }, headers: {} };
    throw new ApiError(403);
  });
  assert.equal((await api.checkSession("accessToken=forged")).success, false);
  assert.deepEqual(calls, ["/auth/session", "/users/me"]);
});

test("refresh-only sessions validate with renewed cookies and return Set-Cookie", async () => {
  const renewed = "accessToken=renewed; Path=/; HttpOnly; SameSite=Lax";
  const api = serverApi(async (path, options) => {
    if (path === "/auth/session")
      return { data: { success: true }, headers: { "set-cookie": [renewed] } };
    assert.equal(
      cookie.parseCookie(options.headers.Cookie).accessToken,
      "renewed",
    );
    return { data: user };
  });
  const result = await api.checkSession("refreshToken=refresh; theme=dark");
  assert.equal(result.success, true);
  assert.equal(cookie.parseCookie(result.cookieHeader).theme, "dark");
  assert.equal(result.setCookies[0], renewed);
});

test("expired access token retries refresh without that token", async () => {
  const sessionCookies = [];
  const api = serverApi(async (path, options) => {
    const values = cookie.parseCookie(options.headers.Cookie);
    if (path === "/auth/session") {
      sessionCookies.push(values);
      return {
        data: { success: true },
        headers: values.accessToken
          ? {}
          : { "set-cookie": "accessToken=renewed; Path=/; HttpOnly" },
      };
    }
    if (values.accessToken === "expired") throw new ApiError(403);
    return { data: user };
  });
  const result = await api.checkSession(
    "accessToken=expired; refreshToken=valid",
  );
  assert.equal(result.success, true);
  assert.equal(sessionCookies.length, 2);
  assert.equal(sessionCookies[1].accessToken, undefined);
  assert.equal(sessionCookies[1].refreshToken, "valid");
  assert.equal(cookie.parseCookie(result.cookieHeader).accessToken, "renewed");
});

test("concurrent SSR requests keep cookies in their own request", async () => {
  const context = new AsyncLocalStorage();
  const observed = [];
  const api = serverApi(
    async (path, options) => {
      await Promise.resolve();
      observed.push(options.headers.Cookie);
      return { data: { notes: [], totalPages: 0 } };
    },
    () => context.getStore(),
  );
  await Promise.all(
    ["accessToken=one", "accessToken=two"].map((value) =>
      context.run(value, () => api.fetchNotes({ page: 1, perPage: 12 })),
    ),
  );
  assert.deepEqual(observed.sort(), ["accessToken=one", "accessToken=two"]);
});

test("rate limiting is propagated instead of declaring the session invalid", async () => {
  const api = serverApi(async () => {
    throw new ApiError(429);
  });
  await assert.rejects(
    api.checkSession("accessToken=valid"),
    (error) => error.status === 429,
  );
});

function proxyWith(checkSession) {
  return loadSource("proxy.ts", {
    "next/server": { NextRequest, NextResponse },
    "@/lib/api/serverApi": { checkSession },
    "@/lib/api/api": { NoteHubApiError: ApiError },
  }).proxy;
}

test("all private URL families redirect unauthenticated visitors to sign-in", async () => {
  const proxy = proxyWith(async () => ({
    success: false,
    cookieHeader: "",
    setCookies: [],
  }));
  for (const path of [
    "/notes",
    "/notes/filter/all",
    "/notes/id",
    "/notes/action/create",
    "/profile",
    "/profile/edit",
  ]) {
    const response = await proxy(
      new NextRequest(`http://localhost:3000${path}`),
    );
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/sign-in",
    );
  }
});

test("authenticated auth routes redirect to profile; unrelated paths skip validation", async () => {
  let calls = 0;
  const proxy = proxyWith(async () => {
    calls++;
    return { success: true, cookieHeader: "accessToken=valid", setCookies: [] };
  });
  for (const path of ["/sign-in", "/sign-up"]) {
    assert.equal(
      (
        await proxy(new NextRequest(`http://localhost:3000${path}`))
      ).headers.get("location"),
      "http://localhost:3000/profile",
    );
  }
  for (const path of [
    "/",
    "/api/notes",
    "/_next/static/test.js",
    "/noteworthy",
  ]) {
    assert.equal(
      (await proxy(new NextRequest(`http://localhost:3000${path}`))).status,
      200,
    );
  }
  assert.equal(calls, 2);
});

test("Proxy forwards refresh cookies to the browser and current SSR request", async () => {
  const proxy = proxyWith(async (incoming) => {
    assert.equal(incoming, "refreshToken=valid");
    return {
      success: true,
      cookieHeader: "refreshToken=valid; accessToken=renewed",
      setCookies: ["accessToken=renewed; Path=/; HttpOnly"],
    };
  });
  const response = await proxy(
    new NextRequest("http://localhost:3000/profile", {
      headers: { cookie: "refreshToken=valid" },
    }),
  );
  assert.match(response.headers.get("set-cookie"), /accessToken=renewed/);
  assert.match(
    response.headers.get("x-middleware-request-cookie"),
    /accessToken=renewed/,
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("Proxy preserves cookies and returns temporary failure on backend throttling", async () => {
  const proxy = proxyWith(async () => {
    throw new ApiError(429);
  });
  const response = await proxy(
    new NextRequest("http://localhost:3000/profile"),
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match(await response.text(), /Too many requests/);
});
