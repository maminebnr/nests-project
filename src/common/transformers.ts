import { Transform } from 'class-transformer';

/** Query-string friendly boolean: "true"/"1" -> true, "false"/"0" -> false. */
export const ToBoolean = () =>
  Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return undefined;
  });

/** Trim strings and collapse to lowercase unique tags. */
export const ToTagList = () =>
  Transform(({ value }) =>
    Array.isArray(value)
      ? [...new Set(value.map((v) => String(v).trim().toLowerCase()).filter(Boolean))]
      : value,
  );

export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
