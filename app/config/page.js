import {
  addProcessingColumnAction,
  createBoardAction,
  updateAgentProfileAction,
  updateBoardAction,
  updateProcessingColumnAction
} from "@/app/actions";
import Topbar from "@/app/components/Topbar";
import { getBoardSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

function taskCountLabel(count) {
  return `${count} ${count === 1 ? "task" : "tasks"}`;
}

function BoardForm({ board }) {
  return (
    <form action={updateBoardAction} className="form-grid">
      <input type="hidden" name="boardId" value={board.id} />
      <div className="form-row">
        <label>
          Name
          <input name="name" defaultValue={board.name} required />
        </label>
        <label>
          Task prefix
          <input name="identifierPrefix" defaultValue={board.identifierPrefix} />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" defaultValue={board.description || ""} />
      </label>
      <button type="submit">Save board</button>
    </form>
  );
}

function AddColumnForm({ board }) {
  const nextPosition = board.columns.length + 1;

  return (
    <form action={addProcessingColumnAction} className="inline-form">
      <input type="hidden" name="boardId" value={board.id} />
      <input name="name" required placeholder="Column name" />
      <select name="kind" defaultValue="human" aria-label="Column type">
        <option value="human">Human</option>
        <option value="agent">Agent</option>
      </select>
      <input
        name="position"
        type="number"
        min="1"
        defaultValue={nextPosition}
        aria-label="Position"
      />
      <input name="wipLimit" type="number" min="1" placeholder="WIP" aria-label="WIP limit" />
      <button type="submit">Add column</button>
    </form>
  );
}

function ColumnForm({ column }) {
  return (
    <article className="config-item">
      <form action={updateProcessingColumnAction} className="inline-form">
        <input type="hidden" name="columnId" value={column.id} />
        <input name="name" defaultValue={column.name} required aria-label="Column name" />
        <select name="kind" defaultValue={column.kind} aria-label="Column type">
          <option value="human">Human</option>
          <option value="agent">Agent</option>
        </select>
        <input
          name="position"
          type="number"
          min="1"
          defaultValue={column.position}
          aria-label="Position"
        />
        <input
          name="wipLimit"
          type="number"
          min="1"
          defaultValue={column.wipLimit || ""}
          placeholder="WIP"
          aria-label="WIP limit"
        />
        <button type="submit">Save column</button>
      </form>

      {column.kind === "agent" ? <AgentProfileForm column={column} /> : null}
    </article>
  );
}

function AgentProfileForm({ column }) {
  const profile = column.profile || {};

  return (
    <form action={updateAgentProfileAction} className="agent-config">
      <input type="hidden" name="processingColumnId" value={column.id} />
      <div className="form-row">
        <label>
          Harness
          <input name="harness" defaultValue={profile.harness || "codex-cli"} required />
        </label>
        <label>
          Model
          <input name="model" defaultValue={profile.model || "gpt-5"} required />
        </label>
      </div>
      <label>
        Config file
        <input value={profile.sourcePath || ""} readOnly />
      </label>
      <div className="form-row">
        <label>
          Working directory
          <input name="workingDirectory" defaultValue={profile.workingDirectory || ""} />
        </label>
      </div>
      <label>
        Prompt
        <textarea name="prompt" defaultValue={profile.prompt || ""} required />
      </label>
      <div className="form-row">
        <label>
          Allowed tools
          <textarea name="allowedTools" defaultValue={profile.allowedTools || "[]"} />
        </label>
        <label>
          Context rules
          <textarea name="contextRules" defaultValue={profile.contextRules || "{}"} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Environment
          <textarea name="environment" defaultValue={profile.environment || "{}"} />
        </label>
        <label>
          Completion criteria
          <textarea
            name="completionCriteria"
            defaultValue={profile.completionCriteria || ""}
          />
        </label>
      </div>
      <button type="submit">Save agent profile</button>
    </form>
  );
}

function BoardConfiguration({ board }) {
  return (
    <section className="admin-board">
      <header className="admin-board-header">
        <div>
          <h2>{board.name}</h2>
          <p className="muted">
            {taskCountLabel(board.taskCount)} · next key {board.identifierPrefix}-
            {board.nextTaskNumber}
          </p>
        </div>
      </header>

      <BoardForm board={board} />

      <section className="config-section">
        <div className="section-title">
          <h3>Processing columns</h3>
          <p className="muted">Queue columns are derived automatically between these.</p>
        </div>
        <AddColumnForm board={board} />
        <div className="config-list">
          {board.columns.map((column) => (
            <ColumnForm key={column.id} column={column} />
          ))}
        </div>
      </section>
    </section>
  );
}

export default function ConfigPage() {
  const boards = getBoardSettings();
  const firstBoardId = boards[0]?.id;

  return (
    <main className="shell">
      <Topbar active="config" boardId={firstBoardId} />

      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Config</h1>
          <p className="muted">
            Create workflows and configure human or agent-owned processing columns.
          </p>
        </div>
      </section>

      <section className="admin-grid">
        <section className="panel">
          <h2>Create board</h2>
          <form action={createBoardAction} className="form-grid">
            <label>
              Name
              <input name="name" required placeholder="Board name" />
            </label>
            <label>
              Task prefix
              <input name="identifierPrefix" placeholder="OPS" />
            </label>
            <label>
              Description
              <textarea name="description" placeholder="What this board is for" />
            </label>
            <button type="submit">Create board</button>
          </form>
        </section>

        <div className="admin-list">
          {boards.map((board) => (
            <BoardConfiguration key={board.id} board={board} />
          ))}
        </div>
      </section>
    </main>
  );
}
