import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Lightweight scroll-direction signal shared between screens and the TopAppBar.
 * Screens push scroll offsets; only the header subscribes to `hidden`, so the
 * rest of the app does not re-render on every scroll frame.
 */
export type HeaderVisibility = {
  hidden: boolean;
  setScrollOffset: (offset: number) => void;
  reset: () => void;
};

const HIDE_THRESHOLD = 6; // px of movement before toggling
const MIN_OFFSET = 48; // don't hide near the very top

const HeaderVisibilityContext = createContext<HeaderVisibility>({
  hidden: false,
  setScrollOffset: () => {},
  reset: () => {},
});

export function HeaderVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastOffsetRef = useRef(0);

  const setScrollOffset = useCallback((offset: number) => {
    const last = lastOffsetRef.current;
    const delta = offset - last;
    if (Math.abs(delta) < HIDE_THRESHOLD) return;
    lastOffsetRef.current = offset;
    if (delta > 0 && offset > MIN_OFFSET) {
      setHidden((prev) => (prev ? prev : true));
    } else if (delta < 0) {
      setHidden((prev) => (prev ? false : prev));
    }
  }, []);

  const reset = useCallback(() => {
    lastOffsetRef.current = 0;
    setHidden(false);
  }, []);

  const value = useMemo(() => ({ hidden, setScrollOffset, reset }), [hidden, setScrollOffset, reset]);
  return (
    <HeaderVisibilityContext.Provider value={value}>{children}</HeaderVisibilityContext.Provider>
  );
}

export function useHeaderVisibility() {
  return useContext(HeaderVisibilityContext);
}

/** For consumers that only need `hidden` (e.g. TopAppBar). */
export function useHeaderHidden(): boolean {
  return useContext(HeaderVisibilityContext).hidden;
}
