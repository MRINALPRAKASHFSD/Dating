import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuizCard({ question, options, selected, onSelect }: { question: string; options: string[]; selected: number | undefined; onSelect: (index: number) => void }) {
  return (
    <div className="animate-step-in">
      <p className="mb-2 text-[13px] font-medium text-accent">Choose what feels most like you</p>
      <h1 className="font-display text-3xl md:text-4xl text-balance leading-[1.2] text-foreground">{question}</h1>
      <fieldset className="mt-9 grid gap-3.5">
        <legend className="sr-only">{question}</legend>
        {options.map((option, index) => {
          const isSelected = selected === index;
          return (
            <label
              key={option}
              className={cn(
                "relative flex min-h-[4.5rem] w-full cursor-pointer items-center justify-between gap-4 whitespace-normal rounded-2xl border border-border/60 bg-card px-6 py-4 text-left text-[15px] font-semibold text-card-foreground shadow-sm transition-[background-color,border-color,transform] hover:border-accent/60 focus-within:ring-2 focus-within:ring-accent active:scale-[0.99]",
                isSelected && "border-accent bg-accent/5 ring-1 ring-accent shadow-accent/5",
              )}
            >
              <input className="sr-only" type="radio" name="personality-answer" value={index} checked={isSelected} onChange={() => onSelect(index)} />
              <span className="pr-4 leading-snug">{option}</span>
              <span aria-hidden="true" className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border border-border/80 transition-all duration-300",
                isSelected && "border-accent bg-accent text-accent-foreground scale-110"
              )}>
                {isSelected && <Check className="size-3.5 stroke-[3]" />}
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
