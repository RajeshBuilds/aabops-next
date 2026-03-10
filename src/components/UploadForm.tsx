"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setStatusMessage("Uploading AAB file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (displayName.trim()) {
        formData.append("name", displayName.trim());
      }

      // Use XMLHttpRequest for upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/bundles");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
            if (pct >= 100) {
              setStatusMessage("Extracting metadata from AAB...");
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status === 201) {
            resolve();
          } else {
            try {
              const resp = JSON.parse(xhr.responseText);
              reject(new Error(resp.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      // Reset form
      setDisplayName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setStatusMessage(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-foreground/5 rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">Upload AAB Bundle</h2>

      <div className="mb-4">
        <label htmlFor="file" className="block text-sm font-medium mb-1">
          AAB File
        </label>
        <input
          id="file"
          ref={fileInputRef}
          type="file"
          accept=".aab"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
        />
        <p className="text-xs text-foreground/50 mt-1">
          Package name, version, and version code will be extracted automatically
          from the AAB manifest.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="displayName" className="block text-sm font-medium mb-1">
          Display Name{" "}
          <span className="text-foreground/40 font-normal">(optional)</span>
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Auto-detected from AAB if left empty"
          className="w-full px-3 py-2 rounded-md border border-foreground/20 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{statusMessage}</span>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <span>{uploadProgress}%</span>
            )}
          </div>
          <div className="w-full bg-foreground/10 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                uploadProgress >= 100
                  ? "bg-amber-500 animate-pulse"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(uploadProgress, 100)}%` }}
            />
          </div>
          {uploadProgress >= 100 && (
            <p className="text-xs text-foreground/50 mt-1">
              Running bundletool to extract package info — this may take a
              moment...
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || !file}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Processing..." : "Upload Bundle"}
      </button>
    </form>
  );
}
