import { cn } from "@/lib/utils";

/** Jabuti visto de cima, o mesmo desenho de app/icon.svg, nas cores do tema. */
export function LogoJabuti({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <clipPath id="logo-jabuti-casco">
          <ellipse cx="32" cy="34" rx="15" ry="17" />
        </clipPath>
      </defs>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <g className="fill-primary-foreground">
        <ellipse cx="32" cy="11" rx="5" ry="6" />
        <ellipse cx="16" cy="21" rx="6" ry="4.5" transform="rotate(-35 16 21)" />
        <ellipse cx="48" cy="21" rx="6" ry="4.5" transform="rotate(35 48 21)" />
        <ellipse cx="16" cy="47" rx="6" ry="4.5" transform="rotate(35 16 47)" />
        <ellipse cx="48" cy="47" rx="6" ry="4.5" transform="rotate(-35 48 47)" />
        <path d="M29 50 L32 57 L35 50 Z" />
        <ellipse cx="32" cy="34" rx="15" ry="17" />
      </g>
      <g
        clipPath="url(#logo-jabuti-casco)"
        fill="none"
        strokeWidth="2.2"
        strokeLinejoin="round"
        className="stroke-primary"
      >
        <path d="M32 27 L38 30.5 L38 37.5 L32 41 L26 37.5 L26 30.5 Z" />
        <path d="M32 27 V15 M38 30.5 L48 26 M38 37.5 L48 42 M32 41 V53 M26 37.5 L16 42 M26 30.5 L16 26" />
      </g>
      <ellipse cx="32" cy="34" rx="15" ry="17" fill="none" strokeWidth="2.5" className="stroke-primary" />
    </svg>
  );
}
