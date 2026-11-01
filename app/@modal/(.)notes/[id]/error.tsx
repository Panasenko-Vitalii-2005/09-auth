"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import Modal from "@/components/Modal/Modal";
import { useAuthStore } from "@/lib/store/authStore";
import css from "./NotePreview.module.css";

interface NotePreviewErrorProps {
  error: Error & { digest?: string };
}

export default function NotePreviewError({ error }: NotePreviewErrorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onClose = useCallback(() => router.back(), [router]);

  if (!isAuthenticated || !pathname.startsWith("/notes/")) return null;

  return (
    <Modal onClose={onClose} ariaLabel="Note preview">
      <button type="button" className={css.backBtn} onClick={onClose}>
        Close preview
      </button>
      <p role="alert">Could not fetch note details. {error.message}</p>
    </Modal>
  );
}
