export interface OperatorUser {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  phone?: string;
  department?: string;
  shift?: string;
  warehouse?: { id: string; name: string };
  permissions?: string[];
}

export const getOperatorUser = (): OperatorUser => {
  try {
    const raw = sessionStorage.getItem('staffUser') || localStorage.getItem('partnerUser') || localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || parsed.userId || 'op-1',
        name: parsed.name || parsed.username || 'Packing Operator',
        email: parsed.email || 'operator@villagkart.com',
        role: typeof parsed.role === 'string' ? parsed.role : parsed.role?.name || 'OPERATOR',
        employeeId: parsed.employeeId || parsed.id?.substring(0, 8).toUpperCase() || 'EMP-89420',
        phone: parsed.phone || '+91 98765 43210',
        department: parsed.department || 'Packaging & Warehouse Logistics',
        shift: parsed.shift || 'Morning',
        warehouse: parsed.warehouse || { id: 'wh-1', name: 'Hyderabad Central Hub' },
        permissions: parsed.permissions || ['READ_DASHBOARD', 'EXECUTE_PACKING', 'LABEL_APPLICATION'],
      };
    }
  } catch (e) {
    console.error('Error reading operator user:', e);
  }
  return {
    id: 'op-1',
    name: 'Packing Operator',
    email: 'operator@villagkart.com',
    role: 'OPERATOR',
    employeeId: 'EMP-89420',
    phone: '+91 98765 43210',
    department: 'Packaging & Warehouse Logistics',
    shift: 'Morning',
    warehouse: { id: 'wh-1', name: 'Hyderabad Central Hub' },
    permissions: ['READ_DASHBOARD', 'EXECUTE_PACKING', 'LABEL_APPLICATION'],
  };
};

export const operatorLogout = () => {
  sessionStorage.removeItem('staffToken');
  sessionStorage.removeItem('staffUser');
  localStorage.removeItem('partnerToken');
  localStorage.removeItem('partnerUser');
  localStorage.removeItem('token');
};
