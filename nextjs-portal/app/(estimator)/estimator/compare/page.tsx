import { CompareView } from "@/components/estimator/CompareView";

export default function ComparePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Compare Properties</h1>
        <p className="mt-2 text-muted-foreground">
          Select 2 to 4 properties from your estimation history to compare them
          side-by-side.
        </p>
      </div>
      <CompareView />
    </div>
  );
}
