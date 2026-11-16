import { readFileSync } from 'fs';
import { join } from 'path';
import { APP_VERSION } from './config';

const MOBILE_ROOT = join(__dirname, '../..');

function read(relativePath: string): string {
  return readFileSync(join(MOBILE_ROOT, relativePath), 'utf8');
}

describe('mobile app version', () => {
  const gradle = read('android/app/build.gradle');
  const pbxproj = read('ios/Mobile.xcodeproj/project.pbxproj');

  it('matches Android versionName', () => {
    expect(gradle.match(/versionName "([^"]+)"/)?.[1]).toBe(APP_VERSION);
  });

  it('matches every iOS MARKETING_VERSION', () => {
    const versions = [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(
      (m) => m[1],
    );
    expect(versions.length).toBeGreaterThan(0);
    expect(new Set(versions)).toEqual(new Set([APP_VERSION]));
  });

  it('uses the same build number on Android and iOS', () => {
    const versionCode = gradle.match(/versionCode (\d+)/)?.[1];
    const projectVersions = [
      ...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g),
    ].map((m) => m[1]);
    expect(versionCode).toBeDefined();
    expect(new Set(projectVersions)).toEqual(new Set([versionCode]));
  });
});
