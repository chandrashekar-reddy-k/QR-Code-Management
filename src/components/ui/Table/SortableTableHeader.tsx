import { SortIcon } from '..';

export interface SortableTableHeaderProps {
  field: string;
  label: React.ReactNode;
  currentField: string | null;
  direction: 'asc' | 'desc' | null;
  onSort?: (field: string) => void;
  className?: string;
}

const SortableTableHeader = ({
  field,
  label,
  currentField,
  direction,
  onSort,
  className = '',
}: SortableTableHeaderProps) => {
  const isSortable = !!onSort;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSort) onSort(field);
  };

  const content = (
    <>
      <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{label}</span>
      {isSortable && (
        <SortIcon field={field} currentField={currentField} direction={direction} size={12} />
      )}
    </>
  );

  return (
    <th
      className={`px-2 sm:px-6 py-3 sm:py-4 text-center ${
        isSortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors p-0' : ''
      } ${className}`}
    >
      {isSortable ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full h-full min-h-[2.5rem] flex items-center justify-center gap-1 sm:gap-1.5 border-0 bg-transparent py-3 px-2 sm:px-4 text-inherit font-inherit cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset rounded"
        >
          {content}
        </button>
      ) : (
        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
          {content}
        </div>
      )}
    </th>
  );
};

export default SortableTableHeader;


