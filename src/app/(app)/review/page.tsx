import { ReviewView, type ConfessionFields } from "@/components/receipt/ReviewView";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function fieldsFromSearch(params: Record<string, string | string[] | undefined>): Partial<ConfessionFields> | undefined {
  const name = firstValue(params.name);
  const cost = firstValue(params.cost);
  const frequency = firstValue(params.frequency);
  const feeling = firstValue(params.feeling);
  const fields: Partial<ConfessionFields> = {};
  if (name !== undefined) fields.name = name;
  if (cost !== undefined) fields.cost = cost;
  if (frequency === "weekly" || frequency === "monthly" || frequency === "yearly") fields.frequency = frequency;
  if (feeling !== undefined) fields.feeling = feeling;
  return Object.keys(fields).length ? fields : undefined;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <ReviewView initialFields={fieldsFromSearch(params)} />;
}
