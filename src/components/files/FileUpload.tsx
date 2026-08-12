"use client";

import { useState, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

interface FileUploadProps {
  parentId?: string;
  clientId?: Id<"clients">;
  onComplete?: () => void;
}

export function FileUpload({ parentId, clientId, onComplete }: FileUploadProps) {
  const uploadFile = useAction(api.files.upload);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      setProgress(0);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setFileName(file.name);
          setProgress(Math.round(((i + 0.5) / files.length) * 100));

          const buffer = await file.arrayBuffer();

          await uploadFile({
            name: file.name,
            type: file.type || "application/octet-stream",
            blob: buffer,
            size: file.size,
            parentId,
            clientId,
            uploadedBy: "current-user",
          });

          setProgress(Math.round(((i + 1) / files.length) * 100));
        }

        setFileName("");
        setProgress(0);
        toastMutationSuccess(
          files.length === 1 ? "File uploaded" : `${files.length} files uploaded`,
        );
        onComplete?.();
      } catch (error) {
        setFileName("Upload failed");
        toastMutationError(error, "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [uploadFile, parentId, clientId, onComplete],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all duration-150",
          dragging
            ? "border-seridian-500/50 bg-seridian-500/5"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {uploading ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
              <span className="animate-spin" aria-hidden="true">
                ⟳
              </span>
              Uploading {fileName}...
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-seridian-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-[11px] text-slate-500">
              {progress}% complete
            </p>
          </div>
        ) : (
          <>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.03] text-lg text-slate-400"
              aria-hidden="true"
            >
              ↑
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Drop files here or{" "}
              <span className="text-seridian-400">browse</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Any file type supported
            </p>
          </>
        )}
      </div>
    </div>
  );
}
