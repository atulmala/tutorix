#!/usr/bin/env node
/**
 * Bump the Tutorix mobile app version everywhere it is declared:
 * - apps/mobile/src/app/config.ts            APP_VERSION
 * - apps/mobile/android/app/build.gradle     versionName / versionCode
 * - apps/mobile/ios/Mobile.xcodeproj         MARKETING_VERSION / CURRENT_PROJECT_VERSION
 *   (app and ScreenShare extension targets)
 *
 * The build number (Android versionCode, iOS CURRENT_PROJECT_VERSION) always
 * increases by one, because both stores reject a reused build number.
 *
 * Usage: npm run mobile:version:bump -- patch|minor|major|build
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_TS = path.join(ROOT, 'apps/mobile/src/app/config.ts');
const BUILD_GRADLE = path.join(ROOT, 'apps/mobile/android/app/build.gradle');
const PBXPROJ = path.join(ROOT, 'apps/mobile/ios/Mobile.xcodeproj/project.pbxproj');

const APP_VERSION_RE = /export const APP_VERSION = '(\d+\.\d+\.\d+)';/;
const VERSION_NAME_RE = /versionName "(\d+\.\d+\.\d+)"/;
const VERSION_CODE_RE = /versionCode (\d+)/;
const MARKETING_VERSION_RE = /MARKETING_VERSION = (\d+\.\d+\.\d+);/g;
const PROJECT_VERSION_RE = /CURRENT_PROJECT_VERSION = (\d+);/g;

function fail(message) {
  console.error(`mobile-bump-version: ${message}`);
  process.exit(1);
}

function nextVersion(current, part) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (part) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'build':
      return current;
    default:
      return fail(`unknown bump "${part}". Use patch, minor, major, or build.`);
  }
}

function single(content, re, label) {
  const match = content.match(re);
  if (!match) {
    fail(`could not find ${label}`);
  }
  return match[1];
}

function allEqual(content, re, label) {
  const values = [...content.matchAll(re)].map((m) => m[1]);
  if (values.length === 0) {
    fail(`could not find ${label}`);
  }
  if (new Set(values).size !== 1) {
    fail(`${label} differs between targets (${values.join(', ')}); fix it by hand first`);
  }
  return values[0];
}

async function main() {
  const part = process.argv[2];
  if (!part) {
    fail('missing bump type. Usage: npm run mobile:version:bump -- patch|minor|major|build');
  }

  const [configTs, gradle, pbxproj] = await Promise.all([
    readFile(CONFIG_TS, 'utf8'),
    readFile(BUILD_GRADLE, 'utf8'),
    readFile(PBXPROJ, 'utf8'),
  ]);

  const appVersion = single(configTs, APP_VERSION_RE, 'APP_VERSION in config.ts');
  const versionName = single(gradle, VERSION_NAME_RE, 'versionName in build.gradle');
  const versionCode = Number(single(gradle, VERSION_CODE_RE, 'versionCode in build.gradle'));
  const marketingVersion = allEqual(pbxproj, MARKETING_VERSION_RE, 'MARKETING_VERSION');
  const projectVersion = Number(allEqual(pbxproj, PROJECT_VERSION_RE, 'CURRENT_PROJECT_VERSION'));

  if (new Set([appVersion, versionName, marketingVersion]).size !== 1) {
    fail(
      `versions are out of sync (config.ts ${appVersion}, Android ${versionName}, iOS ${marketingVersion}); fix them by hand first`,
    );
  }

  const version = nextVersion(appVersion, part);
  const build = Math.max(versionCode, projectVersion) + 1;

  await Promise.all([
    writeFile(CONFIG_TS, configTs.replace(APP_VERSION_RE, `export const APP_VERSION = '${version}';`)),
    writeFile(
      BUILD_GRADLE,
      gradle
        .replace(VERSION_NAME_RE, `versionName "${version}"`)
        .replace(VERSION_CODE_RE, `versionCode ${build}`),
    ),
    writeFile(
      PBXPROJ,
      pbxproj
        .replace(MARKETING_VERSION_RE, `MARKETING_VERSION = ${version};`)
        .replace(PROJECT_VERSION_RE, `CURRENT_PROJECT_VERSION = ${build};`),
    ),
  ]);

  console.log(`Mobile version ${appVersion} (${Math.max(versionCode, projectVersion)}) -> ${version} (${build})`);
}

await main();
