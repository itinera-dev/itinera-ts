/**
 * `items` grouped by what `keyOf` says of each, the groups in the order
 * their first item comes, and each group's items in their own order.
 */
export function grouped<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): readonly (readonly [T, ...T[]])[] {
  return [...items.reduce(addTo(keyOf), new Map<string, [T, ...T[]]>())].map(
    groupOf,
  );
}

/** Whether `group` holds more than one item. */
export function repeated(group: readonly unknown[]): boolean {
  return group.length > 1;
}

function addTo<T>(
  keyOf: (item: T) => string,
): (groups: Map<string, [T, ...T[]]>, item: T) => Map<string, [T, ...T[]]> {
  return (groups, item) => {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [item]);
    } else {
      group.push(item);
    }
    return groups;
  };
}

function groupOf<T>([, group]: readonly [string, [T, ...T[]]]): readonly [
  T,
  ...T[],
] {
  return group;
}
