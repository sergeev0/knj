import { execFileSync } from "node:child_process";

export function buildContextPayload({ task, board, column, profile, comments, priorRuns }) {
  return {
    task: {
      identifier: task.identifier,
      title: task.title,
      body: task.body
    },
    board: {
      name: board.name
    },
    column: {
      name: column.name,
      completionCriteria: profile.completion_criteria
    },
    comments: comments.map((comment) => ({
      authorType: comment.author_type,
      body: comment.body,
      createdAt: comment.created_at
    })),
    priorRuns: priorRuns.map((run) => ({
      status: run.status,
      summary: run.result_summary,
      endedAt: run.ended_at
    }))
  };
}

export function runLocalCodex({ profile, contextPayload }) {
  if (process.env.KNJ_ENABLE_AGENT_RUNS !== "1") {
    return {
      status: "failed",
      exitCode: null,
      stdout: "",
      stderr: "",
      transcript: "",
      resultSummary:
        "Agent execution is wired but disabled. Set KNJ_ENABLE_AGENT_RUNS=1 to allow local Codex CLI runs.",
      failureMessage: "Local agent execution disabled by environment."
    };
  }

  const prompt = [
    profile.prompt,
    "",
    "KNJ task context:",
    JSON.stringify(contextPayload, null, 2)
  ].join("\n");
  const harness = profile.harness || "codex-cli";
  const command = harness === "codex-cli" ? "codex" : harness;
  const args =
    harness === "codex-cli" || harness === "codex"
      ? ["exec", "--model", profile.model, prompt]
      : [];
  const input =
    harness === "codex-cli" || harness === "codex" ? undefined : prompt;

  try {
    const stdout = execFileSync(
      command,
      args,
      {
        cwd: profile.working_directory || process.cwd(),
        env: {
          ...process.env,
          ...JSON.parse(profile.environment || "{}")
        },
        encoding: "utf8",
        input,
        maxBuffer: 1024 * 1024 * 8,
        timeout: 1000 * 60 * 10
      }
    );

    return {
      status: "succeeded",
      exitCode: 0,
      stdout,
      stderr: "",
      transcript: stdout,
      resultSummary: stdout.trim().slice(0, 1000) || `${harness} run completed.`,
      failureMessage: null
    };
  } catch (error) {
    return {
      status: "failed",
      exitCode: typeof error.status === "number" ? error.status : null,
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || error.message,
      transcript: [error.stdout?.toString(), error.stderr?.toString()]
        .filter(Boolean)
        .join("\n"),
      resultSummary: `${harness} run failed.`,
      failureMessage: error.message
    };
  }
}
