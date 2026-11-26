import {
  ActId,
  CompanionId,
  CompanionRuntimeState,
  CompanionStance,
  ContentRegistry,
  GameState,
  Gender,
  HistoryEntry,
  MarketHolding,
  MetaArchive,
  PendingTransition,
  RealmId,
  SaveRecord,
} from './types';
import { formatCalendarDate, getAgeYears } from './time';
import { SCHEMA_VERSION } from './scheduler';

export const STORAGE_KEYS = {
  ACTIVE_RUN: 'changshengjin_active_run_v1',
  AUTO_CHECKPOINTS: 'changshengjin_checkpoints_v1',
  MANUAL_SLOTS: 'changshengjin_manual_slots_v1',
  META_ARCHIVE: 'changshengjin_meta_v1',
  PREFS: 'changshengjin_prefs_v1',
};

const KEYS = STORAGE_KEYS;

export interface UserPrefs {
  theme: 'parchment' | 'ink';
  tianjiInsight: boolean;
  instantText: boolean;
}

const DEFAULT_PREFS: UserPrefs = {
  theme: 'parchment',
  tianjiInsight: false,
  instantText: false,
};

const VALID_ACTS = new Set<ActId>(['act1', 'act2', 'act3', 'act4', 'act5', 'act6']);
const VALID_GENDERS = new Set<Gender>(['male', 'female', 'other']);
const VALID_REALMS = new Set<RealmId>([
  'mortal',
  'qi_early',
  'qi_mid',
  'qi_late',
  'qi_peak',
  'foundation_early',
  'foundation_mid',
  'foundation_late',
  'golden_core',
  'nascent_soul',
  'deity_transform',
]);
const VALID_STANCES = new Set<CompanionStance>([
  'unmet',
  'stranger',
  'rival',
  'confidant',
  'bonded',
  'estranged',
]);
const COMPANION_IDS: CompanionId[] = [
  'shen_qingshuang',
  'xie_wujiu',
  'su_zhiwei',
  'cang_ming',
];
const ACT_FALLBACK_HUB: Record<ActId, string> = {
  act1: 'act1_qinglan_arrival',
  act2: 'act2_hub',
  act3: 'act3_hub',
  act4: 'act4_hub',
  act5: 'act5_hub',
  act6: 'act5_hub',
};

const STANCE_RANK: Record<CompanionStance, number> = {
  unmet: 0,
  stranger: 1,
  rival: 2,
  estranged: 2,
  confidant: 3,
  bonded: 4,
};

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStore = new Map<string, string>();
const fallbackAdapter: StorageAdapter = {
  getItem: (k) => memoryStore.get(k) ?? null,
  setItem: (k, v) => {
    memoryStore.set(k, v);
  },
  removeItem: (k) => {
    memoryStore.delete(k);
  },
};

function getAdapter(custom?: StorageAdapter): StorageAdapter {
  if (custom) return custom;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return fallbackAdapter;
  }
  return fallbackAdapter;
}

