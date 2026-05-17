"use client";

import { useState } from "react";
import { CalendarCheck, Check, Pencil, X } from "lucide-react";

import { approveTrip, rejectTrip, requestTripChanges } from "@/app/actions";

type Option = "approve" | "changes" | "reject";

const options: { value: Option; label: string }[] = [
  { value: "approve", label: "Approve" },
  { value: "changes", label: "Changes" },
  { value: "reject", label: "Reject" }
];

const config: Record<
  Option,
  {
    action: (f: FormData) => Promise<void>;
    noteLabel: string;
    noteRequired: boolean;
    notePlaceholder: string;
    buttonLabel: string;
    buttonClass: string;
    icon: React.ReactNode;
  }
> = {
  approve: {
    action: approveTrip,
    noteLabel: "Note (optional)",
    noteRequired: false,
    notePlaceholder: "Any message for the requester…",
    buttonLabel: "Approve",
    buttonClass: "button primary fullWidth",
    icon: <Check size={17} aria-hidden />
  },
  changes: {
    action: requestTripChanges,
    noteLabel: "What needs to change?",
    noteRequired: true,
    notePlaceholder: "Explain what should be different…",
    buttonLabel: "Request changes",
    buttonClass: "button secondary fullWidth",
    icon: <Pencil size={17} aria-hidden />
  },
  reject: {
    action: rejectTrip,
    noteLabel: "Reason (optional)",
    noteRequired: false,
    notePlaceholder: "Why is this rejected?",
    buttonLabel: "Reject",
    buttonClass: "button danger fullWidth",
    icon: <X size={17} aria-hidden />
  }
};

export function ApprovalPanel({ tripId }: { tripId: string }) {
  const [selected, setSelected] = useState<Option>("approve");
  const c = config[selected];

  return (
    <section className="detailCard">
      <div className="panelTitle">
        <CalendarCheck size={18} aria-hidden />
        <h2>Approval needed</h2>
      </div>

      <div className="segmented approvalSegmented">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={selected === opt.value ? "active" : ""}
            onClick={() => setSelected(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <form action={c.action} className="formStack">
        <input type="hidden" name="trip_id" value={tripId} />
        <label>
          <span>{c.noteLabel}</span>
          <textarea
            key={selected}
            name="message"
            rows={3}
            required={c.noteRequired}
            placeholder={c.notePlaceholder}
          />
        </label>
        <button className={c.buttonClass} type="submit">
          {c.icon}
          {c.buttonLabel}
        </button>
      </form>
    </section>
  );
}
