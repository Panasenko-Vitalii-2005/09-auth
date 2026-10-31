import { queryOptions } from "@tanstack/react-query";
import { fetchNotes } from "@/lib/api/clientApi";
import type { FetchNotesParams, FetchNotesResponse } from "@/lib/api/clientApi";
import type { NoteTag } from "@/types/note";

interface NotesQueryMeta extends Record<string, unknown> {
  tag?: NoteTag | null;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: NotesQueryMeta;
  }
}

export const NOTES_PER_PAGE = 12;

export function notesQueryOptions(
  page = 1,
  search = "",
  tag?: NoteTag,
  fetcher: (
    params: FetchNotesParams,
  ) => Promise<FetchNotesResponse> = fetchNotes,
) {
  const normalizedTag = tag ?? null;

  return queryOptions({
    queryKey: ["notes", page, NOTES_PER_PAGE, search, normalizedTag],
    meta: { tag: normalizedTag },
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.meta && (previousQuery.meta.tag ?? null) === normalizedTag
        ? previousData
        : undefined,
    queryFn: () =>
      fetcher({
        page,
        perPage: NOTES_PER_PAGE,
        search: search || undefined,
        tag,
      }),
  });
}
