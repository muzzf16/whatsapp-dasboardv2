# Cloud Task Troubleshooting

## Error

```text
Error creating cloud task
failed to compute git diff to remote for cwd: "D:\\portal-sdmv3"
```

## Why this happens

This usually means the task runner is trying to diff a repository path that does not exist (or is not a Git repo) in the execution environment.

In cloud Linux environments, a Windows path like `D:\portal-sdmv3` is invalid.

## Fix checklist

1. Open the project from the real Git root in the current environment.
   - Linux/macOS example: `/workspace/portal-sdmv3`
   - Windows local example: `D:\portal-sdmv3`
2. Verify Git is available in that folder:
   ```bash
   git rev-parse --show-toplevel
   git status
   git remote -v
   ```
3. Ensure the folder has an upstream remote/branch:
   ```bash
   git branch -vv
   ```
   If no upstream is set, set one:
   ```bash
   git branch --set-upstream-to=origin/<branch-name> <branch-name>
   ```
4. Retry task creation from the same folder where `git status` works.

## Quick diagnostic command

Run this from your current shell:

```bash
pwd
git rev-parse --show-toplevel
```

If these fail or point to the wrong directory, switch to the correct repo path and retry.
