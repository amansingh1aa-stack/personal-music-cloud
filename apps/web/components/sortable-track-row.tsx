"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Music4 } from "lucide-react";
import { formatDuration, type Track } from "../lib/types";

type Props = {
  track: Track;
  active?: boolean;
  onClick: () => void;
};

export function SortableTrackRow({ track, active, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active ? "border-accent/70 bg-accent/10" : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/8"
      }`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span
        {...attributes}
        {...listeners}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-text">{track.title}</span>
        <span className="block truncate text-xs text-muted">{track.artist} {track.album ? `• ${track.album}` : ""}</span>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted">
        <Music4 className="h-4 w-4" />
        {formatDuration(track.duration)}
      </span>
    </button>
  );
}