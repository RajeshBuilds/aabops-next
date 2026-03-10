import { format } from "date-fns";
import type { BundleMetadata } from "@/lib/types";
import DeleteButton from "./DeleteButton";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function BundleCard({ bundle }: { bundle: BundleMetadata }) {
  return (
    <div className="bg-foreground/5 rounded-lg p-4 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-foreground truncate">{bundle.name}</h3>
          <span className="text-xs px-2 py-0.5 bg-blue-600/10 text-blue-600 rounded-full whitespace-nowrap">
            v{bundle.versionName}
          </span>
          <span className="text-xs px-2 py-0.5 bg-foreground/10 text-foreground/60 rounded-full whitespace-nowrap">
            Code: {bundle.versionCode}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-foreground/50">
          <span className="truncate">{bundle.originalFilename}</span>
          <span>{formatFileSize(bundle.fileSizeBytes)}</span>
          <span>{format(new Date(bundle.uploadedAt), "MMM d, yyyy h:mm a")}</span>
        </div>
      </div>
      <div className="ml-4 shrink-0">
        <DeleteButton bundleId={bundle.id} />
      </div>
    </div>
  );
}
