"use client";

import { useTranslations } from "next-intl";
import { FolderOpen } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";

import { SECTIONS, sectionHref } from "../model/sections";

/**
 * The ⌘K command palette (ADR 0034 `command`, ADR 0065 widget internal). A single jump-to
 * surface over the same section registry as the sidebar, plus project switching — navigation
 * only, so it owns no server state (ADR 0026). Open/close is controlled by the shell (which
 * binds ⌘K); selecting a row routes through the i18n router (ADR 0030) and closes. The cmdk
 * list filters against each row's text. Re-skinned for the console (ADR 0099): the shadcn
 * command primitive is NOT forked — it is themed THROUGH the mission-control `--surface-overlay`
 * / `--text-*` tokens by className overrides at this call site (ADR 0099 seam; ADR 0058).
 */
export function CommandPalette({
  open,
  onOpenChange,
  projectId,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projects: { id: string; name: string }[];
}) {
  const t = useTranslations("AppShell");
  const router = useRouter();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const otherProjects = projects.filter((p) => p.id !== projectId);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("command.title")}
      description={t("command.description")}
      className="border-border-hairline bg-surface-overlay"
    >
      <Command className="bg-surface-overlay text-text-primary">
        <CommandInput
          placeholder={t("command.placeholder")}
          className="text-text-primary placeholder:text-text-secondary"
        />
        <CommandList>
          <CommandEmpty className="text-text-secondary">
            {t("command.empty")}
          </CommandEmpty>
          <CommandGroup
            heading={t("command.goTo")}
            className="text-text-secondary **:[[cmdk-group-heading]]:text-text-secondary"
          >
            {SECTIONS.map(({ key, segment, Icon }) => (
              <CommandItem
                key={key}
                value={`goto ${t(`nav.${key}`)}`}
                onSelect={() => go(sectionHref(projectId, segment))}
                className="text-text-secondary data-selected:bg-surface-elevated data-selected:text-text-primary"
              >
                <Icon className="size-4 shrink-0" />
                {t(`nav.${key}`)}
              </CommandItem>
            ))}
          </CommandGroup>
          {otherProjects.length > 0 && (
            <CommandGroup
              heading={t("command.switchProject")}
              className="text-text-secondary **:[[cmdk-group-heading]]:text-text-secondary"
            >
              {otherProjects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
                  onSelect={() => go(`/p/${p.id}`)}
                  className="text-text-secondary data-selected:bg-surface-elevated data-selected:text-text-primary"
                >
                  <FolderOpen className="size-4 shrink-0" />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
