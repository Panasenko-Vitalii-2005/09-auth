import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadSource(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const sourceModule = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module: sourceModule,
      exports: sourceModule.exports,
      require: (id) =>
        Object.hasOwn(mocks, id) ? mocks[id] : loadDependency(id),
      FormData,
      Promise,
    },
    { filename },
  );
  return sourceModule.exports;
}

function freshStore() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = { localStorage: globalThis.localStorage };
  const loadStore = () => loadSource("lib/store/noteStore.ts").useNoteStore;
  return { store: loadStore(), loadStore, values };
}

test("draft patches preserve fields; only draft persists and restores in a fresh store", async () => {
  const { store, loadStore, values } = freshStore();
  store.getState().setDraft({ title: "Saved title" });
  store.getState().setDraft({ content: "Saved content" });
  store.getState().setDraft({ tag: "Work" });
  const persisted = JSON.parse(values.get("notehub-draft"));
  assert.deepEqual(Object.keys(persisted.state), ["draft"]);
  assert.deepEqual(persisted.state.draft, {
    title: "Saved title",
    content: "Saved content",
    tag: "Work",
  });

  const restoredStore = loadStore();
  assert.equal(restoredStore.getState().draft.title, "");
  await restoredStore.persist.rehydrate();
  assert.equal(
    JSON.stringify(restoredStore.getState().draft),
    JSON.stringify(persisted.state.draft),
  );
  restoredStore.getState().clearDraft();
  const firstClear = restoredStore.getState().draft;
  restoredStore.getState().clearDraft();
  assert.notEqual(restoredStore.getState().draft, firstClear);
  assert.deepEqual(JSON.parse(values.get("notehub-draft")).state.draft, {
    title: "",
    content: "",
    tag: "Todo",
  });
});

function formHarness({ fail = false } = {}) {
  const { store, values } = freshStore();
  store
    .getState()
    .setDraft({ title: "Saved title", content: "Saved content", tag: "Work" });
  const events = [];
  const { default: NoteForm } = loadSource("components/NoteForm/NoteForm.tsx", {
    react: {
      useState: () => [true, () => {}],
      useEffect: () => {},
      useActionState: (action, initial) => [
        initial,
        (data) => action(initial, data),
        false,
      ],
    },
    "@tanstack/react-query": {
      useMutation: () => ({
        mutateAsync: async (note) => {
          events.push({ type: "create", note });
          if (fail) throw new Error("Simulated failure");
          return { ...note, id: "mock-note" };
        },
      }),
      useQueryClient: () => ({
        invalidateQueries: async (options) => {
          events.push({
            type: "invalidate",
            options,
            draftTitle: store.getState().draft.title,
          });
        },
      }),
    },
    "next/navigation": {
      useRouter: () => ({
        push: (url) => events.push({ type: "push", url }),
        back: () => events.push({ type: "back" }),
      }),
    },
    "@/lib/api/clientApi": {
      createNote: () => {
        throw new Error("Live API is disabled in tests");
      },
    },
    "@/lib/store/noteStore": {
      useNoteStore: (selector) => selector(store.getState()),
    },
    "@/types/note": loadSource("types/note.ts"),
    "./NoteForm.module.css": {},
  });
  const child = NoteForm();
  const form = child.type(child.props);
  return { form, store, values, events };
}

function noteData(title = "Submitted title") {
  const data = new FormData();
  data.set("title", title);
  data.set("content", "Submitted content");
  data.set("tag", "Work");
  return data;
}

test("successful form action clears draft before invalidation and pushes All notes", async () => {
  const { form, store, values, events } = formHarness();
  const result = await form.props.action(noteData());
  assert.equal(result.error, "");
  assert.deepEqual(
    events.map((event) => event.type),
    ["create", "invalidate", "push"],
  );
  assert.equal(events[0].note.title, "Submitted title");
  assert.equal(events[1].options.queryKey[0], "notes");
  assert.equal(events[1].options.refetchType, "all");
  assert.equal(events[1].draftTitle, "");
  assert.equal(events[2].url, "/notes/filter/all");
  assert.equal(store.getState().draft.tag, "Todo");
  assert.equal(JSON.parse(values.get("notehub-draft")).state.draft.title, "");
});

test("failed creation preserves draft, returns an error, and does not navigate", async () => {
  const { form, store, events } = formHarness({ fail: true });
  const before = JSON.stringify(store.getState().draft);
  const result = await form.props.action(noteData());
  assert.match(result.error, /Could not create note/);
  assert.equal(result.attempt, 1);
  assert.equal(JSON.stringify(store.getState().draft), before);
  assert.deepEqual(
    events.map((event) => event.type),
    ["create"],
  );
});

test("invalid title, content and tag never call the API", async () => {
  const { form, events } = formHarness();
  assert.match((await form.props.action(noteData("   "))).error, /Title/);
  const tooLong = noteData();
  tooLong.set("content", "x".repeat(501));
  assert.match((await form.props.action(tooLong)).error, /Content/);
  const invalidTag = noteData();
  invalidTag.set("tag", "all");
  assert.match((await form.props.action(invalidTag)).error, /tag/);
  assert.equal(events.length, 0);
});

test("Cancel uses back and leaves the saved draft intact", () => {
  const { form, store, events } = formHarness();
  const before = JSON.stringify(store.getState().draft);
  const children = form.props.children;
  const actions = children[children.length - 1];
  const cancel = actions.props.children[0];
  assert.equal(cancel.props.type, "button");
  cancel.props.onClick();
  assert.deepEqual(events, [{ type: "back" }]);
  assert.equal(JSON.stringify(store.getState().draft), before);
});
