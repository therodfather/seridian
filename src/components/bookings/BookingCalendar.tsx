"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bytecats/ui-kit";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Trash2, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingForm } from "./BookingForm";

type Booking = Doc<"bookings">;
type Client = Doc<"clients">;

const TYPE_COLORS: Record<string, { bg: string; dot: string }> = {
  consultation: { bg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300", dot: "bg-cyan-400" },
  development: { bg: "bg-purple-500/10 border-purple-500/20 text-purple-300", dot: "bg-purple-400" },
  review: { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", dot: "bg-emerald-400" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(11, 16) : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  let start = first.getDay() - 1;
  if (start < 0) start = 6;
  for (let i = start - 1; i >= 0; i--) days.push(new Date(year, month, -i));
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) days.push(new Date(year, month + 1, i));
  return days;
}

function getWeekDates(current: Date): Date[] {
  const d = new Date(current);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

interface BookingCalendarProps {
  onDayClick?: (date: string) => void;
}

export function BookingCalendar({ onDayClick }: BookingCalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [view, setView] = useState<"month" | "week">("month");
  const [filterType, setFilterType] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string>();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  const bookings = useQuery(api.bookings.list, {});
  const clients = useQuery(api.clients.list, {});
  const removeBooking = useMutation(api.bookings.remove);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients?.forEach((c) => map.set(c._id, c));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    return filterType === "all" ? bookings : bookings.filter((b) => b.type === filterType);
  }, [bookings, filterType]);

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    filtered.forEach((b) => {
      const key = b.startTime.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    });
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [filtered]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = toISODate(today);
  const monthDays = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const weekDays = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const rangeLabel = view === "month"
    ? currentDate.toLocaleString("en-US", { month: "long", year: "numeric" })
    : (() => { const s = weekDays[0], e = weekDays[6]; return `${s.toLocaleString("en-US", { month: "short" })} ${s.getDate()} – ${e.toLocaleString("en-US", { month: "short" })} ${e.getDate()}, ${e.getFullYear()}`; })();

  function nav(dir: number) {
    if (view === "month") setCurrentDate(new Date(year, month + dir, 1));
    else { const d = new Date(currentDate); d.setDate(d.getDate() + dir * 7); setCurrentDate(d); }
  }

  function openCreate(dateStr?: string) {
    setEditingBooking(null);
    setFormDate(dateStr || todayStr);
    setFormOpen(true);
    onDayClick?.(dateStr || todayStr);
  }

  function openEdit(b: Booking) { setDetailBooking(null); setEditingBooking(b); setFormOpen(true); }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => nav(-1)}
              aria-label={view === "month" ? "Previous month" : "Previous week"}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-7 px-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => nav(1)}
              aria-label={view === "month" ? "Next month" : "Next week"}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-semibold text-white">{rangeLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger aria-label="Filter by booking type" className="h-7 w-[120px] text-xs bg-white/[0.03] border-white/10"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/10">
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              <SelectItem value="consultation" className="text-xs">Consultation</SelectItem>
              <SelectItem value="development" className="text-xs">Development</SelectItem>
              <SelectItem value="review" className="text-xs">Review</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5" role="group" aria-label="Calendar view">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn("h-7 px-3 rounded-md text-xs font-medium transition-all", view === v ? "bg-seridian-500/20 text-seridian-400" : "text-slate-400 hover:text-white")}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={() => openCreate()} className="h-7 bg-seridian-500 text-white hover:bg-seridian-400 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />New Booking
          </Button>
        </div>
      </div>

      {bookings === undefined ? (
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 overflow-hidden" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[72px] border-r border-b border-white/[0.04] p-2">
                <div className="h-4 w-6 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      ) : view === "month" ? (
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
            {WEEKDAYS.map((d) => <div key={d} className="py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-white/[0.04]">
            {monthDays.map((day, i) => {
              const dateStr = toISODate(day);
              const isCurrent = day.getMonth() === month;
              const isToday = dateStr === todayStr;
              const dayBookings = byDate.get(dateStr) ?? [];
              return (
                <div key={i} className={cn("group min-h-[80px] p-1 transition-colors hover:bg-white/[0.02]", isCurrent ? "text-slate-200" : "text-slate-600")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium", isToday ? "bg-seridian-500 text-white" : isCurrent ? "text-slate-300" : "text-slate-600")}>{day.getDate()}</span>
                    <button
                      type="button"
                      onClick={() => openCreate(dateStr)}
                      aria-label={`Add booking on ${dateStr}`}
                      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-0.5 rounded text-slate-400 hover:text-seridian-400"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 2).map((b) => {
                      const cfg = TYPE_COLORS[b.type] ?? TYPE_COLORS.consultation;
                      return (
                        <button key={b._id} type="button" onClick={() => setDetailBooking(b)} className={cn("w-full flex items-center gap-1 rounded px-1 py-0.5 text-[10px] border truncate text-left", cfg.bg)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                          <span className="truncate font-medium">{b.title}</span>
                        </button>
                      );
                    })}
                    {dayBookings.length > 2 && <span className="text-[9px] text-slate-500 pl-1">+{dayBookings.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
            {weekDays.map((d, i) => {
              const dateStr = toISODate(d);
              const isToday = dateStr === todayStr;
              const count = (byDate.get(dateStr) ?? []).length;
              return (
                <div key={i} className={cn("p-2 text-center border-r border-white/[0.04] last:border-r-0", isToday && "bg-seridian-500/5")}>
                  <span className="text-[10px] text-slate-500 uppercase">{WEEKDAYS[i]}</span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", isToday ? "bg-seridian-500 text-white" : "text-white")}>{d.getDate()}</span>
                    {count > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0 border-seridian-500/30 bg-seridian-500/10 text-seridian-400">{count}</Badge>}
                  </div>
                  <button type="button" onClick={() => openCreate(dateStr)} aria-label={`Add booking on ${dateStr}`} className="mt-0.5 text-[9px] text-slate-500 hover:text-seridian-400">+ Add</button>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 divide-x divide-white/[0.04] min-h-[300px]">
            {weekDays.map((d, i) => {
              const dateStr = toISODate(d);
              const dayBookings = byDate.get(dateStr) ?? [];
              return (
                <div key={i} className="p-1.5 space-y-1.5">
                  {dayBookings.length === 0 ? (
                    <button type="button" onClick={() => openCreate(dateStr)} aria-label={`Add booking on ${dateStr}`} className="w-full h-20 rounded border border-dashed border-white/5 text-[10px] text-slate-600 hover:border-seridian-500/30 hover:text-seridian-400 transition-colors">+ Add</button>
                  ) : dayBookings.map((b) => {
                    const cfg = TYPE_COLORS[b.type] ?? TYPE_COLORS.consultation;
                    const client = clientMap.get(b.clientId);
                    return (
                      <button key={b._id} type="button" onClick={() => setDetailBooking(b)} className={cn("w-full rounded-lg border p-2 text-left transition-all hover:brightness-110", cfg.bg)}>
                        <div className="flex items-center gap-1 mb-1">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                          <span className="text-[11px] font-semibold text-white truncate">{b.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatTime(b.startTime)}</span>
                        </div>
                        {client && <div className="text-[9px] text-slate-400 mt-0.5 truncate">{client.name}</div>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg border-white/[0.06] bg-[#0c1222]">
          <DialogHeader><DialogTitle className="text-white text-sm">{editingBooking ? "Edit Booking" : "New Booking"}</DialogTitle></DialogHeader>
          <BookingForm booking={editingBooking ?? undefined} defaultDate={formDate} onSuccess={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={(o) => !o && setDetailBooking(null)}>
        {detailBooking && (
          <DialogContent className="max-w-sm border-white/[0.06] bg-[#0c1222] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className={cn("text-[10px] mb-1", TYPE_COLORS[detailBooking.type]?.bg)}>{detailBooking.type}</Badge>
                <h3 className="text-sm font-semibold text-white">{detailBooking.title}</h3>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(detailBooking)}
                  aria-label="Edit booking"
                  className="h-6 px-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { removeBooking({ bookingId: detailBooking._id }); setDetailBooking(null); }}
                  aria-label="Delete booking"
                  className="h-6 px-1.5 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {clientMap.get(detailBooking.clientId) && (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <User className="h-3 w-3 text-slate-500" />
                <span>{clientMap.get(detailBooking.clientId)!.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Clock className="h-3 w-3 text-slate-500" />
              <span>{new Date(detailBooking.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {formatTime(detailBooking.startTime)} – {formatTime(detailBooking.endTime)}</span>
            </div>
            {detailBooking.notes && <p className="text-xs text-slate-400 bg-white/[0.02] rounded p-2">{detailBooking.notes}</p>}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
