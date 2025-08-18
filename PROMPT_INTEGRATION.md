# Shell Integration Guide

This guide covers shell integrations for the timetracker CLI, including prompt status display and tab completion.

## Prerequisites

The timetracker CLI includes a `status` command that outputs the current tracking status:
- When tracking: `project-name (duration)`
- When not tracking: no output

## Starship Prompt

Add this to your `~/.config/starship.toml`:

```toml
[custom.timetracker]
command = "tt status"
when = true
format = "[$output]($style) "
style = "bold yellow"
shell = ["bash", "--noprofile", "--norc"]
```

## Oh My Zsh Themes

### Custom Theme Function

Add this function to your `~/.zshrc` or custom theme file:

```bash
# Timetracker status function
timetracker_status() {
  local status=$(tt status 2>/dev/null)
  if [[ -n "$status" ]]; then
    echo "%{$fg[yellow]%}⏱️  $status%{$reset_color%} "
  fi
}
```

Then add `$(timetracker_status)` to your prompt. For example:

```bash
PROMPT='$(timetracker_status)%{$fg[cyan]%}%~%{$reset_color%} $ '
```

### Popular Theme Examples

#### Robbyrussell Theme
```bash
# Add to ~/.zshrc after Oh My Zsh is loaded
PROMPT='$(timetracker_status)'$PROMPT
```

#### Agnoster Theme
```bash
# Add timetracker segment function
prompt_timetracker() {
  local status=$(tt status 2>/dev/null)
  if [[ -n "$status" ]]; then
    prompt_segment yellow black "⏱️  $status"
  fi
}

# Add to build_prompt function in theme
build_prompt() {
  RETVAL=$?
  prompt_status
  prompt_virtualenv
  prompt_timetracker  # Add this line
  prompt_context
  prompt_dir
  prompt_git
  prompt_bzr
  prompt_hg
  prompt_end
}
```

## Pure Zsh Prompt

For custom zsh prompts without Oh My Zsh:

```bash
# Add to ~/.zshrc
autoload -U colors && colors

timetracker_prompt() {
  local status=$(tt status 2>/dev/null)
  if [[ -n "$status" ]]; then
    echo "%F{yellow}⏱️  $status%f "
  fi
}

# Set your prompt
setopt PROMPT_SUBST
PROMPT='$(timetracker_prompt)%F{blue}%~%f $ '
```

## Bash Prompt

### Simple Bash Integration

Add to your `~/.bashrc`:

```bash
# Timetracker status function
timetracker_status() {
  local status=$(tt status 2>/dev/null)
  if [[ -n "$status" ]]; then
    echo -e "\033[1;33m⏱️  $status\033[0m "
  fi
}

# Add to PS1
PS1='$(timetracker_status)\[\033[01;34m\]\w\[\033[00m\] $ '
```

### Advanced Bash with Colors

```bash
# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

timetracker_status() {
  local status=$(tt status 2>/dev/null)
  if [[ -n "$status" ]]; then
    echo -e "${YELLOW}⏱️  $status${NC} "
  fi
}

# Set PS1 with timetracker status
PS1='$(timetracker_status)\[${BLUE}\]\w\[${NC}\] $ '
```

## Fish Shell

Add to your `~/.config/fish/config.fish`:

```fish
function timetracker_status
    set -l status (tt status 2>/dev/null)
    if test -n "$status"
        set_color yellow
        echo -n "⏱️  $status "
        set_color normal
    end
end

function fish_prompt
    timetracker_status
    set_color blue
    echo -n (prompt_pwd)
    set_color normal
    echo ' $ '
end
```

## Powerlevel10k

Add to your `~/.p10k.zsh`:

```bash
# Add timetracker to the list of prompt elements
typeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(
  # ... your existing elements ...
  timetracker
  # ... more elements ...
)

# Configure the timetracker segment
function prompt_timetracker() {
  local status=$(tt status 2>/dev/null)
  if [[ -n "$status" ]]; then
    p10k segment -f yellow -i '⏱️' -t "$status"
  fi
}
```

## tmux Integration

You can also add timetracker status to your tmux status bar by adding this to `~/.tmux.conf`:

```bash
# Add to status-right
set -g status-right '#(tt status 2>/dev/null | sed "s/^/⏱️  /")#{?#{!=:,},'',} %H:%M %d-%b-%y'
```

## Performance Considerations

The `tt status` command is designed to be fast, but for very responsive prompts, you might want to:

1. **Cache the result** for a few seconds
2. **Run asynchronously** in backgrounds for some prompts
3. **Add timeout** to prevent hanging

Example with caching in zsh:

```bash
timetracker_status_cached() {
  local cache_file="/tmp/tt_status_cache"
  local cache_duration=5  # seconds
  
  if [[ ! -f "$cache_file" ]] || [[ $(($(date +%s) - $(stat -f %m "$cache_file" 2>/dev/null || echo 0))) -gt $cache_duration ]]; then
    tt status 2>/dev/null > "$cache_file"
  fi
  
  local status=$(cat "$cache_file" 2>/dev/null)
  if [[ -n "$status" ]]; then
    echo "%F{yellow}⏱️  $status%f "
  fi
}
```

# Tab Completion

Shell tab completion makes the CLI much more efficient by auto-completing commands, project names, and options.

## Bash Completion

Create `/etc/bash_completion.d/tt` or add to `~/.bash_completion`:

