"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import Modal from "@/components/Modal/Modal";
import { fetchNoteById } from "@/lib/api/clientApi";
import { useAuthStore } from "@/lib/store/authStore";
import css from "./NotePreview.module.css";

export default function NotePreviewClient({
  ownerEmail,
}: {
  ownerEmail: string;
}) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canShowPreview =
    isAuthenticated &&
    user?.email === ownerEmail &&
    pathname === `/notes/${id}`;
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
    enabled: canShowPreview,
  });

  // A root slot can outlive private navigation and cached account-specific RSC.
  if (!canShowPreview) return null;

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
