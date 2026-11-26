import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChoiceCategory,
  ContentRegistry,
  GameState,
  ResolvedChoice,
  SceneDefinition,
} from '../engine/types';
import { resolveParagraphs, resolveTextValue } from '../engine/template';
import { getResolvedChoices } from '../engine/scheduler';
import {
  ACT_ORDER,
  getActProgressSnapshot,
  getActTransitionEcho,
  getWorldClimateSnapshot,
} from '../engine/worldview';
import { MarketPanel } from './MarketPanel';
import { AppIcon } from './Icon';

const CATEGORY_ORDER: Array<{ key: ChoiceCategory; title: string }> = [
  { key: 'story', title: '世局大势' },
  { key: 'plan', title: '日常谋划' },
  { key: 'market', title: '坊市商机' },
  { key: 'companion', title: '寻访故人' },
  { key: 'breakthrough', title: '破境关口' },
];

interface ReaderViewProps {
  state: GameState;
  scene: SceneDefinition;
  registry: ContentRegistry;
  tianjiInsight: boolean;
  instantText: boolean;
  drawerOpen: boolean;
  loadNonce: number;
  externalRunChanged?: boolean;
  onSyncExternalRun?: () => void;
  onSelectChoice: (choiceId: string) => void;
  onCommitTransition: () => void;
  onUpdateState: (next: GameState) => void;
  onOpenWorld?: () => void;
}

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  state,
  scene,
  registry,
  tianjiInsight,
  instantText,
  drawerOpen,
  loadNonce,
  externalRunChanged = false,
  onSyncExternalRun,
  onSelectChoice,
  onCommitTransition,
  onUpdateState,
  onOpenWorld,
}) => {
  const pending = state.pendingTransition;
  const sceneTitleRef = useRef<HTMLHeadingElement | null>(null);
  const outcomeAnchorRef = useRef<HTMLDivElement | null>(null);
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);
  const actEcho = useMemo(
    () => (pending ? null : getActTransitionEcho(state, scene.id, registry)),
    [pending, state, scene.id, registry]
  );
  const hubProgress = useMemo(
    () => (scene.isHub ? getActProgressSnapshot(state, tianjiInsight) : null),
    [scene.isHub, state, tianjiInsight]
  );
  const worldClimate = useMemo(
    () => (scene.isHub ? getWorldClimateSnapshot(state) : null),
    [scene.isHub, state]
  );

  const paragraphs = useMemo(
    () =>
      pending
        ? pending.originParagraphs
        : resolveParagraphs(scene.paragraphs, state),
    [pending, scene, state]
  );
  const title = resolveTextValue(scene.title, state) ?? scene.title;
  const location = resolveTextValue(scene.location, state);
  const choices = useMemo(
    () => getResolvedChoices(state, scene, registry),
    [state, scene, registry]
  );

  const isGroupedHub = scene.isHub && choices.some((c) => c.category);
  const orderedChoices = useMemo(() => {
    if (!isGroupedHub) return choices;
    const grouped: ResolvedChoice[] = [];
    for (const group of CATEGORY_ORDER) {
      for (const c of choices) {
        if (c.category === group.key) grouped.push(c);
      }
    }
    for (const c of choices) {
      if (!c.category) grouped.push(c);
    }
    return grouped;
  }, [choices, isGroupedHub]);

  const sceneKey = `${state.runId}_${loadNonce}_${scene.id}_${state.actBeat}_${state.completedScenes.length}`;
  const instantTextRef = useRef(instantText);
  instantTextRef.current = instantText;
  const [visibleCount, setVisibleCount] = useState<number>(
    instantText || pending ? paragraphs.length : 1
  );
  const [outcomeVisibleCount, setOutcomeVisibleCount] = useState<number>(
    instantText ? (pending?.paragraphs.length ?? 0) : 1
  );

  useEffect(() => {
    if (pending) {
      setVisibleCount(paragraphs.length);
      return;
    }
    setVisibleCount(instantTextRef.current ? paragraphs.length : 1);
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
    if (!drawerOpen) {
      const focusTimer = window.setTimeout(() => {
        const active = document.activeElement;
        if (!active || active === document.body) {
          sceneTitleRef.current?.focus({ preventScroll: true });
        }
      }, 60);
      return () => window.clearTimeout(focusTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey]);

  useEffect(() => {
    if (pending || instantText || visibleCount >= paragraphs.length) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(paragraphs.length, c + 1));
    }, 380);
    return () => window.clearTimeout(timer);
  }, [pending, visibleCount, paragraphs.length, instantText]);

  const pendingKey = pending
    ? `${scene.id}_${pending.chosenLabel}_${pending.nextSceneId}`
    : '';

  useEffect(() => {
    if (!pending) {
      setOutcomeVisibleCount(0);
      return;
    }
    setVisibleCount(paragraphs.length);
    setOutcomeVisibleCount(instantTextRef.current ? pending.paragraphs.length : 1);
    const scrollTimer = window.setTimeout(() => {
      outcomeAnchorRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 60);
    return () => window.clearTimeout(scrollTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  useEffect(() => {
    if (!instantText) return;
    setVisibleCount(paragraphs.length);
    if (pending) {
      setOutcomeVisibleCount(pending.paragraphs.length);
    }
  }, [instantText, paragraphs.length, pending]);

  useEffect(() => {
    if (!pending || instantText || outcomeVisibleCount >= pending.paragraphs.length) {
      return;
    }
    const timer = window.setTimeout(() => {
      setOutcomeVisibleCount((c) => Math.min(pending.paragraphs.length, c + 1));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [pending, outcomeVisibleCount, instantText]);

  const sceneRevealed = visibleCount >= paragraphs.length;
  const outcomeRevealed = !pending || outcomeVisibleCount >= pending.paragraphs.length;

  useEffect(() => {
    if (!pending || drawerOpen) return;
    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof Element && active.closest('.top-bar')) return;
      if (outcomeRevealed && continueBtnRef.current) {
        continueBtnRef.current.focus({ preventScroll: true });
      } else if (outcomeAnchorRef.current && (!active || active === document.body)) {
        outcomeAnchorRef.current.focus({ preventScroll: true });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pending, pendingKey, outcomeRevealed, drawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (drawerOpen || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (
        (e.key === 'Enter' || e.key === ' ') &&
        target instanceof Element &&
        target.closest('button, a, select, [role="button"]')
      ) {
        return;
      }

      if (pending) {
        if (!outcomeRevealed && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          setOutcomeVisibleCount(pending.paragraphs.length);
          return;
        }
        if (outcomeRevealed && (e.key === 'Enter' || e.key === ' ' || e.key === '1')) {
          e.preventDefault();
          onCommitTransition();
        }
        return;
      }

      if (!sceneRevealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setVisibleCount(paragraphs.length);
        return;
      }

      if (sceneRevealed && e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        const targetChoice = orderedChoices[idx];
        if (targetChoice && !targetChoice.locked) {
          e.preventDefault();
          onSelectChoice(targetChoice.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    drawerOpen,
    pending,
    outcomeRevealed,
    sceneRevealed,
    paragraphs.length,
    orderedChoices,
    onSelectChoice,
    onCommitTransition,
  ]);

  return (
    <main className="reader-main">
      {externalRunChanged && onSyncExternalRun && (
        <div className="notice-strip sync-notice-strip" role="status" aria-live="polite">
          <span>另一标签页已更新此世命盘。</span>
          <button type="button" className="mini-btn" onClick={onSyncExternalRun}>
            同步最新命盘
          </button>
        </div>
      )}

      {!pending && state.recentNotices.length > 0 && (
        <div className="notice-strip" role="status" aria-live="polite">
          {state.recentNotices.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}

      <header className="scene-header">
        {location && (
          <div className="scene-meta-line">
            <span>{location}</span>
          </div>
        )}
        <h1 className="scene-title" ref={sceneTitleRef} tabIndex={-1}>
          {title}
        </h1>
      </header>

      {actEcho && (
        <aside className="act-echo-block" aria-label="前尘余波与本卷局势">
          <div className="act-echo-title">{actEcho.title}</div>
          <ul className="act-echo-list">
            {actEcho.bullets.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </aside>
      )}

      <div className="prose-flow-wrap">
        <article
          className={`prose-flow ${pending ? 'prose-settled' : ''}`}
          onClick={() => {
            if (!pending && !sceneRevealed) {
              setVisibleCount(paragraphs.length);
            }
          }}
        >
          {paragraphs.slice(0, visibleCount).map((p, idx) => (
            <p className="prose-paragraph" key={`${sceneKey}_${idx}`}>
              {p}
            </p>
          ))}
        </article>

        {!pending && !sceneRevealed && (
          <div className="prose-hint-skip intent-secondary">
            点击正文展开全文
          </div>
        )}
      </div>

      {!pending && sceneRevealed && scene.market && (
        <MarketPanel
          key={scene.id}
          config={scene.market}
          state={state}
          registry={registry}
          onUpdateState={onUpdateState}
        />
      )}

      {!pending && sceneRevealed && choices.length > 0 && (
        <section
          className={`choices-section ${scene.isHub ? 'hub-board' : ''}`}
          aria-label={scene.isHub ? '行迹谋划台' : '你的抉择'}
        >
          {scene.isHub && hubProgress && worldClimate && (
            <div className="hub-progress-strip" aria-label="本卷行迹脉络">
              <div className="hub-progress-top">
                <span className="hub-progress-title">
                  {hubProgress.actMeta.shortLabel} · {hubProgress.actMeta.title}
                </span>
                <div
                  className="act-stepper"
                  aria-label={`全六卷进程：当前第 ${hubProgress.actOrder} 卷`}
                >
                  {ACT_ORDER.map((aid, idx) => {
                    const ord = idx + 1;
                    const cls =
                      ord < hubProgress.actOrder
                        ? 'done'
                        : ord === hubProgress.actOrder
                        ? 'current'
                        : '';
                    return (
                      <span key={aid} className={`act-step-dot ${cls}`}>
                        {CN_NUM[idx]}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="hub-progress-meta">
                <div>
                  <strong>破境机缘 · {hubProgress.breakthroughGoalLabel}：</strong>
                  {hubProgress.breakthroughProgressText}
                </div>
                {hubProgress.hasMajorSlotLimit && (
                  <div>
                    <strong>本卷天时席位：</strong>
                    已深耕 {hubProgress.majorSlotsUsed} / {hubProgress.majorSlotsTotal} 席，余{' '}
                    {hubProgress.majorSlotsRemaining} 席
                  </div>
                )}
              </div>

              {hubProgress.majorArcs.length > 0 && (
                <div className="hub-arc-list">
                  {hubProgress.majorArcs.map((arc) => (
                    <span
                      key={arc.threadId}
                      className={`hub-arc-item ${arc.status}`}
                    >
                      {arc.status === 'completed' && <AppIcon name="check" />}
                      <span>{arc.label}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="hub-progress-foot">
                <span>九州灵脉：{worldClimate.veinLabel}</span>
                {onOpenWorld && (
                  <button
                    type="button"
                    className="mini-btn mini-btn-surface"
                    onClick={onOpenWorld}
                  >
                    <span>九州世局</span>
                    <AppIcon name="arrowRight" />
                  </button>
                )}
              </div>
            </div>
          )}

          {scene.isHub && choices.some((c) => c.category) ? (
            <>
              {choices.length > 0 && (
                <div className="choices-caption">
                  <span>行迹谋划</span>
                  <span className="desktop-hotkey-hint intent-secondary">
                    {choices.length === 1
                      ? '快捷键 1'
                      : `快捷键 1-${Math.min(9, choices.length)}`}
                  </span>
                </div>
              )}
              {(() => {
                let runningIdx = 0;
                const renderChoiceBtn = (choice: ResolvedChoice) => {
                  const idx = runningIdx++;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={`choice-item ${
                        choice.category === 'breakthrough'
                          ? 'choice-breakthrough'
                          : choice.category === 'story'
                          ? 'choice-story'
                          : ''
                      }`}
                      disabled={choice.locked}
                      onClick={() => onSelectChoice(choice.id)}
                    >
                      <span className="choice-index">
                        {CN_NUM[idx] ?? `${idx + 1}`}
                      </span>
                      <div className="choice-content">
                        <div className="choice-label">{choice.label}</div>
                        {choice.subtext && (
                          <div className="choice-subtext">{choice.subtext}</div>
                        )}
                        {choice.locked && choice.lockReason && (
                          <div className="choice-lock">
                            <AppIcon name="lock" />
                            <span>{choice.lockReason}</span>
                          </div>
                        )}
                        {tianjiInsight &&
                          choice.insightTags &&
                          choice.insightTags.length > 0 && (
                            <div className="choice-insight-line">
                              {choice.insightTags.join(' · ')}
                            </div>
                          )}
                      </div>
                    </button>
                  );
                };

                const uncategorized = choices.filter((c) => !c.category);

                return (
                  <>
                    {CATEGORY_ORDER.map((group) => {
                      const items = choices.filter((c) => c.category === group.key);
                      if (items.length === 0) return null;
                      const compactGrid =
                        group.key === 'plan' || group.key === 'companion';
                      return (
                        <div className="hub-group" key={group.key}>
                          <div className="hub-group-head">
                            <span className="hub-group-title">{group.title}</span>
                          </div>
                          <div
                            className={
                              compactGrid ? 'choice-grid-compact' : 'choice-list'
                            }
                          >
                            {items.map(renderChoiceBtn)}
                          </div>
                        </div>
                      );
                    })}
                    {uncategorized.length > 0 && (
                      <div className="hub-group">
                        <div className="choice-list">
                          {uncategorized.map(renderChoiceBtn)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <div className="choices-caption">
                <span>择路而行</span>
                {choices.length > 0 && (
                  <span className="desktop-hotkey-hint intent-secondary">
                    {choices.length === 1
                      ? '可按数字键 1 快速抉择'
                      : `可按数字键 1-${Math.min(9, choices.length)} 快速抉择`}
                  </span>
                )}
              </div>
              <div className="choice-list">
                {choices.map((choice, idx) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="choice-item"
                    disabled={choice.locked}
                    onClick={() => onSelectChoice(choice.id)}
                  >
                    <span className="choice-index">
                      {CN_NUM[idx] ?? `${idx + 1}`}
                    </span>
                    <div className="choice-content">
                      <div className="choice-label">{choice.label}</div>
                      {choice.subtext && (
                        <div className="choice-subtext">{choice.subtext}</div>
                      )}
                      {choice.locked && choice.lockReason && (
                        <div className="choice-lock">
                          <AppIcon name="lock" />
                          <span>{choice.lockReason}</span>
                        </div>
                      )}
                      {tianjiInsight &&
                        choice.insightTags &&
                        choice.insightTags.length > 0 && (
                          <div className="choice-insight-line">
                            {choice.insightTags.join(' · ')}
                          </div>
                        )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {pending && (
        <section
          ref={outcomeAnchorRef}
          tabIndex={-1}
          className="outcome-section"
          aria-label="抉择演绎"
          onClick={() => {
            if (!outcomeRevealed) {
              setOutcomeVisibleCount(pending.paragraphs.length);
            }
          }}
        >
          <div className="outcome-chosen-quote">
            <span className="outcome-chosen-text">「{pending.chosenLabel}」</span>
          </div>

          <div className="prose-flow outcome-prose">
            {pending.paragraphs.slice(0, outcomeVisibleCount).map((p, idx) => (
              <p className="prose-paragraph" key={`${pendingKey}_out_${idx}`}>
                {p}
              </p>
            ))}
          </div>

          {outcomeRevealed && (
            <>
              {pending.notices.length > 0 && (
                <div
                  className="notice-strip outcome-notices"
                  role="status"
                  aria-live="polite"
                >
                  {pending.notices.map((n, i) => (
                    <div key={i}>{n}</div>
                  ))}
                </div>
              )}

              <div className="outcome-continue-wrap">
                <button
                  ref={continueBtnRef}
                  type="button"
                  className="continue-chapter-btn"
                  onClick={onCommitTransition}
                >
                  <span>{pending.continueLabel}</span>
                  <AppIcon name="arrowRight" />
                </button>
                <span className="continue-hotkey desktop-hotkey-hint intent-secondary">
                  按 Enter 或空格翻页
                </span>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
};
