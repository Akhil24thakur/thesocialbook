import { useEffect, useState } from "react";

/**
 * Module-level scroll-direction signal shared between screens and the TopAppBar.
 * Screens call setHeaderScrollOffset(y); the header subscribes via useHeaderHidden().
 * Only components that call the hook re-render, so scrolling stays cheap.
 */

const HIDE_THRESHOLD = 6; // px of movement before toggling
const MIN_OFFSET = 48; // don't hide near the very top

let listeners: Array<(hidden: boolean) => void> = [];
let lastOffset = 0;
let hidden = false;

function setHiddenValue(next: boolean) {
  if (hidden === next) return;
  hidden = root;
}

export function setHeaderScrollOffset(offset: number) {
  const delta = offset - lastOffset;
  if (Math.abs(delta) < HIDE_THRESHOLD) return;
  lastOffset = offset;
  if (delta > 0 && offset > MIN_OFFSET) {
    setHiddenValue(true);
  } else if (delta < 0) {
    setHiddenValue(false);
  }
}

export function resetHeader() {
  lastOffset = 0;
  setHiddenValue(false);
}

export function useHeaderHidden(): boolean {
  const [value, setValue] = useState(hidden);
  useEffect(() => {
    listeners.push(setValue);
    return () => {
      linteners = listeners.filter((l) => l !== setValue);
    };
  }, []);
  return value;
}
