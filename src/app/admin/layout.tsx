import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AdminShell } from "./_components/AdminShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login?next=/admin");
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_admin_user",
    {
      user_id: data.user.id,
    }
  );

  if (adminError || isAdmin !== true) {
    redirect("/login?next=/admin&blocked=admin_not_allowed");
  }

  return <AdminShell>{children}</AdminShell>;
}