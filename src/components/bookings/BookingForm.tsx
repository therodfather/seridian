"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bytecats/ui-kit";
import { MultiStepForm, Field, FormGrid, FormSection } from "@/components/ui/form";

type Booking = Doc<"bookings">;

interface BookingFormProps {
  booking?: Booking;
  defaultDate?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function BookingForm({ booking, defaultDate, onSuccess, onCancel }: BookingFormProps) {
  const createBooking = useMutation(api.bookings.create);
  const updateBooking = useMutation(api.bookings.update);
  const clients = useQuery(api.clients.list, { status: "active" });

  const [title, setTitle] = useState(booking?.title ?? "");
  const [clientId, setClientId] = useState(booking?.clientId ?? "");
  const [startTime, setStartTime] = useState(booking?.startTime ?? defaultDate ?? "");
  const [endTime, setEndTime] = useState(booking?.endTime ?? "");
  const [type, setType] = useState<"consultation" | "development" | "review">(booking?.type ?? "consultation");
  const [location, setLocation] = useState(booking?.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(booking?.meetingUrl ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !startTime || !endTime || !clientId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        clientId: clientId as Id<"clients">,
        startTime,
        endTime,
        type,
        location: location.trim() || undefined,
        meetingUrl: meetingUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (booking) {
        await updateBooking({ bookingId: booking._id, ...payload });
      } else {
        await createBooking(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save booking");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      id: "details",
      label: "Details",
      fields: (
        <FormSection title="Booking Details">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Client Kickoff" className="bg-white/5 border-white/10" />
          </Field>
          <FormGrid>
            <Field label="Client">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormGrid>
        </FormSection>
      ),
    },
    {
      id: "schedule",
      label: "Schedule",
      fields: (
        <FormSection title="Schedule">
          <FormGrid>
            <Field label="Start" required>
              <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} type="datetime-local" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="End" required>
              <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} type="datetime-local" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Location">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / Zoom" className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Meeting URL">
              <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10" />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meeting notes..." rows={3} className="bg-white/5 border-white/10" />
          </Field>
        </FormSection>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={onCancel} submitting={saving} submitLabel={booking ? "Update" : "Create Booking"} />
    </div>
  );
}
