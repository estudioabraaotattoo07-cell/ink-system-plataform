import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { adminToken } from "@/lib/admin/token";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // O admin não é um tenant (não usa Supabase Auth) — é o dono do SaaS,
  // autenticado só por uma senha simples guardada em ADMIN_PASSWORD.
  const isAdminPublicRoute = path === "/admin/login" || path === "/admin/auth";
  if (path.startsWith("/admin") && !isAdminPublicRoute) {
    const cookie = request.cookies.get("ink_admin")?.value;
    const expected = process.env.ADMIN_PASSWORD ? await adminToken(process.env.ADMIN_PASSWORD) : null;
    if (!cookie || !expected || cookie !== expected) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|rest/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
