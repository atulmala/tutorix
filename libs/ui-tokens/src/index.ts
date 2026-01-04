// Central design tokens for web and mobile.
export const colors = {
  primary: '#143055',
  primaryAccent: '#16a34a',
  surface: '#ffffff',
  muted: '#6b7280',
  subtle: '#e5e7eb',
  danger: '#dc2626',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 24,
  full: 9999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
};

export const fonts = {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.08)',
  md: '0 4px 10px rgba(0, 0, 0, 0.10)',
  lg: '0 12px 30px rgba(0, 0, 0, 0.14)',
};

export const tokens = {
  colors,
  spacing,
  radii,
  fontSizes,
  fonts,
  shadows,
};

export type Tokens = typeof tokens;

