import React from 'react';
import { useQR } from '../context/QRContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts } = useQR();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'error'
            ? AlertCircle
            : toast.type === 'warning'
            ? AlertTriangle
            : toast.type === 'info'
            ? Info
            : CheckCircle2;

        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon size={18} />
            <div>{toast.message}</div>
          </div>
        );
      })}
    </div>
  );
};
