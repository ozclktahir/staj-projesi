"use server";

import {
  requestOrDeleteTask,
  type DeleteTaskWorkflowResult,
} from "@/app/actions/task-workflows";

export type DeleteTaskResult = DeleteTaskWorkflowResult;

/** Geriye dönük alias — silme iş akışını tetikler */
export async function deleteTask(
  taskId: string,
): Promise<DeleteTaskResult> {
  return requestOrDeleteTask(taskId);
}
