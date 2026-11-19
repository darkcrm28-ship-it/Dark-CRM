"use client";

import { useState } from "react";
import DatabaseBackupModal from "./DatabaseBackupModal";

export default function DatabaseBackupTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(212, 175, 55, 0.04))",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          color: "var(--gold-primary)",
          fontWeight: 700,
          borderRadius: 10,
          padding: "6px 14px",
          transition: "all 0.2s",
        }}
        title="تصدير وسحب نسخة احتياطية من قاعدة البيانات"
      >
        <span>💾</span>
        <span>سحب البيانات</span>
      </button>

      <DatabaseBackupModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
