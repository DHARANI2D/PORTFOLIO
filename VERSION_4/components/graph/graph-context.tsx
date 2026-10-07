"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { GraphNodeId } from "@/content/schema";
import { isGraphNodeId } from "@/components/graph/graph-data";

/**
 * Shared "which parts of the security graph are lit" state.
 *
 * Sections announce the domains they are about (GraphActivator while they are on screen, or
 * useGraphActivation for the lifetime of a component). Registrations are reference-counted per
 * node, so two overlapping sections that both light `ai` keep it lit until both are gone.
 * The store lives outside React state and is read with useSyncExternalStore; only SecurityGraph
 * subscribes, so scrolling past a section re-renders one small SVG and nothing else.
 */

type Listener = () => void;

type GraphStore = {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => ReadonlySet<GraphNodeId>;
  /** Lights `nodes`. Returns an idempotent release function. */
  register: (nodes: readonly GraphNodeId[]) => () => void;
};

const EMPTY: ReadonlySet<GraphNodeId> = new Set();
const getEmpty = () => EMPTY;
const subscribeNever = () => () => {};

function createGraphStore(): GraphStore {
  const counts = new Map<GraphNodeId, number>();
  const listeners = new Set<Listener>();
  // Replaced (never mutated) when the lit set changes, so the snapshot is referentially stable between changes.
  let snapshot: ReadonlySet<GraphNodeId> = EMPTY;

  function publish() {
    snapshot = counts.size === 0 ? EMPTY : new Set(counts.keys());
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    register(nodes) {
      const unique = [...new Set(nodes)];
      let changed = false;
      for (const node of unique) {
        const count = counts.get(node) ?? 0;
        counts.set(node, count + 1);
        if (count === 0) changed = true;
      }
      if (changed) publish();

      let released = false;
      return () => {
        if (released) return;
        released = true;
        let lost = false;
        for (const node of unique) {
          const count = (counts.get(node) ?? 0) - 1;
          if (count <= 0) {
            counts.delete(node);
            lost = true;
          } else {
            counts.set(node, count);
          }
        }
        if (lost) publish();
      };
    },
  };
}

const GraphContext = createContext<GraphStore | null>(null);

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createGraphStore);
  return <GraphContext value={store}>{children}</GraphContext>;
}

/** The set of currently lit nodes. Empty outside a GraphProvider and during server rendering. */
export function useActiveGraphNodes(): ReadonlySet<GraphNodeId> {
  const store = useContext(GraphContext);
  return useSyncExternalStore(
    store?.subscribe ?? subscribeNever,
    store?.getSnapshot ?? getEmpty,
    getEmpty,
  );
}

/** Stable string key, so a new array literal with the same ids does not re-register. */
function toKey(nodes: readonly GraphNodeId[]): string {
  return [...new Set(nodes)].sort().join(",");
}

function fromKey(key: string): GraphNodeId[] {
  return key.split(",").filter(isGraphNodeId);
}

/** Lights `nodes` from mount to unmount of the calling component. */
export function useGraphActivation(nodes: readonly GraphNodeId[]): void {
  const store = useContext(GraphContext);
  const key = toKey(nodes);
  useEffect(() => {
    const ids = fromKey(key);
    if (!store || ids.length === 0) return;
    return store.register(ids);
  }, [store, key]);
}

/**
 * Lights `nodes` while the element that contains this component is in the middle band of the
 * viewport. Usable from server components: it accepts plain props and renders only an inert,
 * hidden marker (display: none, so it takes no part in flex, grid or gap layout) that it uses to
 * find its parent. Without IntersectionObserver the nodes are simply lit for the lifetime of the page.
 */
export function GraphActivator({ nodes }: { nodes: readonly GraphNodeId[] }) {
  const store = useContext(GraphContext);
  const marker = useRef<HTMLSpanElement>(null);
  const key = toKey(nodes);

  useEffect(() => {
    const ids = fromKey(key);
    const parent = marker.current?.parentElement;
    if (!store || !parent || ids.length === 0) return;

    if (typeof IntersectionObserver === "undefined") return store.register(ids);

    let release: (() => void) | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        // Entries are in time order; only the newest state matters.
        const latest = entries[entries.length - 1];
        if (!latest) return;
        if (latest.isIntersecting && !release) {
          release = store.register(ids);
        } else if (!latest.isIntersecting && release) {
          release();
          release = null;
        }
      },
      // A section counts as "current" while it crosses the middle 40% of the viewport, so at most a
      // couple of sections are lit at once and the graph follows the reader.
      { rootMargin: "-30% 0px -30% 0px", threshold: 0 },
    );
    observer.observe(parent);
    return () => {
      observer.disconnect();
      release?.();
    };
  }, [store, key]);

  return <span ref={marker} hidden aria-hidden="true" />;
}
