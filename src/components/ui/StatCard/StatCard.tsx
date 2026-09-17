import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /**
   * Preset color variants to keep styling consistent across the app.
   */
  variant?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
  /**
   * Visual size of the card.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Optional trend indicator shown as a small percentage / number.
   */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /**
   * Text size for the value. Defaults to '2xl'.
   */
  valueSize?: "xl" | "2xl" | "lg";
}

const variantClasses: Record<
  NonNullable<StatCardProps["variant"]>,
  {
    container: string;
    iconWrapper: string;
    textColor: string;
    trendPositive: string;
    trendNegative: string;
  }
> = {
  blue: {
    container: "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700",
    iconWrapper: "bg-blue-200 dark:bg-blue-800",
    textColor: "text-blue-900 dark:text-blue-300",
    trendPositive: "text-blue-700 dark:text-blue-400",
    trendNegative: "text-blue-700 dark:text-blue-400",
  },
  green: {
    container: "from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700",
    iconWrapper: "bg-green-200 dark:bg-green-800",
    textColor: "text-green-900 dark:text-green-300",
    trendPositive: "text-green-700 dark:text-green-400",
    trendNegative: "text-green-700 dark:text-green-400",
  },
  yellow: {
    container: "from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-700",
    iconWrapper: "bg-amber-200 dark:bg-amber-800",
    textColor: "text-amber-900 dark:text-amber-300",
    trendPositive: "text-amber-700 dark:text-amber-400",
    trendNegative: "text-amber-700 dark:text-amber-400",
  },
  red: {
    container: "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700",
    iconWrapper: "bg-red-200 dark:bg-red-800",
    textColor: "text-red-900 dark:text-red-300",
    trendPositive: "text-red-700 dark:text-red-400",
    trendNegative: "text-red-700 dark:text-red-400",
  },
  purple: {
    container: "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700",
    iconWrapper: "bg-purple-200 dark:bg-purple-800",
    textColor: "text-purple-900 dark:text-purple-300",
    trendPositive: "text-purple-700 dark:text-purple-400",
    trendNegative: "text-purple-700 dark:text-purple-400",
  },
  gray: {
    container: "from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600",
    iconWrapper: "bg-gray-200 dark:bg-gray-700",
    textColor: "text-gray-900 dark:text-gray-300",
    trendPositive: "text-gray-700 dark:text-gray-400",
    trendNegative: "text-gray-700 dark:text-gray-400",
  },
};

const sizeClasses: Record<NonNullable<StatCardProps["size"]>, string> = {
  sm: "px-3 pt-2 pb-3",
  md: "px-4 pt-2 pb-4",
  lg: "px-5 pt-3 pb-5",
};

const valueSizeClasses: Record<
  NonNullable<StatCardProps["valueSize"]>,
  string
> = {
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

import React from "react";

const StatCard = ({
  title,
  value,
  icon: Icon,
  variant = "blue",
  size = "md",
  trend,
  valueSize = "2xl",
}: StatCardProps) => {
  const normalizedVariant =
    variant === ("emerald" as any)
      ? "green"
      : variant === ("amber" as any)
      ? "yellow"
      : variant;
  const variantClass = variantClasses[normalizedVariant] || variantClasses.blue;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 ${sizeClasses[size] || sizeClasses.md} w-full overflow-hidden`}
    >
      <div className="flex items-start justify-between min-w-0">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 truncate">
            {title}
          </h3>
          <p
            className={`${valueSizeClasses[valueSize] || valueSizeClasses["2xl"]} font-bold text-gray-900 dark:text-gray-100 break-words`}
          >
            {value}
          </p>
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend.isPositive
                  ? variantClass.trendPositive
                  : variantClass.trendNegative
              }`}
            >
              {trend.isPositive ? "▲" : "▼"} {trend.value}
            </p>
          )}
        </div>
        <div
          className={`rounded-lg p-3 ${variantClass.iconWrapper} mt-2 flex-shrink-0`}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : Icon ? (
            // @ts-ignore
            <Icon size={24} className={variantClass.textColor} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
