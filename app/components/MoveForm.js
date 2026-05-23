"use client";

import { useState } from "react";

export default function MoveForm({ action, task, columns }) {
  const initialValue = `${task.currentColumnType}:${task.currentColumnId}`;
  const [destination, setDestination] = useState(initialValue);
  const splitAt = destination.indexOf(":");
  const destinationColumnType = destination.slice(0, splitAt);
  const destinationColumnId = destination.slice(splitAt + 1);

  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={task.id} />
      <input
        type="hidden"
        name="destinationColumnType"
        value={destinationColumnType}
      />
      <input type="hidden" name="destinationColumnId" value={destinationColumnId} />
      <label>
        Move to
        <select
          name="destination"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        >
          {columns.map((column) => (
            <option key={column.id} value={`${column.type}:${column.id}`}>
              {column.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Move task</button>
    </form>
  );
}

