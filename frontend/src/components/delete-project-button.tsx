"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DeleteProjectModal } from "@/components/delete-project-modal";
import { Button } from "@/components/ui/button";

type DeleteProjectButtonProps = {
  project: {
    id: string;
    name: string;
    workspaceId?: string | null;
  };
};

export function DeleteProjectButton({ project }: DeleteProjectButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-lg border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
      >
        <Trash2 className="size-3.5" />
        Projeyi Sil
      </Button>
      <DeleteProjectModal
        open={open}
        onOpenChange={setOpen}
        project={{
          id: project.id,
          name: project.name,
          workspaceId: project.workspaceId,
        }}
      />
    </>
  );
}
