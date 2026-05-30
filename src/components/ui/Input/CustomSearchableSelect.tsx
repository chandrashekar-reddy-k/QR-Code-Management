import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type CustomSearchOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  label?: string;
  required?: boolean;
  value: string;
  options: CustomSearchOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
};

const baseInputClass =
  "partner-select-input w-full px-3 py-2 text-xs border rounded-lg text-left focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-10 min-h-[36px] disabled:opacity-100 disabled:text-gray-500";

const CustomSearchableSelect = ({
  label,
  required,
  value,
  options,
  onChange,
  placeholder = "Select",
  error,
  disabled,
  searchValue = "",
  onSearchChange,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  className = "",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const search = onSearchChange ? searchValue : localSearch;

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedLabel =
    options.find((item) => item.value === value)?.label ?? placeholder;

  const visibleOptions = useMemo(() => {
    if (onSearchChange) return options;
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((item) => item.label.toLowerCase().includes(term));
  }, [onSearchChange, options, search]);

  const handleSearchChange = (next: string) => {
    if (onSearchChange) {
      onSearchChange(next);
      return;
    }
    setLocalSearch(next);
  };

  return (
    <div className={`w-full ${className}`} ref={rootRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={`${baseInputClass} ${
            error
              ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400"
              : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
          }`}
        >
          {selectedLabel}
        </button>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
        />

        {open && (
          <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-md">
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>

            <div
              className="max-h-52 overflow-y-auto"
              onScroll={(e) => {
                if (!onLoadMore || !hasMore || isLoadingMore) return;
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) onLoadMore();
              }}
            >
              {visibleOptions.map((item, index) => (
                <button
                  key={`${index}-${item.value}-${item.label}`}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}

              {!visibleOptions.length && (
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  No data found
                </div>
              )}

              {isLoadingMore && (
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{error}</p>}
    </div>
  );
};

export default CustomSearchableSelect;
