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
import { AppIcon } from './Icon';
import { DesktopMenu, DesktopMenuGroup } from './DesktopMenu';

export type DrawerTab = 'status' | 'world' | 'companions' | 'sanctuary' | 'saves' | 'meta' | null;

interface TopStatusBarProps {
  state: GameState;
  registry: ContentRegistry;
  prefs: UserPrefs;
  activeDrawer: DrawerTab;
  onOpenDrawer: (tab: DrawerTab) => void;
  onToggleTianji: () => void;
  onToggleTheme: () => void;
  onToggleInstantText?: () => void;
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
  onToggleInstantText,
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

  const toggleDrawer = (tab: Exclude<DrawerTab, null>) => {
    onOpenDrawer(activeDrawer === tab ? null : tab);
  };

  const desktopMenuGroups: DesktopMenuGroup[] = [
    {
      id: 'archives',
      label: '九州卷籍',
      icon: 'bookOpen',
      dot: hasSanctuaryHighlight,
      items: [
        {
          id: 'status',
          label: '行囊与命格',
          icon: 'user',
          active: activeDrawer === 'status',
          onSelect: () => toggleDrawer('status'),
        },
        {
          id: 'world',
          label: '九州世局',
          icon: 'globe',
          active: activeDrawer === 'world',
          onSelect: () => toggleDrawer('world'),
        },
        {
          id: 'companions',
          label: '故人志',
          icon: 'users',
          active: activeDrawer === 'companions',
          onSelect: () => toggleDrawer('companions'),
        },
        {
          id: 'sanctuary',
          label: '仙缘雅阁',
          icon: 'heart',
          active: activeDrawer === 'sanctuary',
          dot: hasSanctuaryHighlight,
          onSelect: () => toggleDrawer('sanctuary'),
        },
        {
          id: 'saves',
          label: '命盘刻痕',
          icon: 'archive',
          active: activeDrawer === 'saves',
          onSelect: () => toggleDrawer('saves'),
        },
        {
          id: 'meta',
          label: '万象志',
          icon: 'compass',
          active: activeDrawer === 'meta',
          onSelect: () => toggleDrawer('meta'),
        },
      ],
    },
    {
      id: 'settings',
      label: '阅览设置',
      icon: 'feather',
      items: [
        {
          id: 'tianji',
          label: '天机洞见',
          icon: prefs.tianjiInsight ? 'eye' : 'eyeOff',
          active: prefs.tianjiInsight,
          meta: prefs.tianjiInsight ? '开' : '关',
          onSelect: onToggleTianji,
        },
        ...(onToggleInstantText
          ? [
              {
                id: 'instant',
                label: '正文显现',
                icon: 'feather' as const,
                active: prefs.instantText,
                meta: prefs.instantText ? '瞬显' : '逐段',
                onSelect: onToggleInstantText,
              },
            ]
          : []),
        {
          id: 'theme',
          label: prefs.theme === 'parchment' ? '切换玄夜' : '切换日间',
          icon: prefs.theme === 'parchment' ? 'moon' : 'sun',
          active: prefs.theme === 'ink',
          onSelect: onToggleTheme,
        },
        {
          id: 'title',
          label: '返回封面',
          icon: 'home',
          onSelect: onGoTitle,
        },
      ],
    },
  ];

