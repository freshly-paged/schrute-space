# Auto-Fix Issues Workflow

The **Fix GitHub Issues with Claude Code** workflow automatically generates code fixes for issues labelled `claude-fix` and opens a PR for human review.

## One-time setup

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. In this repo, go to **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `ANTHROPIC_API_KEY` — Value: your API key
4. Save. You only need to do this once.

---

## Triggering a fix

There are two ways to queue issues for fixing:

### Option A — Label an issue (automatic)

Apply the `claude-fix` label to any open issue. The workflow fires automatically within seconds.

- Works on one issue at a time
- No extra configuration needed
- The label is automatically removed after the fix is committed

### Option B — Manual batch run

Go to **Actions → "Fix GitHub Issues with Claude Code" → Run workflow**.

The workflow picks up **all** open issues currently labelled `claude-fix` and processes them in one run. An optional **Extra instructions** field lets you inject guidance into Claude's prompt for that run (e.g. `Prefer early returns`, `Use Tailwind, not inline styles`).

Use this when you've queued up several issues and want to fix them all at once.

---

## Filing a good bug report

Use the **Bug Report** issue template when creating issues (GitHub will prompt you automatically). Fill in:

- **What's wrong?** — one clear sentence describing the bug
- **Steps to reproduce** — exact numbered steps to trigger it
- **Expected behavior** — what should happen instead
- **Where in the UI / which feature?** — the screen or component name; paste the file path if you know it
- **Additional context** *(optional)* — paste any console errors as plain text (not screenshots)

The more specific the issue, the better Claude can target the fix without guessing.

---

## What happens after triggering

1. A branch `fix/issues-N-M` is created automatically
2. Claude reads each issue, explores the codebase (guided by `CLAUDE.md`), and makes the minimal fix
3. Each fix is verified with `npm run lint` — if lint fails, that issue is skipped and noted in the PR
4. The `claude-fix` label is removed from each successfully fixed issue
5. A PR is opened targeting `main` with:
   - `Closes #N` links for every fixed issue
   - A list of any skipped issues with the reason
   - A review checklist

You can watch live logs under **Actions → the running workflow job**.

---

## Reviewing the PR

The PR is for **human review before merge** — always check the diff before approving.

Suggested checks:
- [ ] The change is minimal and targeted at the reported bug
- [ ] Run `npm run lint` locally on the branch
- [ ] Smoke test the affected feature: `npm run dev:local-test` → open [localhost:8080](http://localhost:8080)
- [ ] Merge normally — Cloud Build will auto-deploy to production

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow fails with auth error | `ANTHROPIC_API_KEY` secret missing or expired | Re-add the secret in repo Settings |
| Issue skipped — "lint-failed" | Claude introduced a TypeScript error | Check lint output in the PR body; add detail to the issue and re-label it |
| Issue skipped — "no-changes" | Issue description was too vague | Add reproduction steps and a file path hint, then re-apply the `claude-fix` label |
| Manual run exits with "No open issues labelled claude-fix" | No issues have the label | Apply `claude-fix` to at least one open issue first |
| PR not created | All issues in the run were skipped | Check workflow logs; the fixer step shows why each issue was skipped |
