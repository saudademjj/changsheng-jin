import {
  ActId,
  CompanionId,
  ContentRegistry,
  GameState,
  TruthClueStage,
} from './types';
import { getAgeYears } from './time';

export const MAX_MAJOR_ARCS_PER_ACT = 2;

export const ACT_MAJOR_THREADS: Partial<Record<ActId, string[]>> = {
  act2: [
    'thread_sword_trial',
    'thread_blood_pill',
    'thread_qingzhou_plague',
    'thread_ancient_vein',
  ],
  act3: [
    'thread_act3_sect',
    'thread_act3_chamber',
    'thread_act3_hearth',
    'thread_act3_soul',
  ],
  act4: [
    'thread_act4_zhantian',
    'thread_act4_war',
    'thread_act4_mortal',
  ],
};

export const MAJOR_THREAD_LABELS: Record<string, string> = {
  thread_sword_trial: '青云试剑案',
  thread_blood_pill: '青岚血丹局',
  thread_qingzhou_plague: '青州怪疫',
  thread_ancient_vein: '青州北麓古脉',
  thread_act3_sect: '云岭仙盟大议',
  thread_act3_chamber: '青州百宝商变',
  thread_act3_hearth: '青州二十载杏林',
  thread_act3_soul: '长明古战场寻木',
  thread_act4_zhantian: '断魂绝渊斩天遗窟',
  thread_act4_war: '中州赤阳灵脉商战',
  thread_act4_mortal: '青州槐阴无灵古碑',
};

export function getCommittedMajorArcs(state: GameState, act: ActId): string[] {
  const recorded = state.actMajorArcs?.[act] ?? [];
  const actThreads = ACT_MAJOR_THREADS[act] ?? [];
  const merged = new Set<string>(recorded);
  for (const tid of state.completedThreads) {
    if (actThreads.includes(tid)) merged.add(tid);
  }
  return Array.from(merged);
}

export function getRemainingMajorArcSlots(state: GameState, act: ActId): number {
  const actThreads = ACT_MAJOR_THREADS[act];
  if (!actThreads) return 0;
  return Math.max(0, MAX_MAJOR_ARCS_PER_ACT - getCommittedMajorArcs(state, act).length);
}

export function canCommitMajorArc(
  state: GameState,
  act: ActId,
  threadId: string
): boolean {
  const actThreads = ACT_MAJOR_THREADS[act];
  if (!actThreads || !actThreads.includes(threadId)) return true;
  const committed = getCommittedMajorArcs(state, act);
  return committed.includes(threadId) || committed.length < MAX_MAJOR_ARCS_PER_ACT;
}

export function isMajorArcMissed(
  state: GameState,
  act: ActId,
  threadId: string
): boolean {
  if (state.flags[`missed_${threadId}`]) return true;
  const actThreads = ACT_MAJOR_THREADS[act];
  if (!actThreads || !actThreads.includes(threadId)) return false;
  if (state.completedThreads.includes(threadId)) return false;
  const committed = getCommittedMajorArcs(state, act);
  return committed.length >= MAX_MAJOR_ARCS_PER_ACT && !committed.includes(threadId);
}

export function isSuZhiweiDeceased(state: GameState): boolean {
  if (state.companions.su_zhiwei.deceased || state.flags.su_zhiwei_passed) {
    return true;
  }
  const age = getAgeYears(state.ageMonths);
  if (state.flags.su_zhiwei_saved_longlife) {
    return age > 95;
  }
  if (state.act === 'act4' || state.act === 'act5' || state.act === 'act6') {
    return true;
  }
  return age > 65;
}

export function isCompanionDeceased(state: GameState, cid: CompanionId): boolean {
  if (state.companions[cid]?.deceased) return true;
  if (cid === 'su_zhiwei') return isSuZhiweiDeceased(state);
  return false;
}

export function isCompanionSealed(state: GameState, cid: CompanionId): boolean {
  return (
    cid === 'cang_ming' &&
    Boolean(state.flags.cangming_sealed || state.flags.act4_cangming_sealed)
  );
}

