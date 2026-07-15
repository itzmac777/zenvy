import { ClassicManagerFieldWizard } from "@/components/ManagerFieldWizard";

export default async function AdvancedFieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassicManagerFieldWizard fieldId={id} />;
}
