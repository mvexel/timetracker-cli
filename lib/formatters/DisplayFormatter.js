import { TimeCalculator } from '../services/TimeCalculator.js';
import { JSONFormatter } from './JSONFormatter.js';

/**
 * Handles formatting and display of time tracking data
 */
export class DisplayFormatter {
  /**
   * Format and display summary of time entries
   */
  static formatSummary(entries, period, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatSummary(entries, period, options);
      JSONFormatter.output(jsonData);
      return;
    }

    const periodDisplay = TimeCalculator.getPeriodDisplay(period);
    const projectFilter = options.project ? ` (${options.project})` : "";
    
    console.log(`\nTime Summary - ${periodDisplay}${projectFilter}:`);
    console.log("================================");

    if (entries.length === 0) {
      console.log("No time tracked in this period.");
      return;
    }

    // Group entries by project and calculate totals
    const projectTotals = {};
    let totalMinutes = 0;

    entries.forEach(entry => {
      const project = entry.project;
      projectTotals[project] = (projectTotals[project] || 0) + entry.duration;
      totalMinutes += entry.duration;
    });

    // Sort projects by total time (descending)
    Object.entries(projectTotals)
      .sort(([, a], [, b]) => b - a)
      .forEach(([project, minutes]) => {
        console.log(`${project}: ${TimeCalculator.formatDuration(minutes)}`);
      });

    console.log("--------------------------------");
    console.log(`Total: ${TimeCalculator.formatDuration(totalMinutes)}`);
  }

  /**
   * Format and display log entries
   */
  static formatLogs(entries, period, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatLogs(entries, period, options);
      JSONFormatter.output(jsonData);
      return;
    }

    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const periodDisplay = TimeCalculator.getPeriodDisplay(period);
    console.log(`\nLog Entries - ${periodDisplay}:`);
    console.log("==============================");
    
    if (entries.length === 0) {
      console.log("No entries found for this period.");
      return;
    }
    
    entries.forEach((entry, index) => {
      const startTimeStr = entry.startTime.toLocaleString();
      const endTimeStr = entry.endTime.toLocaleString();
      const durationStr = TimeCalculator.formatDuration(entry.duration);
      
      console.log(`[${index + 1}] ${entry.project}: ${durationStr} (${startTimeStr} - ${endTimeStr})`);
    });

    console.log("------------------------------");
    console.log(`Total: ${TimeCalculator.formatDuration(totalMinutes)}`);
  }

  /**
   * Format and display project list with statistics
   */
  static formatProjects(projectStats, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatProjects(projectStats);
      JSONFormatter.output(jsonData);
      return;
    }

    if (Object.keys(projectStats).length === 0) {
      console.log("No projects found.");
      return;
    }

    console.log("\nProjects:");
    console.log("=========");
    
    // Sort projects by last used date (most recent first)
    const sortedProjects = Object.entries(projectStats).sort(([, a], [, b]) => 
      b.lastUsed - a.lastUsed
    );

    sortedProjects.forEach(([project, stats]) => {
      const lastUsed = stats.lastUsed.toLocaleDateString();
      const duration = TimeCalculator.formatDuration(stats.totalMinutes);
      console.log(`${project}: ${duration} (${stats.entryCount} entries, last used: ${lastUsed})`);
    });
  }

  /**
   * Format deletion confirmation message
   */
  static formatDeletionMessage(deletedEntries, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatDeletion(deletedEntries);
      JSONFormatter.output(jsonData);
      return;
    }

    if (deletedEntries.length === 1) {
      const entry = deletedEntries[0];
      const duration = TimeCalculator.formatDuration(entry.duration);
      const startTime = entry.startTime.toLocaleString();
      const endTime = entry.endTime.toLocaleString();
      console.log(`Deleted entry: ${entry.project}: ${duration} (${startTime} - ${endTime})`);
    } else {
      const totalMinutes = deletedEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const totalDuration = TimeCalculator.formatDuration(totalMinutes);
      console.log(`Deleted ${deletedEntries.length} entries (${totalDuration} total)`);
      
      deletedEntries.forEach(entry => {
        const duration = TimeCalculator.formatDuration(entry.duration);
        const startTime = entry.startTime.toLocaleString();
        console.log(`  - ${entry.project}: ${duration} (${startTime})`);
      });
    }
  }

  /**
   * Format project deletion confirmation message
   */
  static formatProjectDeletionMessage(projectName, deletedEntries, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatProjectDeletion(projectName, deletedEntries);
      JSONFormatter.output(jsonData);
      return;
    }

    const totalMinutes = deletedEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalDuration = TimeCalculator.formatDuration(totalMinutes);
    console.log(`Deleted project "${projectName}" and ${deletedEntries.length} entries (${totalDuration} total)`);
  }

  /**
   * Format tracking start message
   */
  static formatTrackingStartMessage(project, startTime, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatOperation('start', { project, startTime });
      JSONFormatter.output(jsonData);
      return;
    }

    console.log(`Started tracking project: ${project} at ${new Date(startTime).toLocaleString()}`);
  }

  /**
   * Format tracking stop message
   */
  static formatTrackingStopMessage(project, duration, startTime, endTime, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatOperation('stop', { 
        project, 
        duration, 
        startTime, 
        endTime 
      });
      JSONFormatter.output(jsonData);
      return;
    }

    console.log(`Stopped tracking project: ${project}`);
    console.log(`Duration: ${TimeCalculator.formatDuration(duration)}`);
  }

  /**
   * Format manual log entry message
   */
  static formatLogEntryMessage(project, duration, startTime, endTime, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatOperation('log', { 
        project, 
        duration, 
        startTime, 
        endTime 
      });
      JSONFormatter.output(jsonData);
      return;
    }

    console.log(`Logged ${TimeCalculator.formatDuration(duration)} for project: ${project}`);
    console.log(`Time period: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);
  }

  /**
   * Format status for JSON output
   */
  static formatStatus(currentState, durationMinutes, options = {}) {
    if (options.json) {
      const jsonData = JSONFormatter.formatStatus(currentState, durationMinutes);
      JSONFormatter.output(jsonData);
      return;
    }

    // For non-JSON status, use existing behavior (direct stdout write)
    if (!currentState?.project) {
      return;
    }
    
    process.stdout.write(`${currentState.project} (${TimeCalculator.formatDuration(durationMinutes)})`);
  }
}