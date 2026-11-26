import React, { useEffect, useState } from 'react';
import {
  CompanionId,
  ContentRegistry,
  GameState,
} from '../engine/types';
import { toChineseYearNumber } from '../engine/time';
import {
  getCompanionStatusBadge,
  isActiveDaoPartner,
  isCompanionDeceased,
  isCompanionHostile,
  isCompanionSealed,
  isDaoPartner,
} from '../engine/systems';
import {
  canCommitBond,
  canTriggerMilestone1,
  commitCompanionBond,
  getSanctuaryActivities,
  GIFT_TASTE_MATRIX,
  giveSanctuaryGift,
  isSanctuaryClosed,
  isSuAct4FarewellStage,
  isSuAct5SeniorStage,
  performSanctuaryActivity,
  SanctuaryActionResult,
  triggerMilestone1,
} from '../engine/sanctuary';
import { AppIcon } from './Icon';

interface CompanionSanctuaryProps {
  state: GameState;
  registry: ContentRegistry;
  tianjiInsight: boolean;
  initialCompanionId?: CompanionId | null;
  onUpdateState: (next: GameState) => void;
}

type SanctuarySubTab = 'interact' | 'gifts' | 'letters' | 'chronicle';

const COMPANION_ORDER: CompanionId[] = [
  'shen_qingshuang',
  'xie_wujiu',
  'su_zhiwei',
  'cang_ming',
];

function hasPendingOpportunity(state: GameState, cid: CompanionId): boolean {
  if (state.act === 'act1' || isSanctuaryClosed(state)) return false;
  if (canTriggerMilestone1(state, cid)) return true;
  if (canCommitBond(state, cid, 'dao_partner').ok || canCommitBond(state, cid, 'sworn').ok) {
    return true;
  }
  return false;
}

