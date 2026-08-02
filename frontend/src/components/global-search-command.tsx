"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FolderKanban,
  Search,
  Users,
} from "lucide-react";
import { globalSearch, type GlobalSearchHit } from "@/app/actions/global-search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useTranslation } from "@/i18n/use-translation";
import { withWorkspaceQuery } from "@/lib/active-workspace";

const NAV_DEFS = [
  { id: "nav-dashboard", type: "project" as const, titleKey: "searchNav.dashboard", href: "/" },
  { id: "nav-projects", type: "project" as const, titleKey: "searchNav.projects", href: "/projects" },
  { id: "nav-personal", type: "project" as const, titleKey: "searchNav.personal", href: "/personal" },
  { id: "nav-members", type: "member" as const, titleKey: "searchNav.members", href: "/members" },
  { id: "nav-settings", type: "project" as const, titleKey: "searchNav.settings", href: "/settings" },
];

export function GlobalSearchCommand() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspaces();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [pending, startTransition] = useTransition();

  const navHits = useMemo(
    (): GlobalSearchHit[] =>
      NAV_DEFS.map((n) => ({
        id: n.id,
        type: n.type,
        title: t(n.titleKey),
        href: n.href,
        subtitle: "nav",
      })),
    [t],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!activeWorkspaceId || q.length < 1) {
      setHits([]);
      return;
    }

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const result = await globalSearch({
          workspaceId: activeWorkspaceId,
          query: q,
        });
        setHits(result.hits);
      });
    }, 220);

    return () => window.clearTimeout(handle);
  }, [query, open, activeWorkspaceId]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(withWorkspaceQuery(href, activeWorkspaceId));
    },
    [router, activeWorkspaceId],
  );

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navHits;
    return navHits.filter((h) => h.title.toLowerCase().includes(q));
  }, [query, navHits]);

  const projects = hits.filter((h) => h.type === "project");
  const tasks = hits.filter((h) => h.type === "task");
  const members = hits.filter((h) => h.type === "member");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
        aria-label={t("search.open")}
      >
        <Search className="size-4" />
        <span>{t("search.placeholder")}</span>
        <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label={t("search.open")}
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("search.title")}
        description={t("search.description")}
      >
        <CommandInput
          placeholder={t("search.inputPlaceholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {pending ? t("search.searching") : t("search.empty")}
          </CommandEmpty>

          {filteredNav.length > 0 ? (
            <CommandGroup heading={t("search.nav")}>
              {filteredNav.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`nav-${hit.title}`}
                  onSelect={() => go(hit.href)}
                >
                  {hit.type === "member" ? (
                    <Users className="size-4" />
                  ) : (
                    <FolderKanban className="size-4" />
                  )}
                  <span>{hit.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {projects.length > 0 ? (
            <CommandGroup heading={t("search.projects")}>
              {projects.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`project-${hit.title}-${hit.id}`}
                  onSelect={() => go(hit.href)}
                >
                  <FolderKanban className="size-4" />
                  <span className="truncate">{hit.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {tasks.length > 0 ? (
            <CommandGroup heading={t("search.tasks")}>
              {tasks.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`task-${hit.title}-${hit.id}`}
                  onSelect={() => go(hit.href)}
                >
                  <CheckSquare className="size-4" />
                  <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                  {hit.subtitle ? (
                    <CommandShortcut>{hit.subtitle}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {members.length > 0 ? (
            <CommandGroup heading={t("search.members")}>
              {members.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`member-${hit.title}-${hit.id}`}
                  onSelect={() => go(hit.href)}
                >
                  <Users className="size-4" />
                  <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                  {hit.subtitle ? (
                    <CommandShortcut>{hit.subtitle}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
