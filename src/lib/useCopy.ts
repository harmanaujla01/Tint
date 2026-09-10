import { useCallback, useEffect, useRef, useState } from "react";

/** Copy to clipboard with a self-clearing confirmation. */
export function useCopy(resetAfter = 1400) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key = text) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(null), resetAfter);
      } catch {
        // Clipboard is permission-gated and blocked outright in some embeds.
        // Failing silently would look like a broken button, so say so.
        setCopied("__error__");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(null), resetAfter);
      }
    },
    [resetAfter],
  );

  return { copied, copy };
}
