"use client";

import React, { useEffect, useRef } from "react";

interface Pulse {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  color: string;
}

export function LabCircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Create fixed grid of circuit paths
    const step = 64;
    const pulses: Pulse[] = [];
    const colors = ["#00f0ff", "#38bdf8", "#3b82f6", "#10b981"];

    // Initialize random active pulses
    for (let i = 0; i < 18; i++) {
      const startX = Math.floor(Math.random() * (width / step)) * step;
      const startY = Math.floor(Math.random() * (height / step)) * step;
      const horizontal = Math.random() > 0.5;
      const length = (Math.floor(Math.random() * 4) + 2) * step;

      pulses.push({
        x: startX,
        y: startY,
        targetX: horizontal ? startX + length : startX,
        targetY: horizontal ? startY : startY + length,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Subtle Engineering Grid Dots
      ctx.fillStyle = "rgba(56, 189, 248, 0.07)";
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Circuit Bus Traces (Subtle blueprint traces)
      ctx.strokeStyle = "rgba(30, 64, 110, 0.22)";
      ctx.lineWidth = 1;

      // Draw faint interconnecting traces
      for (let y = step * 2; y < height; y += step * 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      for (let x = step * 2; x < width; x += step * 4) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // 3. Animated Signal Pulses along traces
      pulses.forEach((pulse) => {
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          // Reset pulse to a new random branch
          pulse.progress = 0;
          pulse.x = Math.floor(Math.random() * (width / step)) * step;
          pulse.y = Math.floor(Math.random() * (height / step)) * step;
          const horizontal = Math.random() > 0.5;
          const length = (Math.floor(Math.random() * 5) + 2) * step;
          pulse.targetX = horizontal ? pulse.x + length : pulse.x;
          pulse.targetY = horizontal ? pulse.y : pulse.y + length;
          pulse.speed = 0.004 + Math.random() * 0.006;
        }

        const currX = pulse.x + (pulse.targetX - pulse.x) * pulse.progress;
        const currY = pulse.y + (pulse.targetY - pulse.y) * pulse.progress;

        // Glowing packet head
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = pulse.color;
        ctx.fillStyle = pulse.color;
        ctx.beginPath();
        ctx.arc(currX, currY, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        const trailLength = 28;
        const dx = pulse.targetX - pulse.x;
        const dy = pulse.targetY - pulse.y;
        const angle = Math.atan2(dy, dx);
        const trailX = currX - Math.cos(angle) * trailLength;
        const trailY = currY - Math.sin(angle) * trailLength;

        const grad = ctx.createLinearGradient(trailX, trailY, currX, currY);
        grad.addColorStop(0, "rgba(0, 240, 255, 0)");
        grad.addColorStop(1, pulse.color);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(currX, currY);
        ctx.stroke();
        ctx.restore();
      });

      // 4. Subtle Crosshair Reticles at Corners
      const crossSize = 8;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 1;
      const cornerCoords = [
        [40, 40],
        [width - 40, 40],
        [40, height - 40],
        [width - 40, height - 40],
      ];

      cornerCoords.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.moveTo(cx - crossSize, cy);
        ctx.lineTo(cx + crossSize, cy);
        ctx.moveTo(cx, cy - crossSize);
        ctx.lineTo(cx, cy + crossSize);
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lab-circuit-bg-canvas"
      aria-hidden="true"
    />
  );
}
