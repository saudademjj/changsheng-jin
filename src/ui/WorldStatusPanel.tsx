import React, { useState } from 'react';
import { ContentRegistry, GameState } from '../engine/types';
import {
  ACT_META,
  ACT_ORDER,
  getActProgressSnapshot,
  getFactionStandings,
  getRealmLadder,
  getWorldClimateSnapshot,
  getWorldRegions,
} from '../engine/worldview';

interface WorldStatusPanelProps {
  state: GameState;
  registry: ContentRegistry;
  tianjiInsight?: boolean;
}

type WorldSubTab = 'factions' | 'progress' | 'atlas';

const ARC_STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  completed: { text: '已了结', tone: 'warm' },
  in_progress: { text: '暗潮涌动', tone: 'accent' },
  missed: { text: '已随世局演进', tone: 'muted' },
  available: { text: '可往探查', tone: 'neutral' },
};

export const WorldStatusPanel: React.FC<WorldStatusPanelProps> = ({
  state,
  registry,
  tianjiInsight = true,
}) => {
  const [subTab, setSubTab] = useState<WorldSubTab>('factions');

  const progress = getActProgressSnapshot(state, tianjiInsight);
  const climate = getWorldClimateSnapshot(state);
  const factions = getFactionStandings(state);
  const regions = getWorldRegions(state);
  const ladder = getRealmLadder(state, registry);

  return (
    <div className="world-panel-wrap">
      <div className="world-climate-summary">
        <div className="card-block-head">
          <strong>
            {progress.actMeta.shortLabel} · {progress.actMeta.title}
          </strong>
          <span
            className={`stance-badge ${
              climate.crisisTone === 'critical'
                ? 'danger'
                : climate.crisisTone === 'tense'
                ? 'accent'
                : 'warm'
            }`}
          >
            {climate.veinLabel}
          </span>
        </div>

        <div className="world-vein-bar" aria-label={`九州灵脉：${climate.veinLabel}`}>
          <div
            className={`world-vein-fill tone-${climate.crisisTone}`}
            style={{ width: `${climate.veinPercent}%` }}
          />
        </div>

        <div className="overmatch-row">
          <strong>九霄天象：</strong>
          {climate.skyStatus}
        </div>
        <div className="overmatch-row">
          <strong>世道格局：</strong>
          {climate.societyStatus}
        </div>
      </div>

      <div className="sanctuary-subtabs world-subtabs" role="tablist" aria-label="九州世局子页">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'factions'}
          className={`mini-btn ${subTab === 'factions' ? 'active-subtab' : ''}`}
          onClick={() => setSubTab('factions')}
        >
          六方势力
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'progress'}
          className={`mini-btn ${subTab === 'progress' ? 'active-subtab' : ''}`}
          onClick={() => setSubTab('progress')}
        >
          六卷进程
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'atlas'}
          className={`mini-btn ${subTab === 'atlas' ? 'active-subtab' : ''}`}
          onClick={() => setSubTab('atlas')}
        >
          疆域与六境
        </button>
      </div>

      {subTab === 'factions' && (
        <div className="world-section-list">
          {factions.map((fac) => (
            <div className="card-block" key={fac.id}>
              <div className="card-block-head">
                <div className="faction-title-group">
                  <strong>{fac.name}</strong>
                  <div className="faction-meta-sub">
                    {fac.category} · {fac.region}
                  </div>
                </div>
                <span className={`stance-badge ${fac.standingTone}`}>
                  {fac.standingLabel}
                </span>
              </div>
              <div className="overmatch-row">
                <strong>态势：</strong>
                {fac.powerStatus}
              </div>
              <div className="overmatch-row">{fac.summary}</div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'progress' && (
        <div className="world-section-list">
          <div className="card-block">
            <div className="card-block-head">
              <strong>本卷所求 · {progress.breakthroughGoalLabel}</strong>
              <span className={`stance-badge ${progress.breakthroughUnlocked ? 'warm' : 'accent'}`}>
                {progress.breakthroughUnlocked ? '关口已启' : '筹备中'}
              </span>
            </div>
            <div className="overmatch-row">{progress.breakthroughProgressText}</div>
            {progress.hasMajorSlotLimit && (
              <div className="overmatch-row">
                <strong>天时大势席位：</strong>
                已深耕 {progress.majorSlotsUsed} / {progress.majorSlotsTotal} 席（余{' '}
                {progress.majorSlotsRemaining} 席）
              </div>
            )}
            {progress.majorArcs.length > 0 && (
              <div className="world-arc-list">
                {progress.majorArcs.map((arc) => {
                  const st = ARC_STATUS_LABEL[arc.status];
                  return (
                    <div className="world-arc-row" key={arc.threadId}>
                      <span>{arc.label}</span>
                      <span className={`stance-badge ${st.tone}`}>{st.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="drawer-section">
            <h3>六卷行迹脉络</h3>
            {ACT_ORDER.map((aid) => {
              const info = ACT_META[aid];
              const isCur = aid === state.act;
              const isPast = info.order < progress.actOrder;
              const isFuture = info.order > progress.actOrder;
              return (
                <div
                  key={aid}
                  className={`evidence-stage-row ${isPast ? 'done' : isCur ? 'partial' : ''}`}
                >
                  <div className="card-block-head">
                    <strong>
                      {info.shortLabel} · {isFuture ? '前路未明' : info.title}
                    </strong>
                    <span
                      className={`stance-badge ${
                        isCur ? 'accent' : isPast ? 'warm' : 'muted'
                      }`}
                    >
                      {isCur ? '当前所处' : isPast ? '已历经' : '前路未至'}
                    </span>
                  </div>
                  <div className="faction-meta-sub">
                    {isFuture
                      ? `所叩境界：${info.realmGoal}`
                      : `疆域：${info.region} · 所叩：${info.realmGoal}`}
                  </div>
                  <div className="overmatch-row">
                    {isFuture ? '前路风云未明，待踏入此境方见天地剧变。' : info.summary}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'atlas' && (
        <div className="world-section-list">
          <div className="drawer-section">
            <h3>九州疆域志</h3>
            {regions.map((r) => (
              <div
                key={r.id}
                className={`evidence-stage-row ${
                  r.status === 'current' ? 'partial' : r.status === 'visited' ? 'done' : ''
                }`}
              >
                <div className="card-block-head">
                  <strong>{r.name}</strong>
                  <span
                    className={`stance-badge ${
                      r.status === 'current'
                        ? 'accent'
                        : r.status === 'visited'
                        ? 'warm'
                        : 'muted'
                    }`}
                  >
                    {r.status === 'current'
                      ? '当前身处'
                      : r.status === 'visited'
                      ? '已踏足'
                      : r.actRange}
                  </span>
                </div>
                <div className="overmatch-row">{r.desc}</div>
              </div>
            ))}
          </div>

          <div className="drawer-section">
            <h3>长生六境与寿元阶梯</h3>
            {ladder.map((tier) => (
              <div
                key={tier.id}
                className={`evidence-stage-row ${
                  tier.status === 'current'
                    ? 'partial'
                    : tier.status === 'passed'
                    ? 'done'
                    : ''
                }`}
              >
                <div className="card-block-head">
                  <strong>
                    {tier.name}（{tier.lifespanText}）
                  </strong>
                  <span
                    className={`stance-badge ${
                      tier.status === 'current'
                        ? 'accent'
                        : tier.status === 'passed'
                        ? 'warm'
                        : tier.status === 'next'
                        ? 'partner'
                        : 'muted'
                    }`}
                  >
                    {tier.status === 'current'
                      ? '当前境界'
                      : tier.status === 'passed'
                      ? '已越过'
                      : tier.status === 'next'
                      ? '下一大关'
                      : '高远天堑'}
                  </span>
                </div>
                <div className="overmatch-row">{tier.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
