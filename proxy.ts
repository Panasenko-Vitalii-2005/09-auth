import { NextResponse, type NextRequest } from "next/server";
import { checkSession } from "@/lib/api/serverApi";
import { NoteHubApiError } from "@/lib/api/api";

const privateRoutes = ["/notes", "/profile"];
const publicRoutes = ["/sign-in", "/sign-up"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivate = privateRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isPublic = publicRoutes.includes(pathname);
  if (!isPrivate && !isPublic) return NextResponse.next();

  try {
    const session = await checkSession(request.headers.get("cookie") ?? "");
    const headers = new Headers(request.headers);
    headers.set("cookie", session.cookieHeader);
    const response =
      !session.success && isPrivate
        ? NextResponse.redirect(new URL("/sign-in", request.url))
        : session.success && isPublic
          ? NextResponse.redirect(new URL("/profile", request.url))
          : NextResponse.next({ request: { headers } });

    for (const cookie of session.setCookies)
      response.headers.append("set-cookie", cookie);
    if (!session.success) {
      response.cookies.delete("accessToken");
      response.cookies.delete("refreshToken");
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const rateLimited =
      error instanceof NoteHubApiError && error.status === 429;
    return new NextResponse(
      rateLimited
        ? "Too many requests. Please wait a moment and try again."
        : "Unable to verify your session. Please try again shortly.",
      {
        status: 503,
        headers: { "Retry-After": "30", "Cache-Control": "no-store" },
      },
    );
  }
}

export const config = {
  matcher: ["/notes/:path*", "/profile/:path*", "/sign-in", "/sign-up"],
};
