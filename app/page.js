import Link from "next/link";
import {
  addCommentAction,
  createTaskAction,
  moveTaskAction,
  updateAgentProfileAction
} from "@/app/actions";
import BoardSwitcher from "@/app/components/BoardSwitcher";
import Modal from "@/app/components/Modal";
import MoveForm from "@/app/components/MoveForm";
import Topbar from "@/app/components/Topbar";
import {
  getAgentColumnConfig,
  getBoards,
  getBoardView,
  getTaskDetail
} from "@/lib/db";

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

function TaskCard({ task, boardId }) {
  return (
    <Link
      className="task compact-task"
      href={`/?board=${encodeURIComponent(boardId)}&task=${task.identifier}`}
    >
      <div className="task-title">
        <span className="muted">{task.identifier}</span>
        <strong>{task.title}</strong>
      </div>
      <p className="muted">{task.assigneeName || "Unassigned"}</p>
    </Link>
  );
}

function Column({ column }) {
  const agentConfigHref = `/?board=${encodeURIComponent(
    column.boardId
  )}&agentColumn=${encodeURIComponent(column.id)}`;

  return (
    <section className="column">
      <div className="column-header">
        <div>
          <div className="column-title-row">
            <h2>{column.name}</h2>
            {column.kind === "agent" ? (
              <Link
                className="square-icon-button"
                href={agentConfigHref}
                aria-label={`Configure ${column.name} agent column`}
                title={`Configure ${column.name}`}
              >
                <span aria-hidden="true">⚙</span>
              </Link>
            ) : null}
          </div>
          <p className="muted">{column.tasks.length} tasks</p>
        </div>
        <span className={`badge ${column.kind || column.type}`}>
          {column.kind || column.type}
        </span>
      </div>
      <div className="tasks">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} boardId={column.boardId} />
        ))}
      </div>
    </section>
  );
}

function AgentColumnConfigModal({ config, boardId }) {
  if (!config) {
    return (
      <Modal
        title="Agent column not found"
        eyebrow="Configuration"
        closeHref={`/?board=${encodeURIComponent(boardId)}`}
      >
        <p className="muted">The requested agent column does not exist on this board.</p>
      </Modal>
    );
  }

  const profile = config.profile;

  return (
    <Modal
      title={`${config.name} agent config`}
      eyebrow={config.boardName}
      closeHref={`/?board=${encodeURIComponent(boardId)}`}
    >
      <form action={updateAgentProfileAction} className="modal-content">
        <input type="hidden" name="processingColumnId" value={config.id} />
        <section className="detail-section">
          <h3>Harness</h3>
          <div className="form-row">
            <label>
              Harness command
              <input name="harness" defaultValue={profile.harness} required />
            </label>
            <label>
              Model
              <input name="model" defaultValue={profile.model} required />
            </label>
          </div>
          <label>
            Working directory
            <input name="workingDirectory" defaultValue={profile.workingDirectory || ""} />
          </label>
        </section>

        <section className="detail-section">
          <h3>Instructions</h3>
          <label>
            Prompt passed to the harness
            <textarea name="prompt" defaultValue={profile.prompt} required />
          </label>
          <label>
            Completion criteria
            <textarea
              name="completionCriteria"
              defaultValue={profile.completionCriteria}
            />
          </label>
        </section>

        <section className="detail-section">
          <h3>Task context</h3>
          <div className="form-row">
            <label>
              Allowed tools
              <textarea name="allowedTools" defaultValue={profile.allowedTools} />
            </label>
            <label>
              Context rules
              <textarea name="contextRules" defaultValue={profile.contextRules} />
            </label>
          </div>
          <label>
            Environment
            <textarea name="environment" defaultValue={profile.environment} />
          </label>
        </section>

        <section className="detail-section">
          <h3>Markdown source</h3>
          <p className="muted">
            This agent profile is also stored as an editable markdown file.
          </p>
          <code className="file-path">{config.sourcePath}</code>
        </section>

        <button type="submit">Save agent config</button>
      </form>
    </Modal>
  );
}

function CreateTaskModal({ users, boardId }) {
  return (
    <Modal
      title="Create task"
      eyebrow="New work item"
      closeHref={`/?board=${encodeURIComponent(boardId)}`}
    >
      <form action={createTaskAction} className="form-grid">
        <input type="hidden" name="boardId" value={boardId} />
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

function TaskDetailModal({ task, columns, boardId }) {
  if (!task) {
    return (
      <Modal
        title="Task not found"
        eyebrow="Missing task"
        closeHref={`/?board=${encodeURIComponent(boardId)}`}
      >
        <p className="muted">The requested task does not exist on this board.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={task.title}
      eyebrow={task.identifier}
      closeHref={`/?board=${encodeURIComponent(boardId)}`}
    >
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
  const boards = getBoards();
  const requestedBoardId = params?.board || null;
  const view = getBoardView(requestedBoardId);
  const selectedTask = params?.task ? getTaskDetail(params.task, view.board.id) : null;
  const selectedAgentColumn = params?.agentColumn
    ? getAgentColumnConfig(params.agentColumn, view.board.id)
    : null;
  const showCreateTask = params?.create === "task";

  return (
    <main className="shell board-shell">
      <Topbar active="board" boardId={view.board.id} />

      <section className="board-toolbar">
        <BoardSwitcher boards={boards} selectedBoardId={view.board.id} />
        <Link
          className="button secondary"
          href={`/?board=${encodeURIComponent(view.board.id)}&create=task`}
        >
          New task
        </Link>
      </section>

      <section className="board" aria-label="Kanban board">
        {view.columns.map((column) => (
          <Column key={column.id} column={{ ...column, boardId: view.board.id }} />
        ))}
      </section>

      {showCreateTask ? (
        <CreateTaskModal users={view.users} boardId={view.board.id} />
      ) : null}
      {params?.task ? (
        <TaskDetailModal
          task={selectedTask}
          columns={view.columns}
          boardId={view.board.id}
        />
      ) : null}
      {params?.agentColumn ? (
        <AgentColumnConfigModal
          config={selectedAgentColumn}
          boardId={view.board.id}
        />
      ) : null}
    </main>
  );
}
