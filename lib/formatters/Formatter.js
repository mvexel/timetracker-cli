import { TimeCalculator } from '../services/TimeCalculator.js';
import { DateUtils } from '../services/DateUtils.js';

/**
 * Simple unified formatter for console and JSON output
 */
export class Formatter {
  
  /**
   * Output data in the specified format
   */
  static output(data, isJson = false) {
    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      // Data should already be formatted for console output
      if (typeof data === 'string') {
        console.log(data);
      } else if (Array.isArray(data)) {
        data.forEach(line => console.log(line));
      }
    }
  }

  /**
   * Display a table with headers and rows
   */
  static displayTable(headers, rows) {
    if (rows.length === 0) return [];

    // Calculate column widths
    const colWidths = headers.map((header, i) =>
      Math.max(
        header.length,
        ...rows.map(row => String(row[i]).length)
      )
    );

    // Helper to pad cell
    const pad = (str, len) => str + ' '.repeat(len - String(str).length);

    // Create output lines
    const lines = [];
    const headerRow = headers.map((h, i) => pad(h, colWidths[i])).join(' | ');
    lines.push(headerRow);
    lines.push(colWidths.map(w => '-'.repeat(w)).join('-|-'));

    rows.forEach(row => {
      const line = row.map((cell, i) => pad(String(cell), colWidths[i])).join(' | ');
      lines.push(line);
    });

    return lines;
  }

  /**
   * Format tracking start message
   */
  static trackingStart(project, startTime, options = {}, description = null) {
    if (options.json) {
      return {
        operation: {
          type: 'start',
          timestamp: new Date().toISOString(),
          project,
          started_at: startTime,
          description
        }
      };
    }

    let message = `Started tracking "${project}"`;
    if (description) {
      message += ` - ${description}`;
    }
    return message;
  }

  /**
   * Format tracking stop message
   */
  static trackingStop(project, actualDuration, finalDuration, startTime, endTime, options = {}, description = null) {
    if (options.json) {
      return {
        operation: {
          type: 'stop',
          timestamp: new Date().toISOString(),
          project,
          duration_minutes: finalDuration,
          started_at: startTime,
          stopped_at: endTime,
          description
        }
      };
    }

    const lines = [];
    const formattedDuration = TimeCalculator.formatDuration(finalDuration);
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    let message = `Stopped tracking "${project}" - ${formattedDuration}`;
    if (description) {
      message += ` - ${description}`;
    }
    
    lines.push(message);
    lines.push(`From: ${DateUtils.formatForDisplay(startDate)} to ${DateUtils.formatForDisplay(endDate)}`);
    
    // Show rounding notice if actual duration differs from final duration
    if (actualDuration !== finalDuration) {
      lines.push(`(Rounded from ${TimeCalculator.formatDuration(actualDuration)} to nearest 15 minutes)`);
    }

    return lines;
  }

  /**
   * Format status
   */
  static status(currentState, durationMinutes, options = {}) {
    if (options.json) {
      if (!currentState?.project) {
        return {
          status: {
            tracking: false,
            project: null,
            duration_minutes: 0,
            started_at: null
          }
        };
      }
      return {
        status: {
          tracking: true,
          project: currentState.project,
          duration_minutes: durationMinutes,
          started_at: currentState.startTime
        }
      };
    }

    // For non-JSON status, return the formatted string for direct stdout write
    if (!currentState?.project) {
      return '';
    }
    
    return `${currentState.project} (${TimeCalculator.formatDuration(durationMinutes)})`;
  }

  /**
   * Format summary
   */
  static summary(entries, period, options = {}) {
    const projectTotals = {};
    let totalMinutes = 0;

    entries.forEach(entry => {
      const project = entry.project;
      projectTotals[project] = (projectTotals[project] || 0) + entry.duration;
      totalMinutes += entry.duration;
    });

    if (options.json) {
      const projects = Object.entries(projectTotals).map(([name, minutes]) => ({
        name,
        duration_minutes: minutes
      })).sort((a, b) => b.duration_minutes - a.duration_minutes);

      return {
        summary: {
          period,
          project_filter: options.project || null,
          projects,
          total_minutes: totalMinutes,
          total_projects: projects.length
        }
      };
    }

    const lines = [];
    const periodDisplay = TimeCalculator.getPeriodDisplay(period);
    const projectFilter = options.project ? ` (${options.project})` : "";
    
    lines.push(`\nTime Summary - ${periodDisplay}${projectFilter}:`);
    lines.push("================================");

    if (entries.length === 0) {
      lines.push("No time tracked in this period.");
      return lines;
    }

    // Prepare table headers and rows
    const headers = ['Project', 'Duration'];
    const rows = Object.entries(projectTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([project, minutes]) => [project, TimeCalculator.formatDuration(minutes)]);

    lines.push(...this.displayTable(headers, rows));
    lines.push('--------------------------------');
    lines.push(`Total: ${TimeCalculator.formatDuration(totalMinutes)}`);

    return lines;
  }

  /**
   * Format log entries
   */
  static logs(entries, period, options = {}) {
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);

    if (options.json) {
      const jsonEntries = entries.map((entry, index) => ({
        index: index + 1,
        project: entry.project,
        date: entry.date.toISOString().split('T')[0],
        duration_minutes: entry.duration,
        description: entry.description,
        is_manual_entry: entry.isManualEntry
      }));
      
      return {
        logs: {
          period,
          entries: jsonEntries,
          total_minutes: totalMinutes,
          total_entries: jsonEntries.length
        }
      };
    }

    const lines = [];
    const periodDisplay = TimeCalculator.getPeriodDisplay(period);
    lines.push(`Log Entries - ${periodDisplay}\n`);
    
    if (entries.length === 0) {
      lines.push("No entries found for this period.");
      return lines;
    }
    
    // Prepare table headers and rows
    const headers = ['#', 'Project', 'Duration', 'Date', 'Source', 'Description'];
    const rows = entries.map((entry, index) => [
      index + 1,
      entry.project,
      TimeCalculator.formatDuration(entry.duration),
      DateUtils.formatForDisplay(entry.date),
      entry.isManualEntry ? 'manual' : 'session',
      entry.description || ''
    ]);

    lines.push(...this.displayTable(headers, rows));
    lines.push(`\nTotal: ${TimeCalculator.formatDuration(totalMinutes)}`);

    return lines;
  }

  /**
   * Format project list
   */
  static projects(projectStats, options = {}) {
    if (options.json) {
      const projects = Object.entries(projectStats).map(([name, stats]) => ({
        name,
        total_minutes: stats.totalMinutes,
        entry_count: stats.entryCount,
        last_used: stats.lastUsed.toISOString()
      })).sort((a, b) => new Date(b.last_used) - new Date(a.last_used));

      return {
        projects: {
          list: projects,
          total_projects: projects.length,
          total_minutes: projects.reduce((sum, p) => sum + p.total_minutes, 0),
          total_entries: projects.reduce((sum, p) => sum + p.entry_count, 0)
        }
      };
    }

    if (options.raw) {
      // For tab completion - just return project names
      return Object.keys(projectStats).sort();
    }

    if (Object.keys(projectStats).length === 0) {
      return "No projects found.";
    }

    const lines = ["Projects:"];

    // Prepare table headers and rows
    const headers = ['Project', 'Duration', 'Entries', 'Last Used'];
    const rows = Object.entries(projectStats)
      .sort(([, a], [, b]) => b.lastUsed - a.lastUsed)
      .map(([project, stats]) => [
        project,
        TimeCalculator.formatDuration(stats.totalMinutes),
        `${stats.entryCount} entries`,
        DateUtils.formatForDisplay(stats.lastUsed)
      ]);

    lines.push(...this.displayTable(headers, rows));
    return lines;
  }

  /**
   * Format deletion message
   */
  static deletion(deletedEntries, options = {}) {
    const totalMinutes = deletedEntries.reduce((sum, entry) => sum + entry.duration, 0);

    if (options.json) {
      const entries = deletedEntries.map(entry => ({
        project: entry.project,
        date: entry.date.toISOString().split('T')[0],
        duration_minutes: entry.duration,
        description: entry.description
      }));

      return {
        deletion: {
          type: 'entries',
          deleted_count: deletedEntries.length,
          total_minutes_deleted: totalMinutes,
          deleted_entries: entries
        }
      };
    }

    if (deletedEntries.length === 1) {
      const entry = deletedEntries[0];
      const duration = TimeCalculator.formatDuration(entry.duration);
      const date = DateUtils.formatForDisplay(entry.date);
      return `Deleted entry: ${entry.project}: ${duration} (${date})`;
    } else {
      const lines = [];
      const totalDuration = TimeCalculator.formatDuration(totalMinutes);
      lines.push(`Deleted ${deletedEntries.length} entries (${totalDuration} total)`);
      
      // Prepare table headers and rows for multiple entries
      const headers = ['Project', 'Duration', 'Date'];
      const rows = deletedEntries.map(entry => [
        entry.project,
        TimeCalculator.formatDuration(entry.duration),
        DateUtils.formatForDisplay(entry.date)
      ]);

      lines.push(...this.displayTable(headers, rows));
      return lines;
    }
  }

  /**
   * Format project deletion message
   */
  static projectDeletion(projectName, deletedEntries, options = {}) {
    const totalMinutes = deletedEntries.reduce((sum, entry) => sum + entry.duration, 0);

    if (options.json) {
      const entries = deletedEntries.map(entry => ({
        project: entry.project,
        date: entry.date.toISOString().split('T')[0],
        duration_minutes: entry.duration,
        description: entry.description
      }));

      return {
        deletion: {
          type: 'project',
          project_name: projectName,
          deleted_count: deletedEntries.length,
          total_minutes_deleted: totalMinutes,
          deleted_entries: entries
        }
      };
    }

    const totalDuration = TimeCalculator.formatDuration(totalMinutes);
    return `Deleted project "${projectName}" and ${deletedEntries.length} entries (${totalDuration} total)`;
  }

  /**
   * Format manual log entry message
   */
  static logEntry(project, duration, date, options = {}, description = null) {
    if (options.json) {
      return {
        operation: {
          type: 'log',
          timestamp: new Date().toISOString(),
          project,
          duration_minutes: duration,
          date: DateUtils.formatForStorage(date),
          description
        }
      };
    }

    const lines = [];
    let message = `Logged ${TimeCalculator.formatDuration(duration)} for project: ${project}`;
    if (description) {
      message += ` - ${description}`;
    }
    lines.push(message);
    lines.push(`Date: ${DateUtils.formatForDisplay(date)}`);
    return lines;
  }
}
