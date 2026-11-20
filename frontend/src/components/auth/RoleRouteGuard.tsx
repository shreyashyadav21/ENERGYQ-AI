import React, { useEffect } from 'react';
import { useEnergyStore } from '../../stores/energyStore';
import { AuthRole } from '../../types/energy';

interface RoleRouteGuardProps {
  children: React.ReactNode;
  allowedRole?: AuthRole;
  requiredRole?: AuthRole;
}

export const RoleRouteGuard: React.FC<RoleRouteGuardProps> = ({ children, allowedRole, requiredRole }) => {
  const targetRole = allowedRole || requiredRole || 'consumer';
  const isAuthenticated = useEnergyStore((s) => s.isAuthenticated);
  const authRole = useEnergyStore((s) => s.authRole);
  const navigate = useEnergyStore((s) => s.navigate);

  useEffect(() => {
    if (!isAuthenticated || !authRole) {
      // Not logged in -> redirect to specific login page
      const targetLogin = targetRole === 'consumer' ? '/login/consumer' : '/login/operator';
      navigate(targetLogin);
      return;
    }

    if (authRole !== targetRole) {
      // Role mismatch -> strictly redirect to their own allowed portal
      const allowedPortal = authRole === 'consumer' ? '/consumer' : '/operator';
      navigate(allowedPortal);
    }
  }, [isAuthenticated, authRole, targetRole, navigate]);

  if (!isAuthenticated || !authRole || authRole !== targetRole) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#030712] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-cyan-400">Verifying Portal Clearance...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleRouteGuard;
