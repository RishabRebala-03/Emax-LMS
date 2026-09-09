import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import "./Sessions.css";

interface LiveSession {
  id: string;
  dayNumber: number;
  title: string;
  sessionUrl: string;
}

interface Props {
  userId: string;
}

const Sessions: React.FC<Props> = ({ userId }) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const res = await apiGet<{ sessions: LiveSession[] }>(
          `/answerer/live-sessions?userId=${encodeURIComponent(userId)}`
        );
        setSessions(res.sessions || []);
      } catch (error) {
        console.error(error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [userId]);

  const openSession = async (session: LiveSession) => {
    try {
      const res = await apiPost<{ sessionUrl: string }>(`/answerer/live-sessions/${session.id}/join`, {
        userId,
      });
      window.open(res.sessionUrl || session.sessionUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      alert(error.message || "Unable to open this live session");
    }
  };

  return (
    <section className="sessions-page" aria-labelledby="sessions-heading">
      <div className="sessions-intro">
        <h2 id="sessions-heading">Live Sessions</h2>
        <p>Join your daily live sessions and learn with experts.</p>
      </div>

      {loading ? (
        <div className="sessions-empty">Loading live sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="sessions-empty">No live sessions are assigned yet.</div>
      ) : (
        <div className="live-session-grid">
          {sessions.map((session) => (
            <article key={session.id} className="live-session-tile">
              <div className="live-session-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="15" rx="2" />
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                  <path d="M4 10h16" />
                </svg>
              </div>
              <h3>{session.title || `Day ${session.dayNumber}`}</h3>
              <button type="button" onClick={() => openSession(session)}>
                Join
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Sessions;
