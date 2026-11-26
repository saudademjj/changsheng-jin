export type Season = '春' | '夏' | '秋' | '冬';
export type ActId = 'act1' | 'act2' | 'act3' | 'act4' | 'act5' | 'act6';
export type Gender = 'male' | 'female' | 'other';

export type RealmId =
  | 'mortal'
  | 'qi_early'
  | 'qi_mid'
  | 'qi_late'
  | 'qi_peak'
  | 'foundation_early'
  | 'foundation_mid'
  | 'foundation_late'
  | 'golden_core'
  | 'nascent_soul'
  | 'deity_transform';

export type CompanionId =
  | 'shen_qingshuang'
  | 'xie_wujiu'
  | 'su_zhiwei'
  | 'cang_ming';

export type CompanionStance =
  | 'unmet'
  | 'stranger'
  | 'rival'
  | 'confidant'
  | 'bonded'
  | 'estranged';

export type MarketCategory = 'elixir' | 'artifact' | 'curio';

export interface PlayerProfile {
  name: string;
  gender: Gender;
  honorific: string;
  originId: string;
  openingEventIds: string[];
  daoHeartId: string;
}

export interface CompanionRuntimeState {
  met: boolean;
  metAtAgeMonths?: number;
  lastSeenAgeMonths?: number;
  affection: number;
  stance: CompanionStance;
  /** 叙事阶段留痕（仅写不参与分支门控，门控统一以 stance / affection / flags 为准） */
  stage: number;
  chronicle: string[];
}

export interface MarketHolding {
  qty: number;
  avgCost: number;
}

export interface MarketState {
  elixirIndex: number;
  artifactIndex: number;
  curioIndex: number;
  holdings: Record<string, MarketHolding>;
  rumorText: string;
}

export interface HistoryEntry {
  year: number;
  season: Season;
  ageYears: number;
  title: string;
  summary: string;
}

export interface PendingTransition {
  chosenLabel: string;
  originParagraphs: string[];
  paragraphs: string[];
  continueLabel: string;
  nextSceneId: string;
  notices: string[];
}

export interface GameState {
  schemaVersion: number;
  runId: string;
  profile: PlayerProfile;
  year: number;
  seasonIndex: number; // 0..3 -> 春夏秋冬
  ageMonths: number;
  lifespanYears: number;
  lifespanBonus: number;
  realm: RealmId;
  might: number;
  mind: number;
  renown: number;
  alignment: {
    righteous: number; // 正道(+) vs 魔煞(-)
    worldly: number;   // 入世(+) vs 出世(-)
  };
  tags: string[];
  flags: Record<string, boolean | number | string>;
  truthClues: string[];
  spiritStones: number;
  relics: string[];
  market: MarketState;
  companions: Record<CompanionId, CompanionRuntimeState>;
  act: ActId;
  actBeat: number;
  totalActions: number;
  actionUses: Record<string, number>;
  actionLastTurn: Record<string, number>;
  activeThreads: string[];
  completedThreads: string[];
  completedScenes: string[];
  seenRandomEvents: string[];
  currentSceneId: string;
  pendingReturnSceneId?: string;
  pendingTransition?: PendingTransition;
  lastBridgeNote?: string;
  recentNotices: string[];
  historyLog: HistoryEntry[];
  endingId?: string;
}

export interface CompanionUpdate {
  meet?: boolean;
  affectionDelta?: number;
  setStance?: CompanionStance;
  stageDelta?: number;
  setStage?: number;
  chronicle?: string;
  chronicleAtStartYear?: boolean;
  markSeen?: boolean;
}

export interface ChoiceEffect {
  timeMonths?: number;
  spiritStones?: number;
  might?: number;
  mind?: number;
  renown?: number;
  righteous?: number;
  worldly?: number;
  lifespanBonus?: number;
  setRealm?: RealmId;
  setAct?: ActId;
  beatDelta?: number;
  addTags?: string[];
  removeTags?: string[];
  addRelics?: string[];
  removeRelics?: string[];
  grantMarketGoods?: Array<{ goodId: string; qty: number; unitCost: number }>;
  addTruthClues?: string[];
  setFlags?: Record<string, boolean | number | string>;
  activateThreads?: string[];
  completeThreads?: string[];
  companionUpdates?: Partial<Record<CompanionId, CompanionUpdate>>;
  notice?: string | string[];
  logSummary?: string;
  setReturnSceneId?: string;
  /** 记录本幕行动次数与冷却，用于防止行迹谋划台无限刷取 */
  trackActionKey?: string;
}

export interface ChoiceRequirement {
  minSpiritStones?: number;
  hasRelic?: string;
  hasTag?: string;
  minMight?: number;
  minMind?: number;
  minRenown?: number;
  maxUsesInAct?: { key: string; max: number; reason?: string };
  cooldownTurns?: { key: string; turns: number; reason?: string };
  custom?: (state: GameState) => { ok: boolean; reason?: string };
  lockReason?: string;
}

export type ChoiceCategory =
  | 'story'
  | 'plan'
  | 'companion'
  | 'market'
  | 'breakthrough';

