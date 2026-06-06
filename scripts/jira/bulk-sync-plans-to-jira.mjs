#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;
const PROJECT = process.env.JIRA_DEFAULT_PROJECT || 'TUTORIX';
const ISSUE_TYPE_ID = '10007';
const DONE_TRANSITION_ID = '41';
const START_DATE_FIELD = 'customfield_10015';
const PLANS_DIR = resolve(process.cwd(), 'docs/plans');
const MCP_CONFIG = resolve(process.env.HOME || '', '.cursor/mcp.json');

function loadJiraConfig() {
  const raw = readFileSync(MCP_CONFIG, 'utf8');
  const cfg = JSON.parse(raw).mcpServers?.jira?.env;
  if (!cfg?.JIRA_BASE_URL || !cfg?.JIRA_EMAIL || !cfg?.JIRA_API_TOKEN) {
    throw new Error('Missing Jira credentials in ~/.cursor/mcp.json');
  }
  return {
    baseUrl: `${cfg.JIRA_BASE_URL.replace(/\/$/, '')}/rest/api/3`,
    email: cfg.JIRA_EMAIL,
    token: cfg.JIRA_API_TOKEN,
  };
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: {}, body: content };
  }
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: content };
  const raw = content.slice(4, end);
  const body = content.slice(end + 5);
  const frontmatter = {};
  let currentListKey = null;
  for (const line of raw.split('\n')) {
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
  return { frontmatter, body };
}

function titleFromFilename(filePath) {
  return basename(filePath)
    .replace(/\.plan\.md$|\.md$/i, '')
    .replace(/_[0-9a-f]{8}$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveTitle(filePath, frontmatter, body) {
  if (frontmatter.title) return frontmatter.title;
  if (frontmatter.name) return frontmatter.name;
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return titleFromFilename(filePath);
}

function gitCreatedDate(relPath) {
  try {
    const out = execSync(`git log --diff-filter=A --format='%ai' -- "${relPath}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    if (!out) return '2026-06-05';
    return out.split('\n')[0].slice(0, 10);
  } catch {
    return '2026-06-05';
  }
}

function updateFrontmatterField(content, field, value) {
  if (!content.startsWith('---\n')) {
    return `---\n${field}: ${value}\n---\n\n${content}`;
  }
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return `---\n${field}: ${value}\n---\n\n${content}`;
  const before = content.slice(0, end);
  const after = content.slice(end);
  const pattern = new RegExp(`^${field}:\\s*.*$`, 'm');
  if (pattern.test(before)) {
    return `${before.replace(pattern, `${field}: ${value}`)}${after}`;
  }
  return `${before}\n${field}: ${value}${after}`;
}

function plainTextToAdf(text) {
  const paragraphs = text.split(/\n{2,}/).map((block) => ({
    type: 'paragraph',
    content: block.split('\n').flatMap((line, index, lines) => {
      const nodes = [{ type: 'text', text: line }];
      if (index < lines.length - 1) nodes.push({ type: 'hardBreak' });
      return nodes;
    }),
  }));
  return {
    type: 'doc',
    version: 1,
    content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph', content: [] }],
  };
}

function truncate(text, max = 30000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Truncated for Jira description limit]`;
}

async function jiraRequest(cfg, method, path, body) {
  const auth = Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64');
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createAndComplete(cfg, planRelPath, summary, description, createdDate) {
  const created = await jiraRequest(cfg, 'POST', '/issue', {
    fields: {
      project: { key: PROJECT },
      summary: summary.slice(0, 255),
      issuetype: { id: ISSUE_TYPE_ID },
      description: plainTextToAdf(
        `Plan: ${planRelPath}\nPlan created: ${createdDate}\n\n${truncate(description)}`,
      ),
      labels: ['cursor-plan', 'implementation-plan'],
      [START_DATE_FIELD]: createdDate,
      duedate: createdDate,
    },
  });

  const key = created.key;

  await jiraRequest(cfg, 'POST', `/issue/${key}/comment`, {
    body: plainTextToAdf(
      `Implementation complete (bulk backfill).\n\nPlan: ${planRelPath}\nAcknowledged: all plan work already done.`,
    ),
  });

  await jiraRequest(cfg, 'POST', `/issue/${key}/transitions`, {
    transition: { id: DONE_TRANSITION_ID },
  });

  return key;
}

function listPlanFiles() {
  return readdirSync(PLANS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => join(PLANS_DIR, f));
}

async function main() {
  const cfg = loadJiraConfig();
  const results = { created: [], skipped: [], failed: [] };

  for (const planPath of listPlanFiles()) {
    const relPath = `docs/plans/${basename(planPath)}`;
    let content = readFileSync(planPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    const existingJira = frontmatter.jira;

    if (existingJira && ISSUE_KEY_PATTERN.test(String(existingJira))) {
      content = updateFrontmatterField(content, 'status', 'done');
      if (!frontmatter.created) {
        content = updateFrontmatterField(content, 'created', gitCreatedDate(relPath));
      }
      writeFileSync(planPath, content);
      results.skipped.push({ plan: relPath, jira: existingJira });
      continue;
    }

    const summary = deriveTitle(planPath, frontmatter, body);
    const createdDate = frontmatter.created || gitCreatedDate(relPath);

    try {
      const key = await createAndComplete(cfg, relPath, summary, body.trim(), createdDate);
      content = updateFrontmatterField(content, 'jira', key);
      content = updateFrontmatterField(content, 'status', 'done');
      content = updateFrontmatterField(content, 'created', createdDate);
      if (!frontmatter.title && frontmatter.name) {
        content = updateFrontmatterField(content, 'title', frontmatter.name);
      } else if (!frontmatter.title && !frontmatter.name) {
        content = updateFrontmatterField(content, 'title', summary);
      }
      writeFileSync(planPath, content);
      results.created.push({ plan: relPath, jira: key });
      console.log(`OK ${key} <- ${relPath}`);
      await new Promise((r) => setTimeout(r, 300));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.failed.push({ plan: relPath, error: message });
      console.error(`FAIL ${relPath}: ${message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${results.created.length}`);
  console.log(`Skipped (existing): ${results.skipped.length}`);
  console.log(`Failed: ${results.failed.length}`);
  if (results.failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
