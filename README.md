# timetracker-cli

A simple command line time tracking tool for developers.

![Demo](demo/timetracker-demo.gif)

## Installation

```bash
npm install -g @mvexel/timetracker-cli
```

## Usage

### Basic Time Tracking

```bash
# Start tracking a project (auto-creates project)
tt start <project_name>

# Stop tracking current session
tt stop

# Show current tracking status
tt status
```

### Manual Logging

```bash
# Log time for a project (duration in minutes)
tt log <project_name> <duration_in_minutes>

# Log with specific end time
tt log myproject 120 --time 16:30

# Log for specific day
tt log myproject 60 --day 2024-01-15 --time 14:00
```

### Viewing Data

```bash
# Show time summary for all projects
tt summary [period]

# Show summary for specific project
tt summary --project myproject

# Show log entries
tt logs [period]

# Available periods: day, week, month, all (default: all)
```

### Project Management

```bash
# List all projects with stats
tt projects

# Delete project and all its entries
tt project delete myproject
```

### Deleting Entries

```bash
# Delete by index (legacy method)
tt delete 3

# Delete by project and time range
tt delete --project myproject --last     # Most recent entry
tt delete --project myproject --today    # All today's entries
tt delete --project myproject --week     # This week's entries
tt delete --project myproject --month    # This month's entries

# Delete by time range only (all projects)
tt delete --last      # Most recent entry
tt delete --today     # All today's entries
tt delete --week      # This week's entries
tt delete --month     # This month's entries
```

### JSON Output

All commands support JSON output for integration and automation:

```bash
# Get structured data for any command
tt summary --json
tt logs week --json
tt projects --json
tt status --json

# Operations also return JSON confirmations
tt start myproject --json
tt stop --json
tt log myproject 60 --json
tt delete --project test --last --json
```

## Examples

### Daily Workflow

```bash
# Morning: start work
tt start client-website

# Afternoon: switch projects
tt stop
tt start internal-tools

# End of day: stop tracking
tt stop

# Check today's work
tt summary day
```

### Manual Entry

```bash
# Log yesterday's forgotten work
tt log client-website 180 --day 2024-01-14 --time 17:00

# Log morning work that wasn't tracked
tt log documentation 90 --time 11:30
```

### Project Management

```bash
# See all projects
tt projects

# Check specific project summary
tt summary --project client-website

# Clean up old test project
tt project delete test-project
```

### JSON Integration

```bash
# Get project data for dashboards
tt projects --json | jq '.projects.list[] | select(.total_minutes > 60)'

# Export weekly summary 
tt summary week --json > weekly-report.json

# Check tracking status in scripts
if [ "$(tt status --json | jq -r '.status.tracking')" = "true" ]; then
  echo "Currently tracking: $(tt status --json | jq -r '.status.project')"
fi

# Automated time logging
tt log "$(git rev-parse --abbrev-ref HEAD)" 30 --json
```

## Data Storage

Time tracking data is stored in your home directory at `~/.timetracker/`:
- `state.json`: Current tracking session state
- `timetracker.csv`: Historical time entries


## Prompt integration

To remind you of your active tracking session, you may want to add the `tt` status to your prompt. We have some [instructions](PROMPT_INTEGRATION.md) for popular shells and prompts.

## License

MIT