import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  notFound();
}

export default function UnmatchedPage() {
  // Keep the fallback in the same layout scope as the parallel modal slot.
  notFound();
}
