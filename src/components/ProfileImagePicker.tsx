import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { processProfileImage } from "@/lib/image-utils";
import { dataService } from "@/lib/data/mock";
import { toast } from "sonner";

interface Props {
  entityType: string;
  entityId: string;
  currentImage?: string | null;
  initials?: string;
  size?: number;
  avatarColor?: string;
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
      await dataService.saveProfileImage(entityType, entityId, result.dataUrl, result.sizeBytes);
      setLocalImage(result.dataUrl);
      onImageChange?.(result.dataUrl);
      toast.success("Photo saved successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save image.";
      toast.error(msg);
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative inline-block shrink-0">
      {/* Clickable avatar */}
      <button
        type="button"
        onClick={() => !saving && inputRef.current?.click()}
        className="relative group block rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ width: size, height: size }}
        title={localImage ? "Change photo" : "Upload photo"}
        disabled={saving}
      >
        {/* Avatar */}
        <div
          style={{ width: size, height: size, backgroundColor: localImage ? "transparent" : avatarColor }}
          className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
        >
          {localImage ? (
            <img src={localImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span style={{ fontSize: size * 0.3 }}>{initials}</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {saving
            ? <Loader2 className="h-5 w-5 text-white animate-spin" />
            : <Camera className="h-5 w-5 text-white" />
          }
        </div>
      </button>

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
