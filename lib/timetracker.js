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
        console.error("Error creating config directory:", error.message);
      }
    }
  }

  async initializeLogFile() {
    try {
      await fs.access(this.logFile);
    } catch (error) {
      const header = "project,start_time,end_time,duration_minutes\n";
      await fs.writeFile(this.logFile, header);
    }
  }

  async getState() {
    try {
      const data = await fs.readFile(this.stateFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Error reading state file:", error.message);
      }
      return null;
    }
  }

  async saveState(state) {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error("Error saving state file:", error.message);
    }
  }

  async clearState() {
    try {
      await fs.unlink(this.stateFile);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Error clearing state file:", error.message);
      }
    }
  }

  async start(project) {
    const currentState = await this.getState();

    if (currentState && currentState.project) {
      console.log(`Already tracking project: ${currentState.project}`);
      console.log("Please stop the current session before starting a new one.");
      return;
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
      console.log("No active tracking session found.");
      return;
    }

    const endTime = new Date();
    const startTime = new Date(currentState.startTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    const logEntry = `${currentState.project},${currentState.startTime},${endTime.toISOString()},${durationMinutes}\n`;

    try {
      await fs.appendFile(this.logFile, logEntry);
      console.log(`Stopped tracking project: ${currentState.project}`);
      console.log(`Duration: ${this.formatDuration(durationMinutes)}`);

      await this.clearState();
    } catch (error) {
      console.error("Error saving log entry:", error.message);
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
    if (!["day", "week", "month"].includes(period)) {
      console.log("Invalid period. Use: day, week, or month");
      return;
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
    const cutoffDate = this.getCutoffDate(now, period);

    const projectTotals = {};
    let totalMinutes = 0;
    let isFirstLine = true;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }

      if (line.trim() === "") continue;

      const [project, startTime, endTime, duration] = line.split(",");
      const entryDate = new Date(startTime);

      if (entryDate >= cutoffDate) {
        const minutes = parseInt(duration, 10);
        if (!isNaN(minutes)) {
          projectTotals[project] = (projectTotals[project] || 0) + minutes;
          totalMinutes += minutes;
        }
      }
    }

    console.log(`\nTime Summary - Last ${period}:`);
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

  async log(project_name, options = {}) {
    if (!options.duration) {
      console.log("Error: duration is required");
      return;
    }

    const duration = options.duration;
    if (duration <= 0) {
      console.log("Error: Duration must be positive");
      return;
    }

    const endTime = this.parseDateTime(options.day, options.time, options.date);
    if (!endTime) {
      return;
    }

    const startTime = new Date(endTime.getTime() - duration * 60 * 1000);

    const logEntry = `${project_name},${startTime.toISOString()},${endTime.toISOString()},${duration}\n`;

    try {
      await fs.appendFile(this.logFile, logEntry);
      console.log(
        `Logged ${this.formatDuration(duration)} for project: ${project_name}`,
      );
      console.log(
        `Time period: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`,
      );
    } catch (error) {
      console.error("Error saving log entry:", error.message);
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
      console.log("Error: Invalid date or time format.");
      return null;
    }

    return targetDate;
  }

  async logs(period, dateForTesting) {
    if (!["day", "week", "month"].includes(period)) {
      console.log("Invalid period. Use: day, week, or month");
      return;
    }

    const entries = await this.getLogEntriesForPeriod(period, dateForTesting);

    if (entries.length === 0) {
      console.log("No entries found for this period.");
      return;
    }

    await this.showInteractiveLogs(entries, period);
  }

  async showInteractiveLogs(entries, period) {
    let currentIndex = 0;
    let scrollOffset = 0;
    const maxVisible = process.stdout.rows - 8; // Leave space for header and footer

    const displayEntries = () => {
      console.clear();
      console.log(`\nInteractive Log Entries - Last ${period}:`);
      console.log("==========================================");
      
      const visibleEntries = entries.slice(scrollOffset, scrollOffset + maxVisible);
      
      visibleEntries.forEach((entry, index) => {
        const globalIndex = scrollOffset + index;
        const isSelected = globalIndex === currentIndex;
        const marker = isSelected ? '> ' : '  ';
        const highlight = isSelected ? '\x1b[7m' : ''; // Reverse video
        const reset = isSelected ? '\x1b[0m' : '';
        
        const startTimeStr = entry.startTime.toLocaleString();
        const endTimeStr = entry.endTime.toLocaleString();
        const durationStr = this.formatDuration(entry.duration);
        
        console.log(`${highlight}${marker}[${globalIndex + 1}] ${entry.project}: ${durationStr} (${startTimeStr} - ${endTimeStr})${reset}`);
      });

      const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
      console.log("\n------------------------------------------");
      console.log(`Total: ${this.formatDuration(totalMinutes)}`);
      console.log("\nControls: ↑/↓ Navigate, 'd' Delete, 'q' Quit");
      
      if (entries.length > maxVisible) {
        const showingStart = scrollOffset + 1;
        const showingEnd = Math.min(scrollOffset + maxVisible, entries.length);
        console.log(`Showing ${showingStart}-${showingEnd} of ${entries.length} entries`);
      }
    };

    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      displayEntries();

      const handleKeypress = async (key) => {
        switch (key) {
          case '\u001b[A': // Up arrow
            if (currentIndex > 0) {
              currentIndex--;
              if (currentIndex < scrollOffset) {
                scrollOffset = Math.max(0, scrollOffset - 1);
              }
              displayEntries();
            }
            break;

          case '\u001b[B': // Down arrow
            if (currentIndex < entries.length - 1) {
              currentIndex++;
              if (currentIndex >= scrollOffset + maxVisible) {
                scrollOffset = Math.min(entries.length - maxVisible, scrollOffset + 1);
              }
              displayEntries();
            }
            break;

          case 'd':
          case 'D':
            if (entries.length > 0) {
              const entryToDelete = entries[currentIndex];
              console.log(`\nDelete this entry?`);
              console.log(`${entryToDelete.project}: ${this.formatDuration(entryToDelete.duration)} (${entryToDelete.startTime.toLocaleString()} - ${entryToDelete.endTime.toLocaleString()})`);
              console.log(`Type 'y' to confirm, any other key to cancel:`);
              
              const confirmKey = await this.waitForKey();
              if (confirmKey.toLowerCase() === 'y') {
                const success = await this.deleteEntryByObject(entryToDelete);
                if (success) {
                  entries.splice(currentIndex, 1);
                  if (currentIndex >= entries.length && entries.length > 0) {
                    currentIndex = entries.length - 1;
                  }
                  if (scrollOffset > 0 && currentIndex < scrollOffset) {
                    scrollOffset = Math.max(0, scrollOffset - 1);
                  }
                  console.log("Entry deleted successfully!");
                  await this.sleep(1000);
                }
              }
              
              if (entries.length === 0) {
                console.clear();
                console.log("No more entries to display.");
                process.stdin.setRawMode(false);
                process.stdin.pause();
                resolve();
                return;
              }
              
              displayEntries();
            }
            break;

          case 'q':
          case 'Q':
          case '\u0003': // Ctrl+C
            console.clear();
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve();
            break;

          default:
            // Ignore other keys
            break;
        }
      };

      process.stdin.on('data', handleKeypress);
    });
  }

  async waitForKey() {
    return new Promise((resolve) => {
      const handler = (key) => {
        process.stdin.removeListener('data', handler);
        resolve(key);
      };
      process.stdin.on('data', handler);
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

      const [project, startTime, endTime, duration] = line.split(",");
      const minutes = parseInt(duration, 10);
      
      if (!isNaN(minutes)) {
        logEntries.push({
          project,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration: minutes,
          originalLine: line
        });
      }
    }

    return logEntries.sort((a, b) => a.startTime - b.startTime);
  }

  async getLogEntriesForPeriod(period, dateForTesting) {
    const allEntries = await this.getAllLogEntries();
    
    if (!["day", "week", "month"].includes(period)) {
      return allEntries;
    }

    const now = dateForTesting ? new Date(dateForTesting) : new Date();
    const cutoffDate = this.getCutoffDate(now, period);

    return allEntries.filter(entry => entry.startTime >= cutoffDate);
  }

  async deleteEntry(index, period = 'month', dateForTesting = null) {
    const entriesForPeriod = await this.getLogEntriesForPeriod(period, dateForTesting);
    
    if (index < 1 || index > entriesForPeriod.length) {
      console.log(`Invalid index. Please use a number between 1 and ${entriesForPeriod.length}.`);
      return false;
    }

    const entryToDelete = entriesForPeriod[index - 1];
    
    const allEntries = await this.getAllLogEntries();
    const filteredEntries = allEntries.filter(entry => entry.originalLine !== entryToDelete.originalLine);

    const header = "project,start_time,end_time,duration_minutes\n";
    const csvContent = header + filteredEntries.map(entry => entry.originalLine).join('\n') + '\n';

    try {
      await fs.writeFile(this.logFile, csvContent);
      console.log(`Deleted entry: ${entryToDelete.project}: ${this.formatDuration(entryToDelete.duration)} (${entryToDelete.startTime.toLocaleString()} - ${entryToDelete.endTime.toLocaleString()})`);
      return true;
    } catch (error) {
      console.error("Error deleting entry:", error.message);
      return false;
    }
  }

  async deleteEntryByObject(entryToDelete) {
    const allEntries = await this.getAllLogEntries();
    const filteredEntries = allEntries.filter(entry => 
      !(entry.project === entryToDelete.project && 
        entry.startTime.getTime() === entryToDelete.startTime.getTime() &&
        entry.endTime.getTime() === entryToDelete.endTime.getTime() &&
        entry.duration === entryToDelete.duration)
    );

    const header = "project,start_time,end_time,duration_minutes\n";
    const csvContent = header + filteredEntries.map(entry => entry.originalLine).join('\n') + '\n';

    try {
      await fs.writeFile(this.logFile, csvContent);
      return true;
    } catch (error) {
      console.error("Error deleting entry:", error.message);
      return false;
    }
  }
}

module.exports = TimeTracker;
