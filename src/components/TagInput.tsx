import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

const normalizeTag = (tag: string): string => {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/gi, '') // Remove special characters except hyphen and underscore
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

export function TagInput({ 
  value = [], 
  onChange, 
  placeholder = "Enter tag", 
  maxTags = 10,
  className 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty
      const newTags = [...value];
      newTags.pop();
      onChange(newTags);
    }
  };

  const addTag = () => {
    const normalized = normalizeTag(inputValue);
    if (!normalized) {
        setInputValue(""); // Clear if it normalizes to empty
        return;
    }

    if (value.includes(normalized)) {
        setInputValue("");
        return;
    }
    
    if (value.length >= maxTags) {
        return;
    }

    onChange([...value, normalized]);
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={cn("flex flex-wrap gap-2 p-2 border rounded-md bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
      {value.map((tag, index) => (
        <Badge key={index} variant="secondary" className="gap-1 px-2 py-1 text-sm font-normal bg-gray-100 hover:bg-gray-200 text-gray-800">
          {tag}
          <button
            type="button"
            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => removeTag(tag)}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}
      {value.length < maxTags && (
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0 h-7 min-w-[120px] shadow-none"
        />
      )}
    </div>
  );
}
