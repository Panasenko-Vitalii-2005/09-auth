import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { fetchNoteForPage } from "@/lib/api/serverApi";
import { createPageMetadata, noteExcerpt } from "@/lib/metadata";
import NoteDetailsClient from "./NoteDetails.client";

interface NoteDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: NoteDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const note = await fetchNoteForPage(id);
  return createPageMetadata(
    `${note.title} | NoteHub`,
    noteExcerpt(note.content),
    `/notes/${encodeURIComponent(id)}`,
  );
}

export default async function NoteDetailsPage({
  params,
}: NoteDetailsPageProps) {
  const { id } = await params;
  const queryClient = new QueryClient();
  const queryKey = ["note", id];
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () => fetchNoteForPage(id),
  });
  const error = queryClient.getQueryState(queryKey)?.error;
  if (error) throw error;
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NoteDetailsClient />
    </HydrationBoundary>
  );
}
