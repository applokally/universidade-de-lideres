import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_ADMIN_PREFIX = "/admin";
const PROTECTED_STUDENT_PREFIX = "/aluno";

function redirectToLogin(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectToBlocked(req: NextRequest, reason: string) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  loginUrl.searchParams.set("blocked", reason);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isAdminRoute =
    pathname === PROTECTED_ADMIN_PREFIX ||
    pathname.startsWith(`${PROTECTED_ADMIN_PREFIX}/`);

  const isStudentRoute =
    pathname === PROTECTED_STUDENT_PREFIX ||
    pathname.startsWith(`${PROTECTED_STUDENT_PREFIX}/`);

  if (!isAdminRoute && !isStudentRoute) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return redirectToLogin(req);
  }

  if (isAdminRoute) {
    const { data: isAdmin, error: adminError } = await supabase.rpc(
      "is_admin_user",
      {
        user_id: data.user.id,
      }
    );

    if (adminError || isAdmin !== true) {
      return redirectToBlocked(req, "admin_not_allowed");
    }

    return res;
  }

  if (isStudentRoute) {
    const { data: isApproved, error: approvedError } = await supabase.rpc(
      "is_approved_student",
      {
        user_id: data.user.id,
      }
    );

    if (approvedError || isApproved !== true) {
      return redirectToBlocked(req, "student_not_approved");
    }

    return res;
  }

  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/aluno", "/aluno/:path*"],
};