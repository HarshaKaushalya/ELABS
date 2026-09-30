"use client";

import { X, FileText, CheckCircle, AlertTriangle, AlertCircle, Calendar } from "lucide-react";

interface ItemDetailsModalProps {
  item: any;
  onClose: () => void;
}

export function ItemDetailsModal({ item, onClose }: ItemDetailsModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="text-white font-medium flex items-center gap-2">
            Equipment Details
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">{item.name}</h2>
            <div className="flex gap-2 items-center mt-2">
              <span className="font-mono text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                {item.elabsTag}
              </span>
              <span className="text-sm text-slate-400">{item.category} • {item.model}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Status</span>
              {item.status === "AVAILABLE" && <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Available</span>}
              {item.status === "BORROWED" && <span className="flex items-center gap-1 text-amber-400 text-sm font-medium"><AlertCircle className="w-4 h-4" /> Borrowed</span>}
              {item.status === "MAINTENANCE" && <span className="flex items-center gap-1 text-red-400 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Maintenance</span>}
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Laboratory</span>
              <span className="text-slate-200 text-sm">{item.labName}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Last Updated</span>
              <span className="text-slate-200 text-sm flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(item.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              View Datasheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
