"use client";

interface NotesErrorProps {
  error: Error & { digest?: string };
}

export default function NotesError({ error }: NotesErrorProps) {
  return <p>Could not fetch the list of notes. {error.message}</p>;
}
