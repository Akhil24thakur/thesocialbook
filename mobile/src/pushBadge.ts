import { useSyncExternalStore } from "react";

let pending = false;
const listeners = new Set<() => void>();

export function setPendingPush(v: boolean) {
  if (pending === v) return;
  pending = v;
  listeners.forEach((l) => l());
}

export function usePendingPush() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => pending
  );
}
