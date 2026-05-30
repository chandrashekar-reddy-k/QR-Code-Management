import { SelectHTMLAttributes, ReactNode, forwardRef } from "react";

/** Chevron on the <select> itself (background-image); reliable vs. overlay SVG behind native select paint layer. */
const SELECT_CHEVRON_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23525252' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label?: string | ReactNode;
  error?: string;
  required?: boolean;
  children?: ReactNode;
  options?: SelectOption[];
  placeholder?: string;
}

const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      label,
      error,
      required,
      className = "",
      children,
      options,
      placeholder,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {typeof label === "string" ? (
              <>
                {label}{" "}
                {required && (
                  <span className="text-red-500 dark:text-red-400">*</span>
                )}
              </>
            ) : (
              label
            )}
          </label>
        )}

        <div className="relative w-full">
          <select
            ref={ref}
            {...props}
            style={{
              backgroundImage: SELECT_CHEVRON_BG,
              backgroundSize: "16px 16px",
              backgroundPosition: "right 0.65rem center",
              backgroundRepeat: "no-repeat",
              ...style,
            }}
            className={`partner-select-input w-full px-3 py-2 text-xs border rounded-lg 
            focus:outline-none focus:ring-2 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
            appearance-none pr-10 min-h-[36px] 
            ${
              error
                ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400"
                : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
            }
            disabled:opacity-100 disabled:text-gray-500 ${className}`}
          >
            {/* Placeholder */}
            {placeholder && (
              <option value="" disabled={props.value === ""}>
                {placeholder}
              </option>
            )}

            {/* Options */}
            {options
              ? options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))
              : children}
          </select>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  },
);

SelectInput.displayName = "SelectInput";

export default SelectInput;