export interface ChoiceDefinition {
  id: string;
  category?: ChoiceCategory;
  label: string | ((state: GameState) => string);
  subtext?: string | ((state: GameState) => string);
  insightTags?: string[] | ((state: GameState) => string[]);
  visible?: (state: GameState) => boolean;
  requirement?: ChoiceRequirement;
  effect?: ChoiceEffect | ((state: GameState) => ChoiceEffect);
  /** 做出选择后，在当前页面下方续写的专属剧情演绎与过渡段落 */
  outcome?: ParagraphBlock[];
  /** 演绎完毕后，翻页进入下一场景的按钮文字 */
  outcomeContinueLabel?: string | ((stateAfterEffect: GameState) => string);
  /** 进入下一场景（尤其是返回枢纽时）可回响的一句承接余韵 */
  bridgeNote?: string | ((stateAfterEffect: GameState) => string);
  next: string | ((stateAfterEffect: GameState) => string);
}

export type ParagraphBlock =
  | string
  | ((state: GameState) => string | string[] | null)
  | {
      when: (state: GameState) => boolean;
      text: string | ((state: GameState) => string | string[]);
    };

export interface MarketSceneConfig {
  venueName: string;
  venueDesc: string;
  goodsIds: string[];
  relicOffers: Array<{
    relicId: string;
    basePrice: number;
    category: MarketCategory;
    when?: (state: GameState) => boolean;
  }>;
}

export interface SceneDefinition {
  id: string;
  act: ActId;
  title: string;
  subtitle?: string | ((state: GameState) => string);
  location: string | ((state: GameState) => string);
  checkpoint?: boolean;
  checkpointLabel?: string;
  isHub?: boolean;
  isRandomEvent?: boolean;
  isEndingTrigger?: string;
  market?: MarketSceneConfig;
  paragraphs: ParagraphBlock[];
  choices: ChoiceDefinition[];
}

export interface RandomEventDefinition {
  sceneId: string;
  act: ActId;
  weight: number | ((state: GameState) => number);
  once?: boolean;
  when?: (state: GameState) => boolean;
}

export interface RealmDefinition {
  id: RealmId;
  name: string;
  shortName: string;
  lifespanYears: number;
  order: number;
  desc: string;
}

export interface TagDefinition {
  id: string;
  name: string;
  category: 'origin' | 'destiny' | 'karma' | 'dao';
  desc: string;
}

export interface RelicDefinition {
  id: string;
  name: string;
  rarity: '凡珍' | '灵宝' | '秘藏';
  desc: string;
  storyUseHint: string;
}

export interface MarketGoodDefinition {
  id: string;
  name: string;
  category: MarketCategory;
  basePrice: number;
  desc: string;
}

export interface TruthClueDefinition {
  id: string;
  title: string;
  act: ActId;
  sourceLabel: string;
  excerpt: string;
}

export interface CompanionDefinition {
  id: CompanionId;
  name: string;
  title: string | ((state: GameState) => string);
  genderLabel: '女' | '男';
  faction: string;
  encounterHint: string;
  bio: string | ((state: GameState) => string);
  truthPieceTitle: string;
}

export interface OriginDefinition {
  id: string;
  name: string;
  epithet: string;
  desc: string;
  startSceneId: string;
  initialStones: number;
  initialMight: number;
  initialMind: number;
  initialRenown: number;
  initialRighteous: number;
  initialWorldly: number;
  initialTags: string[];
  initialRelics?: string[];
  initialFlags?: Record<string, boolean | number | string>;
}

export interface OpeningEventDefinition {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  effect: ChoiceEffect;
}

export interface DaoHeartDefinition {
  id: string;
  name: string;
  motto: string;
  desc: string;
  effect: ChoiceEffect;
}

export interface EndingDefinition {
  id: string;
  title: string;
  subtitle: string;
  tier: '陨落' | '红尘' | '商道' | '承前启后' | '飞升' | '真结局' | '魔道' | '隐世';
  poem: string;
  epilogue: (state: GameState) => string[];
}

export interface ContentRegistry {
  realms: Record<RealmId, RealmDefinition>;
  tags: Record<string, TagDefinition>;
  relics: Record<string, RelicDefinition>;
  marketGoods: Record<string, MarketGoodDefinition>;
  truthClues: Record<string, TruthClueDefinition>;
  companions: Record<CompanionId, CompanionDefinition>;
  origins: OriginDefinition[];
  openingEvents: OpeningEventDefinition[];
  daoHearts: DaoHeartDefinition[];
  scenes: Record<string, SceneDefinition>;
  randomEvents: RandomEventDefinition[];
  endings: Record<string, EndingDefinition>;
}

export interface SaveRecord {
  id: string;
  kind: 'auto' | 'manual';
  label: string;
  savedAt: number;
  summary: string;
  state: GameState;
}

export interface MetaArchive {
  schemaVersion: number;
  totalRuns: number;
  unlockedEndings: string[];
  unlockedTruthClues: string[];
  seenRelics: string[];
  seenTags: string[];
  companionBestStance: Partial<Record<CompanionId, CompanionStance>>;
  metCompanions: CompanionId[];
}

export interface ResolvedChoice {
  id: string;
  category?: ChoiceCategory;
  label: string;
  subtext?: string;
  insightTags?: string[];
  locked: boolean;
  lockReason?: string;
}
