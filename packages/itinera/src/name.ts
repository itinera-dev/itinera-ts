/**
 * The text of a name given when something is declared, as the branded name
 * type `N`, once it is known not to be empty.
 *
 * @throws Error when the text is empty, saying what was being named.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller names the brand of the name it declares
export function named<N extends string>(text: string, what: string): N {
  if (text === "") {
    throw new Error(`${what} has an empty name`);
  }
  return text as N;
}
