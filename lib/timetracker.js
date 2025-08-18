import { FileManager } from './services/FileManager.js';
import { ProjectManager } from './services/ProjectManager.js';
import { TimeCalculator } from './services/TimeCalculator.js';
import { Formatter } from './formatters/Formatter.js';
import { SessionEntry } from './models/SessionEntry.js';
import { DateUtils } from './services/DateUtils.js';

/**
 * Main TimeTracker class that orchestrates all time tracking operations
 */
export class TimeTracker {
  #fileManager;
  #projectManager;

  constructor(configDir = null) {
    this.#fileManager = new FileManager(configDir);
    this.#projectManager = new ProjectManager(this.#fileManager);

    this.#initialize();
  }

  async #initialize() {
    await this.#fileManager.ensureConfigDir();
    await this.#fileManager.initializeLogFile();
  }

  // Expose necessary properties for testing
  get configDir() {
    return this.#fileManager.configDir;
  }

  get stateFile() {
    return this.#fileManager.stateFile;
  }

  get logFile() {
    return this.#fileManager.logFile;
  }

  // For backward compatibility with tests
  set configDir(value) {
    this.#fileManager.setTestPaths(value);
  }

  set stateFile(value) {
    // Handled by setTestPaths
  }

  set logFile(value) {
    // Handled by setTestPaths
  }

  async initializeLogFile() {
    await this.#fileManager.initializeLogFile();
  }

  /**
   * Start tracking time for a project
   */
  async start(project, description = null, options = {}) {
    if (!project) {
      throw new Error('Project name is required');
    }

    const currentState = await this.#fileManager.readState();

    // Auto-stop existing session
    if (currentState?.project) {
      await this.#autoStop(currentState, options);
    }

    const startTime = new Date().toISOString();
    const sessionId = SessionEntry.generateSessionId('sess');
    const state = {
      project: project,
      startTime: startTime,
      description: description,
      sessionId: sessionId,
    };

    await this.#fileManager.saveState(state);

    const result = Formatter.trackingStart(
      project,
      startTime,
      options,
      description,
    );
    Formatter.output(result, options.json);
  }

  /**
   * Auto-stop current session when starting a new one
   */
  async #autoStop(currentState, options) {
    const endTime = new Date();
    const startTime = new Date(currentState.startTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    const finalDuration = options.noRound
      ? durationMinutes
      : TimeCalculator.roundToNearest15(durationMinutes);

    if (finalDuration > 0) {
      const entry = new SessionEntry(
        currentState.project,
        startTime.toISOString().split('T')[0], // date only
        finalDuration,
        currentState.description,
        currentState.sessionId,
      );

      await this.#fileManager.appendLogEntry(entry);

      if (!options.quiet) {
        const message =
          finalDuration !== durationMinutes
            ? `Auto-stopped: ${currentState.project} (${TimeCalculator.formatDuration(durationMinutes)} → ${TimeCalculator.formatDuration(finalDuration)})`
            : `Auto-stopped: ${currentState.project} (${TimeCalculator.formatDuration(finalDuration)})`;
        console.log(message);
      }
    }
  }

  /**
   * Stop tracking time
   */
  async stop(options = {}) {
    const currentState = await this.#fileManager.readState();

    if (!currentState?.project) {
      throw new Error('No active tracking session found');
    }

    const endTime = new Date();
    const startTime = new Date(currentState.startTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    const finalDuration = options.noRound
      ? durationMinutes
      : TimeCalculator.roundToNearest15(durationMinutes);

    if (finalDuration > 0) {
      const entry = new SessionEntry(
        currentState.project,
        startTime.toISOString().split('T')[0], // date only
        finalDuration,
        currentState.description,
        currentState.sessionId,
      );

      await this.#fileManager.appendLogEntry(entry);
    }

    const result = Formatter.trackingStop(
      currentState.project,
      durationMinutes,
      finalDuration,
      currentState.startTime,
      endTime.toISOString(),
      options,
      currentState.description,
    );
    Formatter.output(result, options.json);
    await this.#fileManager.clearState();
  }

  /**
   * Log a manual time entry
   */
  async log(projectName, duration, description = null, options = {}) {
    if (!projectName) {
      throw new Error('Project name is required');
    }

    if (duration === undefined || duration === null || isNaN(duration)) {
      throw new Error('Duration in minutes is required and must be a number');
    }

    if (duration <= 0) {
      throw new Error('Duration must be positive');
    }

    // Use provided day or default to today
    const targetDate = options.day
      ? DateUtils.parseAndValidateDateOption(options.day)
      : DateUtils.now();
    const targetDateString = DateUtils.formatForStorage(targetDate);

    const finalDuration = duration; // Manual entries use exact duration as entered
    const sessionId = SessionEntry.generateSessionId('manual');
    const entry = new SessionEntry(
      projectName,
      targetDateString,
      finalDuration,
      description,
      sessionId,
    );

    await this.#fileManager.appendLogEntry(entry);
    const result = Formatter.logEntry(
      projectName,
      duration,
      targetDate,
      options,
      description,
    );
    Formatter.output(result, options.json);
  }

  /**
   * Show time summary for a period, optionally filtered by project
   */
  async summary(period = 'all', dateForTesting = null, options = {}) {
    TimeCalculator.validatePeriod(period);

    const allEntries = await this.#fileManager.readAllLogEntries();
    let filteredEntries = TimeCalculator.filterEntriesByPeriod(
      allEntries,
      period,
      dateForTesting,
    );

    if (options.project) {
      filteredEntries = TimeCalculator.filterEntriesByProject(
        filteredEntries,
        options.project,
      );
    }

    const result = Formatter.summary(filteredEntries, period, options);
    Formatter.output(result, options.json);
  }

  /**
   * Show log entries for a period
   */
  async logs(period = 'all', options = {}, dateForTesting = null) {
    TimeCalculator.validatePeriod(period);

    const allEntries = await this.#fileManager.readAllLogEntries();
    let filteredEntries = TimeCalculator.filterEntriesByPeriod(
      allEntries,
      period,
      dateForTesting,
    );

    // Apply session type filters
    if (options.sessionsOnly) {
      filteredEntries = filteredEntries.filter((entry) => entry.isSessionEntry);
    } else if (options.manualOnly) {
      filteredEntries = filteredEntries.filter((entry) => entry.isManualEntry);
    }

    // Apply description filter
    if (options.withDescriptions) {
      filteredEntries = filteredEntries.filter((entry) => entry.description);
    }

    const result = Formatter.logs(filteredEntries, period, options);
    Formatter.output(result, options.json);
  }

  /**
   * Delete a log entry by index within a period
   */
  async deleteEntry(
    index,
    period = 'all',
    dateForTesting = null,
    options = {},
  ) {
    if (isNaN(index)) {
      throw new Error(
        'An entry index to delete is required. Please provide a valid number.',
      );
    }
    const allEntries = await this.#fileManager.readAllLogEntries();
    const entriesForPeriod = TimeCalculator.filterEntriesByPeriod(
      allEntries,
      period,
      dateForTesting,
    );

    if (index < 1 || index > entriesForPeriod.length) {
      throw new Error(
        `Invalid index. Use a number between 1 and ${entriesForPeriod.length}`,
      );
    }

    const entryToDelete = entriesForPeriod[index - 1];

    const filteredEntries = allEntries.filter((entry) => {
      if (entryToDelete.originalLine && entry.originalLine) {
        return entry.originalLine !== entryToDelete.originalLine;
      } else {
        return !(
          entry.project === entryToDelete.project &&
          entry.date.getTime() === entryToDelete.date.getTime() &&
          entry.duration === entryToDelete.duration
        );
      }
    });

    await this.#fileManager.writeLogEntries(filteredEntries);
    const result = Formatter.deletion([entryToDelete], options);
    Formatter.output(result, options.json);
    return true;
  }

  /**
   * List all projects
   */
  async listProjects(options = {}) {
    await this.#projectManager.listProjects(options);
  }

  /**
   * Delete a project and all its entries
   */
  async deleteProject(projectName, options = {}) {
    await this.#projectManager.deleteProject(projectName, options);
  }

  /**
   * Delete entries by project and criteria
   */
  async deleteByProject(options = {}) {
    await this.#projectManager.deleteByProject(options);
  }

  /**
   * Get current tracking status
   */
  async status(options = {}) {
    const currentState = await this.#fileManager.readState();

    if (!currentState?.project) {
      if (options.json) {
        const result = Formatter.status(null, 0, options);
        Formatter.output(result, options.json);
      }
      return;
    }

    const startTime = new Date(currentState.startTime);
    const now = new Date();
    const durationMinutes = Math.round((now - startTime) / (1000 * 60));

    if (options.json) {
      const result = Formatter.status(currentState, durationMinutes, options);
      Formatter.output(result, options.json);
    } else {
      const result = Formatter.status(currentState, durationMinutes, options);
      process.stdout.write(result);
    }
  }

  /**
   * Export all time tracking data as CSV to stdout
   */
  async export() {
    const allEntries = await this.#fileManager.readAllLogEntries();
    console.log('project,date,duration_minutes,description,session_id');
    for (const entry of allEntries) {
      console.log(entry.toCSVLine());
    }
  }

  // Legacy methods for backward compatibility with tests
  async getState() {
    return await this.#fileManager.readState();
  }

  async getAllLogEntries() {
    return await this.#fileManager.readAllLogEntries();
  }

  async getLogEntriesForPeriod(period, dateForTesting = null) {
    const allEntries = await this.#fileManager.readAllLogEntries();
    return TimeCalculator.filterEntriesByPeriod(
      allEntries,
      period,
      dateForTesting,
    );
  }

  // Private helper methods

  // Legacy methods for backward compatibility
  formatDuration(minutes) {
    return TimeCalculator.formatDuration(minutes);
  }

  getPeriodDisplay(period) {
    return TimeCalculator.getPeriodDisplay(period);
  }

  showLogs(entries, period, options = {}) {
    const result = Formatter.logs(entries, period, options);
    Formatter.output(result, options.json);
  }
}

export default TimeTracker;
