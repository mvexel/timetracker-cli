const assert = require("assert");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const TimeTracker = require("../lib/timetracker");

describe("TimeTracker", () => {
  const testDir = path.join(os.homedir(), ".timetracker-test");
  let tracker;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    tracker = new TimeTracker();
    tracker.configDir = testDir;
    tracker.stateFile = path.join(testDir, "state.json");
    tracker.logFile = path.join(testDir, "timetracker.csv");
    await tracker.initializeLogFile();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should start and stop tracking a project", async () => {
    await tracker.start("test-project");
    let state = await tracker.getState();
    assert.strictEqual(state.project, "test-project");

    await tracker.stop();
    state = await tracker.getState();
    assert.strictEqual(state, null);

    const logContent = await fs.readFile(tracker.logFile, "utf8");
    assert.ok(logContent.includes("test-project"));
  });

  it("should log a time entry", async () => {
    await tracker.log("test-project", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
    const logContent = await fs.readFile(tracker.logFile, "utf8");
    const lines = logContent.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    const [project, , , duration] = lastLine.split(",");
    assert.strictEqual(project, "test-project");
    assert.strictEqual(parseInt(duration, 10), 30);
  });

  it("should provide a daily summary", async () => {
    await tracker.log("test-project", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
    await tracker.log("another-project", { duration: 60, date: "2025-08-16T13:00:00.000Z" });

    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.summary("day", "2025-08-16T14:00:00.000Z");

    // Restore console.log
    console.log = log;

    const lines = output.trim().split("\n");
    const summaryLines = lines.slice(lines.indexOf("===============================") + 1, lines.indexOf("--------------------------------"));

    const summaryData = summaryLines.map(line => {
      const [project, duration] = line.split(": ");
      return { project, duration };
    });

    const anotherProject = summaryData.find(d => d.project === "another-project");
    const testProject = summaryData.find(d => d.project === "test-project");
    const totalLine = lines[lines.length - 1];

    assert.deepStrictEqual(anotherProject, { project: 'another-project', duration: '1h 0m' });
    assert.deepStrictEqual(testProject, { project: 'test-project', duration: '30m' });
    assert.strictEqual(totalLine, "Total: 1h 30m");
  });

  it("should show logs for a time period", async () => {
    await tracker.log("test-project", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
    await tracker.log("another-project", { duration: 60, date: "2025-08-16T13:00:00.000Z" });

    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.logs("day", "2025-08-16T14:00:00.000Z");

    // Restore console.log
    console.log = log;

    assert.ok(output.includes("Log Entries - Last day:"));
    assert.ok(output.includes("test-project: 30m"));
    assert.ok(output.includes("another-project: 1h 0m"));
    assert.ok(output.includes("Total: 1h 30m"));
  });

  it("should handle invalid period in logs command", async () => {
    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.logs("invalid");

    // Restore console.log
    console.log = log;

    assert.strictEqual(output.trim(), "Invalid period. Use: day, week, or month");
  });

  it("should show no entries when no logs exist for period", async () => {
    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.logs("day", "2025-08-16T14:00:00.000Z");

    // Restore console.log
    console.log = log;

    assert.ok(output.includes("Log Entries - Last day:"));
    assert.ok(output.includes("No entries found for this period."));
  });

  it("should sort log entries chronologically", async () => {
    await tracker.log("project-b", { duration: 30, date: "2025-08-16T14:00:00.000Z" });
    await tracker.log("project-a", { duration: 60, date: "2025-08-16T12:00:00.000Z" });

    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.logs("day", "2025-08-16T15:00:00.000Z");

    // Restore console.log
    console.log = log;

    const lines = output.trim().split("\n");
    const entryLines = lines.slice(2, -2); // Skip header and footer

    // The earlier entry (project-a at 12:00) should come before the later one (project-b at 14:00)
    const firstEntryIndex = entryLines.findIndex(line => line.includes("project-a"));
    const secondEntryIndex = entryLines.findIndex(line => line.includes("project-b"));
    
    assert.ok(firstEntryIndex < secondEntryIndex, "Entries should be sorted chronologically");
  });
});
