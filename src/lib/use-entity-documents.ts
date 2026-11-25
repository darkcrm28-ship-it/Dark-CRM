"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DocumentRow = {
  id: string;
  entityType: string;
  entityId: string;
  type: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  accessLevel: string;
  uploadedById: string;
  createdAt: string;
};

type UploadInput = {
  file: File;
  type: string;
  title: string;
  accessLevel: string;
};

/** Shared document list/mutations for the standalone page and embedded panels. */
export function useEntityDocuments(entityType: string, entityId: string) {
  const requestIdRef = useRef(0);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;
    if (!entityId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ entityType, entityId });
      const response = await fetch(`/api/documents?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = await response.json();
      if (!isCurrent()) return;
      if (!response.ok) throw new Error(data.error || "تعذّر تحميل المستندات");
      setDocuments(data.documents || []);
    } catch (error) {
      if (!isCurrent()) return;
      setDocuments([]);
      setMessage(error instanceof Error ? error.message : "تعذّر تحميل المستندات");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => {
      requestIdRef.current += 1;
      controller.abort();
    };
  }, [load]);

  const upload = useCallback(async ({ file, type, title, accessLevel }: UploadInput) => {
    if (!entityId) return false;
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("entityType", entityType);
      body.append("entityId", entityId);
      body.append("type", type);
      body.append("title", title);
      body.append("accessLevel", accessLevel);
      const response = await fetch("/api/documents", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر رفع المستند");
      setMessage("تم رفع المستند بنجاح.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذّر رفع المستند");
      return false;
    } finally {
      setBusy(false);
    }
  }, [entityType, entityId, load]);

  const download = useCallback(async (id: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documents/${id}?expires=120`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر إنشاء رابط التحميل");
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذّر إنشاء رابط التحميل");
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!confirm("هل تريد حذف هذا المستند؟")) return false;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر حذف المستند");
      setMessage("تم حذف المستند.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذّر حذف المستند");
      return false;
    } finally {
      setBusy(false);
    }
  }, [load]);

  return {
    documents,
    loading,
    busy,
    message,
    upload,
    download,
    remove,
  };
}
