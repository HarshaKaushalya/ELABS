"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UniversityBrand } from "./UniversityBrand";

const sections = [
  {
    title: "OVERVIEW",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    ],
  },
  {
    title: "LAB OPERATIONS",
    links: [
      { label: "Inventory", href: "/inventory", icon: "inventory" },
      { label: "Laboratories", href: "/labs", icon: "labs" },
      { label: "Attendance & Access", href: "/calendar", icon: "attendance" },
      { label: "Vision Monitoring", href: "/calendar", icon: "vision" },
    ],
  },
  {
    title: "ACADEMIC",
    links: [
      { label: "Courses & LMS", href: "/courses", icon: "courses" },
      { label: "Reports & Grades", href: "/analytics", icon: "reports" },
    ],
  },
  {
    title: "COMMUNICATION",
    links: [
      { label: "Messages", href: "/messages", icon: "messages", badge: 3 },
      { label: "Notifications", href: "/notifications", icon: "notifications", badge: 4 },
    ],
  },
  {
    title: "INTELLIGENCE",
    links: [
      { label: "ELABS AI", href: "/ai/assistant", icon: "ai" },
      { label: "Analytics", href: "/analytics", icon: "analytics" },
    ],
  },
] as const;

function NavIcon({ type }: { type: string }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "dashboard":
      return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "inventory":
      return <svg {...props}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
    case "labs":
      return <svg {...props}><path d="M9 3h6v7l4 8H5l4-8V3z"/><path d="M9 3h6"/></svg>;
    case "attendance":
      return <svg {...props}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M12 11l4 4"/><path d="M16 11l-4 4"/><rect x="8" y="1" width="8" height="4" rx="1"/></svg>;
    case "courses":
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case "reports":
      return <svg {...props}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>;
    case "messages":
      return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    case "notifications":
      return <svg {...props}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case "ai":
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>;
    case "analytics":
      return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
    case "vision":
      return <svg {...props}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="brand">
        <UniversityBrand compact={isCollapsed} />
      </div>

      <nav>
        {sections.map((section) => (
          <div key={section.title} className="sidebar-section">
            {!isCollapsed && <p className="sidebar-section-title">{section.title}</p>}
            {section.links.map((link) => {
              const active = isActive(pathname, link.href);
              const badge = "badge" in link ? (link as any).badge : undefined;
              return (
                <Link key={link.href + link.label} href={link.href} className={`sidebar-link ${active ? "active" : ""}`} title={isCollapsed ? link.label : undefined}>
                  <span className="sidebar-link-icon" aria-hidden>
                    <NavIcon type={link.icon} />
                  </span>
                  {!isCollapsed && <span>{link.label}</span>}
                  {!isCollapsed && badge != null && <span className="sidebar-badge">{badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: "linear-gradient(135deg, #18d18f, #1dd5e6)" }}>AR</div>
            <div className="sidebar-user-info">
              <strong>Dr. Ahmad</strong>
              <span>Admin</span>
            </div>
            <button className="sidebar-logout" type="button" title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        )}
        <button className="sidebar-collapse-btn" type="button" title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6"/>
            ) : (
              <polyline points="15 18 9 12 15 6"/>
            )}
          </svg>
        </button>
      </div>
    </aside>
  );
}
