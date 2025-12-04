import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Fields(props: {
  fields: ReadonlyArray<{
    name: string;
    title?: string;
    type: string;
  }>;
  defaultValues?: { [key: string]: unknown };
}) {
  const fields = props.fields.map((field, index) => {
    const defaultValue = props.defaultValues?.[field.name];

    return (
      <>
        <Label key={field.name} className="flex flex-col gap-1">
          <span>{field.title ?? field.name}</span>
        </Label>
        <Input
          key={field.name}
          autoFocus={index === 0}
          type={field.type == "number" ? "number" : "text"}
          name={field.name}
          defaultValue={
            typeof defaultValue === "string" ? defaultValue : undefined
          }
        />
      </>
    );
  });

  return <>{fields}</>;
}
