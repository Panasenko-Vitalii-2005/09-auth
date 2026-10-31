"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import Modal from "@/components/Modal/Modal";
import { fetchNoteById } from "@/lib/api/clientApi";
import css from "./NotePreview.module.css";

export default function NotePreviewClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const onClose = useCallback(() => router.back(), [router]);
  const {
    data: note,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["note", id],
    queryFn: () => fetchNoteById(id),
    refetchOnMount: false,
  });

  const createdDate = note
    ? new Date(note.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";

  return (
    <Modal onClose={onClose} ariaLabel="Note preview">
      <button type="button" className={css.backBtn} onClick={onClose}>
        Close preview
      </button>
      {isLoading && <p role="status">Loading, please wait...</p>}
      {(isError || (!isLoading && !note)) && (
        <p role="alert">Could not fetch note details. Please try again.</p>
      )}
      {note && (
        <div className={css.container}>
          <div className={css.item}>
            <div className={css.header}>
              <h2>{note.title}</h2>
            </div>
            <p className={css.tag}>{note.tag}</p>
            <p className={css.content}>{note.content}</p>
            <p className={css.date}>Created on {createdDate}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
