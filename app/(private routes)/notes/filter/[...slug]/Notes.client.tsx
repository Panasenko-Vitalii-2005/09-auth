"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { notesQueryOptions } from "@/lib/notes-query";
import type { NoteTag } from "@/types/note";
import NoteList from "@/components/NoteList/NoteList";
import Pagination from "@/components/Pagination/Pagination";
import SearchBox from "@/components/SearchBox/SearchBox";
import css from "./NotesPage.module.css";

const SEARCH_DELAY = 300;

interface NotesClientProps {
  tag?: NoteTag;
}

export default function NotesClient({ tag }: NotesClientProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const updateSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim());
    setPage(1);
  }, SEARCH_DELAY);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    updateSearch(value);
  };

  const { data, isError, isFetching, isLoading } = useQuery(
    notesQueryOptions(page, search, tag),
  );

  return (
    <main className={css.app}>
      <header className={css.toolbar}>
        <SearchBox value={searchInput} onChange={handleSearchChange} />
        {data && data.totalPages > 1 && (
          <Pagination
            pageCount={data.totalPages}
            currentPage={page}
            onPageChange={setPage}
          />
        )}
        <Link
          className={css.button}
          href="/notes/action/create"
          prefetch={false}
        >
          Create note +
        </Link>
      </header>
      {isLoading && <p role="status">Loading notes...</p>}
      {isError && <p role="alert">Failed to load notes. Please try again.</p>}
      {isFetching && !isLoading && <p role="status">Updating notes...</p>}
      {data && data.notes.length > 0 && (
        <NoteList
          notes={data.notes}
          onPageEmpty={() =>
            setPage((currentPage) => Math.max(1, currentPage - 1))
          }
        />
      )}
      {data && data.notes.length === 0 && !isFetching && !isError && (
        <p>No notes found.</p>
      )}
    </main>
  );
}
