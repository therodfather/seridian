"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Copy,
  Reply,
  Smile,
  Trash2,
  Edit3,
  Bookmark,
  Share2,
  Sparkles,
  Check,
  Bot,
} from "lucide-react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 300);
    setPosition({ x, y });
    setVisible(true);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setVisible(false);
    }

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  return (
    <div onContextMenu={handleContextMenu} className={cn("relative", className)}>
      {children}

      {visible && (
        <div
          ref={menuRef}
          style={{ top: position.y, left: position.x }}
          className="fixed z-50 w-52 rounded-xl border border-cyan-500/20 bg-[#080d1a]/95 p-1.5 backdrop-blur-md shadow-2xl shadow-cyan-950/50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header Accent */}
          <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-white/[0.06] text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Actions Menu
            </span>
            <span className="font-mono text-[9px] text-slate-500">ESC</span>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.action();
                      setVisible(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left",
                    item.danger
                      ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      : "text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300",
                    item.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className={cn("w-3.5 h-3.5", item.danger ? "text-red-400" : "text-slate-400")} />}
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono text-slate-500">{item.shortcut}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
