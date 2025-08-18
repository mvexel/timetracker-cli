/**
 * Handles JSON formatting of time tracking data
 */
export class JSONFormatter {
  /**
   * Format summary data as JSON
   */
  static formatSummary(entries, period, options = {}) {
    const projectTotals = {};
    let totalMinutes = 0;

    entries.forEach(entry => {
      const project = entry.project;
      projectTotals[project] = (projectTotals[project] || 0) + entry.duration;
      totalMinutes += entry.duration;
    });

    // Convert to array format for easier consumption
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

  /**
   * Format log entries as JSON
   */
  static formatLogs(entries, period, options = {}) {
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
    
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

  /**
   * Format project list as JSON
   */
  static formatProjects(projectStats) {
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

  /**
   * Format tracking status as JSON
   */
  static formatStatus(currentState, durationMinutes) {
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

  /**
   * Format deletion result as JSON
   */
  static formatDeletion(deletedEntries, type = 'entries') {
    const totalMinutes = deletedEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    const entries = deletedEntries.map(entry => ({
      project: entry.project,
      date: entry.date.toISOString().split('T')[0],
      duration_minutes: entry.duration,
      description: entry.description
    }));

    return {
      deletion: {
        type, // 'entries', 'project'
        deleted_count: deletedEntries.length,
        total_minutes_deleted: totalMinutes,
        deleted_entries: entries
      }
    };
  }

  /**
   * Format project deletion result as JSON
   */
  static formatProjectDeletion(projectName, deletedEntries) {
    const result = this.formatDeletion(deletedEntries, 'project');
    result.deletion.project_name = projectName;
    return result;
  }

  /**
   * Format operation result as JSON (for start, stop, log operations)
   */
  static formatOperation(operation, data) {
    const timestamp = new Date().toISOString();
    
    switch (operation) {
      case 'start':
        return {
          operation: {
            type: 'start',
            timestamp,
            project: data.project,
            started_at: data.startTime
          }
        };
        
      case 'stop':
        return {
          operation: {
            type: 'stop',
            timestamp,
            project: data.project,
            duration_minutes: data.duration,
            started_at: data.startTime,
            stopped_at: data.endTime
          }
        };
        
      case 'log':
        return {
          operation: {
            type: 'log',
            timestamp,
            project: data.project,
            duration_minutes: data.duration,
            start_time: data.startTime.toISOString(),
            end_time: data.endTime.toISOString()
          }
        };
        
      default:
        return {
          operation: {
            type: operation,
            timestamp,
            data
          }
        };
    }
  }

  /**
   * Format error as JSON
   */
  static formatError(error, command = null) {
    return {
      error: {
        message: error.message,
        command,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Output JSON to console with optional pretty printing
   */
  static output(data, pretty = true) {
    console.log(JSON.stringify(data, null, pretty ? 2 : 0));
  }
}