export const theme = {
  colors: {
    bg: '#09090b', // zinc-950
    surface: '#18181b', // zinc-900
    surface2: '#27272a', // zinc-800
    border: '#27272a',
    borderSubtle: 'rgba(39,39,42,0.6)',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    textDim: '#71717a',
    primary: '#fafafa',
    primaryFg: '#09090b',
    // Accent colors (brand)
    accent: '#a78bfa', // violet-400
    accent2: '#60a5fa', // blue-400
    accent3: '#f472b6', // pink-400
    accentGlow: 'rgba(167,139,250,0.15)',
    // Semantic
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    h1: { fontSize: 32, fontWeight: '300' as const, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '500' as const, letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '500' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    small: { fontSize: 13, fontWeight: '400' as const },
    overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 2, textTransform: 'uppercase' as const },
  },
};

export const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const DAYS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export const CATEGORY_COLORS = [
  '#a78bfa', '#60a5fa', '#10b981', '#f59e0b',
  '#ef4444', '#f472b6', '#06b6d4', '#84cc16',
];

export const NOTE_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#db2777', '#0891b2', '#65a30d',
];
