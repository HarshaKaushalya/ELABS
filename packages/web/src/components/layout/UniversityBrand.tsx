import Image from "next/image";

type UniversityBrandProps = {
  compact?: boolean;
};

export function UniversityBrand({ compact = false }: UniversityBrandProps) {
  return (
    <div className={`uni-brand ${compact ? "uni-brand-compact" : ""}`}>
      <div className="brand-icon brand-logo-wrapper">
        <Image
          src="/logo.png"
          alt="Faculty of Engineering, University of Ruhuna"
          width={36}
          height={36}
          className="brand-logo-img"
          priority
        />
      </div>
      <div>
        <div className="uni-brand-title">ELABS</div>
        <div className="uni-brand-subtitle">INVENTORY & LAB SYSTEM</div>
      </div>
    </div>
  );
}
