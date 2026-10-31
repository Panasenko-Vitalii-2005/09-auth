import type { User } from "@/types/user";

const defaultAvatar =
  "https://ac.goit.global/fullstack/react/default-avatar.jpg";

export function avatarSource(avatar: string): string {
  try {
    const url = new URL(avatar);
    return url.protocol === "https:" && url.hostname === "ac.goit.global"
      ? url.toString()
      : defaultAvatar;
  } catch {
    return defaultAvatar;
  }
}

export function isValidUser(user: User): boolean {
  return Boolean(
    user &&
    typeof user.email === "string" &&
    user.email &&
    typeof user.username === "string" &&
    typeof user.avatar === "string",
  );
}
