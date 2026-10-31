import axios from "axios";

export class NoteHubApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NoteHubApiError";
  }
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api",
  withCredentials: true,
  timeout: 15_000,
});

// Never pass Axios request configuration (including cookies) to error boundaries.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const message =
      status === 429
        ? "Too many requests. Please wait a moment and try again."
        : status === 401 || status === 403
          ? "Your session is invalid or your email and password are incorrect."
          : status === 400
            ? "Please check your details. This email may already be registered."
            : status
              ? `NoteHub request failed (${status}). Please try again.`
              : "Could not connect to NoteHub. Please try again.";
    return Promise.reject(new NoteHubApiError(message, status));
  },
);
