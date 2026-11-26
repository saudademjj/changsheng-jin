import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CompanionId,
  CompanionStance,
  ContentRegistry,
  GameState,
  MetaArchive,
  SaveRecord,
} from '../engine/types';
import { STANCE_LABELS } from '../content/companions';
import { getDaoHeartSummary } from '../engine/scheduler';
import {
  exportSaveJson,
  formatSaveTime,
  importSaveJson,
  MAX_IMPORT_SAVE_BYTES,
} from '../engine/storage';
import { DrawerTab } from './TopStatusBar';

interface DrawerPanelsProps {
  activeTab: DrawerTab;
  state: GameState | null;
  registry: ContentRegistry;
  meta: MetaArchive;
  checkpoints: SaveRecord[];
  manualSlots: SaveRecord[];
  tianjiInsight: boolean;
  instantText: boolean;
  onToggleInstantText: () => void;
  onClose: () => void;
  onCreateManualSave: (label: string) => void;
  onDeleteManualSave: (id: string) => void;
  onLoadSave: (record: SaveRecord) => void;
  onImportState: (imported: GameState) => void;
}

function getAffectionPhrase(stance: CompanionStance, affection: number): string {
  if (stance === 'estranged') return '恩断义绝，各行其道';
  if (stance === 'rival') return '道途相左，锋芒相向';
  if (stance === 'bonded' || affection >= 60) return '生死可托，情深难言';
  if (stance === 'confidant' || affection >= 20) return '彼此信任，惺惺相惜';
  if (affection >= 10) return '颇有善意，留有余韵';
  if (affection > -10) return '淡如君子，尚在试探';
  if (affection > -25) return '心存芥蒂，锋芒暗藏';
  return '冰炭难容，道途殊绝';
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ENDING_HINTS: Record<string, string> = {
  ending_lifespan: '卷二至四 · 寿尽未破天堑',
  ending_blood_demon: '卷二至四 · 强纳血煞魔气反噬',
  ending_fallen_path: '卷二至五 · 底蕴未足强冲大关',
  ending_qingzhou_hearth: '卷二/三 · 杏林深情止步红尘',
  ending_merchant_lord: '卷二 · 聚财六百五十石或商名厚资坐断青岚',
  ending_sever_sky_bonded: '卷六 · 集五卷天机并携心许故人破门',
  ending_sever_sky_solo: '卷六 · 集五卷天机孤锋独断九霄',
  ending_mortal_new_era: '卷六 · 承无灵之志焚尽灵根牧种',
  ending_gilded_realm: '卷六 · 凭灵脉契或千金商网退仙使',
  ending_demonic_devour: '卷六 · 负吞煞魔威逆吞天门金光',
  ending_earth_immortal: '卷五/六 · 高心境或无灵印假死隐世',
  ending_false_ascension: '卷六 · 收剑低眉步入接引金光',
};

const RELIC_ORIGIN_HINTS: Record<string, string> = {
  charred_jade_relic: '开局宿缘「拾得焦黑断玉」、卷二古脉或卷三古战场',
  qingzhou_silver_needle: '开局宿缘「青州杏林旧约」驻留相助',
  baibao_token: '开局暗市密信、卷二血丹暗线或拜访谢无咎购得',
  broken_gathering_array: '卷一/二青岚坊市秘藏',
  qingyun_sword_tally: '卷一终章投考青云剑宗外门',
  foundation_pill: '卷二坊市秘藏或暗潮重赏',
  blood_foundation_pill: '卷一南市/茶肆或卷二血丹暗线',
  longevity_dew: '卷二至四坊市秘藏',
  heaven_dust_shard: '卷二青州古脉临摹逆阵撬得',
  ancient_stele_rubbing: '卷二青云禁地飞升碑背拓得',
  soul_nourishing_wood: '卷三古战场荒泽或卷四黑市秘拍',
  golden_core_elixir: '卷三奇珍楼或天机总坛密库',
  severing_sword_embryo: '卷三仙盟秘阁、卷四绝渊铁坛或卷五易物会',
  spirit_vein_deed: '卷三天机总坛或卷四赤阳停战',
  mortal_hearth_talisman: '卷三青州杏林或卷四槐阴古碑',
  broken_sky_seal: '卷四绝渊铁坛、黑市或卷五群雄会',
  ascension_ledger: '卷四赤阳灵脉大战破天机总库',
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
    companions: '故人志',
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
            className="nav-btn"
            onClick={onClose}
          >
            合卷 ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* ==================== 行囊与命格 ==================== */}
          {activeTab === 'status' && state && (
            <>
              <div className="drawer-section">
                <h3>道身与底蕴</h3>
                <div style={{ marginBottom: 10 }}>
                  <strong>{state.profile.name}</strong>（{state.profile.honorific}） ·{' '}
                  {registry.realms[state.realm]?.name} · 道心意境：
                  <span style={{ color: 'var(--accent)' }}>
                    {getDaoHeartSummary(state)}
                  </span>
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
              </div>

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
                      长明{h.year}年{h.season}（{h.ageYears}岁）
                    </strong>{' '}
                    · {h.summary}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ==================== 故人志 ==================== */}
          {activeTab === 'companions' && state && (
            <div className="drawer-section">
              <h3>四位宿命故人</h3>
              {(Object.keys(registry.companions) as CompanionId[]).map((cid) => {
                const def = registry.companions[cid];
                const runtime = state.companions[cid];
                const stanceInfo = STANCE_LABELS[runtime.stance];

                if (!runtime.met) {
                  return (
                    <div className="card-block card-block-muted" key={cid}>
                      <div className="card-block-head">
                        <strong>未启之卷 · {def.faction}</strong>
                        <span className="stance-badge">素未谋面</span>
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

                return (
                  <div className="card-block" key={cid}>
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
                      <span className={`stance-badge ${stanceInfo.tone}`}>
                        {stanceInfo.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--accent)',
                        marginBottom: 6,
                      }}
                    >
                      羁绊感应：{getAffectionPhrase(runtime.stance, runtime.affection)}
                      {tianjiInsight ? `（好感 ${runtime.affection}）` : ''}
                    </div>
                    <div style={{ fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
                      {resolvedBio}
                    </div>
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {state && (
                    <button type="button" className="mini-btn" onClick={handleExport}>
                      导出命盘 JSON
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
                    粘贴导入 JSON
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    选取 .json 文件
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
                        下载 .json 文件
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
                <h3>关键节点自动刻痕（可一键回溯重选分支）</h3>
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
                            <span className="stance-badge warm">演绎待翻页</span>
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
                <h3>手动命盘槽位（{manualSlots.length} / 8）</h3>
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
                            <span className="stance-badge warm">演绎待翻页</span>
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
                    已窥天机碎片{' '}
                    <strong>
                      {meta.unlockedTruthClues.length} / {Object.keys(registry.truthClues).length}
                    </strong>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    已解锁结局{' '}
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
                <h3>长明三千年 · 天机真相拼图</h3>
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
                <h3>宿命结局录（全六卷）</h3>
                {Object.values(registry.endings).map((ending) => {
                  const unlocked = meta.unlockedEndings.includes(ending.id);
                  if (!unlocked) {
                    return (
                      <div className="card-block-compact" key={ending.id}>
                        <span>
                          ？？？ · {ENDING_HINTS[ending.id] ?? '未踏此途'}
                        </span>
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