export function isCompanionHostile(state: GameState, cid: CompanionId): boolean {
  const comp = state.companions[cid];
  return comp.met && (comp.stance === 'estranged' || comp.stance === 'rival');
}

export function hasDeepBond(state: GameState, cid: CompanionId): boolean {
  if (isCompanionDeceased(state, cid) || isCompanionSealed(state, cid)) return false;
  const comp = state.companions[cid];
  if (!comp.met || comp.stance === 'estranged' || comp.stance === 'rival') return false;
  return (
    comp.bondType === 'dao_partner' ||
    comp.bondType === 'sworn' ||
    comp.stance === 'bonded' ||
    comp.affection >= 75
  );
}

export function isDaoPartner(state: GameState, cid: CompanionId): boolean {
  return (
    state.daoPartnerId === cid || state.companions[cid]?.bondType === 'dao_partner'
  );
}

export function isActiveDaoPartner(state: GameState, cid: CompanionId): boolean {
  return (
    isDaoPartner(state, cid) &&
    !isCompanionDeceased(state, cid) &&
    !isCompanionHostile(state, cid) &&
    !isCompanionSealed(state, cid)
  );
}

export interface CompanionStatusBadge {
  label: string;
  tone: 'muted' | 'neutral' | 'warm' | 'accent' | 'danger' | 'deceased' | 'partner';
  subLabel?: string;
}

export function getCompanionStatusBadge(
  state: GameState,
  cid: CompanionId
): CompanionStatusBadge {
  const comp = state.companions[cid];
  if (!comp.met) {
    return { label: '素未谋面', tone: 'muted' };
  }
  if (isCompanionDeceased(state, cid)) {
    const pastLabel =
      comp.bondType === 'dao_partner'
        ? '故去道侣'
        : comp.bondType === 'sworn'
        ? '故去挚交'
        : comp.stance === 'bonded'
        ? '故去挚爱'
        : comp.stance === 'confidant'
        ? '故去知交'
        : '红尘故人';
    const yearTag = comp.deceasedYear ? `长明${comp.deceasedYear}年辞世` : pastLabel;
    return { label: '已辞世', tone: 'deceased', subLabel: yearTag };
  }
  if (isCompanionSealed(state, cid)) {
    return { label: '已永封', tone: 'muted', subLabel: '断玉归寂' };
  }
  if (comp.stance === 'estranged') {
    return { label: '陌路决裂', tone: 'danger' };
  }
  if (comp.stance === 'rival') {
    return { label: '道途相左', tone: 'danger' };
  }
  if (comp.bondType === 'dao_partner' || state.daoPartnerId === cid) {
    return { label: '结契道侣', tone: 'partner', subLabel: '此生唯一' };
  }
  if (comp.bondType === 'sworn') {
    return { label: '生死挚交', tone: 'accent' };
  }
  if (comp.stance === 'bonded' || comp.affection >= 75) {
    const canBondNow =
      state.act !== 'act1' &&
      state.act !== 'act6' &&
      !state.endingId &&
      (comp.milestoneStage ?? 0) >= 1 &&
      !(
        cid === 'su_zhiwei' &&
        (state.act === 'act4' || state.act === 'act5') &&
        getAgeYears(state.ageMonths) >= 75
      );
    return {
      label: '心意相许',
      tone: 'accent',
      ...(canBondNow ? { subLabel: '可定结契' } : {}),
    };
  }
  if (comp.stance === 'confidant' || comp.affection >= 30) {
    return { label: '推心知己', tone: 'warm' };
  }
  return { label: '一面之缘', tone: 'neutral' };
}

export interface OvermatchProfile {
  crossRealmPower: number;
  rankLabel: string;
  powerSources: string[];
  deadmanSwitches: string[];
  lifesavers: string[];
}

