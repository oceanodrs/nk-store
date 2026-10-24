"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false no servidor e na 1ª renderização; true depois de hidratar no navegador. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
