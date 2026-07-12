import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Power, Ruler, SlidersHorizontal, Waves } from "lucide-react";
import { api } from "../api/client";

const CONFIRMATION_TIMEOUT_MS = 8000;

export default function Controls() {
  const queryClient = useQueryClient();
  const [tankHeight, setTankHeight] = useState("");
  const [waterLevelMark, setWaterLevelMark] = useState("");
  const [lastPumpCommand, setLastPumpCommand] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // Tracks "we sent enter/exit_automation but haven't seen the device's own
  // status echo yet" — the switch can only reflect confirmed device state
  // (there's no local relay to optimistically flip), so without this the UI
  // just looks unresponsive while it's actually waiting on the device.
  const [pendingAutomation, setPendingAutomation] = useState<boolean | null>(null);
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusQuery = useQuery({ queryKey: ["status"], queryFn: api.getStatus });
  const status = statusQuery.data;
  const inAutomation = status?.mode === "automation";

  useEffect(() => {
    if (pendingAutomation === null || !status) return;
    const confirmed =
      (pendingAutomation && status.mode === "automation") ||
      (!pendingAutomation && status.mode !== "automation");
    if (confirmed) {
      setPendingAutomation(null);
      setConfirmationTimedOut(false);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    }
  }, [status, pendingAutomation]);

  useEffect(() => () => {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
  }, []);

  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: ["status"] });

  const runCommand = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      refreshStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Command failed");
    }
  };

  const automationMutation = useMutation({
    mutationFn: (enter: boolean) => api.setAutomation(enter),
    onSuccess: (_data, enter) => {
      setPendingAutomation(enter);
      setConfirmationTimedOut(false);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(() => setConfirmationTimedOut(true), CONFIRMATION_TIMEOUT_MS);
      refreshStatus();
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Command failed"),
  });

  const pumpMutation = useMutation({
    mutationFn: ({ pump, state }: { pump: "pump_in" | "pump_out"; state: boolean }) =>
      api.controlPump(pump, state),
    onSuccess: (_data, vars) => setLastPumpCommand((prev) => ({ ...prev, [vars.pump]: vars.state })),
    onError: (err) => setActionError(err instanceof Error ? err.message : "Command failed"),
  });

  const factoryResetMutation = useMutation({
    mutationFn: api.factoryReset,
    onSuccess: refreshStatus,
    onError: (err) => setActionError(err instanceof Error ? err.message : "Command failed"),
  });

  const submitTankHeight = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(tankHeight);
    if (!Number.isFinite(value)) return;
    runCommand(() => api.updateTankHeight(value));
  };

  const submitWaterLevelMark = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(waterLevelMark);
    if (!Number.isFinite(value)) return;
    runCommand(() => api.updateWaterLevelMark(value));
  };

  const confirmFactoryReset = () => {
    if (
      window.confirm(
        "Factory reset clears WiFi/MQTT/BLE provisioning on the device and reboots it. It will need to be re-provisioned over BLE. Continue?",
      )
    ) {
      factoryResetMutation.mutate();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>
          <SlidersHorizontal size={20} /> Controls
        </h2>
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="panel">
        <h3>
          <Power size={16} /> Automation mode
        </h3>
        <div className="control-row">
          <label htmlFor="automation-toggle">Automation</label>
          <span className="switch">
            <input
              id="automation-toggle"
              type="checkbox"
              checked={inAutomation}
              disabled={automationMutation.isPending || pendingAutomation !== null}
              onChange={(e) => automationMutation.mutate(e.target.checked)}
            />
            <span className="slider" />
          </span>
          {pendingAutomation !== null && !confirmationTimedOut && (
            <span className="hint pending">
              <Loader2 size={14} className="spin" /> Waiting for the device to confirm…
            </span>
          )}
        </div>
        {confirmationTimedOut && (
          <p className="hint warn-text">
            No confirmation from the device after {CONFIRMATION_TIMEOUT_MS / 1000}s — check it's
            powered on and connected to the MQTT broker. The command was sent; the switch will
            update automatically once the device responds.
          </p>
        )}
        <p className="hint">
          Current mode: {status?.mode ?? "unknown"}. Pump control below only takes effect while
          automation mode is on — that's a safety rule enforced by the firmware itself.
        </p>
      </div>

      <div className="panel">
        <h3>
          <Waves size={16} /> Pumps
        </h3>
        {!inAutomation && (
          <p className="hint">Enable automation mode above to control pumps.</p>
        )}
        {(["pump_in", "pump_out"] as const).map((pump) => (
          <div className="control-row" key={pump}>
            <label>{pump === "pump_in" ? "Pump In" : "Pump Out"}</label>
            <button
              className={lastPumpCommand[pump] === true ? "primary" : ""}
              disabled={!inAutomation || pumpMutation.isPending}
              onClick={() => pumpMutation.mutate({ pump, state: true })}
            >
              Turn ON
            </button>
            <button
              className={lastPumpCommand[pump] === false ? "primary" : ""}
              disabled={!inAutomation || pumpMutation.isPending}
              onClick={() => pumpMutation.mutate({ pump, state: false })}
            >
              Turn OFF
            </button>
          </div>
        ))}
        <p className="hint">
          Shows the last command sent from this app — the device doesn't report actual relay
          state back over MQTT, so this isn't a live confirmation.
        </p>
      </div>

      <div className="panel">
        <h3>
          <Ruler size={16} /> Tank configuration
        </h3>
        <form className="control-row" onSubmit={submitTankHeight}>
          <label htmlFor="tank-height">Tank height (cm)</label>
          <input
            id="tank-height"
            type="number"
            min={0}
            max={5000}
            step={0.1}
            value={tankHeight}
            onChange={(e) => setTankHeight(e.target.value)}
            required
          />
          <button type="submit" className="primary">
            Update
          </button>
        </form>
        <form className="control-row" onSubmit={submitWaterLevelMark}>
          <label htmlFor="water-level-mark">Water level mark (cm)</label>
          <input
            id="water-level-mark"
            type="number"
            min={0}
            max={5000}
            step={0.1}
            value={waterLevelMark}
            onChange={(e) => setWaterLevelMark(e.target.value)}
            required
          />
          <button type="submit" className="primary">
            Update
          </button>
        </form>
        <p className="hint">Valid range 0–5000 cm — the device rejects anything outside that.</p>
      </div>

      <div className="panel danger-panel">
        <h3>
          <AlertTriangle size={16} /> Danger zone
        </h3>
        <div className="control-row">
          <button
            className="danger"
            disabled={inAutomation || factoryResetMutation.isPending}
            onClick={confirmFactoryReset}
          >
            Factory reset
          </button>
          <span className="hint">
            {inAutomation
              ? "Not available while automation mode is on — the device itself refuses this for safety."
              : "Wipes WiFi/MQTT/BLE provisioning and reboots the device."}
          </span>
        </div>
      </div>
    </div>
  );
}
