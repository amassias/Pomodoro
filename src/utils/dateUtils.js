/**
 * Date utilities for consistent local date handling.
 * 
 * Using toLocaleDateString('en-CA') produces 'YYYY-MM-DD' format in the user's local timezone,
 * avoiding the UTC-based issues of toISOString().split('T')[0].
 */

/**
 * Get today's date as a local 'YYYY-MM-DD' string.
 * @returns {string} Local date string in YYYY-MM-DD format
 */
export const getLocalDateKey = (date = new Date()) => {
  return date.toLocaleDateString('en-CA'); // 'en-CA' locale uses YYYY-MM-DD format
};

/**
 * Parse a 'YYYY-MM-DD' date string as a local midnight Date object.
 * Using this avoids UTC interpretation issues with `new Date('YYYY-MM-DD')`.
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object at local midnight
 */
export const parseLocalDateKey = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

/**
 * Get the difference in days between two local date strings.
 * @param {string} dateStr1 - First date in YYYY-MM-DD format
 * @param {string} dateStr2 - Second date in YYYY-MM-DD format  
 * @returns {number} Absolute difference in days
 */
export const daysBetween = (dateStr1, dateStr2) => {
  const d1 = parseLocalDateKey(dateStr1);
  const d2 = parseLocalDateKey(dateStr2);
  const diffTime = Math.abs(d2 - d1);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
