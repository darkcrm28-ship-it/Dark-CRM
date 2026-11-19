"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle2, Star } from "lucide-react";

interface UnitImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

const MAX_IMAGE_COUNT = 10;
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB

export default function UnitImageManager({
  images = [],
  onChange,
  maxImages = MAX_IMAGE_COUNT,
}: UnitImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image on client canvas if needed to keep under 500 KB
  const compressImage = async (file: File): Promise<File> => {
    if (file.size <= MAX_FILE_SIZE_BYTES) return file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Scale down if dimensions are huge
          const maxDimension = 1600;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);

          ctx.drawImage(img, 0, 0, width, height);

          // Progressively compress quality until <= 500 KB
          let quality = 0.85;
          const attemptCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) return resolve(file);
                if (blob.size <= MAX_FILE_SIZE_BYTES || quality <= 0.3) {
                  const compressedFile = new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  quality -= 0.15;
                  attemptCompress();
                }
              },
              "image/jpeg",
              quality
            );
          };
          attemptCompress();
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setErrorMsg("");

    if (images.length + files.length > maxImages) {
      setErrorMsg(`يمكنك إضافة حتى ${maxImages} صور فقط كحد أقصى للوحدة (متبقي لك ${maxImages - images.length} صور).`);
      return;
    }

    setUploading(true);
    const newImageUrls: string[] = [];

    try {
      for (const rawFile of files) {
        // Auto-compress to ensure <= 500 KB
        const file = await compressImage(rawFile);

        if (file.size > MAX_FILE_SIZE_BYTES) {
          setErrorMsg(`الصورة "${file.name}" تتجاوز 500 كيلوبايت حتى بعد الضغط. يرجى اختيار صورة أصغر.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "فشل رفع الصورة");
        }

        if (data.url) {
          newImageUrls.push(data.url);
        }
      }

      if (newImageUrls.length > 0) {
        onChange([...images, ...newImageUrls]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء رفع الصور");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetPrimary = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    const selected = images[indexToPrimary];
    const rest = images.filter((_, idx) => idx !== indexToPrimary);
    onChange([selected, ...rest]);
  };

  return (
    <div className="unit-image-manager">
      {/* Header & Counter */}
      <div className="unit-image-manager-header">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-gold" />
          <span className="font-bold text-sm text-slate-200">معرض صور الوحدة</span>
        </div>
        <div className="image-counter-pill">
          <span>{images.length} / {maxImages} صور</span>
          {images.length === maxImages && <span className="text-gold font-bold">(الحد الأقصى)</span>}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="image-error-notice">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Drop Zone */}
      {images.length < maxImages && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`image-upload-dropzone ${uploading ? "uploading" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            style={{ display: "none" }}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="spinner-icon" />
              <span className="text-xs text-gold">جاري معالجة ورفع الصور إلى Cloudflare...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Upload size={24} className="text-gold mb-1" />
              <span className="text-xs font-bold text-slate-200">
                اضغط هنا لاختيار أو سحب صور الوحدة (حتى {maxImages - images.length} صور إضافية)
              </span>
              <span className="text-[11px] text-slate-400">
                الحد الأقصى: 500 كيلوبايت لكل صورة &bull; الصيغ المدعومة: JPG, PNG, WebP
              </span>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Images Thumbnails Grid */}
      {images.length > 0 && (
        <div className="unit-thumbnails-grid">
          {images.map((url, idx) => (
            <div key={idx} className="thumbnail-card">
              <img src={url} alt={`وحدة - صورة ${idx + 1}`} className="thumbnail-img" />

              {/* Primary Image Badge */}
              {idx === 0 ? (
                <div className="primary-badge" title="الصورة الرئيسية للكتالوج">
                  <Star size={10} fill="currentColor" />
                  <span>الرئيسية</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(idx)}
                  className="set-primary-btn"
                  title="تعيين كصورة رئيسية"
                >
                  اجعلها رئيسية
                </button>
              )}

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteImage(idx)}
                className="delete-img-btn"
                title="حذف هذه الصورة"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
