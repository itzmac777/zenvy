import { redirect } from "next/navigation";

export default async function LegacyFieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/manager/fields/${id}`);
}
