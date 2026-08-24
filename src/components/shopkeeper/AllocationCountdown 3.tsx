import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface AllocationCountdownProps {
  startedAt: string;
  timeoutMinutes: number;
}

export function AllocationCountdown({ startedAt, timeoutMinutes }: AllocationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  useEffect(() => {
    if (!startedAt) return;
    
    const calculateTimeLeft = () => {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const timeoutMs = (timeoutMinutes || 5) * 60 * 1000;
      
      const remaining = Math.max(0, start + timeoutMs - now);
      return Math.floor(remaining / 1000); // seconds
    };

    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startedAt, timeoutMinutes]);

  if (!startedAt) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const isUrgent = timeLeft <= 60;
  
  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-red-100">
        <Clock size={10} color="#D32F2F" />
        <span style={{ color: "#D32F2F", fontWeight: 700, fontSize: "11px" }}>
          Reallocating...
        </span>
      </div>
    );
  }

  return null;
}
