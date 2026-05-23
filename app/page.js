import {
  addCommentAction,
  createTaskAction,
  moveTaskAction
} from "@/app/actions";
import MoveForm from "@/app/components/MoveForm";
import ThemeToggle from "@/app/components/ThemeToggle";
import { getBoardView } from "@/lib/db";

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

function TaskCard({ task, columns }) {
  return (
    <article className="task">
      <div className="task-title">
        <span className="muted">{task.identifier}</span>
        <strong>{task.title}</strong>
      </div>
      {task.body ? <p className="task-body">{task.body}</p> : null}
      <p className="muted">
        Assigned to {task.assigneeName || "unassigned"}
      </p>
      <div className="task-actions">
        <MoveForm action={moveTaskAction} task={task} columns={columns} />
        <form action={addCommentAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <label>
            Comment
            <textarea name="body" placeholder="Add context or a handoff note" />
          </label>
          <button type="submit">Add comment</button>
        </form>
      </div>
    </article>
  );
}

function Column({ column, columns }) {
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
          <TaskCard key={task.id} task={task} columns={columns} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const view = getBoardView();
  const latestRuns = view.agentRuns.slice(0, 5);
  const latestHistory = view.flowHistory.slice(0, 6);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KNJ is Not Jira</p>
          <h1>{view.board.name}</h1>
          <p className="muted">
            Local-first Kanban for human and agent workflow steps.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="summary" aria-label="Board summary">
        <div className="metric">
          <span className="muted">Tasks</span>
          <strong>{view.metrics.taskCount}</strong>
        </div>
        <div className="metric">
          <span className="muted">Processing columns</span>
          <strong>{view.metrics.processingColumnCount}</strong>
        </div>
        <div className="metric">
          <span className="muted">Managed queues</span>
          <strong>{view.metrics.queueCount}</strong>
        </div>
        <div className="metric">
          <span className="muted">Agent runs</span>
          <strong>{view.metrics.agentRunCount}</strong>
        </div>
      </section>

      <section className="main-grid">
        <div className="board" aria-label="Kanban board">
          {view.columns.map((column) => (
            <Column key={column.id} column={column} columns={view.columns} />
          ))}
        </div>

        <aside className="side">
          <section className="panel">
            <h2>Create task</h2>
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
                  {view.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Create task</button>
            </form>
          </section>

          <section className="panel">
            <h2>Latest agent runs</h2>
            <div className="run-list">
              {latestRuns.length ? (
                latestRuns.map((run) => (
                  <div className="run" key={run.id}>
                    <strong>{run.taskIdentifier} in {run.columnName}</strong>
                    <span className={`status ${run.status}`}>{run.status}</span>
                    <p className="muted">{run.resultSummary || run.failureMessage}</p>
                  </div>
                ))
              ) : (
                <p className="muted">Move a task into an agent column to create a run.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <h2>Recent flow history</h2>
            <div className="history-list">
              {latestHistory.map((item) => (
                <div className="history-item" key={item.id}>
                  <strong>{item.taskIdentifier}</strong>
                  <span>{item.columnName}</span>
                  <p className="muted">
                    {formatTime(item.enteredAt)} {"->"} {formatTime(item.exitedAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
