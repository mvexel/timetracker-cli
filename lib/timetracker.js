import { FileManager } from './services/FileManager.js';
import { ProjectManager } from './services/ProjectManager.js';
import { TimeCalculator } from './services/TimeCalculator.js';
import { DisplayFormatter } from './formatters/DisplayFormatter.js';
import { TimeEntry } from './models/TimeEntry.js';

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
  async start(project, options = {}) {
    if (!project) {
      throw new Error("Project name is required");
    }

    const currentState = await this.#fileManager.readState();

    if (currentState?.project) {
      throw new Error(`Already tracking project: ${currentState.project}. Stop current session first.`);
    }

    const startTime = new Date().toISOString();
    const state = {
      project: project,
      startTime: startTime,
    };

    await this.#fileManager.saveState(state);
    DisplayFormatter.formatTrackingStartMessage(project, startTime, options);
  }

  /**
   * Stop tracking time
   */
  async stop(options = {}) {
    const currentState = await this.#fileManager.readState();

    if (!currentState?.project) {
      throw new Error("No active tracking session found");
    }

    const endTime = new Date();
    const startTime = new Date(currentState.startTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    const entry = new TimeEntry(
      currentState.project,
      currentState.startTime,
      endTime.toISOString()
    );

    await this.#fileManager.appendLogEntry(entry);
    DisplayFormatter.formatTrackingStopMessage(
      currentState.project, 
      durationMinutes, 
      currentState.startTime, 
      endTime.toISOString(), 
      options
    );
    await this.#fileManager.clearState();
  }

  /**
   * Log a manual time entry
   */
  async log(projectName, duration, options = {}) {
    if (!projectName) {
      throw new Error("Project name is required");
    }

    if (duration === undefined || duration === null || isNaN(duration)) {
      throw new Error("Duration in minutes is required and must be a number");
    }

    if (duration <= 0) {
      throw new Error("Duration must be positive");
    }

    const endTime = TimeCalculator.parseDateTime(options.day, options.time, options.date);
    if (!endTime) {
      throw new Error("Invalid date or time format");
    }

    const startTime = new Date(endTime.getTime() - duration * 60 * 1000);
    const entry = new TimeEntry(projectName, startTime.toISOString(), endTime.toISOString());

    await this.#fileManager.appendLogEntry(entry);
    DisplayFormatter.formatLogEntryMessage(projectName, duration, startTime, endTime, options);
  }

  /**
   * Show time summary for a period, optionally filtered by project
   */
  async summary(period = "all", dateForTesting = null, options = {}) {
    TimeCalculator.validatePeriod(period);

    const allEntries = await this.#fileManager.readAllLogEntries();
    let filteredEntries = TimeCalculator.filterEntriesByPeriod(allEntries, period, dateForTesting);
    
    if (options.project) {
      filteredEntries = TimeCalculator.filterEntriesByProject(filteredEntries, options.project);
    }

    DisplayFormatter.formatSummary(filteredEntries, period, options);
  }

  /**
   * Show log entries for a period
   */
  async logs(period = "all", options = {}, dateForTesting = null) {
    TimeCalculator.validatePeriod(period);

    const allEntries = await this.#fileManager.readAllLogEntries();
    const filteredEntries = TimeCalculator.filterEntriesByPeriod(allEntries, period, dateForTesting);

    DisplayFormatter.formatLogs(filteredEntries, period, options);
  }

  /**
   * Delete a log entry by index within a period
   */
  async deleteEntry(index, period = 'all', dateForTesting = null, options = {}) {
    const allEntries = await this.#fileManager.readAllLogEntries();
    const entriesForPeriod = TimeCalculator.filterEntriesByPeriod(allEntries, period, dateForTesting);
    
    if (index < 1 || index > entriesForPeriod.length) {
      throw new Error(`Invalid index. Use a number between 1 and ${entriesForPeriod.length}`);
    }

    const entryToDelete = entriesForPeriod[index - 1];
    
    const filteredEntries = allEntries.filter(entry => 
      entry.originalLine !== entryToDelete.originalLine
    );

    await this.#fileManager.writeLogEntries(filteredEntries);
    DisplayFormatter.formatDeletionMessage([entryToDelete], options);
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
        DisplayFormatter.formatStatus(null, 0, options);
      }
      return;
    }

    const startTime = new Date(currentState.startTime);
    const now = new Date();
    const durationMinutes = Math.round((now - startTime) / (1000 * 60));
    
    if (options.json) {
      DisplayFormatter.formatStatus(currentState, durationMinutes, options);
    } else {
      process.stdout.write(`${currentState.project} (${TimeCalculator.formatDuration(durationMinutes)})`);
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
    return TimeCalculator.filterEntriesByPeriod(allEntries, period, dateForTesting);
  }

  // Legacy methods for backward compatibility
  formatDuration(minutes) {
    return TimeCalculator.formatDuration(minutes);
  }

  getPeriodDisplay(period) {
    return TimeCalculator.getPeriodDisplay(period);
  }

  showLogs(entries, period, options = {}) {
    DisplayFormatter.formatLogs(entries, period, options);
  }
}

export default TimeTracker;