import Link from "next/link";
import { Building, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const apps = [
  {
    id: "estimator",
    title: "Property Value Estimator",
    description:
      "Enter property features and get an ML-powered price estimation. View prediction history, compare properties side-by-side, and analyze feature importance with interactive charts.",
    href: "/estimator",
    icon: Building,
  },
  {
    id: "market",
    title: "Property Market Analysis",
    description:
      "Explore market trends with interactive dashboards, run what-if scenarios to evaluate renovation impacts, and export data in CSV or PDF for external analysis.",
    href: "/market",
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Property Portal
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
          A unified platform for property value estimation and market analysis.
          Choose an application below to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
        {/* Estimator Card - hover shows two options */}
        <div
          className={cn(
            "group relative flex flex-col rounded-lg border bg-card p-6 md:p-8 shadow-sm transition-all",
            "hover:shadow-md hover:border-primary/30",
            "min-h-[44px]"
          )}
        >
          {/* Icon */}
          <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
            <Building className="h-6 w-6" aria-hidden="true" />
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-semibold mb-3 group-hover:text-primary transition-colors">
            {apps[0].title}
          </h2>

          {/* Description */}
          <p className="text-muted-foreground text-sm md:text-base flex-1">
            {apps[0].description}
          </p>

          {/* Hover options */}
          <div className="mt-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href="/estimator"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              Estimate Price <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/estimator/feature-compare"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              Compare Features <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Market Card - hover shows two options */}
        <div
          className={cn(
            "group relative flex flex-col rounded-lg border bg-card p-6 md:p-8 shadow-sm transition-all",
            "hover:shadow-md hover:border-primary/30",
            "min-h-[44px]"
          )}
        >
          <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold mb-3 group-hover:text-primary transition-colors">
            {apps[1].title}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base flex-1">
            {apps[1].description}
          </p>
          <div className="mt-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href="/market"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              Analysis Dashboard <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/market/what-if"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              What-If Analysis <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
