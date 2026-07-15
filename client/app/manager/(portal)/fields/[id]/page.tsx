import { ManagerFieldWizard } from "@/components/ManagerFieldWizard";
import { SimpleFieldSettings } from "@/components/SimpleFieldSettings";
import { simpleManagerUi } from "@/lib/manager-ui";

export default async function ManageFieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return simpleManagerUi ? <SimpleFieldSettings fieldId={id} /> : <ManagerFieldWizard fieldId={id} />;
}
