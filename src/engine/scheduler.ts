import {
  ActId,
  ChoiceDefinition,
  ChoiceEffect,
  CompanionId,
  CompanionRuntimeState,
  CompanionStance,
  ContentRegistry,
  GameState,
  PlayerProfile,
  ResolvedChoice,
  SceneDefinition,
} from './types';
import {
  computeTimeAdvance,
  formatCalendarDate,
  getAgeYears,
  getSeason,
  START_AGE_MONTHS,
  START_YEAR,
} from './time';
import { recalculateMarketPulse } from './economy';
import { interpolateText, resolveParagraphs, resolveTextValue } from './template';

export const SCHEMA_VERSION = 1;

function makeEmptyCompanions(): Record<CompanionId, CompanionRuntimeState> {
  return {
    shen_qingshuang: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
    xie_wujiu: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
    su_zhiwei: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
    cang_ming: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
  };
}

export function autoDeriveStance(
  current: CompanionStance,
  affection: number
): CompanionStance {
  if (current === 'estranged') return 'estranged';
  if (affection <= -15) return 'rival';
  if (affection >= 60) return 'bonded';
  if (affection >= 20) return 'confidant';
  if (current === 'rival' && affection <= -5) return 'rival';
  return 'stranger';
}

export function applyEffect(
  state: GameState,
  effect: ChoiceEffect,
  registry: ContentRegistry,
  sceneTitle?: string
): { state: GameState; lifespanExceeded: boolean } {
  const notices: string[] = [];
  let next: GameState = {
    ...state,
    alignment: { ...state.alignment },
    tags: [...state.tags],
    flags: { ...state.flags },
    truthClues: [...state.truthClues],
    relics: [...state.relics],
    actionUses: { ...(state.actionUses ?? {}) },
    actionLastTurn: { ...(state.actionLastTurn ?? {}) },
    activeThreads: [...state.activeThreads],
    completedThreads: [...state.completedThreads],
    companions: {
      shen_qingshuang: { ...state.companions.shen_qingshuang, chronicle: [...state.companions.shen_qingshuang.chronicle] },
      xie_wujiu: { ...state.companions.xie_wujiu, chronicle: [...state.companions.xie_wujiu.chronicle] },
      su_zhiwei: { ...state.companions.su_zhiwei, chronicle: [...state.companions.su_zhiwei.chronicle] },
      cang_ming: { ...state.companions.cang_ming, chronicle: [...state.companions.cang_ming.chronicle] },
    },
    market: {
      ...state.market,
      holdings: { ...state.market.holdings },
    },
    historyLog: [...state.historyLog],
    recentNotices: [],
  };

  if (effect.lifespanBonus) {
    next.lifespanBonus += effect.lifespanBonus;
    next.lifespanYears += effect.lifespanBonus;
    notices.push(`寿元增延 ${effect.lifespanBonus} 载`);
  }

  if (effect.setRealm && effect.setRealm !== next.realm) {
    const realmDef = registry.realms[effect.setRealm];
    if (realmDef) {
      next.realm = effect.setRealm;
      next.lifespanYears = realmDef.lifespanYears + next.lifespanBonus;
      notices.push(`破境成功：踏入【${realmDef.name}】（寿元上限 ${next.lifespanYears} 载）`);
    }
  }

  if (effect.setAct) {
    next.act = effect.setAct;
    next.actBeat = 0;
  }

  if (effect.beatDelta) {
    next.actBeat += effect.beatDelta;
  }

  if (effect.spiritStones) {
    next.spiritStones = Math.max(0, next.spiritStones + effect.spiritStones);
    if (effect.spiritStones > 0) {
      notices.push(`获得灵石 ${effect.spiritStones}`);
    } else {
      notices.push(`支出灵石 ${Math.abs(effect.spiritStones)}`);
    }
  }

  if (effect.might) next.might = Math.max(0, next.might + effect.might);
  if (effect.mind) next.mind = Math.max(0, next.mind + effect.mind);
  if (effect.renown) next.renown = Math.max(0, next.renown + effect.renown);

  if (effect.righteous) {
    next.alignment.righteous = Math.max(
      -100,
      Math.min(100, next.alignment.righteous + effect.righteous)
    );
  }
  if (effect.worldly) {
    next.alignment.worldly = Math.max(
      -100,
      Math.min(100, next.alignment.worldly + effect.worldly)
    );
  }

  if (effect.addTags) {
    for (const tagId of effect.addTags) {
      if (!next.tags.includes(tagId)) {
        next.tags.push(tagId);
        const def = registry.tags[tagId];
        if (def) notices.push(`得命格【${def.name}】`);
      }
    }
  }

  if (effect.removeTags) {
    next.tags = next.tags.filter((t) => !effect.removeTags?.includes(t));
  }

  if (effect.addRelics) {
    for (const relicId of effect.addRelics) {
      if (!next.relics.includes(relicId)) {
        next.relics.push(relicId);
        const def = registry.relics[relicId];
        if (def) notices.push(`得奇物【${def.name}】`);
      }
    }
  }

  if (effect.removeRelics) {
    next.relics = next.relics.filter((r) => !effect.removeRelics?.includes(r));
  }

  if (effect.grantMarketGoods) {
    for (const item of effect.grantMarketGoods) {
      const prev = next.market.holdings[item.goodId] ?? { qty: 0, avgCost: 0 };
      const newQty = Math.max(0, prev.qty + item.qty);
      const goodName = registry.marketGoods[item.goodId]?.name ?? item.goodId;
      if (newQty === 0) {
        delete next.market.holdings[item.goodId];
      } else if (item.qty > 0) {
        const newAvg =
          (prev.qty * prev.avgCost + item.qty * item.unitCost) / newQty;
        next.market.holdings[item.goodId] = { qty: newQty, avgCost: newAvg };
      } else {
        next.market.holdings[item.goodId] = { qty: newQty, avgCost: prev.avgCost };
      }
      if (item.qty > 0) {
        notices.push(`收入货品【${goodName}】×${item.qty}`);
      } else if (item.qty < 0) {
        notices.push(`交出货品【${goodName}】×${Math.abs(item.qty)}`);
      }
    }
  }

  if (effect.addTruthClues) {
    for (const clueId of effect.addTruthClues) {
      if (!next.truthClues.includes(clueId)) {
        next.truthClues.push(clueId);
        const def = registry.truthClues[clueId];
        if (def) notices.push(`窥得天机碎片【${def.title}】`);
      }
    }
  }

  if (effect.setFlags) {
    Object.assign(next.flags, effect.setFlags);
  }

  if (effect.activateThreads) {
    for (const th of effect.activateThreads) {
      if (!next.activeThreads.includes(th) && !next.completedThreads.includes(th)) {
        next.activeThreads.push(th);
      }
    }
  }

  if (effect.completeThreads) {
    for (const th of effect.completeThreads) {
      next.activeThreads = next.activeThreads.filter((a) => a !== th);
      if (!next.completedThreads.includes(th)) {
        next.completedThreads.push(th);
      }
    }
  }

  if (effect.setReturnSceneId !== undefined) {
    next.pendingReturnSceneId = effect.setReturnSceneId || undefined;
  }

  if (effect.trackActionKey) {
    const actScopedKey = `${next.act}:${effect.trackActionKey}`;
    next.actionUses[actScopedKey] = (next.actionUses[actScopedKey] ?? 0) + 1;
    next.actionLastTurn[actScopedKey] = next.totalActions;
  }

  // 时间推进
  const startYear = next.year;
  let lifespanExceeded = false;
  if (effect.timeMonths && effect.timeMonths > 0) {
    const timeRes = computeTimeAdvance(next, effect.timeMonths);
    next.year = timeRes.year;
    next.seasonIndex = timeRes.seasonIndex;
    next.ageMonths = timeRes.ageMonths;
    lifespanExceeded = timeRes.lifespanExceeded;
    if (timeRes.notice) notices.unshift(timeRes.notice);
  }

  // 伴侣状态更新
  if (effect.companionUpdates) {
    for (const [key, upd] of Object.entries(effect.companionUpdates)) {
      if (!upd) continue;
      const cid = key as CompanionId;
      const comp = next.companions[cid];
      const def = registry.companions[cid];
      if (!comp || !def) continue;

      if (upd.meet && !comp.met) {
        comp.met = true;
        comp.metAtAgeMonths = next.ageMonths;
        comp.lastSeenAgeMonths = next.ageMonths;
        comp.stance = upd.setStance ?? 'stranger';
        notices.push(`初遇故人【${def.name}】`);
      } else if (upd.markSeen && comp.met) {
        comp.lastSeenAgeMonths = next.ageMonths;
      }

      if (upd.affectionDelta) {
        comp.affection = Math.max(-100, Math.min(500, comp.affection + upd.affectionDelta));
        if (comp.met) {
          if (upd.affectionDelta >= 8) {
            notices.push(`${def.name}对你心生亲近`);
          } else if (upd.affectionDelta <= -8) {
            notices.push(`${def.name}与你心生芥蒂`);
          }
        }
      }

      if (upd.setStage !== undefined) {
        comp.stage = upd.setStage;
      } else if (upd.stageDelta) {
        comp.stage += upd.stageDelta;
      }

      if (upd.setStance) {
        const prevStance = comp.stance;
        if (upd.setStance === 'estranged') {
          comp.stance = 'estranged';
          comp.affection = Math.min(comp.affection, -30);
        } else if (upd.setStance === 'rival') {
          comp.stance = 'rival';
          comp.affection = Math.min(comp.affection, -15);
        } else if (upd.setStance === 'bonded') {
          comp.stance = 'bonded';
          comp.affection = Math.max(comp.affection, 60);
        } else if (upd.setStance === 'confidant') {
          comp.affection = Math.max(comp.affection, 20);
          comp.stance =
            prevStance === 'bonded' || comp.affection >= 60
              ? 'bonded'
              : 'confidant';
        } else {
          comp.stance = upd.setStance;
        }
      } else if (comp.met) {
        comp.stance = autoDeriveStance(comp.stance, comp.affection);
      }

      if (upd.chronicle && comp.met) {
        const logYear = upd.chronicleAtStartYear ? startYear : next.year;
        const resolvedChronicle = interpolateText(upd.chronicle, next);
        const entry = `长明${logYear}年 · ${resolvedChronicle}`;
        const duplicateBody = comp.chronicle.some(
          (existing) => existing === entry || existing.endsWith(` · ${resolvedChronicle}`)
        );
        if (!duplicateBody) {
          comp.chronicle.push(entry);
        }
      }
    }
  }

  if (effect.notice) {
    if (Array.isArray(effect.notice)) {
      notices.push(...effect.notice.map((n) => interpolateText(n, next)));
    } else {
      notices.push(interpolateText(effect.notice, next));
    }
  }

  if (effect.logSummary) {
    next.historyLog.push({
      year: next.year,
      season: getSeason(next.seasonIndex),
      ageYears: getAgeYears(next.ageMonths),
      title: sceneTitle ? interpolateText(sceneTitle, next) : '尘缘纪事',
      summary: interpolateText(effect.logSummary, next),
    });
  }

  next.market = recalculateMarketPulse(next);
  next.recentNotices = notices.slice(0, 5);

  return { state: next, lifespanExceeded };
}

