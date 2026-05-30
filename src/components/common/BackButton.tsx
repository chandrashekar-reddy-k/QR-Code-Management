import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  className?: string;
}

const BackButton = ({ to, onClick, className = '' }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className={`flex items-center gap-1.5 h-9 sm:h-10 w-auto justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 ${className}`}
    >
      <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
      <span className="text-xs sm:text-sm">Back</span>
    </Button>
  );
};

export default BackButton;