function safeGetItem(key: string, adapter?: StorageAdapter): string | null {
  try {
    return getAdapter(adapter).getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(
  key: string,
  value: string,
  adapter?: StorageAdapter
): boolean {
  try {
    getAdapter(adapter).setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string, adapter?: StorageAdapter): boolean {
  try {
    getAdapter(adapter).removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const MAX_IMPORT_SAVE_BYTES = 512 * 1024;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function hasOwnKey(obj: object, key: string): boolean {
  return !FORBIDDEN_KEYS.has(key) && Object.prototype.hasOwnProperty.call(obj, key);
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === 'string');
}

function normalizeCompanion(raw: unknown): CompanionRuntimeState {
  if (!isPlainObject(raw)) {
    return { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] };
  }
  const met = Boolean(raw.met);
  const stanceRaw = raw.stance;
  const stance: CompanionStance = !met
    ? 'unmet'
    : typeof stanceRaw === 'string' && VALID_STANCES.has(stanceRaw as CompanionStance)
    ? (stanceRaw as CompanionStance)
    : 'stranger';
  return {
    met,
    metAtAgeMonths: isFiniteNum(raw.metAtAgeMonths)
      ? clampInt(raw.metAtAgeMonths, 0, 120000)
      : undefined,
    lastSeenAgeMonths: isFiniteNum(raw.lastSeenAgeMonths)
      ? clampInt(raw.lastSeenAgeMonths, 0, 120000)
      : undefined,
    affection: isFiniteNum(raw.affection)
      ? Math.max(-100, Math.min(500, Math.round(raw.affection)))
      : 0,
    stance,
    stage: isFiniteNum(raw.stage) ? clampInt(raw.stage, 0, 10) : 0,
    chronicle: toStringArray(raw.chronicle)
      .slice(-100)
      .map((s) => s.slice(0, 260)),
  };
}

function normalizePendingTransition(raw: unknown): PendingTransition | undefined {
  if (!isPlainObject(raw)) return undefined;
  if (
    typeof raw.chosenLabel !== 'string' ||
    typeof raw.nextSceneId !== 'string' ||
    !raw.nextSceneId ||
    typeof raw.continueLabel !== 'string'
  ) {
    return undefined;
  }
  return {
    chosenLabel: raw.chosenLabel,
    originParagraphs: toStringArray(raw.originParagraphs),
    paragraphs: toStringArray(raw.paragraphs),
    continueLabel: raw.continueLabel,
    nextSceneId: raw.nextSceneId,
    notices: toStringArray(raw.notices),
  };
}

export function validateAndNormalizeState(
  raw: unknown,
  registry?: ContentRegistry
): GameState | null {
  if (!isPlainObject(raw)) return null;

  const schemaVersion = raw.schemaVersion;
  if (
    schemaVersion !== undefined &&
    (!isFiniteNum(schemaVersion) || schemaVersion < 1 || schemaVersion > SCHEMA_VERSION)
  ) {
    return null;
  }

  if (!isPlainObject(raw.profile)) return null;
  const profileRaw = raw.profile;
  if (typeof profileRaw.name !== 'string' || profileRaw.name.trim().length === 0) {
    return null;
  }
  const gender: Gender =
    typeof profileRaw.gender === 'string' && VALID_GENDERS.has(profileRaw.gender as Gender)
      ? (profileRaw.gender as Gender)
      : 'other';

  if (
    !isFiniteNum(raw.year) ||
    !isFiniteNum(raw.seasonIndex) ||
    !isFiniteNum(raw.ageMonths) ||
    !isFiniteNum(raw.lifespanYears) ||
    !isFiniteNum(raw.might) ||
    !isFiniteNum(raw.mind) ||
    !isFiniteNum(raw.renown) ||
    !isFiniteNum(raw.spiritStones)
  ) {
    return null;
  }

  if (typeof raw.act !== 'string' || !VALID_ACTS.has(raw.act as ActId)) {
    return null;
  }
  if (typeof raw.realm !== 'string' || !VALID_REALMS.has(raw.realm as RealmId)) {
    return null;
  }
  if (typeof raw.currentSceneId !== 'string' || raw.currentSceneId.trim().length === 0) {
    return null;
  }

  const act = raw.act as ActId;
  const realm = raw.realm as RealmId;

  const alignmentRaw = isPlainObject(raw.alignment) ? raw.alignment : {};
  const flagsRaw = isPlainObject(raw.flags) ? raw.flags : {};
  const flags: Record<string, boolean | number | string> = {};
  for (const [k, v] of Object.entries(flagsRaw)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (typeof v === 'boolean') {
      flags[k] = v;
    } else if (typeof v === 'string') {
      flags[k] = v.slice(0, 200);
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      flags[k] = v;
    }
  }

  const actionUses: Record<string, number> = {};
  if (isPlainObject(raw.actionUses)) {
    for (const [k, v] of Object.entries(raw.actionUses)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      if (isFiniteNum(v)) actionUses[k] = clampInt(v, 0, 100000);
    }
  }

  const actionLastTurn: Record<string, number> = {};
  if (isPlainObject(raw.actionLastTurn)) {
    for (const [k, v] of Object.entries(raw.actionLastTurn)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      if (isFiniteNum(v)) actionLastTurn[k] = clampInt(v, 0, 100000);
    }
  }

  const marketRaw = isPlainObject(raw.market) ? raw.market : {};
  const holdings: Record<string, MarketHolding> = {};
  if (isPlainObject(marketRaw.holdings)) {
    for (const [gid, h] of Object.entries(marketRaw.holdings)) {
      if (FORBIDDEN_KEYS.has(gid)) continue;
      if (registry && !hasOwnKey(registry.marketGoods, gid)) continue;
      if (isPlainObject(h) && isFiniteNum(h.qty) && isFiniteNum(h.avgCost)) {
        const qty = clampInt(h.qty, 0, 100000);
        if (qty > 0) {
          holdings[gid] = {
            qty,
            avgCost: Math.max(0, Math.min(10000000, h.avgCost)),
          };
        }
      }
    }
  }

  const companionsRaw = isPlainObject(raw.companions) ? raw.companions : {};
  const companions = {} as Record<CompanionId, CompanionRuntimeState>;
  for (const cid of COMPANION_IDS) {
    companions[cid] = normalizeCompanion(
      hasOwnKey(companionsRaw, cid) ? companionsRaw[cid] : undefined
    );
  }

  const historyLog: HistoryEntry[] = [];
  if (Array.isArray(raw.historyLog)) {
    for (const entry of raw.historyLog) {
      if (
        isPlainObject(entry) &&
        isFiniteNum(entry.year) &&
        typeof entry.season === 'string' &&
        isFiniteNum(entry.ageYears) &&
        typeof entry.title === 'string' &&
        typeof entry.summary === 'string'
      ) {
        historyLog.push({
          year: clampInt(entry.year, 1, 99999),
          season: (['春', '夏', '秋', '冬'].includes(entry.season)
            ? entry.season
            : '春') as HistoryEntry['season'],
          ageYears: clampInt(entry.ageYears, 0, 10000),
          title: entry.title.slice(0, 60),
          summary: entry.summary.slice(0, 260),
        });
      }
    }
  }
  const cappedHistoryLog = historyLog.slice(-500);

  let normalizedAct: ActId = act;
  let currentSceneId = raw.currentSceneId;
  let pendingTransition = normalizePendingTransition(raw.pendingTransition);
  let endingId =
    typeof raw.endingId === 'string' && raw.endingId.trim().length > 0
      ? raw.endingId
      : undefined;
  const recentNotices = toStringArray(raw.recentNotices);

  if (registry) {
    if (!hasOwnKey(registry.scenes, currentSceneId)) {
      const fallbackId = ACT_FALLBACK_HUB[normalizedAct];
      if (!fallbackId || !hasOwnKey(registry.scenes, fallbackId)) {
        return null;
      }
      currentSceneId = fallbackId;
      pendingTransition = undefined;
      recentNotices.unshift('旧版命盘所处节点已更迭，已自动为你接回本卷枢纽。');
    }

    const resolvedScene = registry.scenes[currentSceneId];
    if (
      resolvedScene &&
      !currentSceneId.startsWith('visit_') &&
      !resolvedScene.isEndingTrigger &&
      resolvedScene.act !== normalizedAct
    ) {
      normalizedAct = resolvedScene.act;
    }

    if (
      pendingTransition &&
      !hasOwnKey(registry.scenes, pendingTransition.nextSceneId)
    ) {
      pendingTransition = undefined;
    }

    if (endingId && !hasOwnKey(registry.endings, endingId)) {
      endingId = undefined;
    }
    if (!endingId) {
      const triggerEnding = registry.scenes[currentSceneId]?.isEndingTrigger;
      if (triggerEnding && hasOwnKey(registry.endings, triggerEnding)) {
        endingId = triggerEnding;
      }
    }
  }

  if (endingId) {
    pendingTransition = undefined;
  }

  const rawTags = Array.from(new Set(toStringArray(raw.tags)));
  const tags = registry ? rawTags.filter((id) => hasOwnKey(registry.tags, id)) : rawTags;
  const rawClues = Array.from(new Set(toStringArray(raw.truthClues)));
  const truthClues = registry
    ? rawClues.filter((id) => hasOwnKey(registry.truthClues, id))
    : rawClues;
  const rawRelics = Array.from(new Set(toStringArray(raw.relics)));
  const relics = registry ? rawRelics.filter((id) => hasOwnKey(registry.relics, id)) : rawRelics;

  const rawOriginId =
    typeof profileRaw.originId === 'string' && profileRaw.originId.trim().length > 0
      ? profileRaw.originId.trim()
      : 'herbalist';
  const originId =
    registry && !registry.origins.some((o) => o.id === rawOriginId)
      ? registry.origins[0]?.id ?? 'herbalist'
      : rawOriginId;

  const rawDaoHeartId =
    typeof profileRaw.daoHeartId === 'string' && profileRaw.daoHeartId.trim().length > 0
      ? profileRaw.daoHeartId.trim()
      : 'seek_truth';
  const daoHeartId =
    registry && !registry.daoHearts.some((d) => d.id === rawDaoHeartId)
      ? registry.daoHearts[0]?.id ?? 'seek_truth'
      : rawDaoHeartId;

  const rawOpeningEventIds = Array.from(new Set(toStringArray(profileRaw.openingEventIds)));
  const openingEventIds = registry
    ? rawOpeningEventIds.filter((id) => registry.openingEvents.some((e) => e.id === id))
    : rawOpeningEventIds;

  const normalized: GameState = {
    schemaVersion: SCHEMA_VERSION,
    runId:
      typeof raw.runId === 'string' && raw.runId.trim().length > 0
        ? raw.runId
        : `run_recovered_${Date.now()}`,
    profile: {
      name: profileRaw.name.trim().slice(0, 12),
      gender,
      honorific:
        typeof profileRaw.honorific === 'string' && profileRaw.honorific.trim().length > 0
          ? profileRaw.honorific.trim().slice(0, 12)
          : '道友',
      originId,
      openingEventIds,
      daoHeartId,
    },
    year: clampInt(raw.year, 1, 99999),
    seasonIndex: ((Math.floor(raw.seasonIndex) % 4) + 4) % 4,
    ageMonths: clampInt(raw.ageMonths, 0, 120000),
    lifespanYears: clampInt(raw.lifespanYears, 1, 10000),
    lifespanBonus: isFiniteNum(raw.lifespanBonus)
      ? clampInt(raw.lifespanBonus, -500, 10000)
      : 0,
    realm,
    might: clampInt(raw.might, 0, 100000),
    mind: clampInt(raw.mind, 0, 100000),
    renown: clampInt(raw.renown, 0, 100000),
    alignment: {
      righteous: isFiniteNum(alignmentRaw.righteous)
        ? Math.max(-100, Math.min(100, Math.round(alignmentRaw.righteous)))
        : 0,
      worldly: isFiniteNum(alignmentRaw.worldly)
        ? Math.max(-100, Math.min(100, Math.round(alignmentRaw.worldly)))
        : 0,
    },
    tags,
    flags,
    truthClues,
    spiritStones: clampInt(raw.spiritStones, 0, 10000000),
    relics,
    market: {
      elixirIndex: isFiniteNum(marketRaw.elixirIndex)
        ? Math.max(0.55, Math.min(2.25, marketRaw.elixirIndex))
        : 1.0,
      artifactIndex: isFiniteNum(marketRaw.artifactIndex)
        ? Math.max(0.55, Math.min(2.25, marketRaw.artifactIndex))
        : 1.0,
      curioIndex: isFiniteNum(marketRaw.curioIndex)
        ? Math.max(0.55, Math.min(2.25, marketRaw.curioIndex))
        : 1.0,
      holdings,
      rumorText:
        typeof marketRaw.rumorText === 'string'
          ? marketRaw.rumorText.slice(0, 300)
          : '',
    },
    companions,
    act: normalizedAct,
    actBeat: isFiniteNum(raw.actBeat) ? clampInt(raw.actBeat, 0, 10000) : 0,
    totalActions: isFiniteNum(raw.totalActions)
      ? clampInt(raw.totalActions, 0, 100000)
      : 0,
    actionUses,
    actionLastTurn,
    activeThreads: Array.from(new Set(toStringArray(raw.activeThreads))),
    completedThreads: Array.from(new Set(toStringArray(raw.completedThreads))),
    completedScenes: Array.from(new Set(toStringArray(raw.completedScenes))),
    seenRandomEvents: Array.from(new Set(toStringArray(raw.seenRandomEvents))),
    currentSceneId,
    pendingReturnSceneId:
      typeof raw.pendingReturnSceneId === 'string' &&
      (!registry || hasOwnKey(registry.scenes, raw.pendingReturnSceneId))
        ? raw.pendingReturnSceneId
        : undefined,
    pendingTransition,
    lastBridgeNote:
      typeof raw.lastBridgeNote === 'string'
        ? raw.lastBridgeNote.slice(0, 300)
        : undefined,
    recentNotices: recentNotices.slice(0, 5).map((n) => n.slice(0, 200)),
    historyLog: cappedHistoryLog,
    endingId,
  };

  return normalized;
}

function normalizeSaveRecords(
  rawList: unknown,
  registry?: ContentRegistry
): SaveRecord[] {
  if (!Array.isArray(rawList)) return [];
  const valid: SaveRecord[] = [];
  for (const item of rawList) {
    if (!isPlainObject(item)) continue;
    const normalizedState = validateAndNormalizeState(item.state, registry);
    if (!normalizedState) continue;
    valid.push({
      id:
        typeof item.id === 'string' && item.id.trim().length > 0
          ? item.id
          : `save_${valid.length}_${Date.now()}`,
      kind: item.kind === 'manual' ? 'manual' : 'auto',
      label:
        typeof item.label === 'string' && item.label.trim().length > 0
          ? item.label
          : '命盘刻痕',
      savedAt: isFiniteNum(item.savedAt) ? item.savedAt : Date.now(),
      summary:
        typeof item.summary === 'string' && item.summary.trim().length > 0
          ? item.summary
          : registry
          ? buildSaveSummary(normalizedState, registry)
          : `${formatCalendarDate(normalizedState.year, normalizedState.seasonIndex)} · ${getAgeYears(normalizedState.ageMonths)}岁`,
      state: normalizedState,
    });
  }
  return valid;
}

export function formatSaveTime(ts: number): string {
  if (!Number.isFinite(ts)) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildSaveSummary(
  state: GameState,
  registry: ContentRegistry
): string {
  const realm = registry.realms[state.realm]?.shortName ?? state.realm;
  return `${formatCalendarDate(state.year, state.seasonIndex)} · ${getAgeYears(state.ageMonths)}岁 · ${realm} · 灵石${state.spiritStones}`;
}

export function saveActiveRun(state: GameState, adapter?: StorageAdapter): boolean {
  return safeSetItem(KEYS.ACTIVE_RUN, JSON.stringify(state), adapter);
}

export function loadActiveRun(
  adapter?: StorageAdapter,
  registry?: ContentRegistry
): GameState | null {
  const parsed = safeParse<unknown>(safeGetItem(KEYS.ACTIVE_RUN, adapter), null);
  return validateAndNormalizeState(parsed, registry);
}

export function clearActiveRun(adapter?: StorageAdapter): void {
  safeRemoveItem(KEYS.ACTIVE_RUN, adapter);
}

export function loadCheckpoints(
  adapter?: StorageAdapter,
  registry?: ContentRegistry
): SaveRecord[] {
  const parsed = safeParse<unknown>(safeGetItem(KEYS.AUTO_CHECKPOINTS, adapter), []);
  return normalizeSaveRecords(parsed, registry);
}

export function recordCheckpoint(
  state: GameState,
  label: string,
  registry: ContentRegistry,
  kind: 'auto' = 'auto',
  adapter?: StorageAdapter
): SaveRecord[] {
  const list = loadCheckpoints(adapter, registry);
  const record: SaveRecord = {
    id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind,
    label,
    savedAt: Date.now(),
    summary: buildSaveSummary(state, registry),
    state,
  };
  // 若同场景同大势节拍已有更年轻的刻痕（如关口慢磨后重入），保留年轻档避免覆写反悔点
  const hasYoungerSameBeat = list.some(
    (item) =>
      item.kind === kind &&
      item.state.runId === state.runId &&
      item.state.currentSceneId === state.currentSceneId &&
      item.state.actBeat === state.actBeat &&
      item.state.ageMonths < state.ageMonths
  );
  if (hasYoungerSameBeat) {
    return list;
  }
  // 去重同场景同run的紧邻重复刻痕
  const filtered = list.filter(
    (item) =>
      !(
        item.kind === kind &&
        item.state.runId === state.runId &&
        item.state.currentSceneId === state.currentSceneId &&
        item.state.actBeat === state.actBeat
      )
  );
  const next = [record, ...filtered].slice(0, 24);
  safeSetItem(KEYS.AUTO_CHECKPOINTS, JSON.stringify(next), adapter);
  return next;
}

export function loadManualSlots(
  adapter?: StorageAdapter,
  registry?: ContentRegistry
): SaveRecord[] {
  const parsed = safeParse<unknown>(safeGetItem(KEYS.MANUAL_SLOTS, adapter), []);
  return normalizeSaveRecords(parsed, registry);
}

export function saveManualSlot(
  state: GameState,
  label: string,
  registry: ContentRegistry,
  adapter?: StorageAdapter
): SaveRecord[] {
  const list = loadManualSlots(adapter, registry);
  const record: SaveRecord = {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'manual',
    label: label.trim() || `${state.profile.name} · 手动命盘`,
    savedAt: Date.now(),
    summary: buildSaveSummary(state, registry),
    state,
  };
  const next = [record, ...list].slice(0, 8);
  safeSetItem(KEYS.MANUAL_SLOTS, JSON.stringify(next), adapter);
  return next;
}

export function deleteManualSlot(
  id: string,
  adapter?: StorageAdapter,
  registry?: ContentRegistry
): SaveRecord[] {
  const next = loadManualSlots(adapter, registry).filter((s) => s.id !== id);
  safeSetItem(KEYS.MANUAL_SLOTS, JSON.stringify(next), adapter);
  return next;
}

export function createEmptyMeta(): MetaArchive {
  return {
    schemaVersion: SCHEMA_VERSION,
    totalRuns: 0,
    unlockedEndings: [],
    unlockedTruthClues: [],
    seenRelics: [],
    seenTags: [],
    companionBestStance: {},
    metCompanions: [],
  };
}

export function loadMetaArchive(
  adapter?: StorageAdapter,
  registry?: ContentRegistry
): MetaArchive {
  const empty = createEmptyMeta();
  const parsed = safeParse<unknown>(safeGetItem(KEYS.META_ARCHIVE, adapter), null);
  if (!isPlainObject(parsed)) return empty;

  const bestStance: Partial<Record<CompanionId, CompanionStance>> = {};
  if (isPlainObject(parsed.companionBestStance)) {
    for (const cid of COMPANION_IDS) {
      const s = parsed.companionBestStance[cid];
      if (typeof s === 'string' && VALID_STANCES.has(s as CompanionStance)) {
        bestStance[cid] = s as CompanionStance;
      }
    }
  }

  const metCompanions = Array.from(
    new Set(
      toStringArray(parsed.metCompanions).filter((cid): cid is CompanionId =>
        COMPANION_IDS.includes(cid as CompanionId)
      )
    )
  );
  const rawEndings = Array.from(new Set(toStringArray(parsed.unlockedEndings)));
  const rawClues = Array.from(new Set(toStringArray(parsed.unlockedTruthClues)));
  const rawRelics = Array.from(new Set(toStringArray(parsed.seenRelics)));
  const rawTags = Array.from(new Set(toStringArray(parsed.seenTags)));

  return {
    schemaVersion: SCHEMA_VERSION,
    totalRuns: isFiniteNum(parsed.totalRuns) ? clampInt(parsed.totalRuns, 0, 100000) : 0,
    unlockedEndings: registry
      ? rawEndings.filter((id) => hasOwnKey(registry.endings, id))
      : rawEndings.filter((id) => !FORBIDDEN_KEYS.has(id)),
    unlockedTruthClues: registry
      ? rawClues.filter((id) => hasOwnKey(registry.truthClues, id))
      : rawClues.filter((id) => !FORBIDDEN_KEYS.has(id)),
    seenRelics: registry
      ? rawRelics.filter((id) => hasOwnKey(registry.relics, id))
      : rawRelics.filter((id) => !FORBIDDEN_KEYS.has(id)),
    seenTags: registry
      ? rawTags.filter((id) => hasOwnKey(registry.tags, id))
      : rawTags.filter((id) => !FORBIDDEN_KEYS.has(id)),
    companionBestStance: bestStance,
    metCompanions,
  };
}

export function syncMetaFromState(
  state: GameState,
  options?: { incrementRuns?: boolean },
  adapter?: StorageAdapter,
  registry?: ContentRegistry
): MetaArchive {
  const meta = loadMetaArchive(adapter, registry);
  const validEndingId =
    state.endingId &&
    (registry
      ? hasOwnKey(registry.endings, state.endingId)
      : !FORBIDDEN_KEYS.has(state.endingId))
      ? state.endingId
      : undefined;
  const validClues = registry
    ? state.truthClues.filter((id) => hasOwnKey(registry.truthClues, id))
    : state.truthClues.filter((id) => !FORBIDDEN_KEYS.has(id));
  const validRelics = registry
    ? state.relics.filter((id) => hasOwnKey(registry.relics, id))
    : state.relics.filter((id) => !FORBIDDEN_KEYS.has(id));
  const validTags = registry
    ? state.tags.filter((id) => hasOwnKey(registry.tags, id))
    : state.tags.filter((id) => !FORBIDDEN_KEYS.has(id));

  const hasImportedProgress =
    state.totalActions > 0 ||
    Boolean(validEndingId) ||
    validClues.length > 0 ||
    validRelics.length > 0;
  const nextTotalRuns = Math.min(
    100000,
    meta.totalRuns +
      (options?.incrementRuns
        ? 1
        : meta.totalRuns === 0 && hasImportedProgress
        ? 1
        : 0)
  );
  const next: MetaArchive = {
    ...meta,
    totalRuns: nextTotalRuns,
    unlockedEndings: [...meta.unlockedEndings],
    unlockedTruthClues: [...meta.unlockedTruthClues],
    seenRelics: [...meta.seenRelics],
    seenTags: [...meta.seenTags],
    companionBestStance: { ...meta.companionBestStance },
    metCompanions: [...meta.metCompanions],
  };

  if (validEndingId && !next.unlockedEndings.includes(validEndingId)) {
    next.unlockedEndings.push(validEndingId);
  }
  for (const clue of validClues) {
    if (!next.unlockedTruthClues.includes(clue)) {
      next.unlockedTruthClues.push(clue);
    }
  }
  for (const relic of validRelics) {
    if (!next.seenRelics.includes(relic)) {
      next.seenRelics.push(relic);
    }
  }
  for (const tag of validTags) {
    if (!next.seenTags.includes(tag)) {
      next.seenTags.push(tag);
    }
  }
  for (const cid of COMPANION_IDS) {
    const comp = hasOwnKey(state.companions, cid) ? state.companions[cid] : undefined;
    if (comp?.met) {
      if (!next.metCompanions.includes(cid)) {
        next.metCompanions.push(cid);
      }
      const prev = next.companionBestStance[cid];
      if (
        VALID_STANCES.has(comp.stance) &&
        (!prev || STANCE_RANK[comp.stance] > STANCE_RANK[prev])
      ) {
        next.companionBestStance[cid] = comp.stance;
      }
    }
  }

  safeSetItem(KEYS.META_ARCHIVE, JSON.stringify(next), adapter);
  return next;
}

export function exportSaveJson(state: GameState): string {
  return JSON.stringify(
    {
      format: 'changsheng-jin-save',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: Date.now(),
      state,
    },
    null,
    2
  );
}

export function importSaveJson(
  raw: string,
  registry?: ContentRegistry
): GameState | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_IMPORT_SAVE_BYTES) {
    return null;
  }
  try {
    const clean = raw.replace(/^\uFEFF/, '');
    const parsed = JSON.parse(clean) as unknown;
    if (!isPlainObject(parsed)) return null;
    if (parsed.format !== 'changsheng-jin-save') return null;
    if (
      parsed.schemaVersion !== undefined &&
      (!isFiniteNum(parsed.schemaVersion) ||
        parsed.schemaVersion < 1 ||
        parsed.schemaVersion > SCHEMA_VERSION)
    ) {
      return null;
    }
    return validateAndNormalizeState(parsed.state, registry);
  } catch {
    return null;
  }
}

export function loadPrefs(adapter?: StorageAdapter): UserPrefs {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parsed = safeParse<unknown>(safeGetItem(KEYS.PREFS, adapter), null);
  if (!isPlainObject(parsed)) {
    return {
      ...DEFAULT_PREFS,
      instantText: prefersReducedMotion ? true : DEFAULT_PREFS.instantText,
    };
  }
  return {
    theme:
      parsed.theme === 'ink' || parsed.theme === 'parchment'
        ? parsed.theme
        : DEFAULT_PREFS.theme,
    tianjiInsight:
      typeof parsed.tianjiInsight === 'boolean'
        ? parsed.tianjiInsight
        : DEFAULT_PREFS.tianjiInsight,
    instantText:
      typeof parsed.instantText === 'boolean'
        ? parsed.instantText
        : prefersReducedMotion
        ? true
        : DEFAULT_PREFS.instantText,
  };
}

export function savePrefs(prefs: UserPrefs, adapter?: StorageAdapter): void {
  safeSetItem(KEYS.PREFS, JSON.stringify(prefs), adapter);
}
