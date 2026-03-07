import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const ActionMenuContext = createContext<(() => void) | null>(null);

export function ActionMenu({
  label,
  children,
  buttonClassName,
  menuClassName,
  triggerContent,
}: {
  label: string;
  children: ReactNode;
  buttonClassName?: string;
  menuClassName?: string;
  triggerContent?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground",
          buttonClassName
        )}
      >
        {triggerContent ?? <MoreHorizontal className="size-4" />}
      </button>

      {open ? (
        <ActionMenuContext.Provider value={() => setOpen(false)}>
          <div
            className={cn(
              "absolute right-0 top-[calc(100%+0.4rem)] z-30 min-w-44 rounded-xl border border-border bg-popover p-1 shadow-lg",
              menuClassName
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </ActionMenuContext.Provider>
      ) : null}
    </div>
  );
}

export function ActionMenuItem({
  children,
  onSelect,
  destructive = false,
}: {
  children: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  const closeMenu = useContext(ActionMenuContext);

  return (
    <button
      type="button"
      onClick={() => {
        onSelect();
        closeMenu?.();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/70",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground"
      )}
    >
      {children}
    </button>
  );
}
