#!/usr/bin/env node

const { program } = require("commander");
const TimeTracker = require("../lib/timetracker");

const tracker = new TimeTracker();

program.name("tt").description("Time tracking CLI tool").version("1.0.0");

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
  .command("summary <period>")
  .description("Show time summary (day|week|month)")
  .action(async (period) => {
    await tracker.summary(period);
  });

program
  .command("log <project_name> <duration>")
  .description("Log time entry for a project")
  .option("--day <date>", "Start day (YYYY-MM-DD format, defaults to today)")
  .option(
    "--time <time>",
    "Start time (HH:MM format, defaults to now minus duration)",
  )
  .action(async (project_name, duration, options) => {
    await tracker.log(project_name, { ...options, duration: parseInt(duration) });
  });

program
  .command("logs <period>")
  .description("Show log entries for a time period (day|week|month)")
  .action(async (period) => {
    await tracker.logs(period);
  });

program
  .command("delete <index> [period]")
  .description("Delete a log entry by index number (from logs output)")
  .option("--force", "Skip confirmation prompt")
  .action(async (index, period = 'month', options) => {
    const entryIndex = parseInt(index);
    if (isNaN(entryIndex)) {
      console.log("Error: Index must be a number");
      return;
    }

    const entriesForPeriod = await tracker.getLogEntriesForPeriod(period);
    
    if (entryIndex < 1 || entryIndex > entriesForPeriod.length) {
      console.log(`Invalid index. Please use a number between 1 and ${entriesForPeriod.length}.`);
      console.log(`Run 'tt logs ${period}' to see available entries.`);
      return;
    }

    const entryToDelete = entriesForPeriod[entryIndex - 1];
    
    if (!options.force) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log(`About to delete:`);
      console.log(`[${entryIndex}] ${entryToDelete.project}: ${tracker.formatDuration(entryToDelete.duration)} (${entryToDelete.startTime.toLocaleString()} - ${entryToDelete.endTime.toLocaleString()})`);
      
      const answer = await new Promise((resolve) => {
        rl.question('Are you sure? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Deletion cancelled.');
        return;
      }
    }

    await tracker.deleteEntry(entryIndex, period);
  });

program.parseAsync();
