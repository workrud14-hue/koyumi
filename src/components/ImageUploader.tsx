import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  productId?: string; // for naming uploaded files
};

export default function ImageUploader({ images, onChange, productId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${productId || "new"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setError(uploadError.message);
      return null;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setError("");
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large (max 10MB)");
        continue;
      }
      const url = await uploadFile(file);
      if (url) newImages.push(url);
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      handleFiles(imageFiles);
    }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  };

  const addUrl = () => {
    const url = prompt("Paste an image URL:");
    if (url && url.startsWith("http")) {
      onChange([...images, url]);
    }
  };

  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
        PRODUCT IMAGES
      </label>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-all ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-outline-variant/30 hover:border-outline-variant/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {uploading ? (
          <Loader2 size={24} className="mb-2 animate-spin text-primary" />
        ) : (
          <Upload size={24} className="mb-2 text-outline/50" />
        )}

        <p className="font-mono text-[11px] tracking-[0.1em] text-outline">
          {uploading ? "UPLOADING..." : "DROP IMAGES HERE, PASTE, OR CLICK TO UPLOAD"}
        </p>
        <p className="mt-1 font-mono text-[9px] text-outline/50">
          JPEG, PNG, WebP — Max 10MB each
        </p>
      </div>

      {/* URL input button */}
      <button
        type="button"
        onClick={addUrl}
        className="mt-2 w-full border border-outline-variant/20 py-2 font-mono text-[10px] tracking-[0.1em] text-outline transition-colors hover:border-outline-variant/40 hover:text-signal"
      >
        + ADD IMAGE BY URL
      </button>

      {error && (
        <p className="mt-2 font-mono text-[11px] text-error">{error}</p>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4">
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden bg-surface-container">
              <img
                src={img}
                alt={`Product image ${i + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-void/80 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} className="text-signal" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-0 left-0 bg-primary-container px-2 py-0.5 font-mono text-[8px] tracking-[0.1em] text-on-primary-container">
                  MAIN
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
