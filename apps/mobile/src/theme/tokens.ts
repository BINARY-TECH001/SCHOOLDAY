export const colors = {
  // Official SchoolDay Brand Foundations
  navy: "#14213d",
  navyDark: "#0a1120",
  navyLight: "#1e2d4d",
  navyBorder: "#2a3b5c",
  navyMuted: "#475569",

  // Brand Accent (Official Pure Orange)
  orange: "#ff6600",
  orangeBright: "#ff771a",
  orangeLight: "#fff7ed",
  orangeGlow: "rgba(255, 102, 0, 0.12)",

  // Secondary Accent & Indigo Tones
  indigo: "#4f46e5",
  indigoBright: "#6366f1",
  indigoLight: "#eef2ff",
  indigoText: "#3730a3",

  // Clean Surfaces & Backgrounds
  bg: "#f8fafc",
  card: "#ffffff",
  surface: "#ffffff",
  surfaceSubtle: "#f1f5f9",
  surfaceMuted: "#e2e8f0",
  glassBg: "rgba(255, 255, 255, 0.95)",
  glassDarkBg: "rgba(20, 33, 61, 0.95)",

  // Typography & Subtle Borders
  ink: "#14213d",
  inkSecondary: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  borderDark: "#cbd5e1",

  // Semantic Status Colors
  green: "#10b981",
  greenDark: "#059669",
  greenLight: "#ecfdf5",
  greenText: "#065f46",

  amber: "#f59e0b",
  amberDark: "#d97706",
  amberLight: "#fffbeb",
  amberText: "#b45309",

  red: "#ef4444",
  redDark: "#dc2626",
  redLight: "#fef2f2",
  redText: "#991b1b",
  danger: "#ef4444",
  dangerLight: "#fef2f2",

  purple: "#8b5cf6",
  purpleDark: "#7c3aed",
  purpleLight: "#f5f3ff",
  purpleText: "#6d28d9",

  blue: "#0ea5e9",
  blueLight: "#f0f9ff",
  blueText: "#0369a1",

  peach: "#fff7ed",

  // Aliases for modern utilities
  white: "#ffffff",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e2d4d",
  slate900: "#14213d",
  emerald: "#10b981",
  rose: "#ef4444",
};

export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  semiBold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extra: "Manrope_800ExtraBold",
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};
export const radii = radius;

// Restrained shadows: subtle, calm, non-distracting elevation
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#14213d",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#14213d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: "#14213d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};
