"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  PREFERENCES_EVENT,
  readTheme,
  type Theme,
} from "@/lib/preferences";

function subscribe(cb: () => void) {
  window.addEventListener(PREFERENCES_EVENT, cb);
  return () => window.removeEventListener(PREFERENCES_EVENT, cb);
}

/** Client hook. Server snapshot is the default so hydration matches; the real value arrives after mount. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
}
