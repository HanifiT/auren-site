import { redirect } from "next/navigation";

/** `/me` was the record before the shell existed. Old links still land. */
export default function Me() {
  redirect("/hearth");
}
