/**
 * Utility functions for time calculations and formatting
 */
import { DateUtils } from './DateUtils.js';

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
    return DateUtils.getCutoffDateForPeriod(period, now);
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
    return DateUtils.parseDateTime(dayOption, timeOption, dateForTesting);
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