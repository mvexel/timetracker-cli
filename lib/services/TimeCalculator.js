/**
 * Utility functions for time calculations and formatting
 */
export class TimeCalculator {
  /**
   * Format duration in minutes to human readable format
   */
  static formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Get period display name
   */
  static getPeriodDisplay(period) {
    return period === "all" ? "All Time" : `Last ${period}`;
  }

  /**
   * Get cutoff date for a given period
   */
  static getCutoffDate(now, period) {
    if (period === "all") return new Date(0);

    const cutoff = new Date(now);

    switch (period) {
      case "day":
        cutoff.setHours(0, 0, 0, 0);
        break;
      case "week":
        cutoff.setDate(cutoff.getDate() - cutoff.getDay());
        cutoff.setHours(0, 0, 0, 0);
        break;
      case "month":
        cutoff.setDate(1);
        cutoff.setHours(0, 0, 0, 0);
        break;
      default:
        throw new Error("Invalid period. Use: day, week, month, or all");
    }

    return cutoff;
  }

  /**
   * Filter entries by time period
   */
  static filterEntriesByPeriod(entries, period, dateForTesting = null) {
    if (period === "all") return entries;

    const now = dateForTesting ? new Date(dateForTesting) : new Date();
    const cutoffDate = this.getCutoffDate(now, period);

    return entries.filter(entry => entry.isWithinDateRange(cutoffDate));
  }

  /**
   * Filter entries by project name
   */
  static filterEntriesByProject(entries, projectFilter) {
    if (!projectFilter) return entries;
    return entries.filter(entry => entry.matchesProject(projectFilter));
  }

  /**
   * Parse date and time options for manual logging
   */
  static parseDateTime(dayOption, timeOption, dateForTesting = null) {
    let targetDate;
    
    if (dateForTesting) {
      targetDate = new Date(dateForTesting);
    } else if (dayOption) {
      let targetDateString = dayOption;
      if (timeOption) {
        targetDateString += `T${timeOption}`;
      }
      targetDate = new Date(targetDateString);
    } else {
      targetDate = new Date();
      if (timeOption) {
        const [hours, minutes] = timeOption.split(':');
        targetDate.setHours(hours, minutes, 0, 0);
      }
    }

    if (isNaN(targetDate.getTime())) {
      return null;
    }

    return targetDate;
  }

  /**
   * Validate period parameter
   */
  static validatePeriod(period) {
    const validPeriods = ["day", "week", "month", "all"];
    if (!validPeriods.includes(period)) {
      throw new Error("Invalid period. Use: day, week, month, or all");
    }
  }

  /**
   * Round duration to nearest 15 minute increment
   * 0-7 min → 0 min (too short to count)
   * 8-22 min → 15 min
   * 23-37 min → 30 min
   * 38-52 min → 45 min
   * 53+ min → next hour boundary
   */
  static roundToNearest15(minutes) {
    if (minutes < 8) return 0;
    
    const remainder = minutes % 60;
    const hours = Math.floor(minutes / 60);
    
    let roundedMinutes;
    if (remainder <= 22) {
      roundedMinutes = 15;
    } else if (remainder <= 37) {
      roundedMinutes = 30;
    } else if (remainder <= 52) {
      roundedMinutes = 45;
    } else {
      roundedMinutes = 0;
      return (hours + 1) * 60;
    }
    
    return hours * 60 + roundedMinutes;
  }
}