export function createInitialState(
  profile: PlayerProfile,
  registry: ContentRegistry
): GameState {
  const origin =
    registry.origins.find((o) => o.id === profile.originId) ?? registry.origins[0];
  const daoHeart =
    registry.daoHearts.find((d) => d.id === profile.daoHeartId) ??
    registry.daoHearts[0];
  const mortalRealm = registry.realms.mortal;

  let state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    profile,
    year: START_YEAR,
    seasonIndex: 0,
    ageMonths: START_AGE_MONTHS,
    lifespanYears: mortalRealm.lifespanYears,
    lifespanBonus: 0,
    realm: 'mortal',
    might: origin.initialMight,
    mind: origin.initialMind,
    renown: origin.initialRenown,
    alignment: {
      righteous: origin.initialRighteous,
      worldly: origin.initialWorldly,
    },
    tags: [...origin.initialTags],
    flags: { ...(origin.initialFlags ?? {}) },
    truthClues: [],
    spiritStones: origin.initialStones,
    relics: [...(origin.initialRelics ?? [])],
    market: {
      elixirIndex: 1.0,
      artifactIndex: 1.0,
      curioIndex: 1.0,
      holdings: {},
      rumorText: '',
    },
    companions: makeEmptyCompanions(),
    act: 'act1',
    actBeat: 0,
    totalActions: 0,
    actionUses: {},
    actionLastTurn: {},
    activeThreads: [],
    completedThreads: [],
    completedScenes: [],
    seenRandomEvents: [],
    currentSceneId: origin.startSceneId,
    recentNotices: [],
    historyLog: [
      {
        year: START_YEAR,
        season: '春',
        ageYears: 16,
        title: '初临尘世',
        summary: `以【${origin.name}】出身踏入青岚界域，心怀「${daoHeart.name}」。`,
      },
    ],
  };

  // 应用道心初衷
  state = applyEffect(state, daoHeart.effect, registry, '道心初立').state;

  // 应用选中的开局事件
  for (const evId of profile.openingEventIds) {
    const ev = registry.openingEvents.find((e) => e.id === evId);
    if (ev) {
      state = applyEffect(state, ev.effect, registry, `开局奇遇·${ev.name}`).state;
    }
  }

  state.market = recalculateMarketPulse(state);
  state.recentNotices = [
    `长明三千零一十二年 · 春，十六岁的${profile.name}启程入世`,
  ];
  return state;
}