export function getOvermatchProfile(state: GameState): OvermatchProfile {
  let score = 0;
  const powerSources: string[] = [];
  const deadmanSwitches: string[] = [];
  const lifesavers: string[] = [];

  if (state.tags.includes('sword_intent_seed')) {
    score += 14;
    powerSources.push('剑意雏形');
  }
  if (state.tags.includes('origin_scout')) {
    score += 8;
    powerSources.push('边关杀伐底蕴');
  }
  if (state.flags.foundation_grade === 'sword_ancient') {
    score += 22;
    powerSources.push('太古剑基（越阶杀伐）');
  } else if (state.flags.foundation_grade === 'flawless') {
    score += 14;
    powerSources.push('无瑕正统道基');
  } else if (state.flags.foundation_grade === 'merchant_vein') {
    score += 14;
    powerSources.push('地脉阵道道基');
  } else if (state.flags.foundation_grade === 'blood_demon') {
    score += 18;
    powerSources.push('煞血霸道道基');
  }
  if (state.flags.core_grade === 'sword_core') {
    score += 26;
    powerSources.push('太古剑意金丹');
  } else if (state.flags.core_grade === 'flawless') {
    score += 16;
    powerSources.push('九纹无瑕金丹');
  } else if (state.flags.core_grade === 'vein_core') {
    score += 18;
    powerSources.push('九州地脉金丹');
  } else if (state.flags.core_grade === 'blood_demon') {
    score += 22;
    powerSources.push('吞煞魔道金丹');
  }
  if (state.tags.includes('demonic_sovereign')) {
    score += 15;
    powerSources.push('吞煞魔威');
  }
  if (state.relics.includes('severing_sword_embryo')) {
    score += 18;
    powerSources.push('斩天剑胚');
  }
  if (state.relics.includes('broken_sky_seal')) {
    score += 16;
    powerSources.push('残缺锁天印');
  }
  if (state.relics.includes('spirit_vein_deed')) {
    score += 10;
    powerSources.push('九州灵脉契阵势');
  }
  if (
    state.companions.cang_ming.met &&
    !isCompanionSealed(state, 'cang_ming') &&
    !isCompanionHostile(state, 'cang_ming') &&
    state.companions.cang_ming.affection >= 25
  ) {
    score += state.tags.includes('cangming_reborn') ? 22 : 14;
    powerSources.push(
      state.tags.includes('cangming_reborn') ? '太古剑尊苍溟压阵' : '苍溟残魂古剑借力'
    );
  }
  if (
    (state.daoPartnerId === 'shen_qingshuang' || state.daoPartnerId === 'cang_ming') &&
    !isCompanionHostile(state, state.daoPartnerId)
  ) {
    score += 15;
    powerSources.push('道侣双剑共鸣');
  }
  if (state.flags.overmatch_drill_act2) {
    score += 10;
    powerSources.push('青岚越阶剑势演练');
  }
  if (state.flags.overmatch_drill_act3) {
    score += 14;
    powerSources.push('古剑越阶杀招');
  }

  // 根据所处境界计算超出常人的修为溢价
  const baseline =
    state.realm === 'mortal'
      ? 18
      : state.realm.startsWith('qi_')
      ? 34
      : state.realm.startsWith('foundation_')
      ? 72
      : state.realm === 'golden_core'
      ? 145
      : 230;
  if (state.might > baseline) {
    const bonus = Math.min(30, Math.floor((state.might - baseline) * 0.7));
    if (bonus >= 5) {
      score += bonus;
      powerSources.push(`超阶修为压制 (+${bonus})`);
    }
  }

  // 暗网死手与公开威慑（让高境界对手投鼠忌器、不敢直接杀人灭口的真正依仗）
  if (
    state.flags.xie_deadman_switch ||
    (state.relics.includes('baibao_token') &&
      !isCompanionHostile(state, 'xie_wujiu') &&
      state.companions.xie_wujiu.affection >= 25)
  ) {
    deadmanSwitches.push('百宝暗桩死手密信（人亡则账本传遍七十二坊）');
  }
  if (state.flags.act2_deadman_switch) {
    deadmanSwitches.push('青岚暗市散抄副本');
  }
  if (state.flags.act3_chamber_deadman_switch) {
    deadmanSwitches.push('青州茶楼七处连环死手信');
  }
  if (
    state.flags.act3_sect_plan === 'diplomacy' &&
    (state.relics.includes('ancient_stele_rubbing') || state.renown >= 55)
  ) {
    deadmanSwitches.push('太乙主战派暗约与碑拓铁证');
  }
  if (state.daoPartnerId === 'xie_wujiu' && !isCompanionHostile(state, 'xie_wujiu')) {
    deadmanSwitches.push('百宝总号全域威慑网');
  }

  // 保命退路（即便遭高阶反杀灭口，也可断臂求生）
  if (state.tags.includes('old_daoist_talisman')) {
    lifesavers.push('荒庙护心旧符');
  }
  if (state.relics.includes('broken_gathering_array')) {
    lifesavers.push('聚灵阵盘护脉');
  }
  if (state.relics.includes('mortal_hearth_talisman')) {
    lifesavers.push('无灵归尘印蔽息遁走');
  }
  if (
    state.companions.cang_ming.met &&
    !isCompanionSealed(state, 'cang_ming') &&
    !isCompanionHostile(state, 'cang_ming')
  ) {
    lifesavers.push(
      state.tags.includes('cangming_reborn') ? '太古剑尊苍溟护道' : '断玉残魂护主'
    );
  }

  const rankLabel =
    score >= 60
      ? '逆伐跨阶 · 凶威难测'
      : score >= 35
      ? '越阶底蕴 · 可抗高境'
      : score >= 16
      ? '微具锋芒 · 同境占优'
      : '寻常根基 · 忌犯高阶';

  return {
    crossRealmPower: score,
    rankLabel,
    powerSources,
    deadmanSwitches,
    lifesavers,
  };
}

