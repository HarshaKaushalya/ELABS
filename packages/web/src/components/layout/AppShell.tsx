import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <Topbar title={title} subtitle={subtitle} />
        <main className="content page-stage">{children}</main>
      </div>
    </div>
  );
}
