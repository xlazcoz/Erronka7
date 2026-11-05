export interface FilterOption {
  id: string;
  name: string;
}

export function filterOptions(
  values: Array<string | null | undefined>,
  ignored: string[] = ['-'],
): FilterOption[] {
  const unique = Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0 && !ignored.includes(value),
      ),
    ),
  );

  return unique.map((value) => ({ id: value, name: value }));
}