export type CoercionTarget =
  | 'act2_tianji_steward'
  | 'act3_sect_elder'
  | 'act3_tianji_goldcore';

export interface CoercionEvaluation {
  canSucceed: boolean;
  canSurviveFail: boolean;
  powerOk: boolean;
  switchOk: boolean;
  leverageSummary: string;
  warningText: string;
}

export function evaluateCoercion(
  state: GameState,
  target: CoercionTarget
): CoercionEvaluation {
  const profile = getOvermatchProfile(state);

  if (target === 'act2_tianji_steward') {
    const powerOk = profile.crossRealmPower >= 26 && state.might >= 44;
    const switchOk =
      Boolean(state.flags.xie_allied) ||
      Boolean(state.flags.act2_deadman_switch) ||
      profile.deadmanSwitches.length >= 1;
    const canSucceed = powerOk || switchOk;
    const canSurviveFail = state.might >= 38 || profile.lifesavers.length >= 1;
    const parts: string[] = [];
    if (powerOk) parts.push('越阶战力压阵');
    if (switchOk) parts.push('百宝暗桩死手牵制');
    return {
      canSucceed,
      canSurviveFail,
      powerOk,
      switchOk,
      leverageSummary: parts.join(' + ') || '无制衡底牌',
      warningText: canSucceed
        ? `底牌已成（${parts.join('、')}），天机筑基管事投鼠忌器、不敢当场杀人灭口。`
        : '【凶险：境界悬殊】仅凭孤本账页面对筑基后期管事，既无暗网死手又无越阶实力，对方极可能直接杀人灭口！',
    };
  }

  if (target === 'act3_sect_elder') {
    const powerOk = profile.crossRealmPower >= 48 && state.might >= 92;
    const switchOk =
      (state.flags.act3_sect_plan === 'diplomacy' &&
        (state.relics.includes('ancient_stele_rubbing') || state.renown >= 50)) ||
      profile.deadmanSwitches.length >= 2;
    const canSucceed = powerOk || switchOk;
    const canSurviveFail = state.might >= 74 || profile.lifesavers.length >= 1;
    const parts: string[] = [];
    if (powerOk) parts.push('越阶锋芒硬撼金丹');
    if (switchOk) parts.push('仙盟内线与死手副本牵制');
    return {
      canSucceed,
      canSurviveFail,
      powerOk,
      switchOk,
      leverageSummary: parts.join(' + ') || '无制衡底牌',
      warningText: canSucceed
        ? `底牌已成（${parts.join('、')}），金丹长老投鼠忌器，只得坐下密谈。`
        : '【凶险：金丹压顶】未提前联络太乙主战派或布下死手、亦无越阶战力，在仙盟秘阁亮把柄极易被金丹长老当场格杀灭口！',
    };
  }

  // act3_tianji_goldcore
  const powerOk = profile.crossRealmPower >= 52 && state.might >= 98;
  const switchOk =
    Boolean(state.flags.act3_chamber_deadman_switch) ||
    profile.deadmanSwitches.length >= 2 ||
    (state.relics.includes('baibao_token') &&
      !isCompanionHostile(state, 'xie_wujiu') &&
      state.companions.xie_wujiu.affection >= 45);
  const canSucceed = powerOk || switchOk;
  const canSurviveFail = state.might >= 80 || profile.lifesavers.length >= 1;
  const parts: string[] = [];
  if (powerOk) parts.push('越阶战力硬抗金丹');
  if (switchOk) parts.push('七十二坊死手密信威慑');
  return {
    canSucceed,
    canSurviveFail,
    powerOk,
    switchOk,
    leverageSummary: parts.join(' + ') || '无制衡底牌',
    warningText: canSucceed
      ? `底牌已成（${parts.join('、')}），天机金丹管事忌惮你鱼死网破，不敢贸然灭口。`
      : '【极险：金丹杀局】筑基之身无死手暗桩、无越阶杀招却敢当面威胁金丹大管事，对方翻手即可将你杀人灭口！',
  };
}

