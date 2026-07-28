"use server";

/**
 * Proje Server Action bariyeri — create/delete işlemlerini tutarlı
 * async + try/catch hata yüzeyiyle dışarıya açar.
 */
import {
  createProject as createProjectAction,
  type CreateProjectInput,
  type CreateProjectResult,
} from "@/app/actions/create-project";
import {
  deleteProject as deleteProjectAction,
  type DeleteProjectResult,
} from "@/app/actions/delete-project";
import { logActionError } from "@/lib/action-result";

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  try {
    return await createProjectAction(input);
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "projects.createProject",
        error,
        "Proje oluşturulurken bir hata oluştu.",
      ),
    };
  }
}

export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResult> {
  try {
    return await deleteProjectAction(projectId);
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "projects.deleteProject",
        error,
        "Proje silinirken bir hata oluştu.",
      ),
    };
  }
}