export function evaluateChoiceRequirement(
  state: GameState,
  choice: ChoiceDefinition,
  registry: ContentRegistry
): { locked: boolean; lockReason?: string } {
  const req = choice.requirement;
  if (!req) return { locked: false };

  if (req.minSpiritStones !== undefined && state.spiritStones < req.minSpiritStones) {
    return {
      locked: true,
      lockReason: req.lockReason ?? `需灵石 ${req.minSpiritStones}`,
    };
  }
  if (req.hasRelic && !state.relics.includes(req.hasRelic)) {
    const relicName = registry.relics[req.hasRelic]?.name ?? req.hasRelic;
    return {
      locked: true,
      lockReason: req.lockReason ?? `需持有【${relicName}】`,
    };
  }
  if (req.hasTag && !state.tags.includes(req.hasTag)) {
    const tagName = registry.tags[req.hasTag]?.name ?? req.hasTag;
    return {
      locked: true,
      lockReason: req.lockReason ?? `需命格【${tagName}】`,
    };
  }
  if (req.minMight !== undefined && state.might < req.minMight) {
    return {
      locked: true,
      lockReason: req.lockReason ?? `修为底蕴不足（需 ${req.minMight}）`,
    };
  }
  if (req.minMind !== undefined && state.mind < req.minMind) {
    return {
      locked: true,
      lockReason: req.lockReason ?? `心境尚浅（需 ${req.minMind}）`,
    };
  }
  if (req.minRenown !== undefined && state.renown < req.minRenown) {
    return {
      locked: true,
      lockReason: req.lockReason ?? `声望不足（需 ${req.minRenown}）`,
    };
  }
  if (req.maxUsesInAct) {
    const scoped = `${state.act}:${req.maxUsesInAct.key}`;
    const used = state.actionUses?.[scoped] ?? 0;
    if (used >= req.maxUsesInAct.max) {
      return {
        locked: true,
        lockReason:
          req.maxUsesInAct.reason ??
          req.lockReason ??
          `此境已历数回，暂难再启（${used}/${req.maxUsesInAct.max}）`,
      };
    }
  }
  if (req.cooldownTurns) {
    const scoped = `${state.act}:${req.cooldownTurns.key}`;
    const lastTurn = state.actionLastTurn?.[scoped];
    if (
      lastTurn !== undefined &&
      (state.totalActions ?? 0) - lastTurn <= req.cooldownTurns.turns
    ) {
      return {
        locked: true,
        lockReason:
          req.cooldownTurns.reason ?? req.lockReason ?? '方才行过此事，须过些时日再议',
      };
    }
  }
  if (req.custom) {
    const res = req.custom(state);
    if (!res.ok) {
      return { locked: true, lockReason: res.reason ?? req.lockReason ?? '条件未成' };
    }
  }

  return { locked: false };
}

