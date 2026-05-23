"use server";

import { revalidatePath } from "next/cache";
import {
  addComment,
  createTask,
  moveTask,
  runAgentForTaskIfNeeded
} from "@/lib/db";

export async function createTaskAction(formData) {
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const assigneeUserId = String(formData.get("assigneeUserId") || "").trim();

  if (!title) {
    return;
  }

  createTask({
    title,
    body,
    assigneeUserId: assigneeUserId || null
  });

  revalidatePath("/");
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

