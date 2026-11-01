import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);

function loadSource(file, mocks) {
  const source = fs.readFileSync(
    new URL(`../${file}`, import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const sourceModule = { exports: {} };
  vm.runInNewContext(compiled, {
    Error,
    module: sourceModule,
    exports: sourceModule.exports,
    require: (id) =>
      Object.hasOwn(mocks, id)
        ? mocks[id]
        : id.endsWith(".css")
          ? {}
          : requireDependency(id),
  });
  return sourceModule.exports;
}

test("auth layout is a client boundary and refreshes after mount without a render loop", () => {
  const file = "app/(auth routes)/layout.tsx";
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.equal(source.statements[0].expression.text, "use client");
  let refreshes = 0;
  let previousDependencies;
  const effects = [];
  const router = { refresh: () => refreshes++ };
  const { default: Layout } = loadSource(file, {
    "next/navigation": { useRouter: () => router },
    react: {
      useEffect: (effect, dependencies) => {
        if (
          !previousDependencies ||
          dependencies.some(
            (value, index) => value !== previousDependencies[index],
          )
        )
          effects.push(effect);
        previousDependencies = [...dependencies];
      },
    },
  });
  const children = { marker: "auth-page" };
  assert.equal(Layout({ children }).props.children, children);
  assert.equal(refreshes, 0, "refresh must not run during render");
  effects.shift()();
  assert.equal(refreshes, 1);
  Layout({ children });
  Layout({ children });
  assert.equal(effects.length, 0);
  assert.equal(refreshes, 1);
  previousDependencies = undefined;
  Layout({ children });
  effects.shift()();
  assert.equal(refreshes, 2, "a new mount refreshes once again");
});

function findElement(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const result = findElement(child, predicate);
      if (result) return result;
    }
    return undefined;
  }
  if (predicate(node)) return node;
  return findElement(node.props?.children, predicate);
}

const initialUser = {
  email: "profile@example.test",
  username: "Original username",
  avatar: "https://ac.goit.global/fullstack/react/default-avatar.jpg",
};

function profileHarness(
  update = async (params) => ({ ...initialUser, username: params.username }),
) {
  const values = [];
  let cursor = 0;
  const events = [];
  const state = {
    user: initialUser,
    setUser: (user) => {
      state.user = user;
      events.push({ type: "setUser", user });
    },
  };
  const useAuthStore = Object.assign((selector) => selector(state), {
    getState: () => state,
  });
  const { default: Page } = loadSource(
    "app/(private routes)/profile/edit/page.tsx",
    {
      react: {
        useState: (initial) => {
          const index = cursor++;
          if (!(index in values)) values[index] = initial;
          return [
            values[index],
            (value) => {
              values[index] = value;
            },
          ];
        },
      },
      "next/image": "image",
      "next/navigation": {
        useRouter: () => ({
          back: () => events.push({ type: "back" }),
          push: (url) => events.push({ type: "push", url }),
          replace: (url) => events.push({ type: "replace", url }),
          refresh: () => events.push({ type: "refresh" }),
        }),
      },
      "@/lib/api/clientApi": {
        updateMe: async (params) => {
          events.push({ type: "update", params });
          return update(params);
        },
      },
      "@/lib/store/authStore": { useAuthStore },
      "@/components/AuthProvider/AuthProvider": {
        useAuthStatus: () => ({ isLoading: false, error: "" }),
      },
      "@/lib/user": { avatarSource: (avatar) => avatar },
    },
  );
  function render() {
    cursor = 0;
    const formComponent = Page().props.children;
    return formComponent.type(formComponent.props);
  }
  const input = () =>
    findElement(render(), (element) => element.type === "input");
  return {
    events,
    state,
    render,
    setUsername: (value) => input().props.onChange({ target: { value } }),
    submit: () =>
      findElement(
        render(),
        (element) => element.type === "form",
      ).props.onSubmit({ preventDefault() {} }),
  };
}

test("profile Cancel goes back without saving or choosing a fixed destination", () => {
  const harness = profileHarness();
  harness.setUsername("Unsaved username");
  const cancel = findElement(
    harness.render(),
    (element) =>
      element.type === "button" && element.props.children === "Cancel",
  );
  cancel.props.onClick();
  assert.deepEqual(harness.events, [{ type: "back" }]);
  assert.equal(harness.state.user, initialUser);
});

test("profile Save preserves pending controls, auth-store update and successful navigation", async () => {
  let resolveUpdate;
  const harness = profileHarness(
    (params) =>
      new Promise((resolve) => {
        resolveUpdate = () =>
          resolve({ ...initialUser, username: params.username });
      }),
  );
  harness.setUsername("  Saved username  ");
  const saving = harness.submit();
  const pending = harness.render();
  assert.equal(
    findElement(pending, (element) => element.type === "input").props.disabled,
    true,
  );
  assert.equal(
    findElement(
      pending,
      (element) => element.type === "button" && element.props.type === "button",
    ).props.disabled,
    true,
  );
  assert.equal(
    findElement(pending, (element) => element.type === "image").props.src,
    initialUser.avatar,
  );
  resolveUpdate();
  await saving;
  assert.deepEqual(
    harness.events.map((event) => event.type),
    ["update", "setUser", "replace", "refresh"],
  );
  assert.equal(harness.events[0].params.username, "Saved username");
  assert.equal(harness.events[2].url, "/profile");
  assert.equal(harness.state.user.username, "Saved username");
});

test("profile validation and update errors preserve the current auth user", async () => {
  const invalid = profileHarness();
  invalid.setUsername("   ");
  await invalid.submit();
  assert.equal(invalid.events.length, 0);
  assert.equal(
    findElement(invalid.render(), (element) => element.props?.role === "alert")
      .props.children,
    "Username is required.",
  );
  const failed = profileHarness(async () => {
    throw new Error("Simulated update failure");
  });
  await failed.submit();
  assert.deepEqual(
    failed.events.map((event) => event.type),
    ["update"],
  );
  assert.equal(failed.state.user, initialUser);
  assert.equal(
    findElement(failed.render(), (element) => element.props?.role === "alert")
      .props.children,
    "Simulated update failure",
  );
  assert.equal(
    findElement(failed.render(), (element) => element.type === "input").props
      .disabled,
    false,
  );
});
