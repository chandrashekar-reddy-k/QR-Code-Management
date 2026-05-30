import { LucideIcon } from 'lucide-react';
import { Button } from '..';

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary';
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: PageHeaderAction;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
  onBack?: () => void;
}

const PageHeader = ({
  title,
  description,
  action,
  breadcrumbs,
  showBackButton = false,
  onBack,
}: PageHeaderProps) => {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-2">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="text-xs text-gray-500 flex flex-wrap gap-1 mb-3">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-1">
                {index > 0 && <span className="mx-1">&gt;</span>}
                {crumb.path ? (
                  <a href={crumb.path} className="hover:text-green-600">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="font-medium text-gray-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {showBackButton && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-xs mr-1"
              >
                ←
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{title}</h1>
              {description && (
                <p className="text-gray-600 text-sm mt-1 truncate">{description}</p>
              )}
            </div>
          </div>

          {action && (
            <div className="flex-shrink-0">
              <Button
                type="button"
                onClick={action.onClick}
                variant={action.variant === 'secondary' ? 'secondary' : 'primary'}
                size="sm"
                className="flex items-center gap-1.5 w-full sm:w-auto"
              >
                {action.icon && <action.icon size={14} />}
                <span className="whitespace-nowrap">{action.label}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;


