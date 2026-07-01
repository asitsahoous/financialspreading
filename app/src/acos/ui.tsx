import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  type ButtonHTMLAttributes,
  createElement,
} from "react";
import { useHostTheme } from "./theme";

export { useHostTheme } from "./theme";
export { useCanvasState } from "./state";

export function mergeStyle(base: CSSProperties, override?: CSSProperties): CSSProperties {
  return override ? { ...base, ...override } : base;
}

export function Stack({
  children,
  gap = 8,
  style,
}: {
  children?: ReactNode;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>{children}</div>
  );
}

export function Row({
  children,
  gap = 8,
  align = "start",
  justify = "start",
  wrap,
  style,
}: {
  children?: ReactNode;
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
  wrap?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Grid({
  children,
  columns,
  gap = 12,
  style,
}: {
  children?: ReactNode;
  columns: number | string;
  gap?: number;
  align?: string;
  style?: CSSProperties;
}) {
  const cols = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  const theme = useHostTheme();
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${theme.stroke.tertiary}`,
        margin: 0,
        ...style,
      }}
    />
  );
}

export function Spacer() {
  return <div style={{ flex: 1 }} />;
}

type TextTone = "primary" | "secondary" | "tertiary" | "quaternary";
type TextWeight = "regular" | "medium" | "semibold";

export function Text({
  children,
  size,
  tone = "primary",
  weight,
  as: Tag = "p",
  style,
}: {
  children?: ReactNode;
  size?: "small";
  tone?: TextTone;
  weight?: TextWeight;
  as?: "p" | "span";
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const toneMap = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    tertiary: theme.text.tertiary,
    quaternary: theme.text.quaternary,
  };
  const fw = weight === "semibold" ? 600 : weight === "medium" ? 500 : 400;
  const fs = size === "small" ? 12 : 14;
  return createElement(
    Tag,
    {
      style: {
        margin: 0,
        fontSize: fs,
        lineHeight: size === "small" ? "16px" : "20px",
        color: toneMap[tone],
        fontWeight: fw,
        ...style,
      },
    },
    children,
  );
}

export function H2({ children }: { children?: ReactNode }) {
  return <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>{children}</h2>;
}

export function H3({ children }: { children?: ReactNode }) {
  return <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>{children}</h3>;
}

type PillTone = "success" | "warning" | "deleted" | "info" | "neutral";

const pillStyles: Record<PillTone, { bg: string; fg: string; border: string }> = {
  success: { bg: "#E8F5EF", fg: "#1F8A65", border: "#B8E0CE" },
  warning: { bg: "#FFF4E5", fg: "#C08532", border: "#F5D9A8" },
  deleted: { bg: "#FDECEA", fg: "#B42018", border: "#F5C4BE" },
  info: { bg: "#E8F0FE", fg: "#0A5AF5", border: "#B8D4FC" },
  neutral: { bg: "#F0F2F5", fg: "#1A1A1A8A", border: "#E1E5EA" },
};

export function Pill({ children, tone = "neutral" }: { children?: ReactNode; tone?: PillTone }) {
  const s = pillStyles[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
      }}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "secondary" }) {
  const theme = useHostTheme();
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    padding: "0 12px",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: rest.disabled ? "not-allowed" : rest.onClick ? "pointer" : "default",
    fontFamily: "Inter, sans-serif",
    opacity: rest.disabled ? 0.5 : 1,
  };
  const variants: Record<string, CSSProperties> = {
    primary: {
      background: theme.accent.primary,
      color: theme.text.onAccent,
      border: "none",
    },
    ghost: {
      background: "transparent",
      color: theme.text.primary,
      border: `1px solid ${theme.stroke.secondary}`,
    },
    secondary: {
      background: theme.fill.tertiary,
      color: theme.text.primary,
      border: `1px solid ${theme.stroke.secondary}`,
    },
  };
  return (
    <button type="button" style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

export function Card({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        background: theme.bg.editor,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  trailing,
}: {
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      <span>{children}</span>
      {trailing}
    </div>
  );
}

export function CardBody({ children }: { children?: ReactNode }) {
  return <div style={{ padding: 16 }}>{children}</div>;
}

type CalloutTone = "info" | "success" | "warning" | "danger";

const calloutBorder: Record<CalloutTone, string> = {
  info: "#0A5AF5",
  success: "#1F8A65",
  warning: "#C08532",
  danger: "#B42018",
};

export function Callout({
  children,
  title,
  tone = "info",
}: {
  children?: ReactNode;
  title?: string;
  tone?: CalloutTone;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        borderLeft: `3px solid ${calloutBorder[tone]}`,
        background: "#F8FAFC",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>}
      {children}
    </div>
  );
}

type TableRowTone = "success" | "danger" | "warning" | "info" | "neutral";

const rowDot: Record<TableRowTone, string> = {
  success: "#1F8A65",
  danger: "#B42018",
  warning: "#C08532",
  info: "#0A5AF5",
  neutral: "#888",
};

export function Table({
  headers,
  rows,
  rowTone,
  striped,
  renderRowExtra,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  rowTone?: Array<TableRowTone | undefined>;
  striped?: boolean;
  /** Optional expansion content rendered as a full-width row directly under row index `i`. */
  renderRowExtra?: (rowIndex: number) => ReactNode;
}) {
  const theme = useHostTheme();
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${theme.stroke.secondary}`, borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: theme.bg.elevated }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  fontWeight: 600,
                  borderBottom: `1px solid ${theme.stroke.secondary}`,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const tone = rowTone?.[ri];
            const extra = renderRowExtra?.(ri);
            return (
              <Fragment key={ri}>
                <tr
                  style={{
                    background: striped && ri % 2 === 1 ? theme.fill.quaternary : undefined,
                  }}
                >
                  {headers.map((_, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${theme.stroke.tertiary}`,
                        verticalAlign: "top",
                      }}
                    >
                      {ci === 0 && tone ? (
                        <Row gap={8} align="center">
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: rowDot[tone],
                              flexShrink: 0,
                            }}
                          />
                          {row[ci] ?? ""}
                        </Row>
                      ) : (
                        row[ci] ?? ""
                      )}
                    </td>
                  ))}
                </tr>
                {extra && (
                  <tr>
                    <td colSpan={headers.length} style={{ padding: 0, borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
                      {extra}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Exact chart bar color from Figma node 1:40668 — bg-[#1860ec]
const chartColors = ["#1860ec", "#0A5AF5", "#1F8A65", "#C08532"];

export function BarChart({
  categories,
  series,
  height = 200,
}: {
  categories: string[];
  series: { name: string; data: number[]; tone?: string }[];
  height?: number;
}) {
  const max = Math.max(...series.flatMap((s) => s.data), 1);
  const s = series[0];
  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 12, padding: "8px 4px 0" }}>
      {categories.map((cat, i) => {
        const val = s?.data[i] ?? 0;
        const barH = Math.max(8, (val / max) * (height - 40));
        return (
          <div
            key={cat}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 56,
                height: barH,
                background: chartColors[0],
                borderRadius: 4,
              }}
              title={`${val}`}
            />
            <span style={{ fontSize: 10, textAlign: "center", color: "#666", lineHeight: 1.2 }}>{cat}</span>
          </div>
        );
      })}
    </div>
  );
}

export function PieChart({
  data,
  size = 180,
}: {
  data: { label: string; value: number }[];
  size?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  const gradient = data
    .map((d, i) => {
      const start = (acc / total) * 100;
      acc += d.value;
      const end = (acc / total) * 100;
      return `${chartColors[i % chartColors.length]} ${start}% ${end}%`;
    })
    .join(", ");
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(${gradient})`,
          flexShrink: 0,
        }}
      />
      <Stack gap={4}>
        {data.map((d, i) => (
          <Row key={d.label} gap={8} align="center">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: chartColors[i % chartColors.length],
              }}
            />
            <Text size="small">
              {d.label}: {d.value}
            </Text>
          </Row>
        ))}
      </Stack>
    </div>
  );
}
