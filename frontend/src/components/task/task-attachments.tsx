"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  FileArchive,
  FileImage,
  FileText,
  MoreHorizontal,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteTaskAttachment,
  uploadTaskAttachment,
} from "@/app/actions/attachments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSize } from "@/lib/format-relative-time";
import type { TaskAttachment } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type TaskAttachmentsProps = {
  taskId: string;
  attachments: TaskAttachment[];
  onChange: (attachments: TaskAttachment[]) => void;
};

function fileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return FileImage;
  }
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) {
    return FileArchive;
  }
  if (ext === "pdf" || ["doc", "docx", "txt", "md", "csv"].includes(ext)) {
    return FileText;
  }
  return Paperclip;
}

export function TaskAttachments({
  taskId,
  attachments,
  onChange,
}: TaskAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length || uploading) return;

      setUploading(true);
      const nextList = [...attachments];

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgressLabel(
          `Yükleniyor… ${i + 1}/${list.length} (${file.name})`,
        );

        const formData = new FormData();
        formData.set("taskId", taskId);
        formData.set("file", file);

        const result = await uploadTaskAttachment(formData);
        if (!result.success) {
          console.error("[TaskAttachments] upload:", result.error);
          toast.error(`${file.name}: ${result.error}`);
          continue;
        }

        nextList.unshift(result.attachment);
        onChange([...nextList]);
        toast.success(`${file.name} yüklendi`);
      }

      setProgressLabel(null);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [attachments, onChange, taskId, uploading],
  );

  async function handleDelete(attachment: TaskAttachment) {
    setDeletingId(attachment.id);
    const previous = attachments;
    onChange(attachments.filter((a) => a.id !== attachment.id));

    const result = await deleteTaskAttachment(attachment.id);
    setDeletingId(null);

    if (!result.success) {
      onChange(previous);
      toast.error(result.error);
      return;
    }
    toast.success("Dosya silindi");
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Dosya Ekleri</h3>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 transition-colors",
          dragging && "border-primary bg-primary/5",
          uploading && "opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              void uploadFiles(event.target.files);
            }
          }}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Dosyaları sürükleyip bırakın veya seçin
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            className="rounded-lg border-border"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="size-3.5" />
            Dosya Seç
          </Button>
          {progressLabel ? (
            <p className="text-[11px] font-medium text-primary animate-pulse">
              {progressLabel}
            </p>
          ) : null}
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Henüz dosya eklenmemiş.
        </div>
      ) : (
        <ul className="space-y-2">
          {attachments.map((file) => {
            const Icon = fileIcon(file.file_name);
            const sizeLabel = formatFileSize(file.file_size);

            return (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <Icon className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {file.file_name}
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    {[sizeLabel, file.uploader_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {file.is_own ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Dosya menüsü"
                        disabled={deletingId === file.id}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onSelect={(event) => {
                          event.preventDefault();
                          void handleDelete(file);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
