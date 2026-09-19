import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TagPill({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "min-h-11 rounded-full border-border bg-transparent px-4 text-sm font-medium shadow-none transition-[background-color,border-color,transform] duration-200 active:scale-[0.98]",
        selected && "border-accent bg-accent/15 text-primary hover:bg-accent/20",
      )}
    >
      {selected && <Check className="size-3.5" />}
      {label}
    </Button>
  );
}