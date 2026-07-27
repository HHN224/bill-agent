import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  describedBy?: string;
}

const MAX_TAG_LENGTH = 32;

/** 标签输入：回车/逗号确认，Backspace 或点击 × 删除。 */
export function TagInput({
  id,
  value,
  onChange,
  placeholder = "输入后按回车添加",
  maxTags = 20,
  describedBy,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag || value.includes(tag) || value.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        "border-input bg-card flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-xs",
        "focus-within:border-ring",
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="default" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`删除标签 ${tag}`}
            className="hover:bg-foreground/10 rounded-full p-0.5 transition-colors"
          >
            <X className="size-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        aria-describedby={describedBy}
        className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}
