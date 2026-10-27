import React from 'react';
import { Home, Dumbbell, Calendar, TrendingUp, MoreHorizontal } from 'lucide-react';
import { TabRoute, useApp } from '../context/AppContext.tsx';
import { HapticsService } from '../services/haptics.ts';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t } = useApp();

  const handleSelectTab = (tab: TabRoute) => {
    HapticsService.light();
    setActiveTab(tab);
  };

  const navItems: Array<{ id: TabRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'library', label: t.library, icon: Dumbbell },
    { id: 'calendar', label: t.calendar, icon: Calendar },
    { id: 'progress', label: t.progress, icon: TrendingUp },
    { id: 'more', label: t.more, icon: MoreHorizontal }
  ];

  return (
    <nav 
      className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-app-surface border-t border-app"
      aria-label={t.mainNavigation}
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center h-14 min-w-[48px] rounded-lg transition-colors select-none ${
                isActive 
                  ? 'text-app-accent font-bold' 
                  : 'text-app-muted hover:text-app-primary'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
              <span className="text-[10px] uppercase tracking-wider font-bold leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
