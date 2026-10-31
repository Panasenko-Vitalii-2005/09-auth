import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parseCookie, parseSetCookie, stringifyCookie } from "cookie";
import { api, NoteHubApiError } from "./api";
import type {
  FetchNotesParams,
  FetchNotesResponse,
  SessionResponse,
} from "./clientApi";
import type { Note } from "@/types/note";
import type { User } from "@/types/user";

async function requestHeaders(cookieHeader?: string) {
  return { Cookie: cookieHeader ?? (await cookies()).toString() };
}

export async function fetchNotes(
  params: FetchNotesParams,
): Promise<FetchNotesResponse> {
  const { data } = await api.get<FetchNotesResponse>("/notes", {
    params,
    headers: await requestHeaders(),
  });
  return data;
}

export async function fetchNoteById(id: string): Promise<Note> {
  const { data } = await api.get<Note>(`/notes/${encodeURIComponent(id)}`, {
    headers: await requestHeaders(),
  });
  return data;
}

// React cache shares metadata/page reads only within the current server render.
export const fetchNoteForPage = cache(async (id: string) => {
  try {
    return await fetchNoteById(id);
  } catch (error) {
    if (
      error instanceof NoteHubApiError &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }
});

export async function getMe(cookieHeader?: string): Promise<User> {
  const { data } = await api.get<User>("/users/me", {
    headers: await requestHeaders(cookieHeader),
  });
  return data;
}

export interface ServerSession {
  success: boolean;
  cookieHeader: string;
  setCookies: string[];
}

// The official session handler trusts an existing access cookie. Validate it
// against /users/me, and retry refresh without an expired/forged access token.
export async function checkSession(
  incomingCookies?: string,
): Promise<ServerSession> {
  let cookieHeader = incomingCookies ?? (await cookies()).toString();
  const cookieValues = parseCookie(cookieHeader);
  let setCookies: string[] = [];
  if (!cookieValues.accessToken && !cookieValues.refreshToken) {
    return { success: false, cookieHeader, setCookies };
  }

  async function refresh() {
    const response = await api.get<SessionResponse>("/auth/session", {
      headers: { Cookie: cookieHeader },
    });
    const returnedCookies = response.headers["set-cookie"];
    setCookies = returnedCookies
      ? Array.isArray(returnedCookies)
        ? returnedCookies
        : [returnedCookies]
      : [];
    for (const value of setCookies) {
      const parsed = parseSetCookie(value);
      cookieValues[parsed.name] = parsed.value;
    }
    cookieHeader = stringifyCookie(cookieValues);
    return response.data.success;
  }

  try {
    if (!(await refresh())) return { success: false, cookieHeader, setCookies };
    try {
      await getMe(cookieHeader);
    } catch (error) {
      if (
        !(error instanceof NoteHubApiError) ||
        (error.status !== 401 && error.status !== 403) ||
        !cookieValues.refreshToken ||
        !cookieValues.accessToken
      )
        throw error;
      delete cookieValues.accessToken;
      cookieHeader = stringifyCookie(cookieValues);
      if (!(await refresh()))
        return { success: false, cookieHeader, setCookies };
      await getMe(cookieHeader);
    }
    return { success: true, cookieHeader, setCookies };
  } catch (error) {
    if (
      error instanceof NoteHubApiError &&
      (error.status === 400 || error.status === 401 || error.status === 403)
    ) {
      return { success: false, cookieHeader, setCookies: [] };
    }
    throw error;
  }
}
