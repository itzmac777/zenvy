import { ManagerSchedule } from "@/components/ManagerSchedule";
import { redirect } from "next/navigation";
import { simpleManagerUi } from "@/lib/manager-ui";

export default function ManagerCalendarPage() {
  if (simpleManagerUi) redirect("/manager");
  return <ManagerSchedule mode="calendar" />;
}
