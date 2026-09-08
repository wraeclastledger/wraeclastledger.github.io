import { useEffect, useEffectEvent, useState } from 'react';
import { X } from 'lucide-react';

/** Brief feedback expires; selectable copy text keeps its own explicit dismissal. */
export function CopyNotice({ message, persistent, onDismiss }: {
  message: string;
  persistent: boolean;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    if (persistent || hovered || focused) return;
    const timer = setTimeout(() => dismiss(), message === 'Copied to clipboard.' ? 5000 : 10000);
    return () => clearTimeout(timer);
  }, [message, persistent, hovered, focused]);
  // Hover/focus only pause expiry; the output remains informational, with a real dismiss button.
  // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  return <output className="toast" aria-live="polite"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <span>{message}</span>
    <button aria-label="Dismiss copy notice" onClick={onDismiss}><X size={16} /></button>
  </output>;
}
