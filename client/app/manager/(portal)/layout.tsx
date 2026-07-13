import { ManagerShell } from "@/components/ManagerShell";

export default function ManagerPortalLayout({ children }: { children: React.ReactNode }) {
  return <ManagerShell>{children}</ManagerShell>;
}
