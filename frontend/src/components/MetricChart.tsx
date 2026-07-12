import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Reading } from "../api/types";

interface Props {
  title: string;
  unit: string;
  color: string;
  data: Reading[];
  accessor: (r: Reading) => number;
  precision?: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MetricChart({ title, unit, color, data, accessor, precision = 1 }: Props) {
  const points = data.map((r) => ({ t: r.received_at, v: accessor(r) }));
  const last = points.at(-1)?.v;

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h4>{title}</h4>
        {last !== undefined && (
          <span className="last-value" style={{ color }}>
            {last.toFixed(precision)} {unit}
          </span>
        )}
      </div>
      {points.length === 0 ? (
        <div className="empty-state">No data in this range</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={formatTime}
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              minTickGap={40}
            />
            <YAxis
              width={40}
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="chart-tooltip">
                    <div>{formatTime(String(label))}</div>
                    <strong>
                      {(payload[0].value as number).toFixed(precision)} {unit}
                    </strong>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
