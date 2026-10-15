import { useEffect, useRef } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import FieldRender from "@/components/form/FieldRender";
import { Button } from "@/components/ui/button";
import { FormField } from "@/models/Forms/FormField";
import type { FormFieldProps } from "@/types/FormFields";

type Item = { _key: string } & Record<string, unknown>;

function newItem(): Item {
  return { _key: crypto.randomUUID().replace(/-/g, "").slice(0, 12) };
}

export default function ListInput({
  field,
  value,
  setFieldValue,
}: Pick<FormFieldProps, "field" | "value" | "setFieldValue">) {
  const items = Array.isArray(value) ? (value as Item[]) : [];
  const min = field.minItems ?? 0;
  const max = field.maxItems ?? Infinity;
  const name = field.name ?? field.id;
  const itemLabel = field.itemLabel ?? "Item";

  useEffect(() => {
    const current = Array.isArray(value) ? (value as Item[]) : [];
    if (current.length < min) {
      setFieldValue(name, [
        ...current,
        ...Array.from({ length: min - current.length }, newItem),
      ]);
    }
  }, [value, min, name, setFieldValue]);

  // Inputs may set several fields before the next render (src, width, height).
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  });

  const update = (next: Item[]) => {
    latest.current = next;
    return setFieldValue(name, next);
  };

  const setItemField = (key: string, field: string, next: unknown) =>
    update(latest.current.map((other) => (other._key === key ? { ...other, [field]: next } : other)));

  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    update(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{field.label}</span>
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item._key} className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-1">
              <span className="me-auto text-sm font-semibold text-muted-foreground">
                {itemLabel} {index + 1}
              </span>
              {index > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 max-md:size-11"
                  aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
              ) : null}
              {index < items.length - 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 max-md:size-11"
                  aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon className="size-4" />
                </Button>
              ) : null}
              {items.length > min ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 max-md:size-11"
                  aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                  onClick={() => update(items.filter((other) => other._key !== item._key))}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              {field.itemFields?.map((sub) => {
                const id = `${name}-${item._key}-${sub.name}`;
                return (
                  <FieldRender
                    key={sub.name}
                    field={Object.assign(
                      new FormField({ id: sub.id, label: sub.label, type: sub.type }),
                      sub,
                      { id }
                    )}
                    value={item[sub.name!]}
                    values={item}
                    setFieldValue={(target, next) =>
                      setItemField(item._key, target === id ? sub.name! : target, next)
                    }
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {items.length < max ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start max-md:min-h-11"
          onClick={() => update([...items, newItem()])}
        >
          <PlusIcon className="size-4" />
          {field.addLabel ?? "Add"}
        </Button>
      ) : null}
    </div>
  );
}
