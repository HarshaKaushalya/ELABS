"use client";

interface FramePreview {
  time_sec: number;
  label: string;
  thumbnail: string; // base64 JPEG
}

interface Props {
  previews: FramePreview[];
}

function fmtTs(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "00")}`;
}

export function FramePreviews({ previews }: Props) {
  if (previews.length === 0) return null;

  return (
    <div className="vision-previews-wrap">
      <div className="vision-previews-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
        <span>Key Frames · {previews.length} captured</span>
      </div>
      <div className="vision-previews-grid">
        {previews.map((p, i) => (
          <div key={i} className="vision-frame-card">
            <div className="vision-frame-thumb-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${p.thumbnail}`}
                alt={p.label}
                className="vision-frame-thumb"
              />
              <span className="vision-frame-ts">{fmtTs(p.time_sec)}</span>
            </div>
            <div className="vision-frame-label">{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
