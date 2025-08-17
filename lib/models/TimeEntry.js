/**
 * Represents a time tracking entry
 */
export class TimeEntry {
  #project;
  #startTime;
  #endTime;
  #originalLine;

  constructor(project, startTime, endTime, originalLine = null) {
    this.#project = project;
    this.#startTime = new Date(startTime);
    this.#endTime = new Date(endTime);
    this.#originalLine = originalLine;
  }

  get project() {
    return this.#project;
  }

  get startTime() {
    return this.#startTime;
  }

  get endTime() {
    return this.#endTime;
  }

  get originalLine() {
    return this.#originalLine;
  }

  get duration() {
    return Math.round((this.#endTime - this.#startTime) / (1000 * 60));
  }

  /**
   * Create TimeEntry from CSV line
   */
  static fromCSVLine(line) {
    if (!line?.trim()) return null;
    
    const [project, startTime, endTime] = line.split(',');
    if (!project || !startTime || !endTime) return null;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const minutes = Math.round((endDate - startDate) / (1000 * 60));
    
    if (isNaN(minutes) || minutes <= 0) return null;

    return new TimeEntry(project, startTime, endTime, line);
  }

  /**
   * Convert to CSV line format
   */
  toCSVLine() {
    return `${this.#project},${this.#startTime.toISOString()},${this.#endTime.toISOString()}`;
  }

  /**
   * Check if entry matches project filter (case-insensitive partial match)
   */
  matchesProject(projectFilter) {
    if (!projectFilter) return true;
    return this.#project.toLowerCase().includes(projectFilter.toLowerCase());
  }

  /**
   * Check if entry is within date range
   */
  isWithinDateRange(cutoffDate) {
    return this.#startTime >= cutoffDate;
  }
}