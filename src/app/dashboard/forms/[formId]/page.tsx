import { FormBuilder } from "@/components/forms/FormBuilder";

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <FormBuilder formId={formId} />;
}
