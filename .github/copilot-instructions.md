# GitHub Copilot Instructions for timetracker-cli

## Project Overview

`timetracker-cli` is a simple command-line time tracking tool for developers. It provides intuitive commands to track time spent on projects, log manual entries, and view summaries. The tool stores data locally in CSV format in the user's home directory (`~/.timetracker/`).

## Architecture

### Core Components

The project follows a clean architecture with clear separation of concerns:

- **Main Entry Point**: `bin/tt.js` - CLI interface using Commander.js
- **Core Logic**: `lib/timetracker.js` - Main `TimeTracker` class that orchestrates operations
- **Services**: `lib/services/` - Utility classes for specific responsibilities
  - `FileManager.js` - All file system operations (state and CSV log files)
  - `ProjectManager.js` - Project-level operations and statistics
  - `TimeCalculator.js` - Time calculations, duration formatting, and period filtering
  - `DateUtils.js` - Date parsing, formatting, and validation
- **Models**: `lib/models/` - Data models
  - `SessionEntry.js` - Represents a time tracking entry
- **Formatters**: `lib/formatters/` - Output formatting
  - `Formatter.js` - Handles both console and JSON output formatting

### Key Design Patterns

1. **Private Fields**: Classes use `#private` fields for encapsulation
2. **Static Utility Methods**: Service classes primarily use static methods
3. **Dependency Injection**: `FileManager` can accept custom config directories for testing
4. **Unified Output**: All user-facing output goes through `Formatter.output()` which handles both console and JSON formats

## Code Style & Conventions

### JavaScript Standards

- **ES Modules**: Use `import`/`export` syntax (project uses `"type": "module"`)
- **Async/Await**: All file operations and main logic use async/await (no callbacks or raw promises)
- **JSDoc Comments**: Document classes and public methods with JSDoc
- **Error Handling**: Throw descriptive errors; CLI catches and displays them

### Naming Conventions

- **Files**: Use camelCase for file names (e.g., `timetracker.js`, `FileManager.js`)
- **Classes**: PascalCase (e.g., `TimeTracker`, `SessionEntry`)
- **Methods**: camelCase (e.g., `startTracking`, `formatDuration`)
- **Private Fields**: Use `#` prefix (e.g., `#fileManager`, `#configDir`)
- **Constants**: Use UPPER_CASE for true constants

### Code Formatting

- **Prettier**: Configured with `.prettierrc.json`
  - Semicolons: Yes
  - Single quotes: Yes
  - Trailing commas: All
  - Print width: 80 characters
  - Tab width: 2 spaces
- **ESLint**: Configured with `eslint.config.js`
  - Uses recommended rules
  - Integrates with Prettier

## Testing

### Test Framework

- **Mocha**: Test runner
- **c8**: Code coverage tool
- **Location**: `test/test_timetracker.js`

### Testing Patterns

- Tests use a temporary directory (`~/.timetracker-test`)
- `beforeEach`: Set up clean test environment
- `afterEach`: Clean up test directory
- Use `assert` module for assertions
- Test both success and error cases

### Running Tests

```bash
npm test              # Run tests
npm run coverage      # Run with coverage report
```

## Development Commands

```bash
npm run lint          # Check code style
npm run lint:fix      # Auto-fix style issues
npm run format        # Format code with Prettier
npm test              # Run tests
npm run coverage      # Run tests with coverage
```

## Data Storage

The application stores data in `~/.timetracker/`:

- `state.json`: Current tracking session (project, start time, description, session ID)
- `timetracker.csv`: All time entries with headers: date, duration, project, description, session_id

### CSV Format

- **Date**: ISO 8601 format (YYYY-MM-DD)
- **Duration**: Minutes (integer)
- **Project**: String (project name)
- **Description**: String or empty
- **Session ID**: Unique identifier for start/stop sessions vs manual entries

## Key Features to Remember

1. **Time Rounding**: By default, durations are rounded to nearest 15 minutes (can be disabled with `--no-round`)
2. **Auto-stop**: Starting a new session automatically stops any active session
3. **Manual Logging**: Users can log time retrospectively with specific dates and times
4. **Flexible Periods**: Support for filtering by day, week, month, or all time
5. **JSON Output**: Most commands support `--json` flag for programmatic use
6. **Project Auto-creation**: Projects are created automatically when first used

## Common Patterns

### Adding a New Command

1. Add command definition in `bin/tt.js` using Commander.js
2. Add method to `TimeTracker` class in `lib/timetracker.js`
3. Add formatter method in `lib/formatters/Formatter.js` (if needed)
4. Add test in `test/test_timetracker.js`

### Working with Time

- Always use `TimeCalculator` for duration formatting and period filtering
- Use `DateUtils` for date parsing and formatting
- Store dates in ISO 8601 format
- Store durations as integer minutes

### Output Formatting

- All output should go through `Formatter.output(data, isJson)`
- Format methods should return arrays of strings for console output or objects for JSON
- Use `TimeCalculator.formatDuration()` for consistent duration formatting (e.g., "2h 30m")

## Important Notes for Copilot

1. **File Case Sensitivity**: The main file is `lib/timetracker.js` (lowercase), not `TimeTracker.js`
2. **No External API**: All data is stored locally; no network requests
3. **ES Module Imports**: Always include `.js` extensions in import statements
4. **Testing Isolation**: Tests must use isolated directories to avoid interfering with user data
5. **Backward Compatibility**: The tool is used by developers in their workflow; breaking changes should be avoided
6. **Shell Integration**: Consider zsh/bash integration when adding features (prompt display, completions)

## Dependencies

### Runtime
- `commander`: CLI argument parsing
- `csv-writer`: CSV file operations

### Development
- `mocha`: Test framework
- `c8`: Coverage reporting
- `eslint`: Linting
- `prettier`: Code formatting

## Node.js Requirements

- Minimum version: Node.js 14.0.0+
- Uses native modules: `fs/promises`, `path`, `os`
