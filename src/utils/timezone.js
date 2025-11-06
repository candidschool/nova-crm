/**
 * Format timestamp for IST display (converts UTC to IST +5:30)
 * @param {string|Date} timestamp - UTC timestamp from database
 * @returns {string} Formatted IST time string
 */
export const formatISTTime = (timestamp) => {
  if (!timestamp) return '';
  
  // Force timestamp to be treated as UTC by adding 'Z' if not present
  let utcTimestamp = timestamp;
  if (typeof timestamp === 'string' && !timestamp.endsWith('Z')) {
    utcTimestamp = timestamp + 'Z';
  }
  
  const utcDate = new Date(utcTimestamp);
  
  // IST is UTC + 5 hours 30 minutes
  const istOffset = 5.5 * 60 * 60 * 1000; // in milliseconds
  
  // Convert to IST
  const istDate = new Date(utcDate.getTime() + istOffset);
  
  // Format the date using UTC methods (since we already added the offset)
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  
  let hours = istDate.getUTCHours();
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};
