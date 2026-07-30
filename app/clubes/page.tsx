import { redirect } from "next/navigation";

// La landing pasó a ser el home (/). Mantenemos /clubes como alias.
export default function ClubesRedirect() {
  redirect("/");
}
