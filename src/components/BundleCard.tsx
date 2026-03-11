import { format } from "date-fns";
import { FileArchive, Calendar, HardDrive } from "lucide-react";
import type { BundleMetadata } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import BundleActionsMenu from "./BundleActionsMenu";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function BundleCard({ bundle }: { bundle: BundleMetadata }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileArchive className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{bundle.name}</h3>
            <Badge variant="secondary">v{bundle.versionName}</Badge>
            <Badge variant="outline">Code: {bundle.versionCode}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            <span className="min-w-0 truncate w-full sm:w-auto sm:max-w-[min(12rem,30vw)]">
              {bundle.originalFilename}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <HardDrive className="h-3 w-3 shrink-0" />
              <span>{formatFileSize(bundle.fileSizeBytes)}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{format(new Date(bundle.uploadedAt), "MMM d, yyyy h:mm a")}</span>
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <BundleActionsMenu bundle={bundle} />
        </div>
      </div>
    </Card>
  );
}
