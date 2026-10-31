"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createNote } from "@/lib/api/clientApi";
import { useNoteStore } from "@/lib/store/noteStore";
import { isNoteTag, noteTags } from "@/types/note";
import css from "./NoteForm.module.css";

interface FormState {
  error: string;
  attempt: number;
}

function DraftForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useNoteStore((state) => state.draft);
  const setDraft = useNoteStore((state) => state.setDraft);
  const clearDraft = useNoteStore((state) => state.clearDraft);
  const createMutation = useMutation({ mutationFn: createNote });
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (previousState, formData) => {
      const failure = (error: string): FormState => ({
        error,
        attempt: previousState.attempt + 1,
      });
      const titleValue = formData.get("title");
      const contentValue = formData.get("content");
      const tag = formData.get("tag");
      const title = typeof titleValue === "string" ? titleValue.trim() : "";
      const content =
        typeof contentValue === "string" ? contentValue.trim() : "";

      if (title.length < 3 || title.length > 50) {
        return failure("Title must contain between 3 and 50 characters.");
      }
      if (content.length > 500) {
        return failure("Content must be at most 500 characters.");
      }
      if (typeof tag !== "string" || !isNoteTag(tag)) {
        return failure("Select a valid tag.");
      }

      try {
        await createMutation.mutateAsync({ title, content, tag });
      } catch {
        return failure(
          "Could not create note. Please try again. Your draft is saved.",
        );
      }

      clearDraft();
      await queryClient.invalidateQueries({
        queryKey: ["notes"],
        refetchType: "all",
      });
      router.push("/notes/filter/all");
      return { error: "", attempt: previousState.attempt + 1 };
    },
    { error: "", attempt: 0 },
  );

  return (
    // Remount after a failed action so React's native form reset restores the draft.
    <form
      key={state.attempt}
      action={formAction}
      className={css.form}
      aria-busy={isPending}
    >
      <div className={css.formGroup}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          name="title"
          className={css.input}
          defaultValue={draft.title}
          onChange={(event) => setDraft({ title: event.target.value })}
          required
          minLength={3}
          maxLength={50}
          disabled={isPending}
        />
      </div>

      <div className={css.formGroup}>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          name="content"
          rows={8}
          className={css.textarea}
          defaultValue={draft.content}
          onChange={(event) => setDraft({ content: event.target.value })}
          maxLength={500}
          disabled={isPending}
        />
      </div>

      <div className={css.formGroup}>
        <label htmlFor="tag">Tag</label>
        <select
          id="tag"
          name="tag"
          className={css.select}
          defaultValue={draft.tag}
          onChange={(event) => {
            if (isNoteTag(event.target.value)) {
              setDraft({ tag: event.target.value });
            }
          }}
          required
          disabled={isPending}
        >
          {noteTags.map((tag) => (
            <option value={tag} key={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p role="alert" className={css.error}>
          {state.error}
        </p>
      )}

      <div className={css.actions}>
        <button
          type="button"
          className={css.cancelButton}
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className={css.submitButton} disabled={isPending}>
          {isPending ? "Creating..." : "Create note"}
        </button>
      </div>
    </form>
  );
}

export default function NoteForm() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    // Wait for localStorage before mounting uncontrolled defaultValue fields.
    Promise.resolve(useNoteStore.persist.rehydrate()).then(() => {
      if (active) setIsHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!isHydrated) return <p role="status">Restoring your draft...</p>;
  return <DraftForm />;
}
