import React from 'react';
import { useEnergyStore } from '../../stores/energyStore';
import { AuthRole } from '../../types/energy';
import { LoginGateway } from './LoginGateway';
import { AlertTriangle, ArrowRight, ShieldAlert, LogOut } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: AuthRole;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  const isAuthenticated = useEnergyStore((s) => s.isAuthenticated);
  const user = useEnergyStore((s) => s.user);
  const logout = useEnergyStore((s) => s.logout);
  const loginAsDemo = useEnergyStore((s) => s.loginAsDemo);

  if (!isAuthenticated || !user) {
    return <LoginGateway />;
  }

  // Check role requirement
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#060B19] text-white p-6">
        <div className="max-w-md w-full backdrop-blur-xl bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Restricted Portal Access
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Your current session is authenticated as{' '}
            <span className="font-bold text-emerald-400 uppercase">{user.role}</span> ({user.name}).
            This portal requires <span className="font-bold text-cyan-400 uppercase">{requiredRole}</span> permissions.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={() => loginAsDemo(requiredRole)}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Switch to {requiredRole === 'operator' ? 'BESCOM Operator' : 'Consumer'} Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={logout}
              className="w-full py-2 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out to Gateway</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
