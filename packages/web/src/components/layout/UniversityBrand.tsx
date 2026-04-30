type UniversityBrandProps = {
  compact?: boolean;
};

export function UniversityBrand({ compact = false }: UniversityBrandProps) {
  return (
    <div className={`uni-brand ${compact ? "uni-brand-compact" : ""}`}>
      <div className="brand-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      <div>
        <div className="uni-brand-title">ELABS</div>
        <div className="uni-brand-subtitle">INVENTORY & LAB SYSTEM</div>
      </div>
    </div>
  );
}
