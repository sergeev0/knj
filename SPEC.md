# KNJ Product And Architecture Spec

KNJ, pronounced "KEN-JEE", means "KNJ is Not Jira". KNJ is a lightweight Kanban system for small teams where both humans and agents can own workflow steps.

## 1. V1 Goals

KNJ v1 is a local-first small-team application. It should make it easy to define a board, move tasks through a workflow, and run configured agent steps automatically when a task reaches an agent-owned processing column.

The implementation target after this spec is:

- Next.js application.
- SQLite database.
- Named local users for assignment, ownership, comments, and audit history.
- No authentication, sessions, passwords, OAuth, or hosted multi-tenancy.
- Codex CLI as the first supported local agent harness.
- A runner abstraction that can later support cloud-hosted clean environments.

V1 must prioritize a working workflow engine and trustworthy task history over broad project-management features.

## 2. Non-Goals

The following are out of scope for v1:

- Hosted SaaS or multi-tenant organizations.
- Login, authorization, SSO, OAuth, or password management.
- GitHub, GitLab, commit, or pull request integration.
- Custom dashboards beyond storing the data needed to build flow dashboards later.
- Cloud VM provisioning for agent runs.
- Multiple agent harnesses.
- Fine-grained role-based permissions.
- Sprint planning, story points, epics, roadmaps, or Jira-style project hierarchy.

The task model should leave room for future linked development artifacts, but no commit or pull request linking is implemented in v1.

## 3. Core Concepts

### Workspace

A workspace is the local installation's top-level container. V1 assumes one workspace.

It contains:

- users
- boards
- tasks
- comments
- agent run records
- audit and flow history

### User

A user is a named local identity, not an authenticated account.

Required fields:

- `id`
- `displayName`
- `createdAt`
- `archivedAt`, nullable

Users can be assigned tasks, write comments, own human processing steps, and appear in audit records.

### Board

A board defines a workflow.

Required fields:

- `id`
- `name`
- `description`, nullable
- `createdAt`
- `updatedAt`

A board has an ordered list of user-defined processing columns. KNJ derives managed queue columns between those processing columns.

### Processing Column

A processing column represents actual work. It is user-defined and ordered within a board.

Required fields:

- `id`
- `boardId`
- `name`
- `position`
- `kind`: `human` or `agent`
- `wipLimit`, nullable
- `createdAt`
- `updatedAt`

Human processing columns represent work performed by people. Agent processing columns represent work performed by the configured agent runner.

Agent processing columns also require an agent execution profile.

### Queue Column

A queue column is a system-managed waiting state between two adjacent processing columns.

Queue columns are:

- visible on the board
- generated automatically
- not directly created or deleted by users
- used for flow statistics
- named by convention as `Queue: <next processing column name>` unless the UI later adds display aliases

For processing columns `Backlog`, `Build`, and `Review`, the rendered board columns are:

1. `Backlog`
2. `Queue: Build`
3. `Build`
4. `Queue: Review`
5. `Review`

There is no queue before the first processing column and no queue after the last processing column in v1.

When users reorder, add, or remove processing columns, KNJ recalculates managed queue columns while preserving task history for prior column visits.

### Task

A task is the primary work item.

Required fields:

- `id`
- `identifier`: stable human-readable key, for example `KNJ-42`
- `boardId`
- `title`
- `body`
- `currentColumnId`
- `currentColumnType`: `processing` or `queue`
- `assigneeUserId`, nullable
- `createdByUserId`
- `createdAt`
- `updatedAt`
- `archivedAt`, nullable

Tasks must preserve their full lifecycle history. Moving a task changes its current column and appends or closes flow history records.

### Comment

Comments support human collaboration and agent output summaries.

Required fields:

- `id`
- `taskId`
- `authorType`: `user`, `agent`, or `system`
- `authorUserId`, nullable
- `agentRunId`, nullable
- `body`
- `createdAt`
- `updatedAt`

Agent-authored comments should usually summarize an agent run. Full logs belong in agent run records.

## 4. Flow History

KNJ must store exhaustive timing data so future dashboards can compute lead time, cycle time, queue time, processing time, throughput, and bottlenecks.

Each task movement is represented by task column visits.

Required fields:

- `id`
- `taskId`
- `columnId`
- `columnType`: `processing` or `queue`
- `enteredAt`
- `exitedAt`, nullable while current
- `enteredByType`: `user`, `agent`, or `system`
- `enteredByUserId`, nullable
- `enteredByAgentRunId`, nullable

Rules:

- A task has exactly one open flow history record at a time.
- Moving a task closes the current record by setting `exitedAt`.
- Moving a task opens a new record for the destination column.
- Flow records are append-only after creation except for setting `exitedAt`.
- Deleting or renaming a column must not rewrite historical flow records.

## 5. Board Movement Rules

The board renders both processing and queue columns in derived order.

Users may move tasks manually to any visible column unless a later v1 UI chooses to constrain moves for simplicity. Every move must still produce valid flow history.

Recommended default workflow:

- A human completes work in a processing column by moving the task into the next queue.
- A human pulls work from a queue into a human processing column.
- An agent run starts automatically when a task enters an agent processing column.
- When an agent run completes successfully, it may move the task to the next queue if its column completion criteria are met.
- If an agent run fails, the task remains in the agent processing column with a failed run record and a visible comment or status indicator.

