import { redirect } from "next/navigation";

export default function LegacyNewFieldPage() {
  redirect("/manager/fields/new");
}
