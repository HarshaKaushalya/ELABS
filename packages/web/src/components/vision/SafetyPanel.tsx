"use client";

interface Props {
  fireDetected: boolean;
  smokeDetected: boolean;
  fireTimestamps: number[];
  smokeTimestamps: number[];
}

function fmtTs(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SafetyPanel({
  fireDetected,
  smokeDetected,
  fireTimestamps,
  smokeTimestamps,
}: Props) {
  const allClear = !fireDetected && !smokeDetected;

  return (
    <div className="vision-safety-panel">
      <div className="vision-safety-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Safety Analysis</span>
      </div>

      {allClear ? (
        <div className="vision-safety-clear">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#18d18f"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>No fire or smoke detected — Lab is safe</span>
        </div>
      ) : (
        <div className="vision-safety-alerts">
          {/* Fire */}
          <div className={`vision-safety-card ${fireDetected ? "fire" : "clear"}`}>
            <div className="vision-safety-card-header">
              <span className="vision-safety-card-icon">🔥</span>
              <span className="vision-safety-card-title">Fire</span>
              <span className={`vision-safety-badge ${fireDetected ? "detected" : "clear"}`}>
                {fireDetected ? "DETECTED" : "CLEAR"}
              </span>
            </div>
            {fireDetected && fireTimestamps.length > 0 && (
              <div className="vision-safety-timestamps">
                {fireTimestamps.map((ts) => (
                  <span key={ts} className="vision-ts-pill fire-pill">
                    {fmtTs(ts)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Smoke */}
          <div className={`vision-safety-card ${smokeDetected ? "smoke" : "clear"}`}>
            <div className="vision-safety-card-header">
              <span className="vision-safety-card-icon">🌫️</span>
              <span className="vision-safety-card-title">Smoke</span>
              <span className={`vision-safety-badge ${smokeDetected ? "detected smoke" : "clear"}`}>
                {smokeDetected ? "DETECTED" : "CLEAR"}
              </span>
            </div>
            {smokeDetected && smokeTimestamps.length > 0 && (
              <div className="vision-safety-timestamps">
                {smokeTimestamps.map((ts) => (
                  <span key={ts} className="vision-ts-pill smoke-pill">
                    {fmtTs(ts)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
