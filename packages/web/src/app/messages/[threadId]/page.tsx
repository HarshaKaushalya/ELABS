import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ threadId: string }> };

export default async function Page({ params }: PageProps) {
  const { threadId } = await params;

  return (
    <AppShell title="Message Thread" subtitle={`Thread ID: ${threadId}`}>
      <section className="chat-window">
        <div className="message-bubble message-in">Please confirm your lab availability for tomorrow.</div>
        <div className="message-bubble message-out">Confirmed. I will be at the Electronics Lab by 9:00 AM.</div>
        <div className="message-bubble message-in">Great. Please carry your worksheet and student card.</div>
        <div className="chat-input-row">
          <input className="input" placeholder="Reply to this thread..." />
          <button className="primary-btn" type="button">Send</button>
        </div>
      </section>
      <div className="tab-row" style={{ marginTop: 12 }}>
        <Link href="/messages" className="tab-btn">Back to inbox</Link>
      </div>
    </AppShell>
  );
}
