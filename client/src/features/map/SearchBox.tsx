import { Search, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { ParcelMapItem } from "../../lib/api-client";

interface SearchBoxProps {
  parcels: readonly ParcelMapItem[];
  selectedDag: string | null;
  onSelect: (dagNumber: string) => void;
  onClear: () => void;
}

export function SearchBox({
  parcels,
  selectedDag,
  onSelect,
  onClear,
}: SearchBoxProps) {
  const [query, setQuery] = useState(selectedDag ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(selectedDag ?? "");
    setError(
      selectedDag && !parcels.some((parcel) => parcel.dagNumber === selectedDag)
        ? `Dag ${selectedDag} was not found.`
        : "",
    );
  }, [parcels, selectedDag]);

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const dagNumber = query.trim();
    const parcel = parcels.find((item) => item.dagNumber === dagNumber);
    if (!parcel) {
      setError(`Dag ${dagNumber || "number"} was not found.`);
      return;
    }

    setError("");
    onSelect(parcel.dagNumber);
  }

  function clearSearch(): void {
    setQuery("");
    setError("");
    onClear();
  }

  return (
    <div className="absolute left-4 top-4 z-[500] w-[min(22rem,calc(100%-2rem))]">
      <form
        className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 shadow-control"
        onSubmit={submitSearch}
        role="search"
      >
        <Search aria-hidden="true" className="shrink-0 text-muted-foreground" size={18} />
        <input
          aria-label="Search dag number"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          onChange={(event) => {
            setQuery(event.target.value);
            setError("");
          }}
          placeholder="Search dag number, e.g. 14"
          type="search"
          value={query}
        />
        {query && (
          <button
            aria-label="Clear dag search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={clearSearch}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        )}
      </form>
      {error && (
        <p
          aria-live="polite"
          className="mt-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-destructive shadow-control"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
