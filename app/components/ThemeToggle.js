"use client";

import { useEffect, useState } from "react";

const storageKey = "knj-theme";

function systemTheme() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function storedTheme() {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [hasStoredPreference, setHasStoredPreference] = useState(false);

  useEffect(() => {
    const preference = storedTheme();
    const initialTheme = preference || systemTheme();

    setTheme(initialTheme);
    setHasStoredPreference(Boolean(preference));
    applyTheme(initialTheme);

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) {
      return undefined;
    }

    const onChange = (event) => {
      if (storedTheme()) {
        return;
      }

      const nextTheme = event.matches ? "dark" : "light";
      setTheme(nextTheme);
      setHasStoredPreference(false);
      applyTheme(nextTheme);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    try {
      window.localStorage.setItem(storageKey, nextTheme);
    } catch {
      // Theme still applies for the current page even if storage is unavailable.
    }

    setTheme(nextTheme);
    setHasStoredPreference(true);
    applyTheme(nextTheme);
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      onClick={toggleTheme}
    >
      <span className="theme-icon" aria-hidden="true" />
    </button>
  );
}
