import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CompanionId,
  CompanionRuntimeState,
  ContentRegistry,
  GameState,
  MetaArchive,
  SaveRecord,
} from '../engine/types';
import { STANCE_LABELS } from '../content/companions';
import { toChineseYearNumber } from '../engine/time';
import { getDaoHeartSummary } from '../engine/scheduler';
import {
  ACT_MAJOR_THREADS,
  getCommittedMajorArcs,
  getCompanionStatusBadge,
  getInvestigationProgress,
  getOvermatchProfile,
  getRemainingMajorArcSlots,
  isActiveDaoPartner,
  isCompanionDeceased,
  isCompanionHostile,
  isCompanionSealed,
  isDaoPartner,
  MAJOR_THREAD_LABELS,
  MAX_MAJOR_ARCS_PER_ACT,
} from '../engine/systems';
import {
  isSanctuaryClosed,
  isSuAct4FarewellStage,
  isSuAct5SeniorStage,
} from '../engine/sanctuary';
import {
  exportSaveJson,
  formatSaveTime,
  importSaveJson,
  MAX_IMPORT_SAVE_BYTES,
} from '../engine/storage';
import { DrawerTab } from './TopStatusBar';
import { CompanionSanctuary } from './CompanionSanctuary';
import { WorldStatusPanel } from './WorldStatusPanel';

interface DrawerPanelsProps {
  activeTab: DrawerTab;
  state: GameState | null;
  registry: ContentRegistry;
  meta: MetaArchive;
  checkpoints: SaveRecord[];
  manualSlots: SaveRecord[];
  tianjiInsight: boolean;
  instantText: boolean;
  selectedSanctuaryId?: CompanionId | null;
  onOpenSanctuary?: (cid?: CompanionId) => void;
  onUpdateState?: (next: GameState) => void;
  onToggleInstantText: () => void;
  onClose: () => void;
  onCreateManualSave: (label: string) => void;
  onDeleteManualSave: (id: string) => void;
  onLoadSave: (record: SaveRecord) => void;
  onImportState: (imported: GameState) => void;
}

