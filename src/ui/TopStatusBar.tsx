import React, { useEffect, useRef, useState } from 'react';
import { ContentRegistry, GameState } from '../engine/types';
import { formatCalendarDate, getAgeYears } from '../engine/time';
import { UserPrefs } from '../engine/storage';

export type DrawerTab = 'status' | 'companions' | 'saves' | 'meta' | null;

interface TopStatusBarProps {
  state: GameState;
  registry: ContentRegistry;
  prefs: UserPrefs;
  activeDrawer: DrawerTab;
  onOpenDrawer: (tab: DrawerTab) => void;
  onToggleTianji: () => void;
  onToggleTheme: () => void;
  onGoTitle: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  state,
  registry,
  prefs,
  activeDrawer,
  onOpenDrawer,
  onToggleTianji,
  onToggleTheme,
  onGoTitle,
}) => {
  const barRef = useRef<HTMLElement | null>(null);
  const [isStaticBar, setIsStaticBar] = useState(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof window === 'undefined') return;

    const syncBarMetrics = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      const shouldUnstick =
        window.innerHeight > 0 && h / window.innerHeight > 0.22;
      setIsStaticBar(shouldUnstick);
      document.documentElement.style.setProperty(
        '--top-bar-height',
        shouldUnstick ? '0px' : `${h}px`
      );
    };

    syncBarMetrics();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncBarMetrics);
      observer.observe(el);
    }
    window.addEventListener('resize', syncBarMetrics);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncBarMetrics);
      document.documentElement.style.removeProperty('--top-bar-height');
    };
  }, []);

  const realm = registry.realms[state.realm];
  const age = getAgeYears(state.ageMonths);
  const lifespanLow = state.lifespanYears - age <= 15;

  return (
    <header
      ref={barRef}
      className={`top-bar ${isStaticBar ? 'top-bar-static' : ''}`}
    >
      <div className="top-bar-status">
        <span className="status-pill-strong">
          {formatCalendarDate(state.year, state.seasonIndex)}
        </span>
        <span
          className={lifespanLow ? 'status-lifespan-warn' : undefined}
          title={
            lifespanLow
              ? '寿元将近大限，须尽早破境或备【九转延寿露】'
              : undefined
          }
        >
          {lifespanLow ? (
            <>
              {age}/{state.lifespanYears}岁·临限
            </>
          ) : (
            <>
              {age}岁{' '}
              <span style={{ color: 'var(--text-muted)' }}>
                寿{state.lifespanYears}
              </span>
            </>
          )}
        </span>
        <span>{realm?.shortName ?? state.realm}</span>
        <span className="status-stones">灵石 {state.spiritStones}</span>
      </div>

      <div className="top-bar-actions">
        <button
          type="button"
          aria-expanded={activeDrawer === 'status'}
          className={`nav-btn ${activeDrawer === 'status' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'status' ? null : 'status')}
        >
          命格
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'companions'}
          className={`nav-btn ${activeDrawer === 'companions' ? 'active' : ''}`}
          onClick={() =>
            onOpenDrawer(activeDrawer === 'companions' ? null : 'companions')
          }
        >
          故人
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'saves'}
          className={`nav-btn ${activeDrawer === 'saves' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'saves' ? null : 'saves')}
        >
          命盘
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'meta'}
          className={`nav-btn ${activeDrawer === 'meta' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'meta' ? null : 'meta')}
        >
          万象志
        </button>
        <button
          type="button"
          aria-pressed={prefs.tianjiInsight}
          className={`nav-btn ${prefs.tianjiInsight ? 'active' : ''}`}
          onClick={onToggleTianji}
          title="开启后在选项下提示偏向维度，关闭则保持纯文学沉浸"
        >
          天机:{prefs.tianjiInsight ? '开' : '关'}
        </button>
        <button
          type="button"
          aria-pressed={prefs.theme === 'ink'}
          className="nav-btn"
          onClick={onToggleTheme}
        >
          {prefs.theme === 'parchment' ? '玄夜' : '宣纸'}
        </button>
        <button type="button" className="nav-btn" onClick={onGoTitle}>
          封面
        </button>
      </div>
    </header>
  );
};
