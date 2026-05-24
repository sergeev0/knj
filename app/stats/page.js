import BoardSwitcher from "@/app/components/BoardSwitcher";
import Topbar from "@/app/components/Topbar";
import { getBoards, getBoardView } from "@/lib/db";

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

export default async function StatsPage({ searchParams }) {
  const params = await searchParams;
  const boards = getBoards();
  const view = getBoardView(params?.board || null);
  const latestRuns = view.agentRuns.slice(0, 8);
  const latestHistory = view.flowHistory.slice(0, 12);

  return (
    <main className="shell">
      <Topbar active="stats" boardId={view.board.id} />

      <section className="stats-toolbar">
        <BoardSwitcher boards={boards} selectedBoardId={view.board.id} />
      </section>

      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Board analytics</p>
          <h1>{view.board.name} stats</h1>
          <p className="muted">
            Flow and agent execution data collected from the local board.
          </p>
        </div>
      </section>

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

      <section className="stats-grid">
        <section className="panel">
          <h2>Latest agent runs</h2>
          <div className="run-list">
            {latestRuns.length ? (
              latestRuns.map((run) => (
                <div className="run" key={run.id}>
                  <strong>
                    {run.taskIdentifier} in {run.columnName}
                  </strong>
                  <span className={`status ${run.status}`}>{run.status}</span>
                  <p className="muted">{run.resultSummary || run.failureMessage}</p>
                </div>
              ))
            ) : (
              <p className="muted">No agent runs yet.</p>
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
      </section>
    </main>
  );
}
