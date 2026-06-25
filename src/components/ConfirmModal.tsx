"use client";

import { useState, type ReactNode } from "react";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  children,
  danger = false
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
        <div className="modalActions">
          <button type="button" onClick={onClose} className="button secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? "button danger" : "button primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style jsx>{`
        .modalOverlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modalCard {
          background: #fff;
          border-radius: 8px;
          padding: 2rem;
          min-width: 320px;
          max-width: 90vw;
          box-shadow: 0 4px 32px rgba(0,0,0,0.15);
        }
        .modalActions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
