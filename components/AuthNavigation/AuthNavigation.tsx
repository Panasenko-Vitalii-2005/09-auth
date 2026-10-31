"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/clientApi";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthStatus } from "@/components/AuthProvider/AuthProvider";
import css from "./AuthNavigation.module.css";

export default function AuthNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isLoading } = useAuthStatus();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setIsPending(true);
    setError("");
    try {
      await logout();
      await queryClient.cancelQueries();
      queryClient.clear();
      useAuthStore.getState().clearIsAuthenticated();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Could not log out. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (isLoading && !isAuthenticated)
    return (
      <li className={css.navigationItem} role="status">
        Checking session...
      </li>
    );

  return isAuthenticated ? (
    <>
      <li className={css.navigationItem}>
        <Link className={css.navigationLink} href="/profile" prefetch={false}>
          Profile
        </Link>
      </li>
      <li className={css.navigationItem}>
        <p className={css.userEmail}>{user?.email}</p>
        <button
          className={css.logoutButton}
          type="button"
          onClick={handleLogout}
          disabled={isPending}
        >
          {isPending ? "Logging out..." : "Logout"}
        </button>
        {error && <span role="alert">{error}</span>}
      </li>
    </>
  ) : (
    <>
      <li className={css.navigationItem}>
        <Link href="/sign-in" className={css.navigationLink} prefetch={false}>
          Login
        </Link>
      </li>
      <li className={css.navigationItem}>
        <Link href="/sign-up" className={css.navigationLink} prefetch={false}>
          Register
        </Link>
      </li>
    </>
  );
}
