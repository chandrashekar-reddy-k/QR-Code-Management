import { ReactNode, useMemo, useState } from 'react';
import SortableTableHeader from './SortableTableHeader';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  sortValue?: (item: T) => unknown;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (field: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string | number;
}

type ComparableValue =
  | { kind: 'nullish'; value: null }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string };

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined;

const getNestedValue = (item: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, item);
};

const getComparableValue = (value: unknown): ComparableValue => {
  if (isNil(value)) {
    return { kind: 'nullish', value: null };
  }

  if (typeof value === 'number') {
    return Number.isNaN(value)
      ? { kind: 'nullish', value: null }
      : { kind: 'number', value };
  }

  if (typeof value === 'boolean') {
    // true > false (as numeric)
    return { kind: 'number', value: value ? 1 : 0 };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return { kind: 'string', value: '' };

    // Numeric strings should be compared numerically.
    const numericValue = Number(trimmed);
    if (!Number.isNaN(numericValue)) {
      return { kind: 'number', value: numericValue };
    }

    return { kind: 'string', value: trimmed.toLowerCase() };
  }

  return { kind: 'string', value: String(value).toLowerCase() };
};

const resolveSortValue = <T,>(item: T, column: Column<T>): unknown => {
  if (column.sortValue) return column.sortValue(item);

  const recordItem = item as Record<string, unknown>;
  const field = column.key;

  if (field in recordItem) return recordItem[field];

  if (field.includes('.')) {
    return getNestedValue(recordItem, field);
  }
  return null;
};

function DataTable<T>({
  data,
  columns,
  sortField,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  keyExtractor,
}: DataTableProps<T>) {
  const [internalSortField, setInternalSortField] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc' | null>(null);

  const isControlledSort = sortField !== undefined || sortDirection !== undefined;
  const activeSortField = isControlledSort ? sortField ?? null : internalSortField;
  const activeSortDirection = isControlledSort ? sortDirection ?? null : internalSortDirection;

  const updateInternalSort = (field: string) => {
    if (internalSortField === field) {
      if (internalSortDirection === 'asc') setInternalSortDirection('desc');
      else if (internalSortDirection === 'desc') {
        setInternalSortField(null);
        setInternalSortDirection(null);
      } else setInternalSortDirection('asc');
    } else {
      setInternalSortField(field);
      setInternalSortDirection('asc');
    }
  };

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
      return;
    }
    updateInternalSort(field);
  };

  const sortedData = useMemo(() => {
    if (!activeSortField) return data;
    const selectedColumn = columns.find((column) => column.key === activeSortField);
    if (!selectedColumn?.sortable) return data;

    return [...data].sort((a, b) => {
      const aRawValue = resolveSortValue(a, selectedColumn);
      const bRawValue = resolveSortValue(b, selectedColumn);
      const aValue = getComparableValue(
        aRawValue,
      );
      const bValue = getComparableValue(
        bRawValue,
      );

      if (aValue.kind === 'nullish' && bValue.kind === 'nullish') return 0;
      // Always keep null/undefined at the bottom.
      if (aValue.kind === 'nullish') return 1;
      if (bValue.kind === 'nullish') return -1;

      const sameKind = aValue.kind === bValue.kind;
      let comparison = 0;

      if (sameKind) {
        if (aValue.kind === 'string' && bValue.kind === 'string') {
          comparison = aValue.value.localeCompare(bValue.value);
        } else {
          comparison = aValue.value === bValue.value ? 0 : aValue.value > bValue.value ? 1 : -1;
        }
      } else {
        // Safe mixed-type fallback (deterministic type ordering).
        const typeRank: Record<'number' | 'string', number> = {
          number: 0,
          string: 1,
        };
        comparison = typeRank[aValue.kind] - typeRank[bValue.kind];
      }

      if (comparison === 0) return 0;
      return activeSortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, columns, activeSortField, activeSortDirection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
      </div>
    );
  }

  // if (data.length === 0) {
  //   return (
  //     <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
  //       {emptyMessage}
  //     </div>
  //   );
  // }

  return (
    <div className="overflow-x-auto table-scrollbar">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {columns.map((column) => (
              <SortableTableHeader
                key={column.key}
                field={column.key}
                label={column.label}
                currentField={activeSortField}
                direction={activeSortDirection}
                onSort={column.sortable ? handleSort : undefined}
              />
            ))}
          </tr>
        </thead>
       <tbody>
  {sortedData.length === 0 ? (
    <tr>
      <td
        colSpan={columns.length}
        className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        {emptyMessage}
      </td>
    </tr>
  ) : (
    sortedData.map((item) => (
      <tr
        key={keyExtractor(item)}
        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {columns.map((column) => (
          <td
            key={column.key}
            className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200"
          >
            {column.render
              ? column.render(item)
              : String((item as Record<string, unknown>)[column.key] ?? '')}
          </td>
        ))}
      </tr>
    ))
  )}
</tbody>

      </table>
    </div>
  );
}

export default DataTable;

