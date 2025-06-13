/**
 * Makes objects serializable for Next.js Server Components
 * Removes functions, undefined values, and handles circular references
 */
export function makeSerializable(data) {
  if (!data) return data;
  
  try {
    // This will strip non-serializable data
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Serialization error:", error);
    
    // Return an empty object if serialization fails
    return {};
  }
}
