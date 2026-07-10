import { NextRequest, NextResponse } from "next/server";
import { adminToken } from "@/lib/admin/token";

export async function POST(req: NextRequest) {
  const { senha } = await req.json().catch(() => ({ senha: "" }));

  if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ink_admin", await adminToken(process.env.ADMIN_PASSWORD), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