export const CompanionSanctuary: React.FC<CompanionSanctuaryProps> = ({
  state,
  registry,
  tianjiInsight,
  initialCompanionId,
  onUpdateState,
}) => {
  const [selectedId, setSelectedId] = useState<CompanionId>(() => {
    if (initialCompanionId) return initialCompanionId;
    const firstMet = COMPANION_ORDER.find((cid) => state.companions[cid].met);
    return firstMet ?? 'shen_qingshuang';
  });
  const [subTab, setSubTab] = useState<SanctuarySubTab>('interact');
  const [lastResult, setLastResult] = useState<SanctuaryActionResult | null>(null);

  useEffect(() => {
    if (initialCompanionId) {
      setSelectedId(initialCompanionId);
      setLastResult(null);
    }
  }, [initialCompanionId]);

  useEffect(() => {
    setLastResult(null);
  }, [selectedId, state.runId]);

  const def = registry.companions[selectedId];
  const comp = state.companions[selectedId];
  const badge = getCompanionStatusBadge(state, selectedId);
  const deceased = isCompanionDeceased(state, selectedId);
  const sealed = isCompanionSealed(state, selectedId);
  const hostile = isCompanionHostile(state, selectedId);
  const partner = isDaoPartner(state, selectedId);
  const sanctuaryClosed = isSanctuaryClosed(state);
  const suFarewell = isSuAct4FarewellStage(state, selectedId);
  const suSeniorAct5 = isSuAct5SeniorStage(state, selectedId);
  const activities = getSanctuaryActivities(state, selectedId);

  const milestoneReady = canTriggerMilestone1(state, selectedId);
  const partnerCheck = canCommitBond(state, selectedId, 'dao_partner');
  const swornCheck = canCommitBond(state, selectedId, 'sworn');
  const showBondCeremony =
    state.act !== 'act1' &&
    !sanctuaryClosed &&
    !suFarewell &&
    !suSeniorAct5 &&
    comp.met &&
    !deceased &&
    !sealed &&
    !hostile &&
    (comp.milestoneStage ?? 0) >= 1 &&
    (!comp.bondType || comp.bondType === 'none') &&
    comp.affection >= 75 &&
    (partnerCheck.ok || swornCheck.ok);

  const heldGoods = Object.entries(state.market.holdings).filter(
    ([gid, h]) => h && h.qty > 0 && Boolean(registry.marketGoods[gid])
  );
  const giftKey = `${state.act}:sanctuary_gift_${selectedId}`;
  const giftedThisAct = (state.actionUses[giftKey] ?? 0) >= 1;

  const resolvedTitle =
    typeof def.title === 'function' ? def.title(state) : def.title;
  const resolvedBio =
    typeof def.bio === 'function' ? def.bio(state) : def.bio;

  const progressPct = Math.max(0, Math.min(100, comp.affection));
  const letters = comp.letters ?? [];

  const applyAction = (res: SanctuaryActionResult) => {
    setLastResult(res);
    if (res.ok) {
      onUpdateState(res.state);
    }
  };

  const activeOrDeceasedPartner =
    state.daoPartnerId &&
    (isCompanionDeceased(state, state.daoPartnerId) ||
      isActiveDaoPartner(state, state.daoPartnerId))
      ? state.daoPartnerId
      : null;

  return (
    <div className="sanctuary-wrap">
      <div className="sanctuary-intro">
        {sanctuaryClosed ? (
          <span>
            {state.endingId
              ? '此世因果已然落笔，雅阁暂闭；唯余过往尺素与共历编年可览。'
              : '九霄天门洞开在即，雅阁暂闭；唯余过往尺素与共历编年可览。'}
            {activeOrDeceasedPartner && (
              <>
                {' '}
                此生唯一道侣：
                <strong className="stance-badge partner">
                  {registry.companions[activeOrDeceasedPartner].name}
                </strong>
                。
              </>
            )}
          </span>
        ) : activeOrDeceasedPartner ? (
          <span>
            此生唯一道侣：
            <strong className="stance-badge partner">
              {registry.companions[activeOrDeceasedPartner].name}
            </strong>
            {isCompanionDeceased(state, activeOrDeceasedPartner)
              ? '（已辞世 · 余灯常明）'
              : isSuAct4FarewellStage(state, activeOrDeceasedPartner)
              ? '（已入暮年 · 请赴青州槐阴）'
              : '（此生唯一 · 专属雅叙已启）'}
          </span>
        ) : tianjiInsight ? (
          <span>
            情谊达 <strong>30</strong> 启「知交夜话」，达 <strong>75</strong> 可结
            <strong>唯一道侣</strong>或<strong>生死挚交</strong>。
          </span>
        ) : (
          <span>
            情谊渐深可启「知交夜话」，心意相许后可结<strong>唯一道侣</strong>或
            <strong>生死挚交</strong>。
          </span>
        )}
      </div>

      <div className="sanctuary-tabs" role="tablist" aria-label="选择仙缘故人">
        {COMPANION_ORDER.map((cid) => {
          const cDef = registry.companions[cid];
          const cRuntime = state.companions[cid];
          const cBadge = getCompanionStatusBadge(state, cid);
          const active = selectedId === cid;
          const pending = hasPendingOpportunity(state, cid);
          return (
            <button
              key={cid}
              type="button"
              role="tab"
              aria-selected={active}
              className={`sanctuary-tab ${active ? 'active' : ''} ${
                isCompanionDeceased(state, cid) ? 'tab-deceased' : ''
              }`}
              onClick={() => setSelectedId(cid)}
            >
              <span className="sanctuary-tab-name">
                {cRuntime.met ? cDef.name : '未识'}
                {pending && <span className="nav-dot" aria-label="有新仙缘契机" />}
              </span>
              <span className={`stance-badge ${cBadge.tone}`}>{cBadge.label}</span>
            </button>
          );
        })}
      </div>

      {!comp.met ? (
        <div className="card-block card-block-muted">
          <div className="card-block-head">
            <strong>未启之缘 · {def.faction}</strong>
            <span className="stance-badge muted">素未谋面</span>
          </div>
          <div className="overmatch-row">缘起线索：{def.encounterHint}</div>
        </div>
      ) : (
        <>
          <div className="sanctuary-overview">
            <div className="card-block-head">
              <div className="faction-title-group">
                <strong>{def.name}</strong>
                <span className="faction-meta-sub">{resolvedTitle}</span>
              </div>
              <span className={`stance-badge ${badge.tone}`}>
                {badge.label}
                {badge.subLabel ? ` · ${badge.subLabel}` : ''}
              </span>
            </div>

            <div className="overmatch-row">{resolvedBio}</div>

            {deceased ? (
              <div className="sanctuary-deceased-note">
                {sanctuaryClosed
                  ? '故人已归尘土，唯余药灯长留心间。此刻唯余生前尺素与共历编年可览。'
                  : '故人已归尘土，唯余药灯长留心间。你仍可于此焚香追思、重读生前尺素与共历编年。'}
              </div>
            ) : sealed ? (
              <div className="sanctuary-deceased-note">
                焦黑断玉已沉入荒泽永封，再无相见之机。
              </div>
            ) : hostile ? (
              <div className="sanctuary-deceased-note">
                彼此道途殊绝、剑拔弩张，雅阁难容对坐。
              </div>
            ) : (
              <div className="sanctuary-meter-wrap">
                <div className="sanctuary-meter-head">
                  <span>
                    羁绊深度：
                    {partner
                      ? '此生唯一道侣'
                      : comp.bondType === 'sworn'
                      ? '八拜生死挚交'
                      : (comp.milestoneStage ?? 0) >= 1
                      ? '已解心结 · 知交深厚'
                      : comp.affection >= 30
                      ? milestoneReady
                        ? '知交已成 · 可启夜话'
                        : '知交已成 · 彼此相契'
                      : comp.affection >= 12
                      ? '渐生默契'
                      : comp.affection >= 0
                      ? '初识相交'
                      : '心存芥蒂'}
                  </span>
                  <span className="status-soft">
                    {tianjiInsight
                      ? `情谊 ${comp.affection} / 100`
                      : partner
                      ? '此生唯一'
                      : comp.bondType === 'sworn'
                      ? '生死挚交'
                      : comp.affection >= 75
                      ? '情深意笃'
                      : comp.affection >= 30
                      ? '相知渐深'
                      : comp.affection >= 0
                      ? '缘分初起'
                      : '尚存隔阂'}
                  </span>
                </div>
                <div className="sanctuary-meter" aria-hidden="true">
                  <div
                    className={`sanctuary-meter-fill ${partner ? 'partner' : ''}`}
                    style={{ width: `${progressPct}%` }}
                  />
                  <span className="sanctuary-meter-tick" style={{ left: '30%' }} />
                  <span className="sanctuary-meter-tick" style={{ left: '75%' }} />
                </div>
                <div className="sanctuary-meter-legend">
                  <span>初识</span>
                  <span>
                    {tianjiInsight ? '30 · 知交夜话' : '知交夜话'}
                    {(comp.milestoneStage ?? 0) >= 1 ? ' · 已启' : ''}
                  </span>
                  <span>
                    {tianjiInsight ? '75 · 结契' : '心许结契'}
                    {comp.bondType === 'dao_partner'
                      ? '（道侣）'
                      : comp.bondType === 'sworn'
                      ? '（挚交）'
                      : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {milestoneReady && (
            <div className="sanctuary-bond-banner">
              <div className="sanctuary-bond-title">
                <AppIcon name="sparkle" />
                <span>知交夜话契机已至</span>
              </div>
              <div className="sanctuary-bond-desc">
                你与{def.name}已足够相知，不妨借此静夜推心深谈、解开心结，并获赠亲笔尺素。
              </div>
              <button
                type="button"
                className="primary-btn sanctuary-cta-btn"
                onClick={() => applyAction(triggerMilestone1(state, selectedId))}
              >
                共赴「知交夜话」
              </button>
            </div>
          )}

          {showBondCeremony && (
            <div className="sanctuary-bond-banner">
              <div className="sanctuary-bond-title">
                <AppIcon name="sparkle" />
                <span>情谊既笃 · 择定此生名分</span>
              </div>
              <div className="sanctuary-bond-desc">
                此刻可郑重向{def.name}许诺名分（道侣全世唯此一人；生死挚交不限人数）。
              </div>
              <div className="sanctuary-bond-actions">
                <button
                  type="button"
                  className="primary-btn sanctuary-cta-btn"
                  disabled={!partnerCheck.ok}
                  title={partnerCheck.reason}
                  onClick={() =>
                    applyAction(commitCompanionBond(state, selectedId, 'dao_partner'))
                  }
                >
                  许以唯一 · 结为道侣
                </button>
                <button
                  type="button"
                  className="ghost-btn sanctuary-cta-btn"
                  disabled={!swornCheck.ok}
                  title={swornCheck.reason}
                  onClick={() =>
                    applyAction(commitCompanionBond(state, selectedId, 'sworn'))
                  }
                >
                  肝胆相照 · 结为生死挚交
                </button>
              </div>
              {!partnerCheck.ok && partnerCheck.reason && (
                <div className="sanctuary-bond-note">{partnerCheck.reason}</div>
              )}
            </div>
          )}

          {lastResult && (
            <div className="sanctuary-vignette" role="status">
              <div className="sanctuary-vignette-head">
                <strong>{lastResult.title}</strong>
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => setLastResult(null)}
                >
                  收起
                </button>
              </div>
              {lastResult.paragraphs.map((p, idx) => (
                <p key={idx} className="sanctuary-vignette-p">
                  {p}
                </p>
              ))}
              <div className="sanctuary-vignette-notice">{lastResult.notice}</div>
            </div>
          )}

          <div className="sanctuary-subtabs" role="tablist" aria-label="仙缘互动功能">
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'interact'}
              className={`mini-btn ${subTab === 'interact' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('interact')}
            >
              {deceased ? '焚香追思' : '雅叙'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'gifts'}
              className={`mini-btn ${subTab === 'gifts' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('gifts')}
            >
              行囊赠礼
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'letters'}
              className={`mini-btn ${subTab === 'letters' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('letters')}
            >
              往来尺素 ({letters.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'chronicle'}
              className={`mini-btn ${subTab === 'chronicle' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('chronicle')}
            >
              共历编年 ({comp.chronicle.length})
            </button>
          </div>

          {subTab === 'interact' && (
            <div className="sanctuary-panel-list">
              {activities.length === 0 ? (
                <div className="sanctuary-deceased-note">
                  {sanctuaryClosed
                    ? state.endingId
                      ? '此世因果已然落笔，雅阁暂闭，唯余过往尺素与共历编年可览。'
                      : '九霄天门洞开在即，雅阁暂闭，无暇对坐雅叙。'
                    : sealed
                    ? '焦黑断玉已沉入荒泽永封，再无相见之机。'
                    : hostile
                    ? '彼此道途殊绝、锋芒相向，已无对坐雅叙之机。'
                    : suFarewell
                    ? '故人已届耄耋暮年，请亲赴青州槐阴见她最后一面。'
                    : '当前暂无可共赴之雅叙。'}
                </div>
              ) : (
                activities.map((act) => {
                  const canRun = act.available(state);
                  return (
                    <div className="card-block" key={act.id}>
                      <div className="card-block-head">
                        <strong>{act.label}</strong>
                        <span
                          className={`stance-badge ${
                            act.requiresPartner
                              ? 'partner'
                              : act.requiresBond
                              ? 'accent'
                              : act.deceasedOnly
                              ? 'deceased'
                              : 'warm'
                          }`}
                        >
                          {act.tag}
                        </span>
                      </div>
                      <div className="overmatch-row">{act.subtext}</div>
                      <div className="save-row-actions">
                        <button
                          type="button"
                          className="mini-btn"
                          disabled={!canRun}
                          onClick={() =>
                            applyAction(performSanctuaryActivity(state, selectedId, act.id))
                          }
                        >
                          {canRun
                            ? act.deceasedOnly
                              ? '焚香祭茶'
                              : '共叙此刻'
                            : act.deceasedOnly
                            ? '本卷已祭'
                            : '本卷已叙'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {subTab === 'gifts' && (
            <div className="sanctuary-panel-list">
              {sanctuaryClosed || deceased || sealed || hostile || suFarewell ? (
                <div className="sanctuary-deceased-note">
                  {sanctuaryClosed
                    ? state.endingId
                      ? '此世因果已然落笔，已无须再赠礼信。'
                      : '九霄天门洞开在即，此刻无暇馈赠尘物。'
                    : deceased
                    ? '故人已辞世，尘世奇货已无处相赠。'
                    : suFarewell
                    ? '故人已入暮年，请亲赴青州槐阴相见，不必再托物相赠。'
                    : '当前关系下无法相赠礼信。'}
                </div>
              ) : heldGoods.length === 0 ? (
                <div className="sanctuary-deceased-note">
                  行囊中暂无坊市货品，可于各卷坊市购置后再来相赠。
                </div>
              ) : (
                <>
                  <div className="sanctuary-deceased-note">
                    {giftedThisAct
                      ? `本卷已向${def.name}赠礼一次，待步入新境后再备心意。`
                      : `每卷可向${def.name}相赠一件坊市货品。`}
                  </div>
                  <div className="sanctuary-gift-grid">
                    {heldGoods.map(([gid, holding]) => {
                      const good = registry.marketGoods[gid];
                      const taste = GIFT_TASTE_MATRIX[selectedId][gid] ?? 'neutral';
                      const tasteHint =
                        taste === 'favorite'
                          ? '颇合心意'
                          : taste === 'liked'
                          ? '略有兴致'
                          : taste === 'disliked'
                          ? '似有所忌'
                          : '寻常之物';
                      return (
                        <div className="card-block" key={gid}>
                          <div className="card-block-head">
                            <strong>
                              {good.name} ×{holding.qty}
                            </strong>
                            {tianjiInsight && (
                              <span
                                className={`stance-badge ${
                                  taste === 'favorite'
                                    ? 'accent'
                                    : taste === 'disliked'
                                    ? 'danger'
                                    : ''
                                }`}
                              >
                                {tasteHint}
                              </span>
                            )}
                          </div>
                          <div className="overmatch-row">{good.desc}</div>
                          <div className="save-row-actions">
                            <button
                              type="button"
                              className="mini-btn"
                              disabled={giftedThisAct}
                              onClick={() =>
                                applyAction(giveSanctuaryGift(state, selectedId, gid, registry))
                              }
                            >
                              <AppIcon name="gift" />
                              <span>{giftedThisAct ? '本卷已赠' : `赠予${def.name}`}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {subTab === 'letters' && (
            <div className="sanctuary-panel-list">
              {letters.length === 0 ? (
                <div className="sanctuary-deceased-note">
                  {deceased
                    ? '故人已归尘土，生前未曾留下亲笔尺素。'
                    : sealed
                    ? '残魂已遭永封，未有尺素留存。'
                    : hostile
                    ? '彼此道途相左，未曾互寄尺素。'
                    : sanctuaryClosed
                    ? state.endingId
                      ? `此世已终，${def.name}未曾留下亲笔尺素。`
                      : `天门终战在即，此前未与${def.name}互留亲笔尺素。`
                    : suFarewell
                    ? '故人已入暮年，此前未留亲笔尺素，请亲赴青州槐阴相见。'
                    : suSeniorAct5
                    ? '故人已届耄耋高龄、远居青州安养，此前未曾留有亲笔尺素。'
                    : `尚无尺素存留。共赴「知交夜话」或定下名分后，${def.name}的亲笔书信将珍藏于此。`}
                </div>
              ) : (
                [...letters].reverse().map((letter) => (
                  <article className="card-block" key={letter.id}>
                    <div className="card-block-head">
                      <strong className="sanctuary-letter-title">
                        <AppIcon name="envelope" />
                        <span>{letter.title}</span>
                      </strong>
                      <span className="save-time">长明{toChineseYearNumber(letter.year)}年</span>
                    </div>
                    <p className="sanctuary-letter-body">{letter.body}</p>
                  </article>
                ))
              )}
            </div>
          )}

          {subTab === 'chronicle' && (
            <div className="sanctuary-panel-list">
              {comp.chronicle.length === 0 ? (
                <div className="sanctuary-deceased-note">尚无共历编年。</div>
              ) : (
                <ul className="chronicle-list">
                  {[...comp.chronicle].reverse().map((entry, idx) => (
                    <li key={idx}>{entry}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
