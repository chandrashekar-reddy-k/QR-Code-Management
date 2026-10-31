// utils/dateUtils.js
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date) => {
    return new Date(date).toLocaleString();
};

/**
 * Parse DD-MM-YYYY format string to Date object
 * @param {string} dateString - Date in DD-MM-YYYY format
 * @returns {Date|null} - Date object or null if invalid
 */
export const parseDDMMYYYY = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    
    const parts = dateString.trim().split('-');
    if (parts.length !== 3) return null;
    
    const [day, month, year] = parts;
    const parsedDay = parseInt(day, 10);
    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);
    
    // Validate date components
    if (isNaN(parsedDay) || isNaN(parsedMonth) || isNaN(parsedYear)) return null;
    if (parsedDay < 1 || parsedDay > 31 || parsedMonth < 1 || parsedMonth > 12) return null;
    
    // Create date (month is 0-indexed in JavaScript)
    const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
    
    // Verify the date is valid (handles invalid days like Feb 30)
    if (date.getDate() !== parsedDay || date.getMonth() !== parsedMonth - 1) return null;
    
    return date;
};

/**
 * Format Date object to DD-MM-YYYY string format
 * @param {Date|string|null} date - Date object or date string
 * @returns {string|null} - Formatted date string or null if invalid
 */
export const formatToDDMMYYYY = (date) => {
    if (!date) return null;
    
    let dateObj;
    if (typeof date === 'string') {
        dateObj = new Date(date);
    } else if (date instanceof Date) {
        dateObj = date;
    } else {
        return null;
    }
    
    if (isNaN(dateObj.getTime())) return null;
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}-${month}-${year}`;
};