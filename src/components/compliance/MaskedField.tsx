/**
 * MaskedField — displays sensitive values masked by default.
 * User must explicitly click to reveal. SPDI Rules 2011 compliance.
 */
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  label: string;
  maskedValue: string;   // the masked display value (e.g. "XXXX-XXXX-1234")
  revealedValue?: string; // the actual value — only shown when user clicks reveal
  className?: string;
}

export function MaskedField({ label, maskedValue, revealedValue, className }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-foreground">
          {revealed && revealedValue ? revealedValue : maskedValue}
        </span>
        {revealedValue && (
          <button
            type="button"
            onClick={() => setRevealed(r => !r)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={revealed ? "Hide value" : "Reveal value"}
          >
            {revealed
              ? <EyeOff className="h-3.5 w-3.5" />
              : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
