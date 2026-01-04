require('ts-node/register');

const {
  colors: tokenColors,
  spacing: tokenSpacing,
  radii: tokenRadii,
  fontSizes: tokenFontSizes,
  fonts: tokenFonts,
  shadows: tokenShadows,
} = require('../../libs/ui-tokens/src/index.ts');

const px = (value) => `${value}px`;
const mapPx = (record) =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, px(value)]),
  );

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../libs/**/*.{ts,tsx,js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: tokenColors.primary,
        primaryAccent: tokenColors.primaryAccent,
        surface: tokenColors.surface,
        muted: tokenColors.muted,
        subtle: tokenColors.subtle,
        danger: tokenColors.danger,
      },
      spacing: mapPx(tokenSpacing),
      borderRadius: mapPx(tokenRadii),
      fontSize: mapPx(tokenFontSizes),
      fontFamily: {
        sans: tokenFonts.sans,
        mono: tokenFonts.mono,
      },
      boxShadow: {
        sm: tokenShadows.sm,
        md: tokenShadows.md,
        lg: tokenShadows.lg,
      },
    },
  },
  plugins: [],
};

