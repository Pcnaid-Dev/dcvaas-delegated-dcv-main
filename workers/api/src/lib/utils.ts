/**
 * Converts snake_case keys to camelCase in an object
 * @param obj Object with snake_case keys
 * @returns Object with camelCase keys
 */
export function snakeToCamel<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = obj[key];
    }
  }
  
  return result;
}
