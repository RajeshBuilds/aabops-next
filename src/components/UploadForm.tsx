"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileArchive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_CHUNK_RETRIES = 3;

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (f && !f.name.endsWith(".aab")) {
      setError("Only .aab files are accepted");
      return;
    }
    if (f && f.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    let sessionId: string | null = null;

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setStatusMessage("Uploading AAB file...");

    try {
      const initResp = await fetch("/api/upload-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          displayName: displayName.trim() || undefined,
        }),
      });
      const initData = await initResp.json();
      if (!initResp.ok) {
        throw new Error(initData?.error || "Failed to initialize upload");
      }

      sessionId = initData.sessionId as string;
      const chunkSize = initData.chunkSize as number;
      const totalChunks = Math.ceil(file.size / chunkSize);

      let uploadedBytes = 0;
      const uploadChunkWithRetry = async (chunk: Blob, chunkIndex: number) => {
        let attempt = 0;
        while (attempt < MAX_CHUNK_RETRIES) {
          try {
            const resp = await fetch(`/api/upload-sessions/${sessionId}?chunkIndex=${chunkIndex}`, {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              body: chunk,
            });
            if (!resp.ok) {
              const data = await resp.json().catch(() => ({}));
              throw new Error(data?.error || `Chunk ${chunkIndex + 1} failed`);
            }
            return;
          } catch (err) {
            attempt += 1;
            if (attempt >= MAX_CHUNK_RETRIES) {
              throw err;
            }
            const backoffMs = 300 * 2 ** (attempt - 1);
            await new Promise((res) => setTimeout(res, backoffMs));
          }
        }
      };

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        setStatusMessage(
          `Uploading chunk ${chunkIndex + 1}/${totalChunks} (${formatSize(end)} of ${formatSize(file.size)})`,
        );
        await uploadChunkWithRetry(chunk, chunkIndex);
        uploadedBytes += chunk.size;
        setUploadProgress(Math.round((uploadedBytes / file.size) * 100));
      }

      setStatusMessage("Extracting metadata from AAB...");
      const completeResp = await fetch(`/api/upload-sessions/${sessionId}/complete`, {
        method: "POST",
      });
      const completeData = await completeResp.json();
      if (!completeResp.ok) {
        throw new Error(completeData?.error || "Failed to finalize upload");
      }

      setDisplayName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      if (sessionId) {
        void fetch(`/api/upload-sessions/${sessionId}`, { method: "DELETE" }).catch(() => {
          // Ignore cleanup errors; upload has already failed.
        });
      }
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setStatusMessage(null);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Upload AAB File</CardTitle>
        <CardDescription>
          Package name, version, and version code are extracted automatically
          from the AAB manifest.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-border bg-muted/30"
                  : "border-muted-foreground/25 hover:border-muted-foreground/40 cursor-pointer"
            } ${file ? "" : "cursor-pointer"}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".aab"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileArchive className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  Drop your AAB file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only .aab files are accepted
                </p>
              </div>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display Name{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Auto-detected from AAB if left empty"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  {uploadProgress >= 100 && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {statusMessage}
                </span>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <span className="text-muted-foreground font-mono text-xs">
                    {uploadProgress}%
                  </span>
                )}
              </div>
              <Progress
                value={Math.min(uploadProgress, 100)}
                className="h-2"
              />
              {uploadProgress >= 100 && (
                <p className="text-xs text-muted-foreground">
                  Running bundletool to extract package info — this may take a
                  moment...
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={uploading || !file} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Bundle
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
