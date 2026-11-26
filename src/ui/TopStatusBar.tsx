import React, { useEffect, useRef, useState } from 'react';
import { CompanionId, ContentRegistry, GameState } from '../engine/types';
import { formatCalendarDate, getAgeYears } from '../engine/time';
import { UserPrefs } from '../engine/storage';
import {
  canCommitBond,
  canTriggerMilestone1,
  isSanctuaryClosed,
} from '../engine/sanctuary';
import { ACT_META } from '../engine/worldview';

export type DrawerTab = 'status' | 'world' | 'companions' | 'sanctuary' | 'saves' | 'meta' | null;

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
  const hasSanctuaryHighlight =
    !isSanctuaryClosed(state) &&
    (
      ['shen_qingshuang', 'xie_wujiu', 'su_zhiwei', 'cang_ming'] as CompanionId[]
    ).some(
      (cid) =>
        canTriggerMilestone1(state, cid) ||
        canCommitBond(state, cid, 'dao_partner').ok ||
        canCommitBond(state, cid, 'sworn').ok
    );

  return (
    <>
      <header
        ref={barRef}
        className={`top-bar ${isStaticBar ? 'top-bar-static' : ''}`}
      >
        <div className="top-bar-status">
          <span
            className="status-act-pill"
            title={`${ACT_META[state.act].shortLabel} · ${ACT_META[state.act].title}（${ACT_META[state.act].region}）`}
          >
            {ACT_META[state.act].shortLabel}
          </span>
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
            className={`nav-btn nav-btn-drawer ${activeDrawer === 'status' ? 'active' : ''}`}
            onClick={() => onOpenDrawer(activeDrawer === 'status' ? null : 'status')}
          >
            命格
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'world'}
            className={`nav-btn nav-btn-drawer ${activeDrawer === 'world' ? 'active' : ''}`}
            onClick={() => onOpenDrawer(activeDrawer === 'world' ? null : 'world')}
            title="九州世局：六方势力态势、灵脉天象、六卷进程与疆域六境"
          >
            世局
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'companions'}
            className={`nav-btn nav-btn-drawer ${activeDrawer === 'companions' ? 'active' : ''}`}
            onClick={() =>
              onOpenDrawer(activeDrawer === 'companions' ? null : 'companions')
            }
          >
            故人
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'sanctuary'}
            className={`nav-btn nav-btn-drawer ${activeDrawer === 'sanctuary' ? 'active' : ''}`}
            onClick={() =>
              onOpenDrawer(activeDrawer === 'sanctuary' ? null : 'sanctuary')
            }
            title="仙缘雅阁：知交夜话、唯一道侣结契、赠礼雅叙与往来尺素"
          >
            仙缘
            {hasSanctuaryHighlight && (
              <span className="nav-dot" aria-label="有未启仙缘契机" />
            )}
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'saves'}
            className={`nav-btn nav-btn-drawer ${activeDrawer === 'saves' ? 'active' : ''}`}
            onClick={() => onOpenDrawer(activeDrawer === 'saves' ? null : 'saves')}
          >
            命盘
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'meta'}
            className={`nav-btn nav-btn-drawer ${activeDrawer === 'meta' ? 'active' : ''}`}
            onClick={() => onOpenDrawer(activeDrawer === 'meta' ? null : 'meta')}
          >
            万象志
          </button>
          <button
            type="button"
            aria-pressed={prefs.tianjiInsight}
            className={`nav-btn nav-btn-util ${prefs.tianjiInsight ? 'active' : ''}`}
            onClick={onToggleTianji}
            title="开启后可窥抉择背后机缘因果，关闭则尽享无扰问仙"
          >
            天机:{prefs.tianjiInsight ? '开' : '关'}
          </button>
          <button
            type="button"
            aria-pressed={prefs.theme === 'ink'}
            className="nav-btn nav-btn-util"
            onClick={onToggleTheme}
          >
            {prefs.theme === 'parchment' ? '玄夜' : '宣纸'}
          </button>
          <button type="button" className="nav-btn nav-btn-util" onClick={onGoTitle}>
            封面
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="快捷卷册">
        <button
          type="button"
          aria-expanded={activeDrawer === 'status'}
          className={`mobile-tab-btn ${activeDrawer === 'status' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'status' ? null : 'status')}
        >
          命格
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'world'}
          className={`mobile-tab-btn ${activeDrawer === 'world' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'world' ? null : 'world')}
        >
          世局
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'companions'}
          className={`mobile-tab-btn ${activeDrawer === 'companions' ? 'active' : ''}`}
          onClick={() =>
            onOpenDrawer(activeDrawer === 'companions' ? null : 'companions')
          }
        >
          故人
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'sanctuary'}
          className={`mobile-tab-btn ${activeDrawer === 'sanctuary' ? 'active' : ''}`}
          onClick={() =>
            onOpenDrawer(activeDrawer === 'sanctuary' ? null : 'sanctuary')
          }
        >
          <span>仙缘</span>
          {hasSanctuaryHighlight && (
            <span className="nav-dot" aria-label="有未启仙缘契机" />
          )}
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'saves'}
          className={`mobile-tab-btn ${activeDrawer === 'saves' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'saves' ? null : 'saves')}
        >
          命盘
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'meta'}
          aria-label="万象志"
          className={`mobile-tab-btn ${activeDrawer === 'meta' ? 'active' : ''}`}
          onClick={() => onOpenDrawer(activeDrawer === 'meta' ? null : 'meta')}
        >
          万象
        </button>
      </nav>
    </>
  );
};
