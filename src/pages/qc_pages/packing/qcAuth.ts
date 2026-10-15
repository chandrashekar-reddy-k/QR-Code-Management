export interface QCUser {
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

export const getQCUser = (): QCUser => {
  try {
    const raw = sessionStorage.getItem('staffUser') || localStorage.getItem('partnerUser') || localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || parsed.userId || 'qc-1',
        name: parsed.name || parsed.username || 'QC Checker',
        email: parsed.email || 'qcchecker@villagkart.com',
        role: typeof parsed.role === 'string' ? parsed.role : parsed.role?.name || 'QC_INSPECTOR',
        employeeId: parsed.employeeId || parsed.id?.substring(0, 8).toUpperCase() || 'EMP-QC701',
        phone: parsed.phone || '+91 98765 43210',
        department: parsed.department || 'Quality Assurance & Control',
        shift: parsed.shift || 'Morning',
        warehouse: parsed.warehouse || { id: 'wh-1', name: 'Hyderabad Central Hub' },
        permissions: parsed.permissions || ['READ_DASHBOARD', 'EXECUTE_QC', 'QUALITY_CHECK'],
      };
    }
  } catch (e) {
    console.error('Error reading QC user:', e);
  }
  return {
    id: 'qc-1',
    name: 'QC Checker',
    email: 'qcchecker@villagkart.com',
    role: 'QC_INSPECTOR',
    employeeId: 'EMP-QC701',
    phone: '+91 98765 43210',
    department: 'Quality Assurance & Control',
    shift: 'Morning',
    warehouse: { id: 'wh-1', name: 'Hyderabad Central Hub' },
    permissions: ['READ_DASHBOARD', 'EXECUTE_QC', 'QUALITY_CHECK'],
  };
};

export const qcLogout = () => {
  sessionStorage.removeItem('staffToken');
  sessionStorage.removeItem('staffUser');
  sessionStorage.removeItem('portalMode');
  localStorage.removeItem('partnerToken');
  localStorage.removeItem('partnerUser');
  localStorage.removeItem('portalMode');
  localStorage.removeItem('token');
};
