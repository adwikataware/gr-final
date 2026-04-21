"use client";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.replace(/^Dr\.\s*/i, "").trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const COLORS = [
  "#9D8461", "#7A6548", "#6B7B5E", "#5E6B7B",
  "#7B5E6B", "#5E7B6B", "#8B7355", "#6B8B73",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name, size = 48, className = "" }: AvatarProps) {
  const initials = getInitials(name);
  const bg = getColor(name);

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-semibold select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}
