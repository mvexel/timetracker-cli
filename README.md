# timetracker-cli

A simple command line time tracking tool for developers.

## Installation

```bash
npm install -g timetracker-cli
```

## Usage

### Start tracking time for a project
```bash
tt start <project_name>
```

### Stop tracking time
```bash
tt stop
```

### Log a time entry manually
```bash
tt log <project_name> <duration_in_minutes>
```

**Options:**
- `--day <date>`: Specify the day (YYYY-MM-DD format, defaults to today)
- `--time <time>`: Specify the end time (HH:MM format, defaults to current time)

**Examples:**
```bash
# Log 30 minutes for "my-project" ending now
tt log my-project 30

# Log 45 minutes for "website" ending at 3:30 PM today
tt log website 45 --time 15:30

# Log 60 minutes for "app" ending at 2:00 PM on a specific date
tt log app 60 --day 2025-08-15 --time 14:00
```

### View time summary
```bash
tt summary <period>
```

Where `<period>` can be:
- `day`: Today's summary
- `week`: This week's summary
- `month`: This month's summary

### Interactive log browser
```bash
tt logs <period>
```

Opens an interactive browser showing time entries for the specified period (day, week, or month).

**Interactive controls:**
- `↑/↓` Arrow keys: Navigate through entries
- `d`: Delete the currently selected entry (with confirmation)
- `q`: Quit the interactive browser

**Examples:**
```bash
# Browse entries for this month interactively
tt logs month

# Browse entries for this week interactively  
tt logs week

# Browse entries for today interactively
tt logs day
```

The interactive browser shows entries with visual highlighting and allows you to scroll through long lists. When you press 'd' to delete an entry, you'll be asked to confirm before the deletion.

## Data Storage

Time tracking data is stored in your home directory at `~/.timetracker/`:
- `state.json`: Current tracking session state
- `timetracker.csv`: Historical time entries

## Features

- Simple start/stop time tracking
- Manual time entry logging with flexible date/time options
- Project-based time organization
- CSV data export format
- Daily/weekly/monthly summaries
- Interactive log browser with scrolling navigation
- Delete entries directly from the interactive interface
- Prevents overlapping sessions
- Human-readable duration formatting

## License

MIT