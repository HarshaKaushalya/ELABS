"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Search } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scannerRef.current) return;

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        html5QrcodeScanner.clear().catch(console.error);
        onScan(decodedText);
      },
      (err) => {
        // Ignored, normally triggers rapidly when scanning fails
      }
    );

    return () => {
      html5QrcodeScanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Scan Barcode
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div id="reader" ref={scannerRef} className="w-full bg-black rounded overflow-hidden"></div>
          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
        </div>
        <div className="p-4 bg-slate-800/50 text-center">
          <p className="text-sm text-slate-400">Position the barcode within the frame to scan automatically.</p>
        </div>
      </div>
    </div>
  );
}
