import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CloudFog,
  Droplets,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Thermometer,
  Waves,
} from "lucide-react";
import { api } from "../api/client";
import type { Reading } from "../api/types";
import MetricChart from "../components/MetricChart";

const METRICS: {
  key: string;
  label: string;
  unit: string;
  icon: typeof Thermometer;
  color: string;
  precision: number;
  accessor: (r: Reading) => number;
}[] = [
  {
    key: "temp",
    label: "Water temperature",
    unit: "°C",
    icon: Thermometer,
    color: "var(--chart-temp)",
    precision: 1,
    accessor: (r) => r.water_temp,
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    icon: FlaskConical,
    color: "var(--chart-ph)",
    precision: 2,
    accessor: (r) => r.ph,
  },
  {
    key: "tds",
    label: "TDS",
    unit: "ppm",
    icon: Droplets,
    color: "var(--chart-tds)",
    precision: 0,
    accessor: (r) => r.tds,
  },
  {
    key: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    icon: CloudFog,
    color: "var(--chart-turbidity)",
    precision: 1,
    accessor: (r) => r.turbidity,
  },
  {
    key: "level",
    label: "Water level",
    unit: "cm",
    icon: Waves,
    color: "var(--chart-level)",
    precision: 0,
    accessor: (r) => r.water_level,
  },
  {
    key: "health",
    label: "Health score",
    unit: "%",
    icon: HeartPulse,
    color: "var(--chart-health)",
    precision: 0,
    accessor: (r) => r.health_score,
  },
];

const RANGES = [
  { label: "Last hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

export default function Dashboard() {
  const [rangeHours, setRangeHours] = useState(24);

  const readingQuery = useQuery({
    queryKey: ["reading", "latest"],
    queryFn: api.getLatestReading,
  });

  const statusQuery = useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
  });

  const historyQuery = useQuery({
    queryKey: ["readings", "history", rangeHours],
    queryFn: () =>
      api.getReadingHistory({
        from: new Date(Date.now() - rangeHours * 3600_000).toISOString(),
        limit: 2000,
      }),
    refetchInterval: 15000,
  });

  const reading = readingQuery.data;
  const status = statusQuery.data;
  const history = historyQuery.data ?? [];

  return (
    <div>
      <div className="page-header">
        <h2>
          <LayoutDashboard size={20} /> Dashboard
        </h2>
        <div className="badge-row">
          {status && <span className="badge">Mode: {status.mode ?? "unknown"}</span>}
        </div>
      </div>

      {readingQuery.isError && (
        <div className="error-banner">
          No sensor data available yet — is the device powered on and connected?
        </div>
      )}

      {reading && (
        <div className="card-grid">
          {METRICS.map(({ key, label, unit, icon: Icon, color, precision, accessor }) => (
            <div className="card metric-card" key={key} style={{ "--tint": color } as React.CSSProperties}>
              <span className="metric-icon">
                <Icon size={18} color={color} />
              </span>
              <p className="label">{label}</p>
              <p className="value">
                {accessor(reading).toFixed(precision)}
                {unit && <span className="unit">{unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="range-row">
        {RANGES.map((r) => (
          <button
            key={r.hours}
            className={rangeHours === r.hours ? "active" : ""}
            onClick={() => setRangeHours(r.hours)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {historyQuery.isLoading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <div className="chart-grid">
          {METRICS.map(({ key, label, unit, color, precision, accessor }) => (
            <MetricChart
              key={key}
              title={label}
              unit={unit}
              color={color}
              data={history}
              accessor={accessor}
              precision={precision}
            />
          ))}
        </div>
      )}
    </div>
  );
}
