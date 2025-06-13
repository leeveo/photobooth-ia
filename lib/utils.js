/**
 * Makes an object serializable for Server Components
 * Removes functions, undefined values, and circular references
 */
export function makeSerializable(obj) {
  return JSON.parse(JSON.stringify(obj));
}