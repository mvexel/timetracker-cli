# Extras

You will find a `_tt_` completion function at `zsh/tt`. This will suggest completions (subcommands, existing projects) in your shell. 

I use homebrew on Mac so that's all I know. To install the completions in homebrew, copy or symlink `_tt` to `/opt/homebrew/share/zsh/site-functions`. 

run `compinit` after and you should be set. 

You can find the paths zsh will look at using `echo $FPATH`

Some more info and caveats are in the [homebrew docs](https://docs.brew.sh/Shell-Completion#configuring-completions-in-zsh).