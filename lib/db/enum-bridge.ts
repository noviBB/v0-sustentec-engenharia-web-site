type EnumLike = Record<string, string>;
/** pgEnum needs a non-empty readonly tuple of its string values. `Object.values`
 *  is typed too loosely (`string[]`), so narrowing it back to the enum's own
 *  value union and to a non-empty-tuple shape is irreducible — this is the single
 *  sanctioned assertion in the data layer. The length check guards it at runtime. */
export function enumValues<E extends EnumLike>(e: E): [E[keyof E], ...E[keyof E][]] {
  const values = Object.values(e);
  if (values.length === 0) throw new Error('enum has no members');
  // eslint-disable-next-line no-restricted-syntax -- irreducible: runtime-guarded non-empty tuple for pgEnum; see docs/conventions.md
  return values as [E[keyof E], ...E[keyof E][]];
}
