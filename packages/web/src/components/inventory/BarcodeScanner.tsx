"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Scan, Zap, Keyboard, ArrowRight, CheckCircle2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
    osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.1); // E6 note
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio permission or context error
  }
}

export function BarcodeScanner({
  onScan,
  onClose,
  title = "Laboratory Barcode Scanner",
  subtitle = "Align the equipment tag (Code 128 / Code 39 / QR) within the viewfinder",
}: BarcodeScannerProps) {
  const [manualTag, setManualTag] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);

  const handleDecoded = useCallback(
    (decodedText: string) => {
      const clean = decodedText.trim();
      if (!clean) return;
      playBeep();
      setLastScanned(clean);
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
      }
      setTimeout(() => {
        onScan(clean);
      }, 350);
    },
    [onScan]
  );

  useEffect(() => {
    let isMounted = true;

    // Small delay to ensure reader container is mounted in DOM
    const timer = setTimeout(() => {
      if (!isMounted) return;

      try {
        const scanner = new Html5QrcodeScanner(
          "elabs-barcode-reader",
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // 1D Linear barcodes require wider aspect ratio
              const width = Math.min(viewfinderWidth * 0.88, 360);
              const height = Math.min(viewfinderHeight * 0.55, 170);
              return { width: Math.max(width, 220), height: Math.max(height, 120) };
            },
            aspectRatio: 1.333333,
            showTorchButtonIfSupported: true,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
            ],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          },
          /* verbose= */ false
        );

        scannerInstanceRef.current = scanner;

        scanner.render(
          (decodedText) => {
            handleDecoded(decodedText);
          },
          (_err) => {
            // High frequency stream tick, ignore
          }
        );
      } catch (e) {
        console.warn("Barcode scanner initialization warning:", e);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
      }
    };
  }, [handleDecoded]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualTag.trim();
    if (!clean) return;
    playBeep();
    setLastScanned(clean);
    setTimeout(() => {
      onScan(clean);
    }, 200);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 15, 30, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeOverlay 0.2s ease-out",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(59, 130, 246, 0.15)",
          maxWidth: 480,
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          color: "#f8fafc",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.75)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #0284c7, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(56, 189, 248, 0.4)",
              }}
            >
              <Scan size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff", letterSpacing: "0.01em" }}>
                {title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Optical Barcode & QR Reader</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              padding: 6,
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Container */}
        <div style={{ padding: 18, position: "relative" }}>
          <div
            id="elabs-barcode-reader"
            style={{
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              background: "#020617",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              minHeight: 280,
            }}
          />

          {/* Success Overlay Flash */}
          {lastScanned && (
            <div
              style={{
                position: "absolute",
                inset: 18,
                background: "rgba(5, 150, 105, 0.85)",
                backdropFilter: "blur(4px)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                animation: "popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <CheckCircle2 size={42} color="#ffffff" />
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>Barcode Detected!</div>
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "#d1fae5",
                }}
              >
                {lastScanned}
              </div>
            </div>
          )}
        </div>

        {/* Subtitle & Guide */}
        <div
          style={{
            padding: "0 20px 14px",
            fontSize: "0.8rem",
            color: "#94a3b8",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Zap size={13} color="#38bdf8" />
          <span>{subtitle}</span>
        </div>

        {/* Manual Input Toggle / Form */}
        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "14px 20px",
            background: "rgba(2, 6, 23, 0.5)",
          }}
        >
          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px dashed rgba(255, 255, 255, 0.2)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#94a3b8",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#38bdf8";
                e.currentTarget.style.color = "#38bdf8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              <Keyboard size={14} />
              <span>Camera not working? Enter ELABS tag manually</span>
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. ELABS-EL-0001 or ELABS-MC-0002"
                value={manualTag}
                onChange={(e) => setManualTag(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  background: "#020617",
                  border: "1px solid #38bdf8",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "#ffffff",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!manualTag.trim()}
                style={{
                  background: manualTag.trim() ? "linear-gradient(135deg, #0284c7, #3b82f6)" : "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  color: manualTag.trim() ? "#ffffff" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: manualTag.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>Look Up</span>
                <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeOverlay {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        #elabs-barcode-reader video {
          border-radius: 8px !important;
          object-fit: cover !important;
        }
        #elabs-barcode-reader img[alt="Info icon"] {
          display: none !important;
        }
        #elabs-barcode-reader__status_span {
          display: none !important;
        }
        #elabs-barcode-reader__dashboard_section_csr button {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border: 1px solid #334155 !important;
          border-radius: 6px !important;
          padding: 6px 12px !important;
          font-size: 0.8rem !important;
          cursor: pointer !important;
          margin: 4px !important;
        }
        #elabs-barcode-reader__dashboard_section_csr button:hover {
          background: #334155 !important;
          border-color: #64748b !important;
        }
        #elabs-barcode-reader__dashboard_section_csr select {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border: 1px solid #334155 !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          font-size: 0.8rem !important;
          margin: 4px !important;
        }
      `}</style>
    </div>
  );
}
