/**
 * Represents a session-based time tracking entry
 */
export class SessionEntry {
  #project;
  #date;
  #duration;
  #description;
  #sessionId;
  #originalLine;

  constructor(project, date, duration, description = null, sessionId = null, originalLine = null) {
    this.#project = project;
    this.#date = new Date(date);
    this.#duration = parseInt(duration);
    this.#description = description;
    this.#sessionId = sessionId;
    this.#originalLine = originalLine;
  }

  get project() {
    return this.#project;
  }

  get date() {
    return this.#date;
  }

  get duration() {
    return this.#duration;
  }

  get description() {
    return this.#description;
  }

  get sessionId() {
    return this.#sessionId;
  }

  get originalLine() {
    return this.#originalLine;
  }

  get isManualEntry() {
    return this.#sessionId?.startsWith('manual_');
  }

  get isSessionEntry() {
    return this.#sessionId?.startsWith('sess_');
  }

  /**
   * Create SessionEntry from CSV line
   */
  static fromCSVLine(line) {
    if (!line?.trim()) return null;
    
    const parts = line.split(',');
    const [project, date, duration, description, sessionId] = parts;
    
    if (!project || !date || !duration) return null;

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) return null;

    const desc = description === '' ? null : description;
    const sessId = sessionId === '' ? null : sessionId;

    return new SessionEntry(project, date, durationNum, desc, sessId, line);
  }

  /**
   * Convert to CSV line format
   */
  toCSVLine() {
    const desc = this.#description || '';
    const sessId = this.#sessionId || '';
    return `${this.#project},${this.#date.toISOString().split('T')[0]},${this.#duration},${desc},${sessId}`;
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
    return this.#date >= cutoffDate;
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(type = 'sess') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}_${timestamp}_${random}`;
  }

}