"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, Kbd, KbdGroup } from "@bytecats/ui-kit";

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  label: string;
  shortcuts: ShortcutEntry[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open search" },
      { keys: ["⌘", "/"], description: "Keyboard shortcuts" },
      { keys: ["1"], description: "Go to Overview" },
      { keys: ["2"], description: "Go to Issues" },
      { keys: ["3"], description: "Go to Clients" },
      { keys: ["4"], description: "Go to Bookings" },
      { keys: ["5"], description: "Go to Sales" },
      { keys: ["6"], description: "Go to Proposals" },
      { keys: ["7"], description: "Go to Templates" },
      { keys: ["8"], description: "Go to Files" },
      { keys: ["9"], description: "Go to Chat" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["⌘", "N"], description: "New item" },
    ],
  },
  {
    label: "General",
    shortcuts: [
      { keys: ["Esc"], description: "Close dialog" },
      { keys: ["?"], description: "Show shortcuts" },
    ],
  },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/[0.06] bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-white">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {shortcutCategories.map((category) => (
            <div key={category.label}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {category.label}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-sm text-slate-300">
                      {shortcut.description}
                    </span>
                    <KbdGroup>
                      {shortcut.keys.map((key) => (
                        <Kbd key={key} className="text-[10px] min-w-[24px] justify-center">
                          {key}
                        </Kbd>
                      ))}
                    </KbdGroup>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
