"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function BoardSwitcher({ boards, selectedBoardId }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeBoard(event) {
    const params = new URLSearchParams(searchParams);

    params.set("board", event.target.value);
    params.delete("task");
    params.delete("create");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="board-switcher">
      <span className="sr-only">Board</span>
      <select value={selectedBoardId} onChange={changeBoard}>
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
    </label>
  );
}
