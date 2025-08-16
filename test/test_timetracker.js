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

  it("should handle missing duration in log function", async () => {
    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.log("test-project", {});

    // Restore console.log
    console.log = log;

    assert.strictEqual(output.trim(), "Error: duration is required");
  });

  it("should handle negative duration in log function", async () => {
    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.log("test-project", { duration: -30 });

    // Restore console.log
    console.log = log;

    assert.strictEqual(output.trim(), "Error: Duration must be positive");
  });

  it("should handle zero duration in log function", async () => {
    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.log("test-project", { duration: 0 });

    // Restore console.log
    console.log = log;

    assert.strictEqual(output.trim(), "Error: Duration must be positive");
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

  it("should provide a summary for all time", async () => {
    await tracker.log("old-project", { duration: 45, date: "2025-07-01T12:00:00.000Z" });
    await tracker.log("recent-project", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
    await tracker.log("another-project", { duration: 60, date: "2025-08-16T13:00:00.000Z" });

    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.summary("all", "2025-08-16T14:00:00.000Z");

    // Restore console.log
    console.log = log;

    const lines = output.trim().split("\n");
    
    // Check that the header shows "All Time"
    assert.ok(output.includes("Time Summary - All Time:"));
    
    const summaryLines = lines.slice(lines.indexOf("===============================") + 1, lines.indexOf("--------------------------------"));

    const summaryData = summaryLines.map(line => {
      const [project, duration] = line.split(": ");
      return { project, duration };
    });

    const anotherProject = summaryData.find(d => d.project === "another-project");
    const recentProject = summaryData.find(d => d.project === "recent-project");
    const oldProject = summaryData.find(d => d.project === "old-project");
    const totalLine = lines[lines.length - 1];

    assert.deepStrictEqual(anotherProject, { project: 'another-project', duration: '1h 0m' });
    assert.deepStrictEqual(recentProject, { project: 'recent-project', duration: '30m' });
    assert.deepStrictEqual(oldProject, { project: 'old-project', duration: '45m' });
    assert.strictEqual(totalLine, "Total: 2h 15m");
  });

  it("should handle invalid period in summary command", async () => {
    // Capture console.log output
    let output = "";
    const log = console.log;
    console.log = (msg) => (output += msg + "\n");

    await tracker.summary("invalid");

    // Restore console.log
    console.log = log;

    assert.strictEqual(output.trim(), "Invalid period. Use: day, week, month, or all");
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

    assert.strictEqual(output.trim(), "Invalid period. Use: day, week, month, or all");
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

  describe("Delete functionality", () => {
    it("should show row numbers in logs output", async () => {
      await tracker.log("project-a", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
      await tracker.log("project-b", { duration: 60, date: "2025-08-16T13:00:00.000Z" });

      let output = "";
      const log = console.log;
      console.log = (msg) => (output += msg + "\n");

      await tracker.logs("day", "2025-08-16T14:00:00.000Z");

      console.log = log;

      assert.ok(output.includes("[1] project-a"));
      assert.ok(output.includes("[2] project-b"));
    });

    it("should get all log entries", async () => {
      await tracker.log("project-a", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
      await tracker.log("project-b", { duration: 60, date: "2025-08-16T13:00:00.000Z" });

      const entries = await tracker.getAllLogEntries();
      
      assert.strictEqual(entries.length, 2);
      assert.strictEqual(entries[0].project, "project-a");
      assert.strictEqual(entries[1].project, "project-b");
      assert.strictEqual(entries[0].duration, 30);
      assert.strictEqual(entries[1].duration, 60);
    });

    it("should get log entries for a specific period", async () => {
      await tracker.log("old-project", { duration: 30, date: "2025-08-01T12:00:00.000Z" });
      await tracker.log("new-project", { duration: 60, date: "2025-08-16T13:00:00.000Z" });

      const entries = await tracker.getLogEntriesForPeriod("day", "2025-08-16T14:00:00.000Z");
      
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].project, "new-project");
    });

    it("should delete an entry by index", async () => {
      await tracker.log("project-a", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
      await tracker.log("project-b", { duration: 60, date: "2025-08-16T13:00:00.000Z" });
      await tracker.log("project-c", { duration: 45, date: "2025-08-16T14:00:00.000Z" });

      let output = "";
      const log = console.log;
      console.log = (msg) => (output += msg + "\n");

      const result = await tracker.deleteEntry(2, "day", "2025-08-16T15:00:00.000Z");

      console.log = log;

      assert.strictEqual(result, true);
      assert.ok(output.includes("Deleted entry: project-b"));

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 2);
      assert.strictEqual(remainingEntries[0].project, "project-a");
      assert.strictEqual(remainingEntries[1].project, "project-c");
    });

    it("should handle invalid index when deleting", async () => {
      await tracker.log("project-a", { duration: 30, date: "2025-08-16T12:00:00.000Z" });

      let output = "";
      const log = console.log;
      console.log = (msg) => (output += msg + "\n");

      const result = await tracker.deleteEntry(5, "day", "2025-08-16T15:00:00.000Z");

      console.log = log;

      assert.strictEqual(result, false);
      assert.ok(output.includes("Invalid index"));

      const entries = await tracker.getAllLogEntries();
      assert.strictEqual(entries.length, 1);
    });

    it("should handle deleting from empty logs", async () => {
      let output = "";
      const log = console.log;
      console.log = (msg) => (output += msg + "\n");

      const result = await tracker.deleteEntry(1, "day", "2025-08-16T15:00:00.000Z");

      console.log = log;

      assert.strictEqual(result, false);
      assert.ok(output.includes("Invalid index"));
    });

    it("should preserve CSV header after deletion", async () => {
      await tracker.log("project-a", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
      
      await tracker.deleteEntry(1, "day", "2025-08-16T15:00:00.000Z");

      const logContent = await fs.readFile(tracker.logFile, "utf8");
      const lines = logContent.trim().split("\n");
      
      assert.strictEqual(lines[0], "project,start_time,end_time,duration_minutes");
      assert.strictEqual(lines.length, 1);
    });

    it("should delete correct entry when multiple entries have same project name", async () => {
      await tracker.log("project-a", { duration: 30, date: "2025-08-16T12:00:00.000Z" });
      await tracker.log("project-a", { duration: 60, date: "2025-08-16T13:00:00.000Z" });
      await tracker.log("project-a", { duration: 45, date: "2025-08-16T14:00:00.000Z" });

      await tracker.deleteEntry(2, "day", "2025-08-16T15:00:00.000Z");

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 2);
      assert.strictEqual(remainingEntries[0].duration, 30);
      assert.strictEqual(remainingEntries[1].duration, 45);
    });
  });
});