function getLivingAffectionPhrase(
  runtime: CompanionRuntimeState,
  partner: boolean,
  canBondInSanctuary: boolean
): string {
  if (runtime.stance === 'estranged') return '恩断义绝，各行其道';
  if (runtime.stance === 'rival') return '道途相左，锋芒相向';
  if (partner) return '结契道侣，此生唯一相守';
  if (runtime.bondType === 'sworn') return '八拜生死挚交，肝胆相照';
  if (runtime.stance === 'bonded' || runtime.affection >= 75)
    return canBondInSanctuary
      ? '心意相许，可赴仙缘雅阁定契'
      : '情深意笃，彼此心意相许';
  if (runtime.stance === 'confidant' || runtime.affection >= 30)
    return '推心知己，彼此托付真心';
  if (runtime.affection >= 12) return '颇有善意，渐生默契';
  if (runtime.affection > -10) return '淡如君子，尚在试探';
  if (runtime.affection > -25) return '心存芥蒂，锋芒暗藏';
  return '冰炭难容，道途殊绝';
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const FOG_ENDING_HINTS: Record<string, string> = {
  ending_lifespan: '卷二至四 · 岁寿岐路（初通任一终局后显线索）',
  ending_silenced: '卷二至三 · 暗潮凶途（初通任一终局后显线索）',
  ending_blood_demon: '卷二至四 · 魔途异数（初通任一终局后显线索）',
  ending_fallen_path: '卷二至五 · 破关险途（初通任一终局后显线索）',
  ending_qingzhou_hearth: '卷二至三 · 红尘旧约（初通任一终局后显线索）',
  ending_merchant_lord: '卷二 · 坊市商途（初通任一终局后显线索）',
  ending_sever_sky_bonded: '卷六 · 终局天命（初通任一终局后显线索）',
  ending_sever_sky_solo: '卷六 · 终局天命（初通任一终局后显线索）',
  ending_mortal_new_era: '卷六 · 终局天命（初通任一终局后显线索）',
  ending_gilded_realm: '卷六 · 终局天命（初通任一终局后显线索）',
  ending_demonic_devour: '卷六 · 终局天命（初通任一终局后显线索）',
  ending_earth_immortal: '卷五至六 · 终局天命（初通任一终局后显线索）',
  ending_false_ascension: '卷六 · 终局天命（初通任一终局后显线索）',
};

const ENDING_HINTS: Record<string, string> = {
  ending_lifespan: '卷二至四 · 寿尽未破天堑',
  ending_silenced: '卷二/三 · 无底牌硬胁高阶惨遭灭口',
  ending_blood_demon: '卷二至四 · 强纳血煞魔气反噬',
  ending_fallen_path: '卷二至五 · 底蕴未足强冲大关',
  ending_qingzhou_hearth: '卷二/三 · 杏林深情止步红尘',
  ending_merchant_lord: '卷二 · 聚财六百五十石或商名厚资坐断青岚',
  ending_sever_sky_bonded: '卷六 · 集六卷铁证并携道侣/生死挚交破门',
  ending_sever_sky_solo: '卷六 · 集六卷铁证孤锋独断九霄',
  ending_mortal_new_era: '卷六 · 承凡尘守灯之志，还人间归真',
  ending_gilded_realm: '卷六 · 凭灵脉契或千金商网退仙使',
  ending_demonic_devour: '卷六 · 负吞煞魔威逆吞天门金光',
  ending_earth_immortal: '卷五/六 · 高心境或无灵印假死隐世',
  ending_false_ascension: '卷六 · 收剑低眉步入接引金光',
};

export const RELIC_ORIGIN_HINTS: Record<string, string> = {
  charred_jade_relic: '开局宿缘「拾得焦黑断玉」、卷二古脉或卷三古战场',
  qingzhou_silver_needle: '开局宿缘「青州杏林旧约」驻留相助',
  baibao_token: '开局暗市密信、卷二血丹暗线或暗楼商途机缘',
  broken_gathering_array: '卷一/二青岚坊市秘藏',
  qingyun_sword_tally: '卷一终章投考青云剑宗外门',
  foundation_pill: '卷二坊市秘藏或暗潮重赏',
  blood_foundation_pill: '卷一南市/茶肆或卷二血丹暗线',
  longevity_dew: '卷二至四坊市秘藏',
  heaven_dust_shard: '卷二青州北麓古脉深处探查所得',
  ancient_stele_rubbing: '卷二青云剑宗禁地古碑探查所得',
  soul_nourishing_wood: '卷三古战场荒泽或卷四黑市秘拍',
  golden_core_elixir: '卷三奇珍楼或百宝总账堂公审线',
  severing_sword_embryo: '卷三仙盟秘阁、卷四绝渊铁坛或卷五易物会',
  spirit_vein_deed: '卷三百宝总账堂或卷四赤阳停战',
  mortal_hearth_talisman: '卷三青州杏林或卷四槐阴古碑',
  broken_sky_seal: '卷四绝渊铁坛、黑市或卷五群雄会',
  ascension_ledger: '卷四赤阳烽火行营铁匣截获',
  nascent_lotus: '卷四黑市秘拍、停战密约或卷五易物会',
};

export const DrawerPanels: React.FC<DrawerPanelsProps> = ({
  activeTab,
  state,
  registry,
  meta,
  checkpoints,
  manualSlots,
  tianjiInsight,
  instantText,
  selectedSanctuaryId,
  onOpenSanctuary,
  onUpdateState,
  onToggleInstantText,
  onClose,
  onCreateManualSave,
  onDeleteManualSave,
  onLoadSave,
  onImportState,
}) => {
  const [saveLabel, setSaveLabel] = useState('');
  const [ioMessage, setIoMessage] = useState('');
  const [ioError, setIoError] = useState(false);
  const [importDraft, setImportDraft] = useState('');
  const [exportDraft, setExportDraft] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showRelicsCatalog, setShowRelicsCatalog] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const panelRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 切换抽屉或开关时重置临时状态
  useEffect(() => {
    setIoMessage('');
    setIoError(false);
    setShowImportBox(false);
    setExportDraft('');
    setConfirmDeleteId(null);
    setSelectedTagId(null);
    setShowAllHistory(false);
    setShowRelicsCatalog(false);
  }, [activeTab, state?.runId]);

  // 删除二次确认 3 秒后自动复位
  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = window.setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmDeleteId]);

  // 锁定页面背景滚动 + 焦点捕获 + Esc 关闭 + 关闭归还焦点
  useEffect(() => {
    if (!activeTab) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!panelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        window.setTimeout(() => {
          if (previousFocus.isConnected) {
            previousFocus.focus({ preventScroll: true });
          }
        }, 0);
      }
    };
  }, [activeTab]);

  const sortedCheckpoints = useMemo(() => {
    if (!state) return checkpoints;
    const currentRun = checkpoints.filter((c) => c.state.runId === state.runId);
    const otherRuns = checkpoints.filter((c) => c.state.runId !== state.runId);
    return [...currentRun, ...otherRuns];
  }, [checkpoints, state]);

  if (!activeTab) return null;

  const titles: Record<Exclude<DrawerTab, null>, string> = {
    status: '行囊与命格',
    world: '九州世局',
    companions: '故人志',
    sanctuary: '仙缘雅阁',
    saves: '命盘刻痕',
    meta: '万象志',
  };

  const handleExport = () => {
    if (!state) return;
    const json = exportSaveJson(state);
    setExportDraft(json);
    setShowImportBox(false);
    setIoError(false);
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(json).then(
        () => setIoMessage('当前命盘 JSON 已复制到剪贴板，也可从下方全选复制或下载备份。'),
        () => setIoMessage('剪贴板写入受限，请直接复制下方命盘文本或点击下载文件。')
      );
    } else {
      setIoMessage('请直接全选复制下方命盘文本，或点击下载为 .json 文件。');
    }
  };

  const handleDownloadJson = () => {
    if (!state) return;
    const json = exportDraft || exportSaveJson(state);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeName =
      state.profile.name
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
        .replace(/^[.\s]+|[.\s]+$/g, '') || '无名修士';
    const link = document.createElement('a');
    link.href = url;
    link.download = `长生烬-${safeName}-${state.year}年.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIoError(false);
    setIoMessage('命盘 .json 文件已开始下载。');
  };

  const runImportRaw = (rawText: string) => {
    if (rawText.length > MAX_IMPORT_SAVE_BYTES) {
      setIoError(true);
      setIoMessage('命盘文件体积过大（上限 512KB），已拒绝导入。');
      return;
    }
    const parsed = importSaveJson(rawText, registry);
    if (!parsed) {
      setIoError(true);
      setIoMessage('命盘格式无效或版本不兼容，请检查是否为完整的导出 JSON。');
      return;
    }
    setIoError(false);
    setImportDraft('');
    setShowImportBox(false);
    setIoMessage('命盘导入成功，已恢复至对应节点。');
    onImportState(parsed);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_SAVE_BYTES) {
      setIoError(true);
      setIoMessage('命盘文件体积过大（上限 512KB），已拒绝导入。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        runImportRaw(reader.result);
      }
    };
    reader.onerror = () => {
      setIoError(true);
      setIoMessage('读取文件失败，请尝试粘贴 JSON 文本导入。');
    };
    reader.readAsText(file, 'utf-8');
  };

  const selectedTagDef = selectedTagId ? registry.tags[selectedTagId] : undefined;

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={titles[activeTab]}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">{titles[activeTab]}</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="nav-btn drawer-close-btn"
            onClick={onClose}
          >
            合卷 ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* ==================== 行囊与命格 ==================== */}
          {activeTab === 'status' && state && (() => {
            const overmatch = getOvermatchProfile(state);
            const invProgress = getInvestigationProgress(state, registry);
            const actMajorThreads = ACT_MAJOR_THREADS[state.act];
            const committedArcs = getCommittedMajorArcs(state, state.act);
            const remainingSlots = getRemainingMajorArcSlots(state, state.act);
            const metCompanions = (Object.keys(registry.companions) as CompanionId[]).filter(
              (cid) => state.companions[cid].met
            );

            return (
              <>
                <div className="drawer-section">
                  <h3>道身与底蕴</h3>
                  <div style={{ marginBottom: 10 }}>
                    <strong>{state.profile.name}</strong>（{state.profile.honorific}） ·{' '}
                    {registry.realms[state.realm]?.name} · 道心意境：
                    <span style={{ color: 'var(--accent)' }}>
                      {getDaoHeartSummary(state)}
                    </span>
                    {state.daoPartnerId &&
                      (isCompanionDeceased(state, state.daoPartnerId) ||
                        isActiveDaoPartner(state, state.daoPartnerId)) && (
                        <div style={{ marginTop: 4, fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
                          结契道侣：
                          <strong style={{ color: 'var(--accent)' }}>
                            {registry.companions[state.daoPartnerId].name}
                          </strong>
                          {isCompanionDeceased(state, state.daoPartnerId)
                            ? '（已辞世 · 余灯长明）'
                            : '（此生唯一）'}
                        </div>
                      )}
                  </div>
                  <div className="stat-grid">
                    <div className="stat-cell">
                      <div className="stat-cell-label">修为实力</div>
                      <div className="stat-cell-val">{state.might}</div>
                    </div>
                    <div className="stat-cell">
                      <div className="stat-cell-label">心境定力</div>
                      <div className="stat-cell-val">{state.mind}</div>
                    </div>
                    <div className="stat-cell">
                      <div className="stat-cell-label">声望人脉</div>
                      <div className="stat-cell-val">{state.renown}</div>
                    </div>
                  </div>
                  {actMajorThreads && (
                    <div className="overmatch-row" style={{ marginTop: 10 }}>
                      <strong>本卷天时大势：</strong>
                      已深耕 {committedArcs.length} / {MAX_MAJOR_ARCS_PER_ACT} 席
                      {committedArcs.length > 0
                        ? `（${committedArcs
                            .map((t) => MAJOR_THREAD_LABELS[t] ?? t)
                            .join('、')}）`
                        : ''}
                      · 余 {remainingSlots} 席
                    </div>
                  )}
                </div>

                {/* 越阶底蕴与威慑底牌 */}
                <div className="drawer-section">
                  <h3>越阶底蕴与威慑底牌</h3>
                  <div className="card-block">
                    <div className="card-block-head">
                      <strong>{overmatch.rankLabel}</strong>
                      <span className="stance-badge accent">
                        越阶战力 {overmatch.crossRealmPower}
                      </span>
                    </div>
                    <div className="overmatch-row">
                      <strong>跨阶底蕴：</strong>
                      {overmatch.powerSources.length > 0
                        ? overmatch.powerSources.join('、')
                        : '暂无（面对高境界强敌切忌硬撼）'}
                    </div>
                    <div className="overmatch-row">
                      <strong>暗网死手：</strong>
                      {overmatch.deadmanSwitches.length > 0
                        ? overmatch.deadmanSwitches.join('、')
                        : '暂无（无死手牵制时亮账本要挟高阶极易遭灭口）'}
                    </div>
                    <div className="overmatch-row">
                      <strong>保命退路：</strong>
                      {overmatch.lifesavers.length > 0
                        ? overmatch.lifesavers.join('、')
                        : '暂无护心退路'}
                    </div>
                  </div>
                </div>

                {/* 四阶段天机勘验录 */}
                <div className="drawer-section">
                  <h3>
                    天机勘验录（{invProgress.totalClues} /{' '}
                    {Object.keys(registry.truthClues).length} · {invProgress.tierLabel}）
                  </h3>
                  <div className="evidence-verdict">{invProgress.verdictText}</div>
                  {invProgress.stages.map((st) => {
                    const done =
                      st.clueIds.length > 0 && st.unlockedIds.length >= st.clueIds.length;
                    const partial = st.unlockedIds.length > 0 && !done;
                    return (
                      <div
                        className={`evidence-stage-card ${done ? 'done' : partial ? 'partial' : ''}`}
                        key={st.stage}
                      >
                        <div className="card-block-head">
                          <strong>{st.title}</strong>
                          <span className={`stance-badge ${done ? 'warm' : partial ? 'accent' : 'muted'}`}>
                            {st.unlockedIds.length} / {st.clueIds.length}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78125rem', color: 'var(--text-soft)' }}>
                          {st.desc}
                        </div>
                        {st.unlockedIds.length > 0 && (
                          <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--accent)' }}>
                            已证：
                            {st.unlockedIds
                              .map((id) => registry.truthClues[id]?.title ?? id)
                              .join('、')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 故人命数速览（在命格页亦清楚显示已辞世/道侣） */}
                {metCompanions.length > 0 && (
                  <div className="drawer-section">
                    <h3>故人命数一览</h3>
                    <div className="seal-tags">
                      {metCompanions.map((cid) => {
                        const badge = getCompanionStatusBadge(state, cid);
                        return (
                          <span key={cid} className={`stance-badge ${badge.tone}`}>
                            {registry.companions[cid].name} · {badge.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="drawer-section">
                  <h3>阅读习惯</h3>
                  <div className="pref-toggle-row">
                    <span>正文显现：{instantText ? '瞬息展开全段' : '逐段渐次浮现'}</span>
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={onToggleInstantText}
                    >
                      {instantText ? '改为逐段' : '改为瞬显'}
                    </button>
                  </div>
                </div>

                <div className="drawer-section">
                  <h3>命格与因果词条（轻触查看笺注）</h3>
                  <div className="seal-tags">
                    {state.tags.map((tid) => {
                      const def = registry.tags[tid];
                      if (!def) return null;
                      const active = selectedTagId === tid;
                      return (
                        <button
                          type="button"
                          className={`seal-tag-btn ${active ? 'active' : ''}`}
                          key={tid}
                          aria-expanded={active}
                          onClick={() =>
                            setSelectedTagId((prev) => (prev === tid ? null : tid))
                          }
                        >
                          {def.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTagDef && (
                    <div className="seal-tag-detail">
                      <strong style={{ color: 'var(--text)' }}>
                        {selectedTagDef.name}：
                      </strong>
                      {selectedTagDef.desc}
                    </div>
                  )}
                </div>

                <div className="drawer-section">
                  <h3>具名奇物（灵石：{state.spiritStones}）</h3>
                  {state.relics.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>行囊中暂未收得稀世奇物。</div>
                  ) : (
                    state.relics.map((rid) => {
                      const r = registry.relics[rid];
                      if (!r) return null;
                      return (
                        <div className="card-block" key={rid}>
                          <div className="card-block-head">
                            <strong>【{r.name}】</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                              {r.rarity}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
                            {r.desc}
                          </div>
                          {r.storyUseHint && (
                            <div style={{ fontSize: '0.78125rem', color: 'var(--accent)', marginTop: 4 }}>
                              用途：{r.storyUseHint}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {(() => {
                    const validHoldings = Object.entries(state.market.holdings).filter(([gid]) =>
                      Boolean(registry.marketGoods[gid])
                    );
                    if (validHoldings.length === 0) return null;
                    return (
                      <div style={{ marginTop: 12, fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
                        <strong>暂存坊市货品：</strong>
                        {validHoldings
                          .map(([gid, h]) => `${registry.marketGoods[gid].name}×${h.qty}`)
                          .join('、')}
                      </div>
                    );
                  })()}
                </div>

                <div className="drawer-section">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>
                      生平编年（{showAllHistory ? `共 ${state.historyLog.length} 事` : '近十事'}）
                    </h3>
                    {state.historyLog.length > 10 && (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => setShowAllHistory((v) => !v)}
                      >
                        {showAllHistory ? '仅看近十事' : `展开全部（${state.historyLog.length}）`}
                      </button>
                    )}
                  </div>
                  {(showAllHistory
                    ? [...state.historyLog].reverse()
                    : [...state.historyLog].reverse().slice(0, 10)
                  ).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 8,
                        fontSize: '0.84375rem',
                        color: 'var(--text-soft)',
                      }}
                    >
                      <strong style={{ color: 'var(--text)' }}>
                        长明{toChineseYearNumber(h.year)}年{h.season}（{h.ageYears}岁）
                      </strong>{' '}
                      · {h.summary}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* ==================== 故人志 ==================== */}
          {activeTab === 'companions' && state && (
            <div className="drawer-section">
              <h3>四位宿命故人</h3>
              {(Object.keys(registry.companions) as CompanionId[]).map((cid) => {
                const def = registry.companions[cid];
                const runtime = state.companions[cid];
                const badge = getCompanionStatusBadge(state, cid);
                const deceased = isCompanionDeceased(state, cid);
                const sealed = isCompanionSealed(state, cid);
                const hostile = isCompanionHostile(state, cid);
                const partner = isDaoPartner(state, cid);

                if (!runtime.met) {
                  return (
                    <div className="card-block card-block-muted" key={cid}>
                      <div className="card-block-head">
                        <strong>未启之卷 · {def.faction}</strong>
                        <span className="stance-badge muted">素未谋面</span>
                      </div>
                      <div style={{ fontSize: '0.84375rem', color: 'var(--text-muted)' }}>
                        缘起线索：{def.encounterHint}
                      </div>
                    </div>
                  );
                }

                const resolvedTitle =
                  typeof def.title === 'function' ? def.title(state) : def.title;
                const resolvedBio =
                  typeof def.bio === 'function' ? def.bio(state) : def.bio;
                const sanctuaryClosed = isSanctuaryClosed(state);
                const suFarewell = isSuAct4FarewellStage(state, cid);
                const suSeniorAct5 = isSuAct5SeniorStage(state, cid);
                const canBondInSanctuary =
                  !sanctuaryClosed &&
                  !suFarewell &&
                  !suSeniorAct5 &&
                  state.act !== 'act1';

                return (
                  <div
                    className={`card-block ${deceased ? 'card-block-deceased' : ''}`}
                    key={cid}
                  >
                    <div className="card-block-head">
                      <div>
                        <strong>{def.name}</strong>
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: '0.78125rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {resolvedTitle}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`stance-badge ${badge.tone}`}>
                          {badge.label}
                        </span>
                        {badge.subLabel && (
                          <span className="stance-badge muted">{badge.subLabel}</span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: deceased || sealed ? 'var(--text-muted)' : 'var(--accent)',
                        marginBottom: 6,
                      }}
                    >
                      {deceased ? (
                        partner
                          ? '故人追思：故去道侣，杏林余灯长明于心'
                          : '故人追思：阴阳两隔，杏林余灯犹在人间'
                      ) : sealed ? (
                        '残魂状态：焦黑断玉永沉荒泽，再无回音'
                      ) : (
                        <>
                          羁绊感应：{getLivingAffectionPhrase(runtime, partner, canBondInSanctuary)}
                          {tianjiInsight ? `（情谊 ${runtime.affection}）` : ''}
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
                      {resolvedBio}
                    </div>
                    {onOpenSanctuary && !sealed && !hostile && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => onOpenSanctuary(cid)}
                        >
                          {sanctuaryClosed
                            ? '入仙缘雅阁 · 览旧信 / 编年'
                            : deceased
                            ? '赴仙缘雅阁 · 焚香追思 / 读旧信'
                            : suFarewell
                            ? '入仙缘雅阁 · 览旧信 / 编年（垂暮请赴槐阴）'
                            : suSeniorAct5
                            ? '入仙缘雅阁 · 驿札往来 / 读旧信'
                            : state.act === 'act1'
                            ? '入仙缘雅阁 · 雅叙 / 赠礼'
                            : '入仙缘雅阁 · 雅叙 / 赠礼 / 结契'}
                        </button>
                      </div>
                    )}
                    {runtime.chronicle.length > 0 && (
                      <ul className="chronicle-list">
                        {runtime.chronicle.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ==================== 九州世局（六方势力、灵脉天象与六卷进程） ==================== */}
          {activeTab === 'world' && state && (
            <WorldStatusPanel
              state={state}
              registry={registry}
              tianjiInsight={tianjiInsight}
            />
          )}

          {/* ==================== 仙缘雅阁（道侣与高阶互动界面） ==================== */}
          {activeTab === 'sanctuary' && state && onUpdateState && (
            <CompanionSanctuary
              state={state}
              registry={registry}
              tianjiInsight={tianjiInsight}
              initialCompanionId={selectedSanctuaryId}
              onUpdateState={onUpdateState}
            />
          )}

          {/* ==================== 命盘刻痕（存档与回溯） ==================== */}
          {activeTab === 'saves' && (
            <>
              <div className="drawer-section">
                <h3>{state ? '手动刻录与命盘迁移' : '命盘迁移（导入备份）'}</h3>
                {state && (
                  <>
                    <div className="save-input-row">
                      <input
                        className="ink-input"
                        aria-label="手动命盘备注名称"
                        placeholder="备注节点名称（如：筑基前夕）"
                        value={saveLabel}
                        onChange={(e) => setSaveLabel(e.target.value)}
                      />
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => {
                          onCreateManualSave(saveLabel);
                          setSaveLabel('');
                          setIoError(false);
                          setIoMessage('已刻下当前手动命盘。');
                        }}
                      >
                        刻录
                      </button>
                    </div>
                    {manualSlots.length >= 8 && (
                      <div className="save-warn">
                        手动命盘已满 8 槽，继续刻录将顶替最早一档「{manualSlots[7]?.label}」。
                      </div>
                    )}
                  </>
                )}

                <div className="save-io-actions">
                  {state && (
                    <button type="button" className="mini-btn" onClick={handleExport}>
                      拓印命盘文匣 (.json)
                    </button>
                  )}
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => {
                      setShowImportBox((v) => !v);
                      setExportDraft('');
                    }}
                  >
                    录回命盘文匣
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    选取文匣文件 (.json)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleImportFile}
                  />
                </div>

                {exportDraft && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      className="ink-input io-code-area"
                      aria-label="导出的命盘 JSON 文本"
                      rows={4}
                      readOnly
                      value={exportDraft}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={handleDownloadJson}
                      >
                        保存文匣文件 (.json)
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => setExportDraft('')}
                      >
                        收起
                      </button>
                    </div>
                  </div>
                )}

                {showImportBox && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      className="ink-input io-code-area"
                      aria-label="粘贴导入的命盘 JSON 文本"
                      rows={4}
                      placeholder="粘贴先前导出的命盘 JSON……"
                      value={importDraft}
                      onChange={(e) => setImportDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="mini-btn"
                      style={{ marginTop: 6 }}
                      onClick={() => runImportRaw(importDraft)}
                    >
                      确认导入并恢复
                    </button>
                  </div>
                )}

                {ioMessage && (
                  <div
                    role="status"
                    style={{
                      marginTop: 8,
                      fontSize: '0.8125rem',
                      color: ioError ? 'var(--danger)' : 'var(--jade)',
                    }}
                  >
                    {ioMessage}
                  </div>
                )}
              </div>

              <div className="drawer-section">
                <h3>关键节点自动刻痕（可回溯此节点，重择前路）</h3>
                {sortedCheckpoints.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>尚无自动命盘刻痕。</div>
                ) : (
                  sortedCheckpoints.map((rec) => {
                    const isCurrentRun = Boolean(
                      state && rec.state.runId === state.runId
                    );
                    const timeStr = formatSaveTime(rec.savedAt);
                    return (
                      <div className="save-row" key={rec.id}>
                        <div className="save-meta-line">
                          <strong>{rec.label}</strong>
                          {state && (
                            <span
                              className={`stance-badge ${isCurrentRun ? 'accent' : ''}`}
                            >
                              {isCurrentRun ? '本世' : '往世'}
                            </span>
                          )}
                          {rec.state.pendingTransition && (
                            <span className="stance-badge warm">后文待展</span>
                          )}
                          {timeStr && <span className="save-time">{timeStr}</span>}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                          {rec.state.profile.name} · {rec.summary}
                        </div>
                        <div className="save-row-actions">
                          <button
                            type="button"
                            className="mini-btn"
                            aria-label={`回溯至自动刻痕：${rec.label}`}
                            onClick={() => onLoadSave(rec)}
                          >
                            回溯至此
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="drawer-section">
                <h3>命盘手录（{manualSlots.length} / 8）</h3>
                {manualSlots.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>尚未刻录手动命盘。</div>
                ) : (
                  manualSlots.map((rec) => {
                    const timeStr = formatSaveTime(rec.savedAt);
                    const isConfirming = confirmDeleteId === rec.id;
                    return (
                      <div className="save-row" key={rec.id}>
                        <div className="save-meta-line">
                          <strong>{rec.label}</strong>
                          {rec.state.pendingTransition && (
                            <span className="stance-badge warm">后文待展</span>
                          )}
                          {timeStr && <span className="save-time">{timeStr}</span>}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                          {rec.state.profile.name} · {rec.summary}
                        </div>
                        <div className="save-row-actions">
                          <button
                            type="button"
                            className="mini-btn"
                            aria-label={`读取手动命盘：${rec.label}`}
                            onClick={() => onLoadSave(rec)}
                          >
                            读取此盘
                          </button>
                          <button
                            type="button"
                            className={`mini-btn ${isConfirming ? 'mini-btn-danger' : ''}`}
                            aria-label={
                              isConfirming
                                ? `确认抹去手动命盘：${rec.label}`
                                : `抹去手动命盘：${rec.label}`
                            }
                            onClick={() => {
                              if (isConfirming) {
                                onDeleteManualSave(rec.id);
                                setConfirmDeleteId(null);
                                window.setTimeout(() => {
                                  closeBtnRef.current?.focus({ preventScroll: true });
                                }, 0);
                              } else {
                                setConfirmDeleteId(rec.id);
                              }
                            }}
                          >
                            {isConfirming ? '确认抹去？' : '抹去'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ==================== 万象志（跨周目元进度） ==================== */}
          {activeTab === 'meta' && (
            <>
              <div className="drawer-section">
                <h3>轮回总览</h3>
                <div className="meta-overview-row">
                  <span style={{ whiteSpace: 'nowrap' }}>
                    累计步入仙途 <strong>{meta.totalRuns}</strong> 世
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    已窥天机残卷{' '}
                    <strong>
                      {meta.unlockedTruthClues.length} / {Object.keys(registry.truthClues).length}
                    </strong>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    已历终局{' '}
                    <strong>
                      {meta.unlockedEndings.length} / {Object.keys(registry.endings).length}
                    </strong>
                  </span>
                </div>
                <div className="meta-overview-row meta-overview-sub">
                  <span style={{ whiteSpace: 'nowrap' }}>
                    曾得具名奇物 <strong>{meta.seenRelics.length}</strong> /{' '}
                    {Object.keys(registry.relics).length}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    曾历宿命故人 <strong>{meta.metCompanions.length}</strong> /{' '}
                    {Object.keys(registry.companions).length}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    历世命格 <strong>{meta.seenTags.length}</strong> /{' '}
                    {Object.keys(registry.tags).length}
                  </span>
                </div>
                <div className="seal-tags">
                  {(Object.keys(registry.companions) as CompanionId[]).map((cid) => {
                    const compDef = registry.companions[cid];
                    const best = meta.companionBestStance[cid] ?? 'unmet';
                    const stanceInfo = STANCE_LABELS[best];
                    const displayName =
                      best === 'unmet'
                        ? compDef.faction.split(' · ')[0]
                        : compDef.name;
                    return (
                      <span
                        key={cid}
                        className={`stance-badge ${stanceInfo.tone}`}
                      >
                        {displayName}：{best === 'unmet' ? '未遇' : stanceInfo.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="drawer-section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    九州奇物录（{meta.seenRelics.length} / {Object.keys(registry.relics).length}）
                  </h3>
                  <button
                    type="button"
                    className="mini-btn"
                    aria-expanded={showRelicsCatalog}
                    onClick={() => setShowRelicsCatalog((v) => !v)}
                  >
                    {showRelicsCatalog ? '收起奇物录' : '展开图鉴'}
                  </button>
                </div>
                {showRelicsCatalog &&
                  Object.values(registry.relics).map((relic) => {
                    const seen = meta.seenRelics.includes(relic.id);
                    if (!seen) {
                      return (
                        <div className="card-block-compact" key={relic.id}>
                          <span>未得奇物 · {relic.rarity}</span>
                          <span style={{ fontSize: '0.75rem' }}>
                            {RELIC_ORIGIN_HINTS[relic.id] ?? '九州机缘'}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="card-block" key={relic.id}>
                        <div className="card-block-head">
                          <strong>【{relic.name}】</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                            {relic.rarity}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                          {relic.desc}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="drawer-section">
                <h3>长明三千年 · 天机残卷</h3>
                {Object.values(registry.truthClues).map((clue) => {
                  const unlocked = meta.unlockedTruthClues.includes(clue.id);
                  if (!unlocked) {
                    const actHint =
                      clue.act === 'act2'
                        ? '卷二 · 尘封秘闻'
                        : clue.act === 'act3'
                        ? '卷三 · 九州暗流'
                        : clue.act === 'act4'
                        ? '卷四 · 劫世旧痕'
                        : '卷五 · 终局天机';
                    return (
                      <div className="card-block-compact" key={clue.id}>
                        <span>未明之谜</span>
                        <span style={{ fontSize: '0.75rem' }}>{actHint}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="card-block" key={clue.id}>
                      <div className="card-block-head">
                        <strong>✦ {clue.title}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {clue.sourceLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
                        {clue.excerpt}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="drawer-section">
                <h3>宿命终局录（全六卷）</h3>
                {Object.values(registry.endings).map((ending) => {
                  const unlocked = meta.unlockedEndings.includes(ending.id);
                  if (!unlocked) {
                    const lockedHint =
                      meta.unlockedEndings.length === 0
                        ? FOG_ENDING_HINTS[ending.id] ?? '未知岐路（初通任一终局后显线索）'
                        : ENDING_HINTS[ending.id] ?? '未踏此途';
                    return (
                      <div className="card-block-compact" key={ending.id}>
                        <span>？？？ · {lockedHint}</span>
                        <span className="stance-badge">{ending.tier}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="card-block" key={ending.id}>
                      <div className="card-block-head">
                        <strong>{ending.title}</strong>
                        <span className="stance-badge">{ending.tier}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                        {ending.poem}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
