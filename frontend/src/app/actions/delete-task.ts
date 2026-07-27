"use server";

/**
 * Geriye dönük uyumluluk: silme iş akışı task-workflows içinde.
 */
export {
  deleteTask,
  requestOrDeleteTask,
  type DeleteTaskWorkflowResult as DeleteTaskResult,
} from "@/app/actions/task-workflows";
