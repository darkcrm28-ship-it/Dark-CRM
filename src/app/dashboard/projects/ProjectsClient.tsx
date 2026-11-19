"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectsClient({ initialProjects }: { initialProjects: any[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingProject, setEditingProject] = useState<any>(null);
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects([data, ...projects]);
      setShowAdd(false);
      setName(""); setDescription("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingProject.name, description: editingProject.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects(projects.map(p => p.id === data.id ? data : p));
      setEditingProject(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">إدارة المشاريع</div>
          <div className="page-subtitle">{projects.length} مشروع مسجل</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary">
          {showAdd ? "✕ إغلاق" : "+ إضافة مشروع جديد"}
        </button>
      </div>

      {showAdd && (
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <form onSubmit={handleAdd}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">اسم المشروع</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="مثلاً: مشروع الـ 120 فدان" required />
              </div>
              <div className="form-group">
                <label className="form-label">الوصف (اختياري)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="وصف مختصر للمشروع..." />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 12 }}>
              {loading ? "جاري الحفظ..." : "💾 حفظ المشروع"}
            </button>
          </form>
        </div>
      )}

      <div className="grid-3 animate-in-1">
        {projects.map(p => (
          <div key={p.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
              <span className="badge badge-gold">{p._count?.customers || 0} عميل</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, height: 40, overflow: "hidden" }}>
              {p.description || "لا يوجد وصف."}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                📅 {new Date(p.createdAt).toLocaleDateString("ar-EG")}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditingProject(p)} className="btn btn-ghost btn-sm">✏️ تعديل</button>
                <button 
                  onClick={() => {
                    // Filter customers from global state or just link to Customers page with project filter
                    router.push(`/dashboard/customers?project=${p.id}`);
                  }} 
                  className="btn btn-ghost btn-sm"
                >عرض العملاء ←</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingProject && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ fontWeight: 800 }}>✏️ تعديل المشروع</div>
              <button onClick={() => setEditingProject(null)} className="btn-close">✕</button>
            </div>
            <form onSubmit={handleEdit} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">اسم المشروع</label>
                <input 
                  type="text" value={editingProject.name} 
                  onChange={e => setEditingProject({...editingProject, name: e.target.value})} 
                  className="input" required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">الوصف</label>
                <textarea 
                  value={editingProject.description || ""} 
                  onChange={e => setEditingProject({...editingProject, description: e.target.value})} 
                  className="input" rows={3}
                />
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditingProject(null)} className="btn btn-ghost">إلغاء</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "..." : "💾 حفظ التغييرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
