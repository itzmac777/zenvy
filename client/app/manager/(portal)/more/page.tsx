import { ManagerMoreClient } from "@/components/ManagerMoreClient";
import { redirect } from "next/navigation";
import { simpleManagerUi } from "@/lib/manager-ui";

export default function ManagerMorePage() {
  if (simpleManagerUi) redirect("/manager/fields");
  return <ManagerMoreClient />;
}
