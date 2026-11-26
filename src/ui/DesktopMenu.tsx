import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppIcon, IconName } from './Icon';

export interface DesktopSubMenuItem {
  id: string;
  label: string;
  icon: IconName;
  active?: boolean;
  meta?: string;
  dot?: boolean;
  onSelect: () => void;
}

export interface DesktopMenuGroup {
  id: string;
  label: string;
  icon: IconName;
  dot?: boolean;
  items: DesktopSubMenuItem[];
}

interface DesktopMenuProps {
  groups: DesktopMenuGroup[];
  triggerLabel?: string;
  triggerDot?: boolean;
}

interface Point {
  x: number;
  y: number;
}

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;
const TRIANGLE_HOLD_MS = 220;
const TRIANGLE_PADDING_PX = 8;

function crossSign(p1: Point, p2: Point, p3: Point): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function isPointInTriangle(pt: Point, v1: Point, v2: Point, v3: Point): boolean {
  const d1 = crossSign(pt, v1, v2);
  const d2 = crossSign(pt, v2, v3);
  const d3 = crossSign(pt, v3, v1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * 桌面端多级菜单：完整实现开启延时、关闭延时与几何安全三角区。
 * 当鼠标从父菜单项移向已展开的子菜单时，以鼠标起点与子菜单近侧上下端点构成安全三角区，
 * 鼠标位于三角区内时维持当前子菜单打开，暂缓切换至途经的其他父菜单项。
 */
export const DesktopMenu: React.FC<DesktopMenuProps> = ({
  groups,
  triggerLabel = '卷册',
  triggerDot = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const parentListRef = useRef<HTMLDivElement | null>(null);
  const submenuRef = useRef<HTMLDivElement | null>(null);

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const switchTimerRef = useRef<number | null>(null);

  const cursorHistoryRef = useRef<Point[]>([]);
  const lastLeavePointRef = useRef<Point | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
  }, []);

  const closeAll = useCallback(() => {
    clearTimers();
    setMenuOpen(false);
    setActiveGroupId(null);
    cursorHistoryRef.current = [];
    lastLeavePointRef.current = null;
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAll();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeAll]);

  const scheduleOpenMenu = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (menuOpen) return;
    if (openTimerRef.current !== null) return;
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setMenuOpen(true);
      setActiveGroupId((prev) => prev ?? groups[0]?.id ?? null);
    }, OPEN_DELAY_MS);
  };

  const scheduleCloseMenu = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setMenuOpen(false);
      setActiveGroupId(null);
      cursorHistoryRef.current = [];
      lastLeavePointRef.current = null;
    }, CLOSE_DELAY_MS);
  };

  const isMovingIntoSafeTriangle = (current: Point): boolean => {
    const subEl = submenuRef.current;
    const parentEl = parentListRef.current;
    if (!subEl || !parentEl || !activeGroupId) return false;

    const history = cursorHistoryRef.current;
    const anchor =
      lastLeavePointRef.current ??
      (history.length >= 2 ? history[0] : history[history.length - 1]);
    if (!anchor) return false;

    const subRect = subEl.getBoundingClientRect();
    const parentRect = parentEl.getBoundingClientRect();

    // 菜单位于页面右侧时子菜单向左展开，取子菜单右边缘上下端点；否则取左边缘上下端点
    const opensLeft = subRect.right <= parentRect.left + 8;
    const edgeX = opensLeft ? subRect.right : subRect.left;
    const topVertex: Point = { x: edgeX, y: subRect.top - TRIANGLE_PADDING_PX };
    const bottomVertex: Point = { x: edgeX, y: subRect.bottom + TRIANGLE_PADDING_PX };

    const movingTowardSubmenu = opensLeft
      ? current.x <= anchor.x
      : current.x >= anchor.x;

    if (!movingTowardSubmenu) return false;
    return isPointInTriangle(current, anchor, topVertex, bottomVertex);
  };

  const handleMenuMouseMove = (e: React.MouseEvent) => {
    const pt: Point = { x: e.clientX, y: e.clientY };
    const history = cursorHistoryRef.current;
    history.push(pt);
    if (history.length > 4) {
      history.shift();
    }
  };

  const handleParentEnter = (groupId: string, e: React.MouseEvent) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (activeGroupId === groupId) {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      return;
    }

    const current: Point = { x: e.clientX, y: e.clientY };
    const inSafeTriangle = isMovingIntoSafeTriangle(current);
    const delay = inSafeTriangle ? TRIANGLE_HOLD_MS : OPEN_DELAY_MS;

    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
    }
    switchTimerRef.current = window.setTimeout(() => {
      switchTimerRef.current = null;
      setActiveGroupId(groupId);
      lastLeavePointRef.current = null;
    }, delay);
  };

  const handleParentLeave = (e: React.MouseEvent) => {
    lastLeavePointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleSubmenuEnter = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <div
      ref={rootRef}
      className="desktop-menu-root"
      onMouseEnter={scheduleOpenMenu}
      onMouseLeave={scheduleCloseMenu}
      onMouseMove={handleMenuMouseMove}
    >
      <button
        type="button"
        className={`nav-btn desktop-menu-trigger ${menuOpen ? 'active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => {
          clearTimers();
          setMenuOpen((open) => {
            const next = !open;
            setActiveGroupId(next ? groups[0]?.id ?? null : null);
            return next;
          });
        }}
      >
        <AppIcon name="menu" />
        <span>{triggerLabel}</span>
        {triggerDot && <span className="nav-dot" aria-label="有未启仙缘契机" />}
      </button>

      {menuOpen && (
        <div className="desktop-menu-popover" role="menu">
          {activeGroup && (
            <div
              ref={submenuRef}
              className="desktop-submenu-panel"
              role="menu"
              aria-label={activeGroup.label}
              onMouseEnter={handleSubmenuEnter}
            >
              {activeGroup.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`desktop-menu-item ${item.active ? 'active' : ''}`}
                  onClick={() => {
                    item.onSelect();
                    closeAll();
                  }}
                >
                  <AppIcon name={item.icon} />
                  <span className="desktop-menu-item-label">{item.label}</span>
                  {item.dot && <span className="nav-dot" aria-label="有未启仙缘契机" />}
                  {item.meta && <span className="desktop-menu-item-meta">{item.meta}</span>}
                </button>
              ))}
            </div>
          )}

          <div ref={parentListRef} className="desktop-parent-panel">
            {groups.map((group) => {
              const isActive = activeGroupId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={isActive}
                  className={`desktop-menu-item desktop-parent-item ${isActive ? 'active' : ''}`}
                  onMouseEnter={(e) => handleParentEnter(group.id, e)}
                  onMouseLeave={handleParentLeave}
                  onFocus={() => setActiveGroupId(group.id)}
                  onClick={() => setActiveGroupId(group.id)}
                >
                  <AppIcon name="chevronLeft" className="desktop-submenu-arrow" />
                  <AppIcon name={group.icon} />
                  <span className="desktop-menu-item-label">{group.label}</span>
                  {group.dot && <span className="nav-dot" aria-label="有未启仙缘契机" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