Automatic queue insertion is deterministic:

- Sort processing columns by `position`.
- Render each processing column.
- After every processing column except the last, render the managed queue for the next processing column.
- Queue identity is derived from `boardId`, previous processing column, and next processing column so history can distinguish queues over time.

## 6. Agent Execution Profiles

Each agent processing column has one execution profile.

Required fields:

- `id`
- `processingColumnId`
- `harness`: `codex-cli`
- `model`
- `prompt`
- `allowedTools`
- `contextRules`
- `workingDirectory`, nullable
- `environment`
- `completionCriteria`
- `createdAt`
- `updatedAt`

Recommended structured fields:

- `allowedTools`: JSON array of tool/capability names.
- `contextRules`: JSON object describing which task fields, comments, prior summaries, and board metadata are passed to the agent.
- `environment`: JSON object for environment variables and local execution settings.
- `completionCriteria`: plain text or JSON describing what counts as done.

The execution profile must be snapshotted into each agent run before execution starts. Later profile edits must not change historical run records.

## 7. Local Codex CLI Runner

V1 supports Codex CLI as the first-class local harness.

When a task enters an agent processing column:

1. KNJ creates an agent run record with status `queued`.
2. KNJ snapshots the agent execution profile.
3. KNJ assembles clean run context from the task, board, column, comments, and prior agent run summaries or log references.
4. KNJ starts the Codex CLI runner locally.
5. KNJ streams or captures runner output.
6. KNJ stores the final transcript, status, timings, and summary.
7. KNJ applies any allowed task updates produced by the run.

The runner must not rely on hidden conversational context from previous runs. Every run receives explicit context assembled by KNJ.

The exact CLI invocation can be finalized during implementation, but the runner interface must accept:

- execution profile snapshot
- task snapshot
- assembled context payload
- working directory
- environment values

The runner interface must return:

- status: `succeeded`, `failed`, or `cancelled`
- exit code, nullable
- started and ended timestamps
- stdout/stderr or equivalent transcript
- result summary
- proposed task updates

## 8. Agent Run Records

Agent runs are immutable execution audit records except for status transitions and final output fields.

Required fields:

- `id`
- `taskId`
- `boardId`
- `processingColumnId`
- `status`: `queued`, `running`, `succeeded`, `failed`, or `cancelled`
- `harness`
- `model`
- `profileSnapshot`
- `contextSnapshot`
- `startedAt`, nullable
- `endedAt`, nullable
- `exitCode`, nullable
- `stdout`, nullable
- `stderr`, nullable
- `transcript`, nullable
- `resultSummary`, nullable
- `failureMessage`, nullable
- `createdAt`
- `updatedAt`

If an agent changes a task, KNJ must record those changes as audit events linked to the agent run.

Large logs may initially be stored in SQLite text fields for simplicity. The schema should allow moving logs to files or object storage later by adding log references.

## 9. Audit Events

Audit events record important changes.

Required fields:

- `id`
- `taskId`, nullable
- `actorType`: `user`, `agent`, or `system`
- `actorUserId`, nullable
- `agentRunId`, nullable
- `eventType`
- `payload`
- `createdAt`

Events should be emitted for:

- task creation
- task title/body changes
- assignment changes
- task movement
- comment creation
- agent run creation, start, completion, failure, and cancellation
- agent-applied task updates

## 10. Future Cloud Runner Extension

The v1 local runner must be implemented behind a runner boundary so future cloud execution can reuse the same task and board semantics.

Future cloud runners are expected to:

- provision an ephemeral VM or container per agent run
- install or attach the selected harness and tools
- receive the same clean context payload
- stream logs back to KNJ
- persist final output and artifacts
- tear down the environment when the run completes

The runner abstraction should avoid leaking local-only assumptions into the board model. Board columns should configure what work is done; runner providers should decide where and how it runs.

## 11. Suggested V1 Screens

The later app should include these minimum screens:

- Board list.
- Board view with processing and managed queue columns.
- Task detail with description, comments, flow history, and agent runs.
- Column settings for human or agent processing type.
- Agent profile editor for Codex CLI configuration.
- Local users management.

The first screen of the app should be the usable board experience, not a marketing page.

## 12. Acceptance Criteria

The v1 implementation based on this spec is acceptable when:

- A small local team can create named users, boards, processing columns, and tasks.
- KNJ renders automatic queue columns between processing columns.
- Tasks can be moved across visible board columns.
- Every task movement creates complete flow history with enter and exit timestamps.
- Human and agent processing columns are clearly distinguished.
- Moving a task into an agent processing column automatically starts a Codex CLI run.
- Each agent run stores its profile snapshot, context snapshot, timings, logs, result summary, and final status.
- Failed agent runs remain visible and auditable on the task.
- The app stores enough structured data to build flow dashboards later.

## 13. Implementation Defaults

Use these defaults unless a later decision explicitly changes them:

- Stack: Next.js + SQLite.
- ORM/schema layer: choose a typed SQLite-friendly option during implementation, such as Drizzle or Prisma.
- Deployment mode: local app.
- Identity: named local users with no auth.
- First harness: Codex CLI.
- Agent trigger: automatic on entry into an agent processing column.
- Queue behavior: automatic, visible, system-managed queues between processing columns.
- Git integration: deferred.
