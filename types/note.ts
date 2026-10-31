export const noteTags = [
  "Todo",
  "Work",
  "Personal",
  "Meeting",
  "Shopping",
] as const;

export type NoteTag = (typeof noteTags)[number];

export function isNoteTag(value: string): value is NoteTag {
  return noteTags.some((tag) => tag === value);
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  tag: NoteTag;
}
