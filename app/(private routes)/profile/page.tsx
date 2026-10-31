import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/api/serverApi";
import { NoteHubApiError } from "@/lib/api/api";
import { createPageMetadata } from "@/lib/metadata";
import { avatarSource, isValidUser } from "@/lib/user";
import css from "./ProfilePage.module.css";

export const metadata: Metadata = {
  ...createPageMetadata(
    "Profile | NoteHub",
    "View and manage your NoteHub profile.",
    "/profile",
  ),
  robots: { index: false, follow: false },
};

export default async function Profile() {
  const user = await getMe().catch((error: unknown) => {
    if (
      error instanceof NoteHubApiError &&
      (error.status === 401 || error.status === 403)
    )
      redirect("/sign-in");
    throw error;
  });
  if (!isValidUser(user)) throw new Error("Could not load your profile.");
  return (
    <main className={css.mainContent}>
      <div className={css.profileCard}>
        <div className={css.header}>
          <h1 className={css.formTitle}>Profile Page</h1>
          <Link
            href="/profile/edit"
            className={css.editProfileButton}
            prefetch={false}
          >
            Edit Profile
          </Link>
        </div>
        <div className={css.avatarWrapper}>
          <Image
            src={avatarSource(user.avatar)}
            alt={`${user.username || "User"}'s avatar`}
            width={120}
            height={120}
            className={css.avatar}
          />
        </div>
        <div className={css.profileInfo}>
          <p>Username: {user.username || user.email}</p>
          <p>Email: {user.email}</p>
        </div>
      </div>
    </main>
  );
}
