import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  textColor: string;
}

const StatCard = ({ title, value, icon: Icon, bgColor, iconColor, textColor }: StatCardProps) => {
  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-lg shadow-md border p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase mb-1">{title}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${iconColor}`}>
          <Icon size={20} className={textColor} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;

