import { redirect } from "next/navigation";

/** `/admin` was the staff console before it was named the Praesidium. */
export default function Admin() {
  redirect("/praesidium");
}
