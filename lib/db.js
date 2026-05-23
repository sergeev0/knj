import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { buildContextPayload, runLocalCodex } from "@/lib/agent-runner";

const databaseDirectory = path.join(process.cwd(), ".knj");
const databasePath =
  process.env.KNJ_DATABASE_PATH || path.join(databaseDirectory, "knj.sqlite");

let database;

function now() {
  return new Date().toISOString();
}

function id() {
  return randomUUID();
}

function db() {
  if (!database) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
    migrate(database);
    seed(database);
  }

  return database;
}

function migrate(connection) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      identifier_prefix TEXT NOT NULL,
      next_task_number INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processing_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id),
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('human', 'agent')),
      wip_limit INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_profiles (
      id TEXT PRIMARY KEY,
      processing_column_id TEXT NOT NULL REFERENCES processing_columns(id),
      harness TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      allowed_tools TEXT NOT NULL,
      context_rules TEXT NOT NULL,
      working_directory TEXT,
      environment TEXT NOT NULL,
      completion_criteria TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL UNIQUE,
      board_id TEXT NOT NULL REFERENCES boards(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      current_column_id TEXT NOT NULL,
      current_column_type TEXT NOT NULL CHECK (current_column_type IN ('processing', 'queue')),
      assignee_user_id TEXT REFERENCES users(id),
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      author_type TEXT NOT NULL CHECK (author_type IN ('user', 'agent', 'system')),
      author_user_id TEXT REFERENCES users(id),
      agent_run_id TEXT REFERENCES agent_runs(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flow_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      column_id TEXT NOT NULL,
      column_type TEXT NOT NULL CHECK (column_type IN ('processing', 'queue')),
      entered_at TEXT NOT NULL,
      exited_at TEXT,
      entered_by_type TEXT NOT NULL CHECK (entered_by_type IN ('user', 'agent', 'system')),
      entered_by_user_id TEXT REFERENCES users(id),
      entered_by_agent_run_id TEXT REFERENCES agent_runs(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      board_id TEXT NOT NULL REFERENCES boards(id),
      processing_column_id TEXT NOT NULL REFERENCES processing_columns(id),
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
      harness TEXT NOT NULL,
      model TEXT NOT NULL,
      profile_snapshot TEXT NOT NULL,
      context_snapshot TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      exit_code INTEGER,
      stdout TEXT,
      stderr TEXT,
      transcript TEXT,
      result_summary TEXT,
      failure_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id),
      actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
      actor_user_id TEXT REFERENCES users(id),
      agent_run_id TEXT REFERENCES agent_runs(id),
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seed(connection) {
  const existing = connection.prepare("SELECT COUNT(*) AS count FROM boards").get();
  if (existing.count > 0) {
    return;
  }

  const createdAt = now();
  const userA = id();
  const userB = id();
  const boardId = id();
  const triage = id();
  const build = id();
  const review = id();
  const done = id();
  const taskA = id();
  const taskB = id();
  const queueBuild = queueId(boardId, triage, build);

  connection.prepare(
    "INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?), (?, ?, ?)"
  ).run(userA, "Ilya", createdAt, userB, "Agent Operator", createdAt);

  connection.prepare(
    `INSERT INTO boards
      (id, name, description, identifier_prefix, next_task_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    boardId,
    "KNJ V1",
    "The first local workflow for building KNJ.",
    "KNJ",
    3,
    createdAt,
    createdAt
  );

  const insertColumn = connection.prepare(
    `INSERT INTO processing_columns
      (id, board_id, name, position, kind, wip_limit, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertColumn.run(triage, boardId, "Triage", 1, "human", null, createdAt, createdAt);
  insertColumn.run(build, boardId, "Build", 2, "agent", 1, createdAt, createdAt);
  insertColumn.run(review, boardId, "Review", 3, "human", 3, createdAt, createdAt);
  insertColumn.run(done, boardId, "Done", 4, "human", null, createdAt, createdAt);

  connection.prepare(
    `INSERT INTO agent_profiles
      (id, processing_column_id, harness, model, prompt, allowed_tools, context_rules,
       working_directory, environment, completion_criteria, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id(),
    build,
    "codex-cli",
    "gpt-5",
    "Implement the task according to the KNJ project conventions. Keep changes scoped, verify them, and summarize the result.",
    JSON.stringify(["filesystem", "shell", "git"]),
    JSON.stringify({
      includeTask: true,
      includeComments: true,
      includePriorRunSummaries: true,
      includeBoardMetadata: true
    }),
    process.cwd(),
    JSON.stringify({}),
    "The requested implementation is complete, verified, and summarized for review.",
    createdAt,
    createdAt
  );

  const insertTask = connection.prepare(
    `INSERT INTO tasks
      (id, identifier, board_id, title, body, current_column_id, current_column_type,
       assignee_user_id, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertTask.run(
    taskA,
    "KNJ-1",
    boardId,
    "Define the first usable board experience",
    "Render processing columns plus managed queues, and make task movement auditable.",
    triage,
    "processing",
    userA,
    userA,
    createdAt,
    createdAt
  );

  insertTask.run(
    taskB,
    "KNJ-2",
    boardId,
    "Wire the local agent run boundary",
    "Create agent run records automatically when work enters an agent-owned column.",
    queueBuild,
    "queue",
    userB,
    userA,
    createdAt,
    createdAt
  );

  const insertFlow = connection.prepare(
    `INSERT INTO flow_history
      (id, task_id, column_id, column_type, entered_at, entered_by_type)
      VALUES (?, ?, ?, ?, ?, ?)`
  );

  insertFlow.run(id(), taskA, triage, "processing", createdAt, "system");
  insertFlow.run(id(), taskB, queueBuild, "queue", createdAt, "system");

  insertAudit(connection, {
    taskId: taskA,
    actorType: "system",
    eventType: "task.created",
    payload: { identifier: "KNJ-1" }
  });
  insertAudit(connection, {
    taskId: taskB,
    actorType: "system",
    eventType: "task.created",
    payload: { identifier: "KNJ-2" }
  });
}

function queueId(boardId, previousProcessingColumnId, nextProcessingColumnId) {
  return `queue:${boardId}:${previousProcessingColumnId}:${nextProcessingColumnId}`;
}

function deriveColumns(processingColumns, boardId) {
  const columns = [];

  processingColumns.forEach((column, index) => {
    columns.push({
      id: column.id,
      type: "processing",
      kind: column.kind,
      name: column.name,
      position: column.position,
      tasks: []
    });

    const nextColumn = processingColumns[index + 1];
    if (nextColumn) {
      columns.push({
        id: queueId(boardId, column.id, nextColumn.id),
        type: "queue",
        kind: "queue",
        name: `Queue: ${nextColumn.name}`,
        position: column.position + 0.5,
        previousProcessingColumnId: column.id,
        nextProcessingColumnId: nextColumn.id,
        tasks: []
      });
    }
  });

  return columns;
}

function boardIdOrThrow(connection) {
  const board = connection.prepare("SELECT id FROM boards ORDER BY created_at LIMIT 1").get();
  if (!board) {
    throw new Error("No board exists.");
  }
  return board.id;
}

export function getBoardView() {
  const connection = db();
  const board = connection.prepare("SELECT * FROM boards ORDER BY created_at LIMIT 1").get();
  const users = connection
    .prepare("SELECT id, display_name AS displayName FROM users WHERE archived_at IS NULL ORDER BY display_name")
    .all();
  const processingColumns = connection
    .prepare("SELECT * FROM processing_columns WHERE board_id = ? ORDER BY position")
    .all(board.id);
  const columns = deriveColumns(processingColumns, board.id);
  const tasks = connection
    .prepare(
      `SELECT tasks.*, users.display_name AS assigneeName
       FROM tasks
       LEFT JOIN users ON users.id = tasks.assignee_user_id
       WHERE tasks.board_id = ? AND tasks.archived_at IS NULL
       ORDER BY tasks.created_at`
    )
    .all(board.id);

  const byColumn = new Map(columns.map((column) => [column.id, column]));
  tasks.forEach((task) => {
    const column = byColumn.get(task.current_column_id);
    if (column) {
      column.tasks.push({
        id: task.id,
        identifier: task.identifier,
        title: task.title,
        body: task.body,
        currentColumnId: task.current_column_id,
        currentColumnType: task.current_column_type,
        assigneeName: task.assigneeName
      });
    }
  });

  const agentRuns = connection
    .prepare(
      `SELECT agent_runs.*, tasks.identifier AS taskIdentifier, processing_columns.name AS columnName
       FROM agent_runs
       JOIN tasks ON tasks.id = agent_runs.task_id
       JOIN processing_columns ON processing_columns.id = agent_runs.processing_column_id
       ORDER BY agent_runs.created_at DESC`
    )
    .all()
    .map((run) => ({
      id: run.id,
      taskIdentifier: run.taskIdentifier,
      columnName: run.columnName,
      status: run.status,
      resultSummary: run.result_summary,
      failureMessage: run.failure_message
    }));

  const flowHistory = connection
    .prepare(
      `SELECT flow_history.*, tasks.identifier AS taskIdentifier
       FROM flow_history
       JOIN tasks ON tasks.id = flow_history.task_id
       ORDER BY flow_history.entered_at DESC
       LIMIT 20`
    )
    .all()
    .map((entry) => ({
      id: entry.id,
      taskIdentifier: entry.taskIdentifier,
      columnName: columnNameForId(columns, entry.column_id),
      enteredAt: entry.entered_at,
      exitedAt: entry.exited_at
    }));

  return {
    board: {
      id: board.id,
      name: board.name,
      description: board.description
    },
    users,
    columns,
    agentRuns,
    flowHistory,
    metrics: {
      taskCount: tasks.length,
      processingColumnCount: processingColumns.length,
      queueCount: columns.filter((column) => column.type === "queue").length,
      agentRunCount: agentRuns.length
    }
  };
}

function columnNameForId(columns, columnId) {
  return columns.find((column) => column.id === columnId)?.name || columnId;
}

export function createTask({ title, body, assigneeUserId }) {
  const connection = db();
  const boardId = boardIdOrThrow(connection);
  const board = connection.prepare("SELECT * FROM boards WHERE id = ?").get(boardId);
  const firstColumn = connection
    .prepare("SELECT * FROM processing_columns WHERE board_id = ? ORDER BY position LIMIT 1")
    .get(boardId);
  const creator = connection.prepare("SELECT id FROM users ORDER BY created_at LIMIT 1").get();
  const createdAt = now();
  const taskId = id();
  const identifier = `${board.identifier_prefix}-${board.next_task_number}`;

  connection.prepare("UPDATE boards SET next_task_number = ?, updated_at = ? WHERE id = ?").run(
    board.next_task_number + 1,
    createdAt,
    boardId
  );

  connection.prepare(
    `INSERT INTO tasks
      (id, identifier, board_id, title, body, current_column_id, current_column_type,
       assignee_user_id, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?)`
  ).run(
    taskId,
    identifier,
    boardId,
    title,
    body,
    firstColumn.id,
    assigneeUserId,
    creator.id,
    createdAt,
    createdAt
  );

  connection.prepare(
    `INSERT INTO flow_history
      (id, task_id, column_id, column_type, entered_at, entered_by_type, entered_by_user_id)
      VALUES (?, ?, ?, 'processing', ?, 'user', ?)`
  ).run(id(), taskId, firstColumn.id, createdAt, creator.id);

  insertAudit(connection, {
    taskId,
    actorType: "user",
    actorUserId: creator.id,
    eventType: "task.created",
    payload: { identifier, title }
  });
}

export function moveTask({
  taskId,
  destinationColumnId,
  destinationColumnType,
  actorType,
  actorUserId = null,
  agentRunId = null
}) {
  const connection = db();
  const task = connection.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) {
    return;
  }

  if (
    task.current_column_id === destinationColumnId &&
    task.current_column_type === destinationColumnType
  ) {
    return;
  }

  const movedAt = now();
  connection.prepare(
    "UPDATE flow_history SET exited_at = ? WHERE task_id = ? AND exited_at IS NULL"
  ).run(movedAt, taskId);
  connection.prepare(
    `UPDATE tasks
     SET current_column_id = ?, current_column_type = ?, updated_at = ?
     WHERE id = ?`
  ).run(destinationColumnId, destinationColumnType, movedAt, taskId);
  connection.prepare(
    `INSERT INTO flow_history
      (id, task_id, column_id, column_type, entered_at, entered_by_type,
       entered_by_user_id, entered_by_agent_run_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id(),
    taskId,
    destinationColumnId,
    destinationColumnType,
    movedAt,
    actorType,
    actorUserId,
    agentRunId
  );

  insertAudit(connection, {
    taskId,
    actorType,
    actorUserId,
    agentRunId,
    eventType: "task.moved",
    payload: {
      from: {
        columnId: task.current_column_id,
        columnType: task.current_column_type
      },
      to: {
        columnId: destinationColumnId,
        columnType: destinationColumnType
      }
    }
  });
}

export function addComment({ taskId, body, authorType, agentRunId = null }) {
  const connection = db();
  const author = connection.prepare("SELECT id FROM users ORDER BY created_at LIMIT 1").get();
  const createdAt = now();

  connection.prepare(
    `INSERT INTO comments
      (id, task_id, author_type, author_user_id, agent_run_id, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id(),
    taskId,
    authorType,
    authorType === "user" ? author.id : null,
    agentRunId,
    body,
    createdAt,
    createdAt
  );

  insertAudit(connection, {
    taskId,
    actorType: authorType,
    actorUserId: authorType === "user" ? author.id : null,
    agentRunId,
    eventType: "comment.created",
    payload: { body }
  });
}

export function runAgentForTaskIfNeeded(taskId) {
  const connection = db();
  const task = connection.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task || task.current_column_type !== "processing") {
    return;
  }

  const column = connection.prepare("SELECT * FROM processing_columns WHERE id = ?").get(
    task.current_column_id
  );
  if (!column || column.kind !== "agent") {
    return;
  }

  const existingOpenRun = connection
    .prepare(
      `SELECT id FROM agent_runs
       WHERE task_id = ? AND processing_column_id = ? AND status IN ('queued', 'running')
       LIMIT 1`
    )
    .get(taskId, column.id);
  if (existingOpenRun) {
    return;
  }

  const board = connection.prepare("SELECT * FROM boards WHERE id = ?").get(task.board_id);
  const profile = connection
    .prepare("SELECT * FROM agent_profiles WHERE processing_column_id = ?")
    .get(column.id);
  const comments = connection
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at")
    .all(taskId);
  const priorRuns = connection
    .prepare("SELECT * FROM agent_runs WHERE task_id = ? ORDER BY created_at")
    .all(taskId);
  const contextPayload = buildContextPayload({
    task,
    board,
    column,
    profile,
    comments,
    priorRuns
  });
  const runId = id();
  const createdAt = now();

  connection.prepare(
    `INSERT INTO agent_runs
      (id, task_id, board_id, processing_column_id, status, harness, model,
       profile_snapshot, context_snapshot, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`
  ).run(
    runId,
    taskId,
    task.board_id,
    column.id,
    profile.harness,
    profile.model,
    JSON.stringify(profile),
    JSON.stringify(contextPayload),
    createdAt,
    createdAt
  );

  insertAudit(connection, {
    taskId,
    actorType: "system",
    agentRunId: runId,
    eventType: "agent_run.created",
    payload: { columnId: column.id, harness: profile.harness }
  });

  const startedAt = now();
  connection.prepare(
    "UPDATE agent_runs SET status = 'running', started_at = ?, updated_at = ? WHERE id = ?"
  ).run(startedAt, startedAt, runId);

  const result = runLocalCodex({ profile, contextPayload });
  const endedAt = now();

  connection.prepare(
    `UPDATE agent_runs
     SET status = ?, ended_at = ?, exit_code = ?, stdout = ?, stderr = ?,
         transcript = ?, result_summary = ?, failure_message = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    result.status,
    endedAt,
    result.exitCode,
    result.stdout,
    result.stderr,
    result.transcript,
    result.resultSummary,
    result.failureMessage,
    endedAt,
    runId
  );

  addComment({
    taskId,
    body: result.resultSummary || result.failureMessage || "Agent run finished.",
    authorType: "agent",
    agentRunId: runId
  });

  insertAudit(connection, {
    taskId,
    actorType: "agent",
    agentRunId: runId,
    eventType: `agent_run.${result.status}`,
    payload: {
      exitCode: result.exitCode,
      failureMessage: result.failureMessage
    }
  });
}

function insertAudit(
  connection,
  { taskId = null, actorType, actorUserId = null, agentRunId = null, eventType, payload }
) {
  connection.prepare(
    `INSERT INTO audit_events
      (id, task_id, actor_type, actor_user_id, agent_run_id, event_type, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id(),
    taskId,
    actorType,
    actorUserId,
    agentRunId,
    eventType,
    JSON.stringify(payload),
    now()
  );
}

