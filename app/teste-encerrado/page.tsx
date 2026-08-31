import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TelaTesteEncerrado from "./TelaTesteEncerrado";

export default async function TesteEncerradoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <TelaTesteEncerrado />;
}
