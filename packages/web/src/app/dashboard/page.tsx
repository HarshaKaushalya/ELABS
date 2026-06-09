"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { Calendar as CalendarIcon, Clock, FileText, ChevronLeft, ChevronRight } from "lucide-react";

type TimetableSlot = {
  id: number;
  sessionDate: string;
  timeSlot: string;
  labLabel: string;
  moduleCode: string;
  moduleName: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
};

type TimelineEvent = {
  id: string;
  date: Date;
  title: string;
  subtitle: string;
  type: "PRE_LAB" | "LAB_SESSION";
  color: string;
};

export default function DashboardPage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiFetch("/timetable");
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error("Failed to load timetable", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Generate timeline events from slots
  const generateTimelineEvents = () => {
    const events: TimelineEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    slots.forEach((slot) => {
      const sessionDate = new Date(slot.sessionDate);
      if (sessionDate >= today) {
        // Lab Session Event
        events.push({
          id: `lab-${slot.id}`,
          date: sessionDate,
          title: `Laboratory Session - ${slot.labLabel}`,
          subtitle: `${slot.moduleCode} ${slot.moduleName} • ${slot.timeSlot}`,
          type: "LAB_SESSION",
          color: "#f3ae2a", // amber
        });

        // Pre-lab Event (2 days before)
        const preLabDate = new Date(sessionDate);
        preLabDate.setDate(preLabDate.getDate() - 2);
        if (preLabDate >= today) {
          events.push({
            id: `prelab-${slot.id}`,
            date: preLabDate,
            title: `PRE-LAB is due`,
            subtitle: `Assignment is due • ${slot.moduleCode}`,
            type: "PRE_LAB",
            color: "#18d18f", // green
          });
        }
      }
    });

    // Sort chronologically
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const timelineEvents = generateTimelineEvents();
  const next7DaysEvents = timelineEvents.filter(e => {
    const diffTime = e.date.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  // Group timeline by date string
  const groupedEvents = next7DaysEvents.reduce((acc, event) => {
    const dateStr = event.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);


  // Calendar generation logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust for Monday start (0 = Mon, 1 = Tue, ..., 6 = Sun)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null); // Empty slots before 1st
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getEventsForDate = (date: Date) => {
    return timelineEvents.filter(e => 
      e.date.getDate() === date.getDate() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
    );
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  return (
    <AppShell title="Dashboard" subtitle="Smart Laboratory & Academic Timeline">
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#7ea5d6" }}>Loading schedule...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Timeline Section */}
          <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #204072", display: "flex", alignItems: "center", gap: 12 }}>
              <Clock size={20} color="#f3ae2a" />
              <h3 style={{ margin: 0, color: "#f3ae2a", fontSize: "1.2rem", fontWeight: 500 }}>Timeline</h3>
            </div>
            
            <div style={{ padding: "20px 24px", backgroundColor: "#0a1732" }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <select style={{ padding: "8px 12px", backgroundColor: "#0f2244", border: "1px solid #204072", color: "#d9ebff", borderRadius: 6 }}>
                  <option>Next 7 days</option>
                  <option>Next 30 days</option>
                </select>
                <select style={{ padding: "8px 12px", backgroundColor: "#0f2244", border: "1px solid #204072", color: "#d9ebff", borderRadius: 6 }}>
                  <option>Sort by dates</option>
                  <option>Sort by courses</option>
                </select>
              </div>

              {Object.keys(groupedEvents).length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#7ea5d6" }}>No upcoming events in the next 7 days.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  {Object.entries(groupedEvents).map(([dateStr, events]) => (
                    <div key={dateStr}>
                      <h4 style={{ color: "#f3ae2a", margin: "0 0 16px 0", fontSize: "1.05rem", fontWeight: 500 }}>{dateStr}</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {events.map((event) => (
                          <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", backgroundColor: "#0f2244", border: "1px solid #204072", borderRadius: 8 }}>
                            <div style={{ color: "#7ea5d6", fontSize: "0.9rem", minWidth: 50 }}>
                              {event.type === "PRE_LAB" ? "23:59" : "00:00"}
                            </div>
                            <div style={{ padding: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                              <FileText size={24} color={event.color} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: event.color, fontSize: "1rem", fontWeight: 500, marginBottom: 4 }}>{event.title}</div>
                              <div style={{ color: "#7ea5d6", fontSize: "0.85rem" }}>{event.subtitle}</div>
                            </div>
                            <button style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid #204072", color: "#d9ebff", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem" }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#122a54"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              View details
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Calendar Section */}
          <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #204072", display: "flex", alignItems: "center", gap: 12 }}>
              <CalendarIcon size={20} color="#f3ae2a" />
              <h3 style={{ margin: 0, color: "#f3ae2a", fontSize: "1.2rem", fontWeight: 500 }}>Calendar</h3>
            </div>

            <div style={{ padding: "24px", backgroundColor: "#0a1732" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <select style={{ padding: "8px 12px", backgroundColor: "#0f2244", border: "1px solid #204072", color: "#d9ebff", borderRadius: 6, minWidth: 200 }}>
                  <option>All courses</option>
                </select>
                <button style={{ padding: "8px 16px", backgroundColor: "#1dd5e6", border: "none", color: "#050c1d", borderRadius: 6, fontWeight: 500, cursor: "pointer" }}>
                  New event
                </button>
              </div>

              {/* Calendar Grid */}
              <div style={{ border: "1px solid #204072", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid #204072", backgroundColor: "#0f2244" }}>
                  <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#7ea5d6", cursor: "pointer" }}><ChevronLeft /></button>
                  <div style={{ color: "#f3ae2a", fontWeight: 500, fontSize: "1.1rem" }}>
                    {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </div>
                  <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#7ea5d6", cursor: "pointer" }}><ChevronRight /></button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #204072", backgroundColor: "#122a54" }}>
                  {weekDays.map(day => (
                    <div key={day} style={{ padding: "12px", textAlign: "center", color: "#7ea5d6", fontSize: "0.9rem", fontWeight: 500 }}>
                      {day}
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", backgroundColor: "#0a1732" }}>
                  {calendarDays.map((date, i) => {
                    const isToday = date && date.toDateString() === new Date().toDateString();
                    const dayEvents = date ? getEventsForDate(date) : [];

                    return (
                      <div key={i} style={{ 
                        minHeight: 120, 
                        padding: 8, 
                        borderRight: "1px solid #204072", 
                        borderBottom: "1px solid #204072",
                        backgroundColor: isToday ? "rgba(29, 213, 230, 0.05)" : "transparent"
                      }}>
                        {date && (
                          <>
                            <div style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              width: 28, height: 28, 
                              borderRadius: "50%", 
                              backgroundColor: isToday ? "#1dd5e6" : "transparent",
                              color: isToday ? "#050c1d" : "#d9ebff",
                              fontWeight: isToday ? 600 : 400,
                              marginBottom: 8
                            }}>
                              {date.getDate()}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {dayEvents.map(evt => (
                                <div key={evt.id} style={{ 
                                  fontSize: "0.75rem", 
                                  color: evt.color, 
                                  display: "flex", 
                                  alignItems: "flex-start", 
                                  gap: 4 
                                }}>
                                  <span style={{ color: evt.color, marginTop: 1 }}>○</span>
                                  <span style={{ lineHeight: 1.3, wordBreak: "break-word" }}>{evt.title}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

        </div>
      )}
    </AppShell>
  );
}
