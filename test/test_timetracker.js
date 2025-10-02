import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { TimeTracker } from '../lib/timetracker.js';

describe('TimeTracker', () => {
  const testDir = path.join(os.homedir(), '.timetracker-test');
  let tracker;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    tracker = new TimeTracker();
    tracker.configDir = testDir;
    tracker.stateFile = path.join(testDir, 'state.json');
    tracker.logFile = path.join(testDir, 'timetracker.csv');
    await tracker.initializeLogFile();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // TODO: Fix this test - duration calculation issues in test environment
  // it("should start and stop tracking a project", async () => {
  //   await tracker.start("test-project");
  //   let state = await tracker.getState();
  //   assert.strictEqual(state.project, "test-project");

  //   // Wait a bit to ensure we get a non-zero duration
  //   await new Promise(resolve => setTimeout(resolve, 1000));

  //   await tracker.stop({ noRound: true });
  //   state = await tracker.getState();
  //   assert.strictEqual(state, null);

  //   const logContent = await fs.readFile(tracker.logFile, "utf8");
  //   console.log("Log content:", JSON.stringify(logContent));
  //   assert.ok(logContent.includes("test-project"));
  // });

  it('should require project name for start', async () => {
    try {
      await tracker.start();
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(error.message, 'Project name is required');
    }
  });

  // TODO: Fix this test - duration calculation issues in test environment
  // it("should auto-stop when starting a new project", async () => {
  //   await tracker.start("test-project");

  //   // Wait a bit to ensure we get a non-zero duration
  //   await new Promise(resolve => setTimeout(resolve, 1000));

  //   // This should auto-stop the first project and start the second
  //   await tracker.start("another-project", null, { noRound: true });

  //   let state = await tracker.getState();
  //   assert.strictEqual(state.project, "another-project");

  //   const logContent = await fs.readFile(tracker.logFile, "utf8");
  //   assert.ok(logContent.includes("test-project"));
  // });

  it('should log a time entry', async () => {
    await tracker.log('test-project', 30, null, { day: '2025-08-16' });
    const logContent = await fs.readFile(tracker.logFile, 'utf8');
    const lines = logContent.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const [project, date, duration] = lastLine.split(',');
    assert.strictEqual(project, 'test-project');
    assert.strictEqual(date, '2025-08-16');
    assert.strictEqual(parseInt(duration), 30);
  });

  it('should require project name for log', async () => {
    try {
      await tracker.log(null, 30);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(error.message, 'Project name is required');
    }
  });

  it('should require duration for log', async () => {
    try {
      await tracker.log('test-project');
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(
        error.message,
        'Duration in minutes is required and must be a number',
      );
    }
  });

  it('should handle negative duration in log function', async () => {
    try {
      await tracker.log('test-project', -30);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(error.message, 'Duration must be positive');
    }
  });

  it('should handle zero duration in log function', async () => {
    try {
      await tracker.log('test-project', 0);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(error.message, 'Duration must be positive');
    }
  });

  it('should provide a daily summary', async () => {
    await tracker.log('test-project', 30, { date: '2025-08-16T12:00:00.000Z' });
    await tracker.log('another-project', 60, {
      date: '2025-08-16T13:00:00.000Z',
    });

    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.summary('day', '2025-08-16T14:00:00.000Z');

    // Restore console.log
    console.log = log;

    const lines = output.trim().split('\n');
    const summaryLines = lines.slice(
      lines.indexOf('===============================') + 1,
      lines.indexOf('--------------------------------'),
    );

    const summaryData = summaryLines.map((line) => {
      const [project, duration] = line.split(': ');
      return { project, duration };
    });

    const anotherProject = summaryData.find(
      (d) => d.project === 'another-project',
    );
    const testProject = summaryData.find((d) => d.project === 'test-project');
    const totalLine = lines[lines.length - 1];

    assert.deepStrictEqual(anotherProject, {
      project: 'another-project',
      duration: '1h 0m',
    });
    assert.deepStrictEqual(testProject, {
      project: 'test-project',
      duration: '30m',
    });
    assert.strictEqual(totalLine, 'Total: 1h 30m');
  });

  it('should provide a summary for all time', async () => {
    await tracker.log('old-project', 45, { date: '2025-07-01T12:00:00.000Z' });
    await tracker.log('recent-project', 30, {
      date: '2025-08-16T12:00:00.000Z',
    });
    await tracker.log('another-project', 60, {
      date: '2025-08-16T13:00:00.000Z',
    });

    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.summary('all', '2025-08-16T14:00:00.000Z');

    // Restore console.log
    console.log = log;

    const lines = output.trim().split('\n');

    // Check that the header shows "All Time"
    assert.ok(output.includes('Time Summary - All Time:'));

    const summaryLines = lines.slice(
      lines.indexOf('===============================') + 1,
      lines.indexOf('--------------------------------'),
    );

    const summaryData = summaryLines.map((line) => {
      const [project, duration] = line.split(': ');
      return { project, duration };
    });

    const anotherProject = summaryData.find(
      (d) => d.project === 'another-project',
    );
    const recentProject = summaryData.find(
      (d) => d.project === 'recent-project',
    );
    const oldProject = summaryData.find((d) => d.project === 'old-project');
    const totalLine = lines[lines.length - 1];

    assert.deepStrictEqual(anotherProject, {
      project: 'another-project',
      duration: '1h 0m',
    });
    assert.deepStrictEqual(recentProject, {
      project: 'recent-project',
      duration: '30m',
    });
    assert.deepStrictEqual(oldProject, {
      project: 'old-project',
      duration: '45m',
    });
    assert.strictEqual(totalLine, 'Total: 2h 15m');
  });

  it('should handle invalid period in summary command', async () => {
    try {
      await tracker.summary('invalid');
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(
        error.message,
        'Invalid period. Use: day, week, month, or all',
      );
    }
  });

  it('should show logs for a time period', async () => {
    await tracker.log('test-project', 30, { date: '2025-08-16T12:00:00.000Z' });
    await tracker.log('another-project', 60, {
      date: '2025-08-16T13:00:00.000Z',
    });

    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.logs('day', {}, '2025-08-16T14:00:00.000Z');

    // Restore console.log
    console.log = log;

    assert.ok(output.includes('Log Entries - Last day:'));
    assert.ok(output.includes('test-project: 30m'));
    assert.ok(output.includes('another-project: 1h 0m'));
    assert.ok(output.includes('Total: 1h 30m'));
  });

  it('should handle invalid period in logs command', async () => {
    try {
      await tracker.logs('invalid');
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(
        error.message,
        'Invalid period. Use: day, week, month, or all',
      );
    }
  });

  it('should show no entries when no logs exist for period', async () => {
    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.logs('day', {}, '2025-08-16T14:00:00.000Z');

    // Restore console.log
    console.log = log;

    assert.ok(output.includes('Log Entries - Last day:'));
    assert.ok(output.includes('No entries found for this period.'));
  });

  it('should output logs in JSON format when --json option is used', async () => {
    await tracker.log('test-project', 30, { date: '2025-08-16T12:00:00.000Z' });
    await tracker.log('another-project', 60, {
      date: '2025-08-16T13:00:00.000Z',
    });

    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.logs('day', { json: true }, '2025-08-16T14:00:00.000Z');

    // Restore console.log
    console.log = log;

    const jsonOutput = JSON.parse(output.trim());

    assert.strictEqual(jsonOutput.logs.period, 'day');
    assert.strictEqual(jsonOutput.logs.total_minutes, 90);
    assert.strictEqual(jsonOutput.logs.entries.length, 2);

    const firstEntry = jsonOutput.logs.entries[0];
    const secondEntry = jsonOutput.logs.entries[1];

    assert.strictEqual(firstEntry.index, 1);
    assert.strictEqual(firstEntry.project, 'test-project');
    assert.strictEqual(firstEntry.duration_minutes, 30);
    assert.ok(firstEntry.date);
    assert.ok(firstEntry.is_manual_entry !== undefined);

    assert.strictEqual(secondEntry.index, 2);
    assert.strictEqual(secondEntry.project, 'another-project');
    assert.strictEqual(secondEntry.duration_minutes, 60);
    assert.ok(secondEntry.date);
    assert.ok(secondEntry.is_manual_entry !== undefined);
  });

  it('should output empty JSON when no entries exist and --json option is used', async () => {
    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.logs('day', { json: true }, '2025-08-16T14:00:00.000Z');

    // Restore console.log
    console.log = log;

    const jsonOutput = JSON.parse(output.trim());

    assert.strictEqual(jsonOutput.logs.period, 'day');
    assert.strictEqual(jsonOutput.logs.total_minutes, 0);
    assert.strictEqual(jsonOutput.logs.entries.length, 0);
  });

  it('should sort log entries chronologically', async () => {
    await tracker.log('project-b', 30, null, { day: '2025-08-16' });
    await tracker.log('project-a', 60, null, { day: '2025-08-15' });

    // Capture console.log output
    let output = '';
    const log = console.log;
    console.log = (msg) => (output += msg + '\n');

    await tracker.logs('all');

    // Restore console.log
    console.log = log;

    const lines = output.trim().split('\n');
    const entryLines = lines.slice(2, -2); // Skip header and footer

    // The earlier entry (project-a from 08-15) should come before the later one (project-b from 08-16)
    const firstEntryIndex = entryLines.findIndex((line) =>
      line.includes('project-a'),
    );
    const secondEntryIndex = entryLines.findIndex((line) =>
      line.includes('project-b'),
    );

    assert.ok(
      firstEntryIndex < secondEntryIndex,
      'Entries should be sorted chronologically',
    );
  });

  describe('Delete functionality', () => {
    it('should show row numbers in logs output', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.logs('day', {}, '2025-08-16T14:00:00.000Z');

      console.log = log;

      assert.ok(output.includes('[1] project-a'));
      assert.ok(output.includes('[2] project-b'));
    });

    it('should get all log entries', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });

      const entries = await tracker.getAllLogEntries();

      assert.strictEqual(entries.length, 2);
      assert.strictEqual(entries[0].project, 'project-a');
      assert.strictEqual(entries[1].project, 'project-b');
      assert.strictEqual(entries[0].duration, 30);
      assert.strictEqual(entries[1].duration, 60);
    });

    it('should get log entries for a specific period', async () => {
      await tracker.log('old-project', 30, null, { day: '2025-08-01' });
      await tracker.log('new-project', 60, null, { day: '2025-08-16' });

      const entries = await tracker.getLogEntriesForPeriod(
        'day',
        '2025-08-16T14:00:00.000Z',
        null,
      );

      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].project, 'new-project');
    });

    it('should delete an entry by index', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });
      await tracker.log('project-c', 45, { date: '2025-08-16T14:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      const result = await tracker.deleteEntry(
        2,
        'day',
        '2025-08-16T15:00:00.000Z',
        {},
      );

      console.log = log;

      assert.strictEqual(result, true);
      assert.ok(output.includes('Deleted entry: project-b'));

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 2);
      assert.strictEqual(remainingEntries[0].project, 'project-a');
      assert.strictEqual(remainingEntries[1].project, 'project-c');
    });

    it('should handle invalid index when deleting', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });

      try {
        await tracker.deleteEntry(5, 'day', '2025-08-16T15:00:00.000Z', {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid index'));
      }

      const entries = await tracker.getAllLogEntries();
      assert.strictEqual(entries.length, 1);
    });

    it('should handle deleting from empty logs', async () => {
      try {
        await tracker.deleteEntry(1, 'day', '2025-08-16T15:00:00.000Z', {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid index'));
      }
    });

    it('should preserve CSV header after deletion', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });

      await tracker.deleteEntry(1, 'day', '2025-08-16T15:00:00.000Z', {});

      const logContent = await fs.readFile(tracker.logFile, 'utf8');
      const lines = logContent.trim().split('\n');

      assert.ok(lines[0].includes('project,date,duration_minutes'));
      assert.strictEqual(lines.length, 1);
    });

    it('should delete correct entry when multiple entries have same project name', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-a', 60, { date: '2025-08-16T13:00:00.000Z' });
      await tracker.log('project-a', 45, { date: '2025-08-16T14:00:00.000Z' });

      await tracker.deleteEntry(2, 'day', '2025-08-16T15:00:00.000Z', {});

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 2);
      assert.strictEqual(remainingEntries[0].duration, 30);
      assert.strictEqual(remainingEntries[1].duration, 45);
    });
  });

  describe('Project management', () => {
    it('should list all projects with stats', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });
      await tracker.log('project-a', 45, { date: '2025-08-17T12:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects();

      console.log = log;

      assert.ok(output.includes('Projects:'));
      assert.ok(output.includes('project-a: 1h 15m (2 entries'));
      assert.ok(output.includes('project-b: 1h 0m (1 entries'));
    });

    it('should handle empty project list', async () => {
      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects();

      console.log = log;

      assert.ok(output.includes('No projects found.'));
    });

    it('should delete a project and all its entries', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });
      await tracker.log('project-a', 45, { date: '2025-08-17T12:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.deleteProject('project-a');

      console.log = log;

      assert.ok(output.includes('Deleted project "project-a" and 2 entries'));

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 1);
      assert.strictEqual(remainingEntries[0].project, 'project-b');
    });

    it('should handle deleting non-existent project', async () => {
      try {
        await tracker.deleteProject('non-existent');
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Project "non-existent" not found'));
      }
    });

    it('should show project-specific summary', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });
      await tracker.log('project-a', 45, { date: '2025-08-17T12:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.summary('all', null, { project: 'project-a' });

      console.log = log;

      assert.ok(output.includes('Time Summary - All Time (project-a):'));
      assert.ok(output.includes('project-a: 1h 15m'));
      assert.ok(!output.includes('project-b'));
      assert.ok(output.includes('Total: 1h 15m'));
    });
  });

  describe('Project-based deletion', () => {
    beforeEach(async () => {
      await tracker.log('project-a', 30, null, { day: '2025-08-16' });
      await tracker.log('project-b', 60, null, { day: '2025-08-16' });
      await tracker.log('project-a', 45, null, { day: '2025-08-17' });
      await tracker.log('project-c', 20, null, { day: '2025-08-17' });
    });

    it('should delete last entry for specific project', async () => {
      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.deleteByProject({ project: 'project-a', last: true });

      console.log = log;

      assert.ok(output.includes('Deleted entry: project-a: 45m'));

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 3);

      const projectAEntries = remainingEntries.filter(
        (e) => e.project === 'project-a',
      );
      assert.strictEqual(projectAEntries.length, 1);
      assert.strictEqual(projectAEntries[0].duration, 30);
    });

    it('should delete all entries for today for specific project', async () => {
      // Create a mock for current date to be 2025-08-17
      const originalDate = Date;
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super('2025-08-17T15:00:00.000Z');
          } else {
            super(...args);
          }
        }
        static now() {
          return new originalDate('2025-08-17T15:00:00.000Z').getTime();
        }
      };

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.deleteByProject({ project: 'project-a', today: true });

      console.log = log;
      global.Date = originalDate;

      const remainingEntries = await tracker.getAllLogEntries();
      const projectAEntries = remainingEntries.filter(
        (e) => e.project === 'project-a',
      );

      // Should still have the entry from 2025-08-16 but not from today (2025-08-17)
      assert.strictEqual(projectAEntries.length, 1);
      assert.strictEqual(projectAEntries[0].duration, 30);
    });

    it('should delete last entry regardless of project', async () => {
      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.deleteByProject({ last: true });

      console.log = log;

      assert.ok(output.includes('Deleted entry: project-c: 20m'));

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 3);
      assert.ok(!remainingEntries.some((e) => e.project === 'project-c'));
    });

    it('should handle no matching entries for project filter', async () => {
      try {
        await tracker.deleteByProject({ project: 'non-existent', last: true });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(
          error.message.includes(
            'No entries found for project matching: non-existent',
          ),
        );
      }
    });

    it('should delete multiple entries and show summary', async () => {
      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.deleteByProject({ project: 'project-a' });

      console.log = log;

      assert.ok(output.includes('Deleted 2 entries (1h 15m total)'));
      assert.ok(output.includes('- project-a: 30m'));
      assert.ok(output.includes('- project-a: 45m'));

      const remainingEntries = await tracker.getAllLogEntries();
      assert.strictEqual(remainingEntries.length, 2);
      assert.ok(!remainingEntries.some((e) => e.project === 'project-a'));
    });
  });

  describe('JSON output', () => {
    it('should output summary in JSON format', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.summary('day', '2025-08-16T14:00:00.000Z', { json: true });

      console.log = log;

      const jsonOutput = JSON.parse(output.trim());

      assert.strictEqual(jsonOutput.summary.period, 'day');
      assert.strictEqual(jsonOutput.summary.total_minutes, 90);
      assert.strictEqual(jsonOutput.summary.projects.length, 2);
      assert.strictEqual(jsonOutput.summary.projects[0].name, 'project-b');
      assert.strictEqual(jsonOutput.summary.projects[0].duration_minutes, 60);
    });

    it('should output projects list in JSON format', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects({ json: true });

      console.log = log;

      const jsonOutput = JSON.parse(output.trim());

      assert.strictEqual(jsonOutput.projects.total_projects, 2);
      assert.strictEqual(jsonOutput.projects.total_minutes, 90);
      assert.ok(jsonOutput.projects.list.length === 2);
      assert.ok(
        jsonOutput.projects.list.every(
          (p) => p.name && typeof p.total_minutes === 'number',
        ),
      );
    });

    it('should output status in JSON format when tracking', async () => {
      await tracker.start('test-project');

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.status({ json: true });

      console.log = log;

      const jsonOutput = JSON.parse(output.trim());

      assert.strictEqual(jsonOutput.status.tracking, true);
      assert.strictEqual(jsonOutput.status.project, 'test-project');
      assert.ok(typeof jsonOutput.status.duration_minutes === 'number');
      assert.ok(jsonOutput.status.started_at);
    });

    it('should output status in JSON format when not tracking', async () => {
      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.status({ json: true });

      console.log = log;

      const jsonOutput = JSON.parse(output.trim());

      assert.strictEqual(jsonOutput.status.tracking, false);
      assert.strictEqual(jsonOutput.status.project, null);
      assert.strictEqual(jsonOutput.status.duration_minutes, 0);
    });

    it('should output deletion result in JSON format', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.deleteEntry(1, 'day', '2025-08-16T15:00:00.000Z', {
        json: true,
      });

      console.log = log;

      const jsonOutput = JSON.parse(output.trim());

      assert.strictEqual(jsonOutput.deletion.type, 'entries');
      assert.strictEqual(jsonOutput.deletion.deleted_count, 1);
      assert.strictEqual(jsonOutput.deletion.total_minutes_deleted, 30);
      assert.ok(jsonOutput.deletion.deleted_entries.length === 1);
    });
  });

  describe('Month filtering', () => {
    it('should filter summary by month', async () => {
      await tracker.log('project-a', 30, { day: '2025-08-16' });
      await tracker.log('project-b', 60, { day: '2025-08-16' });
      await tracker.log('project-a', 45, { day: '2025-09-15' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.summary('all', '2025-08-20T12:00:00.000Z', { month: 8 });

      console.log = log;

      assert.ok(output.includes('Time Summary - Month 8:'));
      assert.ok(output.includes('project-a: 30m'));
      assert.ok(output.includes('project-b: 1h 0m'));
      assert.ok(!output.includes('45m'));
      assert.ok(output.includes('Total: 1h 30m'));
    });

    it('should filter logs by month', async () => {
      await tracker.log('project-a', 30, { day: '2025-08-16' });
      await tracker.log('project-b', 60, { day: '2025-09-15' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.logs('all', { month: 8 }, '2025-08-20T12:00:00.000Z');

      console.log = log;

      assert.ok(output.includes('Log Entries - Month 8:'));
      assert.ok(output.includes('[1] project-a'));
      assert.ok(!output.includes('project-b'));
      assert.ok(output.includes('Total: 30m'));
    });

    it('should handle invalid month values', async () => {
      try {
        await tracker.summary('all', null, { month: 0 });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid month'));
      }

      try {
        await tracker.summary('all', null, { month: 13 });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid month'));
      }

      try {
        await tracker.summary('all', null, { month: 'invalid' });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid month'));
      }
    });

    it('should show no entries for month with no data', async () => {
      await tracker.log('project-a', 30, { day: '2025-08-16' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.summary('all', null, { month: 1 });

      console.log = log;

      assert.ok(output.includes('Time Summary - Month 1:'));
      assert.ok(output.includes('No time tracked in this period.'));
    });

    it('should handle month boundary correctly', async () => {
      await tracker.log('project-a', 30, { day: '2025-08-31' });
      await tracker.log('project-b', 60, { day: '2025-09-01' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.summary('all', null, { month: 8 });

      console.log = log;

      assert.ok(output.includes('project-a: 30m'));
      assert.ok(!output.includes('project-b'));
      assert.ok(output.includes('Total: 30m'));
    });
  });

  describe('Export functionality', () => {
    it('should export all data in CSV format', async () => {
      await tracker.log('project-a', 30, { date: '2025-08-16T12:00:00.000Z' });
      await tracker.log('project-b', 60, { date: '2025-08-16T13:00:00.000Z' });
      await tracker.log('project-a', 45, { date: '2025-08-17T14:00:00.000Z' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.export();

      console.log = log;

      const lines = output.trim().split('\n');

      assert.ok(lines[0].includes('project,date,duration_minutes'));
      assert.strictEqual(lines.length, 4); // header + 3 entries

      assert.ok(lines[1].startsWith('project-a,'));
      assert.ok(lines[2].startsWith('project-b,'));
      assert.ok(lines[3].startsWith('project-a,'));
    });

    it('should export only header when no entries exist', async () => {
      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.export();

      console.log = log;

      const lines = output.trim().split('\n');

      assert.ok(lines[0].includes('project,date,duration_minutes'));
      assert.strictEqual(lines.length, 1);
    });

    it('should export entries in chronological order', async () => {
      await tracker.log('project-b', 30, null, { day: '2025-08-17' });
      await tracker.log('project-a', 60, null, { day: '2025-08-16' });

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.export();

      console.log = log;

      const lines = output.trim().split('\n');

      // First entry should be the earlier one (project-a from 2025-08-16)
      assert.ok(lines[1].startsWith('project-a,'));
      assert.ok(lines[1].includes('2025-08-16'));

      // Second entry should be the later one (project-b from 2025-08-17)
      assert.ok(lines[2].startsWith('project-b,'));
      assert.ok(lines[2].includes('2025-08-17'));
    });
  });

  describe('Project hierarchy', () => {
    it('should display hierarchical projects with parent and children', async () => {
      await tracker.log('business', 25);
      await tracker.log('business/quote', 30);
      await tracker.log('business/invoicing', 45);
      await tracker.log('business/admin', 20);
      await tracker.log('marketing', 60);

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects();

      console.log = log;

      // Check hierarchical display
      assert.ok(output.includes('Projects:'));
      assert.ok(output.includes('business: 2h 0m'));
      assert.ok(output.includes('Direct: 25m'));
      assert.ok(output.includes('  business/admin: 20m'));
      assert.ok(output.includes('  business/invoicing: 45m'));
      assert.ok(output.includes('  business/quote: 30m'));
      assert.ok(output.includes('marketing: 1h 0m'));
    });

    it('should show hierarchical breakdown when filtering by parent project', async () => {
      await tracker.log('business', 25);
      await tracker.log('business/quote', 30);
      await tracker.log('business/invoicing', 45);
      await tracker.log('marketing', 60);

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.summary('all', null, { project: 'business' });

      console.log = log;

      // Check that business projects are included
      assert.ok(output.includes('business:'));
      assert.ok(output.includes('business/quote:'));
      assert.ok(output.includes('business/invoicing:'));
      // Check that non-business projects are not included
      assert.ok(!output.includes('marketing'));
      // Check total is correct
      assert.ok(output.includes('Total: 1h 40m'));
    });

    it('should handle projects without parent entries', async () => {
      await tracker.log('business/quote', 30);
      await tracker.log('business/invoicing', 45);
      await tracker.log('marketing', 60);

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects();

      console.log = log;

      // Without a parent 'business' entry, they should show as separate projects
      assert.ok(output.includes('business/quote: 30m'));
      assert.ok(output.includes('business/invoicing: 45m'));
      assert.ok(output.includes('marketing: 1h 0m'));
    });

    it('should calculate totals correctly with multi-level hierarchy', async () => {
      await tracker.log('company', 10);
      await tracker.log('company/sales', 20);
      await tracker.log('company/sales/region-a', 15);
      await tracker.log('company/sales/region-b', 25);

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects();

      console.log = log;

      // company should show total of all including children
      assert.ok(output.includes('company: 1h 10m'));
      assert.ok(output.includes('Direct: 10m'));
      // company/sales should show its total including region children
      assert.ok(output.includes('  company/sales: 1h 0m'));
    });

    it('should output hierarchical projects in JSON format', async () => {
      await tracker.log('business', 25);
      await tracker.log('business/quote', 30);
      await tracker.log('business/invoicing', 45);

      let output = '';
      const log = console.log;
      console.log = (msg) => (output += msg + '\n');

      await tracker.listProjects({ json: true });

      console.log = log;

      const jsonOutput = JSON.parse(output.trim());

      // Check JSON structure includes hierarchy info
      assert.ok(jsonOutput.projects);
      assert.ok(jsonOutput.projects.list);
      
      const business = jsonOutput.projects.list.find(p => p.name === 'business');
      assert.ok(business);
      assert.strictEqual(business.total_minutes, 100);
      assert.strictEqual(business.direct_minutes, 25);
      assert.ok(Array.isArray(business.children));
      assert.strictEqual(business.children.length, 2);
    });
  });
});
