"use client";

interface NoteDetailsErrorProps {
  error: Error & { digest?: string };
}

export default function NoteDetailsError({ error }: NoteDetailsErrorProps) {
  return <p>Could not fetch note details. {error.message}</p>;
}
