"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  DEFAULT_VIEW,
  PREFERENCES_EVENT,
  readTheme,
  readView,
  type Theme,
  type View,
} from "@/lib/preferences";

function subscribe(cb: () => void) {
  window.addEventListener(PREFERENCES_EVENT, cb);
  return () => window.removeEventListener(PREFERENCES_EVENT, cb);
}

/** Client hook. Server snapshot is the default so hydration matches; the real value arrives after mount. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
}
export function useView(): View {
  return useSyncExternalStore(subscribe, readView, () => DEFAULT_VIEW);
}
