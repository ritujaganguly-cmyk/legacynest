/**
 * SPDINotice — compact banner displayed at the top of every protected section.
 * Informs users that the section contains Sensitive Personal Data under SPDI Rules 2011.
 */
import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { SPDI_SECTIONS } from "@/lib/compliance";

interface Props {
  section: keyof typeof SPDI_SECTIONS;
}

export function SPDINotice({ section }: Props) {
  const [open, setOpen] = useState(false);
  const meta = SPDI_SECTIONS[section];
  if (!meta) return null;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">
            Protected Data — {meta.label}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-primary/60" />
          : <ChevronDown className="h-4 w-4 text-primary/60" />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-1 border-t border-primary/10">
          <p className="text-xs text-muted-foreground pt-2">
            <span className="font-medium text-foreground">Why we collect this: </span>
            {meta.purpose}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Law: </span>
            {meta.lawRef}
          </p>
          <p className="text-xs text-muted-foreground">
            You can export or delete this data from{" "}
            <span className="font-medium text-foreground">Settings → Data & Privacy</span>.
          </p>
        </div>
      )}
    </div>
  );
}
