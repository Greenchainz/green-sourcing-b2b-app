/**
 * Pre-wired typeahead variants — drop-in replacements for plain <Input>
 *
 * MaterialTypeahead  — searches materials DB + taxonomy
 * LocationTypeahead  — US city/state suggestions (no API key needed)
 * CompanyTypeahead   — supplier/manufacturer name suggestions
 *
 * All accept the same props as a standard <input> plus onSelect.
 */
import { useCallback } from "react";
import { Typeahead, TypeaheadItem, TypeaheadProps } from "./typeahead";
import { trpc } from "@/lib/trpc";
import { Search, MapPin, Building2 } from "lucide-react";

// ─── Shared fetch wrapper ─────────────────────────────────────────────────────

type VariantProps = Omit<TypeaheadProps, "fetchSuggestions">;

// ─── Material Typeahead ───────────────────────────────────────────────────────

export function MaterialTypeahead(props: VariantProps) {
  const utils = trpc.useUtils();

  const fetchSuggestions = useCallback(
    async (q: string): Promise<TypeaheadItem[]> => {
      const results = await utils.suggestions.materials.fetch({ q });
      return results;
    },
    [utils]
  );

  return (
    <Typeahead
      placeholder="e.g. cast-in-place concrete, TPO roofing…"
      icon={<Search className="h-4 w-4" />}
      clearable
      debounceMs={150}
      minChars={1}
      {...props}
      fetchSuggestions={fetchSuggestions}
    />
  );
}

// ─── Location Typeahead ───────────────────────────────────────────────────────
// Uses Nominatim (OpenStreetMap) for real geocoded city/address suggestions.
// Returns TypeaheadItems with lat/lng so callers can store coordinates.

export function LocationTypeahead(props: VariantProps) {
  const utils = trpc.useUtils();

  const fetchSuggestions = useCallback(
    async (q: string): Promise<TypeaheadItem[]> => {
      const results = await utils.suggestions.locationGeo.fetch({ q });
      return results;
    },
    [utils]
  );

  return (
    <Typeahead
      placeholder="e.g. Austin, TX or 123 Main St"
      icon={<MapPin className="h-4 w-4" />}
      clearable
      debounceMs={350}
      minChars={3}
      {...props}
      fetchSuggestions={fetchSuggestions}
    />
  );
}

// ─── Company Typeahead ────────────────────────────────────────────────────────

export function CompanyTypeahead(props: VariantProps) {
  const utils = trpc.useUtils();

  const fetchSuggestions = useCallback(
    async (q: string): Promise<TypeaheadItem[]> => {
      const results = await utils.suggestions.companies.fetch({ q });
      return results;
    },
    [utils]
  );

  return (
    <Typeahead
      placeholder="Search suppliers or manufacturers…"
      icon={<Building2 className="h-4 w-4" />}
      clearable
      debounceMs={200}
      minChars={2}
      {...props}
      fetchSuggestions={fetchSuggestions}
    />
  );
}
