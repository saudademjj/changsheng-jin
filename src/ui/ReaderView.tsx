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

const CATEGORY_ORDER: Array<{ key: ChoiceCategory; title: string; hint: string }> = [
  { key: 'story', title: '世局大势', hint: '正在展开的阶段事件与暗流，由你决定先后' },
  { key: 'plan', title: '日常谋划', hint: '自主分配光阴：潜修、营生、买讯或四方游历' },
  { key: 'market', title: '坊市商机', hint: '随世局起伏的行市货品与稀缺奇物' },
  { key: 'companion', title: '寻访故人', hint: '凭已有门路或交情主动拜访、赠礼、切磋' },
  { key: 'breakthrough', title: '破境关口', hint: '筹备齐备后，由你亲自拍板闭关破境' },
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
  const subtitle = resolveTextValue(scene.subtitle, state);
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

  // 仅当真正切换场景或读档重载（非在同页展开 pendingTransition）时才重置正文显现
  const sceneKey = `${state.runId}_${loadNonce}_${scene.id}_${state.actBeat}_${state.completedScenes.length}`;
  const instantTextRef = useRef(instantText);
  instantTextRef.current = instantText;
  const [visibleCount, setVisibleCount] = useState<number>(
    instantText || pending ? paragraphs.length : 1
  );
  const [outcomeVisibleCount, setOutcomeVisibleCount] = useState<number>(
    instantText ? (pending?.paragraphs.length ?? 0) : 1
  );

  // 场景变化时重置正文显现并滚回顶部（切回逐段模式不折叠重播当前已读正文）
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

  // 正文逐段显现
  useEffect(() => {
    if (pending || instantText || visibleCount >= paragraphs.length) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(paragraphs.length, c + 1));
    }, 380);
    return () => window.clearTimeout(timer);
  }, [pending, visibleCount, paragraphs.length, instantText]);

  // 进入同页抉择演绎态时，逐段显现演绎文字并柔滑滚动至演绎区
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

  // 仅当切换为「瞬显」时立即补展尚未显现完的段落，切回「逐段」绝不倒退当前页
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

  // 进入演绎态或演绎展开完毕时承接键盘焦点，避免选项区卸载导致焦点跌落 document.body
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
          <span>另一标签页已更新此世命盘，继续操作将覆盖其进度。</span>
          <button type="button" className="mini-btn" onClick={onSyncExternalRun}>
            同步最新命盘
          </button>
        </div>
      )}

      {!pending && state.recentNotices.length > 0 && (
        <div className="notice-strip" role="status" aria-live="polite">
          {state.recentNotices.map((n, i) => (
            <div key={i}>· {n}</div>
          ))}
        </div>
      )}

      <header className="scene-header">
        <div className="scene-meta-line">
          <span>{subtitle ?? '长生烬'}</span>
          <span>{location}</span>
        </div>
        <h1 className="scene-title" ref={sceneTitleRef} tabIndex={-1}>
          {title}
        </h1>
      </header>

      {actEcho && (
        <aside className="act-echo-card" aria-label="前尘余波与本卷局势">
          <div className="act-echo-banner">{actEcho.actBanner}</div>
          <div className="act-echo-title">{actEcho.title}</div>
          <ul className="act-echo-list">
            {actEcho.bullets.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </aside>
      )}

      <article
        className={`prose-flow ${pending ? 'prose-settled' : ''}`}
        onClick={() => {
          if (!pending && !sceneRevealed) {
            setVisibleCount(paragraphs.length);
          }
        }}
        title={!pending && !sceneRevealed ? '点击或按空格键立即展开全文' : undefined}
      >
        {paragraphs.slice(0, visibleCount).map((p, idx) => (
          <p className="prose-paragraph" key={`${sceneKey}_${idx}`}>
            {p}
          </p>
        ))}
      </article>

      {!pending && !sceneRevealed && (
        <div className="prose-hint-skip">
          点击正文<span className="desktop-hotkey-hint">或按空格键</span>，可瞬息展开全文
        </div>
      )}

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
            <div className="hub-progress-card" aria-label="本卷行迹脉络">
              <div className="hub-progress-top">
                <span className="hub-progress-title">
                  {hubProgress.actMeta.shortLabel} · {hubProgress.actMeta.title}（
                  {hubProgress.actMeta.region}）
                </span>
                <div className="act-stepper" aria-label={`全六卷进程：当前第 ${hubProgress.actOrder} 卷`}>
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
                <div className="hub-arc-chips">
                  {hubProgress.majorArcs.map((arc) => {
                    const prefix =
                      arc.status === 'completed'
                        ? '✓ '
                        : arc.status === 'in_progress'
                        ? '● '
                        : arc.status === 'missed'
                        ? '× '
                        : '○ ';
                    return (
                      <span
                        key={arc.threadId}
                        className={`hub-arc-chip ${arc.status}`}
                      >
                        {prefix}
                        {arc.label}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="hub-progress-foot">
                <span>九州灵脉：{worldClimate.veinLabel}</span>
                {onOpenWorld && (
                  <button type="button" className="mini-btn" onClick={onOpenWorld}>
                    查六方势力与九州世局 →
                  </button>
                )}
              </div>
            </div>
          )}

          {scene.isHub && choices.some((c) => c.category) ? (
            <>
              <div className="choices-caption">
                行迹谋划台 · 每一季去向由你定夺
                {choices.length > 0 && (
                  <span className="desktop-hotkey-hint">
                    {choices.length === 1
                      ? '（快捷键 1）'
                      : `（快捷键 1-${Math.min(9, choices.length)}）`}
                  </span>
                )}
              </div>
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
                            〔条件未成：{choice.lockReason}〕
                          </div>
                        )}
                        {tianjiInsight &&
                          choice.insightTags &&
                          choice.insightTags.length > 0 && (
                            <div className="choice-insight">
                              {choice.insightTags.map((tag) => (
                                <span className="insight-chip" key={tag}>
                                  {tag}
                                </span>
                              ))}
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
                            <span className="hub-group-hint">{group.hint}</span>
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
                择路而行
                {choices.length > 0 && (
                  <span className="desktop-hotkey-hint">
                    {choices.length === 1
                      ? '（可按数字键 1 快速抉择）'
                      : `（可按数字键 1-${Math.min(9, choices.length)} 快速抉择）`}
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
                          〔条件未成：{choice.lockReason}〕
                        </div>
                      )}
                      {tianjiInsight &&
                        choice.insightTags &&
                        choice.insightTags.length > 0 && (
                          <div className="choice-insight">
                            {choice.insightTags.map((tag) => (
                              <span className="insight-chip" key={tag}>
                                {tag}
                              </span>
                            ))}
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

      {/* ==================== 同页续写：抉择后的专属剧情演绎 ==================== */}
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
            <span className="outcome-chosen-tag">你择定了</span>
            <span className="outcome-chosen-text">「{pending.chosenLabel}」</span>
          </div>

          <div className="prose-flow outcome-prose">
            {pending.paragraphs.slice(0, outcomeVisibleCount).map((p, idx) => (
              <p className="prose-paragraph" key={`${pendingKey}_out_${idx}`}>
                {p}
              </p>
            ))}
          </div>

          {!outcomeRevealed && (
            <div className="prose-hint-skip">
              点击<span className="desktop-hotkey-hint">或按空格键</span>，立即展开演绎
            </div>
          )}

          {outcomeRevealed && (
            <>
              {pending.notices.length > 0 && (
                <div className="notice-strip outcome-notices" role="status" aria-live="polite">
                  {pending.notices.map((n, i) => (
                    <div key={i}>· {n}</div>
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
                  <span className="continue-arrow">→</span>
                </button>
                <span className="continue-hotkey desktop-hotkey-hint">
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
