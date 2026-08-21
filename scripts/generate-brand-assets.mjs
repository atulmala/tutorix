#!/usr/bin/env node
/**
 * Generate app icons, native splash assets, JS splash, and web favicons
 * from icons/tutorix-logo.png and icons/tutorix-splash.png.
 *
 * Usage: npm run generate:brand-assets
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_PATH = path.join(ROOT, 'icons/tutorix-logo.png');
const SPLASH_PATH = path.join(ROOT, 'icons/tutorix-splash.png');

const WHITE_THRESHOLD = 245;
const ICON_BACKGROUND = '#FFFFFF';
const NOTIFICATION_ACCENT = '#1FBBA6';

const IOS_ICONS = [
  { idiom: 'iphone', size: '20x20', scale: '2x', px: 40, file: 'icon-20@2x.png' },
  { idiom: 'iphone', size: '20x20', scale: '3x', px: 60, file: 'icon-20@3x.png' },
  { idiom: 'iphone', size: '29x29', scale: '2x', px: 58, file: 'icon-29@2x.png' },
  { idiom: 'iphone', size: '29x29', scale: '3x', px: 87, file: 'icon-29@3x.png' },
  { idiom: 'iphone', size: '40x40', scale: '2x', px: 80, file: 'icon-40@2x.png' },
  { idiom: 'iphone', size: '40x40', scale: '3x', px: 120, file: 'icon-40@3x.png' },
  { idiom: 'iphone', size: '60x60', scale: '2x', px: 120, file: 'icon-60@2x.png' },
  { idiom: 'iphone', size: '60x60', scale: '3x', px: 180, file: 'icon-60@3x.png' },
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', px: 1024, file: 'icon-1024.png' },
];

const ANDROID_DENSITIES = [
  { name: 'mdpi', scale: 1 },
  { name: 'hdpi', scale: 1.5 },
  { name: 'xhdpi', scale: 2 },
  { name: 'xxhdpi', scale: 3 },
  { name: 'xxxhdpi', scale: 4 },
];

function isInk(r, g, b, threshold = WHITE_THRESHOLD) {
  return r < threshold || g < threshold || b < threshold;
}

function hexFromRgb({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function loadRaw(filePath) {
  const { data, info } = await sharp(filePath).removeAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function bbox(data, width, height, channels, { y0 = 0, y1 = height - 1, x0 = 0, x1 = width - 1 } = {}) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * width + x) * channels;
      if (isInk(data[i], data[i + 1], data[i + 2])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) {
    throw new Error('No non-white content found');
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function rowInk(data, width, y, channels) {
  let n = 0;
  const row = y * width * channels;
  for (let x = 0; x < width; x += 1) {
    const i = row + x * channels;
    if (isInk(data[i], data[i + 1], data[i + 2])) n += 1;
  }
  return n;
}

function graphicMarkBox(data, width, height, channels) {
  const overall = bbox(data, width, height, channels);
  const contentBottom = overall.top + overall.height - 1;
  const searchStart = overall.top + Math.floor(overall.height * 0.5);
  const searchEnd = overall.top + Math.floor(overall.height * 0.85);
  const inkThreshold = Math.max(8, Math.floor(width * 0.02));

  let gapStart = null;
  let bestGap = null;
  for (let y = searchStart; y <= searchEnd; y += 1) {
    const ink = rowInk(data, width, y, channels);
    if (ink < inkThreshold) {
      if (gapStart === null) gapStart = y;
    } else if (gapStart !== null) {
      const gap = { start: gapStart, end: y - 1 };
      if (!bestGap || gap.end - gap.start > bestGap.end - bestGap.start) {
        bestGap = gap;
      }
      gapStart = null;
    }
  }
  if (gapStart !== null) {
    const gap = { start: gapStart, end: searchEnd };
    if (!bestGap || gap.end - gap.start > bestGap.end - bestGap.start) {
      bestGap = gap;
    }
  }

  const markBottom = bestGap ? bestGap.start - 1 : contentBottom;
  return bbox(data, width, height, channels, {
    y0: overall.top,
    y1: Math.max(overall.top, markBottom),
  });
}

function padBox(box, imageWidth, imageHeight, padRatio) {
  const padX = Math.round(box.width * padRatio);
  const padY = Math.round(box.height * padRatio);
  const left = Math.max(0, box.left - padX);
  const top = Math.max(0, box.top - padY);
  const right = Math.min(imageWidth - 1, box.left + box.width - 1 + padX);
  const bottom = Math.min(imageHeight - 1, box.top + box.height - 1 + padY);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function extractRegion(filePath, box) {
  return sharp(filePath).extract(box).png().toBuffer();
}

async function fitOnSquare(input, size, { padRatio = 0.1, background = ICON_BACKGROUND } = {}) {
  const inner = Math.max(1, Math.round(size * (1 - 2 * padRatio)));
  const resized = await sharp(input)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .flatten({ background })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function sampleSplashBackground(filePath) {
  const { data, width, height, channels } = await loadRaw(filePath);
  const samples = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 8],
    [Math.floor(width / 2), height - 9],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of samples) {
    const i = (y * width + x) * channels;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const n = samples.length;
  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  };
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function writePng(filePath, buffer) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, buffer);
}

function iosContentsJson() {
  return {
    images: IOS_ICONS.map(({ idiom, size, scale, file }) => ({
      filename: file,
      idiom,
      scale,
      size,
    })),
    info: { author: 'xcode', version: 1 },
  };
}

function splashImagesetContents() {
  return {
    images: [
      { idiom: 'universal', filename: 'SplashLogo.png', scale: '1x' },
      { idiom: 'universal', filename: 'SplashLogo@2x.png', scale: '2x' },
      { idiom: 'universal', filename: 'SplashLogo@3x.png', scale: '3x' },
    ],
    info: { author: 'xcode', version: 1 },
  };
}

function launchScreenStoryboard(bgHex, imageWidth, imageHeight) {
  const r = Number.parseInt(bgHex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(bgHex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(bgHex.slice(5, 7), 16) / 255;
  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21701" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina6_1" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21679"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="414" height="896"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" image="SplashLogo" translatesAutoresizingMaskIntoConstraints="NO" id="YRO-k0-Ey4">
                                <rect key="frame" x="0.0" y="0.0" width="414" height="896"/>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
                        <color key="backgroundColor" red="${r.toFixed(3)}" green="${g.toFixed(3)}" blue="${b.toFixed(3)}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="YRO-k0-Ey4" firstAttribute="leading" secondItem="Ze5-6b-2t3" secondAttribute="leading" id="spl-lead"/>
                            <constraint firstAttribute="trailing" secondItem="YRO-k0-Ey4" secondAttribute="trailing" id="spl-trail"/>
                            <constraint firstItem="YRO-k0-Ey4" firstAttribute="top" secondItem="Ze5-6b-2t3" secondAttribute="top" id="spl-top"/>
                            <constraint firstAttribute="bottom" secondItem="YRO-k0-Ey4" secondAttribute="bottom" id="spl-bot"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="52" y="375"/>
        </scene>
    </scenes>
    <resources>
        <image name="SplashLogo" width="${imageWidth}" height="${imageHeight}"/>
    </resources>
</document>
`;
}

function androidColorsXml(splashHex) {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ICON_BACKGROUND}</color>
    <color name="splash_background">${splashHex}</color>
    <color name="notification_accent">${NOTIFICATION_ACCENT}</color>
</resources>
`;
}

function androidLaunchScreenXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background" />
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_image" />
    </item>
</layer-list>
`;
}

function androidAdaptiveIconXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
}

function encodeIco(images) {
  const count = images.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const entries = images.map((image) => {
    const entry = { ...image, offset };
    offset += image.png.length;
    return entry;
  });
  const buf = Buffer.alloc(offset);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);
  let pos = 6;
  for (const entry of entries) {
    buf.writeUInt8(entry.width >= 256 ? 0 : entry.width, pos);
    buf.writeUInt8(entry.height >= 256 ? 0 : entry.height, pos + 1);
    buf.writeUInt8(0, pos + 2);
    buf.writeUInt8(0, pos + 3);
    buf.writeUInt16LE(1, pos + 4);
    buf.writeUInt16LE(32, pos + 6);
    buf.writeUInt32LE(entry.png.length, pos + 8);
    buf.writeUInt32LE(entry.offset, pos + 12);
    pos += 16;
  }
  for (const entry of entries) {
    entry.png.copy(buf, entry.offset);
  }
  return buf;
}

async function whiteSilhouette(input, size, padRatio = 0.16) {
  const inner = Math.max(1, Math.round(size * (1 - 2 * padRatio)));
  const { data, info } = await sharp(input)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const mark =
      data[i + 3] > 16 &&
      (data[i] < WHITE_THRESHOLD ||
        data[i + 1] < WHITE_THRESHOLD ||
        data[i + 2] < WHITE_THRESHOLD);
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = mark ? 255 : 0;
  }
  const glyph = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function resizeSplash(width) {
  const meta = await sharp(SPLASH_PATH).metadata();
  const height = Math.round((width * meta.height) / meta.width);
  return {
    buffer: await sharp(SPLASH_PATH).resize(width, height).png().toBuffer(),
    width,
    height,
  };
}

async function main() {
  const logoRaw = await loadRaw(LOGO_PATH);
  const markBox = graphicMarkBox(logoRaw.data, logoRaw.width, logoRaw.height, logoRaw.channels);
  const paddedMark = padBox(markBox, logoRaw.width, logoRaw.height, 0.04);
  const markPng = await extractRegion(LOGO_PATH, paddedMark);

  const lockupBox = padBox(
    bbox(logoRaw.data, logoRaw.width, logoRaw.height, logoRaw.channels),
    logoRaw.width,
    logoRaw.height,
    0.04,
  );
  const lockupPng = await extractRegion(LOGO_PATH, lockupBox);

  const splashBg = await sampleSplashBackground(SPLASH_PATH);
  const splashHex = hexFromRgb(splashBg);
  console.log(`Graphic mark crop: ${paddedMark.width}x${paddedMark.height} @ (${paddedMark.left},${paddedMark.top})`);
  console.log(`Splash background: ${splashHex}`);

  const iosIconDir = path.join(
    ROOT,
    'apps/mobile/ios/Mobile/Images.xcassets/AppIcon.appiconset',
  );
  await ensureDir(iosIconDir);
  for (const icon of IOS_ICONS) {
    const buf = await fitOnSquare(markPng, icon.px, { padRatio: 0.1 });
    await writePng(path.join(iosIconDir, icon.file), buf);
  }
  await writeFile(path.join(iosIconDir, 'Contents.json'), `${JSON.stringify(iosContentsJson(), null, 2)}\n`);

  const androidRes = path.join(ROOT, 'apps/mobile/android/app/src/main/res');
  for (const { name, scale } of ANDROID_DENSITIES) {
    const legacy = await fitOnSquare(markPng, Math.round(48 * scale), { padRatio: 0.08 });
    const foreground = await fitOnSquare(markPng, Math.round(108 * scale), { padRatio: 1 / 6 });
    const mipmap = path.join(androidRes, `mipmap-${name}`);
    await writePng(path.join(mipmap, 'ic_launcher.png'), legacy);
    await writePng(path.join(mipmap, 'ic_launcher_round.png'), legacy);
    await writePng(path.join(mipmap, 'ic_launcher_foreground.png'), foreground);
    const notificationIcon = await whiteSilhouette(markPng, Math.round(24 * scale));
    await writePng(
      path.join(androidRes, `drawable-${name}`, 'ic_notification.png'),
      notificationIcon,
    );
  }
  const anyDpi = path.join(androidRes, 'mipmap-anydpi-v26');
  await ensureDir(anyDpi);
  await writeFile(path.join(anyDpi, 'ic_launcher.xml'), androidAdaptiveIconXml());
  await writeFile(path.join(anyDpi, 'ic_launcher_round.xml'), androidAdaptiveIconXml());
  await writeFile(path.join(androidRes, 'values/colors.xml'), androidColorsXml(splashHex));
  await writeFile(path.join(androidRes, 'drawable/launch_screen.xml'), androidLaunchScreenXml());

  const splash1x = await resizeSplash(390);
  const splash2x = await resizeSplash(780);
  const splash3x = await resizeSplash(1170);
  const iosSplashDir = path.join(
    ROOT,
    'apps/mobile/ios/Mobile/Images.xcassets/SplashLogo.imageset',
  );
  await ensureDir(iosSplashDir);
  await writePng(path.join(iosSplashDir, 'SplashLogo.png'), splash1x.buffer);
  await writePng(path.join(iosSplashDir, 'SplashLogo@2x.png'), splash2x.buffer);
  await writePng(path.join(iosSplashDir, 'SplashLogo@3x.png'), splash3x.buffer);
  await writeFile(
    path.join(iosSplashDir, 'Contents.json'),
    `${JSON.stringify(splashImagesetContents(), null, 2)}\n`,
  );
  await writeFile(
    path.join(ROOT, 'apps/mobile/ios/Mobile/LaunchScreen.storyboard'),
    launchScreenStoryboard(splashHex, splash1x.width, splash1x.height),
  );

  for (const { name, scale } of ANDROID_DENSITIES) {
    const splash = await resizeSplash(Math.round(360 * scale));
    await writePng(path.join(androidRes, `drawable-${name}`, 'splash_image.png'), splash.buffer);
  }

  const jsAssets = path.join(ROOT, 'apps/mobile/src/assets');
  await writePng(path.join(jsAssets, 'tutorix-splash.png'), splash1x.buffer);
  await writePng(path.join(jsAssets, 'tutorix-splash@2x.png'), splash2x.buffer);
  await writePng(path.join(jsAssets, 'tutorix-splash@3x.png'), splash3x.buffer);
  const jsIcon = await fitOnSquare(markPng, 192, { padRatio: 0.08 });
  await writePng(path.join(jsAssets, 'tutorix-icon.png'), jsIcon);
  await writeFile(
    path.join(jsAssets, 'brand-colors.ts'),
    `/** Generated by scripts/generate-brand-assets.mjs — do not edit by hand. */\nexport const SPLASH_BACKGROUND = '${splashHex}';\n`,
  );

  const fav16 = await fitOnSquare(markPng, 16, { padRatio: 0.08 });
  const fav32 = await fitOnSquare(markPng, 32, { padRatio: 0.08 });
  const appleTouch = await fitOnSquare(markPng, 180, { padRatio: 0.08 });
  const lockupWeb = await sharp(lockupPng)
    .resize({ height: 256, fit: 'inside' })
    .png()
    .toBuffer();

  for (const app of ['web', 'web-admin']) {
    const publicDir = path.join(ROOT, `apps/${app}/public`);
    await writePng(path.join(publicDir, 'favicon-16x16.png'), fav16);
    await writePng(path.join(publicDir, 'favicon-32x32.png'), fav32);
    await writePng(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
    await writePng(path.join(publicDir, 'tutorix-logo.png'), lockupWeb);
    await writeFile(
      path.join(publicDir, 'favicon.ico'),
      encodeIco([
        { png: fav16, width: 16, height: 16 },
        { png: fav32, width: 32, height: 32 },
      ]),
    );
  }

  console.log('Generated iOS, Android, JS, and web brand assets.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
