/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The string with first letter capitalized
 */
export const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return str || '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalizes the first letter of each word in a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The string with first letter of each word capitalized
 */
export const capitalizeWords = (str) => {
  if (!str || typeof str !== 'string') return str || '';
  return str
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
};

/**
 * Capitalizes the first letter while preserving the rest of the string
 * Useful for names like "john" -> "John" or "A" -> "A"
 * @param {string} str - The string to capitalize
 * @returns {string} - The string with first letter capitalized, rest unchanged
 */
export const capitalizeFirstOnly = (str) => {
  if (!str || typeof str !== 'string') return str || '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
















