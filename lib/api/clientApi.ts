import { api } from "./api";
import type { Note, NoteTag } from "@/types/note";
import type { User } from "@/types/user";

export interface FetchNotesParams {
  page: number;
  perPage: number;
  search?: string;
  tag?: NoteTag;
}

export interface FetchNotesResponse {
  notes: Note[];
  totalPages: number;
}

export interface CreateNoteParams {
  title: string;
  content: string;
  tag: NoteTag;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SessionResponse {
  success: boolean;
}

export interface UpdateMeParams {
  username: string;
}

export async function fetchNotes(
  params: FetchNotesParams,
): Promise<FetchNotesResponse> {
  const { data } = await api.get<FetchNotesResponse>("/notes", { params });
  return data;
}

export async function fetchNoteById(id: string): Promise<Note> {
  const { data } = await api.get<Note>(`/notes/${encodeURIComponent(id)}`);
  return data;
}

export async function createNote(note: CreateNoteParams): Promise<Note> {
  const { data } = await api.post<Note>("/notes", note);
  return data;
}

export async function deleteNote(id: string): Promise<Note> {
  const { data } = await api.delete<Note>(`/notes/${encodeURIComponent(id)}`);
  return data;
}

export async function register(credentials: AuthCredentials): Promise<User> {
  const { data } = await api.post<User>("/auth/register", credentials);
  return data;
}

export async function login(credentials: AuthCredentials): Promise<User> {
  const { data } = await api.post<User>("/auth/login", credentials);
  return data;
}

export async function logout(): Promise<void> {
  await api.post<{ message: string }>("/auth/logout");
}

export async function checkSession(): Promise<boolean> {
  const { data } = await api.get<SessionResponse>("/auth/session");
  return data.success;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function updateMe(update: UpdateMeParams): Promise<User> {
  const { data } = await api.patch<User>("/users/me", {
    username: update.username,
  });
  return data;
}
