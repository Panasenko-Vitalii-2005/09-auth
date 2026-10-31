"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import Modal from "@/components/Modal/Modal";
import css from "./NotePreview.module.css";

interface NotePreviewErrorProps {
  error: Error & { digest?: string };
}

export default function NotePreviewError({ error }: NotePreviewErrorProps) {
  const router = useRouter();
  const onClose = useCallback(() => router.back(), [router]);

  return (
    <Modal onClose={onClose} ariaLabel="Note preview">
      <button type="button" className={css.backBtn} onClick={onClose}>
        Close preview
      </button>
      <p role="alert">Could not fetch note details. {error.message}</p>
    </Modal>
  );
}
