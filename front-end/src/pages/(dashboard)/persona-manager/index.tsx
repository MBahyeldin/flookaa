import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUserProfileStore } from "@/stores/UserProfileStore";
import { MoreHorizontal, Trash2, Plus } from "lucide-react";
import CreatePersona from "@/pages/select-persona/CreatePersona";
import { DialogTrigger } from "@/components/ui/dialog";

export default function PersonaManagerPage() {
  const { personas } = useUserProfileStore();

  return (
    <div className="mx-auto max-w-5xl py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Personas
        </h1>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Persona
          </Button>
        </DialogTrigger>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Avatar</TableHead>
              <TableHead>Profile Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {personas.map((persona) => (
              <TableRow
                key={persona.slug}
                className="group hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">
                  {persona.name}
                </TableCell>
                <TableCell>
                  {persona.thumbnail ? (
                    <img
                      src={persona.thumbnail}
                      alt={persona.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold">
                      {persona.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  {persona.first_name} {persona.last_name}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  @{persona.slug}
                </TableCell>

                <TableCell className="capitalize">
                  {persona.privacy}
                </TableCell>

                {/* Hover Actions */}
                <TableCell className="text-right">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (
                              confirm(
                                "Delete this persona? This action cannot be undone."
                              )
                            ) {
                              // deletePersona(persona.slug);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {personas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No personas created yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreatePersona />
    </div>
  );
}