export interface InvestigationStageSummary {
  stage: TruthClueStage;
  title: string;
  desc: string;
  clueIds: string[];
  unlockedIds: string[];
}

export interface InvestigationProgress {
  stages: InvestigationStageSummary[];
  totalClues: number;
  chainTier: 0 | 1 | 2 | 3;
  tierLabel: string;
  verdictText: string;
}

const STAGE_META: Array<{
  stage: TruthClueStage;
  title: string;
  desc: string;
  clueIds: string[];
}> = [
  {
    stage: 'anomaly',
    title: '一 · 表象疑云',
    desc: '灵脉骤减、飞升无归音、无灵者独免于疫与血丹异尘，处处透着无法自圆其说的违和。',
    clueIds: ['clue_stele_gap', 'clue_mortal_blindspot', 'clue_blood_pill_dust'],
  },
  {
    stage: 'verification',
    title: '二 · 实物勘验',
    desc: '比对三百年账目赤字、地底逆汲阵纹与暗港转运灵灰，彻底驳倒“自然枯竭”之说。',
    clueIds: ['clue_vein_drain', 'clue_ancient_vein_sigil', 'clue_tianji_portal'],
  },
  {
    stage: 'testimony',
    title: '三 · 辩护与拆穿',
    desc: '直面仙盟“贡约护界”的辩护，对照长明元年记忆与四代斩天遗录，拆穿牧灵骗局。',
    clueIds: ['clue_alliance_pact', 'clue_changming_night', 'clue_zhantian_remnant'],
  },
  {
    stage: 'synthesis',
    title: '四 · 收割铁证',
    desc: '洞悉灵根牧种之源、三千年收割大期与天门九枢破绽，拼合破天诸般实证。',
    clueIds: ['clue_mortal_bloodline', 'clue_furnace_cycle', 'clue_gate_weakness'],
  },
];

const STAGE_FOG_META: Record<TruthClueStage, { title: string; desc: string }> = {
  anomaly: {
    title: '一 · 表象疑云',
    desc: '长明三千年飞升无归音，各地偶传灵潮微弱与坊市奇闻，真假虚实仍待亲眼查验。',
  },
  verification: {
    title: '二 · 实物勘验',
    desc: '表象之下是否另有账目、古阵或物证可验？须待踏入世局深处方能勘查。',
  },
  testimony: {
    title: '三 · 辩护与拆穿',
    desc: '正道宗门与往昔亲历者各有说辞，眼下尚未触及核心证言。',
  },
  synthesis: {
    title: '四 · 终局合证',
    desc: '诸般线索尚未合流，九霄终局之谜仍掩于重雾之后。',
  },
};

