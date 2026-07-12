import type { CommandAck, DeviceEvent, Reading, Status } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getLatestReading: () => request<Reading>("/api/readings/latest"),

  getReadingHistory: (params: { from?: string; to?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    if (params.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return request<Reading[]>(`/api/readings${qs ? `?${qs}` : ""}`);
  },

  getEvents: (limit = 50) => request<DeviceEvent[]>(`/api/events?limit=${limit}`),

  getStatus: () => request<Status>("/api/status"),

  setAutomation: (enter: boolean) =>
    request<CommandAck>("/api/commands/automation", {
      method: "POST",
      body: JSON.stringify({ enter }),
    }),

  controlPump: (pump: "pump_in" | "pump_out", state: boolean) =>
    request<CommandAck>("/api/commands/pump", {
      method: "POST",
      body: JSON.stringify({ pump, state }),
    }),

  updateTankHeight: (tank_height: number) =>
    request<CommandAck>("/api/commands/tank-height", {
      method: "POST",
      body: JSON.stringify({ tank_height }),
    }),

  updateWaterLevelMark: (water_level_mark: number) =>
    request<CommandAck>("/api/commands/water-level-mark", {
      method: "POST",
      body: JSON.stringify({ water_level_mark }),
    }),

  factoryReset: () =>
    request<CommandAck>("/api/commands/factory-reset", { method: "POST" }),
};
