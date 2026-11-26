import React, { useEffect, useRef } from 'react';
import { CompanionId, ContentRegistry, GameState } from '../engine/types';
import { getAgeYears } from '../engine/time';
import {
  isActiveDaoPartner,
  isCompanionDeceased,
  isCompanionHostile,
  isCompanionSealed,
  isDaoPartner,
} from '../engine/systems';
import { AppIcon } from './Icon';

interface EndingViewProps {
  state: GameState;
  registry: ContentRegistry;
  onRewindSaves: () => void;
  onStartNewRun: () => void;
  onOpenMeta: () => void;
  onGoTitle: () => void;
}

export function formatEndingBadge(subtitle: string, tier: string): string {
  return subtitle.includes(tier) ? subtitle : `${subtitle} · ${tier}`;
}

export const EndingView: React.FC<EndingViewProps> = ({
  state,
  registry,
  onRewindSaves,
  onStartNewRun,
  onOpenMeta,
  onGoTitle,
}) => {
  const ending = state.endingId ? registry.endings[state.endingId] : undefined;
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        titleRef.current?.focus({ preventScroll: true });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [state.endingId, state.runId]);

  if (!ending) return null;

  const paragraphs = ending.epilogue(state);
  const realmName = registry.realms[state.realm]?.shortName ?? state.realm;
  const ageYears = getAgeYears(state.ageMonths);
  const totalClues = Object.keys(registry.truthClues).length;
  const isDeceasedEnding =
    ending.tier === '陨落' || ending.id === 'ending_false_ascension';
  const closeCompanions = (Object.keys(state.companions) as CompanionId[])
    .filter((cid) => {
      const c = state.companions[cid];
      if (!c.met || isCompanionHostile(state, cid) || isCompanionSealed(state, cid)) {
        return false;
      }
      return (
        c.bondType === 'dao_partner' ||
        c.bondType === 'sworn' ||
        c.stance === 'bonded' ||
        c.stance === 'confidant' ||
        c.affection >= 30
      );
    })
    .map((cid) => {
      const baseName = registry.companions[cid].name;
      const deceased = isCompanionDeceased(state, cid);
      const partner = deceased
        ? isDaoPartner(state, cid)
        : isActiveDaoPartner(state, cid);
      if (deceased && partner) return `${baseName}（故去道侣）`;
      if (deceased) return `${baseName}（已辞世）`;
      if (partner) return `${baseName}（道侣）`;
      if (state.companions[cid].bondType === 'sworn') return `${baseName}（挚交）`;
      return baseName;
    });

  return (
    <main className="ending-container">
      <h1 className="ending-title" ref={titleRef} tabIndex={-1}>
        {ending.title}
      </h1>

      <blockquote className="ending-poem">{ending.poem}</blockquote>

      <div className="prose-flow" style={{ cursor: 'default' }}>
        {paragraphs.map((p, idx) => (
          <p className="prose-paragraph" key={idx}>
            {p}
          </p>
        ))}
      </div>

      <section className="ending-summary-grid" aria-label="此世命盘印记">
        <div className="ending-summary-cell">
          <div className="ending-summary-label">
            {isDeceasedEnding ? '享寿 · 终境' : '时年 · 终境'}
          </div>
          <div className="ending-summary-val">
            {ageYears}岁 · {realmName}
          </div>
        </div>
        <div className="ending-summary-cell">
          <div className="ending-summary-label">此世天机</div>
          <div className="ending-summary-val">
            {state.truthClues.length} / {totalClues}
          </div>
        </div>
        <div className="ending-summary-cell">
          <div className="ending-summary-label">随身奇物</div>
          <div className="ending-summary-val">{state.relics.length} 件</div>
        </div>
        <div className="ending-summary-cell">
          <div className="ending-summary-label">至交故人</div>
          <div className="ending-summary-val">
            {closeCompanions.length > 0 ? closeCompanions.join('、') : '独行求道'}
          </div>
        </div>
      </section>

      <div className="ending-actions">
        <button type="button" className="primary-btn" onClick={onRewindSaves}>
          <AppIcon name="archive" />
          <span>回溯命盘</span>
        </button>
        <button type="button" className="ghost-btn" onClick={onStartNewRun}>
          <AppIcon name="arrowRight" />
          <span>重开新世</span>
        </button>
        <button type="button" className="ghost-btn" onClick={onOpenMeta}>
          <AppIcon name="bookOpen" />
          <span>查阅万象志</span>
        </button>
        <button type="button" className="ghost-btn" onClick={onGoTitle}>
          <AppIcon name="home" />
          <span>返回封面</span>
        </button>
      </div>
    </main>
  );
};
