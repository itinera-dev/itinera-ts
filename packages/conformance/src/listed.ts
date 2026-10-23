/** The list kept under the name, made empty and kept the first time the name is asked for. */
export function listedUnder<T>(lists: Map<string, T[]>, name: string): T[] {
  const listed = lists.get(name) ?? [];
  lists.set(name, listed);
  return listed;
}
