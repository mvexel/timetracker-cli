# Extras

## Zsh Completions

You will find a `_tt` completion function at `zsh/_tt`. This provides intelligent completions for subcommands, options, and existing project names in your shell.

### Installation Instructions

Choose the installation method that matches your zsh setup:

#### Homebrew-installed Zsh (macOS)

If you installed zsh via Homebrew (common on macOS):

```bash
# Copy the completion file
cp extras/zsh/_tt /opt/homebrew/share/zsh/site-functions/_tt

# Or create a symlink
ln -s "$(pwd)/extras/zsh/_tt" /opt/homebrew/share/zsh/site-functions/_tt
```

Then restart your shell or run `exec zsh` to reload completions.

**Note**: On Apple Silicon Macs, the path is `/opt/homebrew`. On Intel Macs, use `/usr/local` instead.

More info in the [Homebrew docs](https://docs.brew.sh/Shell-Completion#configuring-completions-in-zsh).

#### System Zsh (macOS default)

If you're using the system-provided zsh (macOS default):

```bash
# Create a directory for completions if it doesn't exist
mkdir -p ~/.zsh/completions

# Copy the completion file
cp extras/zsh/_tt ~/.zsh/completions/_tt

# Add the completions directory to your fpath in ~/.zshrc
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
```

Then restart your shell or run `source ~/.zshrc` to apply changes.

#### Oh-My-Zsh

If you're using Oh-My-Zsh:

```bash
# Copy to the custom completions directory
mkdir -p ~/.oh-my-zsh/custom/plugins/timetracker
cp extras/zsh/_tt ~/.oh-my-zsh/custom/plugins/timetracker/_tt

# Add timetracker to your plugins in ~/.zshrc
# plugins=(... timetracker)
```

Then restart your shell or run `source ~/.zshrc` to apply changes.

**Alternative**: You can also copy `_tt` directly to `~/.oh-my-zsh/completions/` if you prefer:

```bash
mkdir -p ~/.oh-my-zsh/completions
cp extras/zsh/_tt ~/.oh-my-zsh/completions/_tt
```

### Verification

After installation, you can verify completions are working by typing:

```bash
tt <TAB>
```

You should see a list of available commands. When starting or logging time, you can tab-complete project names from your existing projects.
