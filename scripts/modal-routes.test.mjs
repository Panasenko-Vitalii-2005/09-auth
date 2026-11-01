import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import * as reactQuery from "@tanstack/react-query";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);
const previewDirectory = "app/@modal/(.)notes/[id]";

function loadSource(file, mocks = {}) {
  const compiled = ts.transpileModule(
    fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const sourceModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: sourceModule,
    exports: sourceModule.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.endsWith(".css")) return {};
      return requireDependency(id);
    },
    Promise,
  });
  return sourceModule.exports;
}

test("the real modal files occupy the exact grader paths without a duplicate slot", () => {
  for (const file of [
    "default.tsx",
    "page.tsx",
    "[...catchAll]/page.tsx",
    "(.)notes/[id]/page.tsx",
    "(.)notes/[id]/error.tsx",
    "(.)notes/[id]/NotePreview.client.tsx",
    "(.)notes/[id]/NotePreview.module.css",
  ]) {
    assert.ok(
      fs.statSync(new URL(`../app/@modal/${file}`, import.meta.url)).isFile(),
    );
  }
  assert.equal(
    fs.existsSync(new URL("../app/(private routes)/@modal", import.meta.url)),
    false,
  );
  assert.ok(
    fs.existsSync(
      new URL("../app/(private routes)/notes/[id]/page.tsx", import.meta.url),
    ),
  );
});

test("root children and modal remain inside both application providers", () => {
  const { default: RootLayout } = loadSource("app/layout.tsx", {
    "next/font/google": { Roboto: () => ({ variable: "font" }) },
    "@/components/Header/Header": "header",
    "@/components/Footer/Footer": "footer",
    "@/components/TanStackProvider/TanStackProvider": "query-provider",
    "@/components/AuthProvider/AuthProvider": "auth-provider",
    "@/lib/metadata": {
      siteUrl: new URL("http://localhost:3000"),
      createPageMetadata: () => ({}),
    },
  });
  const root = RootLayout({
    children: "page-content",
    modal: "preview-content",
  });
  const queryProvider = root.props.children.props.children;
  assert.equal(queryProvider.type, "query-provider");
  const authProvider = queryProvider.props.children;
  assert.equal(authProvider.type, "auth-provider");
  assert.deepEqual(
    Array.from(authProvider.props.children, (child) =>
      typeof child === "string" ? child : child.type,
    ),
    ["header", "page-content", "preview-content", "footer"],
  );

  const { default: PrivateLayout } = loadSource(
    "app/(private routes)/layout.tsx",
  );
  assert.equal(
    PrivateLayout({ children: "private-page", modal: "obsolete-slot" }).props
      .children,
    "private-page",
  );
});

test("home and catch-all modal routes clear the root slot", () => {
  for (const file of ["default.tsx", "page.tsx", "[...catchAll]/page.tsx"]) {
    assert.equal(loadSource(`app/@modal/${file}`).default(), null);
  }
});

const owner = { email: "owner@example.test", username: "Owner", avatar: "" };
const note = {
  id: "owner-note",
  title: "Private owner note",
  content: "Private owner content",
  tag: "Work",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

function previewHarness() {
  const state = { user: owner, isAuthenticated: true };
  const queryOptions = [];
  let pathname = `/notes/${note.id}`;
  let backCalls = 0;
  const { default: Preview } = loadSource(
    `${previewDirectory}/NotePreview.client.tsx`,
    {
      react: { useCallback: (callback) => callback },
      "next/navigation": {
        useParams: () => ({ id: note.id }),
        usePathname: () => pathname,
        useRouter: () => ({ back: () => backCalls++ }),
      },
      "@tanstack/react-query": {
        useQuery: (options) => {
          queryOptions.push(options);
          // Simulate stale account A data still present in a restored router tree.
          return { data: note, isLoading: false, isError: false };
        },
      },
      "@/components/Modal/Modal": "modal",
      "@/lib/api/clientApi": { fetchNoteById: async () => note },
      "@/lib/store/authStore": { useAuthStore: (selector) => selector(state) },
    },
  );
  return {
    state,
    render: () => Preview({ ownerEmail: owner.email }),
    queryOptions,
    setPathname: (value) => {
      pathname = value;
    },
    backCalls: () => backCalls,
  };
}

test("the owner receives hydrated preview content and history-based closing", () => {
  const harness = previewHarness();
  const rendered = harness.render();
  assert.equal(rendered.type, "modal");
  assert.equal(harness.queryOptions[0].enabled, true);
  rendered.props.onClose();
  assert.equal(harness.backCalls(), 1);
});

test("cached preview content stays hidden after logout and when another account logs in", () => {
  const harness = previewHarness();
  harness.state.isAuthenticated = false;
  harness.state.user = null;
  assert.equal(harness.render(), null);
  assert.equal(harness.queryOptions.at(-1).enabled, false);
  harness.state.isAuthenticated = true;
  harness.state.user = { ...owner, email: "another-account@example.test" };
  assert.equal(harness.render(), null);
  assert.equal(harness.queryOptions.at(-1).enabled, false);
});

test("stale modal content cannot remain visible on auth, home, or profile routes", () => {
  const harness = previewHarness();
  for (const pathname of [
    "/",
    "/sign-in",
    "/sign-up",
    "/profile",
    "/notes/filter/all",
  ]) {
    harness.setPathname(pathname);
    assert.equal(harness.render(), null);
    assert.equal(harness.queryOptions.at(-1).enabled, false);
  }
});

test("the relocated server page prefetches the note and binds its owner for hydration", async () => {
  let fetches = 0;
  const { default: PreviewPage } = loadSource(`${previewDirectory}/page.tsx`, {
    "@tanstack/react-query": reactQuery,
    "@/lib/api/serverApi": {
      getMe: async () => owner,
      fetchNoteForPage: async (id) => {
        assert.equal(id, note.id);
        fetches++;
        return note;
      },
    },
    "@/app/(private routes)/notes/[id]/page": {
      generateMetadata: async () => ({ title: note.title }),
    },
    "./NotePreview.client": "preview-client",
  });
  const rendered = await PreviewPage({
    params: Promise.resolve({ id: note.id }),
  });
  assert.equal(fetches, 1);
  assert.equal(rendered.type, reactQuery.HydrationBoundary);
  assert.equal(rendered.props.children.props.ownerEmail, owner.email);
  const queryClient = new reactQuery.QueryClient();
  reactQuery.hydrate(queryClient, rendered.props.state);
  assert.deepEqual(queryClient.getQueryData(["note", note.id]), note);
  queryClient.clear();
});
