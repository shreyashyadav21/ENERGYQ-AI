import React, { useEffect, useState } from 'react';
import { useEnergyStore } from './stores/energyStore';
import { energyWs } from './services/websocket';
import { Header } from './components/hud/Header';
import { ConsumerPortal } from './components/consumer/ConsumerPortal';
import { BescomPortal } from './components/utility/BescomPortal';
import { EventDrawer } from './components/hud/EventDrawer';
import { VoiceAssistant } from './components/voice/VoiceAssistant';
import { LoginGateway } from './components/auth/LoginGateway';
import { ConsumerLogin } from './components/auth/ConsumerLogin';
import { OperatorLogin } from './components/auth/OperatorLogin';
import { RoleRouteGuard } from './components/auth/RoleRouteGuard';

function getCurrentRoute(): string {
  return window.location.pathname || '/';
}

export const App: React.FC = () => {
  const [route, setRoute] = useState<string>(getCurrentRoute());
  const isAuthenticated = useEnergyStore((s) => s.isAuthenticated);
  const authRole = useEnergyStore((s) => s.authRole);
  const storeCurrentPath = useEnergyStore((s) => s.currentPath);

  // Synchronize browser history with store navigation
  useEffect(() => {
    const onPop = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (storeCurrentPath && storeCurrentPath !== route) {
      setRoute(storeCurrentPath);
    }
  }, [storeCurrentPath]);

  // Connect WebSocket only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      energyWs.connect();
    }
    return () => {
      energyWs.disconnect();
    };
  }, [isAuthenticated]);

  // If already authenticated and landing on `/` or `/login/*`, redirect to portal
  useEffect(() => {
    if (isAuthenticated && authRole) {
      if (route === '/' || route.startsWith('/login')) {
        const target = authRole === 'consumer' ? '/consumer' : '/operator';
        window.history.pushState({}, '', target);
        setRoute(target);
      }
    }
  }, [isAuthenticated, authRole, route]);

  // ── Route Handling ────────────────────────────────────────────────────────

  // Dedicated Consumer Login
  if (route === '/login/consumer') {
    return <ConsumerLogin />;
  }

  // Dedicated BESCOM Operator Login
  if (route === '/login/operator') {
    return <OperatorLogin />;
  }

  // Landing Gateway (Default / Unauthenticated entry)
  if (route === '/' || (!isAuthenticated && !route.startsWith('/login'))) {
    return <LoginGateway />;
  }

  // Consumer Portal (Strictly guarded for 'consumer' role)
  if (route === '/consumer') {
    return (
      <RoleRouteGuard requiredRole="consumer">
        <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-[#060D1E] via-[#09152C] to-[#040814] text-slate-100 overflow-hidden">
          <Header />
          <main className="flex-1 w-full h-[calc(100vh-4rem)] relative overflow-hidden">
            <ConsumerPortal />
          </main>
          <EventDrawer />
          <VoiceAssistant />
        </div>
      </RoleRouteGuard>
    );
  }

  // BESCOM Operator Portal (Strictly guarded for 'operator' role)
  if (route === '/operator') {
    return (
      <RoleRouteGuard requiredRole="operator">
        <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-[#060D1E] via-[#09152C] to-[#040814] text-slate-100 overflow-hidden">
          <Header />
          <main className="flex-1 w-full h-[calc(100vh-4rem)] relative overflow-hidden">
            <BescomPortal />
          </main>
          <EventDrawer />
          <VoiceAssistant />
        </div>
      </RoleRouteGuard>
    );
  }

  // Fallback -> Landing Gateway
  return <LoginGateway />;
};

export default App;
