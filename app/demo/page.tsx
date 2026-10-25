import { redirect } from "next/navigation";

export default function DemoPage() {
  // Preserva favoritos e links antigos sem oferecer um CRM fictício.
  redirect("/conhecer");
}
