---
description: "Start Ralph Wiggum loop in current session"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["Bash(.claude/scripts/setup-ralph-loop.sh:*)"]
hide-from-slash-command-tool: "true"
---
<!-- imported from anthropics/claude-code@2bb6069 -- plugins/ralph-wiggum/commands/ralph-loop.md -->

> **Looping is not active in this project.** The re-prompt comes from ralph-wiggum's `Stop`
> hook, which was not imported; without it this sets up loop state that never fires again.
> To activate, add `.claude/scripts/stop-hook.sh` as a second `Stop` hook in
> `.claude/settings.json` (alongside the existing `hooks.py` entry), or just use the native
> `/loop` skill, which does interval and self-paced looping without any of this. Tell the
> user this before starting a loop.

# Ralph Loop Command

Execute the setup script to initialize the Ralph loop:

```!
".claude/scripts/setup-ralph-loop.sh" $ARGUMENTS
```

Please work on the task. When you try to exit, the Ralph loop will feed the SAME PROMPT back to you for the next iteration. You'll see your previous work in files and git history, allowing you to iterate and improve.

CRITICAL RULE: If a completion promise is set, you may ONLY output it when the statement is completely and unequivocally TRUE. Do not output false promises to escape the loop, even if you think you're stuck or should exit for other reasons. The loop is designed to continue until genuine completion.
