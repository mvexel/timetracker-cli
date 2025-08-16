#!/usr/bin/env node

const { program } = require("commander");
const TimeTracker = require("../lib/timetracker");

const tracker = new TimeTracker();

program.name("tt").description("Time tracking CLI tool").version("1.0.0");

program
  .command("start <project>")
  .description("Start tracking time for a project")
  .action((project) => {
    tracker.start(project);
  });

program
  .command("stop")
  .description("Stop tracking time")
  .action(() => {
    tracker.stop();
  });

program
  .command("summary <period>")
  .description("Show time summary (day|week|month)")
  .action((period) => {
    tracker.summary(period);
  });

program
  .command("log <project_name> <duration>")
  .description("Log time entry for a project")
  .option("--day <date>", "Start day (YYYY-MM-DD format, defaults to today)")
  .option(
    "--time <time>",
    "Start time (HH:MM format, defaults to now minus duration)",
  )
  .action((project_name, duration, options) => {
    tracker.log(project_name, { ...options, duration: parseInt(duration) });
  });

program.parse();
