"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Package, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { BundleMetadata } from "@/lib/types";

const UNIVERSAL_DEVICE_SPEC = {
  supportedAbis: ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"],
  supportedLocales: ["en"],
  screenDensity: 420,
  sdkVersion: 33,
};

export default function BundleActionsMenu({ bundle }: { bundle: BundleMetadata }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [downloadingApks, setDownloadingApks] = useState(false);

  const handleDownloadAab = () => {
    window.open(`/api/bundles/${bundle.id}/download`, "_blank");
  };

  const handleDownloadApks = () => {
    setDownloadingApks(true);
    const downloadPromise = (async () => {
      const res = await fetch(`/api/bundles/${bundle.id}/build-apks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceSpec: UNIVERSAL_DEVICE_SPEC }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Build failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bundle.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.apks`;
      a.click();
      URL.revokeObjectURL(url);
    })();

    toast.promise(downloadPromise, {
      loading: "Generating APKS...",
      description:
        "Bundletool is converting your AAB to APKS. This may take 30–60 seconds.",
      success: "APKS ready. Download started.",
      error: (err) => err.message || "Failed to build APKS",
    });

    downloadPromise.finally(() => setDownloadingApks(false));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bundles/${bundle.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setShowDeleteDialog(false);
      router.refresh();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-fit min-w-44">
          <DropdownMenuItem onClick={handleDownloadAab}>
            <Download className="mr-2 h-4 w-4" />
            Download AAB
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDownloadApks}
            disabled={downloadingApks}
          >
            {downloadingApks ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Download APKS
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the AAB file and its metadata. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
