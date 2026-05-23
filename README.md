# KNJ

KNJ, pronounced "KEN-JEE", means "KNJ is Not Jira".

KNJ is a small-team, local-first Kanban system designed for the era of agents. It keeps the core workflow deliberately simple: boards, tasks, processing columns, and automatically managed queues. Unlike traditional project trackers, KNJ treats agent execution as a first-class part of the workflow, with each agent step running from clean task context and producing an auditable record.

The first milestone is a product and architecture specification, not an application scaffold. The intended v1 implementation stack is Next.js with SQLite, named local users without authentication, automatic queue columns, and Codex CLI as the first supported local agent harness.

See [SPEC.md](./SPEC.md) for the v1 product and architecture spec.
