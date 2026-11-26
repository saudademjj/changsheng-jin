import React from 'react';
import { MetaArchive } from '../engine/types';
import { UserPrefs } from '../engine/storage';

interface TitleScreenProps {
  hasActiveRun: boolean;
  activeRunEnded?: boolean;
  meta: MetaArchive;
  totalTruthClues: number;
  totalEndings: number;
  prefs: UserPrefs;
  onContinue: () => void;
  onStartNew: () => void;
  onOpenSaves: () => void;
  onOpenMeta: () => void;
  onToggleTheme: () => void;
  onToggleInstantText: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasActiveRun,
  activeRunEnded = false,
  meta,
  totalTruthClues,
  totalEndings,
  prefs,
  onContinue,
  onStartNew,
  onOpenSaves,
  onOpenMeta,
  onToggleTheme,
  onToggleInstantText,
}) => {
  return (
    <main className="title-screen">
      <div className="title-top-controls">
        <button
          type="button"
          className={`nav-btn ${prefs.instantText ? 'active' : ''}`}
          aria-pressed={prefs.instantText}
          onClick={onToggleInstantText}
          title="切换正文逐段浮现或瞬息展开"
        >
          {prefs.instantText ? '正文：瞬显' : '正文：逐段'}
        </button>
        <button
          type="button"
          className="nav-btn"
          aria-pressed={prefs.theme === 'ink'}
          onClick={onToggleTheme}
        >
          {prefs.theme === 'parchment' ? '切换玄夜' : '切换宣纸'}
        </button>
      </div>

      <div className="title-seal">六卷长篇 · 仙途问道志</div>
      <h1 className="title-heading">长生烬</h1>
      <p className="title-sub">
        <span>长明三千年</span>
        <span>天门无归人</span>
      </p>

      <div className="title-epigraph">
        三千年前，最后一位真仙白日飞升，史称长明元年。
        <br />
        此后灵潮渐退，九州百代修士前赴后继叩问仙门，却再无半字音讯传回下界。
        <br />
        岁月如刀，红尘似火。这一世，你从十六岁启程。
      </div>

      <div className="title-menu">
        {hasActiveRun && (
          <button type="button" className="primary-btn" onClick={onContinue}>
            {activeRunEnded ? '重温终局' : '续写前尘'}
          </button>
        )}
        <button
          type="button"
          className={hasActiveRun ? 'ghost-btn' : 'primary-btn'}
          onClick={onStartNew}
        >
          {hasActiveRun ? '重开一世' : '踏入仙途'}
        </button>
        <button type="button" className="ghost-btn" onClick={onOpenSaves}>
          读取命盘
        </button>
        <button type="button" className="ghost-btn" onClick={onOpenMeta}>
          翻阅万象志
        </button>
      </div>

      <div className="title-meta-foot">
        <span>累计轮回 {meta.totalRuns} 世</span>
        <span>
          已窥天机 {meta.unlockedTruthClues.length}/{totalTruthClues}
        </span>
        <span>
          已历终局 {meta.unlockedEndings.length}/{totalEndings}
        </span>
      </div>
    </main>
  );
};
