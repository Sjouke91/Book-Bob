"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "danger";
};

export function TogglePanel({ label, icon, children, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const btnClass = `button fullWidth toggleTrigger ${variant === "danger" ? "danger" : "secondary"}`;

  return (
    <div className="togglePanel">
      <button type="button" className={btnClass} onClick={() => setOpen((v) => !v)}>
        <span className="toggleTriggerLabel">
          {icon}
          {label}
        </span>
        {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
      </button>
      {open ? <div className="togglePanelBody">{children}</div> : null}
    </div>
  );
}
