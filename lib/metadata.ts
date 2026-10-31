import type { Metadata } from "next";

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000",
);

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: new URL(path, siteUrl).toString(),
      siteName: "NoteHub",
      type: "website",
      images: [
        {
          url: "https://ac.goit.global/fullstack/react/notehub-og-meta.jpg",
          width: 1536,
          height: 1024,
          alt: "NoteHub — create, organize and manage your notes",
        },
      ],
    },
  };
}

export function noteExcerpt(content: string | null): string {
  const text = (content ?? "").replace(/\s+/g, " ").trim();
  if (!text)
    return "Read this note and keep your thoughts organized with NoteHub.";
  if (text.length <= 160) return text;
  const excerpt = text.slice(0, 157).replace(/\s+\S*$/, "");
  return `${excerpt}...`;
}
