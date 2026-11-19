"use client";

import React from "react";

interface FieldDef {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  options?: string;
}

interface DynamicFieldsProps {
  entityType: "CUSTOMER" | "PROPERTY";
  definitions: FieldDef[];
  values: any;
  onChange: (name: string, value: any) => void;
}

export default function DynamicFields({ definitions, values, onChange }: DynamicFieldsProps) {
  if (!definitions || definitions.length === 0) return null;

  return (
    <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)" }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--gold-primary)" }}>📋 حقول إضافية مخصصة</h4>
      <div className="grid-2">
        {definitions.map((f) => (
          <div key={f.id} className="form-group">
            <label className="form-label">{f.label}</label>
            {f.fieldType === "SELECT" ? (
              <select 
                className="input" 
                value={values[f.name] || ""} 
                onChange={(e) => onChange(f.name, e.target.value)}
              >
                <option value="">اختر...</option>
                {f.options?.split(",").map((opt: string) => (
                  <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
              </select>
            ) : f.fieldType === "DATE" ? (
              <input 
                type="date" className="input" 
                value={values[f.name] || ""} 
                onChange={(e) => onChange(f.name, e.target.value)} 
              />
            ) : f.fieldType === "NUMBER" ? (
              <input 
                type="number" className="input" 
                value={values[f.name] || ""} 
                onChange={(e) => onChange(f.name, e.target.value)} 
              />
            ) : (
              <input 
                type="text" className="input" 
                value={values[f.name] || ""} 
                onChange={(e) => onChange(f.name, e.target.value)} 
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
