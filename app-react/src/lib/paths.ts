/* paths.ts
   The vanilla app mutated the record object in place at a dot-path
   (setPath in app.js) and re-rendered by rebuilding HTML from scratch, so
   mutation was harmless. React needs a new object reference to know
   something changed, so this is the same idea made immutable: only the
   objects/arrays actually on the path get cloned, everything else is
   shared structurally. */

export function getPath<T = unknown>(obj: unknown, path: string): T | undefined {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj) as T | undefined;
}

export function setPathImmutable<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");

  function clone(node: unknown, idx: number): unknown {
    const key = parts[idx];
    const isLast = idx === parts.length - 1;
    if (Array.isArray(node)) {
      const arr = node.slice();
      const i = Number(key);
      arr[i] = isLast ? value : clone(arr[i], idx + 1);
      return arr;
    }
    const copy = { ...(node as Record<string, unknown>) };
    copy[key] = isLast ? value : clone(copy[key], idx + 1);
    return copy;
  }

  return clone(obj, 0) as T;
}
