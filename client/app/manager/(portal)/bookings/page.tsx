import { Suspense } from "react";
import { ManagerBookingsClient } from "@/components/ManagerBookingsClient";

export default function ManagerBookingsPage() {
  return <Suspense fallback={null}><ManagerBookingsClient /></Suspense>;
}
