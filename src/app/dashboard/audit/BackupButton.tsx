"use client";

import { useState } from "react";
import DatabaseBackupModal from "@/components/DatabaseBackupModal";

export default function BackupButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setModalOpen(true)} className="btn btn-primary">
        🛡️ سحب وتصدير قاعدة البيانات (SQL / JSON / Excel)
      </button>

      <DatabaseBackupModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
