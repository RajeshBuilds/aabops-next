import type { BundleMetadata } from "@/lib/types";
import BundleCard from "./BundleCard";

export default function BundleList({ bundles }: { bundles: BundleMetadata[] }) {
  if (bundles.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/40">
        <p className="text-lg">No bundles uploaded yet</p>
        <p className="text-sm mt-1">Upload an AAB file to get started</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Uploaded Bundles ({bundles.length})
      </h2>
      <div className="space-y-3">
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} />
        ))}
      </div>
    </div>
  );
}
