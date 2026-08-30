---
description: "Cancel active Ralph Wiggum loop"
allowed-tools: ["Bash(test -f .claude/ralph-loop.local.md:*)", "Bash(rm .claude/ralph-loop.local.md)", "Read(.claude/ralph-loop.local.md)"]
hide-from-slash-command-tool: "true"
---
<!-- imported from anthropics/claude-code@2bb6069 -- plugins/ralph-wiggum/commands/cancel-ralph.md -->

> **Looping is not active in this project.** The re-prompt comes from ralph-wiggum's `Stop`
> hook, which was not imported; without it this sets up loop state that never fires again.
> To activate, add `.claude/scripts/stop-hook.sh` as a second `Stop` hook in
> `.claude/settings.json` (alongside the existing `hooks.py` entry), or just use the native
> `/loop` skill, which does interval and self-paced looping without any of this. Tell the
> user this before starting a loop.

# Cancel Ralph

To cancel the Ralph loop:

1. Check if `.claude/ralph-loop.local.md` exists using Bash: `test -f .claude/ralph-loop.local.md && echo "EXISTS" || echo "NOT_FOUND"`

2. **If NOT_FOUND**: Say "No active Ralph loop found."

3. **If EXISTS**:
   - Read `.claude/ralph-loop.local.md` to get the current iteration number from the `iteration:` field
   - Remove the file using Bash: `rm .claude/ralph-loop.local.md`
   - Report: "Cancelled Ralph loop (was at iteration N)" where N is the iteration value
