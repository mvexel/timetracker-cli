#!/usr/bin/env node

const { program } = require("commander");
const TimeTracker = require("../lib/timetracker");

const tracker = new TimeTracker();

program.name("tt").description("Time tracking CLI tool").version("1.0.4");

program
  .command("start <project>")
  .description("Start tracking time for a project")
  .action(async (project) => {
    await tracker.start(project);
  });

program
  .command("stop")
  .description("Stop tracking time")
  .action(async () => {
    await tracker.stop();
  });

program
  .command("summary [period]")
  .description("Show time summary (day|week|month|all, defaults to all)")
  .action(async (period = "all") => {
    await tracker.summary(period);
  });

program
  .command("log <project_name> <duration>")
  .description("Log time entry for a project")
  .option("--day <date>", "Specify the day (YYYY-MM-DD format, defaults to today)")
  .option(
    "--time <time>",
    "End time (HH:MM format, defaults to current time when no day is given)",
  )
  .action(async (project_name, duration, options) => {
    await tracker.log(project_name, { ...options, duration: parseInt(duration) });
  });

program
  .command("logs [period]")
  .description("Show log entries for a time period (day|week|month|all, defaults to all)")
  .action(async (period = "all") => {
    await tracker.logs(period);
  });


program.parseAsync();
