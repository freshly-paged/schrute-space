# Auto-Fix Issues Workflow

The **Fix GitHub Issues with Claude Code** workflow automatically generates code fixes for one or more GitHub issues and opens a PR for human review.

## One-time setup

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. In this repo, go to **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `ANTHROPIC_API_KEY` — Value: your API key
4. Save. You only need to do this once.

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

## Running the workflow

1. Go to the **Actions** tab in the GitHub repo
2. Select **"Fix GitHub Issues with Claude Code"** from the left sidebar
3. Click **"Run workflow"**
4. Fill in the inputs:

   | Field | Required | Description | Example |
   |---|---|---|---|
   | **Issue numbers** | Yes | Comma-separated list of issue numbers to fix | `18, 36` |
   | **Extra instructions** | No | Additional guidance injected into Claude's prompt for this run | `Prefer early returns over nested ifs` |

5. Click **"Run workflow"** to start

---

## What happens next

- A branch named `fix/issues-N-M` is created automatically
- Claude reads each issue, explores the codebase (guided by `CLAUDE.md`), and makes the minimal fix
- Each fix is verified with `npm run lint` — if lint fails, that issue is skipped and noted in the PR
- A PR is opened targeting `main` with:
  - `Closes #N` links for every fixed issue
  - A list of any skipped issues with the reason
  - A review checklist

You can watch the live logs under Actions → the running workflow job.

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
| Workflow fails at "Run Claude issue fixer" with auth error | `ANTHROPIC_API_KEY` secret missing or expired | Re-add the secret in repo Settings |
| Issue skipped — "lint-failed" | Claude introduced a TypeScript error | Check the skipped issue's lint output in the PR body; file a follow-up issue with the error text |
| Issue skipped — "no-changes" | Issue description was too vague for Claude to find the right code | Add more detail to the issue (file path, reproduction steps) and re-run |
| PR not created | All issues in the run were skipped | Check the workflow logs; the last step will show why each issue was skipped |
