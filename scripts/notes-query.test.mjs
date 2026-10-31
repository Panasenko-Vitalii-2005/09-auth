import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as reactQuery from "@tanstack/react-query";
import ts from "typescript";

// Run the real query factory with the installed TanStack Query implementation.
// The API boundary is mocked so these tests cannot reach the backend.
const sourceModule = { exports: {} };
const source = fs.readFileSync(
  new URL("../lib/notes-query.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const apiCalls = [];
const previousData = {
  notes: [{ id: "previous-note", title: "Previous note", tag: "Work" }],
  totalPages: 3,
};

vm.runInNewContext(compiled, {
  module: sourceModule,
  exports: sourceModule.exports,
  require: (id) => {
    if (id === "@tanstack/react-query") return reactQuery;
    if (id === "@/lib/api/clientApi") {
      return {
        fetchNotes: async (params) => {
          apiCalls.push(params);
          return previousData;
        },
      };
    }
    throw new Error(`Unexpected import: ${id}`);
  },
});

const { notesQueryOptions, NOTES_PER_PAGE } = sourceModule.exports;

function transition(previousOptions, currentOptions) {
  const client = new reactQuery.QueryClient();
  client.getQueryCache().build(client, previousOptions).setData(previousData);
  const observer = new reactQuery.QueryObserver(client, {
    ...previousOptions,
    enabled: false,
  });
  observer.setOptions({ ...currentOptions, enabled: false });
  const result = observer.getCurrentResult();
  observer.destroy();
  client.clear();
  return result;
}

test("same tag and different page retains previous data as placeholder", () => {
  const result = transition(
    notesQueryOptions(1, "", "Work"),
    notesQueryOptions(2, "", "Work"),
  );
  assert.equal(result.data, previousData);
  assert.equal(result.isPlaceholderData, true);
});

test("same tag and different search retains previous data as placeholder", () => {
  const result = transition(
    notesQueryOptions(1, "old search", "Work"),
    notesQueryOptions(1, "new search", "Work"),
  );
  assert.equal(result.data, previousData);
  assert.equal(result.isPlaceholderData, true);
});

test("different tags do not reuse previous data", () => {
  const result = transition(
    notesQueryOptions(1, "", "Work"),
    notesQueryOptions(1, "", "Personal"),
  );
  assert.equal(result.data, undefined);
  assert.equal(result.isPlaceholderData, false);
});

test("All notes and a specific tag do not share placeholders in either direction", () => {
  for (const [previousTag, currentTag] of [
    [undefined, "Work"],
    ["Work", undefined],
  ]) {
    const result = transition(
      notesQueryOptions(1, "", previousTag),
      notesQueryOptions(1, "", currentTag),
    );
    assert.equal(result.data, undefined);
    assert.equal(result.isPlaceholderData, false);
  }
});

test("All notes can retain placeholders across pages and searches", () => {
  const result = transition(
    notesQueryOptions(1),
    notesQueryOptions(2, "search"),
  );
  assert.equal(result.data, previousData);
  assert.equal(result.isPlaceholderData, true);
});

test("missing previous query or metadata does not provide a placeholder", () => {
  for (const tag of [undefined, "Work"]) {
    const { placeholderData } = notesQueryOptions(1, "", tag);
    assert.equal(placeholderData(previousData, undefined), undefined);
    assert.equal(placeholderData(previousData, { meta: undefined }), undefined);
  }
});

test("undefined and null metadata tags both represent All notes", () => {
  const options = notesQueryOptions();
  assert.equal(options.meta.tag, null);
  for (const tag of [undefined, null]) {
    assert.equal(
      options.placeholderData(previousData, { meta: { tag } }),
      previousData,
    );
    assert.equal(
      notesQueryOptions(1, "", "Work").placeholderData(previousData, {
        meta: { tag },
      }),
      undefined,
    );
  }
});

test("query keys retain every cache input and notes-prefix invalidation", async () => {
  const client = new reactQuery.QueryClient();
  const cases = [
    [1, "", undefined],
    [2, "", undefined],
    [1, "search", undefined],
    [1, "", "Work"],
    [1, "", "Personal"],
  ];
  const hashes = new Set();
  for (const [page, search, tag] of cases) {
    const options = notesQueryOptions(page, search, tag);
    assert.equal(
      JSON.stringify(options.queryKey),
      JSON.stringify(["notes", page, NOTES_PER_PAGE, search, tag ?? null]),
    );
    hashes.add(client.getQueryCache().build(client, options).queryHash);
  }
  assert.equal(hashes.size, cases.length);
  await client.invalidateQueries({ queryKey: ["notes"], refetchType: "none" });
  assert.equal(
    client
      .getQueryCache()
      .getAll()
      .every((query) => query.state.isInvalidated),
    true,
  );
  client.clear();
});

test("SSR dehydration and hydration preserve tag metadata and cached data", () => {
  const serverClient = new reactQuery.QueryClient();
  const options = notesQueryOptions(1, "", "Work");
  serverClient
    .getQueryCache()
    .build(serverClient, options)
    .setData(previousData);
  const browserClient = new reactQuery.QueryClient();
  reactQuery.hydrate(
    browserClient,
    JSON.parse(JSON.stringify(reactQuery.dehydrate(serverClient))),
  );
  const query = browserClient
    .getQueryCache()
    .find({ queryKey: options.queryKey });
  assert.equal(query.meta.tag, "Work");
  assert.deepEqual(query.state.data, previousData);
  serverClient.clear();
  browserClient.clear();
});

test("All notes API parameters omit a tag while a category keeps its tag", async () => {
  apiCalls.length = 0;
  await notesQueryOptions().queryFn();
  await notesQueryOptions(2, "search", "Work").queryFn();
  assert.equal(apiCalls[0].tag, undefined);
  assert.equal(apiCalls[1].tag, "Work");
  assert.equal(apiCalls[1].page, 2);
  assert.equal(apiCalls[1].search, "search");
});

test("SSR prefetch uses its supplied server fetcher with matching hydration keys", async () => {
  apiCalls.length = 0;
  const serverCalls = [];
  const serverClient = new reactQuery.QueryClient();
  const options = notesQueryOptions(1, "", "Work", async (params) => {
    serverCalls.push(params);
    return previousData;
  });
  await serverClient.prefetchQuery(options);
  assert.equal(serverCalls.length, 1);
  assert.equal(serverCalls[0].tag, "Work");
  assert.equal(apiCalls.length, 0);
  const browserClient = new reactQuery.QueryClient();
  reactQuery.hydrate(browserClient, reactQuery.dehydrate(serverClient));
  assert.deepEqual(
    browserClient.getQueryData(notesQueryOptions(1, "", "Work").queryKey),
    previousData,
  );
  serverClient.clear();
  browserClient.clear();
});
