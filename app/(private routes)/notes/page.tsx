import { redirect } from "next/navigation";

export default function Notes() {
  redirect("/notes/filter/all");
}
