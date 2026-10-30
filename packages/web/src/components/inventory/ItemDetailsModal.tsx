"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Building,
  Cpu,
  Layers,
  Wrench,
  ShieldCheck,
  ExternalLink,
  Barcode,
  Info,
} from "lucide-react";

interface ItemDetailsModalProps {
  item: any;
  onClose: () => void;
  onBorrowRequest?: (item: any) => void;
}

function getEquipmentImage(item: any): string {
  const name = (item?.name || "").toLowerCase();
  const cat = (item?.category || "").toLowerCase();
  const model = (item?.model || "").toLowerCase();

  if (name.includes("oscilloscope") || model.includes("ds1054") || model.includes("tds")) {
    return "/equipment/oscilloscope.jpg";
  }
  if (name.includes("multimeter") || name.includes("clamp") || model.includes("fluke") || model.includes("ut61e")) {
    return "/equipment/multimeter.jpg";
  }
  if (name.includes("power supply") || name.includes("variac") || name.includes("transformer")) {
    return "/equipment/power-supply.jpg";
  }
  if (name.includes("function") || name.includes("signal generator") || model.includes("dg1022")) {
    return "/equipment/function-generator.jpg";
  }
  if (name.includes("spectrum") || name.includes("sdr") || name.includes("rf") || name.includes("antenna") || cat.includes("rf")) {
    return "/equipment/spectrum-analyzer.jpg";
  }
  if (name.includes("solder") || cat.includes("assembly")) {
    return "/equipment/soldering-station.jpg";
  }
  if (name.includes("arduino") || name.includes("raspberry") || name.includes("fpga") || cat.includes("microcontroller")) {
    return "/equipment/microcontroller.jpg";
  }
  if (name.includes("breadboard") || cat.includes("component")) {
    return "/equipment/breadboard.jpg";
  }
  return "/equipment/default-instrument.jpg";
}

function getEquipmentSpecs(item: any): { label: string; value: string }[] {
  const model = (item?.model || "").toLowerCase();
  const name = (item?.name || "").toLowerCase();

  if (model.includes("ds1054z")) {
    return [
      { label: "Bandwidth", value: "50 MHz (4 Analog Channels)" },
      { label: "Sample Rate", value: "1 GSa/s Real-time" },
      { label: "Memory Depth", value: "24 Mpts standard" },
      { label: "Display", value: "7.0 inch WVGA (800x480) TFT" },
    ];
  }
  if (model.includes("tds2024c")) {
    return [
      { label: "Bandwidth", value: "200 MHz (4 Channels)" },
      { label: "Sample Rate", value: "2.0 GSa/s on all channels" },
      { label: "Record Length", value: "2.5k points on all channels" },
      { label: "Interface", value: "USB 2.0 Host & Device" },
    ];
  }
  if (model.includes("fluke 87v")) {
    return [
      { label: "Measurement", value: "True-RMS AC Voltage & Current" },
      { label: "DC Accuracy", value: "0.05% Basic DC" },
      { label: "Counts", value: "20,000 counts high resolution" },
      { label: "Safety Rating", value: "CAT III 1000V / CAT IV 600V" },
    ];
  }
  if (model.includes("ut61e")) {
    return [
      { label: "Counts", value: "22,000 counts auto-ranging" },
      { label: "Bandwidth", value: "45 Hz - 10 kHz True RMS" },
      { label: "Interface", value: "RS-232 / USB PC connection" },
      { label: "Safety Rating", value: "CAT III 1000V / CAT IV 600V" },
    ];
  }
  if (model.includes("dp832")) {
    return [
      { label: "Channels", value: "3 Isolated Channels (30V/3A, 30V/3A, 5V/3A)" },
      { label: "Total Power", value: "195 Watts" },
      { label: "Ripple & Noise", value: "< 350 uVrms / 2 mVpp" },
      { label: "Over-Protection", value: "OVP, OCP, OTP hardware trip" },
    ];
  }
  if (model.includes("dg1022z")) {
    return [
      { label: "Max Frequency", value: "25 MHz Sine / Square" },
      { label: "Channels", value: "2 Independent Function Channels" },
      { label: "Sample Rate", value: "200 MSa/s, 14-bit vertical" },
      { label: "Waveforms", value: "Sine, Square, Ramp, Pulse, Noise, Arb" },
    ];
  }
  if (model.includes("fsh8")) {
    return [
      { label: "Frequency Range", value: "9 kHz to 8 GHz" },
      { label: "Resolution BW", value: "1 Hz to 3 MHz" },
      { label: "DANL", value: "-161 dBm (preamp on)" },
      { label: "Type", value: "Handheld Rugged RF Spectrum Analyser" },
    ];
  }

  return [
    { label: "Equipment Category", value: item?.category || "Laboratory Apparatus" },
    { label: "Hardware Model", value: item?.model || "Standard Issue" },
    { label: "Operating Lab", value: item?.labName || "DEIE Facility" },
    { label: "Inspection Status", value: "Verified by Technical Officer" },
  ];
}

