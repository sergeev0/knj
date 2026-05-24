import Link from "next/link";
import {
  addCommentAction,
  createTaskAction,
  moveTaskAction
} from "@/app/actions";
import Modal from "@/app/components/Modal";
import MoveForm from "@/app/components/MoveForm";
import Topbar from "@/app/components/Topbar";
import { getBoardView, getTaskDetail } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatTime(value) {
  if (!value) {
    return "open";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function TaskCard({ task }) {
  return (
    <Link className="task compact-task" href={`/?task=${task.identifier}`}>
      <div className="task-title">
        <span className="muted">{task.identifier}</span>
        <strong>{task.title}</strong>
      </div>
      <p className="muted">{task.assigneeName || "Unassigned"}</p>
    </Link>
  );
}

function Column({ column }) {
  return (
    <section className="column">
      <div className="column-header">
        <div>
          <h2>{column.name}</h2>
          <p className="muted">{column.tasks.length} tasks</p>
        </div>
        <span className={`badge ${column.kind || column.type}`}>
          {column.kind || column.type}
        </span>
      </div>
      <div className="tasks">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}

function CreateTaskModal({ users }) {
  return (
    <Modal title="Create task" eyebrow="New work item">
      <form action={createTaskAction} className="form-grid">
        <label>
          Title
          <input name="title" required placeholder="Write the task title" />
        </label>
        <label>
          Description
          <textarea
            name="body"
            placeholder="Describe the problem, context, and desired outcome"
          />
        </label>
        <label>
          Assignee
          <select name="assigneeUserId" defaultValue="">
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Create task</button>
      </form>
    </Modal>
  );
}

function TaskDetailModal({ task, columns }) {
  if (!task) {
    return (
      <Modal title="Task not found" eyebrow="Missing task">
        <p className="muted">The requested task does not exist on this board.</p>
      </Modal>
    );
  }

  return (
    <Modal title={task.title} eyebrow={task.identifier}>
      <div className="modal-content">
        <section className="detail-grid">
          <div>
            <span className="detail-label">Column</span>
            <strong>{task.currentColumnName}</strong>
          </div>
          <div>
            <span className="detail-label">Assignee</span>
            <strong>{task.assigneeName || "Unassigned"}</strong>
          </div>
          <div>
            <span className="detail-label">Updated</span>
            <strong>{formatTime(task.updatedAt)}</strong>
          </div>
        </section>

        <section className="detail-section">
          <h3>Description</h3>
          <p className="task-body">{task.body || "No description yet."}</p>
        </section>

        <section className="detail-section">
          <h3>Move task</h3>
          <MoveForm action={moveTaskAction} task={task} columns={columns} />
        </section>

        <section className="detail-section">
          <h3>Comments</h3>
          <div className="comment-list">
            {task.comments.length ? (
              task.comments.map((comment) => (
                <article className="comment" key={comment.id}>
                  <strong>
                    {comment.authorName || comment.authorType} ·{" "}
                    {formatTime(comment.createdAt)}
                  </strong>
                  <p>{comment.body}</p>
                </article>
              ))
            ) : (
              <p className="muted">No comments yet.</p>
            )}
          </div>
          <form action={addCommentAction} className="form-grid">
            <input type="hidden" name="taskId" value={task.id} />
            <label>
              Add comment
              <textarea name="body" placeholder="Add context or a handoff note" />
            </label>
            <button type="submit">Add comment</button>
          </form>
        </section>

        <section className="detail-section">
          <h3>Agent runs</h3>
          <div className="run-list">
            {task.agentRuns.length ? (
              task.agentRuns.map((run) => (
                <div className="run" key={run.id}>
                  <strong>{run.columnName}</strong>
                  <span className={`status ${run.status}`}>{run.status}</span>
                  <p className="muted">{run.resultSummary || run.failureMessage}</p>
                </div>
              ))
            ) : (
              <p className="muted">No agent runs for this task yet.</p>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h3>Flow history</h3>
          <div className="history-list">
            {task.flowHistory.map((item) => (
              <div className="history-item" key={item.id}>
                <strong>{item.columnName}</strong>
                <p className="muted">
                  {formatTime(item.enteredAt)} {"->"} {formatTime(item.exitedAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const view = getBoardView();
  const selectedTask = params?.task ? getTaskDetail(params.task) : null;
  const showCreateTask = params?.create === "task";

  return (
    <main className="shell board-shell">
      <Topbar active="board" />

      <section className="page-heading board-heading">
        <div>
          <p className="eyebrow">Board</p>
          <h1>{view.board.name}</h1>
          <p className="muted">
            Work moves through human steps, managed queues, and agent steps.
          </p>
        </div>
      </section>

      <section className="board" aria-label="Kanban board">
        {view.columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </section>

      {showCreateTask ? <CreateTaskModal users={view.users} /> : null}
      {params?.task ? (
        <TaskDetailModal task={selectedTask} columns={view.columns} />
      ) : null}
    </main>
  );
}
