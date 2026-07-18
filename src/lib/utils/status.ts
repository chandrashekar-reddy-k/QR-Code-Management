/**
 * Get status badge CSS classes based on status value
 */
export const getStatusBadgeClass = (status: string | undefined | null): string => {
  if (!status) return 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-700';
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
    
    case 'confirmed':
    case 'ready':
    case 'active':
    case 'approved':
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
    
    case 'processing':
    case 'shipped':
      return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
    
    case 'delivered':
    case 'picked':
    case 'in_stock':
    case 'in stock':
      return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    
    case 'low_stock':
    case 'low stock':
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
    
    case 'cancelled':
    case 'rejected':
    case 'out_of_stock':
    case 'out of stock':
    case 'inactive':
      return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
    
    default:
      return 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-700';
  }
};

/**
 * Get formatted status label
 */
export const getStatusLabel = (status: string | undefined | null): string => {
  if (!status) return '';
  const statusLower = status.toLowerCase();
  if (statusLower === 'in_stock') return 'In Stock';
  if (statusLower === 'low_stock') return 'Low Stock';
  if (statusLower === 'out_of_stock') return 'Out of Stock';
  return status;
};

