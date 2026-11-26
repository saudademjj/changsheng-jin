import React from 'react';
import { MetaArchive } from '../engine/types';
import { UserPrefs } from '../engine/storage';
import { AppIcon } from './Icon';

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
        >
          <AppIcon name="feather" />
          <span>{prefs.instantText ? '瞬显' : '逐段'}</span>
        </button>
        <button
          type="button"
          className="nav-btn"
          aria-pressed={prefs.theme === 'ink'}
          onClick={onToggleTheme}
        >
          <AppIcon name={prefs.theme === 'parchment' ? 'moon' : 'sun'} />
          <span>{prefs.theme === 'parchment' ? '玄夜' : '日间'}</span>
        </button>
      </div>

      <h1 className="title-heading">长生烬</h1>
      <p className="title-sub">
        <span>长明三千年</span>
        <span>天门无归人</span>
      </p>

      <div className="title-menu">
        {hasActiveRun && (
          <button type="button" className="primary-btn" onClick={onContinue}>
            <span>{activeRunEnded ? '重温终局' : '续写前尘'}</span>
            <AppIcon name="arrowRight" />
          </button>
        )}
        <button
          type="button"
          className={hasActiveRun ? 'ghost-btn' : 'primary-btn'}
          onClick={onStartNew}
        >
          <span>{hasActiveRun ? '重开一世' : '踏入仙途'}</span>
          {!hasActiveRun && <AppIcon name="arrowRight" />}
        </button>
        <button type="button" className="ghost-btn" onClick={onOpenSaves}>
          <AppIcon name="archive" />
          <span>读取命盘</span>
        </button>
        <button type="button" className="ghost-btn" onClick={onOpenMeta}>
          <AppIcon name="bookOpen" />
          <span>翻阅万象志</span>
        </button>
      </div>

      <div className="title-meta-foot">
        <span>轮回 {meta.totalRuns} 世</span>
        <span>
          天机 {meta.unlockedTruthClues.length}/{totalTruthClues}
        </span>
        <span>
          终局 {meta.unlockedEndings.length}/{totalEndings}
        </span>
      </div>
    </main>
  );
};
