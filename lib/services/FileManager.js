import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import path from 'path';
import os from 'os';
import { SessionEntry } from '../models/SessionEntry.js';

/**
 * Handles all file system operations for time tracking data
 */
export class FileManager {
  #configDir;
  #stateFile;
  #logFile;

  constructor(configDir = null) {
    this.#configDir = configDir ?? path.join(os.homedir(), '.timetracker');
    this.#stateFile = path.join(this.#configDir, 'state.json');
    this.#logFile = path.join(this.#configDir, 'timetracker.csv');
  }

  get configDir() {
    return this.#configDir;
  }

  get stateFile() {
    return this.#stateFile;
  }

  get logFile() {
    return this.#logFile;
  }

  /**
   * Ensure configuration directory exists
   */
  async ensureConfigDir() {
    try {
      await fs.mkdir(this.#configDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create config directory: ${error.message}`);
      }
    }
  }

  /**
   * Initialize log file with CSV header if it doesn't exist
   */
  async initializeLogFile() {
    try {
      await fs.access(this.#logFile);
    } catch {
      const header = 'project,date,duration_minutes,description,session_id\n';
      await fs.writeFile(this.#logFile, header);
    }
  }

  /**
   * Read current tracking state
   */
  async readState() {
    try {
      const data = await fs.readFile(this.#stateFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to read state file: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Save tracking state
   */
  async saveState(state) {
    try {
      await fs.writeFile(this.#stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      throw new Error(`Failed to save state file: ${error.message}`);
    }
  }

  /**
   * Clear tracking state
   */
  async clearState() {
    try {
      await fs.unlink(this.#stateFile);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to clear state file: ${error.message}`);
      }
    }
  }

  /**
   * Read all log entries from CSV file
   */
  async readAllLogEntries() {
    try {
      await fs.access(this.#logFile);
    } catch {
      return [];
    }

    const fileStream = createReadStream(this.#logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const logEntries = [];
    let isFirstLine = true;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue; // Skip header
      }

      const entry = SessionEntry.fromCSVLine(line);
      if (entry) {
        logEntries.push(entry);
      }
    }

    return logEntries.sort((a, b) => a.date - b.date);
  }

  /**
   * Write session entries to CSV file
   */
  async writeLogEntries(entries) {
    const header = 'project,date,duration_minutes,description,session_id\n';
    const csvContent =
      header +
      entries
        .map((entry) => entry.originalLine ?? entry.toCSVLine())
        .join('\n') +
      '\n';

    try {
      await fs.writeFile(this.#logFile, csvContent);
    } catch (error) {
      throw new Error(`Failed to write log entries: ${error.message}`);
    }
  }

  /**
   * Append a single session entry to CSV file
   */
  async appendLogEntry(entry) {
    const logLine = entry.toCSVLine() + '\n';

    try {
      await fs.appendFile(this.#logFile, logLine);
    } catch (error) {
      throw new Error(`Failed to append log entry: ${error.message}`);
    }
  }

  /**
   * Set alternative paths for testing
   */
  setTestPaths(configDir) {
    this.#configDir = configDir;
    this.#stateFile = path.join(configDir, 'state.json');
    this.#logFile = path.join(configDir, 'timetracker.csv');
  }
}