const STAGE_PARTIAL_META: Record<TruthClueStage, { title: string; desc: string }> = {
  anomaly: {
    title: '一 · 表象疑云',
    desc: '已从亲历异象中察得端倪，灵脉衰微与飞升旧闻间处处透着违和，余下表象仍待逐一印证。',
  },
  verification: {
    title: '二 · 实物勘验',
    desc: '已握有部分账目或实地物证，足以动摇“自然枯竭”之说，仍须继续查验其余实证。',
  },
  testimony: {
    title: '三 · 辩护与拆穿',
    desc: '已触及宗门辩辞或亲历者旧忆一角，各方说法各执一词，尚须更多证言彼此对质。',
  },
  synthesis: {
    title: '四 · 终局合证',
    desc: '已窥见九霄大局深处的一角关键实证，诸般终局之谜正待进一步合流拼合。',
  },
};

export function getInvestigationProgress(
  state: GameState,
  registry?: ContentRegistry
): InvestigationProgress {
  const clues = new Set(state.truthClues);
  const count = state.truthClues.length;

  const stages: InvestigationStageSummary[] = STAGE_META.map((m) => {
    const clueIds = registry
      ? m.clueIds.filter((id) => Boolean(registry.truthClues[id]))
      : m.clueIds;
    const unlockedIds = m.clueIds.filter((id) => clues.has(id));
    const fullyUnveiled = clueIds.length > 0 && unlockedIds.length >= clueIds.length;
    const partiallyUnveiled = unlockedIds.length > 0 && !fullyUnveiled;

    return {
      stage: m.stage,
      title: fullyUnveiled
        ? m.title
        : partiallyUnveiled
        ? STAGE_PARTIAL_META[m.stage].title
        : STAGE_FOG_META[m.stage].title,
      desc: fullyUnveiled
        ? m.desc
        : partiallyUnveiled
        ? STAGE_PARTIAL_META[m.stage].desc
        : STAGE_FOG_META[m.stage].desc,
      clueIds,
      unlockedIds,
    };
  });

  const coveredStages = stages.filter((s) => s.unlockedIds.length > 0).length;

  if (count >= 7 && coveredStages >= 3) {
    return {
      stages,
      totalClues: count,
      chainTier: 3,
      tierLabel: '铁证闭合 · 洞穿牧灵大局',
      verdictText:
        '物证、账目、古阵、口供与无灵盲区环环相扣：所谓飞升实乃三千年一熟的收割大炉，仙盟「护界进贡论」亦已被彻底戳穿。',
    };
  }
  if (count >= 4 && coveredStages >= 2) {
    return {
      stages,
      totalClues: count,
      chainTier: 2,
      tierLabel: '伪象渐破 · 疑凶直指九霄',
      verdictText:
        '多处异象均指向灵气与高阶修士被倒抽往上界，仙盟与商行显然隐瞒了要命真相，但尚缺几环核心实证才能令九州群修信服。',
    };
  }
  if (count >= 1) {
    return {
      stages,
      totalClues: count,
      chainTier: 1,
      tierLabel: '疑窦初生 · 尚在摸索',
      verdictText:
        '你已察觉坊市血丹、枯脉或飞升碑存在诸多反常，然而眼下零星线索不足以定论——究竟是宗门贪腐、天灾劫数，还是另有幕后黑手，仍须亲手查证。',
    };
  }
  return {
    stages,
    totalClues: 0,
    chainTier: 0,
    tierLabel: '雾里看花 · 未窥端倪',
    verdictText:
      '坊间虽常传三千年飞升无归音，你尚无半分实证，眼下只须先稳住修为，留心世间蛛丝马迹。',
  };
}