export function getResolvedChoices(
  state: GameState,
  scene: SceneDefinition,
  registry: ContentRegistry
): ResolvedChoice[] {
  const result: ResolvedChoice[] = [];
  for (const choice of scene.choices) {
    if (choice.visible && !choice.visible(state)) continue;
    const { locked, lockReason } = evaluateChoiceRequirement(state, choice, registry);
    const resolvedInsightTags =
      typeof choice.insightTags === 'function'
        ? choice.insightTags(state)
        : choice.insightTags;
    result.push({
      id: choice.id,
      category: choice.category,
      label: resolveTextValue(choice.label, state) ?? '',
      subtext: resolveTextValue(choice.subtext, state),
      insightTags: resolvedInsightTags,
      locked,
      lockReason,
    });
  }
  return result;
}

export function drawRandomEventSceneId(
  state: GameState,
  registry: ContentRegistry,
  act: ActId,
  rng: () => number = Math.random
): string | null {
  const candidates = registry.randomEvents.filter((ev) => {
    if (ev.act !== act) return false;
    if (ev.once !== false && state.seenRandomEvents.includes(ev.sceneId)) {
      return false;
    }
    if (ev.when && !ev.when(state)) return false;
    return Boolean(registry.scenes[ev.sceneId]);
  });

  if (candidates.length === 0) return null;

  const weighted = candidates.map((ev) => ({
    ev,
    w: Math.max(1, typeof ev.weight === 'function' ? ev.weight(state) : ev.weight),
  }));
  const total = weighted.reduce((sum, item) => sum + item.w, 0);
  let roll = rng() * total;
  for (const item of weighted) {
    roll -= item.w;
    if (roll <= 0) return item.ev.sceneId;
  }
  return weighted[weighted.length - 1].ev.sceneId;
}

