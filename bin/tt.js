#!/usr/bin/env node

import { program } from "commander";
import { TimeTracker } from "../lib/TimeTracker.js";

const tracker = new TimeTracker();

program.name("tt").description("Time tracking CLI tool").version("2.3.1");

program
  .command("start <project>")
  .description("Start tracking time for a project")
  .option("--json", "Output in JSON format")
  .action(async (project, options) => {
    try {
      await tracker.start(project, options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("stop")
  .description("Stop tracking time")
  .option("--json", "Output in JSON format")
  .action(async (options) => {
    try {
      await tracker.stop(options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("summary [period]")
  .description("Show time summary (day|week|month|all, defaults to all)")
  .option("--project <project>", "Show summary for specific project")
  .option("--json", "Output in JSON format")
  .action(async (period = "all", options) => {
    try {
      await tracker.summary(period, null, options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("log <project_name> <duration>")
  .description("Log time entry for a project (duration in minutes)")
  .option(
    "--day <date>",
    "Specify the day (YYYY-MM-DD format, defaults to today)",
  )
  .option(
    "--time <time>",
    "End time (HH:MM format, defaults to current time when no day is given)",
  )
  .option("--json", "Output in JSON format")
  .action(async (project_name, duration, options) => {
    try {
      const parsedDuration = parseInt(duration);
      await tracker.log(project_name, parsedDuration, options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("logs [period]")
  .description(
    "Show log entries for a time period (day|week|month|all, defaults to all)",
  )
  .option(
    "--json",
    "Output in JSON format")
  .action(async (period = "all", options) => {
    try {
      await tracker.logs(period, options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("delete [index] [period]")
  .description(
    "Delete log entries by index or project-based criteria",
  )
  .option("--project <project>", "Delete entries for specific project")
  .option("--last", "Delete the most recent entry (for project if specified)")
  .option("--today", "Delete entries from today (for project if specified)")
  .option("--week", "Delete entries from this week (for project if specified)")
  .option("--month", "Delete entries from this month (for project if specified)")
  .action(async (index, period = "all", options) => {
    try {
      if (options.project || options.last || options.today || options.week || options.month) {
        await tracker.deleteByProject(options);
      } else {
        const entryIndex = parseInt(index);
        await tracker.deleteEntry(entryIndex, period);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("projects")
  .description("List all projects")
  .option("--json", "Output in JSON format")
  .action(async (options) => {
    try {
      await tracker.listProjects(options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("project")
  .description("Project management commands")
  .argument("<action>", "Action: delete")
  .argument("<name>", "Project name")
  .option("--json", "Output in JSON format")
  .action(async (action, name, options) => {
    try {
      if (action === "delete") {
        await tracker.deleteProject(name, options);
      } else {
        throw new Error(`Unknown action: ${action}. Use 'delete'`);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current tracking status for prompt integration")
  .option("--json", "Output in JSON format")
  .action(async (options) => {
    try {
      await tracker.status(options);
    } catch (error) {
      // For prompt integration, we want to fail silently
      process.exit(0);
    }
  });

program
  .command("export")
  .description("Export all time tracking data as CSV to stdout")
  .action(async () => {
    try {
      await tracker.export();
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parseAsync().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
