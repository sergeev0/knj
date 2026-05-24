import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

function withBoard(path, boardId) {
  return boardId ? `${path}?board=${encodeURIComponent(boardId)}` : path;
}

export default function Topbar({ active = "board", boardId }) {
  const boardHref = withBoard("/", boardId);
  const statsHref = withBoard("/stats", boardId);
  const configHref = withBoard("/config", boardId);

  return (
    <header className="topbar">
      <Link className="brand" href={boardHref}>
        <span className="brand-mark">K</span>
        <span>
          <strong>KNJ</strong>
          <small>is Not Jira</small>
        </span>
      </Link>

      <nav className="topnav" aria-label="Primary navigation">
        <Link className={active === "board" ? "active" : ""} href={boardHref}>
          Board
        </Link>
        <Link className={active === "stats" ? "active" : ""} href={statsHref}>
          Stats
        </Link>
        <Link className={active === "config" ? "active" : ""} href={configHref}>
          Config
        </Link>
      </nav>

      <div className="topbar-actions">
        <ThemeToggle />
      </div>
    </header>
  );
}
