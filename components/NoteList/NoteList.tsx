"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNote } from "@/lib/api/clientApi";
import type { Note } from "@/types/note";
import css from "./NoteList.module.css";

interface NoteListProps {
  notes: Note[];
  onPageEmpty?: () => void;
}

export default function NoteList({ notes, onPageEmpty }: NoteListProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async (deletedNote) => {
      queryClient.removeQueries({
        queryKey: ["note", deletedNote.id],
        exact: true,
      });
      if (notes.length === 1 && notes[0].id === deletedNote.id) {
        onPageEmpty?.();
      }
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
  return (
    <>
      {deleteMutation.isError && (
        <p role="alert">Could not delete note. Please try again.</p>
      )}
      <ul className={css.list}>
        {notes.map((note) => (
          <li className={css.listItem} key={note.id}>
            <h2 className={css.title}>{note.title}</h2>
            <p className={css.content}>{note.content}</p>
            <div className={css.footer}>
              <span className={css.tag}>{note.tag}</span>
              <Link
                className={css.link}
                href={`/notes/${note.id}`}
                scroll={false}
                prefetch={false}
              >
                View details
              </Link>
              <button
                className={css.button}
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(note.id)}
              >
                {deleteMutation.isPending &&
                deleteMutation.variables === note.id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
