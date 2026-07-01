/**
 * Exact design tokens from Figma file: Financial Spreading BMO
 * Source: https://www.figma.com/proto/iIz0hCrg16kokI1DbHxNvk/Financial-Spreading-BMO
 * Extracted via Figma MCP get_design_context on node 1:40587 — Jul 1, 2026
 *
 * Variable name                    Figma value        Usage
 * ─────────────────────────────────────────────────────────
 * --base/sidebar                   #fafafa            page bg, left nav
 * --base/sidebar-accent            #e1e5ea            active nav icon bg
 * --base/primary                   #0a5af5            CTA button, accent blue
 * --base/border                    #c2cad6            card borders, table lines
 * --base/primary-foreground        white              button text on blue
 * --tailwind-colors/teal/600       #0d9488            avatar
 * --tailwind-colors/slate/200      #c2cad6            KPI card border (alias)
 * Tab active underline             #1860ec            active tab, positive delta
 * KPI value text                   #1a1a1a            primary text
 * KPI label / secondary text       rgba(0,0,0,0.6)    tertiary text
 * Body text                        rgba(0,0,0,0.87)   secondary text
 * Negative delta                   #b42018            red delta (confirmed)
 * Chart / bar fill                 #1860ec            bar chart fill
 * Table border                     #c2cad6            table outer border
 * Search input border              #8595ad            input field border
 * Breadcrumb text                  #374462            subdued nav text
 * Table list toggle border         #0c378d            active icon outline
 */

export const figmaTokens = {
  /** Page and nav background */
  sidebar: "#fafafa",
  /** Active nav item background */
  sidebarAccent: "#e1e5ea",
  /** Primary CTA blue — button bg, agent tag dot, active tab */
  primary: "#0a5af5",
  /** Active tab underline + positive KPI delta */
  primaryActive: "#1860ec",
  /** Card/table border */
  border: "#c2cad6",
  /** Primary text — KPI values, headings */
  textPrimary: "#1a1a1a",
  /** Body text at 87% opacity */
  textBody: "rgba(0,0,0,0.87)",
  /** Label/secondary text at 60% opacity */
  textSecondary: "rgba(0,0,0,0.6)",
  /** Subdued nav / breadcrumb text */
  textNav: "#374462",
  /** Input placeholder text */
  textPlaceholder: "#52627a",
  /** Negative KPI delta (confirmed from Figma) */
  textNegative: "#b42018",
  /** Chart / bar fill */
  chartBlue: "#1860ec",
  /** Avatar teal */
  teal600: "#0d9488",
  /** Button text on primary blue */
  primaryForeground: "#ffffff",
  /** Input border */
  inputBorder: "#8595ad",
} as const;

/** Structured theme used throughout the app — mirrors canvas useHostTheme() shape */
export const lightTheme = {
  bg: {
    editor: "#ffffff",
    chrome: figmaTokens.sidebar,
    elevated: "#ffffff",
  },
  text: {
    primary: figmaTokens.textPrimary,
    secondary: figmaTokens.textBody,
    tertiary: figmaTokens.textSecondary,
    quaternary: figmaTokens.textNav,
    link: figmaTokens.primary,
    onAccent: figmaTokens.primaryForeground,
  },
  stroke: {
    primary: figmaTokens.border,
    secondary: figmaTokens.border,
    tertiary: figmaTokens.sidebarAccent,
    focused: figmaTokens.primaryActive,
  },
  fill: {
    secondary: figmaTokens.sidebarAccent,
    tertiary: "#f0f2f5",
    quaternary: "#f5f6f8",
  },
  accent: {
    primary: figmaTokens.primary,
    control: figmaTokens.teal600,
  },
  diff: {
    removedLine: figmaTokens.textNegative,
  },
  category: {
    /** Positive delta / success green */
    green: "#1f8a65",
    /** Warning / review amber — derived from industry standard, not explicit in this Figma node */
    orange: "#c08532",
  },
} as const;

export type AppTheme = typeof lightTheme;

export function useHostTheme(): AppTheme {
  return lightTheme;
}
