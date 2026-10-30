"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Building,
  Upload,
  Link as LinkIcon,
  Check,
  Wrench,
  ExternalLink,
  ShieldAlert,
  Camera,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/api";

interface ItemDetailsModalProps {
  item: any;
  onClose: () => void;
  onItemUpdated?: (updatedItem: any) => void;
}

const FALLBACK_DATASHEETS: Record<string, string> = {
  ds1054: "https://www.rigolna.com/products/digital-oscilloscopes/1000z/",
  tds2024: "https://download.tek.com/manual/TDS2000C-and-TDS1000C-EDU-Digital-Storage-Oscilloscopes-User-Manual-077044400.pdf",
  "87v": "https://www.fluke.com/en-us/product/electrical-testing/digital-multimeters/fluke-87v",
  ut61e: "https://meters.uni-trend.com/product/ut61-series/",
  dp832: "https://www.rigolna.com/products/dc-power-loads/dp800/",
  dg1022: "https://www.rigolna.com/products/waveform-generators/dg1000z/",
  fsh8: "https://www.rohde-schwarz.com/en/products/test-and-measurement/handheld-analyzers/rs-fsh-handheld-spectrum-analyzer_63493-9400.html",
  hakko: "https://www.hakko.com/english/products/hakko_fx951.html",
  fx951: "https://www.hakko.com/english/products/hakko_fx951.html",
  arduino: "https://docs.arduino.cc/hardware/uno-rev3/",
  raspberry: "https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf",
  basys: "https://digilent.com/reference/programmable-logic/basys-3/reference-manual",
  usrp: "https://www.ettus.com/all-products/ub210-kit/",
  variac: "https://en.wikipedia.org/wiki/Autotransformer",
  multimeter: "https://www.fluke.com/en-us/product/electrical-testing/digital-multimeters/fluke-87v",
  oscilloscope: "https://www.rigolna.com/products/digital-oscilloscopes/1000z/",
};

function getFallbackDatasheet(item: any): string | null {
  if (item?.datasheetUrl) return item.datasheetUrl;
  const target = `${item?.model || ""} ${item?.name || ""}`.toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_DATASHEETS)) {
    if (target.includes(key)) return url;
  }
  return null;
}

