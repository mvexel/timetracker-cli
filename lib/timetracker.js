const fs = require("fs");
const path = require("path");
const os = require("os");

class TimeTracker {
  constructor() {
    this.configDir = path.join(os.homedir(), ".timetracker");
    this.stateFile = path.join(this.configDir, "state.json");
    this.logFile = path.join(this.configDir, "timetracker.csv");

    this.ensureConfigDir();
    this.initializeLogFile();
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  initializeLogFile() {
    if (!fs.existsSync(this.logFile)) {
      const header = "project,start_time,end_time,duration_minutes\n";
      fs.writeFileSync(this.logFile, header);
    }
  }

  getState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading state file:", error.message);
    }
    return null;
  }

  saveState(state) {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error("Error saving state file:", error.message);
    }
  }

  clearState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        fs.unlinkSync(this.stateFile);
      }
    } catch (error) {
      console.error("Error clearing state file:", error.message);
    }
  }

  start(project) {
    const currentState = this.getState();

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

    this.saveState(state);
    console.log(
      `Started tracking project: ${project} at ${new Date(startTime).toLocaleString()}`,
    );
  }

  stop() {
    const currentState = this.getState();

    if (!currentState || !currentState.project) {
      console.log("No active tracking session found.");
      return;
    }

    const endTime = new Date();
    const startTime = new Date(currentState.startTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    const logEntry = `${currentState.project},${currentState.startTime},${endTime.toISOString()},${durationMinutes}\n`;

    try {
      fs.appendFileSync(this.logFile, logEntry);
      console.log(`Stopped tracking project: ${currentState.project}`);
      console.log(`Duration: ${this.formatDuration(durationMinutes)}`);

      this.clearState();
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

  summary(period) {
    if (!["day", "week", "month"].includes(period)) {
      console.log("Invalid period. Use: day, week, or month");
      return;
    }

    try {
      if (!fs.existsSync(this.logFile)) {
        console.log("No time tracking data found.");
        return;
      }

      const data = fs.readFileSync(this.logFile, "utf8");
      const lines = data
        .split("\n")
        .slice(1)
        .filter((line) => line.trim());

      const now = new Date();
      const cutoffDate = this.getCutoffDate(now, period);

      const projectTotals = {};
      let totalMinutes = 0;

      lines.forEach((line) => {
        const [project, startTime, endTime, duration] = line.split(",");
        const entryDate = new Date(startTime);

        if (entryDate >= cutoffDate) {
          const minutes = parseInt(duration);
          projectTotals[project] = (projectTotals[project] || 0) + minutes;
          totalMinutes += minutes;
        }
      });

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
    } catch (error) {
      console.error("Error reading log file:", error.message);
    }
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

  log(project_name, options = {}) {
    if (!options.duration) {
      console.log("Error: duration is required");
      return;
    }

    const duration = options.duration;
    if (duration <= 0) {
      console.log("Error: Duration must be positive");
      return;
    }

    const endTime = this.parseDateTime(options.day, options.time);
    if (!endTime) {
      return;
    }

    const startTime = new Date(endTime.getTime() - duration * 60 * 1000);

    const logEntry = `${project_name},${startTime.toISOString()},${endTime.toISOString()},${duration}\n`;

    try {
      fs.appendFileSync(this.logFile, logEntry);
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

  parseDateTime(dayOption, timeOption) {
    let targetDate;

    if (dayOption) {
      const dateMatch = dayOption.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        console.log("Error: Invalid date format. Use YYYY-MM-DD");
        return null;
      }

      const [, year, month, day] = dateMatch;
      targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isNaN(targetDate.getTime())) {
        console.log("Error: Invalid date");
        return null;
      }
    } else {
      targetDate = new Date();
    }

    if (timeOption) {
      const timeMatch = timeOption.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        console.log("Error: Invalid time format. Use HH:MM");
        return null;
      }

      const [, hours, minutes] = timeMatch;
      const hour = parseInt(hours);
      const minute = parseInt(minutes);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.log("Error: Invalid time values");
        return null;
      }

      targetDate.setHours(hour, minute, 0, 0);
    }

    return targetDate;
  }
}

module.exports = TimeTracker;