export function ItemDetailsModal({ item, onClose, onBorrowRequest }: ItemDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "specs">("overview");

  if (!item) return null;

  const imgSrc = getEquipmentImage(item);
  const specs = getEquipmentSpecs(item);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* ── TOP HEADER ── */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-sky-400" />
            <h3 className="text-white font-semibold text-base">
              Laboratory Apparatus Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Real Equipment Image & Badge Banner */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/9] shadow-inner group">
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 500px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            <div className="absolute top-3 left-3 flex gap-2">
              <span className="font-mono text-xs font-bold text-sky-300 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-sky-500/30 shadow-md">
                {item.elabsTag}
              </span>
            </div>

            <div className="absolute top-3 right-3">
              {item.status === "AVAILABLE" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> In Service
                </span>
              )}
              {item.status === "BORROWED" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Issued / In-Use
                </span>
              )}
              {item.status === "MAINTENANCE" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> In Calibration / Repair
                </span>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-md">
                {item.name}
              </h2>
              <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 drop-shadow">
                <span className="font-medium text-sky-400">{item.model || "Standard"}</span>
                <span>•</span>
                <span>{item.category}</span>
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex border-b border-slate-800 text-sm">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Info className="w-4 h-4" /> Apparatus Details
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === "specs"
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="w-4 h-4" /> Technical Specifications
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-slate-400 font-medium">Assigned Laboratory</span>
                  <span className="text-slate-200 font-semibold text-sm mt-1 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{item.labName || "DEIE Facility"}</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-slate-400 font-medium">Serial Identification</span>
                  <span className="text-slate-200 font-mono text-sm mt-1 truncate">
                    {item.serialNo || "DEIE-ENG-CALIB"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 font-medium">Last Inspection / Update</span>
                </div>
                <span className="text-slate-200 font-mono">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Active"}
                </span>
              </div>

              {item.conditionNote && (
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Condition & Calibration Notes</span>
                  <p className="text-slate-300 italic m-0">
                    &ldquo;{item.conditionNote}&rdquo;
                  </p>
                </div>
              )}

              <div className="p-3 bg-sky-950/30 rounded-xl border border-sky-800/30 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-slate-300 leading-relaxed">
                  Calibrated according to Department of Electrical and Information Engineering lab safety protocol. Always verify grounding before applying high-voltage or high-frequency excitations.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECS */}
          {activeTab === "specs" && (
            <div className="space-y-2.5">
              {specs.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-800/50 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs"
                >
                  <span className="text-slate-400 font-medium">{s.label}</span>
                  <span className="text-slate-100 font-semibold">{s.value}</span>
                </div>
              ))}

              <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Standard DEIE Datasheet Archive</span>
                <span className="font-mono text-sky-400">PDF Document</span>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex gap-3">
          <Link
            href="/feedback"
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            Report Issue / Calibration
          </Link>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-sky-600/20"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
