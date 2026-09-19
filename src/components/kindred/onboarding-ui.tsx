import { Check, ChevronDown, Search } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PrimaryButton({ className, children, ...props }: ButtonProps) {
  return <Button className={cn("h-14 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/5 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:shadow-none", className)} {...props}>{children}</Button>;
}

export function SecondaryButton({ className, children, ...props }: ButtonProps) {
  return <Button variant="outline" className={cn("h-12 w-full rounded-xl border-primary/20 bg-transparent text-primary shadow-none transition-all hover:bg-secondary active:scale-[0.98]", className)} {...props}>{children}</Button>;
}

export function FormField({ id, label, error, hint, action, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | undefined; hint?: string | undefined; action?: ReactNode }) {
  const messageId = `${id}-message`;
  return <div className="grid gap-2">
    <Label htmlFor={id} className="text-sm font-semibold tracking-tight">{label}</Label>
    <div className="relative">
      <Input id={id} aria-invalid={Boolean(error)} aria-describedby={error || hint ? messageId : undefined} className={cn("h-13 rounded-xl border-border/60 bg-transparent px-4 text-base shadow-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent", action && "pr-14", error && "border-destructive focus:border-destructive focus-visible:ring-destructive", className)} {...props} />
      {action ? <div className="absolute inset-y-0 right-1 flex items-center">{action}</div> : null}
    </div>
    {(error || hint) && <p id={messageId} className={cn("text-xs leading-relaxed text-muted-foreground", error && "font-medium text-destructive")} role={error ? "alert" : undefined} aria-live={error ? "polite" : undefined}>{error || hint}</p>}
  </div>;
}

export function OptionCard({ name, value, selected, children, onSelect }: { name: string; value: string; selected: boolean; children: ReactNode; onSelect: () => void }) {
  return <label className={cn("relative flex min-h-13 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-transparent px-4 py-4 text-left text-base font-medium transition-[background-color,border-color,transform] hover:bg-secondary/50 focus-within:ring-2 focus-within:ring-accent active:scale-[0.99]", selected && "border-accent bg-accent/5 ring-1 ring-accent")}>
    <input className="sr-only" type="radio" name={name} value={value} checked={selected} onChange={onSelect} />
    <span className="pr-4 leading-tight">{children}</span>
    <span aria-hidden="true" className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border border-border/80", selected && "border-accent bg-primary text-accent")}>{selected ? <Check className="size-3" /> : null}</span>
  </label>;
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="relative">
    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
    <Input 
      type="search" 
      aria-label="Search hobbies and skills" 
      placeholder="Search hobbies and skills" 
      className="h-12 rounded-xl border-border/60 bg-transparent pl-11 shadow-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent" 
      {...props} 
    />
  </div>;
}

export function CategorySection({ title, open, onToggle, children, hidden = false }: { title: string; open: boolean; onToggle: () => void; children: ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return <section className="border-b border-border/40 py-1">
    <Button 
      type="button" 
      variant="ghost" 
      aria-expanded={open} 
      onClick={onToggle} 
      className="h-12 w-full justify-between px-0 text-[15px] font-bold tracking-tight hover:bg-transparent"
    >
      {title}
      <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
    </Button>
    {open && <div className="flex flex-wrap gap-2 pb-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
  </section>;
}

export function QuizProgress({ current, total }: { current: number; total: number }) {
  const progress = (current / total) * 100;
  return <div role="progressbar" aria-label="Personality quiz progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} aria-valuetext={`Question ${current} of ${total}`}>
    <div className="mb-2.5 flex items-center justify-between text-xs text-muted-foreground">
      <span>Question {current} of {total}</span>
      <span aria-hidden="true">{Math.round(progress)}%</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60" aria-hidden="true">
      <div 
        className="h-full rounded-full bg-accent transition-all duration-500 ease-out" 
        style={{ width: `${progress}%` }} 
      />
    </div>
  </div>;
}
