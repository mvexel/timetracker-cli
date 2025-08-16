# Prompt Integration Guide

This guide shows how to integrate timetracker status into various shell prompts.

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

## Troubleshooting

- **Command not found**: Make sure `tt` is in your PATH or use the full path
- **Slow prompt**: Consider caching or async execution
- **No output**: Check that you have an active tracking session with `tt status`
- **Colors not working**: Ensure your terminal supports colors and escape sequences