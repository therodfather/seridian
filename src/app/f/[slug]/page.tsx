import { QueryProvider } from "@/app/QueryProvider";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import { PublicFormView } from "@/components/forms/PublicFormView";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <QueryProvider>
        <ConvexClientProvider>
          <PublicFormView slug={slug} />
        </ConvexClientProvider>
      </QueryProvider>
    </div>
  );
}
