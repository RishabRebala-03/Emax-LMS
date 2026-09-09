import React from "react";
import "./Sessions.css";

const SESSION_VIDEO_SRC = "/assets/session-video.mp4";
const SESSION_RESOURCE_URL =
  "https://drive.google.com/file/d/1Rl0KfMIq6u8kdpmf98CwkLn6hl_pjTbo/view?usp=sharing";

const Sessions: React.FC = () => (
  <section className="sessions-page" aria-labelledby="sessions-heading">
    <div className="sessions-intro">
      <span className="sessions-eyebrow">Learning session</span>
      <h2 id="sessions-heading">SAP GUI Installation Guide</h2>
      <a
        className="session-resource-link"
        href={SESSION_RESOURCE_URL}
        target="_blank"
        rel="noreferrer"
      >
        {SESSION_RESOURCE_URL}
      </a>
    </div>

    <article className="session-card">
      <div className="session-video-frame">
        <video controls preload="metadata">
          <source src={SESSION_VIDEO_SRC} type="video/mp4" />
          Your browser does not support embedded video.
        </video>
      </div>
      <div className="session-card-footer">
        <span className="session-view-only">View only</span>
        <p>This session is available to watch in the portal.</p>
      </div>
    </article>
  </section>
);

export default Sessions;
