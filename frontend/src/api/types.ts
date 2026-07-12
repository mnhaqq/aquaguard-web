export type AppMode = "normal" | "demo_active" | "demo_inactive";

export interface Reading {
  device_name: string;
  health_score: number;
  water_level: number;
  water_temp: number;
  ph: number;
  tds: number;
  turbidity: number;
  date_str: string;
  timestamp_str: string;
  received_at: string;
  source: AppMode;
}

export interface DeviceEvent {
  id: number;
  topic: string;
  payload: Record<string, unknown>;
  received_at: string;
}

export interface Status {
  mqtt_connected: boolean;
  data_source: AppMode;
  mode: string | null;
  last_seen: string | null;
}

export interface CommandAck {
  published: Record<string, unknown>;
}
