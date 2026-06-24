import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { processProfileImage, formatBytes } from "@/lib/image-utils";
import { dataService } from "@/lib/data/mock";
import { toast } from "sonner";

interface Props {
  entityType: string;
  entityId: string;
  currentImage?: string | null;
  initials?: string;
  size?: number;           // px, default 80
  avatarColor?: string;    // fallback bg colour
  onImageChange?: (dataUrl: string | null) => void;
}

export function ProfileImagePicker({
  entityType,
  entityId,
  currentImage,
  initials = "?",
  size = 80,
  avatarColor = "#e07b2a",
  onImageChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [localImage, setLocalImage] = useState<string | null>(currentImage ?? null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const result = await processProfileImage(file);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const ok = await dataService.saveProfileImage(entityType, entityId, result.dataUrl, result.sizeBytes);
      if (!ok) {
        toast.error("Could not save image. Please try again.");
        return;
      }
      setLocalImage(result.dataUrl);
      onImageChange?.(result.dataUrl);
      toast.success(`Photo saved (${formatBytes(result.sizeBytes)})`);
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!localImage) return;
    setSaving(true);
    try {
      await dataService.deleteProfileImage(entityType, entityId);
      setLocalImage(null);
      onImageChange?.(null);
      toast.success("Photo removed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative inline-block">
      {/* Avatar */}
      <div
        style={{ width: size, height: size, backgroundColor: localImage ? "transparent" : avatarColor }}
        className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0"
      >
        {localImage ? (
          <img src={localImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.3 }}>{initials}</span>
        )}
      </div>

      {/* Camera button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={saving}
        className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow hover:bg-primary/90 transition-colors disabled:opacity-60"
        title="Change photo"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
      </button>

      {/* Remove button */}
      {localImage && !saving && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-0 right-0 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow hover:bg-destructive/80 transition-colors"
          title="Remove photo"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
