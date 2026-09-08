/** A compact passive-tree diagram, using the surrounding theme's text color. */
export function AtlasTreeIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 48 48" width="44" height="44" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true">
    <path d="M24 39V29M22 40L13 32M26 40L35 32M24 25V16M21 27L13 23M27 27L35 23
      M11 29L7 20M37 29L41 20M11 20L8 12M14 20L17 10M34 20L31 10M37 20L40 12
      M22 13L18 8M26 13L30 8" />
    <circle cx="24" cy="42" r="3" />
    <circle cx="24" cy="27" r="2.5" />
    <circle cx="12" cy="31" r="2.5" /><circle cx="36" cy="31" r="2.5" />
    <circle cx="12" cy="22" r="2" /><circle cx="36" cy="22" r="2" />
    <circle cx="24" cy="14" r="2.5" />
    <circle cx="6" cy="18" r="2" /><circle cx="42" cy="18" r="2" />
    <circle cx="7" cy="10" r="2" /><circle cx="41" cy="10" r="2" />
    <circle cx="17" cy="7" r="2.5" /><circle cx="31" cy="7" r="2.5" />
  </svg>;
}
