/**
 * Centralized date utilities - single source of truth for all date operations
 * All methods work in local timezone to avoid UTC confusion
 */
export class DateUtils {
  /**
   * Get current Date object
   */
  static now() {
    return new Date();
  }

  /**
   * Get today as YYYY-MM-DD string in local timezone
   */
  static today() {
    const now = new Date();
    return this.formatForStorage(now);
  }

  /**
   * Convert Date object to YYYY-MM-DD string for storage
   */
  static formatForStorage(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert date to localized display string
   */
  static formatForDisplay(date) {
    if (typeof date === 'string') {
      date = this.parseFromStorage(date);
    }
    return date.toLocaleDateString();
  }

  /**
   * Parse YYYY-MM-DD string to Date object in local timezone
   */
  static parseFromStorage(dateString) {
    if (dateString instanceof Date) {
      return dateString;
    }

    // Parse YYYY-MM-DD as local date (not UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-based
    }

    // Fallback for other formats
    return new Date(dateString);
  }

  /**
   * Get start of day for given date
   */
  static startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get start of week for given date (Sunday)
   */
  static startOfWeek(date) {
    const result = new Date(date);
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get start of month for given date
   */
  static startOfMonth(date) {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get cutoff date for filtering by period
   */
  static getCutoffDateForPeriod(period, referenceDate = null) {
    if (period === 'all') return new Date(0);

    const now = referenceDate || this.now();

    switch (period) {
      case 'day':
        return this.startOfDay(now);
      case 'week':
        return this.startOfWeek(now);
      case 'month':
        return this.startOfMonth(now);
      default:
        throw new Error('Invalid period. Use: day, week, month, or all');
    }
  }

  /**
   * Check if a date string is within a given period
   */
  static isWithinPeriod(dateString, period, referenceDate = null) {
    if (period === 'all') return true;

    const entryDate = this.parseFromStorage(dateString);
    const cutoffDate = this.getCutoffDateForPeriod(period, referenceDate);

    return entryDate >= cutoffDate;
  }

  /**
   * Parse date and time options for manual logging
   */
  static parseDateTime(dayOption, timeOption, dateForTesting = null) {
    let targetDate;

    if (dateForTesting) {
      targetDate = new Date(dateForTesting);
    } else if (dayOption) {
      // Parse the day option as local date
      targetDate = this.parseAndValidateDateOption(dayOption);

      if (timeOption) {
        // Apply time to the parsed date
        const [hours, minutes] = timeOption.split(':');
        const hoursNum = parseInt(hours, 10);
        const minutesNum = parseInt(minutes, 10);

        if (
          isNaN(hoursNum) ||
          isNaN(minutesNum) ||
          hoursNum < 0 ||
          hoursNum > 23 ||
          minutesNum < 0 ||
          minutesNum > 59
        ) {
          throw new Error('Invalid time format. Use HH:MM format (24-hour).');
        }

        targetDate.setHours(hoursNum, minutesNum, 0, 0);
      }
    } else {
      targetDate = this.now();
      if (timeOption) {
        const [hours, minutes] = timeOption.split(':');
        const hoursNum = parseInt(hours, 10);
        const minutesNum = parseInt(minutes, 10);

        if (
          isNaN(hoursNum) ||
          isNaN(minutesNum) ||
          hoursNum < 0 ||
          hoursNum > 23 ||
          minutesNum < 0 ||
          minutesNum > 59
        ) {
          throw new Error('Invalid time format. Use HH:MM format (24-hour).');
        }

        targetDate.setHours(hoursNum, minutesNum, 0, 0);
      }
    }

    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid date/time combination');
    }

    return targetDate;
  }

  /**
   * Parse and validate a date option from command line
   */
  static parseAndValidateDateOption(dateOption) {
    if (!dateOption) {
      return this.now();
    }

    // Check YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOption)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }

    const parsed = this.parseFromStorage(dateOption);
    if (
      isNaN(parsed.getTime()) ||
      this.formatForStorage(parsed) !== dateOption
    ) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }

    return parsed;
  }
}