export function ItemDetailsModal({ item, onClose, onItemUpdated }: ItemDetailsModalProps) {
  const router = useRouter();
  const { me } = useAuth();
  const [localItem, setLocalItem] = useState<any>(item);

  // Staff management state
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [customDatasheetUrl, setCustomDatasheetUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!localItem) return null;

  const isStaff = me?.roles?.some((r) =>
    ["SYSTEM_ADMIN", "LECTURER", "TECHNICIAN", "MODULE_COORDINATOR"].includes(r)
  ) ?? false;

  const handleViewDatasheet = () => {
    const url = getFallbackDatasheet(localItem);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("No datasheet is linked for this equipment yet. Lab technicians can upload one in Staff Controls.");
    }
  };

  const handleReportBroken = () => {
    onClose();
    const query = new URLSearchParams({
      reportItem: localItem.elabsTag,
      labId: String(localItem.labId || ""),
      itemName: localItem.name,
      model: localItem.model || "",
    });
    router.push(`/feedback?${query.toString()}`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocFile(file);
      setUploadError(null);
    }
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageFile && !selectedDocFile && !customDatasheetUrl.trim()) {
      setUploadError("Please select an image, a datasheet file, or provide a URL.");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadMessage(null);

      const formData = new FormData();
      if (selectedImageFile) {
        formData.append("image", selectedImageFile);
      }
      if (selectedDocFile) {
        formData.append("datasheet", selectedDocFile);
      }
      if (customDatasheetUrl.trim()) {
        formData.append("datasheetUrl", customDatasheetUrl.trim());
      }

      const res = await apiFetch(`/inventory/items/${localItem.id}/media`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload media.");
      }

      const data = await res.json();
      setUploadMessage("Equipment media updated successfully!");
      if (data.item) {
        setLocalItem(data.item);
        onItemUpdated?.(data.item);
      }

      setSelectedImageFile(null);
      setSelectedDocFile(null);
      setCustomDatasheetUrl("");
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err: any) {
      setUploadError(err.message || "Failed to update equipment media.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ── HEADER ── */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
          <h3 className="text-white font-medium flex items-center gap-2 text-base">
            Equipment Details
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── CONTENT ── */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Real Uploaded Photo (ONLY shown if an image was actually uploaded for this equipment) */}
          {localItem.imageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/9] shadow-inner">
              <Image
                src={localItem.imageUrl}
                alt={localItem.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 500px"
              />
              <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded border border-slate-700 text-[11px] text-slate-300">
                Uploaded Photograph
              </div>
            </div>
          ) : null}

          {/* Title & Tag Info */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{localItem.name}</h2>
            <div className="flex gap-2 items-center mt-2 flex-wrap">
              <span className="font-mono text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded font-semibold border border-emerald-400/20">
                {localItem.elabsTag}
              </span>
              <span className="text-sm text-slate-400">
                {localItem.category} • {localItem.model || "Standard"}
              </span>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 text-sm">Status</span>
              {localItem.status === "AVAILABLE" && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Available (In Service)
                </span>
              )}
              {localItem.status === "BORROWED" && (
                <span className="flex items-center gap-1.5 text-amber-400 text-sm font-medium">
                  <AlertCircle className="w-4 h-4" /> Borrowed / In-Use
                </span>
              )}
              {localItem.status === "MAINTENANCE" && (
                <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" /> Under Maintenance / Repair
                </span>
              )}
              {localItem.status === "OUT_OF_SERVICE" && (
                <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" /> Out of Service
                </span>
              )}
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 text-sm">Assigned Laboratory</span>
              <span className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                <Building className="w-4 h-4 text-sky-400" />
                {localItem.labName || "DEIE Facility"}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 text-sm">Serial Identification</span>
              <span className="text-slate-200 text-sm font-mono">
                {localItem.serialNo || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 text-sm">Last Updated</span>
              <span className="text-slate-200 text-sm flex items-center gap-1 font-mono">
                <Calendar className="w-4 h-4 text-slate-400" />
                {localItem.updatedAt ? new Date(localItem.updatedAt).toLocaleDateString() : "Active"}
              </span>
            </div>

            {localItem.conditionNote && (
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800/60 text-xs">
                <span className="text-slate-400 font-medium block mb-1">Condition Notes:</span>
                <p className="text-slate-300 italic m-0">&ldquo;{localItem.conditionNote}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Primary Action Buttons: View Datasheet & Report Broken */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleViewDatasheet}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
            >
              <FileText className="w-4 h-4" />
              View Datasheet
            </button>

            <button
              onClick={handleReportBroken}
              className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              title="Report broken equipment or issue to Lab Helpdesk"
            >
              <Wrench className="w-4 h-4" />
              Report Issue / Defect
            </button>
          </div>

          {/* ── ADMIN / TECHNICIAN MEDIA UPLOAD SECTION ── */}
          {isStaff && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> Staff Controls: Equipment Media
                </span>
                <button
                  type="button"
                  onClick={() => setShowStaffPanel(!showStaffPanel)}
                  className="text-xs text-slate-400 hover:text-white underline transition-colors"
                >
                  {showStaffPanel ? "Hide Controls" : "Upload Photo / Datasheet"}
                </button>
              </div>

              {showStaffPanel && (
                <form onSubmit={handleSaveMedia} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                  {uploadMessage && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                      <Check className="w-4 h-4" /> {uploadMessage}
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                      {uploadError}
                    </div>
                  )}

                  {/* Upload Image */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Upload Apparatus Photo (.png, .jpg)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="mt-2 relative w-24 h-16 rounded overflow-hidden border border-slate-700">
                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Upload Datasheet File */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Upload Datasheet Document (.pdf, .doc)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleDocChange}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>

                  {/* Or Enter Web Datasheet URL */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Or External Datasheet URL
                    </label>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="url"
                        placeholder="https://example.com/datasheet.pdf"
                        value={customDatasheetUrl}
                        onChange={(e) => setCustomDatasheetUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? "Saving..." : "Save Media"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
