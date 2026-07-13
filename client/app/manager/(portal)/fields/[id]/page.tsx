import { ManagerFieldWizard } from "@/components/ManagerFieldWizard";

export default async function ManageFieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManagerFieldWizard fieldId={id} />;
}
