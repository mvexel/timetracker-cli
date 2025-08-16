const fs = require("fs").promises;
const { createReadStream } = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

class TimeTracker {
  constructor() {
    this.configDir = path.join(os.homedir(), ".timetracker");
    this.stateFile = path.join(this.configDir, "state.json");
    this.logFile = path.join(this.configDir, "timetracker.csv");

    this.ensureConfigDir();
    this.initializeLogFile();
  }

  async ensureConfigDir() {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw new Error(`Failed to create config directory: ${error.message}`);
      }
    }
  }

  async initializeLogFile() {
    try {
      await fs.access(this.logFile);
    } catch (error) {
      const header = "project,start_time,end_time\n";
      await fs.writeFile(this.logFile, header);
    }
  }

  async getState() {
    try {
      const data = await fs.readFile(this.stateFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(`Failed to read state file: ${error.message}`);
      }
      return null;
    }
  }

  async saveState(state) {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      throw new Error(`Failed to save state file: ${error.message}`);
    }
  }

  async clearState() {
    try {
      await fs.unlink(this.stateFile);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(`Failed to clear state file: ${error.message}`);
      }
    }
  }

  async start(project) {
    if (!project) {
      throw new Error("Project name is required");
    }

    const currentState = await this.getState();

    if (currentState && currentState.project) {
      throw new Error(`Already tracking project: ${currentState.project}. Stop current session first.`);
    }

    const startTime = new Date().toISOString();
    const state = {
      project: project,
      startTime: startTime,
    };

    await this.saveState(state);
    console.log(
      `Started tracking project: ${project} at ${new Date(
        startTime,
      ).toLocaleString()}`,
    );
  }

  async stop() {
    const currentState = await this.getState();

    if (!currentState || !currentState.project) {
      throw new Error("No active tracking session found");
    }

    const endTime = new Date();
    const startTime = new Date(currentState.startTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    const logEntry = `${currentState.project},${currentState.startTime},${endTime.toISOString()}\n`;

    try {
      await fs.appendFile(this.logFile, logEntry);
      console.log(`Stopped tracking project: ${currentState.project}`);
      console.log(`Duration: ${this.formatDuration(durationMinutes)}`);

      await this.clearState();
    } catch (error) {
      throw new Error(`Failed to save log entry: ${error.message}`);
    }
  }

  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  async summary(period, dateForTesting) {
    if (!["day", "week", "month", "all"].includes(period)) {
      throw new Error("Invalid period. Use: day, week, month, or all");
    }

    try {
      await fs.access(this.logFile);
    } catch (error) {
      console.log("No time tracking data found.");
      return;
    }

    const fileStream = createReadStream(this.logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const now = dateForTesting ? new Date(dateForTesting) : new Date();
    const cutoffDate = period === "all" ? new Date(0) : this.getCutoffDate(now, period);

    const projectTotals = {};
    let totalMinutes = 0;
    let isFirstLine = true;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      if (line.trim() === "") continue;

      const [project, startTime, endTime] = line.split(",");
      const entryDate = new Date(startTime);

      if (entryDate >= cutoffDate) {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        const minutes = Math.round((endDate - startDate) / (1000 * 60));
        if (!isNaN(minutes) && minutes > 0) {
          projectTotals[project] = (projectTotals[project] || 0) + minutes;
          totalMinutes += minutes;
        }
      }
    }

    const periodDisplay = period === "all" ? "All Time" : `Last ${period}`;
    console.log(`\nTime Summary - ${periodDisplay}:`);
    console.log("================================");

    if (Object.keys(projectTotals).length === 0) {
      console.log("No time tracked in this period.");
      return;
    }

    Object.entries(projectTotals)
      .sort(([, a], [, b]) => b - a)
      .forEach(([project, minutes]) => {
        console.log(`${project}: ${this.formatDuration(minutes)}`);
      });

    console.log("--------------------------------");
    console.log(`Total: ${this.formatDuration(totalMinutes)}`);
  }

  getCutoffDate(now, period) {
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
    }

    return cutoff;
  }

  async log(project_name, duration, options = {}) {
    if (!project_name) {
      throw new Error("Project name is required");
    }

    if (duration === undefined || duration === null || isNaN(duration)) {
      throw new Error("Duration in minutes is required and must be a number");
    }

    if (duration <= 0) {
      throw new Error("Duration must be positive");
    }

    const endTime = this.parseDateTime(options.day, options.time, options.date);
    if (!endTime) {
      throw new Error("Invalid date or time format");
    }

    const startTime = new Date(endTime.getTime() - duration * 60 * 1000);

    const logEntry = `${project_name},${startTime.toISOString()},${endTime.toISOString()}\n`;

    try {
      await fs.appendFile(this.logFile, logEntry);
      console.log(
        `Logged ${this.formatDuration(duration)} for project: ${project_name}`,
      );
      console.log(
        `Time period: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`,
      );
    } catch (error) {
      throw new Error(`Failed to save log entry: ${error.message}`);
    }
  }

  parseDateTime(dayOption, timeOption, dateForTesting) {
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

  async logs(period, dateForTesting) {
    if (!["day", "week", "month", "all"].includes(period)) {
      throw new Error("Invalid period. Use: day, week, month, or all");
    }

    const entries = await this.getLogEntriesForPeriod(period, dateForTesting);

    if (entries.length === 0) {
      console.log(`\nLog Entries - Last ${period}:`);
      console.log("==============================");
      console.log("No entries found for this period.");
      return;
    }

    this.showLogs(entries, period);
  }

  showLogs(entries, period) {
    console.log(`\nLog Entries - Last ${period}:`);
    console.log("==============================");
    
    entries.forEach((entry, index) => {
      const startTimeStr = entry.startTime.toLocaleString();
      const endTimeStr = entry.endTime.toLocaleString();
      const durationStr = this.formatDuration(entry.duration);
      
      console.log(`[${index + 1}] ${entry.project}: ${durationStr} (${startTimeStr} - ${endTimeStr})`);
    });

    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
    console.log("------------------------------");
    console.log(`Total: ${this.formatDuration(totalMinutes)}`);
  }

  async getAllLogEntries() {
    try {
      await fs.access(this.logFile);
    } catch (error) {
      return [];
    }

    const fileStream = createReadStream(this.logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const logEntries = [];
    let isFirstLine = true;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      if (line.trim() === "") continue;

      const [project, startTime, endTime] = line.split(",");
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const minutes = Math.round((endDate - startDate) / (1000 * 60));
      
      if (!isNaN(minutes) && minutes > 0) {
        logEntries.push({
          project,
          startTime: startDate,
          endTime: endDate,
          duration: minutes,
          originalLine: line
        });
      }
    }

    return logEntries.sort((a, b) => a.startTime - b.startTime);
  }

  async getLogEntriesForPeriod(period, dateForTesting) {
    const allEntries = await this.getAllLogEntries();
    
    if (period === "all" || !["day", "week", "month"].includes(period)) {
      return allEntries;
    }

    const now = dateForTesting ? new Date(dateForTesting) : new Date();
    const cutoffDate = this.getCutoffDate(now, period);

    return allEntries.filter(entry => entry.startTime >= cutoffDate);
  }

  async deleteEntry(index, period = 'all', dateForTesting = null) {
    const entriesForPeriod = await this.getLogEntriesForPeriod(period, dateForTesting);
    
    if (index < 1 || index > entriesForPeriod.length) {
      throw new Error(`Invalid index. Use a number between 1 and ${entriesForPeriod.length}`);
    }

    const entryToDelete = entriesForPeriod[index - 1];
    
    const allEntries = await this.getAllLogEntries();
    const filteredEntries = allEntries.filter(entry => entry.originalLine !== entryToDelete.originalLine);

    const header = "project,start_time,end_time\n";
    const csvContent = header + filteredEntries.map(entry => entry.originalLine).join('\n') + '\n';

    try {
      await fs.writeFile(this.logFile, csvContent);
      console.log(`Deleted entry: ${entryToDelete.project}: ${this.formatDuration(entryToDelete.duration)} (${entryToDelete.startTime.toLocaleString()} - ${entryToDelete.endTime.toLocaleString()})`);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete entry: ${error.message}`);
    }
  }
}

module.exports = TimeTracker;