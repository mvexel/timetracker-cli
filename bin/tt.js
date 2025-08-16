#!/usr/bin/env node

const { program } = require("commander");
const TimeTracker = require("../lib/timetracker");

const tracker = new TimeTracker();

program.name("tt").description("Time tracking CLI tool").version("2.0.0");

program
  .command("start <project>")
  .description("Start tracking time for a project")
  .action(async (project) => {
    try {
      await tracker.start(project);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("stop")
  .description("Stop tracking time")
  .action(async () => {
    try {
      await tracker.stop();
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("summary [period]")
  .description("Show time summary (day|week|month|all, defaults to all)")
  .action(async (period = "all") => {
    try {
      await tracker.summary(period);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("log <project_name> <duration>")
  .description("Log time entry for a project (duration in minutes)")
  .option("--day <date>", "Specify the day (YYYY-MM-DD format, defaults to today)")
  .option(
    "--time <time>",
    "End time (HH:MM format, defaults to current time when no day is given)",
  )
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
  .description("Show log entries for a time period (day|week|month|all, defaults to all)")
  .action(async (period = "all") => {
    try {
      await tracker.logs(period);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("delete <index> [period]")
  .description("Delete a log entry by index from logs list (period defaults to all)")
  .action(async (index, period = "all") => {
    try {
      const entryIndex = parseInt(index);
      await tracker.deleteEntry(entryIndex, period);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parseAsync().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
