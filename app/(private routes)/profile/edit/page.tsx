"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { User } from "@/types/user";
import { updateMe } from "@/lib/api/clientApi";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthStatus } from "@/components/AuthProvider/AuthProvider";
import { avatarSource } from "@/lib/user";
import css from "./EditProfilePage.module.css";

function EditProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    setIsPending(true);
    setError("");
    try {
      const updatedUser = await updateMe({ username: username.trim() });
      useAuthStore.getState().setUser(updatedUser);
      router.replace("/profile");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={css.profileCard}>
      <h1 className={css.formTitle}>Edit Profile</h1>
      <Image
        src={avatarSource(user.avatar)}
        alt={`${user.username || "User"}'s avatar`}
        width={120}
        height={120}
        className={css.avatar}
      />
      <form
        className={css.profileInfo}
        onSubmit={handleSubmit}
        aria-busy={isPending}
      >
        <div className={css.usernameWrapper}>
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            name="username"
            type="text"
            className={css.input}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            disabled={isPending}
            autoComplete="username"
          />
        </div>
        <p>Email: {user.email}</p>
        {error && <p role="alert">{error}</p>}
        <div className={css.actions}>
          <button type="submit" className={css.saveButton} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className={css.cancelButton}
            onClick={() => router.push("/profile")}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditProfile() {
  const user = useAuthStore((state) => state.user);
  const { isLoading, error } = useAuthStatus();
  return (
    <main className={css.mainContent}>
      {user ? (
        <EditProfileForm key={user.email} user={user} />
      ) : isLoading ? (
        <p role="status">Loading profile...</p>
      ) : (
        <p role="alert">
          {error || "Your session has ended. Please sign in again."}
        </p>
      )}
    </main>
  );
}
