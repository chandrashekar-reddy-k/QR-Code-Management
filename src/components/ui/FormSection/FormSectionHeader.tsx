import { LucideIcon } from 'lucide-react';

export interface FormSectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const FormSectionHeader = ({
  title,
  description,
  icon: Icon,
}: FormSectionHeaderProps) => {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      {Icon && <Icon size={16} className="text-green-600" />}
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="text-xs text-gray-600 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
};

export default FormSectionHeader;

