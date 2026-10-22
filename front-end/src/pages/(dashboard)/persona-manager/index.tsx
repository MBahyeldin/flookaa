import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUserProfileStore } from "@/stores/UserProfileStore";
import { MoreHorizontal, Pencil, Plus, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { personaPath } from "@/components/persona-link";
import CreatePersona from "@/pages/select-persona/CreatePersona";
import { DialogTrigger } from "@/components/ui/dialog";
import { DEFAULT_PALETTE, PALETTES, isPaletteId } from "@/themes/palettes";

const settingsPath = (id: string | number) => `/persona-manager/${id}`;

export default function PersonaManagerPage() {
  const { personas } = useUserProfileStore();
  const navigate = useNavigate();

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

      {personas.length === 0 ? (
        <EmptyState icon={UserRound} title="No personas yet" body="A persona is how you show up in channels and communities." />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Profile Name</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {personas.map((persona) => (
                <TableRow
                  key={persona.id}
                  onClick={() => navigate(settingsPath(persona.id))}
                  className="group cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {persona.thumbnail ? (
                        <img
                          src={persona.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold">
                          {persona.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <Link
                        to={settingsPath(persona.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {persona.name}
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>{persona.first_name} {persona.last_name}</div>
                    <div className="text-sm text-muted-foreground">@{persona.slug}</div>
                  </TableCell>

                  <TableCell className="capitalize">
                    {persona.privacy.replace("_", " ")}
                  </TableCell>

                  <TableCell>
                    <ThemeSwatch theme={persona.theme} />
                  </TableCell>

                  {/* Hover Actions */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
                          <DropdownMenuItem asChild>
                            <Link to={settingsPath(persona.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={personaPath(persona.id)}>
                              <UserRound className="mr-2 h-4 w-4" />
                              View profile
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
        </div>
      )}

      <CreatePersona />
    </div>
  );
}

function ThemeSwatch({ theme }: { theme: string }) {
  const id = isPaletteId(theme) ? theme : DEFAULT_PALETTE;
  const label = PALETTES.find((p) => p.id === id)?.label;
  return (
    <span data-theme={id} className="inline-flex items-center gap-2 bg-transparent text-sm">
      <span className="size-4 rounded-full border border-border bg-primary" />
      <span className="text-foreground">{label}</span>
    </span>
  );
}
