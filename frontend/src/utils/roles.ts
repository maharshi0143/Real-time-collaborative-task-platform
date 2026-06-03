export const isAdmin = (role?: string) => role === 'admin';
export const isManager = (role?: string) => role === 'admin' || role === 'manager';
export const isMember = (role?: string) => role === 'admin' || role === 'manager' || role === 'member';
export const canManage = (role?: string) => role === 'admin' || role === 'manager';