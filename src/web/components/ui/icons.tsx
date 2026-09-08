interface IconProps {
  className?: string;
}

function Base({
  className = "size-4",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function LibraryIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m16 6 4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </Base>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Base>
  );
}

export function ActivityIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Base>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </Base>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Base>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Base>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Base>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Base>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </Base>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 13v4" />
      <path d="M12 9v8" />
      <path d="M17 5v12" />
    </Base>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Base>
  );
}

export function TerminalIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </Base>
  );
}

export function LayersIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </Base>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Base>
  );
}

export function CodeIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Base>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Base>
  );
}

export function ChevronsLeftIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </Base>
  );
}

export function ChevronsRightIcon({ className }: IconProps) {
  return (
    <Base className={className}>
      <path d="m13 17 5-5-5-5" />
      <path d="m6 17 5-5-5-5" />
    </Base>
  );
}
