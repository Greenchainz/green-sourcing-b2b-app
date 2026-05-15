/**
 * Typeahead — reusable predictive-text input component
 *
 * Usage:
 *   <Typeahead
 *     value={value}
 *     onChange={setValue}
 *     onSelect={(item) => setValue(item.label)}
 *     fetchSuggestions={async (q) => trpc.suggestions.materials.query({ q })}
 *     placeholder="Search materials…"
 *     icon={<Search className="h-4 w-4" />}
 *   />
 *
 * Or use the pre-wired variants:
 *   <MaterialTypeahead value={v} onChange={setV} onSelect={setV} />
 *   <LocationTypeahead value={v} onChange={setV} onSelect={setV} />
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TypeaheadItem {
  /** Displayed in the dropdown */
  label: string;
  /** Unique key — defaults to label if omitted */
  value?: string;
  /** Optional secondary line shown below the label */
  sublabel?: string;
  /** Optional badge text (e.g. category, state) */
  badge?: string;
  /** Geocoded coordinates — populated by LocationTypeahead results */
  lat?: number;
  lng?: number;
}

export interface TypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user clicks or keyboards-selects a suggestion */
  onSelect?: (item: TypeaheadItem) => void;
  /** Async function that returns suggestions for a query string */
  fetchSuggestions: (query: string) => Promise<TypeaheadItem[]>;
  placeholder?: string;
  /** Minimum characters before fetching (default 1) */
  minChars?: number;
  /** Debounce delay in ms (default 200) */
  debounceMs?: number;
  /** Max suggestions shown (default 8) */
  maxItems?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** Leading icon inside the input */
  icon?: ReactNode;
  /** Show a clear button when value is non-empty */
  clearable?: boolean;
  /** Called when the clear button is clicked */
  onClear?: () => void;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Typeahead({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder = "Type to search…",
  minChars = 1,
  debounceMs = 200,
  maxItems = 8,
  className,
  inputClassName,
  disabled,
  icon,
  clearable,
  onClear,
  id,
  name,
  autoFocus,
}: TypeaheadProps) {
  const [suggestions, setSuggestions] = useState<TypeaheadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suppressFetch, setSuppressFetch] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedValue = useDebounce(value, debounceMs);

  // ── Fetch suggestions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (suppressFetch) {
      setSuppressFetch(false);
      return;
    }
    if (debouncedValue.trim().length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchSuggestions(debouncedValue.trim())
      .then((items) => {
        if (cancelled) return;
        setSuggestions(items.slice(0, maxItems));
        setIsOpen(items.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue, minChars, maxItems, fetchSuggestions, suppressFetch]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Scroll active item into view ───────────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ── Select a suggestion ────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (item: TypeaheadItem) => {
      setSuppressFetch(true);
      onChange(item.label);
      onSelect?.(item);
      setIsOpen(false);
      setActiveIndex(-1);
      setSuggestions([]);
    },
    [onChange, onSelect]
  );

  // ── Keyboard navigation ────────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        // Accept top suggestion on Tab
        if (suggestions[0]) {
          handleSelect(suggestions[0]);
        }
        break;
    }
  }

  const showClear = clearable && value.length > 0 && !disabled;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Input */}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-activedescendant={
            activeIndex >= 0 ? `typeahead-item-${activeIndex}` : undefined
          }
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className={cn(
            // Match the existing shadcn/ui Input styling exactly
            "border-input dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "md:text-sm",
            icon && "pl-9",
            showClear && "pr-8",
            inputClassName
          )}
        />
        {/* Loading spinner */}
        {isLoading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </span>
        )}
        {/* Clear button */}
        {showClear && !isLoading && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              onChange("");
              onClear?.();
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 w-full overflow-auto rounded-md border border-border bg-popover shadow-md",
            "max-h-60 py-1 text-sm"
          )}
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.value ?? item.label}
              id={`typeahead-item-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                handleSelect(item);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex cursor-pointer select-none items-start gap-2 px-3 py-2 transition-colors",
                idx === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex-1 min-w-0">
                {/* Highlight matching portion */}
                <HighlightMatch text={item.label} query={value} />
                {item.sublabel && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.sublabel}
                  </p>
                )}
              </div>
              {item.badge && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Highlight matching text ──────────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-foreground">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </span>
  );
}
