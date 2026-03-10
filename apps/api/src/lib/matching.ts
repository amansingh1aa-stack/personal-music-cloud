export function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/feat\.?|ft\.?/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreMatch(a: string, b: string) {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left || !right) {
    return 0;
  }

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const max = Math.max(leftTokens.size, rightTokens.size, 1);
  return shared / max;
}