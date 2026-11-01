import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  notFound();
}

export default function UnmatchedPage() {
  // Resolve the custom not-found content and metadata for unmatched URLs.
  notFound();
}
