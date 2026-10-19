import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listInterests } from "@/services/interests";
import type { Interest } from "@/types/interest";

/** One interest at a time, by slug; "" is All. */
export default function InterestFilter({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  const [interests, setInterests] = useState<Interest[]>([]);

  useEffect(() => {
    listInterests().then((r) => {
      if (r.ok) setInterests(r.data.flatMap((g) => g.interests));
    });
  }, []);

  if (interests.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Interests:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={value ? "outline" : "default"} size="sm" onClick={() => onChange("")}>
          All
        </Button>
        {interests.map((i) => (
          <Button
            key={i.id}
            variant={value === i.slug ? "default" : "outline"}
            size="sm"
            aria-pressed={value === i.slug}
            onClick={() => onChange(value === i.slug ? "" : i.slug)}
          >
            <span aria-hidden>{i.emoji}</span>
            {i.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
