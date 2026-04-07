#!/usr/bin/env node
/**
 * fix-issues.mjs — orchestrates per-issue Claude Code fixes for the
 * "Fix GitHub Issues with Claude Code" workflow.
 *
 * Env vars (all required):
 *   ANTHROPIC_API_KEY  — Anthropic API key for the Claude CLI
 *   GH_TOKEN           — GitHub token (auto-provided by Actions)
 *   ISSUE_NUMBERS      — comma-separated issue numbers, e.g. "20,21,36"
 *   REPO               — owner/repo, e.g. "okg00dbye/schrute-space"
 */

import { execSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const REPO = process.env.REPO;
const ISSUE_NUMBERS = process.env.ISSUE_NUMBERS;
const EXTRA_INSTRUCTIONS = (process.env.EXTRA_INSTRUCTIONS ?? '').trim();
const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;

if (!REPO || !ISSUE_NUMBERS) {
  console.error('Missing required env vars: REPO, ISSUE_NUMBERS');
  process.exit(1);
}

const issues = ISSUE_NUMBERS.split(',').map(n => n.trim()).filter(Boolean);
const results = { fixed: [], skipped: [] };

// ─── Helpers ────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

function ghApi(path) {
  const out = run(`gh api ${path}`);
  return JSON.parse(out);
}

function setOutput(key, value) {
  // Multiline-safe: use the heredoc delimiter form required by GitHub Actions
  const delimiter = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(GITHUB_OUTPUT, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function buildPrompt(num, title, body, comments) {
  const commentText = comments.length > 0
    ? `COMMENTS:\n${comments.map(c => `@${c.user.login}: ${c.body}`).join('\n\n').slice(0, 3000)}`
    : '';

  return `You are fixing a GitHub issue in the schrute-space repository — a TypeScript/React/Node.js multiplayer office app (The Office-themed).

FIRST: Read the file CLAUDE.md in the repo root. It describes the full architecture and all major files. Use it as your primary guide before reading any source files.

ISSUE #${num}: ${title}

DESCRIPTION:
${body ?? '(no description provided)'}

${commentText}

YOUR TASK:
- Make the minimal correct change needed to fix this issue.
- Do NOT add new features, refactor unrelated code, or change code style.
- After making changes, run \`npm run lint\` to confirm TypeScript type-checking passes.
- If lint fails, fix the type errors before finishing.
- Do NOT commit anything — the workflow handles commits.

CONSTRAINTS:
- Only modify files necessary to fix this specific issue.
- Do not modify: package.json, package-lock.json, tsconfig.json, vite.config.ts, cloudbuild.yaml, Dockerfile.
- Do not install new npm packages.
${EXTRA_INSTRUCTIONS ? `\nADDITIONAL INSTRUCTIONS FROM THE WORKFLOW TRIGGER:\n${EXTRA_INSTRUCTIONS}` : ''}`;

}

// ─── Per-issue loop ──────────────────────────────────────────────────────────

for (const num of issues) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Processing issue #${num}…`);

  // 1. Fetch issue content
  let issue, comments;
  try {
    issue = ghApi(`repos/${REPO}/issues/${num}`);
    comments = ghApi(`repos/${REPO}/issues/${num}/comments`);
  } catch (err) {
    console.error(`  ✗ Failed to fetch issue #${num}: ${err.message}`);
    results.skipped.push({ num, reason: 'fetch-failed', detail: err.message.slice(0, 300) });
    continue;
  }

  const title = issue.title ?? `Issue #${num}`;
  const body = issue.body ?? '';
  console.log(`  Title: ${title}`);

  // 2. Build prompt
  const prompt = buildPrompt(num, title, body, comments);

  // 3. Run Claude non-interactively
  console.log(`  Running Claude…`);
  const claudeResult = spawnSync(
    'claude',
    ['-p', prompt, '--allowedTools', 'Read,Glob,Grep,Edit,Write,Bash(npm run lint)', '--max-turns', '30', '--dangerously-skip-permissions'],
    {
      stdio: 'inherit',
      encoding: 'utf8',
      env: { ...process.env },
    }
  );

  if (claudeResult.status !== 0) {
    console.error(`  ✗ Claude exited with code ${claudeResult.status}`);
    run('git restore .', { stdio: 'inherit' });
    results.skipped.push({ num, reason: 'claude-error', detail: `Exit code ${claudeResult.status}` });
    continue;
  }

  // 4. Lint check
  console.log(`  Running lint…`);
  const lintResult = spawnSync('npm', ['run', 'lint'], { stdio: 'pipe', encoding: 'utf8' });

  if (lintResult.status !== 0) {
    const lintError = (lintResult.stdout + lintResult.stderr).slice(0, 500);
    console.error(`  ✗ Lint failed for issue #${num}:\n${lintError}`);
    run('git restore .', { stdio: 'inherit' });
    results.skipped.push({ num, reason: 'lint-failed', detail: lintError });
    continue;
  }

  // 5. Check if Claude actually changed anything
  const diff = run('git status --short').trim();
  if (!diff) {
    console.log(`  ℹ No changes made by Claude for issue #${num} — skipping commit`);
    results.skipped.push({ num, reason: 'no-changes', detail: 'Claude made no file edits' });
    continue;
  }

  // 6. Commit
  run('git add -A');
  const shortTitle = title.replace(/"/g, "'").slice(0, 60);
  run(`git commit -m "fix: resolve issue #${num} — ${shortTitle}

Closes #${num}"`);

  // 7. Remove 'claude-fix' label so the issue isn't re-processed on next run
  try {
    run(`gh api repos/${REPO}/issues/${num}/labels/claude-fix -X DELETE`);
    console.log(`  ✓ Removed 'claude-fix' label`);
  } catch {
    // Label may have already been removed; not fatal
  }

  console.log(`  ✓ Fixed and committed`);
  results.fixed.push(num);
}

// ─── Validate at least one fix succeeded ────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${results.fixed.length} fixed, ${results.skipped.length} skipped`);

if (results.fixed.length === 0) {
  console.error('All issues were skipped — no PR will be created.');
  process.exit(1);
}

// ─── Build PR title and body ─────────────────────────────────────────────────

const fixedList = results.fixed.map(n => `- Closes #${n}`).join('\n');
const skippedList = results.skipped.length > 0
  ? results.skipped.map(s => `- #${s.num} — ${s.reason}: \`${s.detail.replace(/\n/g, ' ')}\``).join('\n')
  : '_None_';

const issueLabel = results.fixed.length === 1
  ? `issue #${results.fixed[0]}`
  : `issues ${results.fixed.map(n => `#${n}`).join(', ')}`;

const prTitle = `Auto-fix: ${issueLabel}`;

const prBody = `## Auto-generated bug fixes

This PR was generated automatically by the [Fix GitHub Issues](../../actions/workflows/fix-issues.yml) workflow using Claude Code.

### Fixed
${fixedList}
${results.skipped.length > 0 ? `\n### Skipped (lint failed or no changes)\n${skippedList}` : ''}

## Review checklist
- [ ] Verify each fix addresses the issue described
- [ ] Run \`npm run lint\` locally to confirm no type errors
- [ ] Smoke test the affected feature (\`npm run dev:local-test\`)

> Always review AI-generated code before merging.

🤖 Generated with [Claude Code](https://claude.com/claude-code)`;

setOutput('pr_title', prTitle);
setOutput('pr_body', prBody);

console.log(`\nPR title: ${prTitle}`);
console.log('PR body written to GITHUB_OUTPUT');
