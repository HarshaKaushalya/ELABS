"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, Zap, Radio, Sliders, Play, RotateCcw } from "lucide-react";

type WaveformMode = "sine" | "clock" | "impulse" | "threephase";

export function LabOscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<WaveformMode>("sine");
  const [isRunning, setIsRunning] = useState(true);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [telemetry, setTelemetry] = useState({
    vpp: "3.28 V",
    vrms: "2.32 V",
    freq: "1.000 kHz",
    ch2Vpp: "1.80 V",
  });

  const timeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Update telemetry display values based on mode
    if (mode === "sine") {
      setTelemetry({ vpp: "3.28 V", vrms: "2.32 V", freq: "1.000 kHz", ch2Vpp: "1.65 V" });
    } else if (mode === "clock") {
      setTelemetry({ vpp: "5.00 V", vrms: "3.54 V", freq: "50.00 kHz", ch2Vpp: "3.30 V" });
    } else if (mode === "impulse") {
      setTelemetry({ vpp: "12.4 kV", vrms: "4.12 kV", freq: "1.2/50 µs", ch2Vpp: "840 A" });
    } else if (mode === "threephase") {
      setTelemetry({ vpp: "400.0 V", vrms: "230.9 V", freq: "50.00 Hz", ch2Vpp: "400.0 V" });
    }
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = Math.max(170, Math.min(220, rect.width * 0.45));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isRunning) {
        timeRef.current += dt * (mode === "clock" ? 4.5 : mode === "impulse" ? 1.8 : 2.5);
      }

      const t = timeRef.current;

      // 1. CRT / OLED phosphor dark background with slight persistence
      ctx.fillStyle = "#040b17";
      ctx.fillRect(0, 0, width, height);

      // 2. Graticule Grid (8 vertical x 10 horizontal divisions)
      const numCols = 10;
      const numRows = 8;
      const dx = width / numCols;
      const dy = height / numRows;

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(14, 52, 94, 0.45)";

      // Grid lines
      for (let i = 1; i < numCols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * dx, 0);
        ctx.lineTo(i * dx, height);
        ctx.stroke();
      }
      for (let j = 1; j < numRows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * dy);
        ctx.lineTo(width, j * dy);
        ctx.stroke();
      }

      // Center crosshairs with division sub-ticks
      const midX = width / 2;
      const midY = height / 2;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, height);
      ctx.stroke();

      // Sub-ticks on center axes (major division subdivisions)
      const tickSize = 3;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      for (let i = 0; i <= numCols * 5; i++) {
        const x = (i * dx) / 5;
        ctx.beginPath();
        ctx.moveTo(x, midY - tickSize);
        ctx.lineTo(x, midY + tickSize);
        ctx.stroke();
      }
      for (let j = 0; j <= numRows * 5; j++) {
        const y = (j * dy) / 5;
        ctx.beginPath();
        ctx.moveTo(midX - tickSize, y);
        ctx.lineTo(midX + tickSize, y);
        ctx.stroke();
      }
      ctx.restore();

      // Trigger line indicator on left edge
      ctx.fillStyle = "#00f0ff";
      ctx.font = "9px monospace";
      ctx.fillText("T", 4, midY - 4);
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(24, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Channel 1 Waveform (Electric Cyan / Phosphor Blue)
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00f0ff";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const points = 320;
      let ch1HoverY = midY;

      for (let p = 0; p <= points; p++) {
        const x = (p / points) * width;
        const normX = (p / points) * Math.PI * 4;
        let y = midY;

        if (mode === "sine") {
          // Modulated Carrier wave: AM envelope
          const carrier = Math.sin(normX * 2.2 - t * 3.5);
          const envelope = 1 + 0.35 * Math.cos(normX * 0.45 - t * 0.8);
          y = midY - carrier * envelope * (dy * 2.2);
        } else if (mode === "clock") {
          // Digital clock pulse with analog rising/falling edge transition
          const phase = (normX * 1.8 - t * 4) % (Math.PI * 2);
          const positive = phase > 0 ? phase : phase + Math.PI * 2;
          const isHigh = positive < Math.PI;
          const targetY = isHigh ? midY - dy * 2.4 : midY + dy * 2.4;
          // Smooth edge with slight exponential transition
          y = targetY + (Math.sin(positive * 12) * 2.5 * (Math.abs(phase - Math.PI) < 0.3 ? 1 : 0));
        } else if (mode === "impulse") {
          // High Voltage Lightning Impulse (IEC 60060-1 standard: double exponential surge)
          const sweep = ((p / points) * 2.5 - (t * 0.8) % 3);
          if (sweep >= 0) {
            const surge = (Math.exp(-0.8 * sweep) - Math.exp(-12 * sweep)) * 1.35;
            y = midY - Math.max(0, surge) * (dy * 3.2);
          } else {
            y = midY;
          }
        } else if (mode === "threephase") {
          // Phase A
          y = midY - Math.sin(normX * 1.5 - t * 2.5) * (dy * 2.5);
        }

        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        if (cursorPos && Math.abs(x - cursorPos.x) < width / points) {
          ch1HoverY = y;
        }
      }
      ctx.stroke();
      ctx.restore();

      // 4. Channel 2 Waveform (Amber / Golden Orange or Secondary Phase)
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#f59e0b";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.6;
      ctx.beginPath();

      for (let p = 0; p <= points; p++) {
        const x = (p / points) * width;
        const normX = (p / points) * Math.PI * 4;
        let y = midY;

        if (mode === "sine") {
          // Quadrature or demodulated signal
          y = midY - Math.cos(normX * 1.1 - t * 1.7) * (dy * 1.4);
        } else if (mode === "clock") {
          // Serial bus data packet bursts
          const burst = Math.sin(normX * 4 - t * 8) > 0.1 ? 1 : -1;
          const gating = Math.sin(normX * 0.6 - t * 1.2) > -0.2 ? 1 : 0;
          y = midY - burst * gating * (dy * 1.6);
        } else if (mode === "impulse") {
          // Corona / discharge breakdown burst
          const sweep = ((p / points) * 2.5 - (t * 0.8) % 3);
          if (sweep > 0.08 && sweep < 0.35) {
            const noise = (Math.random() - 0.5) * (dy * 2.8) * Math.exp(-sweep * 4);
            y = midY + noise;
          } else {
            y = midY;
          }
        } else if (mode === "threephase") {
          // Phase B (-120 degrees)
          y = midY - Math.sin(normX * 1.5 - t * 2.5 - (2 * Math.PI) / 3) * (dy * 2.5);
        }

        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // If threephase mode: draw Phase C (Emerald Green)
      if (mode === "threephase") {
        ctx.save();
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#10b981";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let p = 0; p <= points; p++) {
          const x = (p / points) * width;
          const normX = (p / points) * Math.PI * 4;
          // Phase C (+120 degrees)
          const y = midY - Math.sin(normX * 1.5 - t * 2.5 + (2 * Math.PI) / 3) * (dy * 2.5);
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Interactive Cursor Probe Line
      if (cursorPos) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Vertical probe cursor
        ctx.beginPath();
        ctx.moveTo(cursorPos.x, 0);
        ctx.lineTo(cursorPos.x, height);
        ctx.stroke();

        // Crosshair reticle at intersection with CH1
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cursorPos.x, ch1HoverY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Readout badge near cursor
        const voltage = (((midY - ch1HoverY) / (dy * 2)) * 3.3).toFixed(2);
        const timeUs = (((cursorPos.x / width) * 200) - 100).toFixed(1);
        const badgeX = Math.min(width - 120, Math.max(10, cursorPos.x + 8));
        const badgeY = Math.max(22, ch1HoverY - 12);

        ctx.fillStyle = "rgba(10, 24, 46, 0.9)";
        ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY - 16, 110, 28, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#00f0ff";
        ctx.font = "10px monospace";
        ctx.fillText(`V: ${voltage}V  Δt:${timeUs}µs`, badgeX + 6, badgeY + 2);

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [mode, isRunning, cursorPos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
  };

  return (
    <div className="lab-oscilloscope-container" ref={containerRef}>
      {/* Top Instrument Bezel Bar */}
      <div className="lab-oscilloscope-header">
        <div className="lab-scope-title-wrap">
          <div className="lab-scope-led-wrap">
            <span className={`lab-scope-led ${isRunning ? "active" : ""}`} />
            <span className="lab-scope-status-text">{isRunning ? "RUN" : "STOP"}</span>
          </div>
          <span className="lab-scope-model">TEKTRONIX / KEYSIGHT DSO-4000X</span>
          <span className="lab-scope-spec">200 MHz • 5 GSa/s</span>
        </div>

        {/* Quick Mode Switcher */}
        <div className="lab-scope-mode-tabs">
          <button
            type="button"
            className={`lab-scope-mode-btn ${mode === "sine" ? "active" : ""}`}
            onClick={() => setMode("sine")}
            title="Analog Carrier & Modulation"
          >
            <Radio size={12} />
            <span>Carrier / AM</span>
          </button>

          <button
            type="button"
            className={`lab-scope-mode-btn ${mode === "clock" ? "active" : ""}`}
            onClick={() => setMode("clock")}
            title="Digital Clock & Serial Bus"
          >
            <Activity size={12} />
            <span>Clock & PWM</span>
          </button>

          <button
            type="button"
            className={`lab-scope-mode-btn ${mode === "impulse" ? "active" : ""}`}
            onClick={() => setMode("impulse")}
            title="High Voltage Impulse & Surge Breakdown"
          >
            <Zap size={12} />
            <span>HV Impulse</span>
          </button>

          <button
            type="button"
            className={`lab-scope-mode-btn ${mode === "threephase" ? "active" : ""}`}
            onClick={() => setMode("threephase")}
            title="Power Systems 3-Phase 50Hz Grid"
          >
            <Sliders size={12} />
            <span>3-Phase 50Hz</span>
          </button>
        </div>
      </div>

      {/* Screen Area */}
      <div
        className="lab-oscilloscope-screen"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={canvasRef} className="lab-oscilloscope-canvas" />

        {/* On-screen channel labels */}
        <div className="lab-scope-screen-overlay">
          <div className="lab-scope-ch-badge ch1">
            <span className="ch-tag">CH1</span>
            <span className="ch-val">{mode === "impulse" ? "5.0 kV/div" : "1.00 V/div"}</span>
          </div>
          <div className="lab-scope-ch-badge ch2">
            <span className="ch-tag">CH2</span>
            <span className="ch-val">{mode === "impulse" ? "200 A/div" : "500 mV/div"}</span>
          </div>
          {mode === "threephase" && (
            <div className="lab-scope-ch-badge ch3">
              <span className="ch-tag">CH3</span>
              <span className="ch-val">100 V/div</span>
            </div>
          )}
          <div className="lab-scope-timebase">
            <span>TB: 50.0 µs/div</span>
            <span className="trig-ok">TRIG'D</span>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="lab-oscilloscope-footer">
        <div className="lab-scope-metrics">
          <div className="lab-metric-item">
            <span className="metric-label">CH1 Vpp</span>
            <span className="metric-value ch1-color">{telemetry.vpp}</span>
          </div>
          <div className="lab-metric-item">
            <span className="metric-label">CH1 Vrms</span>
            <span className="metric-value">{telemetry.vrms}</span>
          </div>
          <div className="lab-metric-item">
            <span className="metric-label">FREQUENCY</span>
            <span className="metric-value freq-color">{telemetry.freq}</span>
          </div>
          <div className="lab-metric-item">
            <span className="metric-label">CH2 Vpp</span>
            <span className="metric-value ch2-color">{telemetry.ch2Vpp}</span>
          </div>
        </div>

        <div className="lab-scope-controls">
          <button
            type="button"
            className="lab-scope-action-btn"
            onClick={() => setIsRunning(!isRunning)}
            title={isRunning ? "Freeze Signal Acquisition" : "Resume Signal Acquisition"}
          >
            {isRunning ? (
              <>
                <RotateCcw size={12} />
                <span>FREEZE</span>
              </>
            ) : (
              <>
                <Play size={12} />
                <span>RESUME</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
