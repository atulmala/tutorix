#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

function usage() {
  console.log(`Usage:
  npm run jira:create-from-plan -- docs/plans/example.plan.md [options]

Options:
  --project KEY       Jira project key. Defaults to JIRA_DEFAULT_PROJECT.
  --type NAME         Jira issue type. Defaults to Task.
  --issue KEY         Write an existing/created Jira issue key back to the plan.
  --status STATUS     Update plan status (planned, in-progress, done).
  --force             Allow output even when the plan already has a jira key.

This utility prepares the payload for a Jira MCP create-issue tool. It does not
call Jira directly; after the MCP tool returns an issue key, rerun with --issue.
`);
}

function parseArgs(argv) {
  const args = {
    planPath: null,
    project: process.env.JIRA_DEFAULT_PROJECT || '',
    issueType: 'Task',
    issueKey: '',
    status: '',
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--project') {
      args.project = argv[++i] || '';
      continue;
    }
    if (arg === '--type') {
      args.issueType = argv[++i] || '';
      continue;
    }
    if (arg === '--issue') {
      args.issueKey = argv[++i] || '';
      continue;
    }
    if (arg === '--status') {
      args.status = argv[++i] || '';
      continue;
    }
    if (arg === '--force') {
      args.force = true;
      continue;
    }
    if (!args.planPath) {
      args.planPath = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (!args.planPath) {
    usage();
    process.exit(1);
  }

  return args;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: {}, body: content, rawFrontmatter: '', hasFrontmatter: false };
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontmatter: {}, body: content, rawFrontmatter: '', hasFrontmatter: false };
  }

  const rawFrontmatter = content.slice(4, end);
  const body = content.slice(end + 5);
  const frontmatter = {};

  let currentListKey = null;
  for (const line of rawFrontmatter.split('\n')) {
    const listMatch = line.match(/^\s*-\s*(.+)$/);
    if (listMatch && currentListKey) {
      frontmatter[currentListKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      currentListKey = null;
      continue;
    }

    const value = match[2].trim();
    if (!value) {
      frontmatter[match[1]] = [];
      currentListKey = match[1];
      continue;
    }

    frontmatter[match[1]] =
      value === 'null' || value === '~' ? null : value.replace(/^["']|["']$/g, '');
    currentListKey = null;
  }

  return { frontmatter, body, rawFrontmatter, hasFrontmatter: true };
}

function titleFromFilename(filePath) {
  return basename(filePath)
    .replace(/\.plan\.md$|\.md$/i, '')
    .replace(/_[0-9a-f]{8}$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveTitle(filePath, frontmatter, body) {
  if (frontmatter.title) return frontmatter.title;
  if (frontmatter.name) return frontmatter.name;

  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();

  return titleFromFilename(filePath);
}

function deriveLabels(frontmatter) {
  const labels = new Set(['cursor-plan', 'implementation-plan']);
  if (Array.isArray(frontmatter.labels)) {
    for (const label of frontmatter.labels) {
      if (label) labels.add(label);
    }
  }
  return [...labels];
}

function updateFrontmatterField(content, field, value) {
  if (!content.startsWith('---\n')) {
    return `---\n${field}: ${value}\n---\n\n${content}`;
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return `---\n${field}: ${value}\n---\n\n${content}`;
  }

  const before = content.slice(0, end);
  const after = content.slice(end);
  const pattern = new RegExp(`^${field}:\\s*.*$`, 'm');

  if (pattern.test(before)) {
    return `${before.replace(pattern, `${field}: ${value}`)}${after}`;
  }

  return `${before}\n${field}: ${value}${after}`;
}

function updateJiraKey(content, issueKey) {
  return updateFrontmatterField(content, 'jira', issueKey);
}

function updateStatus(content, status) {
  return updateFrontmatterField(content, 'status', status);
}

const VALID_STATUSES = new Set(['planned', 'in-progress', 'done']);

function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = resolve(process.cwd(), args.planPath);
  const content = readFileSync(planPath, 'utf8');
  const parsed = parseFrontmatter(content);
  const existingJira = parsed.frontmatter.jira;

  if (args.status) {
    if (!VALID_STATUSES.has(args.status)) {
      throw new Error(`Invalid status: ${args.status}. Use planned, in-progress, or done.`);
    }
    writeFileSync(planPath, updateStatus(content, args.status));
    console.log(`Updated ${args.planPath} with status: ${args.status}`);
    return;
  }

  if (args.issueKey) {
    if (!ISSUE_KEY_PATTERN.test(args.issueKey)) {
      throw new Error(`Invalid Jira issue key: ${args.issueKey}`);
    }
    writeFileSync(planPath, updateJiraKey(content, args.issueKey));
    console.log(`Updated ${args.planPath} with jira: ${args.issueKey}`);
    return;
  }

  if (existingJira && !args.force) {
    throw new Error(
      `Plan already has jira: ${existingJira}. Use --force to print a payload anyway.`,
    );
  }

  if (!args.project) {
    throw new Error('Missing Jira project key. Set JIRA_DEFAULT_PROJECT or pass --project KEY.');
  }

  const payload = {
    project_key: args.project,
    issue_type: args.issueType,
    summary: deriveTitle(planPath, parsed.frontmatter, parsed.body),
    labels: deriveLabels(parsed.frontmatter),
    description: parsed.body.trim(),
  };

  console.log(JSON.stringify(payload, null, 2));
  console.log('\nAfter creating the issue through Jira MCP, write the key back with:');
  console.log(
    `npm run jira:create-from-plan -- ${args.planPath} --issue ${args.project}-123`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
