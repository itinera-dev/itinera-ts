/**
 * What `each` gives for every item, in order, each started only once the
 * one before it has settled, since resolving one request may emit an event
 * or abort the journey before the next is looked at.
 *
 * @throws Whatever `each` throws, for the first item that throws.
 */
export function inOrder<T, R>(
  items: readonly T[],
  each: (item: T) => Promise<R>,
): Promise<R[]> {
  return items.reduce(
    (earlier, item) => thenEach(earlier, each, item),
    Promise.resolve<R[]>([]),
  );
}

async function thenEach<T, R>(
  earlier: Promise<R[]>,
  each: (item: T) => Promise<R>,
  item: T,
): Promise<R[]> {
  const given = await earlier;
  return [...given, await each(item)];
}