  return (
    <>
      <header
        ref={barRef}
        className={`top-bar ${isStaticBar ? 'top-bar-static' : ''}`}
      >
        <div className="top-bar-status">
          <span className="status-act-pill">{ACT_META[state.act].shortLabel}</span>
          <span className="status-pill-strong">
            {formatCalendarDate(state.year, state.seasonIndex)}
          </span>
          <span className={lifespanLow ? 'status-lifespan-warn' : undefined}>
            {lifespanLow ? (
              <>
                {age}/{state.lifespanYears}岁·临限
              </>
            ) : (
              <>
                {age}岁 <span className="status-soft">寿{state.lifespanYears}</span>
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
            className={`nav-btn desktop-only-control ${activeDrawer === 'status' ? 'active' : ''}`}
            onClick={() => toggleDrawer('status')}
          >
            <AppIcon name="user" />
            <span>命格</span>
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'world'}
            className={`nav-btn desktop-only-control ${activeDrawer === 'world' ? 'active' : ''}`}
            onClick={() => toggleDrawer('world')}
          >
            <AppIcon name="globe" />
            <span>世局</span>
          </button>
          <button
            type="button"
            aria-expanded={activeDrawer === 'sanctuary'}
            className={`nav-btn desktop-only-control ${activeDrawer === 'sanctuary' ? 'active' : ''}`}
            onClick={() => toggleDrawer('sanctuary')}
          >
            <AppIcon name="heart" />
            <span>仙缘</span>
            {hasSanctuaryHighlight && (
              <span className="nav-dot" aria-label="有未启仙缘契机" />
            )}
          </button>

          <div className="desktop-only-control">
            <DesktopMenu
              groups={desktopMenuGroups}
              triggerLabel="卷册"
              triggerDot={hasSanctuaryHighlight && activeDrawer !== 'sanctuary'}
            />
          </div>

          <button
            type="button"
            aria-pressed={prefs.tianjiInsight}
            className={`nav-btn mobile-util-only ${prefs.tianjiInsight ? 'active' : ''}`}
            onClick={onToggleTianji}
          >
            <AppIcon name={prefs.tianjiInsight ? 'eye' : 'eyeOff'} />
            <span>天机:{prefs.tianjiInsight ? '开' : '关'}</span>
          </button>
          <button
            type="button"
            aria-pressed={prefs.theme === 'ink'}
            className="nav-btn mobile-util-only"
            onClick={onToggleTheme}
          >
            <AppIcon name={prefs.theme === 'parchment' ? 'moon' : 'sun'} />
            <span>{prefs.theme === 'parchment' ? '玄夜' : '日间'}</span>
          </button>
          <button
            type="button"
            className="nav-btn mobile-util-only"
            onClick={onGoTitle}
          >
            <AppIcon name="home" />
            <span>封面</span>
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="快捷卷册">
        <button
          type="button"
          aria-expanded={activeDrawer === 'status'}
          className={`mobile-tab-btn ${activeDrawer === 'status' ? 'active' : ''}`}
          onClick={() => toggleDrawer('status')}
        >
          <AppIcon name="user" />
          <span>命格</span>
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'world'}
          className={`mobile-tab-btn ${activeDrawer === 'world' ? 'active' : ''}`}
          onClick={() => toggleDrawer('world')}
        >
          <AppIcon name="globe" />
          <span>世局</span>
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'companions'}
          className={`mobile-tab-btn ${activeDrawer === 'companions' ? 'active' : ''}`}
          onClick={() => toggleDrawer('companions')}
        >
          <AppIcon name="users" />
          <span>故人</span>
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'sanctuary'}
          className={`mobile-tab-btn ${activeDrawer === 'sanctuary' ? 'active' : ''}`}
          onClick={() => toggleDrawer('sanctuary')}
        >
          <AppIcon name="heart" />
          <span>仙缘</span>
          {hasSanctuaryHighlight && (
            <span className="nav-dot mobile-tab-dot" aria-label="有未启仙缘契机" />
          )}
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'saves'}
          className={`mobile-tab-btn ${activeDrawer === 'saves' ? 'active' : ''}`}
          onClick={() => toggleDrawer('saves')}
        >
          <AppIcon name="archive" />
          <span>命盘</span>
        </button>
        <button
          type="button"
          aria-expanded={activeDrawer === 'meta'}
          aria-label="万象志"
          className={`mobile-tab-btn ${activeDrawer === 'meta' ? 'active' : ''}`}
          onClick={() => toggleDrawer('meta')}
        >
          <AppIcon name="bookOpen" />
          <span>万象</span>
        </button>
      </nav>
    </>
  );
};
