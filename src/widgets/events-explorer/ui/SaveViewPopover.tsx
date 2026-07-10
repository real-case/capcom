// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as FacetFilter.
import { zodResolver } from "@hookform/resolvers/zod";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** `[form:save-view]` — the one-field save form (ADR 0017/0020). */
const saveViewSchema = z.object({
  name: z.string().trim().min(1, "[form:save-view] name is required").max(120),
});
type SaveViewValues = z.infer<typeof saveViewSchema>;

/**
 * SaveViewPopover — name and save the CURRENT view as an `events` report (ADR
 * 0098/0090). The form validates through Zod at the boundary (ADR 0020); the leaf owns
 * the mutation (optimistic against the shared reports list, ADR 0025) and passes only
 * its pending state down. Saving is the analyst write the 0090 RLS gates — a viewer's
 * save fails server-side and rolls back.
 */
export function SaveViewPopover({
  onSave,
  isPending,
}: {
  onSave: (name: string) => void;
  isPending: boolean;
}) {
  const t = useTranslations("Events");
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SaveViewValues>({
    resolver: zodResolver(saveViewSchema),
    defaultValues: { name: "" },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm">
          <Bookmark aria-hidden className="size-3.5" />
          {t("saveView")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <form
          noValidate
          onSubmit={handleSubmit((values) => {
            onSave(values.name);
            reset();
            setOpen(false);
          })}
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="save-view-name"
            className="text-xs text-muted-foreground"
          >
            {t("saveViewName")}
          </label>
          <input
            id="save-view-name"
            autoFocus
            placeholder={t("saveViewPlaceholder")}
            aria-invalid={errors.name ? true : undefined}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name ? (
            <p role="alert" className="text-xs text-destructive">
              {t("saveViewNameRequired")}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={isPending}>
            {t("saveViewConfirm")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
