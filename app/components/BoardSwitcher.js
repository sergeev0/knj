"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function BoardSwitcher({ boards, selectedBoardId }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const switcherRef = useRef(null);
  const selectedBoard =
    boards.find((board) => board.id === selectedBoardId) || boards[0];

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!switcherRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function changeBoard(boardId) {
    const params = new URLSearchParams(searchParams);

    params.set("board", boardId);
    params.delete("task");
    params.delete("create");
    setIsOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="board-switcher" ref={switcherRef}>
      <button
        type="button"
        className="board-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedBoard?.name}
        <span aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="board-switcher-menu" role="listbox">
          {boards.map((board) => (
            <button
              type="button"
              className={board.id === selectedBoardId ? "selected" : ""}
              key={board.id}
              role="option"
              aria-selected={board.id === selectedBoardId}
              onClick={() => changeBoard(board.id)}
            >
              {board.name}
            </button>
          ))}
        </div>
      ) : null}
      <select
        className="board-switcher-native"
        value={selectedBoardId}
        onChange={(event) => changeBoard(event.target.value)}
        aria-label="Board"
      >
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
    </div>
  );
}
