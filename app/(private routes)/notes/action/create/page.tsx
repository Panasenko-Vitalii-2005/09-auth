import type { Metadata } from "next";
import NoteForm from "@/components/NoteForm/NoteForm";
import { createPageMetadata } from "@/lib/metadata";
import css from "./CreateNote.module.css";

export const metadata: Metadata = createPageMetadata(
  "Create note | NoteHub",
  "Create a new note in NoteHub. Your draft is saved automatically as you write.",
  "/notes/action/create",
);

export default function CreateNote() {
  return (
    <main className={css.main}>
      <div className={css.container}>
        <h1 className={css.title}>Create note</h1>
        <NoteForm />
      </div>
    </main>
  );
}
