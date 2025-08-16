# timetracker-cli

A simple command line time tracking tool for developers.

## Installation

```bash
npm install -g @mvexel/timetracker-cli
```

## Usage

### Start tracking time for a project
```bash
tt start <project_name>
```

Project name is required.

### Stop tracking time
```bash
tt stop
```

### Log a time entry manually
```bash
tt log <project_name> <duration_in_minutes>
```

Both project name and duration are required.

**Options:**
- `--day <date>`: Specify the day (YYYY-MM-DD format, defaults to today)
- `--time <time>`: Specify the end time (HH:MM format, defaults to current time when no day is given)

**Examples:**
```bash
# Start tracking a project
tt start my-project

# Log 30 minutes for "my-project" ending now
tt log my-project 30

# Log 45 minutes for "website" ending at 3:30 PM today
tt log website 45 --time 15:30

# Log 60 minutes for "app" ending at 2:00 PM on a specific date
tt log app 60 --day 2025-08-15 --time 14:00
```

### View time tracking summary by project
```bash
tt summary [period]
```

Where `[period]` can be:
- `day`: Today's summary
- `week`: This week's summary
- `month`: This month's summary
- `all`: All time summary (default)

### View log entries
```bash
tt logs [period]
```

Shows time entries for the specified period (day, week, month, or all).

**Examples:**
```bash
# Show entries for this month
tt logs month

# Show entries for this week
tt logs week

# Show entries for today
tt logs day

# Show all entries
tt logs all
```

### Delete log entries
```bash
tt delete <index> [period]
```

Delete a specific entry by its index number (as shown in `tt logs`). Period defaults to "all".

**Examples:**
```bash
# Delete entry #3 from all entries
tt delete 3

# Delete entry #1 from this month's entries
tt delete 1 month
```

## Data Storage

Time tracking data is stored in your home directory at `~/.timetracker/`:
- `state.json`: Current tracking session state
- `timetracker.csv`: Historical time entries


## License

MIT