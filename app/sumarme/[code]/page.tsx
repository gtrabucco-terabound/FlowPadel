import { ClaimForm } from "@/components/claim-form";

export const dynamic = "force-dynamic";

export default async function SumarmePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <ClaimForm code={code} />
    </div>
  );
}
