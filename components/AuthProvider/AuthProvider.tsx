"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { checkSession, getMe } from "@/lib/api/clientApi";
import { useAuthStore } from "@/lib/store/authStore";
import { isValidUser } from "@/lib/user";

const AuthContext = createContext({ isLoading: true, error: "" });
export const useAuthStatus = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState({ isLoading: true, error: "" });

  useEffect(() => {
    let active = true;
    const initialUser = useAuthStore.getState().user;
    // fetchQuery deduplicates Strict Mode initialization; never retry a failed login.
    queryClient
      .fetchQuery({
        queryKey: ["auth", "session"],
        queryFn: async () => {
          if (!(await checkSession())) return null;
          const user = await getMe();
          if (!isValidUser(user))
            throw new Error("Could not load your profile.");
          return user;
        },
        retry: false,
        staleTime: 0,
      })
      .then((user) => {
        if (!active) return;
        const store = useAuthStore.getState();
        // A login/logout completed while initialization was in flight.
        if (store.user === initialUser) {
          if (user) store.setUser(user);
          else store.clearIsAuthenticated();
        }
        setStatus({ isLoading: false, error: "" });
      })
      .catch(() => {
        if (!active) return;
        const store = useAuthStore.getState();
        if (store.user === initialUser) store.clearIsAuthenticated();
        setStatus({
          isLoading: false,
          error: "Could not restore your session. Please sign in again.",
        });
      });
    return () => {
      active = false;
    };
  }, [queryClient]);

  return <AuthContext.Provider value={status}>{children}</AuthContext.Provider>;
}
