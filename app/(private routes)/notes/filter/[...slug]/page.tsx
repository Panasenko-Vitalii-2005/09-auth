import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { notesQueryOptions } from "@/lib/notes-query";
import { fetchNotes } from "@/lib/api/serverApi";
import { createPageMetadata } from "@/lib/metadata";
import { isNoteTag } from "@/types/note";
import NotesClient from "./Notes.client";

interface NotesPageProps {
  params: Promise<{ slug: string[] }>;
}

async function resolveFilter(params: NotesPageProps["params"]) {
  const { slug } = await params;
  if (slug.length !== 1) notFound();
  const filter = slug[0];
  if (filter !== "all" && !isNoteTag(filter)) notFound();
  return filter;
}

export async function generateMetadata({
  params,
}: NotesPageProps): Promise<Metadata> {
  const filter = await resolveFilter(params);
  const category = filter === "all" ? "All" : filter;
  return createPageMetadata(
    `${category} notes | NoteHub`,
    filter === "all"
      ? "Browse, search and manage all your notes in NoteHub."
      : `Browse, search and manage your ${filter} notes in NoteHub.`,
    `/notes/filter/${filter}`,
  );
}

export default async function NotesPage({ params }: NotesPageProps) {
  const filter = await resolveFilter(params);
  const tag = filter === "all" ? undefined : filter;

  const queryClient = new QueryClient();
  const options = notesQueryOptions(1, "", tag, fetchNotes);
  await queryClient.prefetchQuery(options);

  const error = queryClient.getQueryState(options.queryKey)?.error;
  if (error) throw error;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotesClient key={tag ?? "all"} tag={tag} />
    </HydrationBoundary>
  );
}
