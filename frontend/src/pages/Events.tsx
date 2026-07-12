import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { api } from "../api/client";

function topicSuffix(topic: string): string {
  const parts = topic.split("/");
  return parts.slice(2).join("/") || topic;
}

export default function Events() {
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => api.getEvents(100),
  });

  const events = eventsQuery.data ?? [];

  return (
    <div>
      <div className="page-header">
        <h2>
          <ScrollText size={20} /> Events
        </h2>
      </div>
      <p className="hint" style={{ marginBottom: "1rem" }}>
        Status updates, command responses, and errors received from the device over MQTT.
      </p>

      {events.length === 0 ? (
        <div className="empty-state">No events received yet</div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Topic</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.received_at).toLocaleString()}</td>
                  <td>{topicSuffix(event.topic)}</td>
                  <td>
                    <code>{JSON.stringify(event.payload)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