```bash
_tt_completion() {
    local cur prev commands projects periods
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    commands="start stop summary log logs delete projects project status export migrate"
    periods="day week month all"
    
    # Complete project names for certain commands
    case "${prev}" in
        start|log)
            projects=$(tt projects --json 2>/dev/null | jq -r '.[]' 2>/dev/null || echo "")
            COMPREPLY=($(compgen -W "${projects}" -- ${cur}))
            return 0
            ;;
        --project)
            projects=$(tt projects --json 2>/dev/null | jq -r '.[]' 2>/dev/null || echo "")
            COMPREPLY=($(compgen -W "${projects}" -- ${cur}))
            return 0
            ;;
        summary|logs|delete)
            COMPREPLY=($(compgen -W "${periods}" -- ${cur}))
            return 0
            ;;
        project)
            COMPREPLY=($(compgen -W "delete" -- ${cur}))
            return 0
            ;;
    esac
    
    # Complete options
    case "${cur}" in
        --*)
            local options="--json --project --no-round --sessions-only --manual-only --with-descriptions --last --today --week --month --day"
            COMPREPLY=($(compgen -W "${options}" -- ${cur}))
            return 0
            ;;
    esac
    
    # Complete main commands
    if [[ ${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=($(compgen -W "${commands}" -- ${cur}))
        return 0
    fi
}

complete -F _tt_completion tt
```

## Zsh Completion

Create `~/.zsh/completions/_tt` (and add `~/.zsh/completions` to your `fpath`):

```zsh
#compdef tt

_tt() {
    local context state line
    
    _arguments -C \
        '1:command:->commands' \
        '*::arg:->args' \
        '--json[Output in JSON format]' \
        '--no-round[Disable 15-minute rounding]' \
        '--project[Specify project]:project:->projects' \
        '--sessions-only[Show only start/stop sessions]' \
        '--manual-only[Show only manual log entries]' \
        '--with-descriptions[Show only entries with descriptions]' \
        '--last[Delete the most recent entry]' \
        '--today[Delete entries from today]' \
        '--week[Delete entries from this week]' \
        '--month[Delete entries from this month]' \
        '--day[Specify day]:date:'
    
    case $state in
        commands)
            local commands=(
                'start:Start tracking time for a project'
                'stop:Stop tracking time'
                'summary:Show time summary'
                'log:Log time entry for a project'
                'logs:Show log entries'
                'delete:Delete log entries'
                'projects:List all projects'
                'project:Project management commands'
                'status:Show current tracking status'
                'export:Export data as CSV'
                'migrate:Migrate old format to new format'
            )
            _describe 'commands' commands
            ;;
        args)
            case $words[2] in
                start)
                    if [[ $CURRENT -eq 3 ]]; then
                        _alternative 'projects:projects:->projects'
                    else
                        _message 'description'
                    fi
                    ;;
                log)
                    case $CURRENT in
                        3) _alternative 'projects:projects:->projects' ;;
                        4) _message 'duration (minutes)' ;;
                        5) _message 'description' ;;
                    esac
                    ;;
                summary|logs|delete)
                    if [[ $CURRENT -eq 3 ]]; then
                        _values 'period' 'day' 'week' 'month' 'all'
                    fi
                    ;;
                project)
                    if [[ $CURRENT -eq 3 ]]; then
                        _values 'action' 'delete'
                    elif [[ $CURRENT -eq 4 ]]; then
                        _alternative 'projects:projects:->projects'
                    fi
                    ;;
            esac
            ;;
        projects)
            local projects
            projects=(${(f)"$(tt projects --json 2>/dev/null | jq -r '.[]' 2>/dev/null)"})
            _describe 'projects' projects
            ;;
    esac
}

_tt "$@"
```

## Installation

### Bash
```bash
# System-wide (requires sudo)
sudo curl -o /etc/bash_completion.d/tt https://raw.githubusercontent.com/yourusername/timetracker-cli/main/completions/bash_completion

# User-specific
mkdir -p ~/.bash_completion.d
curl -o ~/.bash_completion.d/tt https://raw.githubusercontent.com/yourusername/timetracker-cli/main/completions/bash_completion
echo "source ~/.bash_completion.d/tt" >> ~/.bashrc
```

### Zsh
```bash
# Create completions directory if it doesn't exist
mkdir -p ~/.zsh/completions

# Download completion file
curl -o ~/.zsh/completions/_tt https://raw.githubusercontent.com/yourusername/timetracker-cli/main/completions/zsh_completion

# Add to fpath in ~/.zshrc
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -U compinit && compinit' >> ~/.zshrc
```

## Features

Tab completion provides:

- **Command completion**: `tt st<TAB>` → `tt start`
- **Project name completion**: `tt start my<TAB>` → `tt start my-project`
- **Option completion**: `tt start --<TAB>` → shows available options
- **Period completion**: `tt summary <TAB>` → `day`, `week`, `month`, `all`
- **Action completion**: `tt project <TAB>` → `delete`

## Requirements

- **jq**: Required for parsing JSON project lists (`brew install jq` or `apt install jq`)
- **tt in PATH**: The `tt` command must be available in your shell's PATH

## Troubleshooting

- **Command not found**: Make sure `tt` is in your PATH or use the full path
- **Slow prompt**: Consider caching or async execution
- **No output**: Check that you have an active tracking session with `tt status`
- **Colors not working**: Ensure your terminal supports colors and escape sequences
- **Tab completion not working**: 
  - Verify completion files are in the correct location
  - Check that `jq` is installed for project name completion
  - Restart your shell or source your RC file
  - For zsh, ensure `fpath` includes your completions directory