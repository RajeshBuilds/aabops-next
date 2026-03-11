import { Inbox } from "lucide-react";
import type { BundleMetadata } from "@/lib/types";
import BundleCard from "./BundleCard";
import { Separator } from "@/components/ui/separator";

export default function BundleList({
  bundles,
}: {
  bundles: BundleMetadata[];
}) {
  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">No bundles uploaded yet</p>
        <p className="text-sm mt-1">Upload an AAB file to get started</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Uploaded Bundles
        </h2>
        <span className="text-sm text-muted-foreground">
          {bundles.length} {bundles.length === 1 ? "bundle" : "bundles"}
        </span>
      </div>
      <Separator className="mb-4" />
      <div className="space-y-3">
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} />
        ))}
      </div>
    </div>
  );
}
