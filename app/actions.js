"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addComment,
  addProcessingColumn,
  createBoard,
  createTask,
  moveTask,
  runAgentForTaskIfNeeded,
  updateAgentProfile,
  updateBoard,
  updateProcessingColumn
} from "@/lib/db";

export async function createTaskAction(formData) {
  const boardId = String(formData.get("boardId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const assigneeUserId = String(formData.get("assigneeUserId") || "").trim();

  if (!title) {
    return;
  }

  createTask({
    boardId: boardId || null,
    title,
    body,
    assigneeUserId: assigneeUserId || null
  });

  revalidatePath("/");
  redirect(boardId ? `/?board=${encodeURIComponent(boardId)}` : "/");
}

export async function moveTaskAction(formData) {
  const taskId = String(formData.get("taskId") || "");
  const destinationColumnId = String(formData.get("destinationColumnId") || "");
  const destinationColumnType = String(formData.get("destinationColumnType") || "");

  if (!taskId || !destinationColumnId || !destinationColumnType) {
    return;
  }

  moveTask({
    taskId,
    destinationColumnId,
    destinationColumnType,
    actorType: "user"
  });

  runAgentForTaskIfNeeded(taskId);
  revalidatePath("/");
}

export async function addCommentAction(formData) {
  const taskId = String(formData.get("taskId") || "");
  const body = String(formData.get("body") || "").trim();

  if (!taskId || !body) {
    return;
  }

  addComment({
    taskId,
    body,
    authorType: "user"
  });

  revalidatePath("/");
}

export async function createBoardAction(formData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const identifierPrefix = String(formData.get("identifierPrefix") || "").trim();

  if (!name) {
    return;
  }

  const boardId = createBoard({
    name,
    description,
    identifierPrefix
  });

  revalidatePath("/");
  revalidatePath("/config");
  revalidatePath("/stats");
  redirect(`/config?board=${encodeURIComponent(boardId)}`);
}

export async function updateBoardAction(formData) {
  const boardId = String(formData.get("boardId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const identifierPrefix = String(formData.get("identifierPrefix") || "").trim();

  if (!boardId || !name) {
    return;
  }

  updateBoard({
    boardId,
    name,
    description,
    identifierPrefix
  });

  revalidatePath("/");
  revalidatePath("/config");
  revalidatePath("/stats");
}

export async function addProcessingColumnAction(formData) {
  const boardId = String(formData.get("boardId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "human");
  const position = String(formData.get("position") || "").trim();
  const wipLimit = String(formData.get("wipLimit") || "").trim();

  if (!boardId || !name) {
    return;
  }

  addProcessingColumn({
    boardId,
    name,
    kind,
    position,
    wipLimit
  });

  revalidatePath("/");
  revalidatePath("/config");
  revalidatePath("/stats");
}

export async function updateProcessingColumnAction(formData) {
  const columnId = String(formData.get("columnId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "human");
  const position = String(formData.get("position") || "").trim();
  const wipLimit = String(formData.get("wipLimit") || "").trim();

  if (!columnId || !name) {
    return;
  }

  updateProcessingColumn({
    columnId,
    name,
    kind,
    position,
    wipLimit
  });

  revalidatePath("/");
  revalidatePath("/config");
  revalidatePath("/stats");
}

export async function updateAgentProfileAction(formData) {
  const processingColumnId = String(formData.get("processingColumnId") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const prompt = String(formData.get("prompt") || "").trim();
  const allowedTools = String(formData.get("allowedTools") || "").trim();
  const contextRules = String(formData.get("contextRules") || "").trim();
  const workingDirectory = String(formData.get("workingDirectory") || "").trim();
  const environment = String(formData.get("environment") || "").trim();
  const completionCriteria = String(formData.get("completionCriteria") || "").trim();

  if (!processingColumnId || !model || !prompt) {
    return;
  }

  updateAgentProfile({
    processingColumnId,
    model,
    prompt,
    allowedTools,
    contextRules,
    workingDirectory,
    environment,
    completionCriteria
  });

  revalidatePath("/");
  revalidatePath("/config");
  revalidatePath("/stats");
}
