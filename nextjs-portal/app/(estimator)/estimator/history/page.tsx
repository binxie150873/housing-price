import { HistoryTable } from "@/components/estimator/HistoryTable";

export const metadata = {
  title: "Estimation History | Property Value Estimator",
  description: "View and search your past property estimations.",
};

export default function HistoryPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Estimation History</h1>
        <p className="mt-2 text-muted-foreground">
          View, search, and filter your past property estimations.
        </p>
      </div>
      <HistoryTable />
    </div>
  );
}