export interface StepResult {
  state: GameState;
  shouldCheckpoint: boolean;
  checkpointLabel?: string;
}

export function advanceChoice(
  state: GameState,
  choiceId: string,
  registry: ContentRegistry,
  rng: () => number = Math.random
): StepResult {
  if (state.pendingTransition) {
    throw new Error('Cannot pick a new choice while a transition outcome is pending.');
  }
  const scene = registry.scenes[state.currentSceneId];
  if (!scene) {
    throw new Error(`Unknown current scene: ${state.currentSceneId}`);
  }
  const choice = scene.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown choice "${choiceId}" in scene "${scene.id}"`);
  }
  if (choice.visible && !choice.visible(state)) {
    throw new Error(`Choice "${choiceId}" is not visible in scene "${scene.id}"`);
  }
  const reqCheck = evaluateChoiceRequirement(state, choice, registry);
  if (reqCheck.locked) {
    throw new Error(`Choice "${choiceId}" is locked: ${reqCheck.lockReason}`);
  }

  const chosenLabel = resolveTextValue(choice.label, state) ?? '';
  const originParagraphs = resolveParagraphs(scene.paragraphs, state);
  const effect =
    typeof choice.effect === 'function' ? choice.effect(state) : choice.effect;

  let nextState = state;
  let lifespanExceeded = false;

  if (effect) {
    const applied = applyEffect(state, effect, registry, scene.title);
    nextState = applied.state;
    lifespanExceeded = applied.lifespanExceeded;
  } else {
    nextState = { ...state, recentNotices: [] };
  }

  // 标记当前场景已读，并在推进真实时间时递增行动计数（用于冷静期与节奏限制）
  const progressedTime = Boolean(effect?.timeMonths && effect.timeMonths > 0);
  if (progressedTime) {
    nextState = {
      ...nextState,
      totalActions: (nextState.totalActions ?? 0) + 1,
    };
  }
  if (!nextState.completedScenes.includes(scene.id)) {
    nextState = {
      ...nextState,
      completedScenes: [...nextState.completedScenes, scene.id],
    };
  }

  const defaultHubForAct = (act: ActId): string => {
    if (act === 'act1') return 'act1_qinglan_arrival';
    if (act === 'act2') return 'act2_hub';
    if (act === 'act3') return 'act3_hub';
    if (act === 'act4') return 'act4_hub';
    if (act === 'act5') return 'act5_hub';
    return 'act6_sky_gate';
  };

  // 解析下一场景
  let nextSceneId =
    typeof choice.next === 'function' ? choice.next(nextState) : choice.next;

  if (nextSceneId === '__RETURN__') {
    nextSceneId =
      nextState.pendingReturnSceneId ?? defaultHubForAct(nextState.act);
    nextState = { ...nextState, pendingReturnSceneId: undefined };
  } else if (
    nextSceneId === '__RANDOM_ACT1__' ||
    nextSceneId === '__RANDOM_ACT2__' ||
    nextSceneId === '__RANDOM_ACT3__' ||
    nextSceneId === '__RANDOM_ACT4__' ||
    nextSceneId === '__RANDOM_ACT5__'
  ) {
    const targetAct = nextSceneId.replace('__RANDOM_', '').replace('__', '').toLowerCase() as ActId;
    const drawn = drawRandomEventSceneId(nextState, registry, targetAct, rng);
    if (drawn) {
      nextSceneId = drawn;
      nextState = {
        ...nextState,
        seenRandomEvents: [...nextState.seenRandomEvents, drawn],
      };
    } else {
      nextSceneId =
        nextState.pendingReturnSceneId ?? defaultHubForAct(targetAct);
      nextState = { ...nextState, pendingReturnSceneId: undefined };
    }
  }

  // 若寿元耗尽且尚未进入结局（正在渡筑基问心劫者豁免），直接转入大限坐化结局
  const targetScene = registry.scenes[nextSceneId];
  let triggeredMortality = false;
  let dewHistoryEntry: GameState['historyLog'][number] | undefined;
  const exemptMortality =
    nextSceneId === 'act2_heart_demon' || Boolean(targetScene?.isEndingTrigger);
  if (lifespanExceeded && !exemptMortality) {
    if (nextState.relics.includes('longevity_dew')) {
      const prevLifespan = nextState.lifespanYears;
      const newLifespan = prevLifespan + 20;
      const stillExceeds = getAgeYears(nextState.ageMonths) >= newLifespan;
      const dewAgeYears = stillExceeds
        ? prevLifespan
        : getAgeYears(nextState.ageMonths);
      const dewYear = stillExceeds
        ? START_YEAR + (prevLifespan - 16)
        : nextState.year;
      dewHistoryEntry = {
        year: dewYear,
        season: getSeason(nextState.seasonIndex),
        ageYears: dewAgeYears,
        title: '延寿续元',
        summary: '大限将至之际，怀中【九转延寿露】自行化气护脉，逆天续命二十载。',
      };
      nextState = {
        ...nextState,
        relics: nextState.relics.filter((r) => r !== 'longevity_dew'),
        lifespanBonus: nextState.lifespanBonus + 20,
        lifespanYears: newLifespan,
        historyLog: [...nextState.historyLog, dewHistoryEntry],
        recentNotices: [
          ...nextState.recentNotices,
          '大限将至之际，怀中【九转延寿露】自行化气护脉，续命二十载！',
        ],
      };
      if (stillExceeds) {
        nextState = {
          ...nextState,
          recentNotices: [
            ...nextState.recentNotices,
            '纵得延寿露续命二十载，此番漫长闭关仍耗尽了余寿。',
          ],
        };
        nextSceneId = 'ending_lifespan';
        triggeredMortality = true;
      }
    } else {
      nextSceneId = 'ending_lifespan';
      triggeredMortality = true;
    }
  }

  // 确认步入寿尽坐化时：钳位超寿年岁、撤销本步未竟行动的故人纪事与原行动编年，并落笔【枯骨问天】坐化编年
  if (triggeredMortality) {
    let finalAgeMonths = nextState.ageMonths;
    let finalYear = nextState.year;
    let finalSeasonIndex = nextState.seasonIndex;
    let finalAgeYears = getAgeYears(nextState.ageMonths);
    let finalNotices = nextState.recentNotices;

    if (finalAgeYears > nextState.lifespanYears) {
      const remMonths = ((nextState.ageMonths % 12) + 12) % 12;
      finalAgeMonths = nextState.lifespanYears * 12 + remMonths;
      const clampedElapsed = finalAgeMonths - START_AGE_MONTHS;
      finalYear = START_YEAR + Math.floor(clampedElapsed / 12);
      finalSeasonIndex = Math.floor((((clampedElapsed % 12) + 12) % 12) / 3);
      finalAgeYears = nextState.lifespanYears;
      const clampedDateLabel = formatCalendarDate(finalYear, finalSeasonIndex);
      finalNotices = nextState.recentNotices.map((n) =>
        n.startsWith('光阴流转：') ? `光阴流转：至寿元大限（${clampedDateLabel}）` : n
      );
    }

    const revertedCompanions = { ...nextState.companions };
    for (const cid of Object.keys(revertedCompanions) as CompanionId[]) {
      const origComp = state.companions[cid];
      const currComp = revertedCompanions[cid];
      if (origComp && currComp && currComp.chronicle.length > origComp.chronicle.length) {
        revertedCompanions[cid] = {
          ...currComp,
          chronicle: [...origComp.chronicle],
        };
      }
    }

    const mortalityEntry: GameState['historyLog'][number] = {
      year: finalYear,
      season: getSeason(finalSeasonIndex),
      ageYears: finalAgeYears,
      title: '枯骨问天',
      summary: '寿元耗尽、大限临头，未及破关便坐化于闭关静室。',
    };
    const finalHistoryLog = [
      ...state.historyLog,
      ...(dewHistoryEntry ? [dewHistoryEntry] : []),
      mortalityEntry,
    ];

    nextState = {
      ...nextState,
      ageMonths: finalAgeMonths,
      year: finalYear,
      seasonIndex: finalSeasonIndex,
      recentNotices: finalNotices,
      companions: revertedCompanions,
      historyLog: finalHistoryLog,
    };
  }

  const finalScene = registry.scenes[nextSceneId];
  if (!finalScene) {
    throw new Error(`Destination scene not found: ${nextSceneId}`);
  }

  const bridgeNote = choice.bridgeNote
    ? resolveTextValue(choice.bridgeNote, nextState)
    : undefined;
  if (bridgeNote !== undefined) {
    nextState = { ...nextState, lastBridgeNote: bridgeNote };
  } else if (!finalScene.isHub) {
    nextState = { ...nextState, lastBridgeNote: undefined };
  }

  // 若该选择配置了专属剧情演绎段落，则在当前页先展开演绎，再由玩家翻页步入下一场景
  let outcomeParagraphs = choice.outcome
    ? resolveParagraphs(choice.outcome, nextState)
    : [];

  if (triggeredMortality && outcomeParagraphs.length > 0) {
    const isLongRetreat = Boolean(effect?.timeMonths && effect.timeMonths >= 120);
    outcomeParagraphs = isLongRetreat
      ? [
          '你闭死关静坐石室，想再从光阴里榨出几分破境底蕴。',
          '可未及功成出关，胸口那点生机便如残烛般骤然沉下去。任你如何强压经脉，寿元大限终究到了尽头。',
        ]
      : [
          outcomeParagraphs[0],
          '可气机方动，胸口那点生机却像残烛般骤然沉下去。任你如何强压经脉，寿元大限终究到了尽头。',
        ];
  }

  if (outcomeParagraphs.length > 0) {
    const defaultContinue = finalScene.isEndingTrigger
      ? `步入终局 · ${finalScene.title}`
      : finalScene.isHub
      ? '收拢心绪，归回问途云海'
      : `继续前行 · ${finalScene.title}`;
    const continueLabel = triggeredMortality
      ? '步入终局 · 枯骨问天'
      : resolveTextValue(choice.outcomeContinueLabel, nextState) ?? defaultContinue;

    nextState = {
      ...nextState,
      pendingTransition: {
        chosenLabel,
        originParagraphs,
        paragraphs: outcomeParagraphs,
        continueLabel,
        nextSceneId,
        notices: nextState.recentNotices,
      },
      recentNotices: [],
    };

    return {
      state: nextState,
      shouldCheckpoint: false,
    };
  }

  nextState = {
    ...nextState,
    currentSceneId: nextSceneId,
    endingId: finalScene.isEndingTrigger ?? nextState.endingId,
  };

  return {
    state: nextState,
    shouldCheckpoint: Boolean(finalScene.checkpoint),
    checkpointLabel: finalScene.checkpointLabel ?? finalScene.title,
  };
}

export function commitTransition(
  state: GameState,
  registry: ContentRegistry
): StepResult {
  const pending = state.pendingTransition;
  if (!pending) {
    return { state, shouldCheckpoint: false };
  }
  const finalScene = registry.scenes[pending.nextSceneId];
  if (!finalScene) {
    throw new Error(`Destination scene not found: ${pending.nextSceneId}`);
  }

  const nextState: GameState = {
    ...state,
    currentSceneId: pending.nextSceneId,
    pendingTransition: undefined,
    recentNotices: [],
    endingId: finalScene.isEndingTrigger ?? state.endingId,
  };

  return {
    state: nextState,
    shouldCheckpoint: Boolean(finalScene.checkpoint),
    checkpointLabel: finalScene.checkpointLabel ?? finalScene.title,
  };
}

export function getDaoHeartSummary(state: GameState): string {
  const { righteous, worldly } = state.alignment;
  if (righteous <= -25) return '孤峭染煞';
  if (righteous >= 25 && worldly >= 10) return '侠骨入世';
  if (righteous >= 25) return '剑心清明';
  if (worldly >= 25) return '红尘长情';
  if (worldly <= -20) return '冷眼出世';
  return '审时守中';
}
