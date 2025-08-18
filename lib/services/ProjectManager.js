import { TimeCalculator } from './TimeCalculator.js';
import { DisplayFormatter } from '../formatters/DisplayFormatter.js';

/**
 * Handles project-related operations
 */
export class ProjectManager {
  #fileManager;

  constructor(fileManager) {
    this.#fileManager = fileManager;
  }

  /**
   * List all projects with statistics
   */
  async listProjects(options = {}) {
    const allEntries = await this.#fileManager.readAllLogEntries();
    
    if (allEntries.length === 0) {
      DisplayFormatter.formatProjects({}, options);
      return;
    }

    const projectStats = this.#calculateProjectStats(allEntries);
    DisplayFormatter.formatProjects(projectStats, options);
  }

  /**
   * Delete a project and all its entries
   */
  async deleteProject(projectName, options = {}) {
    const allEntries = await this.#fileManager.readAllLogEntries();
    
    const matchingEntries = allEntries.filter(entry => 
      entry.project.toLowerCase() === projectName.toLowerCase()
    );

    if (matchingEntries.length === 0) {
      throw new Error(`Project "${projectName}" not found`);
    }

    const remainingEntries = allEntries.filter(entry => 
      entry.project.toLowerCase() !== projectName.toLowerCase()
    );

    await this.#fileManager.writeLogEntries(remainingEntries);
    DisplayFormatter.formatProjectDeletionMessage(projectName, matchingEntries, options);
  }

  /**
   * Delete entries based on project and time criteria
   */
  async deleteByProject(options) {
    const allEntries = await this.#fileManager.readAllLogEntries();
    
    if (allEntries.length === 0) {
      throw new Error("No log entries found");
    }

    let entriesToDelete = allEntries;

    // Filter by project if specified
    if (options.project) {
      entriesToDelete = TimeCalculator.filterEntriesByProject(entriesToDelete, options.project);
      
      if (entriesToDelete.length === 0) {
        throw new Error(`No entries found for project matching: ${options.project}`);
      }
    }

    // Apply time-based filters
    if (options.last) {
      // Get the most recent entry
      entriesToDelete = [entriesToDelete[entriesToDelete.length - 1]];
    } else if (options.today || options.week || options.month) {
      const now = new Date();
      const period = options.today ? "day" : options.week ? "week" : "month";
      entriesToDelete = TimeCalculator.filterEntriesByPeriod(entriesToDelete, period, now);

      if (entriesToDelete.length === 0) {
        const timeRange = options.today ? "today" : options.week ? "this week" : "this month";
        const projectFilter = options.project ? ` for project matching "${options.project}"` : "";
        throw new Error(`No entries found ${timeRange}${projectFilter}`);
      }
    }

    // Remove the entries to delete from all entries
    const remainingEntries = allEntries.filter(entry => 
      !entriesToDelete.some(deleteEntry => 
        deleteEntry.originalLine === entry.originalLine ||
        (deleteEntry.project === entry.project && 
         deleteEntry.date.getTime() === entry.date.getTime() &&
         deleteEntry.duration === entry.duration)
      )
    );

    await this.#fileManager.writeLogEntries(remainingEntries);
    DisplayFormatter.formatDeletionMessage(entriesToDelete, options);
  }

  /**
   * Calculate statistics for all projects
   */
  #calculateProjectStats(entries) {
    const projectStats = {};

    entries.forEach(entry => {
      const project = entry.project;
      if (!projectStats[project]) {
        projectStats[project] = {
          totalMinutes: 0,
          entryCount: 0,
          lastUsed: entry.date
        };
      }
      
      projectStats[project].totalMinutes += entry.duration;
      projectStats[project].entryCount++;
      
      if (entry.date > projectStats[project].lastUsed) {
        projectStats[project].lastUsed = entry.date;
      }
    });

    return projectStats;
  }
}