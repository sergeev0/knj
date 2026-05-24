import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function Topbar({ active = "board" }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">K</span>
        <span>
          <strong>KNJ</strong>
          <small>is Not Jira</small>
        </span>
      </Link>

      <nav className="topnav" aria-label="Primary navigation">
        <Link className={active === "board" ? "active" : ""} href="/">
          Board
        </Link>
        <Link className={active === "stats" ? "active" : ""} href="/stats">
          Stats
        </Link>
      </nav>

      <div className="topbar-actions">
        <Link className="button secondary" href="/?create=task">
          New task
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

