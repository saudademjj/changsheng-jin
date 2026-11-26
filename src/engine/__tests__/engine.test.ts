import { describe, expect, it } from 'vitest';
import { CONTENT_REGISTRY } from '../../content';
import {
  advanceChoice,
  applyEffect,
  autoDeriveStance,
  commitTransition,
  createInitialState,
  getResolvedChoices,
} from '../scheduler';
import {
  buyMarketGood,
  buyRelicOffer,
  getGoodPrice,
  getRelicOfferPrice,
  getRelicPriceReasons,
  recalculateMarketPulse,
  sellMarketGood,
} from '../economy';
import { computeTimeAdvance, formatCalendarDate, getAgeYears } from '../time';
import {
  exportSaveJson,
  importSaveJson,
  loadActiveRun,
  loadCheckpoints,
  loadMetaArchive,
  loadPrefs,
  recordCheckpoint,
  saveActiveRun,
  saveManualSlot,
  syncMetaFromState,
  validateAndNormalizeState,
  StorageAdapter,
} from '../storage';
import { formatEndingBadge } from '../../ui/EndingView';
import { isSuZhiweiAlive } from '../../content/companions';
import { interpolateText, resolveParagraphs, resolveTextValue } from '../template';
import {
  canCommitMajorArc,
  evaluateCoercion,
  getCompanionStatusBadge,
  getInvestigationProgress,
  getOvermatchProfile,
  getRemainingMajorArcSlots,
  isActiveDaoPartner,
  isCompanionDeceased,
  MAX_MAJOR_ARCS_PER_ACT,
} from '../systems';
import {
  canCommitBond,
  canTriggerMilestone1,
  commitCompanionBond,
  getSanctuaryActivities,
  giveSanctuaryGift,
  performSanctuaryActivity,
  triggerMilestone1,
} from '../sanctuary';
import {
  getActProgressSnapshot,
  getActTransitionEcho,
  getFactionStandings,
  getRealmLadder,
  getWorldClimateSnapshot,
  getWorldRegions,
} from '../worldview';
import { GameState, PlayerProfile } from '../types';

function makeMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    name: '陆云归',
    gender: 'male',
    honorific: '公子',
    originId: 'herbalist',
    openingEventIds: ['ev_charred_jade', 'ev_qingzhou_vow'],
    daoHeartId: 'seek_truth',
    ...overrides,
  };
}

function playStep(
  state: GameState,
  choiceId: string,
  rng: () => number = () => 0.2
): { afterChoice: GameState; afterCommit: GameState; hadOutcome: boolean } {
  const step = advanceChoice(state, choiceId, CONTENT_REGISTRY, rng);
  const afterChoice = step.state;
  const hadOutcome = Boolean(afterChoice.pendingTransition);
  const afterCommit = hadOutcome
    ? commitTransition(afterChoice, CONTENT_REGISTRY).state
    : afterChoice;
  return { afterChoice, afterCommit, hadOutcome };
}

describe('《长生烬》完整六幕核心引擎、限制机制与多结局验证', () => {
  it('全六幕剧本图完整性：所有场景、随机池、12结局与12真相碎片闭环无悬空引用', () => {
    const scenes = CONTENT_REGISTRY.scenes;
    const specialTokens = new Set([
      '__RETURN__',
      '__RANDOM_ACT1__',
      '__RANDOM_ACT2__',
      '__RANDOM_ACT3__',
      '__RANDOM_ACT4__',
      '__RANDOM_ACT5__',
    ]);

    expect(Object.keys(CONTENT_REGISTRY.endings).length).toBe(13);
    expect(Object.keys(CONTENT_REGISTRY.truthClues).length).toBe(12);
    expect(Object.keys(scenes).length).toBeGreaterThanOrEqual(80);

    for (const scene of Object.values(scenes)) {
      if (scene.isEndingTrigger) {
        expect(CONTENT_REGISTRY.endings[scene.isEndingTrigger]).toBeDefined();
      } else {
        expect(
          scene.choices.length,
          `Non-ending scene "${scene.id}" has zero choices`
        ).toBeGreaterThan(0);
      }

      for (const choice of scene.choices) {
        if (typeof choice.next === 'string' && !specialTokens.has(choice.next)) {
          expect(
            scenes[choice.next],
            `Scene "${scene.id}" choice "${choice.id}" points to missing scene "${choice.next}"`
          ).toBeDefined();
        }
      }
    }

    for (const rand of CONTENT_REGISTRY.randomEvents) {
      expect(
        scenes[rand.sceneId],
        `Random event "${rand.sceneId}" missing scene definition`
      ).toBeDefined();
      for (const choice of scenes[rand.sceneId].choices) {
        expect(
          choice.outcome && choice.outcome.length > 0,
          `Random event "${rand.sceneId}" choice "${choice.id}" missing outcome prose`
        ).toBe(true);
      }
    }
  });

  it('行迹谋划台限制与坊市免冷却：悬赏/潜修每幕限次，进出坊市零耗时零冷却', () => {
    let state = createInitialState(
      makeProfile({
        originId: 'scout',
        openingEventIds: ['ev_spirit_eyes', 'ev_broken_engagement'],
        daoHeartId: 'seek_longevity',
      }),
      CONTENT_REGISTRY
    );
    const step = (id: string) => {
      state = playStep(state, id, () => 0.2).afterCommit;
    };

    step('sharpen_resolve');
    step('enter_city_steady');

    // 无门路前，未结识的沈清霜与谢无咎不会突兀出现在青岚寻访列表
    const initHub = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
      CONTENT_REGISTRY
    );
    expect(initHub.some((c) => c.id === 'hub1_visit_shen')).toBe(false);
    expect(initHub.some((c) => c.id === 'hub1_visit_xie')).toBe(false);

    // 1. 坊市免费看行情验证：进入并离开南市不耗时间也不锁定
    const ageBeforeMarket = state.ageMonths;
    step('go_first_market');
    step('leave_first_market');
    expect(state.ageMonths).toBe(ageBeforeMarket);
    const afterMarketChoices = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
      CONTENT_REGISTRY
    );
    expect(
      afterMarketChoices.find((c) => c.id === 'go_first_market')?.locked
    ).toBe(false);

    // 2. 悬赏每幕限 2 次：做 2 次悬赏后，第 3 次锁定
    step('hub1_commission');
    step('a1_job_escort');
    const afterFirstJob = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
      CONTENT_REGISTRY
    );
    expect(afterFirstJob.find((c) => c.id === 'hub1_commission')?.locked).toBe(false);

    step('hub1_commission');
    step('a1_job_herb');
    const afterSecondJob = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
      CONTENT_REGISTRY
    );
    expect(afterSecondJob.find((c) => c.id === 'hub1_commission')?.locked).toBe(true);

    // 3. 潜修中途取消不消耗次数，真正潜修 2 次后锁定
    step('hub1_cultivate');
    step('a1_cult_back');
    expect(
      getResolvedChoices(
        state,
        CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
        CONTENT_REGISTRY
      ).find((c) => c.id === 'hub1_cultivate')?.locked
    ).toBe(false);

    step('hub1_cultivate');
    step('a1_cult_steady');
    step('hub1_cultivate');
    step('a1_cult_steady');
    expect(
      getResolvedChoices(
        state,
        CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
        CONTENT_REGISTRY
      ).find((c) => c.id === 'hub1_cultivate')?.locked
    ).toBe(true);
  });

  it('同页演绎与时间大限拦截：抉择先冻结上文演绎再翻页，超寿自动触发【枯骨问天】', () => {
    const state = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const { afterChoice, afterCommit, hadOutcome } = playStep(
      state,
      'bury_respectfully'
    );
    expect(hadOutcome).toBe(true);
    expect(afterChoice.currentSceneId).toBe('act1_start_herbalist');
    expect(afterChoice.pendingTransition?.originParagraphs.length).toBeGreaterThan(0);
    expect(afterChoice.pendingTransition?.paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(afterCommit.currentSceneId).toBe('act1_event_xinglin');

    expect(formatCalendarDate(state.year, state.seasonIndex)).toBe('长明三千零一十二年 · 春');
    const moved = computeTimeAdvance(state, 15);
    expect(moved.year).toBe(3013);
    expect(moved.seasonIndex).toBe(1);
    expect(getAgeYears(moved.ageMonths)).toBe(17);

    const oldState: GameState = {
      ...state,
      ageMonths: 79 * 12 + 11,
      lifespanYears: 80,
      currentSceneId: 'act1_qinglan_arrival',
    };
    const { afterCommit: dead } = playStep(oldState, 'hub1_crossroads', () => 0.1);
    expect(dead.endingId).toBe('ending_lifespan');
  });

  it('机遇式轻经济系统：跨幕行情动态涨跌、买卖结算与玄铁令折扣准确', () => {
    let state = createInitialState(
      makeProfile({
        originId: 'fallen_clan',
        openingEventIds: ['ev_blood_letter', 'ev_merchant_manual'],
      }),
      CONTENT_REGISTRY
    );
    const herb = CONTENT_REGISTRY.marketGoods.qingxin_herb;
    const baseBuyPrice = getGoodPrice(herb, state.market);
    const buyRes = buyMarketGood(state, herb, 2);
    expect(buyRes.ok).toBe(true);
    state = buyRes.state;

    state = {
      ...state,
      act: 'act2',
      flags: { ...state.flags, arc_plague_active: true, blood_pill_exposed: true },
    };
    state.market = recalculateMarketPulse(state);
    expect(getGoodPrice(herb, state.market)).toBeGreaterThan(baseBuyPrice);
    const sellRes = sellMarketGood(state, herb, 2);
    expect(sellRes.ok).toBe(true);
    expect(Number(sellRes.state.flags.total_trade_profit)).toBeGreaterThan(0);

    // 验证第五幕末法行情显著推升奇物指数
    const act5Market = recalculateMarketPulse({ ...state, act: 'act5' });
    expect(act5Market.curioIndex).toBeGreaterThanOrEqual(1.5);

    const poorState = { ...state, spiritStones: 10 };
    expect(
      buyRelicOffer(poorState, CONTENT_REGISTRY, 'foundation_pill', 280, 'elixir').ok
    ).toBe(false);
  });

  it('全六幕通关路线 A：凡胎→炼气→筑基→金丹→元婴→化神→真结局【双剑破长明】', () => {
    const storage = makeMemoryStorage();
    let state = createInitialState(
      makeProfile({
        originId: 'fallen_clan',
        openingEventIds: ['ev_charred_jade', 'ev_broken_sword_note'],
        daoHeartId: 'seek_truth',
      }),
      CONTENT_REGISTRY
    );
    const step = (choiceId: string) => {
      state = playStep(state, choiceId, () => 0.2).afterCommit;
    };

    // === 第一幕：凡胎 -> 炼气 ===
    step('sell_estate');
    step('ask_guidance');
    step('share_note_honestly');
    step('hub1_crossroads');
    step('side_with_qingyun');
    step('hub1_ready_breakthrough');
    step('qi_cangming_method');
    step('proceed_act1_finale');
    step('act1_choose_qingyun');

    // === 第二幕：炼气 -> 筑基 ===
    step('act2_qy_enter_hub');
    step('hub_sword_1');
    step('sword1_ally_shen');
    step('hub_sword_2');
    step('sword2_protect_shen');
    step('hub_blood_1');
    step('blood1_partner_xie');
    step('hub_blood_2');
    step('blood2_expose_all');
    step('hub2_companion_visit');
    step('hub2_visit_cangming');
    step('v_cm_ask_history');
    step('hub_foundation_gate');
    step('found_cangming_guard');
    step('demon_answer_defy');

    expect(state.act).toBe('act3');
    expect(state.realm).toBe('foundation_early');

    // === 第三幕：筑基 -> 金丹 ===
    step('act3_open_survey_all');
    step('hub3_sect_1');
    step('sect1_plan_heist');
    step('hub3_sect_2');
    step('sect2_break_vault_with_shen');
    step('hub3_soul_1');
    step('soul1_follow_cangming');
    step('hub3_soul_2');
    step('soul2_seize_wood_sword');
    expect(state.relics).toContain('soul_nourishing_wood');
    expect(state.relics).toContain('severing_sword_embryo');
    expect(state.truthClues).toContain('clue_alliance_pact');

    step('hub3_golden_core_gate');
    step('core_cangming_soulwood');
    expect(state.act).toBe('act4');
    expect(state.realm).toBe('golden_core');
    expect(state.lifespanYears).toBe(500);

    // === 第四幕：金丹 -> 元婴 ===
    step('act4_open_survey');
    step('hub4_zhantian_1');
    step('zt1_read_oath');
    step('zt2_rebuild_alliance');
    step('hub4_rebirth');
    step('cm_rebirth_wood');
    expect(state.tags).toContain('cangming_reborn');
    step('hub4_war_1');
    step('war1_audit_ledger');
    step('war2_back_xie_coup');
    expect(state.relics).toContain('ascension_ledger');
    // 卷四松崖共练碎天剑阵，再赴仙缘雅阁完成知交夜话与唯一道侣结契
    step('hub4_companion_visit');
    step('hub4_visit_shen');
    step('v_shen_act4_sky_sword');
    if (canTriggerMilestone1(state, 'shen_qingshuang')) {
      const m1 = triggerMilestone1(state, 'shen_qingshuang');
      expect(m1.ok).toBe(true);
      state = m1.state;
    }
    const bondRes = commitCompanionBond(state, 'shen_qingshuang', 'dao_partner');
    expect(bondRes.ok).toBe(true);
    state = bondRes.state;
    expect(state.daoPartnerId).toBe('shen_qingshuang');

    step('hub4_nascent_gate');
    step('nascent_companion_guard');
    expect(state.act).toBe('act5');
    expect(state.realm).toBe('nascent_soul');
    expect(state.lifespanYears).toBe(1000);

    // === 第五幕：元婴 -> 化神 ===
    step('act5_open_sword_resolve');
    expect(state.truthClues).toContain('clue_furnace_cycle');
    step('hub5_summit');
    step('summit_expose_ledger');
    expect(state.truthClues).toContain('clue_gate_weakness');
    step('hub5_final_eve');
    step('eve_vow_bonded');
    step('hub5_deity_breakthrough');
    step('deity_with_companion');

    // === 第六幕：叩天门 -> 真结局【双剑破长明】 ===
    expect(state.act).toBe('act6');
    expect(state.realm).toBe('deity_transform');
    expect(state.lifespanYears).toBe(2000);
    step('act6_step_to_climax');

    // 在终局前测试命盘刻痕导出/导入与多结局可达性
    recordCheckpoint(state, '第六幕叩天门前', CONTENT_REGISTRY, 'auto', storage);
    const savedAtGate = loadCheckpoints(storage)[0].state;
    expect(importSaveJson(exportSaveJson(savedAtGate))?.currentSceneId).toBe(
      'act6_final_choice'
    );

    // 验证终局按卷五道誓收束：立同途之誓并结道侣时解锁【双剑破长明】，收敛隐藏【孤剑斩天门】
    const finalChoices = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act6_final_choice,
      CONTENT_REGISTRY
    );
    expect(finalChoices.some((c) => c.id === 'final_sever_sky_bonded' && !c.locked)).toBe(true);
    expect(finalChoices.some((c) => c.id === 'final_sever_sky_solo')).toBe(false);
    expect(finalChoices.some((c) => c.id === 'final_false_ascension' && !c.locked)).toBe(true);

    step('final_sever_sky_bonded');
    expect(state.endingId).toBe('ending_sever_sky_bonded');
    expect(state.truthClues.length).toBeGreaterThanOrEqual(6);

    // 同步万象志，验证跨周目永久保留
    const meta = syncMetaFromState(state, { incrementRuns: true }, storage);
    expect(meta.unlockedEndings).toContain('ending_sever_sky_bonded');
    expect(meta.unlockedTruthClues.length).toBeGreaterThanOrEqual(6);
  });

  it('全六幕通关路线 B：苏知微延寿红尘线 → 真结局【无灵新世】', () => {
    let state = createInitialState(
      makeProfile({
        originId: 'herbalist',
        openingEventIds: ['ev_qingzhou_vow', 'ev_old_daoist_talisman'],
        daoHeartId: 'protect_one',
      }),
      CONTENT_REGISTRY
    );
    const step = (choiceId: string) => {
      state = playStep(state, choiceId, () => 0.4).afterCommit;
    };

    step('bury_respectfully');
    step('stay_help_suzhiwei');
    step('enter_city_steady');
    step('hub1_commission');
    step('a1_job_herb');
    step('hub1_crossroads');
    step('stay_detached');
    step('hub1_ready_breakthrough');
    step('qi_bitter_meditation');
    step('proceed_act1_finale');
    step('act1_choose_wanderer');

    // 第二幕：买延寿露救苏知微 + 探古脉 + 筑基
    step('act2_wd_enter_hub');
    step('hub_plague_1');
    step('plague1_help_labor');
    step('hub_vein_1');
    step('vein1_salvage_crystals'); // +165 stones
    step('hub_vein_2');
    step('vein2_cautious_deal');

    // 补足灵石去坊市买【九转延寿露】与【上品筑基丹】
    state = { ...state, spiritStones: Math.max(state.spiritStones, 700) };
    step('hub_open_market');
    const dewRes = buyRelicOffer(state, CONTENT_REGISTRY, 'longevity_dew', 240, 'elixir');
    expect(dewRes.ok).toBe(true);
    state = dewRes.state;
    const pillRes = buyRelicOffer(state, CONTENT_REGISTRY, 'foundation_pill', 280, 'elixir');
    expect(pillRes.ok).toBe(true);
    state = pillRes.state;
    step('market_return_hub');

    step('hub_plague_2');
    step('plague2_use_longevity_dew');
    expect(state.flags.su_zhiwei_saved_longlife).toBe(true);

    step('hub_foundation_gate');
    step('found_pill_orthodox');
    step('demon_answer_cherish');

    // 第三幕：青州二十年重逢获【无灵归尘印】 + 结丹
    step('act3_open_survey_all');
    step('hub3_hearth_1');
    step('hearth1_stay_companion');
    step('hearth2_accept_healthy');
    expect(state.relics).toContain('mortal_hearth_talisman');
    expect(state.tags).toContain('mortal_keeper');

    step('hub3_cultivate');
    step('a3_cult_steady');
    step('hub3_cultivate');
    step('a3_cult_steady');
    state = { ...state, spiritStones: Math.max(state.spiritStones, 450) };
    step('hub3_golden_core_gate');
    step('core_vein_array');

    // 第四幕：无灵古碑与安康苏知微温茶相约（玩家年未逾七十五，不强行写死）+ 成婴
    step('act4_open_survey');
    step('hub4_mortal');
    expect(getAgeYears(state.ageMonths)).toBeLessThan(75);
    step('mortal_su_warm_promise');
    expect(state.truthClues).toContain('clue_mortal_bloodline');
    expect(state.flags.su_zhiwei_passed).not.toBe(true);
    // 已有【无灵归尘印】时绝不重复赠第二枚
    expect(state.relics.filter((r) => r === 'mortal_hearth_talisman').length).toBe(1);

    step('hub4_cultivate');
    step('a4_cult_steady');
    step('hub4_cultivate');
    step('a4_cult_steady');
    state = { ...state, spiritStones: Math.max(state.spiritStones, 600) };
    step('hub4_nascent_gate');
    step('nascent_wealth_array');

    // 第五、六幕 -> 【无灵新世】真结局
    step('act5_open_calm_watch');
    step('hub5_summit');
    step('summit_observe_orthodox');
    step('hub5_final_eve');
    step('eve_vow_mortal');
    step('hub5_deity_breakthrough');
    step('deity_pure_will');
    step('act6_step_to_climax');
    step('final_mortal_new_era');
    expect(state.endingId).toBe('ending_mortal_new_era');
  });

  // ==================== 新增 P0 / P1 / P2 专项回归断言 ====================

  it('P0-1 历法与年龄零漂移验证：任意跨度推进始终保持 year - age === 2996', () => {
    let state = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const deltas = [1, 4, 7, 12, 3, 5, 19, 48, 360];
    let totalElapsed = 0;

    for (const d of deltas) {
      const res = computeTimeAdvance(state, d);
      totalElapsed += d;
      const expectedYear = 3012 + Math.floor(totalElapsed / 12);
      const expectedSeason = Math.floor((((totalElapsed % 12) + 12) % 12) / 3);
      expect(res.year).toBe(expectedYear);
      expect(res.seasonIndex).toBe(expectedSeason);
      expect(res.year - getAgeYears(res.ageMonths)).toBe(2996);
      state = {
        ...state,
        year: res.year,
        seasonIndex: res.seasonIndex,
        ageMonths: res.ageMonths,
      };
    }
  });

  it('P0-2 autoDeriveStance 降级验证：好感下跌必须正常降态，estranged 保持不可逆', () => {
    expect(autoDeriveStance('bonded', 8)).toBe('stranger');
    expect(autoDeriveStance('confidant', 29)).toBe('stranger');
    expect(autoDeriveStance('confidant', 30)).toBe('confidant');
    expect(autoDeriveStance('confidant', 74)).toBe('confidant');
    expect(autoDeriveStance('confidant', 75)).toBe('bonded');
    expect(autoDeriveStance('confidant', -15)).toBe('rival');
    expect(autoDeriveStance('rival', -6)).toBe('rival');
    expect(autoDeriveStance('rival', 0)).toBe('stranger');
    expect(autoDeriveStance('estranged', 60)).toBe('estranged');
  });

  it('P0-3 & P2-4 苏知微生死闭环与阿芸传灯：辞世后第五六幕绝不复活，转由徒弟阿芸续灯', () => {
    let state = createInitialState(makeProfile(), CONTENT_REGISTRY);
    state = {
      ...state,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 76 * 12,
      year: 3072,
      currentSceneId: 'act4_arc_mortal_truth',
      relics: ['mortal_hearth_talisman'],
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...state.companions,
        su_zhiwei: {
          ...state.companions.su_zhiwei,
          met: true,
          affection: 55,
          stance: 'bonded',
        },
      },
    };

    // 年逾七十五时于第四幕安然辞世
    const act4Choices = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act4_arc_mortal_truth,
      CONTENT_REGISTRY
    );
    expect(act4Choices.some((c) => c.id === 'mortal_su_farewell_vow')).toBe(true);
    state = playStep(state, 'mortal_su_farewell_vow').afterCommit;
    expect(state.flags.su_zhiwei_passed).toBe(true);

    // 辞世后第四幕寻访页绝不再出现拜访苏知微
    const visitChoices = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act4_companion_visit,
      CONTENT_REGISTRY
    );
    expect(visitChoices.some((c) => c.id === 'hub4_visit_su')).toBe(false);

    // 第五幕前夜：渲染段落应触发阿芸传灯，绝不出现“耄耋老人”
    const act5EveState: GameState = {
      ...state,
      act: 'act5',
      year: 3078,
      ageMonths: 82 * 12,
      currentSceneId: 'act5_arc_final_eve',
    };
    const eveTexts = CONTENT_REGISTRY.scenes.act5_arc_final_eve.paragraphs
      .map((p) => {
        if (typeof p === 'string') return p;
        if (typeof p === 'function') return p(act5EveState);
        if (p.when && !p.when(act5EveState)) return '';
        return typeof p.text === 'function' ? p.text(act5EveState) : p.text;
      })
      .join('\n');
    expect(eveTexts).toContain('阿芸');
    expect(eveTexts).toContain('无灵医典');
    expect(eveTexts).not.toContain('耄耋老人');

    // 第五幕传讯：parley_su 触发阿芸寄来续写医典
    const parleyState: GameState = {
      ...act5EveState,
      currentSceneId: 'act5_companion_parley',
    };
    const parleyStep = playStep(parleyState, 'parley_su');
    const parleyOutcome = (parleyStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(parleyOutcome).toContain('阿芸');

    // 第六幕结局尾声：写阿芸续燃药炉灯火，绝不出现“多添了两勺桂花糖”
    const epilogueText = CONTENT_REGISTRY.endings.ending_sever_sky_solo
      .epilogue(act5EveState)
      .join('\n');
    expect(epilogueText).toContain('阿芸');
    expect(epilogueText).not.toContain('多添了两勺桂花糖');
  });

  it('P0-4 苍溟封印闭环与单人护法措辞：永封后第五六幕绝不越狱，且单人护法不用“分立四周”', () => {
    let state = createInitialState(makeProfile(), CONTENT_REGISTRY);
    state = {
      ...state,
      act: 'act4',
      realm: 'golden_core',
      currentSceneId: 'act4_arc_cangming_rebirth',
      tags: [...state.tags, 'cangming_reborn'],
      companions: {
        ...state.companions,
        cang_ming: {
          ...state.companions.cang_ming,
          met: true,
          affection: 50,
          stance: 'bonded',
        },
      },
    };

    state = playStep(state, 'cm_seal_jade').afterCommit;
    expect(state.flags.cangming_sealed).toBe(true);
    expect(state.companions.cang_ming.stance).toBe('estranged');
    expect(state.tags).not.toContain('cangming_reborn');

    // 第五幕开篇：断玉沉寂，苍溟绝不开口或立于石阶
    const openTexts = CONTENT_REGISTRY.scenes.act5_opening.paragraphs
      .map((p) => {
        if (typeof p === 'string') return p;
        if (typeof p === 'function') return p(state);
        if (p.when && !p.when(state)) return '';
        return typeof p.text === 'function' ? p.text(state) : p.text;
      })
      .join('\n');
    expect(openTexts).toContain('沉寂冰冷');
    expect(openTexts).not.toContain('开炉收药');
    expect(openTexts).not.toContain('重塑真身的苍溟');

    // 第五幕雪夜：被封印苍溟绝不踏雪递战帖
    const eveChoices = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act5_arc_final_eve,
      CONTENT_REGISTRY
    );
    expect(eveChoices.some((c) => c.id === 'eve_confront_rival')).toBe(false);

    // 化神渡劫：仅苍溟被封时不可选挚友护法；若仅沈清霜一人忠诚护法，措辞为单人而非“分立绝巅四周”
    const deityChoicesSealed = getResolvedChoices(
      state,
      CONTENT_REGISTRY.scenes.act5_deity_breakthrough,
      CONTENT_REGISTRY
    );
    expect(deityChoicesSealed.some((c) => c.id === 'deity_with_companion')).toBe(false);

    const singleProtectorState: GameState = {
      ...state,
      act: 'act5',
      currentSceneId: 'act5_deity_breakthrough',
      companions: {
        ...state.companions,
        shen_qingshuang: {
          ...state.companions.shen_qingshuang,
          met: true,
          affection: 50,
          stance: 'bonded',
        },
      },
    };
    const singleStep = playStep(singleProtectorState, 'deity_with_companion');
    const singleOutcome = (singleStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(singleOutcome).toContain('孤身立于绝巅外缘');
    expect(singleOutcome).not.toContain('分立绝巅四周');

    // 结局尾声：存在专属封印沉寂交代
    const endingText = CONTENT_REGISTRY.endings.ending_sever_sky_solo
      .epilogue(state)
      .join('\n');
    expect(endingText).toContain('荒泽深泥');
  });

  it('P0-5 & P0-6 & P1-4 商道结局、魔尊防误触与零双“与”语病验证', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. 青岚商名 + 350 灵石可触达【灵石通神】
    const merchantAct2: GameState = {
      ...base,
      act: 'act2',
      spiritStones: 350,
      tags: [...base.tags, 'merchant_fame'],
      currentSceneId: 'act2_market_grand',
    };
    const act2MarketChoices = getResolvedChoices(
      merchantAct2,
      CONTENT_REGISTRY.scenes.act2_market_grand,
      CONTENT_REGISTRY
    );
    expect(act2MarketChoices.some((c) => c.id === 'market_merchant_ending')).toBe(true);

    // 2. 无灵脉契且与谢无咎交恶的魔尊，无法触发【万金镇山河】或【红尘散仙】
    const demonLord: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      spiritStones: 900,
      mind: 180,
      might: 160,
      alignment: { righteous: -100, worldly: -20 },
      tags: ['demonic_sovereign'],
      relics: [],
      truthClues: ['clue_stele_gap', 'clue_blood_pill_dust', 'clue_alliance_pact', 'clue_tianji_portal', 'clue_furnace_cycle'],
      companions: {
        ...base.companions,
        xie_wujiu: { ...base.companions.xie_wujiu, met: true, affection: -30, stance: 'rival' },
      },
      currentSceneId: 'act6_final_choice',
    };
    const demonChoices = getResolvedChoices(
      demonLord,
      CONTENT_REGISTRY.scenes.act6_final_choice,
      CONTENT_REGISTRY
    );
    expect(demonChoices.some((c) => c.id === 'final_gilded_realm')).toBe(false);
    expect(demonChoices.some((c) => c.id === 'final_earth_immortal')).toBe(false);
    expect(demonChoices.find((c) => c.id === 'final_demonic_devour')?.locked).toBe(true);
    const qualifiedDemonChoices = getResolvedChoices(
      { ...demonLord, might: 225, mind: 195 },
      CONTENT_REGISTRY.scenes.act6_final_choice,
      CONTENT_REGISTRY
    );
    expect(qualifiedDemonChoices.find((c) => c.id === 'final_demonic_devour')?.locked).toBe(false);

    // 3. 多位心许挚友同屏：绝不出现“与X与Y”双“与”语病
    const multiBonded: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      tags: ['cangming_reborn'],
      truthClues: [
        'clue_stele_gap',
        'clue_vein_drain',
        'clue_blood_pill_dust',
        'clue_alliance_pact',
        'clue_tianji_portal',
        'clue_furnace_cycle',
        'clue_gate_weakness',
      ],
      companions: {
        ...base.companions,
        shen_qingshuang: { ...base.companions.shen_qingshuang, met: true, affection: 75, stance: 'bonded' },
        xie_wujiu: { ...base.companions.xie_wujiu, met: true, affection: 75, stance: 'bonded' },
        cang_ming: { ...base.companions.cang_ming, met: true, affection: 75, stance: 'bonded' },
      },
      currentSceneId: 'act6_final_choice',
    };
    const bondedChoice = getResolvedChoices(
      multiBonded,
      CONTENT_REGISTRY.scenes.act6_final_choice,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'final_sever_sky_bonded');
    expect(bondedChoice?.label).toContain('与沈清霜、谢无咎、苍溟');
    expect(bondedChoice?.label).not.toMatch(/与[^，。]+与/);
    const bondedEpilogue = CONTENT_REGISTRY.endings.ending_sever_sky_bonded
      .epilogue(multiBonded)
      .join('\n');
    expect(bondedEpilogue).toContain('与沈清霜、谢无咎、苍溟');
    expect(bondedEpilogue).not.toMatch(/与[^，。]+与/);
  });

  it('P1-1 & P2-1 坊市批量买卖、延寿露杏林豁免、无价格倒挂与开局宿缘保底验证', () => {
    // 1. 批量买 5 卖 5
    let state = createInitialState(
      makeProfile({
        originId: 'herbalist',
        openingEventIds: ['ev_broken_engagement', 'ev_old_daoist_talisman'],
      }),
      CONTENT_REGISTRY
    );
    state = { ...state, spiritStones: 1000 };
    const good = CONTENT_REGISTRY.marketGoods.qingxin_herb;
    const buy5 = buyMarketGood(state, good, 5);
    expect(buy5.ok).toBe(true);
    expect(buy5.state.market.holdings[good.id]?.qty).toBe(5);
    const sell5 = sellMarketGood(buy5.state, good, 5);
    expect(sell5.ok).toBe(true);
    expect(sell5.state.market.holdings[good.id]).toBeUndefined();

    // 2. 怪疫期间【九转延寿露】豁免暴涨且寒门采药人享杏林平价
    const plagueState: GameState = {
      ...state,
      act: 'act2',
      flags: { arc_plague_active: true, blood_pill_exposed: true },
    };
    plagueState.market = recalculateMarketPulse(plagueState);
    const dewPrice = getRelicOfferPrice(240, 'elixir', plagueState, 'longevity_dew');
    expect(dewPrice).toBeLessThanOrEqual(200);
    expect(getRelicPriceReasons(plagueState, 'longevity_dew')).toContain('杏林平价');

    // 3. Act 4 -> Act 5 锁天印无价格倒挂
    const act4Seal = CONTENT_REGISTRY.scenes.act4_market.market!.relicOffers.find(
      (r) => r.relicId === 'broken_sky_seal'
    )!.basePrice;
    const act5Seal = CONTENT_REGISTRY.scenes.act5_market.market!.relicOffers.find(
      (r) => r.relicId === 'broken_sky_seal'
    )!.basePrice;
    expect(act5Seal).toBeGreaterThanOrEqual(act4Seal);

    // 4. 第二幕枢纽保底回收退婚庚帖与荒庙旧符宿缘
    const act2EchoState: GameState = {
      ...state,
      act: 'act2',
      actBeat: 1,
      currentSceneId: 'act2_hub',
    };
    const act2HubChoices = getResolvedChoices(
      act2EchoState,
      CONTENT_REGISTRY.scenes.act2_hub,
      CONTENT_REGISTRY
    );
    expect(act2HubChoices.some((c) => c.id === 'hub2_engagement_echo')).toBe(true);
    expect(act2HubChoices.some((c) => c.id === 'hub2_talisman_echo')).toBe(true);
  });

  it('全六幕四线通关冒烟测试（商道线【万金镇山河】+ 魔道反目线【以魔吞界】）', () => {
    // 路线 C：暗市商道 -> 万金镇山河
    let sC = createInitialState(
      makeProfile({
        originId: 'fallen_clan',
        openingEventIds: ['ev_blood_letter', 'ev_merchant_manual'],
        daoHeartId: 'seek_longevity',
      }),
      CONTENT_REGISTRY
    );
    const stepC = (id: string) => {
      sC = playStep(sC, id, () => 0.3).afterCommit;
    };
    stepC('sell_estate');
    stepC('enter_city_steady');
    stepC('take_token');
    stepC('hub1_crossroads');
    stepC('cover_for_darkmarket');
    stepC('hub1_ready_breakthrough');
    stepC('qi_use_stones');
    stepC('proceed_act1_finale');
    stepC('act1_choose_darkmarket');
    stepC('act2_dm_enter_hub');
    expect(
      getResolvedChoices(sC, CONTENT_REGISTRY.scenes.act2_hub, CONTENT_REGISTRY).length
    ).toBeLessThanOrEqual(10);
    stepC('hub_blood_1');
    stepC('blood1_partner_xie');
    stepC('hub_blood_2');
    stepC('blood2_expose_all');
    stepC('hub2_cultivate');
    stepC('a2_cult_meditate');
    sC = { ...sC, spiritStones: 800 };
    stepC('hub_open_market');
    sC = buyRelicOffer(sC, CONTENT_REGISTRY, 'foundation_pill', 280, 'elixir').state;
    stepC('market_return_hub');
    stepC('hub_foundation_gate');
    stepC('found_array_or_stones');
    stepC('demon_answer_defy');
    stepC('act3_open_survey_all');
    stepC('hub3_chamber_1');
    stepC('chamber1_team_xie');
    stepC('hub3_chamber_2');
    stepC('chamber2_smash_ladder');
    expect(sC.relics).toContain('spirit_vein_deed');
    stepC('hub3_cultivate');
    stepC('a3_cult_steady');
    stepC('hub3_golden_core_gate');
    stepC('core_vein_array');
    stepC('act4_open_survey');
    stepC('hub4_war_1');
    stepC('war1_audit_ledger');
    stepC('war2_back_xie_coup');
    stepC('hub4_cultivate');
    stepC('a4_cult_steady');
    sC = { ...sC, spiritStones: 1200 };
    stepC('hub4_nascent_gate');
    stepC('nascent_wealth_array');
    stepC('act5_open_sword_resolve');
    stepC('hub5_summit');
    stepC('summit_expose_ledger');
    stepC('hub5_final_eve');
    stepC('eve_vow_bonded');
    sC = { ...sC, spiritStones: Math.max(sC.spiritStones, 600) };
    stepC('hub5_deity_breakthrough');
    stepC('deity_with_stones_array');
    stepC('act6_step_to_climax');
    stepC('final_gilded_realm');
    expect(sC.endingId).toBe('ending_gilded_realm');

    // 路线 D：冷酷魔道（压制苍溟 + 截胡赤阳 + 吞煞渡劫）-> 以魔吞界
    let sD = createInitialState(
      makeProfile({
        originId: 'scout',
        openingEventIds: ['ev_charred_jade', 'ev_spirit_eyes'],
        daoHeartId: 'revenge_defy',
      }),
      CONTENT_REGISTRY
    );
    const stepD = (id: string) => {
      sD = playStep(sD, id, () => 0.3).afterCommit;
    };
    stepD('sharpen_resolve');
    stepD('question_cangming');
    stepD('enter_city_steady');
    stepD('hub1_crossroads');
    stepD('stay_detached');
    stepD('hub1_ready_breakthrough');
    stepD('qi_bitter_meditation');
    stepD('proceed_act1_finale');
    stepD('act1_choose_wanderer');
    stepD('act2_wd_enter_hub');
    stepD('hub_vein_1');
    stepD('vein1_suppress_soul');
    stepD('hub_vein_2');
    stepD('vein2_cold_distrust');
    stepD('hub2_cultivate');
    stepD('a2_cult_meditate');
    expect(sD.companions.cang_ming.affection).toBeLessThan(0);
    sD = { ...sD, spiritStones: 600 };
    stepD('hub_open_market');
    sD = buyRelicOffer(sD, CONTENT_REGISTRY, 'foundation_pill', 280, 'elixir').state;
    stepD('market_return_hub');
    stepD('hub_foundation_gate');
    stepD('found_pill_orthodox');
    stepD('demon_answer_defy');
    stepD('act3_open_sharpen_blade');
    stepD('hub3_soul_1');
    stepD('soul1_cangming_suppress');
    stepD('hub3_soul_2');
    stepD('soul2_seize_wood_for_self');
    expect(sD.companions.cang_ming.stance).toBe('rival');
    sD = { ...sD, mind: Math.max(sD.mind, 115) };
    stepD('hub3_cultivate');
    stepD('a3_cult_steady');
    stepD('hub3_golden_core_gate');
    stepD('core_blood_demon_shortcut');
    expect(sD.tags).toContain('demonic_sovereign');
    stepD('act4_open_assert');
    stepD('hub4_rebirth');
    stepD('cm_rebirth_wood'); // 低好感复生反目！
    expect(sD.companions.cang_ming.stance).toBe('rival');
    expect(sD.tags).toContain('cangming_reborn');
    stepD('hub4_war_1');
    stepD('war1_scout_mines');
    stepD('war2_warlord_seize');
    expect(sD.companions.xie_wujiu.stance).toBe('rival');
    sD = { ...sD, mind: Math.max(sD.mind, 155) };
    stepD('hub4_nascent_gate');
    stepD('nascent_blood_demon');
    stepD('act5_open_sword_resolve');
    stepD('hub5_summit');
    stepD('summit_storm_altar');
    stepD('hub5_final_eve');
    stepD('eve_confront_rival');
    stepD('hub5_deity_breakthrough');
    stepD('deity_pure_will');
    stepD('act6_step_to_climax');
    stepD('final_demonic_devour');
    expect(sD.endingId).toBe('ending_demonic_devour');
  });

  it('Cycle 1 专项回归：前态求值、商道门槛、亡者复活拦截、零幽灵提及、全枢纽≤9项与跨幕结局一致性', () => {
    // 1. found_bare_force 前态判定严格按 95（76 必须陨落，95 必过）
    const baseFound = createInitialState(
      makeProfile({ originId: 'orphan', openingEventIds: ['ev_broken_engagement', 'ev_old_daoist_talisman'] }),
      CONTENT_REGISTRY
    );
    const lowFound: GameState = {
      ...baseFound,
      act: 'act2',
      realm: 'qi_peak',
      might: 38,
      mind: 38,
      currentSceneId: 'act2_foundation_gate',
    };
    const lowFoundRes = playStep(lowFound, 'found_bare_force');
    expect(lowFoundRes.afterCommit.endingId).toBe('ending_fallen_path');

    const okFound: GameState = { ...lowFound, might: 48, mind: 47 };
    const okFoundRes = playStep(okFound, 'found_bare_force');
    expect(okFoundRes.afterCommit.currentSceneId).toBe('act2_heart_demon');

    // 2. a1_job_escort 前态 might=12 得 50 灵石且文案准确报五十
    const escortStart: GameState = {
      ...createInitialState(
        makeProfile({ originId: 'fallen_clan', openingEventIds: ['ev_broken_engagement', 'ev_old_daoist_talisman'] }),
        CONTENT_REGISTRY
      ),
      might: 12,
      spiritStones: 0,
      currentSceneId: 'act1_action_commission',
    };
    const escortRes = playStep(escortStart, 'a1_job_escort');
    expect(escortRes.afterCommit.spiritStones).toBe(50);
    expect((escortRes.afterChoice.pendingTransition?.paragraphs ?? []).join('')).toContain('五十块灵石');
    expect((escortRes.afterChoice.pendingTransition?.paragraphs ?? []).join('')).not.toContain('七十五');

    // 3. zt2_rebuild_alliance 空手进窟不误报“随身携来的斩天剑胚”
    const ztState: GameState = {
      ...baseFound,
      act: 'act4',
      realm: 'golden_core',
      relics: [],
      currentSceneId: 'act4_arc_zhantian_2',
    };
    const ztRes = playStep(ztState, 'zt2_rebuild_alliance');
    expect(ztRes.afterCommit.relics).toContain('severing_sword_embryo');
    expect((ztRes.afterChoice.pendingTransition?.paragraphs ?? []).join('')).not.toContain('随身携来');

    // 4. act4_arc_mortal_truth 首次得印不误报“早已珍藏”（常年成丹 78 岁未服延寿露时苏知微已寿终）
    const mortalState: GameState = {
      ...baseFound,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 78 * 12,
      year: 2996 + 78,
      relics: [],
      companions: {
        ...baseFound.companions,
        su_zhiwei: { ...baseFound.companions.su_zhiwei, met: true, affection: 30, stance: 'confidant' },
      },
      currentSceneId: 'act4_arc_mortal_truth',
    };
    const mortalRes = playStep(mortalState, 'mortal_copy_and_guard');
    expect((mortalRes.afterChoice.pendingTransition?.paragraphs ?? []).join('')).not.toContain('早已珍藏');

    // 5. 30 灵石破产即便净赚≥260 也不触发【灵石通神】
    const brokeMerchant: GameState = {
      ...baseFound,
      act: 'act2',
      spiritStones: 30,
      flags: { ...baseFound.flags, total_trade_profit: 300 },
      currentSceneId: 'act2_market_grand',
    };
    expect(
      getResolvedChoices(brokeMerchant, CONTENT_REGISTRY.scenes.act2_market_grand, CONTENT_REGISTRY)
        .some((c) => c.id === 'market_merchant_ending')
    ).toBe(false);

    // 6. 未延寿且已逾六十八岁自然寿限的苏知微在卷四不可被寻访（杜绝亡者复活）
    const act4VisitState: GameState = {
      ...mortalState,
      currentSceneId: 'act4_companion_visit',
    };
    expect(
      getResolvedChoices(act4VisitState, CONTENT_REGISTRY.scenes.act4_companion_visit, CONTENT_REGISTRY)
        .some((c) => c.id === 'hub4_visit_su')
    ).toBe(false);

    // 7. 孤狼零伴侣在卷三枢纽不幽灵提及沈清霜/谢无咎
    const loneAct3: GameState = {
      ...baseFound,
      act: 'act3',
      realm: 'foundation_early',
      activeThreads: ['thread_act3_sect', 'thread_act3_chamber'],
      currentSceneId: 'act3_hub',
    };
    const act3Paras = CONTENT_REGISTRY.scenes.act3_hub.paragraphs
      .flatMap((p) => {
        if (typeof p === 'string') return [p];
        if (typeof p === 'function') {
          const v = p(loneAct3);
          return Array.isArray(v) ? v : v ? [v] : [];
        }
        return p.when(loneAct3) ? [typeof p.text === 'function' ? p.text(loneAct3) : p.text].flat() : [];
      })
      .join('\n');
    expect(act3Paras).not.toContain('沈清霜');
    expect(act3Paras).not.toContain('谢无咎');

    // 8. 荒庙旧符燃尽后必须移除 old_daoist_talisman 命格
    const talismanState: GameState = {
      ...baseFound,
      act: 'act2',
      currentSceneId: 'rand_act2_heart_whisper',
    };
    const talismanRes = playStep(talismanState, 'r2_whisper_talisman');
    expect(talismanRes.afterCommit.tags).not.toContain('old_daoist_talisman');

    // 9. 全五幕枢纽在最坏并发态下全部 ≤ 9 项（不挤掉 1-9 快捷键）
    const worstBase: GameState = {
      ...baseFound,
      might: 150,
      mind: 150,
      actBeat: 5,
      tags: [...baseFound.tags, 'broken_engagement', 'old_daoist_talisman', 'qingyun_outer', 'dark_market_broker'],
      flags: { ...baseFound.flags, act1_rumor_plague: true, shen_invited_player: true, xie_invited_player: true },
      companions: {
        shen_qingshuang: { met: true, affection: 50, stance: 'bonded', stage: 3, chronicle: [] },
        xie_wujiu: { met: true, affection: 50, stance: 'bonded', stage: 3, chronicle: [] },
        su_zhiwei: { met: true, affection: 50, stance: 'bonded', stage: 3, chronicle: [] },
        cang_ming: { met: true, affection: 50, stance: 'bonded', stage: 3, chronicle: [] },
      },
    };
    const hubScenarios: Array<{ id: string; act: GameState['act']; threads: string[] }> = [
      { id: 'act1_qinglan_arrival', act: 'act1', threads: [] },
      {
        id: 'act2_hub',
        act: 'act2',
        threads: ['thread_sword_trial', 'thread_blood_pill', 'thread_qingzhou_plague', 'thread_ancient_vein'],
      },
      {
        id: 'act3_hub',
        act: 'act3',
        threads: ['thread_act3_sect', 'thread_act3_chamber', 'thread_act3_hearth', 'thread_act3_soul'],
      },
      {
        id: 'act4_hub',
        act: 'act4',
        threads: ['thread_act4_zhantian', 'thread_act4_rebirth', 'thread_act4_war', 'thread_act4_mortal'],
      },
      {
        id: 'act5_hub',
        act: 'act5',
        threads: ['thread_act5_summit', 'thread_act5_eve'],
      },
    ];
    for (const h of hubScenarios) {
      const st: GameState = {
        ...worstBase,
        act: h.act,
        activeThreads: h.threads,
        currentSceneId: h.id,
      };
      const choices = getResolvedChoices(st, CONTENT_REGISTRY.scenes[h.id], CONTENT_REGISTRY);
      expect(choices.length, `${h.id} choices overflow (>9)`).toBeLessThanOrEqual(9);
    }

    // 10. 跨幕结局文案一致：卷三/卷四入魔不写炼气血煞丹，元婴自封不写两千载
    const act4DemonEpilogue = CONTENT_REGISTRY.endings.ending_blood_demon
      .epilogue({ ...worstBase, act: 'act4', realm: 'golden_core' })
      .join('\n');
    expect(act4DemonEpilogue).toContain('金丹修士');
    expect(act4DemonEpilogue).not.toContain('炼气修士');
    const nascentEarthEpilogue = CONTENT_REGISTRY.endings.ending_earth_immortal
      .epilogue({ ...worstBase, act: 'act5', realm: 'nascent_soul' })
      .join('\n');
    expect(nascentEarthEpilogue).toContain('千载寿元');
    expect(nascentEarthEpilogue).not.toContain('两千载');
  });

  it('Cycle 2 专项回归：防心许降级、纪事去重/起始年锚定、敌对收口、动态故人志与多伴侣化学反应', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. 低好感陌生人不再一步跳级心许；达到 75 结契门槛后永不因正反馈降级
    const lowShenStart: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_mid',
      currentSceneId: 'act3_arc_sect_2',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 10, stance: 'stranger', stage: 2, chronicle: [] },
      },
    };
    const afterSect2Low = playStep(lowShenStart, 'sect2_break_vault_with_shen').afterCommit;
    expect(afterSect2Low.companions.shen_qingshuang.stance).toBe('confidant');

    const bondedShenStart: GameState = {
      ...lowShenStart,
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 68, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    const afterSect2 = playStep(bondedShenStart, 'sect2_break_vault_with_shen').afterCommit;
    expect(afterSect2.companions.shen_qingshuang.stance).toBe('bonded');
    expect(afterSect2.companions.shen_qingshuang.affection).toBeGreaterThanOrEqual(75);
    const afterFollowUpVisit = playStep(
      { ...afterSect2, currentSceneId: 'visit_shen_qingshuang' },
      'v_shen_act3_sect_intel'
    ).afterCommit;
    expect(afterFollowUpVisit.companions.shen_qingshuang.stance).toBe('bonded');

    // 2. 未结识伴侣不弹出“心生亲近”提示
    const unmetBlood: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_mid',
      currentSceneId: 'act2_arc_blood_2',
    };
    const bloodRes = playStep(unmetBlood, 'blood2_expose_all');
    const bloodNotices = [
      ...bloodRes.afterChoice.recentNotices,
      ...(bloodRes.afterChoice.pendingTransition?.notices ?? []),
    ].join('\n');
    expect(bloodNotices).not.toContain('沈清霜对你心生亲近');
    expect(bloodRes.afterCommit.companions.shen_qingshuang.met).toBe(false);

    // 3. 伴侣纪事按正文去重 + 碎丹成婴护法记于起始年而非 23 年后
    const visitOnce = playStep(
      { ...afterSect2, year: 3032, currentSceneId: 'visit_shen_qingshuang' },
      'v_shen_act3_overmatch'
    ).afterCommit;
    const visitTwice = playStep(
      { ...visitOnce, year: 3035, currentSceneId: 'visit_shen_qingshuang' },
      'v_shen_act3_overmatch'
    ).afterCommit;
    const sparChronicles = visitTwice.companions.shen_qingshuang.chronicle.filter((c) =>
      c.includes('云岭松崖以真剑印证破防关窍')
    );
    expect(sparChronicles.length).toBe(1);

    const nascentMulti: GameState = {
      ...base,
      act: 'act4',
      year: 3055,
      ageMonths: 59 * 12,
      realm: 'golden_core',
      tags: [...base.tags, 'cangming_reborn'],
      currentSceneId: 'act4_nascent_gate',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 75, stance: 'bonded', stage: 4, chronicle: [] },
        xie_wujiu: { met: true, affection: 70, stance: 'bonded', stage: 4, chronicle: [] },
        cang_ming: { met: true, affection: 80, stance: 'bonded', stage: 4, chronicle: [] },
      },
    };
    const nascentStep = playStep(nascentMulti, 'nascent_companion_guard');
    expect(nascentStep.afterCommit.year).toBe(3078);
    expect(nascentStep.afterCommit.companions.shen_qingshuang.chronicle[0]).toContain('3055年');
    expect(nascentStep.afterCommit.companions.xie_wujiu.chronicle[0]).toContain('3055年');
    expect(nascentStep.afterCommit.companions.cang_ming.chronicle[0]).toContain('3055年');
    expect((nascentStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).toContain('沈清霜');
    expect((nascentStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).toContain('谢无咎');

    // 4. 动态故人志隐藏早期剧透并随叛宗/复生/敌对演进
    const cmDef = CONTENT_REGISTRY.companions.cang_ming;
    const cmTitleEarly = typeof cmDef.title === 'function' ? cmDef.title(base) : cmDef.title;
    const cmBioEarly = typeof cmDef.bio === 'function' ? cmDef.bio(base) : cmDef.bio;
    expect(cmTitleEarly).not.toContain('碎天剑尊');
    expect(cmBioEarly).not.toContain('三千年前');
    const cmTitleReborn = typeof cmDef.title === 'function' ? cmDef.title(nascentMulti) : cmDef.title;
    expect(cmTitleReborn).toContain('重塑真身');

    // 5. 敌对谢无咎废除玄铁令折扣
    const hostileXie: GameState = {
      ...base,
      relics: ['baibao_token'],
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: -25, stance: 'rival', stage: 4, chronicle: [] },
      },
    };
    const normalXie: GameState = {
      ...base,
      relics: ['baibao_token'],
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: 30, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    expect(getRelicOfferPrice(200, 'curio', hostileXie)).toBe(200);
    expect(getRelicOfferPrice(200, 'curio', normalXie)).toBe(170);
    expect(getRelicPriceReasons(hostileXie)).not.toContain('玄铁令折');
    expect(getRelicPriceReasons(normalXie)).toContain('玄铁令折');

    // 6. rival 沈清霜在绝渊石壁不触发友好读碑，且雪夜旧敌逐人点名并写入纪事
    const rivalAct4: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      currentSceneId: 'act4_arc_zhantian_1',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: -20, stance: 'rival', stage: 4, chronicle: [] },
      },
    };
    const zt1Text = CONTENT_REGISTRY.scenes.act4_arc_zhantian_1.paragraphs
      .flatMap((p) => {
        if (typeof p === 'string') return [p];
        if (typeof p === 'function') return [p(rivalAct4)].flat().filter(Boolean) as string[];
        return p.when(rivalAct4) ? [typeof p.text === 'function' ? p.text(rivalAct4) : p.text].flat() : [];
      })
      .join('\n');
    expect(zt1Text).toContain('旧账未清');
    expect(zt1Text).not.toContain('飞鹤约定');

    const multiFoeEve: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      tags: [...base.tags, 'cangming_reborn'],
      flags: { betrayed_shen_at_stele: true },
      currentSceneId: 'act5_arc_final_eve',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: -35, stance: 'estranged', stage: 4, chronicle: [] },
        xie_wujiu: { met: true, affection: -30, stance: 'rival', stage: 4, chronicle: [] },
        cang_ming: { met: true, affection: -20, stance: 'rival', stage: 4, chronicle: [] },
      },
    };
    const foeRes = playStep(multiFoeEve, 'eve_confront_rival');
    const foeOutcome = (foeRes.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(foeOutcome).toContain('沈清霜');
    expect(foeOutcome).toContain('谢无咎');
    expect(foeOutcome).toContain('苍溟');
    expect(foeRes.afterCommit.companions.shen_qingshuang.chronicle.length).toBe(1);
    expect(foeRes.afterCommit.companions.xie_wujiu.chronicle.length).toBe(1);
    expect(foeRes.afterCommit.companions.cang_ming.chronicle.length).toBe(1);

    // 7. 群雄会潜行双友并现 + 卷五传讯苏知微存活写入纪事
    const summitBoth = playStep(
      { ...nascentMulti, act: 'act5', realm: 'nascent_soul', currentSceneId: 'act5_arc_summit' },
      'summit_stealth_copy'
    );
    const summitText = (summitBoth.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(summitText).toContain('谢无咎');
    expect(summitText).toContain('沈清霜');

    const parleySuAlive = playStep(
      {
        ...base,
        act: 'act5',
        realm: 'nascent_soul',
        lifespanYears: 1000,
        ageMonths: 80 * 12,
        flags: { su_zhiwei_saved_longlife: true },
        currentSceneId: 'act5_companion_parley',
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: 55, stance: 'bonded', stage: 4, chronicle: [] },
        },
      },
      'parley_su'
    );
    expect(parleySuAlive.afterCommit.companions.su_zhiwei.affection).toBe(63);
    expect(parleySuAlive.afterCommit.companions.su_zhiwei.chronicle.length).toBe(1);
  });

  it('Cycle 3 专项回归：跨幕破境隔离、易物会防无限刷、奇物灵石锁与重复折现、零线索防剧透及奇物实战闭环', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 卷二完成线程不污染卷三结丹解锁；卷四完成线程不污染卷五化神解锁
    const freshAct3: GameState = {
      ...base,
      act: 'act3',
      actBeat: 0,
      might: 50,
      completedThreads: ['thread_sword_trial', 'thread_blood_pill'],
      currentSceneId: 'act3_hub',
    };
    expect(
      getResolvedChoices(freshAct3, CONTENT_REGISTRY.scenes.act3_hub, CONTENT_REGISTRY)
        .some((c) => c.id === 'hub3_golden_core_gate')
    ).toBe(false);

    const freshAct5: GameState = {
      ...base,
      act: 'act5',
      actBeat: 0,
      completedThreads: ['thread_act4_zhantian', 'thread_act4_war'],
      currentSceneId: 'act5_hub',
    };
    expect(
      getResolvedChoices(freshAct5, CONTENT_REGISTRY.scenes.act5_hub, CONTENT_REGISTRY)
        .some((c) => c.id === 'hub5_deity_breakthrough')
    ).toBe(false);

    // 2. P0-2: 卷五易物会救难选项限1次且耗2月，不能零耗时无限刷 actBeat 与洗白正道
    const act5Mkt: GameState = {
      ...base,
      act: 'act5',
      spiritStones: 1000,
      currentSceneId: 'act5_market',
    };
    const afterFund = playStep(act5Mkt, 'a5_market_fund_refugees').afterCommit;
    expect(afterFund.ageMonths).toBe(act5Mkt.ageMonths + 2);
    expect(afterFund.flags.act5_funded_refugees).toBe(true);
    expect(
      getResolvedChoices(
        { ...afterFund, currentSceneId: 'act5_market' },
        CONTENT_REGISTRY.scenes.act5_market,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'a5_market_fund_refugees')
    ).toBe(false);

    // 3. P0-3: 0 灵石持有阵盘/灵脉契不得白嫖潜修、筑基与结丹
    const brokeArray: GameState = {
      ...base,
      act: 'act2',
      spiritStones: 0,
      relics: ['broken_gathering_array', 'spirit_vein_deed'],
      currentSceneId: 'act2_action_cultivate',
    };
    const cultChoices = getResolvedChoices(
      brokeArray,
      CONTENT_REGISTRY.scenes.act2_action_cultivate,
      CONTENT_REGISTRY
    );
    expect(cultChoices.find((c) => c.id === 'a2_cult_array')?.locked).toBe(true);
    const foundChoices = getResolvedChoices(
      { ...brokeArray, currentSceneId: 'act2_foundation_gate' },
      CONTENT_REGISTRY.scenes.act2_foundation_gate,
      CONTENT_REGISTRY
    );
    expect(foundChoices.find((c) => c.id === 'found_array_or_stones')?.locked).toBe(true);
    const coreChoices = getResolvedChoices(
      { ...brokeArray, act: 'act3', currentSceneId: 'act3_golden_core_gate' },
      CONTENT_REGISTRY.scenes.act3_golden_core_gate,
      CONTENT_REGISTRY
    );
    expect(coreChoices.find((c) => c.id === 'core_vein_array')?.locked).toBe(true);

    // 4. P0-4 & P0-5: 0线索不剧透大药/炉鼎/收割大期；仅见苏知微一面不能解锁【无灵新世】前置；无残拓群雄会不投影飞升碑
    const zeroClueDemon: GameState = {
      ...base,
      act: 'act2',
      truthClues: [],
      flags: { dao_heart: 'seek_truth' },
      currentSceneId: 'act2_heart_demon',
    };
    const demonChoices = getResolvedChoices(
      zeroClueDemon,
      CONTENT_REGISTRY.scenes.act2_heart_demon,
      CONTENT_REGISTRY
    );
    expect(demonChoices.find((c) => c.id === 'demon_answer_defy')?.label).not.toContain('知其为炉');
    expect(demonChoices.find((c) => c.id === 'demon_answer_cold')?.label).not.toContain('炉鼎');
    expect(recalculateMarketPulse({ ...base, act: 'act5' }).rumorText).not.toContain('三千年收割大期');

    const suOnlyMetEve: GameState = {
      ...base,
      act: 'act5',
      truthClues: [],
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 10, stance: 'stranger', stage: 1, chronicle: [] },
      },
      currentSceneId: 'act5_arc_final_eve',
    };
    expect(
      getResolvedChoices(suOnlyMetEve, CONTENT_REGISTRY.scenes.act5_arc_final_eve, CONTENT_REGISTRY)
        .some((c) => c.id === 'eve_vow_mortal')
    ).toBe(false);

    const ledgerZeroClueSummit: GameState = {
      ...base,
      act: 'act5',
      relics: ['ascension_ledger'],
      truthClues: [],
      currentSceneId: 'act5_arc_summit',
    };
    expect(
      getResolvedChoices(ledgerZeroClueSummit, CONTENT_REGISTRY.scenes.act5_arc_summit, CONTENT_REGISTRY).find(
        (c) => c.id === 'summit_expose_ledger'
      )?.locked
    ).toBe(true);
    const ledgerOnlySummit: GameState = {
      ...ledgerZeroClueSummit,
      truthClues: ['clue_vein_drain', 'clue_blood_pill_dust', 'clue_tianji_portal', 'clue_mortal_blindspot'],
    };
    const summitStep = playStep(ledgerOnlySummit, 'summit_expose_ledger');
    expect((summitStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).not.toContain(
      '飞升碑反文拓影'
    );

    // 5. P0-6: 已购奇物在剧情再次发放时折现补偿灵石（筑基丹 +180、养魂木 +320、育婴莲 +400）
    const hasPillBlackmail = playStep(
      {
        ...base,
        act: 'act2',
        spiritStones: 0,
        relics: ['foundation_pill'],
        flags: { act2_deadman_switch: true },
        currentSceneId: 'act2_arc_blood_2',
      },
      'blood2_blackmail_chamber'
    ).afterCommit;
    expect(hasPillBlackmail.spiritStones).toBe(420);

    const hasWoodSoul = playStep(
      { ...base, act: 'act3', spiritStones: 0, relics: ['soul_nourishing_wood'], currentSceneId: 'act3_arc_soul_2' },
      'soul2_seize_wood_sword'
    ).afterCommit;
    expect(hasWoodSoul.spiritStones).toBe(320);

    const hasLotusTruce = playStep(
      { ...base, act: 'act4', spiritStones: 0, relics: ['nascent_lotus'], currentSceneId: 'act4_arc_world_war_2' },
      'war2_broker_truce'
    ).afterCommit;
    expect(hasLotusTruce.spiritStones).toBe(580);

    // 6. P0-8 & P0-10: 随机事件 when 守卫 + 卷三濒死负好感禁止触发白首结局
    const funeralDef = CONTENT_REGISTRY.randomEvents.find((e) => e.sceneId === 'rand_act2_mortal_funeral');
    expect(funeralDef?.when?.({ ...base, completedThreads: ['thread_qingzhou_plague'] })).toBe(false);
    const ambushDef = CONTENT_REGISTRY.randomEvents.find((e) => e.sceneId === 'rand_act4_3');
    expect(ambushDef?.when?.({ ...base, flags: { act4_war_truce: true }, tags: ['tianji_nemesis'] })).toBe(
      false
    );
    expect(ambushDef?.when?.({ ...base, flags: { act4_chamber_collapsed: true }, tags: ['tianji_nemesis'] })).toBe(
      true
    );
    expect(
      resolveParagraphs(CONTENT_REGISTRY.scenes.rand_act4_3.paragraphs, {
        ...base,
        flags: { act4_chamber_collapsed: true },
      }).join('\n')
    ).toContain('天机七十二城商脉虽溃');

    const dyingHearth: GameState = {
      ...base,
      act: 'act3',
      flags: { su_zhiwei_saved_longlife: false },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: -10, stance: 'stranger', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act3_arc_hearth_2',
    };
    expect(
      getResolvedChoices(dyingHearth, CONTENT_REGISTRY.scenes.act3_arc_hearth_2, CONTENT_REGISTRY)
        .some((c) => c.id === 'hearth2_stay_ending')
    ).toBe(false);

    // 7. P1-1 & P1-5: 奇物实效闭环（血丹作证、银针降压煞门槛、剑令半价+叛宗没收、结丹手记降门槛至195）
    const exposeWithSample = playStep(
      { ...base, act: 'act2', spiritStones: 0, relics: ['blood_foundation_pill'], currentSceneId: 'act2_arc_blood_2' },
      'blood2_expose_all'
    ).afterCommit;
    expect(exposeWithSample.spiritStones).toBe(185);
    expect(exposeWithSample.relics).not.toContain('blood_foundation_pill');

    const needleBloodFound = playStep(
      {
        ...base,
        act: 'act2',
        mind: 55,
        relics: ['blood_foundation_pill', 'qingzhou_silver_needle'],
        currentSceneId: 'act2_foundation_gate',
      },
      'found_blood_pill'
    ).afterCommit;
    expect(needleBloodFound.currentSceneId).toBe('act2_heart_demon');

    const coreWithNotes = playStep(
      {
        ...base,
        act: 'act3',
        might: 100,
        mind: 98,
        flags: { studied_core_failure: true },
        currentSceneId: 'act3_golden_core_gate',
      },
      'core_bare_force'
    ).afterCommit;
    expect(coreWithNotes.realm).toBe('golden_core');

    const rebelLoseTally = playStep(
      {
        ...base,
        act: 'act3',
        relics: ['qingyun_sword_tally'],
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: 30, stance: 'confidant', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act3_arc_sect_2',
      },
      'sect2_break_vault_with_shen'
    ).afterCommit;
    expect(rebelLoseTally.relics).not.toContain('qingyun_sword_tally');
  });

  it('Cycle 4 专项回归：存档强校验与坏档兜底、配额异常容错、占位符防御插值与结局徽章无重复', () => {
    const base = createInitialState(makeProfile({ name: '沈轻舟' }), CONTENT_REGISTRY);
    const storage = makeMemoryStorage();

    // 1. P0-1: 残缺/恶意 JSON 导入一律返回 null，绝不覆写已有有效存档
    saveActiveRun(base, storage);
    expect(
      importSaveJson(
        JSON.stringify({
          format: 'changsheng-jin-save',
          state: { currentSceneId: 'act1_qinglan_arrival', profile: {} },
        }),
        CONTENT_REGISTRY
      )
    ).toBeNull();
    expect(
      importSaveJson(
        JSON.stringify({
          format: 'changsheng-jin-save',
          schemaVersion: 999,
          state: base,
        }),
        CONTENT_REGISTRY
      )
    ).toBeNull();
    expect(
      importSaveJson(
        JSON.stringify({
          format: 'changsheng-jin-save',
          state: { ...base, spiritStones: '100' },
        }),
        CONTENT_REGISTRY
      )
    ).toBeNull();
    expect(loadActiveRun(storage, CONTENT_REGISTRY)?.profile.name).toBe('沈轻舟');

    // 2. P0-1: 旧版已删场景 ID 自动平滑回落至本卷枢纽并给提示，不致白屏
    const obsoleteJson = JSON.stringify({
      format: 'changsheng-jin-save',
      schemaVersion: 1,
      state: { ...base, act: 'act1', currentSceneId: 'act1_meet_suzhiwei_late' },
    });
    const recovered = importSaveJson(obsoleteJson, CONTENT_REGISTRY);
    expect(recovered).not.toBeNull();
    expect(recovered?.currentSceneId).toBe('act1_qinglan_arrival');
    expect(recovered?.recentNotices[0]).toContain('自动为你接回本卷枢纽');

    // 3. P0-1: 损坏 localStorage（残损 active_run / 部分 meta / 非法 prefs）均平稳降级不抛错
    storage.setItem('changshengjin_active_run_v1', '{"corrupted":true}');
    expect(loadActiveRun(storage, CONTENT_REGISTRY)).toBeNull();
    storage.setItem('changshengjin_meta_v1', '{"totalRuns":3}');
    const safeMeta = loadMetaArchive(storage);
    expect(safeMeta.totalRuns).toBe(3);
    expect(Array.isArray(safeMeta.unlockedEndings)).toBe(true);
    expect(Array.isArray(safeMeta.seenRelics)).toBe(true);
    storage.setItem('changshengjin_prefs_v1', '{"theme":"broken","instantText":"yes"}');
    const safePrefs = loadPrefs(storage);
    expect(safePrefs.theme).toBe('parchment');
    expect(safePrefs.instantText).toBe(false);

    // 4. P0-1: localStorage 满额抛出 QuotaExceededError 时所有写操作不崩溃
    const quotaStorage: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(saveActiveRun(base, quotaStorage)).toBe(false);
    expect(() => recordCheckpoint(base, '测试节点', CONTENT_REGISTRY, 'auto', quotaStorage)).not.toThrow();
    expect(() => saveManualSlot(base, '测试手动', CONTENT_REGISTRY, quotaStorage)).not.toThrow();
    expect(() => syncMetaFromState(base, { incrementRuns: true }, quotaStorage)).not.toThrow();

    // 5. P2-4: applyEffect 对 notice / logSummary / chronicle 防御性插值 {{name}}
    const interpRes = applyEffect(
      {
        ...base,
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: 20, stance: 'confidant', stage: 1, chronicle: [] },
        },
      },
      {
        notice: '{{name}}心领神会',
        logSummary: '{{name}}于青岚坊听风',
        companionUpdates: {
          shen_qingshuang: { chronicle: '赠剑谱予{{name}}' },
        },
      },
      CONTENT_REGISTRY,
      '{{name}}初试锋芒'
    );
    expect(interpRes.state.recentNotices).toContain('沈轻舟心领神会');
    expect(interpRes.state.historyLog.at(-1)?.title).toBe('沈轻舟初试锋芒');
    expect(interpRes.state.historyLog.at(-1)?.summary).toBe('沈轻舟于青岚坊听风');
    expect(interpRes.state.companions.shen_qingshuang.chronicle[0]).toContain('赠剑谱予沈轻舟');

    // 6. P0-6: 全 12 结局徽章绝不出现“真结局 · 真结局”之类重复后缀
    for (const ending of Object.values(CONTENT_REGISTRY.endings)) {
      const badge = formatEndingBadge(ending.subtitle, ending.tier);
      expect(badge).not.toContain(`${ending.tier} · ${ending.tier}`);
      expect(badge).not.toContain(`· ${ending.tier} · ${ending.tier}`);
    }
  });

  it('Cycle 5 专项回归：寿元大限可达性与越线修正、苏知微闭环、善恶反转防悖论、孤王断玉清理与破境退路', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 枯坐换底蕴使【枯骨问天】自然可达 + 越线覆盖按钮且无破折号 + 延寿露二次复检 + 筑基问心豁免
    let grindState: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_peak',
      lifespanYears: 130,
      ageMonths: 118 * 12,
      currentSceneId: 'act2_foundation_gate',
    };
    const grindStep = playStep(grindState, 'found_slow_grind');
    expect(grindStep.afterChoice.pendingTransition?.continueLabel).toBe('步入终局 · 枯骨问天');
    expect((grindStep.afterChoice.pendingTransition?.paragraphs ?? []).join('')).not.toContain('——');
    expect(grindStep.afterCommit.endingId).toBe('ending_lifespan');

    // 延寿露 +20 载后仍不足以覆盖 30 载枯坐 -> 必须复检仍转死亡，不留活死人
    const dewStillDead = playStep(
      {
        ...base,
        act: 'act3',
        realm: 'foundation_late',
        lifespanYears: 240,
        ageMonths: 239 * 12,
        relics: ['longevity_dew'],
        currentSceneId: 'act3_golden_core_gate',
      },
      'core_slow_grind'
    );
    expect(dewStillDead.afterCommit.relics).not.toContain('longevity_dew');
    expect(dewStillDead.afterCommit.endingId).toBe('ending_lifespan');

    // 129 岁服上品筑基丹（+14 月）踏入问心幻境，豁免寿尽截断
    const edgeFound = playStep(
      {
        ...base,
        act: 'act2',
        realm: 'qi_peak',
        lifespanYears: 130,
        ageMonths: 129 * 12,
        mind: 45,
        relics: ['foundation_pill'],
        currentSceneId: 'act2_foundation_gate',
      },
      'found_pill_orthodox'
    );
    expect(edgeFound.afterCommit.currentSceneId).toBe('act2_heart_demon');
    expect(edgeFound.afterCommit.endingId).toBeUndefined();

    // 青岚孤儿坐化不写“十六岁初入青岚”
    const orphanLifespan = CONTENT_REGISTRY.endings.ending_lifespan
      .epilogue({
        ...createInitialState(makeProfile({ originId: 'orphan' }), CONTENT_REGISTRY),
        ageMonths: 80 * 12,
      })
      .join('\n');
    expect(orphanLifespan).not.toContain('十六岁初入青岚');

    // 2. P0-2: 苏知微陌生人不认亲 + 14岁纪年 + 故人卡片高龄生死同步 + 冷研究不塞玉印
    const scoutStranger: GameState = {
      ...createInitialState(
        makeProfile({
          originId: 'scout',
          openingEventIds: ['ev_charred_jade', 'ev_spirit_eyes'],
        }),
        CONTENT_REGISTRY
      ),
      act: 'act2',
      currentSceneId: 'act2_arc_plague_1',
    };
    const plague1Text = CONTENT_REGISTRY.scenes.act2_arc_plague_1.paragraphs
      .flatMap((p) => {
        if (typeof p === 'string') return [p];
        if (typeof p === 'function') return [p(scoutStranger)].flat().filter(Boolean) as string[];
        return p.when(scoutStranger) ? [typeof p.text === 'function' ? p.text(scoutStranger) : p.text].flat() : [];
      })
      .join('\n');
    expect(plague1Text).not.toContain('容貌一点也没老');

    const suComp = CONTENT_REGISTRY.companions.su_zhiwei;
    const oldAct5State: GameState = {
      ...base,
      act: 'act5',
      ageMonths: 86 * 12,
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 20, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    expect(typeof suComp.title === 'function' ? suComp.title(oldAct5State) : suComp.title).toContain('已辞世');
    expect(typeof suComp.bio === 'function' ? suComp.bio(oldAct5State) : suComp.bio).toContain('安然长眠');

    const coldStudy = playStep(
      {
        ...base,
        act: 'act4',
        alignment: { righteous: -100, worldly: -20 },
        flags: { left_qingzhou_coldly: true },
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: -4, stance: 'stranger', stage: 2, chronicle: [] },
        },
        currentSceneId: 'act4_arc_mortal_truth',
      },
      'mortal_study_blindspot'
    ).afterCommit;
    expect(coldStudy.relics).not.toContain('mortal_hearth_talisman');
    expect(
      getResolvedChoices(
        { ...coldStudy, act: 'act5', currentSceneId: 'act5_companion_parley' },
        CONTENT_REGISTRY.scenes.act5_companion_parley,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'parley_su')
    ).toBe(false);
    expect(
      getResolvedChoices(
        { ...coldStudy, act: 'act6', currentSceneId: 'act6_final_choice' },
        CONTENT_REGISTRY.scenes.act6_final_choice,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'final_mortal_new_era')
    ).toBe(false);

    // 3. P0-3: 圣人强抢高坛须达元婴修为门槛(235)、不一键魔尊且影响沈清霜 + 魔尊高正道存量可走吞雷 + 魔道伪飞升不立楷模碑 + 魔道伴侣尾声 + 洗白消魔名
    const lowMightSummit: GameState = {
      ...base,
      act: 'act5',
      might: 190,
      alignment: { righteous: 100, worldly: 20 },
      currentSceneId: 'act5_arc_summit',
    };
    expect(
      getResolvedChoices(lowMightSummit, CONTENT_REGISTRY.scenes.act5_arc_summit, CONTENT_REGISTRY).find(
        (c) => c.id === 'summit_storm_altar'
      )?.locked
    ).toBe(true);
    const saintSummit = playStep(
      {
        ...lowMightSummit,
        might: 240,
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: 80, stance: 'bonded', stage: 4, chronicle: [] },
        },
      },
      'summit_storm_altar'
    ).afterCommit;
    expect(saintSummit.tags).not.toContain('demonic_sovereign');
    expect(saintSummit.alignment.righteous).toBe(62);
    expect(saintSummit.companions.shen_qingshuang.affection).toBe(62);
    expect(
      getResolvedChoices(
        { ...saintSummit, act: 'act6', currentSceneId: 'act6_final_choice' },
        CONTENT_REGISTRY.scenes.act6_final_choice,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'final_demonic_devour')
    ).toBe(false);

    const demonWithPosRg: GameState = {
      ...base,
      act: 'act4',
      tags: [...base.tags, 'demonic_sovereign'],
      alignment: { righteous: 32, worldly: 0 },
      currentSceneId: 'act4_nascent_gate',
    };
    expect(
      getResolvedChoices(
        demonWithPosRg,
        CONTENT_REGISTRY.scenes.act4_nascent_gate,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'nascent_blood_demon')
    ).toBe(true);

    const demonFalseAsc = CONTENT_REGISTRY.endings.ending_false_ascension
      .epilogue({ ...base, tags: [...base.tags, 'demonic_sovereign'], alignment: { righteous: -60, worldly: 0 } })
      .join('\n');
    expect(demonFalseAsc).not.toContain('堪为万代楷模');

    const demonAftermath = CONTENT_REGISTRY.endings.ending_demonic_devour
      .epilogue({
        ...base,
        tags: [...base.tags, 'demonic_sovereign', 'cangming_reborn'],
        flags: { su_zhiwei_saved_longlife: true },
        ageMonths: 80 * 12,
        companions: {
          shen_qingshuang: { met: true, affection: 70, stance: 'bonded', stage: 4, chronicle: [] },
          xie_wujiu: { met: true, affection: 70, stance: 'bonded', stage: 4, chronicle: [] },
          su_zhiwei: { met: true, affection: 70, stance: 'bonded', stage: 4, chronicle: [] },
          cang_ming: { met: true, affection: 70, stance: 'bonded', stage: 4, chronicle: [] },
        },
      })
      .join('\n');
    expect(demonAftermath).toContain('冷眼看你这位新主');
    expect(demonAftermath).toContain('窗闩插紧');
    expect(demonAftermath).toContain('旧天的椅子');

    const redeemed = playStep(
      {
        ...base,
        act: 'act5',
        alignment: { righteous: -15, worldly: 10 },
        tags: [...base.tags, 'demonic_sovereign', 'blood_pill_tainted'],
        relics: ['ascension_ledger'],
        truthClues: ['clue_stele_gap', 'clue_vein_drain', 'clue_blood_pill_dust', 'clue_tianji_portal'],
        currentSceneId: 'act5_arc_summit',
      },
      'summit_expose_ledger'
    ).afterCommit;
    expect(redeemed.tags).not.toContain('demonic_sovereign');
    expect(redeemed.tags).not.toContain('blood_pill_tainted');

    // 4. P0-4: 沈清霜叛宗标记与零幽灵执事 + 敌对谢无咎商道无百宝暗网 + 塑骨移除焦黑断玉
    const duelShen = playStep(
      {
        ...base,
        act: 'act3',
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: -35, stance: 'estranged', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act3_arc_sect_2',
      },
      'sect2_rival_duel'
    ).afterCommit;
    expect(duelShen.flags.shen_left_sect).toBe(true);
    const clashZt1 = playStep(
      { ...duelShen, act: 'act4', currentSceneId: 'act4_arc_zhantian_1' },
      'zt1_clash_shen'
    );
    expect((clashZt1.afterChoice.pendingTransition?.paragraphs ?? []).join('')).not.toContain('两名青云执事');

    const hostileXieGilded = CONTENT_REGISTRY.endings.ending_gilded_realm
      .epilogue({
        ...base,
        spiritStones: 1500,
        tags: [...base.tags, 'merchant_fame'],
        companions: {
          ...base.companions,
          xie_wujiu: { met: true, affection: -30, stance: 'rival', stage: 4, chronicle: [] },
        },
      })
      .join('\n');
    expect(hostileXieGilded).not.toContain('百宝');

    const rebornCm = playStep(
      {
        ...base,
        act: 'act4',
        relics: ['soul_nourishing_wood', 'charred_jade_relic'],
        companions: {
          ...base.companions,
          cang_ming: { met: true, affection: 50, stance: 'confidant', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act4_arc_cangming_rebirth',
      },
      'cm_rebirth_wood'
    ).afterCommit;
    expect(rebornCm.relics).not.toContain('charred_jade_relic');
    expect(rebornCm.relics).not.toContain('soul_nourishing_wood');

    // 5. P1-1 & P1-2: 全五卷破境关口皆有返回项 + 疯道符/异瞳在卷五六回响
    const gateBackChecks: Array<[string, string]> = [
      ['act1_breakthrough_prep', 'qi_back'],
      ['act2_foundation_gate', 'found_back'],
      ['act3_golden_core_gate', 'core_back'],
      ['act4_nascent_gate', 'nascent_back'],
      ['act5_deity_breakthrough', 'deity_back'],
    ];
    for (const [sceneId, backId] of gateBackChecks) {
      expect(
        CONTENT_REGISTRY.scenes[sceneId].choices.some((c) => c.id === backId),
        `${sceneId} missing ${backId}`
      ).toBe(true);
    }

    const talismanEchoState: GameState = {
      ...base,
      act: 'act6',
      flags: { ev_old_daoist_talisman: true },
      tags: base.tags.filter((t) => t !== 'old_daoist_talisman'),
      currentSceneId: 'act6_sky_gate',
    };
    const skyGateText = CONTENT_REGISTRY.scenes.act6_sky_gate.paragraphs
      .flatMap((p) => {
        if (typeof p === 'string') return [p];
        if (typeof p === 'function') return [p(talismanEchoState)].flat().filter(Boolean) as string[];
        return p.when(talismanEchoState)
          ? [typeof p.text === 'function' ? p.text(talismanEchoState) : p.text].flat()
          : [];
      })
      .join('\n');
    expect(skyGateText).toContain('天门开了也莫要上去');
  });

  it('Cycle 6 专项回归：群雄会零幽灵故人、苏知微跨卷统一寿元守卫、盲玩阈值透明、检录点护幼与续命顺序', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: summit_storm_altar 严格按沈/谢各自结识态拆分，绝不幽灵同屏
    const shenOnlySummit: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      might: 240,
      currentSceneId: 'act5_arc_summit',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 60, stance: 'bonded', stage: 4, chronicle: [] },
        xie_wujiu: { met: false, affection: 0, stance: 'stranger', stage: 0, chronicle: [] },
      },
    };
    const shenOnlyRes = playStep(shenOnlySummit, 'summit_storm_altar');
    const shenOnlyText = (shenOnlyRes.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(shenOnlyText).toContain('沈清霜');
    expect(shenOnlyText).toContain('剑柄');
    expect(shenOnlyText).not.toContain('谢无咎');
    expect(shenOnlyText).not.toContain('折扇');

    const xieOnlySummit: GameState = {
      ...shenOnlySummit,
      companions: {
        ...base.companions,
        shen_qingshuang: { met: false, affection: 0, stance: 'stranger', stage: 0, chronicle: [] },
        xie_wujiu: { met: true, affection: 60, stance: 'bonded', stage: 4, chronicle: [] },
      },
    };
    const xieOnlyRes = playStep(xieOnlySummit, 'summit_storm_altar');
    const xieOnlyText = (xieOnlyRes.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(xieOnlyText).toContain('谢无咎');
    expect(xieOnlyText).toContain('折扇');
    expect(xieOnlyText).not.toContain('沈清霜');
    expect(xieOnlyText).not.toContain('剑柄');

    // 2. P0-2: 慢磨跨寿线全卷统一封死苏知微复活与未塑骨苍溟斟酒
    const oldAct2: GameState = {
      ...base,
      act: 'act2',
      ageMonths: 72 * 12,
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 40, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    expect(isSuZhiweiAlive(oldAct2)).toBe(false);
    expect(
      getResolvedChoices(oldAct2, CONTENT_REGISTRY.scenes.act2_companion_visit, CONTENT_REGISTRY).some(
        (c) => c.id === 'hub2_visit_su'
      )
    ).toBe(false);
    expect(
      getResolvedChoices(oldAct2, CONTENT_REGISTRY.scenes.act2_arc_plague_1, CONTENT_REGISTRY).map(
        (c) => c.id
      )
    ).toEqual(['plague1_read_late_records']);
    expect(
      getResolvedChoices(oldAct2, CONTENT_REGISTRY.scenes.act2_arc_plague_2, CONTENT_REGISTRY).map(
        (c) => c.id
      )
    ).toEqual(['plague2_late_mourning']);

    const oldAct3: GameState = {
      ...oldAct2,
      act: 'act3',
      ageMonths: 140 * 12,
      flags: { su_zhiwei_saved_longlife: true },
    };
    expect(isSuZhiweiAlive(oldAct3)).toBe(false);
    expect(
      getResolvedChoices(oldAct3, CONTENT_REGISTRY.scenes.act3_companion_visit, CONTENT_REGISTRY).some(
        (c) => c.id === 'hub3_visit_su'
      )
    ).toBe(false);
    expect(
      getResolvedChoices(oldAct3, CONTENT_REGISTRY.scenes.act3_arc_hearth_1, CONTENT_REGISTRY).map(
        (c) => c.id
      )
    ).toEqual(['hearth1_read_journals']);

    const oldAct4: GameState = {
      ...oldAct3,
      act: 'act4',
      ageMonths: 250 * 12,
    };
    expect(
      getResolvedChoices(oldAct4, CONTENT_REGISTRY.scenes.act4_arc_mortal_truth, CONTENT_REGISTRY).map(
        (c) => c.id
      )
    ).toEqual(['mortal_copy_and_guard', 'mortal_study_blindspot']);

    const oldLifespanText = CONTENT_REGISTRY.endings.ending_lifespan
      .epilogue({
        ...base,
        act: 'act4',
        realm: 'golden_core',
        ageMonths: 555 * 12,
        flags: { su_zhiwei_saved_longlife: true },
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: 75, stance: 'bonded', stage: 4, chronicle: [] },
          cang_ming: { met: true, affection: 75, stance: 'bonded', stage: 3, chronicle: [] },
        },
      })
      .join('\n');
    expect(oldLifespanText).not.toContain('苏知微');
    expect(oldLifespanText).not.toContain('并肩斟酒');
    expect(oldLifespanText).toContain('焦黑断玉');

    // 3. P0-3 & P1-3: 盲玩 subtext 透明度（直达结局预警 + 硬冲精确门槛 + 伴侣反目提示 + 上缴血丹）
    const merchantChoice = getResolvedChoices(
      { ...base, act: 'act2', spiritStones: 700 },
      CONTENT_REGISTRY.scenes.act2_market_grand,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'market_merchant_ending');
    expect(merchantChoice?.subtext).toContain('终局');

    const earthChoice = getResolvedChoices(
      { ...base, act: 'act5', realm: 'nascent_soul', mind: 230, relics: ['mortal_hearth_talisman'] },
      CONTENT_REGISTRY.scenes.act5_deity_breakthrough,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'deity_seal_earth_immortal');
    expect(earthChoice?.subtext).toContain('终局');

    const bloodPillChoice = getResolvedChoices(
      { ...base, act: 'act2', relics: ['blood_foundation_pill'], mind: 25 },
      CONTENT_REGISTRY.scenes.act2_foundation_gate,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'found_blood_pill');
    expect(bloodPillChoice?.subtext).toContain('62');
    expect(bloodPillChoice?.subtext).toContain('血煞焚心');

    const coreBare = getResolvedChoices(
      { ...base, act: 'act3', might: 100, mind: 100, flags: { studied_core_failure: true } },
      CONTENT_REGISTRY.scenes.act3_golden_core_gate,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'core_bare_force');
    expect(coreBare?.subtext).toContain('195');
    expect(coreBare?.subtext).toContain('300');

    const nascentBare = getResolvedChoices(
      { ...base, act: 'act4', might: 160, mind: 150, flags: { studied_nascent_manual: true } },
      CONTENT_REGISTRY.scenes.act4_nascent_gate,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'nascent_bare_force');
    expect(nascentBare?.subtext).toContain('310');
    expect(nascentBare?.subtext).toContain('500');

    const deityWill = getResolvedChoices(
      { ...base, act: 'act5', might: 200, mind: 150 },
      CONTENT_REGISTRY.scenes.act5_deity_breakthrough,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'deity_pure_will');
    expect(deityWill?.subtext).toContain('620');
    expect(deityWill?.subtext).toContain('320');

    const bloodExposeSubtext = getResolvedChoices(
      { ...base, act: 'act2', relics: ['blood_foundation_pill'] },
      CONTENT_REGISTRY.scenes.act2_arc_blood_2,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'blood2_expose_all')?.subtext;
    expect(bloodExposeSubtext).toContain('血煞筑基丹');

    // 4. P1-2: 检录点上限升至 24、同场景慢磨不覆盖年轻检录点、卷四/五关键抉择补齐检录点
    const mem = new Map<string, string>();
    const adapter: StorageAdapter = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    const youngGate: GameState = {
      ...base,
      act: 'act2',
      actBeat: 3,
      ageMonths: 24 * 12,
      currentSceneId: 'act2_foundation_gate',
    };
    const oldGate: GameState = {
      ...youngGate,
      ageMonths: 84 * 12,
    };
    recordCheckpoint(youngGate, '卷二 · 叩关筑基前', CONTENT_REGISTRY, 'auto', adapter);
    recordCheckpoint(oldGate, '卷二 · 叩关筑基前', CONTENT_REGISTRY, 'auto', adapter);
    const cps = loadCheckpoints(adapter);
    expect(cps).toHaveLength(1);
    expect(getAgeYears(cps[0].state.ageMonths)).toBe(24);
    for (let i = 0; i < 20; i++) {
      recordCheckpoint(
        { ...youngGate, actBeat: i + 10, currentSceneId: `act2_hub` },
        `测试节点 ${i}`,
        CONTENT_REGISTRY,
        'auto',
        adapter
      );
    }
    expect(loadCheckpoints(adapter).length).toBeGreaterThan(14);
    expect(loadCheckpoints(adapter).length).toBeLessThanOrEqual(24);
    expect(CONTENT_REGISTRY.scenes.act4_arc_zhantian_2.checkpoint).toBe(true);
    expect(CONTENT_REGISTRY.scenes.act4_arc_world_war_2.checkpoint).toBe(true);
    expect(CONTENT_REGISTRY.scenes.act5_arc_summit.checkpoint).toBe(true);
    expect(CONTENT_REGISTRY.scenes.act5_deity_breakthrough.checkpoint).toBe(true);
    expect(CONTENT_REGISTRY.scenes.act6_sky_gate.checkpoint).toBeFalsy();

    // 5. P2-3: 空缓存导入进度后 totalRuns >= 1 + 延寿露二次超限提示按时间正序
    const importedMeta = syncMetaFromState(
      {
        ...base,
        act: 'act2',
        actBeat: 2,
        historyLog: [...base.historyLog, { ...base.historyLog[0], summary: '入城' }],
      },
      undefined,
      adapter
    );
    expect(importedMeta.totalRuns).toBeGreaterThanOrEqual(1);

    const doubleExceedState: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_late',
      ageMonths: 235 * 12,
      lifespanYears: 240,
      relics: ['longevity_dew'],
      currentSceneId: 'act3_golden_core_gate',
    };
    const dewOrderRes = playStep(doubleExceedState, 'core_slow_grind');
    const dewNotices = dewOrderRes.afterChoice.pendingTransition?.notices ?? [];
    const idxDew = dewNotices.findIndex((n) => n.includes('续命二十载'));
    const idxDead = dewNotices.findIndex((n) => n.includes('仍耗尽了余寿'));
    expect(idxDew).toBeGreaterThanOrEqual(0);
    expect(idxDead).toBeGreaterThan(idxDew);

    // 6. P1-4 & P1-5: 延寿苏知微暖茶线同样可洗净 blood_pill_tainted；敌对谢无咎炸梯不被硬切 bonded
    const savedSuTainted: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 62 * 12,
      alignment: { righteous: 10, worldly: 10 },
      tags: [...base.tags, 'blood_pill_tainted'],
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 65, stance: 'bonded', stage: 4, chronicle: [] },
      },
      currentSceneId: 'act4_arc_mortal_truth',
    };
    const cleansedWarm = playStep(savedSuTainted, 'mortal_su_warm_promise').afterCommit;
    expect(cleansedWarm.tags).not.toContain('blood_pill_tainted');
    const cleansedTea = playStep(savedSuTainted, 'mortal_su_quiet_tea').afterCommit;
    expect(cleansedTea.tags).not.toContain('blood_pill_tainted');

    const hostileXieSmash: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_mid',
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: -30, stance: 'rival', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act3_arc_chamber_2',
    };
    const afterSmash = playStep(hostileXieSmash, 'chamber2_smash_ladder').afterCommit;
    expect(afterSmash.companions.xie_wujiu.stance).toBe('rival');
  });

  it('Cycle 7 专项回归：卷四高龄苏知微闭环、名唤插值、卷五好感门槛、敌对谢无咎防精分、坐化寿限钳位与中文数词', () => {
    const base = createInitialState(
      makeProfile({ gender: 'other', honorific: '道友', name: '陆云归' }),
      CONTENT_REGISTRY
    );

    // 1. P0-1: 卷四 250 岁延寿苏知微（未标 passed）在 act4_hub 与 act4_arc_mortal_truth 零复活/零真空
    const act4OldSu: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 250 * 12,
      activeThreads: ['thread_act4_mortal'],
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 65, stance: 'bonded', stage: 4, chronicle: [] },
      },
      currentSceneId: 'act4_hub',
    };
    const act4HubParas = resolveParagraphs(CONTENT_REGISTRY.scenes.act4_hub.paragraphs, act4OldSu).join('\n');
    expect(act4HubParas).not.toContain('正候你一见');
    const mortalParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_arc_mortal_truth.paragraphs,
      act4OldSu
    ).join('\n');
    expect(mortalParas).toContain('阿芸');
    expect(mortalParas).toContain('素坟');
    expect(mortalParas).not.toContain('三年前');

    // P1-2: mortal_su_farewell_quiet 同样洗净 blood_pill_tainted
    const farewellQuietState: GameState = {
      ...act4OldSu,
      ageMonths: 80 * 12,
      alignment: { righteous: 10, worldly: 10 },
      tags: [...base.tags, 'blood_pill_tainted'],
      currentSceneId: 'act4_arc_mortal_truth',
    };
    const afterQuietFarewell = playStep(farewellQuietState, 'mortal_su_farewell_quiet').afterCommit;
    expect(afterQuietFarewell.tags).not.toContain('blood_pill_tainted');

    // 2. P0-2 & P1-6 & P1-7: 「名唤陆云归」无「姓陆云归」+ 中文数词年龄 + 第三性称谓无「阁下」跳变
    const oldAct2Plague: GameState = {
      ...base,
      act: 'act2',
      ageMonths: 72 * 12,
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 30, stance: 'confidant', stage: 2, chronicle: [] },
      },
      currentSceneId: 'act2_arc_plague_1',
    };
    const plague1Paras = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act2_arc_plague_1.paragraphs,
      oldAct2Plague
    ).join('\n');
    expect(plague1Paras).toContain('名唤陆云归');
    expect(plague1Paras).not.toContain('姓陆云归');

    expect(interpolateText('今岁{{age}}岁', { ...base, ageMonths: 112 * 12 })).toBe('今岁一百一十二岁');
    const xieMeetOther = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_arc_world_war_1.paragraphs,
      { ...base, act: 'act4', realm: 'golden_core' }
    ).join('\n');
    expect(xieMeetOther).toContain('久仰道友金丹威名');
    expect(xieMeetOther).not.toContain('阁下');

    // 3. P0-3: 卷五 isLoyalCompanion 拒绝一面之缘 stranger (affection=5) 与翻脸苍溟
    const strangerAct5: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      currentSceneId: 'act5_arc_final_eve',
      flags: { cangming_distrusted: true },
      companions: {
        shen_qingshuang: { met: true, affection: 5, stance: 'stranger', stage: 1, chronicle: [] },
        xie_wujiu: { met: true, affection: 5, stance: 'stranger', stage: 1, chronicle: [] },
        su_zhiwei: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
        cang_ming: { met: true, affection: -6, stance: 'stranger', stage: 2, chronicle: [] },
      },
    };
    const eveChoices = getResolvedChoices(
      strangerAct5,
      CONTENT_REGISTRY.scenes.act5_arc_final_eve,
      CONTENT_REGISTRY
    );
    expect(eveChoices.some((c) => c.id === 'eve_vow_bonded')).toBe(false);
    const eveParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_arc_final_eve.paragraphs,
      strangerAct5
    ).join('\n');
    expect(eveParas).not.toContain('沈清霜拍去肩头灰雪');
    expect(eveParas).not.toContain('谢无咎按前日约好');

    const afterDistrust = playStep(
      {
        ...base,
        act: 'act2',
        currentSceneId: 'act2_arc_vein_2',
        companions: {
          ...base.companions,
          cang_ming: { met: true, affection: 12, stance: 'stranger', stage: 2, chronicle: [] },
        },
      },
      'vein2_cold_distrust'
    ).afterCommit;
    expect(afterDistrust.companions.cang_ming.stance).toBe('rival');

    // 4. P0-4: 敌对谢无咎在 chamber2_smash_ladder 正文保持冷峻反目，绝不托付九州暗网
    const hostileXieChamber: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_mid',
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: -30, stance: 'rival', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act3_arc_chamber_2',
    };
    const smashStep = playStep(hostileXieChamber, 'chamber2_smash_ladder');
    const smashOut = (smashStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(smashStep.afterCommit.companions.xie_wujiu.stance).toBe('rival');
    expect(smashOut).not.toContain('半个东家');
    expect(smashOut).toContain('残存伙计');

    // 5. P0-5: 慢磨大限坐化严格钳位至寿限且保持 year - age === 2996，正文用中文岁数
    const nearLimitAct2: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_peak',
      ageMonths: 112 * 12,
      year: 112 + 2996,
      lifespanYears: 120,
      currentSceneId: 'act2_foundation_gate',
    };
    const diedAct2 = playStep(nearLimitAct2, 'found_slow_grind').afterCommit;
    expect(diedAct2.endingId).toBe('ending_lifespan');
    expect(getAgeYears(diedAct2.ageMonths)).toBe(120);
    expect(diedAct2.year - getAgeYears(diedAct2.ageMonths)).toBe(2996);
    const epAct2 = CONTENT_REGISTRY.endings.ending_lifespan.epilogue(diedAct2).join('\n');
    expect(epAct2).toContain('一百二十岁');
    expect(epAct2).not.toContain('127');

    const nearLimitAct4: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 491 * 12,
      year: 491 + 2996,
      lifespanYears: 500,
      currentSceneId: 'act4_nascent_gate',
    };
    const diedAct4 = playStep(nearLimitAct4, 'nascent_slow_grind').afterCommit;
    expect(diedAct4.endingId).toBe('ending_lifespan');
    expect(getAgeYears(diedAct4.ageMonths)).toBe(500);
    expect(diedAct4.year - getAgeYears(diedAct4.ageMonths)).toBe(2996);
    const epAct4 = CONTENT_REGISTRY.endings.ending_lifespan.epilogue(diedAct4).join('\n');
    expect(epAct4).toContain('五百岁');
    expect(epAct4).not.toContain('551');

    // 6. P1-2: sword2_pill_converted 生效 + blood1 重复血丹折现 + eve_vow_mortal 冷离青州无幽灵桂花
    const swordDupRes = playStep(
      {
        ...base,
        act: 'act2',
        relics: ['foundation_pill'],
        currentSceneId: 'act2_arc_sword_2',
      },
      'sword2_betray_for_pill'
    );
    expect((swordDupRes.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).toContain('易得一百八十灵石');
    expect(swordDupRes.afterCommit.lastBridgeNote).toContain('二百六十灵石');

    const bloodDupRes = playStep(
      {
        ...base,
        act: 'act2',
        spiritStones: 0,
        relics: ['blood_foundation_pill'],
        currentSceneId: 'act2_arc_blood_1',
      },
      'blood1_take_bribe_pills'
    );
    expect(bloodDupRes.afterCommit.spiritStones).toBe(150);
    expect((bloodDupRes.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).toContain('一百五十灵石');

    const coldMortalEve: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      truthClues: ['clue_mortal_bloodline'],
      flags: { left_qingzhou_coldly: true },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: -5, stance: 'stranger', stage: 2, chronicle: [] },
      },
      currentSceneId: 'act5_arc_final_eve',
    };
    const coldVowChoice = getResolvedChoices(
      coldMortalEve,
      CONTENT_REGISTRY.scenes.act5_arc_final_eve,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'eve_vow_mortal');
    expect(coldVowChoice?.label).not.toContain('桂花');
    const coldVowStep = playStep(coldMortalEve, 'eve_vow_mortal');
    expect((coldVowStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).not.toContain('干桂花');
  });

  it('Cycle 8 专项回归：槐阴不重复赠印与亡者零亲近通知、未遇苍溟初遇口吻、商行未垮群雄会分流、血丹/终局门槛与经济/编年闭环', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1a: 未结识苏知微但已持【无灵归尘印】进槐阴村，老族长认出旧印绝不重复赠印
    const strangerWithSeal: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      relics: ['mortal_hearth_talisman'],
      currentSceneId: 'act4_arc_mortal_truth',
    };
    const dupSealStep = playStep(strangerWithSeal, 'mortal_copy_and_guard');
    const dupSealOut = (dupSealStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(dupSealOut).toContain('同出一源');
    expect(dupSealOut).not.toContain('请出先祖传下的【无灵归尘印】赠予你');

    // 1b. P0-1b: 250岁祭拜已故苏知微素坟不弹「苏知微对你心生亲近」
    const oldGraveSu: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 250 * 12,
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 65, stance: 'bonded', stage: 4, chronicle: [] },
      },
      currentSceneId: 'act4_arc_mortal_truth',
    };
    const graveStep = playStep(oldGraveSu, 'mortal_copy_and_guard');
    const graveNotices = [
      ...graveStep.afterChoice.recentNotices,
      ...(graveStep.afterChoice.pendingTransition?.notices ?? []),
    ].join('\n');
    expect(graveNotices).not.toContain('苏知微对你心生亲近');
    expect(graveStep.afterCommit.companions.su_zhiwei.chronicle.length).toBe(1);

    // 2. P0-2: 卷三黑柏孤岛未遇苍溟时交代拾玉并用初遇口吻，不写“收起平日讥诮”
    const unmetCmSoul2: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_mid',
      relics: [],
      currentSceneId: 'act3_arc_soul_2',
    };
    const swordSoulStep = playStep(unmetCmSoul2, 'soul2_seize_wood_sword');
    const swordSoulOut = (swordSoulStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(swordSoulOut).toContain('焦黑断玉');
    expect(swordSoulOut).not.toContain('收起平日讥诮');
    expect(swordSoulStep.afterCommit.companions.cang_ming.chronicle[0]).toContain('自断玉中苏醒相逢');

    const ambushSoulStep = playStep(unmetCmSoul2, 'soul2_ruthless_ambush');
    const ambushSoulOut = (ambushSoulStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(ambushSoulOut).toContain('焦黑断玉');

    // 3. P1-2: 卷四商行未崩盘且无收割总录时，群雄会谢无咎改甩百宝斋私账
    const truceSummit: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      truthClues: ['clue_stele_gap', 'clue_vein_drain', 'clue_blood_pill_dust', 'clue_mortal_blindspot', 'clue_changming_night', 'clue_alliance_pact'],
      flags: { act4_war_truce: true },
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: 65, stance: 'bonded', stage: 4, chronicle: [] },
      },
      currentSceneId: 'act5_arc_summit',
    };
    const summitStep = playStep(truceSummit, 'summit_expose_ledger');
    const summitOut = (summitStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(summitOut).toContain('百宝斋三百年灵脉倒流私账');
    expect(summitOut).not.toContain('天机总坛红账');

    // 4. P1-3: 血丹/吞煞校准门槛 + 魔尊不得绕道解锁【无灵新世】 + 先捐药救医折价百石
    const bloodFail = playStep(
      { ...base, act: 'act2', realm: 'qi_peak', mind: 55, relics: ['blood_foundation_pill'], currentSceneId: 'act2_foundation_gate' },
      'found_blood_pill'
    ).afterCommit;
    expect(bloodFail.endingId).toBe('ending_blood_demon');
    const bloodPassNeedle = playStep(
      { ...base, act: 'act2', realm: 'qi_peak', mind: 55, relics: ['blood_foundation_pill', 'qingzhou_silver_needle'], currentSceneId: 'act2_foundation_gate' },
      'found_blood_pill'
    ).afterCommit;
    expect(bloodPassNeedle.currentSceneId).toBe('act2_heart_demon');

    const coreDemonFail = playStep(
      { ...base, act: 'act3', realm: 'foundation_late', mind: 95, alignment: { righteous: -20, worldly: 0 }, currentSceneId: 'act3_golden_core_gate' },
      'core_blood_demon_shortcut'
    ).afterCommit;
    expect(coreDemonFail.endingId).toBe('ending_blood_demon');

    const nascentDemonFail = playStep(
      { ...base, act: 'act4', realm: 'golden_core', mind: 135, alignment: { righteous: -25, worldly: 0 }, currentSceneId: 'act4_nascent_gate' },
      'nascent_blood_demon'
    ).afterCommit;
    expect(nascentDemonFail.endingId).toBe('ending_blood_demon');

    const demonCannotMortal: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      alignment: { righteous: -60, worldly: 10 },
      tags: [...base.tags, 'mortal_keeper', 'demonic_sovereign'],
      relics: ['mortal_hearth_talisman'],
      truthClues: ['clue_mortal_bloodline'],
      currentSceneId: 'act6_final_choice',
    };
    expect(
      getResolvedChoices(demonCannotMortal, CONTENT_REGISTRY.scenes.act6_final_choice, CONTENT_REGISTRY).some(
        (c) => c.id === 'final_mortal_new_era'
      )
    ).toBe(false);

    const fundedPlague2: GameState = {
      ...base,
      act: 'act2',
      spiritStones: 110,
      flags: { funded_qingzhou_clinic: true },
      currentSceneId: 'act2_arc_plague_2',
    };
    const medRes = playStep(fundedPlague2, 'plague2_spend_stones_medicine').afterCommit;
    expect(medRes.spiritStones).toBe(10);

    // 5. P1-5: 卷一破障符不再死水 65；卷四商行崩盘令金脉灵砂现低吸窗口
    const act1PlagueMarket = recalculateMarketPulse({ ...base, act: 'act1', flags: { act1_rumor_plague: true } });
    const act1BloodMarket = recalculateMarketPulse({ ...base, act: 'act1', flags: { act1_heard_blood_pill: true } });
    expect(getGoodPrice(CONTENT_REGISTRY.marketGoods.po_zhang_talisman, act1PlagueMarket)).toBeGreaterThan(
      getGoodPrice(CONTENT_REGISTRY.marketGoods.po_zhang_talisman, act1BloodMarket)
    );
    const act4CollapseMkt = recalculateMarketPulse({ ...base, act: 'act4', flags: { act4_chamber_collapsed: true } });
    const act5Mkt = recalculateMarketPulse({ ...base, act: 'act5' });
    expect(getGoodPrice(CONTENT_REGISTRY.marketGoods.golden_vein_sand, act5Mkt)).toBeGreaterThan(
      getGoodPrice(CONTENT_REGISTRY.marketGoods.golden_vein_sand, act4CollapseMkt) + 80
    );

    // 6. P1-6: 小境破境、购玄铁令与关键线索皆记入编年史
    const a2Cult = playStep(
      { ...base, act: 'act2', realm: 'qi_early', currentSceneId: 'act2_action_cultivate' },
      'a2_cult_meditate'
    ).afterCommit;
    expect(a2Cult.historyLog.at(-1)?.summary).toContain('炼气中期');
    const a3Cult = playStep(
      { ...base, act: 'act3', realm: 'foundation_early', currentSceneId: 'act3_action_cultivate' },
      'a3_cult_steady'
    ).afterCommit;
    expect(a3Cult.historyLog.at(-1)?.summary).toContain('筑基中期');
    const boughtTok = playStep(
      { ...base, act: 'act2', spiritStones: 100, currentSceneId: 'visit_xie_wujiu' },
      'v_xie_buy_token'
    ).afterCommit;
    expect(boughtTok.historyLog.at(-1)?.summary).toContain('百宝斋玄铁令');
  });

  it('Cycle 9 专项回归：开篇地理纵深顺序与零夏雪、青岚孤儿本土口径、卷一谢/沈已识分流、篡改导档零污染与红尘散仙门槛', () => {
    // 1. P0-1: 严格地理顺序 (杏林 -> 断玉 -> 断剑亭 -> 南门微澜 -> 城西暗巷) + stay_help_suzhiwei 零夏雪
    let sDefault = createInitialState(
      makeProfile({
        originId: 'herbalist',
        openingEventIds: ['ev_charred_jade', 'ev_qingzhou_vow'],
      }),
      CONTENT_REGISTRY
    );
    sDefault = playStep(sDefault, 'bury_respectfully').afterCommit;
    expect(sDefault.currentSceneId).toBe('act1_event_xinglin');
    sDefault = playStep(sDefault, 'stay_help_suzhiwei').afterCommit;
    expect(sDefault.currentSceneId).toBe('act1_event_jade');
    // 三日晒药不扣整月，仍停留春季
    expect(sDefault.seasonIndex).toBe(0);

    // 杏林 + 断剑残帖：经过 +2 月出身选择与三日晒药后进入断剑亭仍是春季，不出现“夏月踏雪”
    let sSword = createInitialState(
      makeProfile({
        originId: 'herbalist',
        openingEventIds: ['ev_qingzhou_vow', 'ev_broken_sword_note'],
      }),
      CONTENT_REGISTRY
    );
    sSword = playStep(sSword, 'bury_respectfully').afterCommit;
    sSword = playStep(sSword, 'stay_help_suzhiwei').afterCommit;
    expect(sSword.currentSceneId).toBe('act1_event_swordnote');
    expect(sSword.seasonIndex).toBe(0);
    // 若人为处于夏季进入断剑亭，正文以落松针/山露代雪
    const summerSwordText = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act1_event_swordnote.paragraphs,
      { ...sSword, seasonIndex: 1 }
    ).join('\n');
    expect(summerSwordText).toContain('松针');
    expect(summerSwordText).not.toContain('积雪');

    // 暗市密信 + 商经：先过城南门微澜，再入城西暗巷子夜茶坊，绝不进城后退回城外
    let sOrphan = createInitialState(
      makeProfile({
        originId: 'orphan',
        openingEventIds: ['ev_blood_letter', 'ev_merchant_manual'],
      }),
      CONTENT_REGISTRY
    );
    const orphanStep1 = playStep(sOrphan, 'grab_and_vanish');
    expect(orphanStep1.afterChoice.pendingTransition?.continueLabel).not.toContain('踏上官道');
    sOrphan = orphanStep1.afterCommit;
    expect(sOrphan.currentSceneId).toBe('act1_event_common_omen');
    const omenChoices = getResolvedChoices(
      sOrphan,
      CONTENT_REGISTRY.scenes.act1_event_common_omen,
      CONTENT_REGISTRY
    );
    expect(omenChoices.length).toBe(2);
    const omenParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act1_event_common_omen.paragraphs,
      sOrphan
    ).join('\n');
    expect(omenParas).toContain('傍晚走过青岚南门城楼下');
    expect(omenParas).not.toContain('远远望见青岚城高耸');
    sOrphan = playStep(sOrphan, 'enter_city_market_eye').afterCommit;
    expect(sOrphan.currentSceneId).toBe('act1_event_darkletter');
    const afterDark = playStep(sOrphan, 'take_token');
    expect(afterDark.afterChoice.pendingTransition?.continueLabel).toContain('穿过熟稔水巷');
    sOrphan = afterDark.afterCommit;
    expect(sOrphan.currentSceneId).toBe('act1_qinglan_arrival');

    // 2. P0-2: 卷一已识谢无咎/沈清霜在听雨茶肆不再按素未谋面演“拜帖/看看虚实”
    const xieMetStep = playStep(
      { ...sOrphan, currentSceneId: 'act1_crossroads_incident' },
      'cover_for_darkmarket'
    );
    const xieMetOut = (xieMetStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(xieMetOut).not.toContain('看看谢无咎的虚实');
    expect(xieMetOut).not.toContain('暗红拜帖');
    expect(xieMetOut).toContain('子夜茶坊');
    expect(xieMetStep.afterCommit.lastBridgeNote).toContain('五十五块灵石');

    const shenMetStep = playStep(
      {
        ...sOrphan,
        currentSceneId: 'act1_crossroads_incident',
        companions: {
          ...sOrphan.companions,
          shen_qingshuang: { met: true, affection: 18, stance: 'stranger', stage: 1, chronicle: [] },
        },
      },
      'side_with_qingyun'
    );
    expect(shenMetStep.afterCommit.lastBridgeNote).toContain('再去寻沈清霜一叙');

    // 3. P0-3 & P2-1#6: 篡改导档 JSON 白名单过滤 + 去重 + 范围钳位 + MetaArchive 零污染 + 同级关系不摆动
    const storage = makeMemoryStorage();
    const tampered = {
      ...sOrphan,
      might: -500,
      mind: -300,
      renown: -99,
      alignment: { righteous: 9999, worldly: -9999 },
      truthClues: ['BOGUS_CLUE_XYZ', 'clue_blood_pill_dust', 'clue_blood_pill_dust'],
      relics: ['FAKE_RELIC_XYZ', 'baibao_token', 'baibao_token'],
      tags: ['FAKE_TAG_XYZ', 'origin_orphan', 'origin_orphan'],
      market: {
        ...sOrphan.market,
        elixirIndex: 99,
        artifactIndex: -5,
        curioIndex: 0.01,
        holdings: {
          bogus_item_xyz: { qty: 3, avgCost: 50 },
          qingxin_herb: { qty: 2, avgCost: 30 },
        },
      },
    };
    const cleaned = validateAndNormalizeState(tampered, CONTENT_REGISTRY)!;
    expect(cleaned).not.toBeNull();
    expect(cleaned.might).toBe(0);
    expect(cleaned.mind).toBe(0);
    expect(cleaned.renown).toBe(0);
    expect(cleaned.alignment.righteous).toBe(100);
    expect(cleaned.alignment.worldly).toBe(-100);
    expect(cleaned.market.elixirIndex).toBe(2.25);
    expect(cleaned.market.artifactIndex).toBe(0.55);
    expect(cleaned.market.curioIndex).toBe(0.55);
    expect(cleaned.truthClues).toEqual(['clue_blood_pill_dust']);
    expect(cleaned.relics).toEqual(['baibao_token']);
    expect(cleaned.tags).toEqual(['origin_orphan']);
    expect(Object.keys(cleaned.market.holdings)).toEqual(['qingxin_herb']);

    const syncedMeta = syncMetaFromState(cleaned, { incrementRuns: true }, storage, CONTENT_REGISTRY);
    expect(syncedMeta.unlockedTruthClues).toEqual(['clue_blood_pill_dust']);
    expect(syncedMeta.seenRelics).toEqual(['baibao_token']);
    expect(syncedMeta.seenTags).toEqual(['origin_orphan']);
    const loadedMeta = loadMetaArchive(storage, CONTENT_REGISTRY);
    expect(loadedMeta.unlockedTruthClues).not.toContain('BOGUS_CLUE_XYZ');

    // 同级 stance (rival vs estranged, 均为 rank 2) 读档时不互覆摆动
    const rivalState: GameState = {
      ...cleaned,
      companions: {
        ...cleaned.companions,
        xie_wujiu: { met: true, affection: -30, stance: 'rival', stage: 2, chronicle: [] },
      },
    };
    const m1 = syncMetaFromState(rivalState, undefined, storage, CONTENT_REGISTRY);
    expect(m1.companionBestStance.xie_wujiu).toBe('rival');
    const estrangedState: GameState = {
      ...cleaned,
      companions: {
        ...cleaned.companions,
        xie_wujiu: { met: true, affection: -45, stance: 'estranged', stage: 2, chronicle: [] },
      },
    };
    const m2 = syncMetaFromState(estrangedState, undefined, storage, CONTENT_REGISTRY);
    expect(m2.companionBestStance.xie_wujiu).toBe('rival');

    // 4. P1-3: 卷一破境道心回响 + 落魄世家假丹识破
    const trialParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act1_breakthrough_trial.paragraphs,
      { ...sOrphan, profile: { ...sOrphan.profile, daoHeartId: 'seek_truth' } }
    ).join('\n');
    expect(trialParas).toContain('三千年天门无归音');
    const fallenFakePill = getResolvedChoices(
      { ...sOrphan, tags: ['origin_fallen_clan'] },
      CONTENT_REGISTRY.scenes.rand_act1_fake_pill,
      CONTENT_REGISTRY
    );
    expect(fallenFakePill.some((c) => c.id === 'r1_pill_expose')).toBe(true);

    // 5. P1-4: 【红尘散仙】封死魔尊无灵印绕道并收紧高心境门槛 (300 / 持印 220)
    const demonWithSeal: GameState = {
      ...cleaned,
      act: 'act6',
      realm: 'deity_transform',
      mind: 350,
      alignment: { righteous: -60, worldly: 0 },
      truthClues: ['clue_stele_gap', 'clue_vein_drain', 'clue_blood_pill_dust', 'clue_mortal_blindspot'],
      relics: ['mortal_hearth_talisman'],
      currentSceneId: 'act6_final_choice',
    };
    expect(
      getResolvedChoices(demonWithSeal, CONTENT_REGISTRY.scenes.act6_final_choice, CONTENT_REGISTRY).some(
        (c) => c.id === 'final_earth_immortal'
      )
    ).toBe(false);
    expect(
      getResolvedChoices(
        { ...demonWithSeal, act: 'act5', realm: 'nascent_soul', currentSceneId: 'act5_deity_breakthrough' },
        CONTENT_REGISTRY.scenes.act5_deity_breakthrough,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'deity_seal_earth_immortal')
    ).toBe(false);
    // 中庸正道心境 260 或心境 300 但既无归尘印又未查明上古无灵纪 -> 不可解锁；查明上古无灵纪且心境 300，或持印且心境 220 -> 解锁
    const midNoSeal: GameState = {
      ...demonWithSeal,
      alignment: { righteous: 10, worldly: 0 },
      mind: 260,
      relics: [],
    };
    expect(
      getResolvedChoices(midNoSeal, CONTENT_REGISTRY.scenes.act6_final_choice, CONTENT_REGISTRY).some(
        (c) => c.id === 'final_earth_immortal'
      )
    ).toBe(false);
    expect(
      getResolvedChoices({ ...midNoSeal, mind: 300 }, CONTENT_REGISTRY.scenes.act6_final_choice, CONTENT_REGISTRY).some(
        (c) => c.id === 'final_earth_immortal'
      )
    ).toBe(false);
    expect(
      getResolvedChoices(
        {
          ...midNoSeal,
          mind: 300,
          truthClues: [...midNoSeal.truthClues, 'clue_mortal_bloodline'],
        },
        CONTENT_REGISTRY.scenes.act6_final_choice,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'final_earth_immortal')
    ).toBe(true);
    expect(
      getResolvedChoices(
        { ...midNoSeal, mind: 220, relics: ['mortal_hearth_talisman'] },
        CONTENT_REGISTRY.scenes.act6_final_choice,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'final_earth_immortal')
    ).toBe(true);
  });

  it('Cycle 10 专项回归：双剑破长明断玉苍溟零打架、红尘散仙卷五/六分流、四出身终章锚点、异瞳回响与零「触发」微调', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 仅未重塑断玉苍溟心许打【双剑破长明】，绝不演“牵手离开/饮热茶”紧接“魂散安眠”
    const jadeOnlyBonded: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      tags: ['origin_herbalist'],
      truthClues: [
        'clue_stele_gap',
        'clue_vein_drain',
        'clue_blood_pill_dust',
        'clue_mortal_blindspot',
        'clue_changming_night',
        'clue_alliance_pact',
        'clue_gate_weakness',
      ],
      companions: {
        ...base.companions,
        cang_ming: { met: true, affection: 75, stance: 'bonded', stage: 4, chronicle: [] },
      },
      currentSceneId: 'act6_final_choice',
    };
    const jadeStep = playStep(jadeOnlyBonded, 'final_sever_sky_bonded');
    const jadeOutcome = (jadeStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(jadeOutcome).toContain('掌中那枚断玉');
    expect(jadeOutcome).not.toContain('你们到底一起活了下来');
    const jadeEpilogue = CONTENT_REGISTRY.endings.ending_sever_sky_bonded
      .epilogue(jadeStep.afterCommit)
      .join('\n');
    expect(jadeEpilogue).toContain('碎作漫天青萤');
    expect(jadeEpilogue).not.toContain('抓住了彼此的手');
    expect(jadeEpilogue).not.toContain('与苍溟一道离开天柱峰');
    // 不重复追加故人归宿里的断玉安眠句
    expect(jadeEpilogue.match(/安眠/g)?.length).toBe(1);

    // 若同时心许沈清霜 + 未重塑断玉苍溟：第 3 段仅与沈清霜离开，第 4 段故人归宿交代断玉安眠
    const shenAndJade: GameState = {
      ...jadeOnlyBonded,
      companions: {
        ...jadeOnlyBonded.companions,
        shen_qingshuang: { met: true, affection: 75, stance: 'bonded', stage: 4, chronicle: [] },
      },
    };
    const bothEpilogue = CONTENT_REGISTRY.endings.ending_sever_sky_bonded
      .epilogue(shenAndJade)
      .join('\n');
    expect(bothEpilogue).toContain('与沈清霜一道离开天柱峰');
    expect(bothEpilogue).not.toContain('与沈清霜、苍溟一道离开天柱峰');
    expect(bothEpilogue).toContain('焦黑断玉化作一缕青光散入晨风');

    // 2. P0-2: 【红尘散仙】区分卷五元婴自封与卷六化神假死，且沈清霜绝不越界翻看上界“收割名录”
    const act5Hidden: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 40, stance: 'confidant', stage: 3, chronicle: [] },
        xie_wujiu: { met: true, affection: 40, stance: 'confidant', stage: 3, chronicle: [] },
      },
    };
    const epAct5Hidden = CONTENT_REGISTRY.endings.ending_earth_immortal
      .epilogue(act5Hidden)
      .join('\n');
    expect(epAct5Hidden).toContain('绝巅金裂冷漠移去那日');
    expect(epAct5Hidden).toContain('观星石台');
    expect(epAct5Hidden).toContain('销声匿迹密报');
    expect(epAct5Hidden).not.toContain('收割名录');
    expect(epAct5Hidden).not.toContain('假死账');

    const epAct6Hidden = CONTENT_REGISTRY.endings.ending_earth_immortal
      .epilogue({ ...act5Hidden, act: 'act6', realm: 'deity_transform' })
      .join('\n');
    expect(epAct6Hidden).toContain('高天多了一笔“已陨”的朱批');
    expect(epAct6Hidden).toContain('陨落玉牌');
    expect(epAct6Hidden).toContain('假死账');
    expect(epAct6Hidden).not.toContain('盯着收割名录');

    // 3. P1-1: 斥候“半年前”口径统一 + 非孤儿茶棚辨药而非指路 + 斥候南下杏林衔接
    const scoutStart = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act1_start_scout.paragraphs,
      { ...base, tags: ['origin_scout'] }
    ).join('\n');
    expect(scoutStart).toContain('半年前那场妖兽夜袭');
    expect(scoutStart).not.toContain('三月前');

    const outsiderTea = playStep(
      { ...base, tags: ['origin_herbalist'], currentSceneId: 'act1_event_common_omen' },
      'enter_city_market_eye'
    );
    const outsiderTeaOut = (outsiderTea.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(outsiderTeaOut).toContain('辨出两味混杂的假灵草');
    expect(outsiderTeaOut).not.toContain('指了指药铺门路');

    const scoutXinglin = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act1_event_xinglin.paragraphs,
      { ...base, tags: ['origin_scout'] }
    ).join('\n');
    expect(scoutXinglin).toContain('离了北境南下');

    // 4. P1-2: 四大出身十六岁原初锚点 + 天生异瞳终章天门洞开回响 + 精修尾句
    const scoutLifespan = CONTENT_REGISTRY.endings.ending_lifespan
      .epilogue({ ...base, tags: ['origin_scout'], ageMonths: 80 * 12 })
      .join('\n');
    expect(scoutLifespan).toContain('北境界碑下的风沙与同袍铁牌');
    const clanLifespan = CONTENT_REGISTRY.endings.ending_lifespan
      .epilogue({ ...base, tags: ['origin_fallen_clan'], ageMonths: 80 * 12 })
      .join('\n');
    expect(clanLifespan).toContain('破败旧祠里的春雨与赤铜家印');

    const spiritEyeGate = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act6_sky_gate.paragraphs,
      { ...base, act: 'act6', realm: 'deity_transform', flags: { ev_spirit_eyes: true } }
    ).join('\n');
    expect(spiritEyeGate).toContain('天生异瞳隐隐刺痛');

    const merchEp = CONTENT_REGISTRY.endings.ending_merchant_lord.epilogue(base).join('\n');
    expect(merchEp).not.toContain('无冕之王');
    const gildedEp = CONTENT_REGISTRY.endings.ending_gilded_realm.epilogue(base).join('\n');
    expect(gildedEp).not.toContain('富足团结');
    const demonEp = CONTENT_REGISTRY.endings.ending_demonic_devour.epilogue(base).join('\n');
    expect(demonEp).toContain('玄渊殿上黑焰未熄');

    // 5. P1-3: 卷四燃晶淬丹降为 180 石，孤剑斩天门无重宝修为线提至 220
    const a4Cult = getResolvedChoices(
      { ...base, act: 'act4', realm: 'golden_core', spiritStones: 180 },
      CONTENT_REGISTRY.scenes.act4_action_cultivate,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'a4_cult_stones');
    expect(a4Cult?.locked).toBe(false);

    const soloWeak: GameState = {
      ...jadeOnlyBonded,
      flags: { act5_final_vow: 'solo' },
      might: 180,
      relics: [],
    };
    expect(
      getResolvedChoices(soloWeak, CONTENT_REGISTRY.scenes.act6_final_choice, CONTENT_REGISTRY).some(
        (c) => c.id === 'final_sever_sky_solo'
      )
    ).toBe(false);
    expect(
      getResolvedChoices(
        { ...soloWeak, might: 220 },
        CONTENT_REGISTRY.scenes.act6_final_choice,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'final_sever_sky_solo')
    ).toBe(true);
  });

  it('Cycle 11 专项回归：暗市赌石零苍溟幽灵、0故人孤狼与全敌对卷五闭环、血手魔尊不得发圣人愿、沈清霜全程敌对故人志与非青云金光碑', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-2: r2_jade_see_through 未识/永封苍溟时不直呼“苍溟眼力”
    const wolfJade = getResolvedChoices(
      { ...base, act: 'act2', tags: ['spirit_eyes'], spiritStones: 80 },
      CONTENT_REGISTRY.scenes.rand_act2_jade_gamble,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'r2_jade_see_through');
    expect(wolfJade?.label).toContain('天生异瞳');
    expect(wolfJade?.label).not.toContain('苍溟');

    const sealedJade = getResolvedChoices(
      {
        ...base,
        act: 'act2',
        tags: ['merchant_manual'],
        spiritStones: 80,
        flags: { cangming_sealed: true },
        companions: {
          ...base.companions,
          cang_ming: { met: true, affection: -30, stance: 'estranged', stage: 2, chronicle: [] },
        },
      },
      CONTENT_REGISTRY.scenes.rand_act2_jade_gamble,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'r2_jade_see_through');
    expect(sealedJade?.label).toContain('货殖商经');
    expect(sealedJade?.label).not.toContain('苍溟');

    // 2. P1-4: 0 故人孤狼卷一/二/五不称“故人旧识/赴故人之约”
    const zeroAct1Hub = getResolvedChoices(
      { ...base, flags: { act1_rumor_plague: true }, currentSceneId: 'act1_qinglan_arrival' },
      CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'hub1_companion_visit');
    expect(zeroAct1Hub?.label).not.toContain('故人旧识');

    const zeroAct5: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      activeThreads: ['thread_act5_eve'],
      currentSceneId: 'act5_hub',
    };
    const zeroAct5Paras = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_hub.paragraphs,
      zeroAct5
    ).join('\n');
    expect(zeroAct5Paras).toContain('独对寒炉与长剑');
    expect(zeroAct5Paras).not.toContain('陪你走过百年风霜的故人');
    const zeroEveChoice = getResolvedChoices(
      zeroAct5,
      CONTENT_REGISTRY.scenes.act5_hub,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'hub5_final_eve');
    expect(zeroEveChoice?.label).toContain('独坐草庐');
    expect(zeroEveChoice?.label).not.toContain('赴故人之约');

    // 3. P1-4b: 血手魔尊 (righteous < -25) 不可选 eve_vow_mortal，且全敌对选 eve_vow_solo 时不让门外死敌蒸发
    const demonHostileEve: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      alignment: { righteous: -84, worldly: 0 },
      tags: ['demonic_sovereign', 'mortal_keeper'],
      truthClues: ['clue_mortal_bloodline'],
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: -100, stance: 'estranged', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act5_arc_final_eve',
    };
    const eveOpts = getResolvedChoices(
      demonHostileEve,
      CONTENT_REGISTRY.scenes.act5_arc_final_eve,
      CONTENT_REGISTRY
    );
    expect(eveOpts.some((c) => c.id === 'eve_vow_mortal')).toBe(false);
    const soloWithFoe = playStep(demonHostileEve, 'eve_vow_solo');
    const soloWithFoeOut = (soloWithFoe.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(soloWithFoeOut).toContain('竹篱外');
    expect(soloWithFoeOut).toContain('灰雾');

    // 4. P1-5: 沈清霜全程敌对叛宗时故人志不再写“曾与你共斩宗门旧枷”，卷四不再二次割袍
    const betrayedShenState: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      flags: { betrayed_shen_at_stele: true, shen_left_sect: true },
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: -100, stance: 'estranged', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act4_arc_zhantian_2',
    };
    const shenDef = CONTENT_REGISTRY.companions.shen_qingshuang;
    const shenTitle = typeof shenDef.title === 'function' ? shenDef.title(betrayedShenState) : shenDef.title;
    const shenBio = typeof shenDef.bio === 'function' ? shenDef.bio(betrayedShenState) : shenDef.bio;
    expect(shenTitle).toBe('独行剑客 · 宿怨故敌');
    expect(shenBio).not.toContain('曾与你共斩宗门旧枷');
    const zt2Repeat = playStep(betrayedShenState, 'zt2_seize_hegemony').afterCommit;
    expect(zt2Repeat.companions.shen_qingshuang.chronicle.at(-1)).toContain('新仇更添旧恨');
    expect(zt2Repeat.companions.shen_qingshuang.chronicle.at(-1)).not.toContain('割袍断义');

    // 5. P2-4: 【金光大药】非青云弟子立“九州仙盟”白石碑，青云弟子立“青云宗”白石碑
    const nonQyAsc = CONTENT_REGISTRY.endings.ending_false_ascension
      .epilogue({ ...base, act: 'act6', realm: 'deity_transform', tags: ['origin_orphan'] })
      .join('\n');
    expect(nonQyAsc).toContain('九州仙盟立起白石碑');
    const qyAsc = CONTENT_REGISTRY.endings.ending_false_ascension
      .epilogue({ ...base, act: 'act6', realm: 'deity_transform', tags: ['qingyun_outer'] })
      .join('\n');
    expect(qyAsc).toContain('青云宗立起白石碑');
  });

  it('Cycle 12 专项回归：槐阴绝灵无脉、斩天会三千年四代算术、元婴突破动态年数、苏知微动态年纪、卷三亡者守卫与单复数雪敌', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 槐阴村绝灵无脉而非灵脉未绝
    const act4HubParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_hub.paragraphs,
      { ...base, act: 'act4', realm: 'golden_core', activeThreads: ['thread_act4_mortal'] }
    ).join('\n');
    expect(act4HubParas).toContain('绝灵无脉');
    expect(act4HubParas).not.toContain('灵脉未绝');

    // 2. P1-1: 斩天会三千年四代与顾苍松算术严丝合缝
    const zt2Paras = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_arc_zhantian_2.paragraphs,
      { ...base, act: 'act4', realm: 'golden_core' }
    ).join('\n');
    expect(zt2Paras).toContain('前三代人都想干干净净地推翻天门');
    expect(zt2Paras).toContain('轮到我们第四代');

    // 3. P1-2: 卷四高年份叩关元婴不硬写“数十载”，按实际闭关月数显示“数载”
    const lateAct4: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      year: 3076,
      ageMonths: 80 * 12,
      mind: 130,
      relics: ['nascent_lotus'],
      currentSceneId: 'act4_nascent_gate',
    };
    const lotusStep = playStep(lateAct4, 'nascent_lotus_path');
    const lotusOut = (lotusStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(lotusOut).toContain('数载静养稳固法身');
    expect(lotusOut).not.toContain('数十载静养');

    // 苏知微卷二年纪随主角年龄动态演进
    const youngSuParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act2_arc_plague_2.paragraphs,
      { ...base, act: 'act2', ageMonths: 20 * 12 }
    ).join('\n');
    expect(youngSuParas).toContain('不过二十余岁的年纪');
    const olderSuParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act2_arc_plague_2.paragraphs,
      { ...base, act: 'act2', ageMonths: 52 * 12 }
    ).join('\n');
    expect(olderSuParas).toContain('尚不及花甲之年');

    // 4. P1-3: 卷三 hub3_hearth_2 补齐苏知微枯坐辞世守卫
    const deadSuAct3: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_late',
      ageMonths: 100 * 12,
      activeThreads: ['thread_act3_hearth'],
      flags: { act3_hearth_step1: true, su_zhiwei_saved_longlife: true },
      currentSceneId: 'act3_hub',
    };
    const deadSuHubText = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act3_hub.paragraphs,
      deadSuAct3
    ).join('\n');
    expect(deadSuHubText).toContain('杏林旧屋已成空庐');
    const deadSuChoice = getResolvedChoices(
      deadSuAct3,
      CONTENT_REGISTRY.scenes.act3_hub,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'hub3_hearth_2');
    expect(deadSuChoice?.label).toContain('重回杏林旧庐');

    // 5. P2-1/P2-2/P2-3: 沈清霜正音、谢无咎金丹真人、雪敌单复数严格一致
    const singleFoeSolo = playStep(
      {
        ...base,
        act: 'act5',
        realm: 'nascent_soul',
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: -80, stance: 'estranged', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act5_arc_final_eve',
      },
      'eve_vow_solo'
    );
    const singleFoeOut = (singleFoeSolo.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(singleFoeOut).toContain('那道在风雪里枯立半夜的冷冽身影');
    expect(singleFoeOut).not.toContain('各自转身');

    const dualFoeSolo = playStep(
      {
        ...base,
        act: 'act5',
        realm: 'nascent_soul',
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: -80, stance: 'estranged', stage: 3, chronicle: [] },
          xie_wujiu: { met: true, affection: -80, stance: 'rival', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act5_arc_final_eve',
      },
      'eve_vow_solo'
    );
    const dualFoeOut = (dualFoeSolo.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(dualFoeOut).toContain('那几道在风雪里枯立半夜的冷冽身影');
    expect(dualFoeOut).toContain('各自转身');
  });

  it('Cycle 13 专项回归：坊市均价守恒防刷盈利、奇遇三性/出身/年龄闭环、卷三风声与怪疫防复活、二访盘活与世态衔接', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const herb = CONTENT_REGISTRY.marketGoods.qingxin_herb;

    // 1. P0-1: 均价总成本守恒杜绝原地买1卖1无限刷 total_trade_profit；引擎级禁卷五买入与小数 qty
    let exploitState: GameState = {
      ...base,
      act: 'act2',
      spiritStones: 500,
      market: {
        ...base.market,
        elixirIndex: 1.0,
        holdings: { qingxin_herb: { qty: 2, avgCost: 39 } },
      },
    };
    for (let i = 0; i < 260; i++) {
      const b = buyMarketGood(exploitState, herb, 1);
      expect(b.ok).toBe(true);
      const s = sellMarketGood(b.state, herb, 1);
      expect(s.ok).toBe(true);
      exploitState = s.state;
    }
    // 理论浮盈上限仅为 2 * (40 - 39) = 2，绝不可被刷至 260
    expect(Number(exploitState.flags.total_trade_profit ?? 0)).toBeLessThanOrEqual(2.01);
    expect(buyMarketGood({ ...base, act: 'act5', spiritStones: 5000 }, herb, 1).ok).toBe(false);
    expect(buyMarketGood({ ...base, act: 'act2', spiritStones: 5000 }, herb, 1.5).ok).toBe(false);

    // 2. P0-2: rand_act2_old_acquaintance 三性/出身/年龄动态化 + when 门槛；rand_act3_3 孤儿与低龄不时空倒流
    const femaleOrphanAct2: GameState = {
      ...base,
      profile: makeProfile({ gender: 'female', originId: 'orphan' }),
      act: 'act2',
      ageMonths: 28 * 12,
      tags: ['origin_orphan'],
    };
    const oldAcqParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.rand_act2_old_acquaintance.paragraphs,
      femaleOrphanAct2
    ).join('\n');
    expect(oldAcqParas).toContain('青岚水巷一块抢热饼');
    expect(oldAcqParas).toContain('当年水巷分别时的年轻模样');
    expect(oldAcqParas).not.toContain('少年模样');
    expect(oldAcqParas).not.toContain('爬树掏鸟');
    const oldAcqEv = CONTENT_REGISTRY.randomEvents.find(
      (e) => e.sceneId === 'rand_act2_old_acquaintance'
    );
    expect(oldAcqEv?.when?.({ ...femaleOrphanAct2, ageMonths: 18 * 12 })).toBe(false);
    expect(oldAcqEv?.when?.({ ...femaleOrphanAct2, ageMonths: 25 * 12 })).toBe(true);

    const youngOrphanAct3Paras = resolveParagraphs(
      CONTENT_REGISTRY.scenes.rand_act3_3.paragraphs,
      { ...femaleOrphanAct2, act: 'act3', ageMonths: 24 * 12 }
    ).join('\n');
    expect(youngOrphanAct3Paras).toContain('塞你半块热饼');
    expect(youngOrphanAct3Paras).toContain('几年前安然寿终');
    expect(youngOrphanAct3Paras).not.toContain('十年前已寿终正寝');
    expect(youngOrphanAct3Paras).not.toContain('客栈西厢');

    // 3. P1-1 & P1-2 & P2-6: 卷三无冲突风声不再串回青岚、怪疫结案接护药悬赏不复活疫情、敌对谢无咎屏蔽私信
    const act3Market = recalculateMarketPulse({ ...base, act: 'act3', flags: {} });
    expect(act3Market.rumorText).toContain('奇珍楼');
    expect(act3Market.rumorText).not.toContain('青岚坊市');

    const postPlagueEscort = playStep(
      {
        ...base,
        act: 'act2',
        completedThreads: ['thread_qingzhou_plague'],
        currentSceneId: 'act2_action_commission',
      },
      'a2_job_escort_medicine'
    ).afterCommit;
    expect(postPlagueEscort.flags.arc_plague_active).toBeFalsy();
    expect(postPlagueEscort.market.rumorText).not.toContain('青州怪疫蔓延');

    const hostileXieMarket = recalculateMarketPulse({
      ...base,
      act: 'act2',
      flags: { xie_market_tip: true },
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: -50, stance: 'rival', stage: 2, chronicle: [] },
      },
    });
    expect(hostileXieMarket.rumorText).not.toContain('百宝斋私信提示');

    // 4. P1-3 & P1-4 & P1-5: 卷四谢无咎崩盘地点与开场白、不写十年前/act1_heard_blood_pill；苏知微冷离态；卷三/四允许二访
    const collapsedXieVisit: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      flags: { act4_chamber_collapsed: true },
      market: {
        ...base.market,
        holdings: { soul_amber: { qty: 1, avgCost: 260 } },
      },
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: 55, stance: 'confidant', stage: 3, chronicle: [] },
      },
      currentSceneId: 'visit_xie_wujiu',
    };
    const xieParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.visit_xie_wujiu.paragraphs,
      collapsedXieVisit
    ).join('\n');
    expect(xieParas).toContain('天机商行这颗毒瘤一拔');
    const act4XieChoices = getResolvedChoices(
      collapsedXieVisit,
      CONTENT_REGISTRY.scenes.visit_xie_wujiu,
      CONTENT_REGISTRY
    );
    expect(act4XieChoices.some((c) => c.id === 'v_xie_market_tip')).toBe(false);
    const xieDebateCommit = playStep(collapsedXieVisit, 'v_xie_act4_charter_debate').afterCommit;
    expect(xieDebateCommit.flags.act1_heard_blood_pill).toBeFalsy();
    const xieGiftStep = playStep(collapsedXieVisit, 'v_xie_act4_gift_amber');
    expect((xieGiftStep.afterChoice.pendingTransition?.paragraphs ?? []).join('')).toContain('仙盟长老私账');

    const coldSuParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.visit_su_zhiwei.paragraphs,
      {
        ...base,
        act: 'act2',
        flags: { left_qingzhou_coldly: true },
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: -5, stance: 'stranger', stage: 1, chronicle: [] },
        },
      }
    ).join('\n');
    expect(coldSuParas).toContain('小小医馆');
    expect(coldSuParas).not.toContain('桂花茶刚温好');

    // 卷三/四二访解锁
    const act3SecondVisit = getResolvedChoices(
      {
        ...base,
        act: 'act3',
        totalActions: 5,
        actionUses: { 'act3:visit_shen': 1 },
        actionLastTurn: { 'act3:visit_shen': 2 },
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: 40, stance: 'confidant', stage: 2, chronicle: [] },
        },
      },
      CONTENT_REGISTRY.scenes.act3_companion_visit,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'hub3_visit_shen');
    expect(act3SecondVisit?.locked).toBe(false);

    // 5. P1-6: rand_act5_mortal_harvest 出世符号为负、农时自洽、0石不埋灵石；rand_act3_4 白捡琥珀 unitCost=0
    const wheatPonder = playStep(
      { ...base, act: 'act5', realm: 'nascent_soul', currentSceneId: 'rand_act5_mortal_harvest' },
      'r5_wheat_ponder'
    ).afterCommit;
    expect(wheatPonder.alignment.worldly).toBeLessThan(base.alignment.worldly);
    const wheatProtect = playStep(
      {
        ...base,
        act: 'act5',
        realm: 'nascent_soul',
        spiritStones: 0,
        currentSceneId: 'rand_act5_mortal_harvest',
      },
      'r5_wheat_protect'
    );
    const wheatOut = (wheatProtect.afterChoice.pendingTransition?.paragraphs ?? []).join('');
    expect(wheatOut).toContain('土元灵息');
    expect(wheatOut).not.toContain('埋下几枚灵石');

    const amberSalvage = playStep(
      { ...base, act: 'act3', currentSceneId: 'rand_act3_4' },
      'r3_4_salvage_loot'
    ).afterCommit;
    expect(amberSalvage.market.holdings.soul_amber?.avgCost).toBe(0);
  });

  it('Cycle 14 专项回归：原型链键防绕过、小数年份防undefined、规范化全收口、卷一/二风声与满小境潜修及卷三副标题隔离', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const storage = makeMemoryStorage();

    // 1. P0-1: 原型键 (toString/constructor/valueOf/__proto__) 不可绕过任何白名单，也不污染 MetaArchive
    const protoAttack = {
      ...base,
      currentSceneId: 'toString',
      endingId: 'toString',
      pendingReturnSceneId: 'constructor',
      tags: ['toString', 'constructor', 'origin_herbalist'],
      truthClues: ['valueOf', 'clue_stele_gap'],
      relics: ['hasOwnProperty', 'baibao_token'],
      profile: { ...base.profile, originId: 'constructor', daoHeartId: 'toString' },
      market: {
        ...base.market,
        holdings: {
          toString: { qty: 3, avgCost: 10 },
          qingxin_herb: { qty: 0.5, avgCost: 20 },
        },
      },
      companions: {
        ...base.companions,
        hacked_npc: { met: true, affection: 99, stance: 'bonded', stage: 9, chronicle: [] },
        shen_qingshuang: { met: false, affection: 99999, stance: 'bonded', stage: -5, chronicle: ['x'] },
      },
    };
    const safe = validateAndNormalizeState(protoAttack, CONTENT_REGISTRY)!;
    expect(safe).not.toBeNull();
    expect(safe.currentSceneId).toBe('act1_qinglan_arrival');
    expect(safe.endingId).toBeUndefined();
    expect(safe.pendingReturnSceneId).toBeUndefined();
    expect(safe.tags).toEqual(['origin_herbalist']);
    expect(safe.truthClues).toEqual(['clue_stele_gap']);
    expect(safe.relics).toEqual(['baibao_token']);
    expect(safe.profile.originId).toBe(CONTENT_REGISTRY.origins[0].id);
    expect(safe.profile.daoHeartId).toBe(CONTENT_REGISTRY.daoHearts[0].id);
    // 小数 0.5 qty 不生成僵尸持仓，toString 键被剔除
    expect(Object.keys(safe.market.holdings)).toEqual([]);
    // 未结识伴侣强制回退 unmet，好感/阶位严格钳位
    expect(safe.companions.shen_qingshuang.stance).toBe('unmet');
    expect(safe.companions.shen_qingshuang.affection).toBe(500);
    expect(safe.companions.shen_qingshuang.stage).toBe(0);

    const syncedMeta = syncMetaFromState(
      { ...safe, endingId: 'toString' },
      undefined,
      storage,
      CONTENT_REGISTRY
    );
    expect(syncedMeta.unlockedEndings).toEqual([]);
    expect(syncedMeta.metCompanions).not.toContain('hacked_npc');

    // 2. P0-2 & P1-5: 小数年份取整防 undefined、跨卷场景对齐、endingId 清空 pendingTransition、total_trade_profit 非数值防 NaN
    const floatYearState = validateAndNormalizeState(
      {
        ...base,
        act: 'act1',
        currentSceneId: 'act5_hub',
        year: 3012.5,
        endingId: 'ending_sever_sky_solo',
        pendingTransition: {
          chosenLabel: 'x',
          originParagraphs: [],
          paragraphs: [],
          continueLabel: 'y',
          nextSceneId: 'act5_hub',
          notices: [],
        },
      },
      CONTENT_REGISTRY
    )!;
    expect(floatYearState.year).toBe(3012);
    expect(formatCalendarDate(3012.5, 0)).toBe('长明三千零一十二年 · 春');
    expect(floatYearState.act).toBe('act5');
    expect(floatYearState.pendingTransition).toBeUndefined();

    const nanProfitRes = sellMarketGood(
      {
        ...base,
        act: 'act2',
        flags: { total_trade_profit: 'corrupted_text' },
        market: {
          ...base.market,
          elixirIndex: 1.25,
          holdings: { qingxin_herb: { qty: 1, avgCost: 30 } },
        },
      },
      CONTENT_REGISTRY.marketGoods.qingxin_herb,
      1
    );
    expect(Number.isFinite(Number(nanProfitRes.state.flags.total_trade_profit))).toBe(true);
    expect(Number(nanProfitRes.state.flags.total_trade_profit)).toBeGreaterThan(0);

    // 3. P1-3 & P1-4: 卷一茶楼双风声合并看涨且限购一次；卷二听风密报独立计数且未遇/敌对谢无咎仍生效不弹百宝私信
    const a1IntelStep = playStep(
      { ...base, act: 'act1', spiritStones: 50, currentSceneId: 'act1_action_intel' },
      'a1_intel_market'
    ).afterCommit;
    expect(a1IntelStep.market.elixirIndex).toBeGreaterThanOrEqual(1.18);
    expect(a1IntelStep.market.rumorText).toContain('清心草稳步看涨');
    const a1IntelAgain = getResolvedChoices(
      { ...a1IntelStep, currentSceneId: 'act1_action_intel' },
      CONTENT_REGISTRY.scenes.act1_action_intel,
      CONTENT_REGISTRY
    );
    expect(a1IntelAgain.some((c) => c.id === 'a1_intel_market')).toBe(false);

    const a2IntelHostile = playStep(
      {
        ...base,
        act: 'act2',
        spiritStones: 100,
        actionUses: { 'act2:intel': 2 },
        companions: {
          ...base.companions,
          xie_wujiu: { met: true, affection: -50, stance: 'estranged', stage: 2, chronicle: [] },
        },
        currentSceneId: 'act2_action_intel',
      },
      'a2_intel_market_read'
    ).afterCommit;
    expect(a2IntelHostile.market.rumorText).toContain('听风暗桩与牙行密报');
    expect(a2IntelHostile.market.rumorText).not.toContain('百宝斋私信提示');

    // 4. P1-6: 卷二/三满小境潜修不报“迈进一阶”，卷三副标题隔离跨卷 completedThreads
    const act2PeakCult = playStep(
      { ...base, act: 'act2', realm: 'qi_peak', currentSceneId: 'act2_action_cultivate' },
      'a2_cult_meditate'
    );
    expect((act2PeakCult.afterChoice.pendingTransition?.paragraphs ?? []).join('')).not.toContain('迈进一阶');
    expect(
      resolveTextValue(CONTENT_REGISTRY.scenes.act3_hub.subtitle, {
        ...base,
        act: 'act3',
        actBeat: 0,
        completedThreads: ['thread_qingzhou_plague', 'thread_sword_trial'],
      })
    ).toBe('卷三 · 九州棋局，暗流并发');
  });

  it('Cycle 15 专项回归：正反馈防心许降级、合法高好感存储守恒、坐化撤销死后未来纪事与延寿/坐化编年闭环', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 卷二赠延寿露救苏知微与古脉立重誓绝不将已 bonded 故人降级回 confidant
    const bondedSuState: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_mid',
      relics: ['longevity_dew'],
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 76, stance: 'bonded', stage: 2, chronicle: [] },
      },
      currentSceneId: 'act2_arc_plague_2',
    };
    const afterDewSave = playStep(bondedSuState, 'plague2_use_longevity_dew').afterCommit;
    expect(afterDewSave.companions.su_zhiwei.affection).toBe(100);
    expect(afterDewSave.companions.su_zhiwei.stance).toBe('bonded');

    const bondedCmState: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_mid',
      companions: {
        ...base.companions,
        cang_ming: { met: true, affection: 79, stance: 'bonded', stage: 2, chronicle: [] },
      },
      currentSceneId: 'act2_arc_vein_2',
    };
    const afterCmVow = playStep(bondedCmState, 'vein2_swear_with_cangming').afterCommit;
    expect(afterCmVow.companions.cang_ming.affection).toBe(95);
    expect(afterCmVow.companions.cang_ming.stance).toBe('bonded');

    // 2. P1-2: 合法高好感 (200~271) 经存储验证/读档 100% 守恒不被截断至 150
    const highAffState: GameState = {
      ...base,
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 271, stance: 'bonded', stage: 3, chronicle: [] },
        xie_wujiu: { met: true, affection: 249, stance: 'bonded', stage: 3, chronicle: [] },
      },
    };
    const reloaded = validateAndNormalizeState(highAffState, CONTENT_REGISTRY)!;
    expect(reloaded.companions.shen_qingshuang.affection).toBe(271);
    expect(reloaded.companions.xie_wujiu.affection).toBe(249);

    // 3. P1-3: 496/500 岁塑骨坐化不遗留死后未来年份(3499年)故人纪事，且编年末条落笔【枯骨问天】；延寿露续命写入【延寿续元】
    const nearDeathCm: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      year: 3492,
      ageMonths: 496 * 12,
      lifespanYears: 500,
      spiritStones: 1000,
      companions: {
        ...base.companions,
        cang_ming: {
          met: true,
          affection: 120,
          stance: 'bonded',
          stage: 3,
          chronicle: ['长明3012年 · 荒驿残玉苏醒。'],
        },
      },
      currentSceneId: 'act4_arc_cangming_rebirth',
    };
    const diedAtRebirth = playStep(nearDeathCm, 'cm_rebirth_essence').afterCommit;
    expect(diedAtRebirth.endingId).toBe('ending_lifespan');
    expect(diedAtRebirth.year).toBe(3496);
    expect(diedAtRebirth.companions.cang_ming.chronicle.length).toBe(1);
    expect(diedAtRebirth.companions.cang_ming.chronicle.join('')).not.toContain('3499');
    expect(diedAtRebirth.historyLog.at(-1)?.title).toBe('枯骨问天');
    expect(diedAtRebirth.historyLog.at(-1)?.year).toBe(3496);

    const dewSurviveState: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_mid',
      year: 3112,
      ageMonths: 116 * 12,
      lifespanYears: 120,
      relics: ['longevity_dew'],
      currentSceneId: 'act2_foundation_gate',
    };
    const survivedWithDew = playStep(dewSurviveState, 'found_slow_grind').afterCommit;
    expect(survivedWithDew.endingId).toBeUndefined();
    expect(survivedWithDew.lifespanYears).toBe(140);
    expect(survivedWithDew.historyLog.some((h) => h.title === '延寿续元')).toBe(true);
  });

  it('Cycle 16 专项回归：终战前夜断玉/远信零幽灵围炉、心魔防提前剧透熔炉、BOM导档与512KB截断、卷五开篇跨度与四处因果自洽', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 仅未复生断玉苍溟 + 远在青州苏知微时，act5_hub 不报“候在炉火旁”，eve_vow_mortal 不现“炭炉旁诸人碰茶”，eve_vow_bonded 不让断玉佩剑会师
    const jadeAndSuOnly: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      lifespanYears: 1000,
      ageMonths: 82 * 12,
      activeThreads: ['thread_act5_eve'],
      relics: ['mortal_hearth_talisman', 'charred_jade_relic'],
      truthClues: ['clue_mortal_bloodline', 'clue_furnace_cycle'],
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        cang_ming: { met: true, affection: 80, stance: 'bonded', stage: 3, chronicle: [] },
        su_zhiwei: { met: true, affection: 90, stance: 'bonded', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act5_arc_final_eve',
    };
    const hub5Text = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_hub.paragraphs,
      jadeAndSuOnly
    ).join('\n');
    expect(hub5Text).not.toContain('候在炉火旁');

    const eveMortalStep = playStep(jadeAndSuOnly, 'eve_vow_mortal');
    const eveMortalOut = (eveMortalStep.afterChoice.pendingTransition?.paragraphs ?? []).join('');
    expect(eveMortalOut).not.toContain('炭炉旁诸人');
    expect(eveMortalOut).toContain('焦黑断玉轻鸣一声');

    const eveBondedStep = playStep(jadeAndSuOnly, 'eve_vow_bonded');
    const eveBondedOut = (eveBondedStep.afterChoice.pendingTransition?.paragraphs ?? []).join('');
    expect(eveBondedOut).not.toContain('整衣佩剑');
    expect(eveBondedOut).toContain('对着油灯旁的焦黑断玉');

    // 2. P0-2: 卷二心魔仅持血丹+抽灵线索（未见碑背与苍溟）绝不剧透“熔炉/大药”
    const merchantDemonState: GameState = {
      ...base,
      act: 'act2',
      truthClues: ['clue_blood_pill_dust', 'clue_vein_drain'],
      flags: { dao_heart: 'seek_truth' },
      currentSceneId: 'act2_heart_demon',
    };
    const demonParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act2_heart_demon.paragraphs,
      merchantDemonState
    ).join('\n');
    expect(demonParas).not.toContain('熔炉');
    expect(demonParas).not.toContain('大药');
    expect(demonParas).toContain('青州灵脉七成抽空');
    const demonChoices = getResolvedChoices(
      merchantDemonState,
      CONTENT_REGISTRY.scenes.act2_heart_demon,
      CONTENT_REGISTRY
    );
    expect(demonChoices.find((c) => c.id === 'demon_answer_defy')?.label).not.toContain('知其为炉');

    // 3. P1-2 & P1-4: UTF-8 BOM 合法导档成功；超 512KB 导入被拒绝；超长 rumorText/flag 字符串被截断
    const validExport = exportSaveJson(base);
    const bomParsed = importSaveJson(`\uFEFF${validExport}`, CONTENT_REGISTRY);
    expect(bomParsed).not.toBeNull();
    expect(bomParsed?.profile.name).toBe(base.profile.name);

    const hugeJson = exportSaveJson({
      ...base,
      market: { ...base.market, rumorText: '荒'.repeat(600000) },
    });
    expect(importSaveJson(hugeJson, CONTENT_REGISTRY)).toBeNull();
    const truncated = validateAndNormalizeState(
      {
        ...base,
        market: { ...base.market, rumorText: '风'.repeat(500) },
        lastBridgeNote: '桥'.repeat(500),
      },
      CONTENT_REGISTRY
    )!;
    expect(truncated.market.rumorText.length).toBe(300);
    expect(truncated.lastBridgeNote?.length).toBe(300);

    // 4. P1-5 & P1-6 & P2-4: 卷五短闭关不称“几十载”、卷四魔丹不称“无瑕金丹”、卷三青云反目藏剑令、结局无半角空格
    const act5ShortOpen = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_opening.paragraphs,
      { ...jadeAndSuOnly, flags: { nascent_retreat_months: 120 } }
    ).join('\n');
    expect(act5ShortOpen).not.toContain('几十载');
    expect(act5ShortOpen).toContain('漫长闭关终于落幕');

    const act4DemonOpen = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_opening.paragraphs,
      { ...base, act: 'act4', realm: 'golden_core', flags: { golden_core_method: 'blood_demon' } }
    ).join('\n');
    expect(act4DemonOpen).toContain('赤黑魔丹');
    expect(act4DemonOpen).not.toContain('无瑕金丹');

    const hostileSect1 = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act3_arc_sect_1.paragraphs,
      {
        ...base,
        act: 'act3',
        relics: ['qingyun_sword_tally'],
        flags: { qingyun_elders_hostile: true },
      }
    ).join('\n');
    expect(hostileSect1).toContain('压进袖底');
    expect(hostileSect1).not.toContain('颔首致意');

    const act3OpenText = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act3_opening.paragraphs,
      { ...base, act: 'act3' }
    ).join('\n');
    expect(act3OpenText).toContain('持帖观礼');
    expect(act3OpenText).not.toContain('持贴观礼');
  });

  it('Cycle 17 regressions: met Su Zhiwei hearth memory, unmet Xie gilded net, dynamic lifespan, jade CangMing aftermath, instant-death 0 months, and fourth-wall cleanup', () => {
    const base = createInitialState(
      {
        name: '云栖',
        gender: 'male',
        honorific: '公子',
        originId: 'herbalist',
        openingEventIds: ['ev_charred_jade', 'ev_qingzhou_vow'],
        daoHeartId: 'seek_longevity',
      },
      CONTENT_REGISTRY
    );

    // 1. P0-1: 已识苏知微过世后卷三杏林不称“素未谋面的凡人女医”
    const metDeadSuState: GameState = {
      ...base,
      act: 'act3',
      currentSceneId: 'act3_arc_hearth_2',
      ageMonths: 70 * 12,
      flags: { ...base.flags, su_zhiwei_passed: true },
      companions: {
        ...base.companions,
        su_zhiwei: { ...base.companions.su_zhiwei, met: true, affection: 30, stance: 'confidant' },
      },
    };
    const hearthStep = advanceChoice(metDeadSuState, 'hearth2_inherit_stranger', CONTENT_REGISTRY);
    const hearthOut = hearthStep.state.pendingTransition?.paragraphs.join('\n') ?? '';
    expect(hearthOut).toContain('手稳心静的故人');
    expect(hearthOut).not.toContain('素未谋面的凡人女医');

    // 2. P0-2 & P1-2 & P1-6: 未遇谢无咎走万金镇山河不调用百宝暗网；未重塑断玉苍溟在散仙/万金归宿不蒸发；陌生沈/谢不演深交
    const unmetXieGilded: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      lifespanYears: 2000,
      currentSceneId: 'act6_final_choice',
      spiritStones: 1200,
      tags: [...base.tags, 'merchant_fame'],
      companions: {
        ...base.companions,
        xie_wujiu: { ...base.companions.xie_wujiu, met: false, affection: 0, stance: 'stranger' },
        cang_ming: { ...base.companions.cang_ming, met: true, affection: 90, stance: 'bonded' },
      },
    };
    const gildedStep = advanceChoice(unmetXieGilded, 'final_gilded_realm', CONTENT_REGISTRY);
    const gildedOut = gildedStep.state.pendingTransition?.paragraphs.join('\n') ?? '';
    expect(gildedOut).toContain('七十二城金网');
    expect(gildedOut).not.toContain('百宝');
    const gildedEpilogue = CONTENT_REGISTRY.endings.ending_gilded_realm
      .epilogue(gildedStep.state)
      .join('\n');
    expect(gildedEpilogue).not.toContain('百宝');
    expect(gildedEpilogue).toContain('袖中焦黑断玉');

    const strangerHidden: GameState = {
      ...unmetXieGilded,
      seasonIndex: 1, // 夏
      mind: 320,
      truthClues: ['clue_mortal_bloodline'],
      companions: {
        ...unmetXieGilded.companions,
        shen_qingshuang: { ...base.companions.shen_qingshuang, met: true, affection: 0, stance: 'stranger' },
        xie_wujiu: { ...base.companions.xie_wujiu, met: true, affection: 5, stance: 'stranger' },
        cang_ming: { ...base.companions.cang_ming, met: true, affection: 95, stance: 'bonded' },
      },
    };
    const fakeDeathStep = advanceChoice(strangerHidden, 'final_earth_immortal', CONTENT_REGISTRY);
    expect(fakeDeathStep.state.lifespanYears).toBe(1000);
    const fakeDeathOut = fakeDeathStep.state.pendingTransition?.paragraphs.join('\n') ?? '';
    expect(fakeDeathOut).toContain('“已陨”');
    expect(fakeDeathOut).not.toContain('“已收割”');
    expect(fakeDeathOut).toContain('松针薄雾');
    expect(fakeDeathOut).not.toContain('残雪');
    const hiddenEpilogue = CONTENT_REGISTRY.endings.ending_earth_immortal
      .epilogue(fakeDeathStep.state)
      .join('\n');
    expect(hiddenEpilogue).toContain('袖中焦黑断玉');
    expect(hiddenEpilogue).not.toContain('唇角微扬');
    expect(hiddenEpilogue).not.toContain('假死账做得漂亮');

    // 3. P1-1: 延寿续命金丹 520 岁坐化不再输出“五百载寿限”
    const dewLifespanText = CONTENT_REGISTRY.endings.ending_lifespan
      .epilogue({
        ...base,
        realm: 'golden_core',
        ageMonths: 520 * 12,
        lifespanYears: 520,
      })
      .join('\n');
    expect(dewLifespanText).toContain('五百二十载寿限');
    expect(dewLifespanText).not.toContain('熬不过五百载寿限');

    // 4. P1-4: 瞬死雷劫/血丹失败不额外推进时间
    const bloodFailState: GameState = {
      ...base,
      act: 'act2',
      currentSceneId: 'act2_foundation_gate',
      mind: 30,
      relics: [...base.relics, 'blood_foundation_pill'],
    };
    const bloodFailStep = advanceChoice(bloodFailState, 'found_blood_pill', CONTENT_REGISTRY);
    expect(bloodFailStep.state.ageMonths).toBe(bloodFailState.ageMonths);

    // 5. P1-5 & P1-7 & P2-1: 无漏网“真结局”/“法理”，携心许挚友选孤剑斩天门补齐拦友衔接
    const eveBondedSub = CONTENT_REGISTRY.scenes.act5_arc_final_eve.choices.find(
      (c) => c.id === 'eve_vow_bonded'
    )?.subtext;
    expect(typeof eveBondedSub === 'string' ? eveBondedSub : '').not.toContain('真结局');
    const soloWithBonded: GameState = {
      ...unmetXieGilded,
      flags: { act5_final_vow: 'solo' },
      truthClues: [
        'clue_stele_gap',
        'clue_blood_pill_dust',
        'clue_changming_night',
        'clue_mortal_blindspot',
        'clue_mortal_bloodline',
        'clue_furnace_cycle',
        'clue_gate_weakness',
      ],
      might: 240,
      companions: {
        ...unmetXieGilded.companions,
        shen_qingshuang: { ...base.companions.shen_qingshuang, met: true, affection: 90, stance: 'bonded' },
      },
    };
    const soloStep = advanceChoice(soloWithBonded, 'final_sever_sky_solo', CONTENT_REGISTRY);
    expect(soloStep.state.pendingTransition?.paragraphs[0]).toContain('隔断来路不许故人涉险');
  });

  it('Cycle 18 专项回归：九大核心体验重构（谢线差异化、去出戏文案、四阶勘验、双大势取舍、亡者零亲近、仙缘道侣、阶段访友与越阶灭口）', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. 谢无咎三幕剧情彻底差异化（卷二血丹暗账 / 卷三百宝内变与仁商公审 / 卷四灵票崩潮与九州公契）
    const xieAct2 = resolveParagraphs(CONTENT_REGISTRY.scenes.act2_arc_blood_1.paragraphs, {
      ...base,
      act: 'act2',
    }).join('\n');
    const xieAct3 = resolveParagraphs(CONTENT_REGISTRY.scenes.act3_arc_chamber_1.paragraphs, {
      ...base,
      act: 'act3',
    }).join('\n');
    const xieAct4 = resolveParagraphs(CONTENT_REGISTRY.scenes.act4_arc_world_war_1.paragraphs, {
      ...base,
      act: 'act4',
    }).join('\n');
    expect(xieAct2).toContain('血丹');
    expect(xieAct3).toContain('周恪');
    expect(xieAct3).toContain('药荒');
    expect(xieAct4).toContain('灵根质押血契');
    expect(xieAct4).toContain('九州灵矿独霸总章');

    // 2. 文案去出戏：苏知微临终改写温润走心，全结局与全剧本无「够本」
    const suFarewellStep = playStep(
      {
        ...base,
        act: 'act3',
        ageMonths: 62 * 12,
        year: 3058,
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: 65, stance: 'confidant', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act3_arc_hearth_2',
      },
      'hearth2_farewell_passing'
    );
    const suFarewellSceneText = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act3_arc_hearth_2.paragraphs,
      {
        ...base,
        act: 'act3',
        ageMonths: 62 * 12,
        year: 3058,
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: 65, stance: 'confidant', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act3_arc_hearth_2',
      }
    ).join('\n');
    expect(suFarewellSceneText).toContain('人活一世，还能求什么');
    expect(suFarewellSceneText).not.toContain('够本');
    const suFarewellOut = (suFarewellStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(suFarewellOut).not.toContain('够本');
    const cmBondEp = CONTENT_REGISTRY.endings.ending_sever_sky_bonded
      .epilogue({
        ...base,
        act: 'act6',
        tags: [...base.tags, 'cangming_reborn'],
        companions: {
          ...base.companions,
          cang_ming: { met: true, affection: 90, stance: 'bonded', bondType: 'dao_partner', stage: 4, chronicle: [] },
        },
      })
      .join('\n');
    expect(cmBondEp).not.toContain('够本');

    // 3. 苏知微辞世后：deceased=true、记录辞世年份、绝不弹出「心生亲近」、命盘徽章严格标【已辞世】
    const suDeadState = suFarewellStep.afterCommit;
    expect(isCompanionDeceased(suDeadState, 'su_zhiwei')).toBe(true);
    expect(suDeadState.companions.su_zhiwei.deceased).toBe(true);
    expect(suDeadState.companions.su_zhiwei.deceasedYear).toBeDefined();
    const suFarewellNotices = [
      ...suFarewellStep.afterChoice.recentNotices,
      ...(suFarewellStep.afterChoice.pendingTransition?.notices ?? []),
    ].join('\n');
    expect(suFarewellNotices).not.toContain('心生亲近');
    expect(suFarewellNotices).not.toContain('默契渐深');
    expect(getCompanionStatusBadge(suDeadState, 'su_zhiwei')).toMatchObject({
      label: '已辞世',
      tone: 'deceased',
    });

    // 4. 天时行动力（每卷至多 2 条核心大势）与暗桩买讯防绕过
    let act2SlotState: GameState = {
      ...base,
      act: 'act2',
      realm: 'qi_mid',
      activeThreads: [
        'thread_sword_trial',
        'thread_blood_pill',
        'thread_qingzhou_plague',
        'thread_ancient_vein',
      ],
      currentSceneId: 'act2_hub',
    };
    expect(getRemainingMajorArcSlots(act2SlotState, 'act2')).toBe(MAX_MAJOR_ARCS_PER_ACT);
    act2SlotState = playStep(act2SlotState, 'hub_sword_1').afterCommit;
    expect(getRemainingMajorArcSlots(act2SlotState, 'act2')).toBe(1);
    act2SlotState = playStep({ ...act2SlotState, currentSceneId: 'act2_hub' }, 'hub_blood_1').afterCommit;
    expect(getRemainingMajorArcSlots(act2SlotState, 'act2')).toBe(0);
    expect(canCommitMajorArc(act2SlotState, 'act2', 'thread_qingzhou_plague')).toBe(false);
    expect(act2SlotState.flags.missed_thread_qingzhou_plague).toBe(true);
    expect(act2SlotState.flags.missed_thread_ancient_vein).toBe(true);
    // 听风酒肆买讯亦不可绕过 2 席上限
    const intelAfterCap = getResolvedChoices(
      { ...act2SlotState, spiritStones: 500, currentSceneId: 'act2_action_intel' },
      CONTENT_REGISTRY.scenes.act2_action_intel,
      CONTENT_REGISTRY
    );
    expect(intelAfterCap.some((c) => c.id === 'hub_cross_open_plague')).toBe(false);
    expect(intelAfterCap.some((c) => c.id === 'hub_cross_open_vein')).toBe(false);

    // 5. 四阶段天机证据链递进与仙盟「护界进贡论」
    expect(getInvestigationProgress({ ...base, truthClues: [] }, CONTENT_REGISTRY).chainTier).toBe(0);
    expect(
      getInvestigationProgress({ ...base, truthClues: ['clue_stele_gap'] }, CONTENT_REGISTRY).chainTier
    ).toBe(1);
    expect(
      getInvestigationProgress(
        {
          ...base,
          truthClues: ['clue_stele_gap', 'clue_vein_drain', 'clue_blood_pill_dust', 'clue_tianji_portal'],
        },
        CONTENT_REGISTRY
      ).chainTier
    ).toBe(2);
    expect(
      getInvestigationProgress(
        {
          ...base,
          truthClues: [
            'clue_stele_gap',
            'clue_vein_drain',
            'clue_blood_pill_dust',
            'clue_tianji_portal',
            'clue_alliance_pact',
            'clue_zhantian_remnant',
            'clue_furnace_cycle',
          ],
        },
        CONTENT_REGISTRY
      ).chainTier
    ).toBe(3);
    const summitZeroParas = resolveParagraphs(CONTENT_REGISTRY.scenes.act5_arc_summit.paragraphs, {
      ...base,
      act: 'act5',
    }).join('\n');
    expect(summitZeroParas).toContain('代天护界');
    expect(summitZeroParas).not.toContain('依约进贡');
    const summitParas = resolveParagraphs(CONTENT_REGISTRY.scenes.act5_arc_summit.paragraphs, {
      ...base,
      act: 'act5',
      truthClues: ['clue_alliance_pact'],
    }).join('\n');
    expect(summitParas).toContain('依约进贡');
    expect(summitParas).toContain('保住界壁');

    // 6. 仙缘雅阁：一阶知交夜话(30)、唯一道侣(75)互斥与生死挚交共存、赠礼喜恶、亡者焚香零好感增减
    let sanct: GameState = {
      ...base,
      act: 'act3',
      market: {
        ...base.market,
        holdings: {
          golden_vein_sand: { qty: 1, avgCost: 200 },
          po_zhang_talisman: { qty: 1, avgCost: 60 },
        },
      },
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 76, stance: 'confidant', stage: 3, chronicle: [] },
        xie_wujiu: { met: true, affection: 76, stance: 'confidant', stage: 3, chronicle: [] },
        su_zhiwei: { met: true, affection: 40, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    // 赠礼喜恶：苏知微不喜杀伐符箓（好感下降），沈清霜喜金脉灵砂（好感上升）
    const dislikeGift = giveSanctuaryGift(sanct, 'su_zhiwei', 'po_zhang_talisman', CONTENT_REGISTRY);
    expect(dislikeGift.ok).toBe(true);
    expect(dislikeGift.state.companions.su_zhiwei.affection).toBe(36);
    sanct = dislikeGift.state;
    const favGift = giveSanctuaryGift(sanct, 'shen_qingshuang', 'golden_vein_sand', CONTENT_REGISTRY);
    expect(favGift.ok).toBe(true);
    expect(favGift.state.companions.shen_qingshuang.affection).toBe(86);
    sanct = favGift.state;

    // 须先完成一阶知交夜话才可结契
    expect(canCommitBond(sanct, 'shen_qingshuang', 'dao_partner').ok).toBe(false);
    expect(canTriggerMilestone1(sanct, 'shen_qingshuang')).toBe(true);
    const shenM1 = triggerMilestone1(sanct, 'shen_qingshuang');
    expect(shenM1.ok).toBe(true);
    expect(shenM1.state.companions.shen_qingshuang.letters?.length).toBe(1);
    sanct = shenM1.state;

    // 沈清霜结为唯一道侣后，谢无咎不可再结道侣，但可结生死挚交
    const shenPartner = commitCompanionBond(sanct, 'shen_qingshuang', 'dao_partner');
    expect(shenPartner.ok).toBe(true);
    sanct = shenPartner.state;
    expect(sanct.daoPartnerId).toBe('shen_qingshuang');
    expect(getCompanionStatusBadge(sanct, 'shen_qingshuang')).toMatchObject({
      label: '结契道侣',
      tone: 'partner',
    });

    sanct = triggerMilestone1(sanct, 'xie_wujiu').state;
    expect(canCommitBond(sanct, 'xie_wujiu', 'dao_partner').ok).toBe(false);
    expect(canCommitBond(sanct, 'xie_wujiu', 'sworn').ok).toBe(true);
    const xieSworn = commitCompanionBond(sanct, 'xie_wujiu', 'sworn');
    expect(xieSworn.ok).toBe(true);
    expect(getCompanionStatusBadge(xieSworn.state, 'xie_wujiu').label).toBe('生死挚交');

    // 已辞世苏知微仅提供焚香追思，心境+8且好感绝不变动
    const deadActs = getSanctuaryActivities(suDeadState, 'su_zhiwei');
    expect(deadActs.map((a) => a.id)).toEqual(['mourn_lantern']);
    const mournRes = performSanctuaryActivity(suDeadState, 'su_zhiwei', 'mourn_lantern');
    expect(mournRes.ok).toBe(true);
    expect(mournRes.state.mind).toBe(suDeadState.mind + 8);
    expect(mournRes.state.companions.su_zhiwei.affection).toBe(
      suDeadState.companions.su_zhiwei.affection
    );

    // 7. 拜访故人跨阶段彻底差异化（卷二 vs 卷三 vs 卷四核心选项零重复）
    const visitScenes: Array<[string, string]> = [
      ['visit_su_zhiwei', 'v_su_back'],
      ['visit_xie_wujiu', 'v_xie_back'],
      ['visit_shen_qingshuang', 'v_shen_back'],
      ['visit_cang_ming', 'v_cm_back'],
    ];
    for (const [sceneId, backId] of visitScenes) {
      const act2Ids = getResolvedChoices(
        { ...base, act: 'act2', realm: 'qi_mid', currentSceneId: sceneId },
        CONTENT_REGISTRY.scenes[sceneId],
        CONTENT_REGISTRY
      )
        .map((c) => c.id)
        .filter((id) => id !== backId);
      const act3Ids = getResolvedChoices(
        { ...base, act: 'act3', realm: 'foundation_mid', currentSceneId: sceneId },
        CONTENT_REGISTRY.scenes[sceneId],
        CONTENT_REGISTRY
      )
        .map((c) => c.id)
        .filter((id) => id !== backId);
      const act4Ids = getResolvedChoices(
        { ...base, act: 'act4', realm: 'golden_core', flags: { su_zhiwei_saved_longlife: true }, currentSceneId: sceneId },
        CONTENT_REGISTRY.scenes[sceneId],
        CONTENT_REGISTRY
      )
        .map((c) => c.id)
        .filter((id) => id !== backId);
      expect(act2Ids.length).toBeGreaterThan(0);
      expect(act3Ids.length).toBeGreaterThan(0);
      expect(act4Ids.length).toBeGreaterThan(0);
      expect(act2Ids.some((id) => act3Ids.includes(id))).toBe(false);
      expect(act3Ids.some((id) => act4Ids.includes(id))).toBe(false);
      expect(act2Ids.some((id) => act4Ids.includes(id))).toBe(false);
    }

    // 8. 境界压制与灭口后果：无死手无越阶战力拿孤本要挟金丹大管事 -> 惨遭灭口【怀璧灭口】；有保命符则重伤折寿逃遁；布死手或高越阶则谈判成功
    const weakCoerce: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_early',
      might: 50,
      mind: 50,
      tags: ['origin_herbalist'],
      relics: [],
      flags: {},
      companions: {
        ...base.companions,
        cang_ming: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
        xie_wujiu: { met: true, affection: 10, stance: 'stranger', stage: 2, chronicle: [] },
      },
      currentSceneId: 'act3_arc_chamber_2',
    };
    expect(evaluateCoercion(weakCoerce, 'act3_tianji_goldcore').canSucceed).toBe(false);
    expect(evaluateCoercion(weakCoerce, 'act3_tianji_goldcore').canSurviveFail).toBe(false);
    const silencedRes = playStep(weakCoerce, 'chamber2_seize_ledger_deal').afterCommit;
    expect(silencedRes.endingId).toBe('ending_silenced');

    const lifesaverCoerce: GameState = {
      ...weakCoerce,
      tags: ['origin_herbalist', 'old_daoist_talisman'],
    };
    const escapedRes = playStep(lifesaverCoerce, 'chamber2_seize_ledger_deal').afterCommit;
    expect(escapedRes.endingId).toBeUndefined();
    expect(escapedRes.flags.escaped_silencing_act3_chamber).toBe(true);
    expect(escapedRes.lifespanYears).toBeLessThan(lifesaverCoerce.lifespanYears);

    const switchCoerce: GameState = {
      ...weakCoerce,
      flags: { act3_chamber_deadman_switch: true },
    };
    expect(evaluateCoercion(switchCoerce, 'act3_tianji_goldcore').canSucceed).toBe(true);
    expect(getOvermatchProfile(switchCoerce).deadmanSwitches.length).toBeGreaterThanOrEqual(1);
    const coercedOk = playStep(switchCoerce, 'chamber2_seize_ledger_deal').afterCommit;
    expect(coercedOk.endingId).toBeUndefined();
    expect(coercedOk.relics).toContain('golden_core_elixir');

    // 9. 破境流派门槛：正道高正气不可走魔煞血丹捷径，无商道/阵盘不可白走聚灵大阵，铸就不同道基品阶
    const pureOrthodoxGate = getResolvedChoices(
      {
        ...base,
        act: 'act2',
        alignment: { righteous: 40, worldly: 0 },
        mind: 35,
        tags: ['origin_herbalist'],
        relics: ['blood_foundation_pill'],
      },
      CONTENT_REGISTRY.scenes.act2_foundation_gate,
      CONTENT_REGISTRY
    );
    expect(pureOrthodoxGate.some((c) => c.id === 'found_blood_pill')).toBe(false);
    expect(pureOrthodoxGate.some((c) => c.id === 'found_array_or_stones')).toBe(false);
  });

  it('Cycle 19 专项回归：九州世局、六方势力动态立场、六卷行迹脉络与跨卷前尘余波简报', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. 卷二行迹脉络：未破境前精确显示解锁差额与 2 席核心大势状态；满足条件后转为关口已启
    const act2Early = getActProgressSnapshot({
      ...base,
      act: 'act2',
      actBeat: 1,
      might: 22,
      actMajorArcs: { act2: ['thread_sword_trial'] },
    });
    expect(act2Early.breakthroughUnlocked).toBe(false);
    expect(act2Early.majorSlotsUsed).toBe(1);
    expect(act2Early.majorSlotsRemaining).toBe(1);
    expect(act2Early.majorArcs.find((a) => a.threadId === 'thread_sword_trial')?.status).toBe(
      'in_progress'
    );

    const act2Ready = getActProgressSnapshot({
      ...base,
      act: 'act2',
      actBeat: 3,
      might: 42,
      completedThreads: ['thread_sword_trial', 'thread_blood_pill'],
      actMajorArcs: { act2: ['thread_sword_trial', 'thread_blood_pill'] },
      flags: { missed_thread_qingzhou_plague: true },
    });
    expect(act2Ready.breakthroughUnlocked).toBe(true);
    expect(act2Ready.majorSlotsRemaining).toBe(0);
    expect(act2Ready.majorArcs.find((a) => a.threadId === 'thread_qingzhou_plague')?.status).toBe(
      'missed'
    );

    // 2. 九州灵脉随六幕递减至不足半成
    const c1 = getWorldClimateSnapshot({ ...base, act: 'act1' });
    const c3 = getWorldClimateSnapshot({ ...base, act: 'act3' });
    const c5 = getWorldClimateSnapshot({ ...base, act: 'act5' });
    const c6 = getWorldClimateSnapshot({ ...base, act: 'act6' });
    expect(c1.veinPercent).toBeGreaterThan(c3.veinPercent);
    expect(c3.veinPercent).toBeGreaterThan(c5.veinPercent);
    expect(c5.veinPercent).toBeGreaterThan(c6.veinPercent);
    expect(c6.crisisTone).toBe('critical');

    // 3. 六方势力实时映射玩家因果（叛宗、公盟、天机崩盘、斩天同盟、红尘守灯）
    const lateFactions = getFactionStandings({
      ...base,
      act: 'act5',
      tags: ['sect_rebel', 'sky_slayer_ally', 'mortal_keeper'],
      flags: {
        act4_chamber_collapsed: true,
        xie_new_order_founded: true,
        su_zhiwei_passed: true,
      },
      companions: {
        ...base.companions,
        su_zhiwei: { ...base.companions.su_zhiwei, met: true, deceased: true },
      },
    });
    expect(lateFactions).toHaveLength(6);
    expect(lateFactions.find((f) => f.id === 'qingyun')?.standingLabel).toBe('叛宗通缉');
    expect(lateFactions.find((f) => f.id === 'alliance')?.standingLabel).toBe('仙盟逆党');
    expect(lateFactions.find((f) => f.id === 'tianji')?.standingLabel).toBe('总号崩灭');
    expect(lateFactions.find((f) => f.id === 'baibao')?.standingLabel).toBe('公盟共主');
    expect(lateFactions.find((f) => f.id === 'zhantian')?.standingLabel).toBe('斩天同盟');
    expect(lateFactions.find((f) => f.id === 'mortal_realm')?.standingLabel).toBe('红尘守灯人');

    // 4. 九州疆域志与六境长生阶梯正确高亮当前所处与下一大关
    const regionsAct4 = getWorldRegions({ ...base, act: 'act4' });
    expect(regionsAct4.filter((r) => r.status === 'current').length).toBeGreaterThanOrEqual(1);
    const ladderCore = getRealmLadder({ ...base, realm: 'golden_core' }, CONTENT_REGISTRY);
    expect(ladderCore.find((t) => t.id === 'golden_core')?.status).toBe('current');
    expect(ladderCore.find((t) => t.id === 'nascent_soul')?.status).toBe('next');

    // 5. 跨卷开篇「前尘余波」简报仅在开篇场景出现，并准确汇总上卷抉择与错过后果
    expect(getActTransitionEcho(base, 'act2_hub', CONTENT_REGISTRY)).toBeNull();
    const act3Echo = getActTransitionEcho(
      {
        ...base,
        act: 'act3',
        flags: {
          foundation_grade: 'sword_ancient',
          su_zhiwei_saved_longlife: true,
          missed_thread_blood_pill: true,
        },
      },
      'act3_opening',
      CONTENT_REGISTRY
    );
    expect(act3Echo).not.toBeNull();
    expect(act3Echo?.bullets.join('\n')).toContain('太古剑基');
    expect(act3Echo?.bullets.join('\n')).toContain('九转延寿露');
    expect(act3Echo?.bullets.join('\n')).toContain('青岚血丹局');
  });

  it('Cycle 20 专项回归：防剧透迷雾、雅阁阶段门禁、前尘余波修复、负寿提示、死手校对、道侣决裂清理与 A/B/D 文风定稿', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 首回合零剧透（天机勘验、六方势力、疆域志、六境阶梯均不提前泄露中后期谜底）
    const invAct1 = getInvestigationProgress(base, CONTENT_REGISTRY);
    const invAct1Text = invAct1.stages.map((s) => `${s.title} ${s.desc}`).join('\n');
    expect(invAct1Text).not.toContain('牧灵骗局');
    expect(invAct1Text).not.toContain('收割大期');
    expect(invAct1Text).not.toContain('天门九枢');
    expect(invAct1Text).not.toContain('灵根牧种');

    const facAct1Text = getFactionStandings(base)
      .map((f) => `${f.name} ${f.category} ${f.region} ${f.powerStatus} ${f.summary}`)
      .join('\n');
    expect(facAct1Text).not.toContain('兄长失踪');
    expect(facAct1Text).not.toContain('转运井');
    expect(facAct1Text).not.toContain('槐阴');

    const regAct1Text = getWorldRegions(base)
      .map((r) => `${r.name} ${r.desc}`)
      .join('\n');
    expect(regAct1Text).not.toContain('九剑尊血战');
    expect(regAct1Text).not.toContain('伪天门');
    expect(regAct1Text).not.toContain('斩天四代');

    const ladderAct1Text = getRealmLadder(base, CONTENT_REGISTRY)
      .map((t) => t.desc)
      .join('\n');
    expect(ladderAct1Text).not.toContain('伪天门');

    // 2. P0-2: 仙缘雅阁卷一/卷六门禁 + 未重塑苍溟残魂严禁实体醉酒抱臂
    const act1HighAff: GameState = {
      ...base,
      act: 'act1',
      companions: {
        ...base.companions,
        cang_ming: {
          met: true,
          affection: 80,
          stance: 'bonded',
          stage: 2,
          chronicle: [],
          bondType: 'dao_partner',
          milestoneStage: 1,
        },
      },
      daoPartnerId: 'cang_ming',
    };
    expect(canTriggerMilestone1(act1HighAff, 'cang_ming')).toBe(false);
    expect(canCommitBond(act1HighAff, 'cang_ming', 'dao_partner').ok).toBe(false);

    const ghostCmAct2: GameState = { ...act1HighAff, act: 'act2' };
    const ghostLecture = performSanctuaryActivity(ghostCmAct2, 'cang_ming', 'cm_sword_lecture');
    expect(ghostLecture.ok).toBe(true);
    expect(ghostLecture.paragraphs.join('\n')).toContain('焦黑断玉');
    expect(ghostLecture.paragraphs.join('\n')).not.toContain('抱臂冷哼');
    expect(ghostLecture.paragraphs.join('\n')).not.toContain('搬砖');

    const ghostRes = performSanctuaryActivity(ghostCmAct2, 'cang_ming', 'cm_ancient_resonance');
    expect(ghostRes.ok).toBe(true);
    expect(ghostRes.paragraphs.join('\n')).toContain('焦黑断玉');
    expect(ghostRes.paragraphs.join('\n')).not.toContain('两坛烈酒');

    const act6Sanct: GameState = { ...ghostCmAct2, act: 'act6' };
    expect(getSanctuaryActivities(act6Sanct, 'cang_ming')).toHaveLength(0);
    expect(performSanctuaryActivity(act6Sanct, 'cang_ming', 'cm_sword_lecture').ok).toBe(false);

    // 3. P0-3 & P0-4: 卷二开篇前尘余波生效 + 卷三开篇不再误写「二十载」
    const act2Echo = getActTransitionEcho(
      { ...base, act: 'act2', tags: [...base.tags, 'qingyun_outer'] },
      'act2_opening_qingyun',
      CONTENT_REGISTRY
    );
    expect(act2Echo).not.toBeNull();
    expect(act2Echo?.bullets.join('\n')).toContain('青云剑宗');

    const act3EchoFixed = getActTransitionEcho(
      {
        ...base,
        act: 'act3',
        ageMonths: 26 * 12,
        flags: { su_zhiwei_saved_longlife: true },
      },
      'act3_opening',
      CONTENT_REGISTRY
    );
    expect(act3EchoFixed?.actBanner).toBe('卷三启幕 · 筑基前尘余波');
    expect(act3EchoFixed?.bullets.join('\n')).not.toContain('二十载');

    // 4. P0-5 & P0-6: 卷四商战决策前不提前宣告天机垮台 + 保留用户选定的「我自替你守之」史传名句 + 旧词清零
    const war2Intro = resolveParagraphs(CONTENT_REGISTRY.scenes.act4_arc_world_war_2.paragraphs, {
      ...base,
      act: 'act4',
      flags: { act4_war_intel: 'xie' },
    }).join('\n');
    expect(war2Intro).not.toContain('金融霸权在一夜之间彻底土崩瓦解');

    const war2CoupStep = playStep(
      {
        ...base,
        act: 'act4',
        currentSceneId: 'act4_arc_world_war_2',
        companions: {
          ...base.companions,
          xie_wujiu: { met: true, affection: 65, stance: 'confidant', stage: 3, chronicle: [] },
        },
      },
      'war2_back_xie_coup'
    );
    expect(war2CoupStep.afterChoice.pendingTransition?.paragraphs.join('\n')).toContain('我自替你守之');
    expect(CONTENT_REGISTRY.tags.tianji_nemesis.desc).not.toContain('抽灵支阵');

    // 5. P0-8: 道侣决裂或断玉永封后自动清空 daoPartnerId 与 bondType
    const partnerBroken = applyEffect(
      {
        ...base,
        act: 'act4',
        daoPartnerId: 'shen_qingshuang',
        companions: {
          ...base.companions,
          shen_qingshuang: {
            met: true,
            affection: 90,
            stance: 'bonded',
            bondType: 'dao_partner',
            stage: 4,
            chronicle: [],
          },
        },
      },
      { companionUpdates: { shen_qingshuang: { setStance: 'estranged' } } },
      CONTENT_REGISTRY
    ).state;
    expect(partnerBroken.daoPartnerId).toBeUndefined();
    expect(partnerBroken.companions.shen_qingshuang.bondType).toBe('none');
    expect(isActiveDaoPartner(partnerBroken, 'shen_qingshuang')).toBe(false);

    const sealedPartner = applyEffect(
      {
        ...base,
        act: 'act4',
        daoPartnerId: 'cang_ming',
        companions: {
          ...base.companions,
          cang_ming: {
            met: true,
            affection: 90,
            stance: 'bonded',
            bondType: 'dao_partner',
            stage: 4,
            chronicle: [],
          },
        },
      },
      { setFlags: { act4_cangming_sealed: true } },
      CONTENT_REGISTRY
    ).state;
    expect(sealedPartner.daoPartnerId).toBeUndefined();
    expect(sealedPartner.companions.cang_ming.bondType).toBe('none');

    // 6. P0-9: 负寿元提示不再写成「寿元增延 -8 载」，且买通命牌堂杂役不再白送死手威慑
    const negLife = applyEffect(base, { lifespanBonus: -8 }, CONTENT_REGISTRY).state;
    expect(negLife.recentNotices.join('\n')).toContain('寿元折损 8 载');
    expect(negLife.recentNotices.join('\n')).not.toContain('寿元增延 -8');
    expect(
      getOvermatchProfile({ ...base, flags: { sword_bribed_guard: true } }).deadmanSwitches
    ).toHaveLength(0);

    // 7. P0-10 & P1-7: 跨卷未完主线自动标记 missed 且卷二奇遇绝不复活已错过大势
    const afterActJump = applyEffect(
      {
        ...base,
        act: 'act2',
        activeThreads: ['thread_sword_trial', 'thread_ancient_vein'],
        completedThreads: ['thread_sword_trial'],
      },
      { setAct: 'act3' },
      CONTENT_REGISTRY
    ).state;
    expect(afterActJump.flags.missed_thread_ancient_vein).toBe(true);
    expect(afterActJump.activeThreads).not.toContain('thread_ancient_vein');

    const omenAfterMiss = playStep(
      {
        ...base,
        act: 'act2',
        tags: [...base.tags, 'spirit_eyes'],
        flags: { missed_thread_ancient_vein: true },
        currentSceneId: 'rand_act2_sky_omen',
      },
      'r2_omen_eye'
    ).afterCommit;
    expect(omenAfterMiss.activeThreads).not.toContain('thread_ancient_vein');

    // 8. P0-11 & P0-12: 玩家叛宗不连坐误标沈清霜叛宗；敌对苍溟在古战场不显示指路选项
    const rebelPlayerOnly: GameState = {
      ...base,
      act: 'act4',
      tags: [...base.tags, 'sect_rebel'],
      flags: {},
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 40, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    const shenTitle =
      typeof CONTENT_REGISTRY.companions.shen_qingshuang.title === 'function'
        ? CONTENT_REGISTRY.companions.shen_qingshuang.title(rebelPlayerOnly)
        : CONTENT_REGISTRY.companions.shen_qingshuang.title;
    expect(shenTitle).toBe('青云剑宗内门首座');

    const hostileCmSoul = getResolvedChoices(
      {
        ...base,
        act: 'act3',
        currentSceneId: 'act3_arc_soul_1',
        companions: {
          ...base.companions,
          cang_ming: { met: true, affection: -35, stance: 'rival', stage: 2, chronicle: [] },
        },
      },
      CONTENT_REGISTRY.scenes.act3_arc_soul_1,
      CONTENT_REGISTRY
    );
    expect(hostileCmSoul.some((c) => c.id === 'soul1_follow_cangming')).toBe(false);

    // 9. P2: 闭关模式不泄露原始数字阈值
    const blindAct2 = getActProgressSnapshot({ ...base, act: 'act2', actBeat: 1, might: 22 }, false);
    expect(blindAct2.breakthroughProgressText).not.toContain('1/3');
    expect(blindAct2.breakthroughProgressText).not.toContain('当前 22');
  });

  it('Cycle 21 专项回归：盲玩实测发现的 P0/P1 全闭环（凡人道侣不并肩天门、转运井线索零幻觉、无灵新世重逢尾声、雅阁高卷与鸿书、地脉越阶计分与防抢跑剧透）', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. P0-1: 健在凡人道侣苏知微在卷五/卷六「前尘余波」绝不写成“并肩迎向天门”
    const suPartnerAct6: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      ageMonths: 88 * 12,
      daoPartnerId: 'su_zhiwei',
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 120,
          stance: 'bonded',
          bondType: 'dao_partner',
          stage: 4,
          chronicle: [],
        },
      },
    };
    const act6Echo = getActTransitionEcho(suPartnerAct6, 'act6_sky_gate', CONTENT_REGISTRY);
    expect(act6Echo?.bullets.join('\n')).toContain('青州道侣【苏知微】');
    expect(act6Echo?.bullets.join('\n')).not.toContain('并肩迎向天门');

    // 2. P0-2: 卷三总账堂仅比对玩家真实拿过的血丹/古脉物证，绝不幻觉未走古脉的落尘玉屑
    const bloodOnlyChamber = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act3_arc_chamber_2.paragraphs,
      { ...base, act: 'act3', truthClues: ['clue_blood_pill_dust'] }
    ).join('\n');
    expect(bloodOnlyChamber).toContain('青岚血丹丹核里的灰白微尘');
    expect(bloodOnlyChamber).not.toContain('青州地底逆阵剥落的落尘玉屑');

    // 3. P0-3: 【无灵新世】为结发道侣苏知微补写竹篱白发重逢，并为生死挚交谢无咎补写携茶叙旧
    const mortalPartnerEp = CONTENT_REGISTRY.endings.ending_mortal_new_era
      .epilogue({
        ...suPartnerAct6,
        companions: {
          ...suPartnerAct6.companions,
          xie_wujiu: {
            met: true,
            affection: 95,
            stance: 'bonded',
            bondType: 'sworn',
            stage: 4,
            chronicle: [],
          },
        },
      })
      .join('\n');
    expect(mortalPartnerEp).toContain('你可算能陪我一起慢慢老了');
    expect(mortalPartnerEp).toContain('青州竹舍蹭两碗桂花酒');

    // 4. P1-4: 雅阁高卷正文独立、卷四/五苏知微改为千里驿札不瞬移、四人挚交各有专属誓词、谢 M1 后主线不重报“首次吐露”
    const xieHighAct = performSanctuaryActivity(
      {
        ...base,
        act: 'act4',
        companions: {
          ...base.companions,
          xie_wujiu: { met: true, affection: 60, stance: 'confidant', stage: 3, chronicle: [] },
        },
      },
      'xie_wujiu',
      'xie_chess_ledger'
    );
    expect(xieHighAct.title).toBe('暗楼推演 · 九州商局');
    expect(xieHighAct.paragraphs.join('\n')).toContain('七十二城');

    const suRemoteAct = performSanctuaryActivity(
      {
        ...base,
        act: 'act4',
        flags: { su_zhiwei_saved_longlife: true },
        ageMonths: 55 * 12,
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: 60, stance: 'confidant', stage: 3, chronicle: [] },
        },
      },
      'su_zhiwei',
      'su_brew_tea'
    );
    expect(suRemoteAct.title).toBe('青州驿札 · 隔空校典');
    expect(suRemoteAct.paragraphs.join('\n')).toContain('驿马');

    const xieSwornRes = commitCompanionBond(
      {
        ...base,
        act: 'act3',
        companions: {
          ...base.companions,
          xie_wujiu: {
            met: true,
            affection: 80,
            stance: 'confidant',
            milestoneStage: 1,
            stage: 3,
            chronicle: [],
          },
        },
      },
      'xie_wujiu',
      'sworn'
    );
    expect(xieSwornRes.title).toBe('暗楼铁誓 · 肝胆同契');
    expect(xieSwornRes.paragraphs.join('\n')).toContain('玄铁算珠');

    const xieBloodAfterM1 = playStep(
      {
        ...base,
        act: 'act2',
        currentSceneId: 'act2_arc_blood_1',
        companions: {
          ...base.companions,
          xie_wujiu: {
            met: true,
            affection: 40,
            stance: 'confidant',
            milestoneStage: 1,
            stage: 1,
            chronicle: [],
          },
        },
      },
      'blood1_partner_xie'
    ).afterCommit;
    expect(xieBloodAfterM1.companions.xie_wujiu.chronicle.join('\n')).not.toContain('首次对你吐露');

    // 5. P1-5: 越阶底蕴正确计入地脉道基/地脉金丹/残缺锁天印/九州灵脉契
    const veinProfile = getOvermatchProfile({
      ...base,
      act: 'act4',
      realm: 'golden_core',
      flags: { foundation_grade: 'merchant_vein', core_grade: 'vein_core' },
      relics: ['broken_sky_seal', 'spirit_vein_deed'],
    });
    expect(veinProfile.crossRealmPower).toBeGreaterThanOrEqual(58);
    expect(veinProfile.powerSources).toContain('地脉阵道道基');
    expect(veinProfile.powerSources).toContain('九州地脉金丹');
    expect(veinProfile.powerSources).toContain('残缺锁天印');

    // 6. P1-6: 卷一苏知微/未遇苍溟小传零抢跑剧透、卷三 0/3 阶段三勘验不露「牧灵骗局」、假丹选项不露「买个教训」
    const suBioAct1 =
      typeof CONTENT_REGISTRY.companions.su_zhiwei.bio === 'function'
        ? CONTENT_REGISTRY.companions.su_zhiwei.bio(base)
        : CONTENT_REGISTRY.companions.su_zhiwei.bio;
    expect(suBioAct1).not.toContain('白发却爬上了她眉梢');

    const cmBioUnmet =
      typeof CONTENT_REGISTRY.companions.cang_ming.bio === 'function'
        ? CONTENT_REGISTRY.companions.cang_ming.bio(base)
        : CONTENT_REGISTRY.companions.cang_ming.bio;
    expect(cmBioUnmet).not.toContain('长明大劫');

    const invAct3ZeroStage3 = getInvestigationProgress(
      {
        ...base,
        act: 'act3',
        truthClues: ['clue_blood_pill_dust', 'clue_mortal_blindspot', 'clue_vein_drain'],
      },
      CONTENT_REGISTRY
    );
    expect(invAct3ZeroStage3.stages.find((s) => s.stage === 'testimony')?.desc).not.toContain(
      '牧灵骗局'
    );

    const fakePillChoice = CONTENT_REGISTRY.scenes.rand_act1_fake_pill.choices.find(
      (c) => c.id === 'r1_pill_buy_gamble'
    );
    const fakePillTags = Array.isArray(fakePillChoice?.insightTags) ? fakePillChoice.insightTags : [];
    expect(fakePillTags).not.toContain('买个教训');
  });

  it('Cycle 22 专项回归：全量出戏文本净化、错别字修复、时空流畅度与名句保留', () => {
    // 1. 递归扫描 CONTENT_REGISTRY 全部文本与函数体，确保 S/A 级出戏热词与错别字清零
    const forbiddenTerms = [
      '不讲武德',
      '怂货',
      '算盘精',
      '辩经',
      '金字塔尖',
      '平仓放药',
      '撤单止损',
      '双剑合壁',
      '出手果绝',
      '拜把子要斩鸡头',
      '平辈兄弟',
      '算你小子懂孝敬',
      '从天庭嘴里',
      '真元微操',
      '先富起来',
      '金丹大忙人',
      '倒计时',
      '证伪',
      '证据链',
      '折现',
      '实打实',
      '零耗时',
      '低吸高抛',
      '八五折',
      '灵石本位崩盘',
      '退婚庚帖宿缘回收',
      '荒庙旧符伏笔回收',
    ];

    const visited = new Set<unknown>();
    const corpusChunks: string[] = [];
    const collectText = (node: unknown) => {
      if (node == null) return;
      if (typeof node === 'string') {
        corpusChunks.push(node);
        return;
      }
      if (typeof node === 'function') {
        const cleaned = node
          .toString()
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '');
        corpusChunks.push(cleaned);
        return;
      }
      if (typeof node === 'object') {
        if (visited.has(node)) return;
        visited.add(node);
        if (Array.isArray(node)) {
          for (const item of node) collectText(item);
        } else {
          for (const val of Object.values(node as Record<string, unknown>)) {
            collectText(val);
          }
        }
      }
    };
    collectText(CONTENT_REGISTRY);
    const fullCorpus = corpusChunks.join('\n');
    for (const term of forbiddenTerms) {
      expect(fullCorpus, `正文注册表中不应再出现出戏词或错别字「${term}」`).not.toContain(term);
    }

    // 2. 卷三黑柏孤岛重复养魂木不再出现对话中途瞬移黑市折现
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const soulDup = playStep(
      {
        ...base,
        act: 'act3',
        realm: 'foundation_mid',
        relics: ['soul_nourishing_wood', 'charred_jade_relic'],
        currentSceneId: 'act3_arc_soul_2',
        companions: {
          ...base.companions,
          cang_ming: { met: true, affection: 20, stance: 'stranger', stage: 2, chronicle: [] },
        },
      },
      'soul2_seize_wood_for_self'
    );
    const soulText = (soulDup.afterChoice.pendingTransition?.paragraphs ?? []).join('\n');
    expect(soulText).not.toContain('折现');
    expect(soulText.indexOf('归谁用，由我说了算')).toBeGreaterThan(-1);
    expect(soulText.indexOf('暗兑了三百二十灵石')).toBeGreaterThan(
      soulText.indexOf('归谁用，由我说了算')
    );

    // 3. 卷二飞升崖重复筑基丹拆分为独立收尾段，不打断崖畔决裂情绪
    const swordDup = playStep(
      {
        ...base,
        act: 'act2',
        relics: ['foundation_pill'],
        currentSceneId: 'act2_arc_sword_2',
      },
      'sword2_betray_for_pill'
    );
    const swordParas = swordDup.afterChoice.pendingTransition?.paragraphs ?? [];
    expect(swordParas.length).toBeGreaterThanOrEqual(3);
    expect(swordParas[1]).not.toContain('一百八十灵石');
    expect(swordParas[2]).toContain('易得一百八十灵石');

    // 4. 保留用户定稿的文言高潮名句「人间这一卷公账，我自替你守之」
    const warVictory = playStep(
      {
        ...base,
        act: 'act4',
        realm: 'golden_core',
        currentSceneId: 'act4_arc_world_war_2',
        flags: { act4_war_intel: 'xie' },
        companions: {
          ...base.companions,
          xie_wujiu: { met: true, affection: 65, stance: 'confidant', stage: 3, chronicle: [] },
        },
      },
      'war2_back_xie_coup'
    );
    expect((warVictory.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).toContain(
      '人间这一卷公账，我自替你守之'
    );

    // 5. 仙缘雅阁净化验证：苏知微/苍溟结义去现代词且男女称谓通用、沈清霜「双剑合璧」无错字
    const suSworn = commitCompanionBond(
      {
        ...base,
        act: 'act2',
        companions: {
          ...base.companions,
          su_zhiwei: {
            met: true,
            affection: 82,
            stance: 'confidant',
            milestoneStage: 1,
            stage: 2,
            chronicle: [],
          },
        },
      },
      'su_zhiwei',
      'sworn'
    );
    const suSwornText = suSworn.paragraphs.join('\n');
    expect(suSwornText).toContain('结金兰要设香案、歃血为盟');
    expect(suSwornText).not.toContain('拜把子');

    const cmSworn = commitCompanionBond(
      {
        ...base,
        act: 'act4',
        tags: ['cangming_reborn'],
        companions: {
          ...base.companions,
          cang_ming: {
            met: true,
            affection: 82,
            stance: 'confidant',
            milestoneStage: 1,
            stage: 4,
            chronicle: [],
          },
        },
      },
      'cang_ming',
      'sworn'
    );
    const cmSwornText = cmSworn.paragraphs.join('\n');
    expect(cmSwornText).toContain('平辈剑友');
    expect(cmSwornText).not.toContain('平辈兄弟');

    const shenSwornState: GameState = {
      ...base,
      act: 'act3',
      companions: {
        ...base.companions,
        shen_qingshuang: {
          met: true,
          affection: 85,
          stance: 'bonded',
          milestoneStage: 2,
          bondType: 'sworn',
          stage: 4,
          chronicle: [],
        },
      },
    };
    const shenActs = getSanctuaryActivities(shenSwornState, 'shen_qingshuang');
    expect(shenActs.some((a) => a.label.includes('双剑合璧'))).toBe(true);
    expect(shenActs.some((a) => a.label.includes('双剑合壁'))).toBe(false);
    const shenDualRes = performSanctuaryActivity(
      shenSwornState,
      'shen_qingshuang',
      'shen_dual_cultivate'
    );
    expect(shenDualRes.title).toContain('双剑合璧');
    expect(shenDualRes.title).not.toContain('双剑合壁');

    // 6. 世局灵脉全六卷改用中文成数，不再混用阿拉伯百分号
    for (const act of ['act1', 'act2', 'act3', 'act4', 'act5', 'act6'] as const) {
      const climate = getWorldClimateSnapshot({ ...base, act });
      expect(climate.veinLabel).not.toContain('%');
      expect(climate.skyStatus).not.toContain('倒计时');
    }
    expect(getWorldClimateSnapshot({ ...base, act: 'act2' }).veinLabel).toContain('约余四成半');
    expect(getWorldClimateSnapshot({ ...base, act: 'act4' }).veinLabel).toContain('尚余不足二成');
  });

  it('Cycle 23 专项回归：Phase 1+2 双模型终审七大世界观与状态机不变量防线', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1) 苏知微 36 岁（未服露、无沉疴及已稳住两态）入卷四不被判死，沉疴态逾 32 岁判死；
    //    服露线 75<=age<=95 跳过槐阴跨入卷五后自动结算辞世，绝不瞬移回杏林
    const extraFlagCases: Array<Record<string, boolean>> = [{}, { su_zhiwei_stabilized: true }];
    for (const extraFlags of extraFlagCases) {
      const su36Act4: GameState = {
        ...base,
        act: 'act4',
        realm: 'golden_core',
        ageMonths: 36 * 12,
        year: 2996 + 36,
        flags: { ...base.flags, ...extraFlags },
        companions: {
          ...base.companions,
          su_zhiwei: { met: true, affection: 55, stance: 'confidant', stage: 3, chronicle: [] },
        },
        currentSceneId: 'act4_arc_mortal_truth',
      };
      expect(isCompanionDeceased(su36Act4, 'su_zhiwei')).toBe(false);
      expect(isSuZhiweiAlive(su36Act4)).toBe(true);
      expect(
        getResolvedChoices(su36Act4, CONTENT_REGISTRY.scenes.act4_companion_visit, CONTENT_REGISTRY)
          .some((c) => c.id === 'hub4_visit_su')
      ).toBe(true);
      const su36MortalChoices = getResolvedChoices(
        su36Act4,
        CONTENT_REGISTRY.scenes.act4_arc_mortal_truth,
        CONTENT_REGISTRY
      );
      expect(su36MortalChoices.some((c) => c.id === 'mortal_su_warm_promise')).toBe(true);
      const su36MortalParas = resolveParagraphs(
        CONTENT_REGISTRY.scenes.act4_arc_mortal_truth.paragraphs,
        su36MortalChoices.length ? su36Act4 : su36Act4
      ).join('\n');
      expect(su36MortalParas).not.toContain('晚年安然寿终');
    }

    const su36Fading: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      ageMonths: 36 * 12,
      year: 2996 + 36,
      flags: { ...base.flags, su_zhiwei_fading: true },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 55, stance: 'confidant', stage: 2, chronicle: [] },
      },
    };
    expect(isCompanionDeceased(su36Fading, 'su_zhiwei')).toBe(true);

    const suSkipHuaiyinPre: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      lifespanYears: 500,
      ageMonths: 76 * 12,
      year: 2996 + 76,
      spiritStones: 800,
      tags: [...base.tags, 'merchant_fame'],
      daoPartnerId: 'su_zhiwei',
      flags: { ...base.flags, su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 90,
          stance: 'bonded',
          bondType: 'dao_partner',
          milestoneStage: 2,
          stage: 4,
          chronicle: [],
        },
      },
      currentSceneId: 'act4_nascent_gate',
    };
    const enteredAct5 = playStep(suSkipHuaiyinPre, 'nascent_wealth_array').afterCommit;
    expect(enteredAct5.act).toBe('act5');
    expect(getAgeYears(enteredAct5.ageMonths)).toBeGreaterThanOrEqual(75);
    expect(getAgeYears(enteredAct5.ageMonths)).toBeLessThanOrEqual(95);
    expect(enteredAct5.flags.su_zhiwei_passed).toBe(true);
    expect(enteredAct5.companions.su_zhiwei.deceased).toBe(true);
    expect(isCompanionDeceased(enteredAct5, 'su_zhiwei')).toBe(true);
    const act5OpenEcho = getActTransitionEcho(enteredAct5, 'act5_opening', CONTENT_REGISTRY);
    expect(act5OpenEcho?.bullets.join('\n')).toContain('故去道侣【苏知微】');
    expect(act5OpenEcho?.bullets.join('\n')).not.toContain('仍守青州药庐一灯');
    const act5OpenParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_opening.paragraphs,
      enteredAct5
    ).join('\n');
    expect(act5OpenParas).toContain('槐阴古碑旁的药庐安然辞世');
    const inAct5Hub = playStep(enteredAct5, 'act5_open_sword_resolve').afterCommit;
    const parleyDeadRes = playStep(
      { ...inAct5Hub, currentSceneId: 'act5_companion_parley' },
      'parley_su'
    );
    expect((parleyDeadRes.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).toContain('阿芸');

    // 2) 沈清霜 shen_saved_from_sect: true 离宗闭环 & 背叛+缺席卷三线破囚孤身截击（零剑阁执事）
    const shenSavedAct4: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      flags: { shen_saved_from_sect: true },
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 70, stance: 'confidant', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act4_arc_zhantian_2',
    };
    const shenDef = CONTENT_REGISTRY.companions.shen_qingshuang;
    const shenSavedTitle =
      typeof shenDef.title === 'function' ? shenDef.title(shenSavedAct4) : shenDef.title;
    expect(shenSavedTitle).not.toContain('内门首座');
    const zt2SavedParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_arc_zhantian_2.paragraphs,
      shenSavedAct4
    ).join('\n');
    expect(zt2SavedParas).toContain('早已斩碎旧牌叛离青云');
    expect(zt2SavedParas).not.toContain('解下腰间青云首座玉牌');
    const act5SavedParas = resolveParagraphs(CONTENT_REGISTRY.scenes.act5_opening.paragraphs, {
      ...shenSavedAct4,
      act: 'act5',
      realm: 'nascent_soul',
    }).join('\n');
    expect(act5SavedParas).toContain('霜梅暗印剑札');

    const shenBetrayedMissedAct3: GameState = {
      ...base,
      act: 'act4',
      realm: 'golden_core',
      flags: { betrayed_shen_at_stele: true, missed_thread_act3_sect: true },
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: -60, stance: 'estranged', stage: 3, chronicle: [] },
      },
      currentSceneId: 'act4_arc_zhantian_1',
    };
    const zt1PrisonBreakParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act4_arc_zhantian_1.paragraphs,
      shenBetrayedMissedAct3
    ).join('\n');
    expect(zt1PrisonBreakParas).toContain('破囚叛逃');
    expect(zt1PrisonBreakParas).not.toContain('两名剑阁金丹执事');
    expect(zt1PrisonBreakParas).not.toContain('随我回山');
    const zt1ClashStep = playStep(shenBetrayedMissedAct3, 'zt1_clash_shen');
    expect((zt1ClashStep.afterChoice.pendingTransition?.paragraphs ?? []).join('\n')).not.toContain(
      '两名青云执事'
    );

    // 3) 卷二/三/四 slow_grind 均受 maxUsesInAct: 1 限制，绝不可无限刷年击穿长明历
    const grindSpecs: Array<{
      act: 'act2' | 'act3' | 'act4';
      realm: GameState['realm'];
      lifespanYears: number;
      sceneId: string;
      choiceId: string;
    }> = [
      {
        act: 'act2',
        realm: 'qi_peak',
        lifespanYears: 130,
        sceneId: 'act2_foundation_gate',
        choiceId: 'found_slow_grind',
      },
      {
        act: 'act3',
        realm: 'foundation_late',
        lifespanYears: 260,
        sceneId: 'act3_golden_core_gate',
        choiceId: 'core_slow_grind',
      },
      {
        act: 'act4',
        realm: 'golden_core',
        lifespanYears: 500,
        sceneId: 'act4_nascent_gate',
        choiceId: 'nascent_slow_grind',
      },
    ];
    for (const sp of grindSpecs) {
      const s0: GameState = {
        ...base,
        act: sp.act,
        realm: sp.realm,
        lifespanYears: sp.lifespanYears,
        ageMonths: 25 * 12,
        year: 2996 + 25,
        currentSceneId: sp.sceneId,
      };
      const s1 = playStep(s0, sp.choiceId).afterCommit;
      expect(s1.currentSceneId).toBe(`${sp.act}_hub`);
      const backAtGate: GameState = { ...s1, currentSceneId: sp.sceneId };
      const secondTry = getResolvedChoices(
        backAtGate,
        CONTENT_REGISTRY.scenes[sp.sceneId],
        CONTENT_REGISTRY
      ).find((c) => c.id === sp.choiceId);
      expect(secondTry?.locked).toBe(true);
      expect(() => advanceChoice(backAtGate, sp.choiceId, CONTENT_REGISTRY)).toThrow(/locked/);
    }

    // 4) 消耗【九转延寿露】（救苏知微或大限自用）后，卷二/三/四坊市均不再刷出第二瓶
    const usedFlagCases: Array<Record<string, boolean>> = [
      { su_zhiwei_saved_longlife: true },
      { longevity_dew_self_used: true },
    ];
    for (const usedFlags of usedFlagCases) {
      for (const mktSceneId of ['act2_market_grand', 'act3_market', 'act4_market'] as const) {
        const mktScene = CONTENT_REGISTRY.scenes[mktSceneId];
        const dewOffer = mktScene.market?.relicOffers.find((r) => r.relicId === 'longevity_dew');
        expect(dewOffer).toBeDefined();
        expect(
          dewOffer?.when?.({
            ...base,
            act: mktScene.act,
            relics: [],
            flags: { ...base.flags, ...usedFlags },
          })
        ).toBe(false);
      }
    }

    // 5) 单周目合法集齐 12/12 天机残卷全流程实跑（卷二走血丹+古脉拿4卷，卷三免费访苏补1卷+仙盟+百宝共7卷，卷四斩天+槐阴共9卷，卷五开篇+群雄会+易物会碑拓达成 12/12）
    let full12 = createInitialState(
      makeProfile({
        originId: 'herbalist',
        openingEventIds: ['ev_charred_jade', 'ev_qingzhou_vow'],
        daoHeartId: 'seek_truth',
      }),
      CONTENT_REGISTRY
    );
    const step12 = (id: string) => {
      full12 = playStep(full12, id, () => 0.25).afterCommit;
    };
    // Act 1
    step12('bury_respectfully');
    step12('stay_help_suzhiwei');
    step12('ask_guidance');
    step12('hub1_crossroads');
    step12('side_with_qingyun');
    step12('hub1_ready_breakthrough');
    step12('qi_cangming_method');
    step12('proceed_act1_finale');
    step12('act1_choose_qingyun');
    // Act 2: 血丹(2 clues) + 暗桩主动开启古脉(2 clues) = 4 clues（刻意放弃剑碑线 clue_stele_gap）
    step12('act2_qy_enter_hub');
    step12('hub_blood_1');
    step12('blood1_partner_xie');
    step12('hub_blood_2');
    step12('blood2_expose_all');
    step12('hub2_errands');
    step12('hub2_intel');
    step12('hub_cross_open_vein');
    step12('vein1_salvage_crystals');
    step12('hub_vein_2');
    step12('vein2_swear_with_cangming');
    expect(full12.truthClues).not.toContain('clue_stele_gap');
    expect(full12.truthClues.length).toBe(4);
    step12('hub_foundation_gate');
    step12('found_cangming_guard');
    step12('demon_answer_defy');
    // Act 3: 免费拜访苏知微补拿 clue_mortal_blindspot(5) + 仙盟(6) + 百宝(7)
    step12('act3_open_survey_all');
    step12('hub3_companion_visit');
    step12('hub3_visit_su');
    step12('v_su_act3_pulse_notes');
    expect(full12.truthClues).toContain('clue_mortal_blindspot');
    step12('hub3_sect_1');
    step12('sect1_plan_heist');
    step12('hub3_sect_2');
    step12('sect2_break_vault_with_shen');
    step12('hub3_chamber_1');
    step12('chamber1_team_xie');
    step12('hub3_chamber_2');
    step12('chamber2_smash_ladder');
    expect(full12.truthClues.length).toBe(7);
    step12('hub3_golden_core_gate');
    step12('core_vein_array');
    // Act 4: 斩天(8) + 槐阴(9)
    step12('act4_open_survey');
    step12('hub4_zhantian_1');
    step12('zt1_read_oath');
    step12('zt2_rebuild_alliance');
    step12('hub4_mortal');
    const mortalOpts12 = getResolvedChoices(
      full12,
      CONTENT_REGISTRY.scenes.act4_arc_mortal_truth,
      CONTENT_REGISTRY
    );
    step12(
      mortalOpts12.some((c) => c.id === 'mortal_su_warm_promise')
        ? 'mortal_su_warm_promise'
        : 'mortal_copy_and_guard'
    );
    expect(full12.truthClues.length).toBe(9);
    step12('hub4_commission');
    step12('a4_comm_escort');
    step12('hub4_nascent_gate');
    step12('nascent_wealth_array');
    // Act 5: 开篇 clue_furnace_cycle(10) + 群雄会 clue_gate_weakness(11) + 易物会/传讯双路径补齐 clue_stele_gap(12/12!)
    step12('act5_open_sword_resolve');
    step12('hub5_summit');
    step12('summit_stealth_copy');
    expect(full12.truthClues.length).toBe(11);
    expect(full12.truthClues).not.toContain('clue_stele_gap');
    const beforeStele12 = full12;
    // 分支验证 A：裂天传讯沈清霜附寄残拓 -> 12/12
    const parleyShen12 = playStep(
      { ...beforeStele12, currentSceneId: 'act5_companion_parley' },
      'parley_shen'
    ).afterCommit;
    expect(parleyShen12.truthClues).toContain('clue_stele_gap');
    expect(parleyShen12.truthClues.length).toBe(12);
    // 分支验证 B：无沈清霜羁绊时，于末法易物会耗 80 灵石向云岭旧执事暗购残拓 -> 12/12
    const paidStelePre: GameState = {
      ...beforeStele12,
      spiritStones: 200,
      companions: {
        ...beforeStele12.companions,
        shen_qingshuang: base.companions.shen_qingshuang,
      },
      currentSceneId: 'act5_market',
    };
    const paidStele12 = playStep(paidStelePre, 'a5_market_stele_rubbing').afterCommit;
    expect(paidStele12.spiritStones).toBe(120);
    expect(paidStele12.truthClues).toContain('clue_stele_gap');
    expect(paidStele12.truthClues.length).toBe(12);
    // 主干推进：末法易物会取回残拓并离场 -> 12/12
    step12('hub5_market');
    step12('a5_market_stele_rubbing');
    step12('a5_market_leave');
    expect(full12.truthClues).toContain('clue_stele_gap');
    expect(full12.truthClues.length).toBe(12);
    expect(getInvestigationProgress(full12, CONTENT_REGISTRY).totalClues).toBe(12);

    // 6) 卷六【万金镇山河】真实扣灵石、【以魔吞界】拒低心境重伤白板、卷五半步自封在 bonded 道誓下锁定
    const gildedWithDeed: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      spiritStones: 800,
      relics: ['spirit_vein_deed'],
      tags: ['merchant_fame'],
      currentSceneId: 'act6_final_choice',
    };
    const gildedBrokeChoices = getResolvedChoices(
      { ...gildedWithDeed, spiritStones: 50, flags: { total_trade_profit: 300 } },
      CONTENT_REGISTRY.scenes.act6_final_choice,
      CONTENT_REGISTRY
    );
    expect(gildedBrokeChoices.find((c) => c.id === 'final_gilded_realm')?.locked).toBe(true);
    const gildedDeedAfter = playStep(gildedWithDeed, 'final_gilded_realm').afterCommit;
    expect(gildedDeedAfter.endingId).toBe('ending_gilded_realm');
    expect(gildedDeedAfter.spiritStones).toBe(300);

    const gildedNoDeedAfter = playStep(
      { ...gildedWithDeed, relics: [], spiritStones: 1500 },
      'final_gilded_realm'
    ).afterCommit;
    expect(gildedNoDeedAfter.spiritStones).toBe(300);

    const injuredBareDemon: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      might: 202,
      mind: 104,
      alignment: { righteous: -60, worldly: 0 },
      tags: ['demonic_sovereign'],
      flags: { deity_pure_injured: true },
      relics: [],
      currentSceneId: 'act6_final_choice',
    };
    expect(
      getResolvedChoices(injuredBareDemon, CONTENT_REGISTRY.scenes.act6_final_choice, CONTENT_REGISTRY).find(
        (c) => c.id === 'final_demonic_devour'
      )?.locked
    ).toBe(true);
    expect(() => advanceChoice(injuredBareDemon, 'final_demonic_devour', CONTENT_REGISTRY)).toThrow(
      /locked/
    );
    expect(
      getResolvedChoices(
        { ...injuredBareDemon, might: 220, mind: 155, relics: ['broken_sky_seal'] },
        CONTENT_REGISTRY.scenes.act6_final_choice,
        CONTENT_REGISTRY
      ).find((c) => c.id === 'final_demonic_devour')?.locked
    ).toBe(false);

    const bondedVowAct5: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      mind: 350,
      relics: ['mortal_hearth_talisman'],
      truthClues: ['clue_mortal_bloodline', 'clue_furnace_cycle', 'clue_stele_gap', 'clue_vein_drain'],
      flags: { act5_final_vow: 'bonded' },
      currentSceneId: 'act5_deity_breakthrough',
    };
    expect(
      getResolvedChoices(
        bondedVowAct5,
        CONTENT_REGISTRY.scenes.act5_deity_breakthrough,
        CONTENT_REGISTRY
      ).some((c) => c.id === 'deity_seal_earth_immortal')
    ).toBe(false);

    const earthImmortalPre: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      lifespanYears: 2000,
      mind: 350,
      relics: ['mortal_hearth_talisman'],
      truthClues: ['clue_mortal_bloodline', 'clue_furnace_cycle', 'clue_stele_gap', 'clue_vein_drain'],
      flags: { act5_final_vow: 'earth' },
      currentSceneId: 'act6_final_choice',
    };
    const earthImmortalAfter = playStep(earthImmortalPre, 'final_earth_immortal').afterCommit;
    expect(earthImmortalAfter.endingId).toBe('ending_earth_immortal');
    expect(earthImmortalAfter.lifespanYears).toBe(1000);

    // 7) baibao_token 仅保留百宝折扣与商脉门禁，绝不再静态绕过暗网死手威慑
    const tokenOnlyCoerce: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_early',
      might: 60,
      mind: 60,
      relics: ['baibao_token'],
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: 60, stance: 'confidant', stage: 3, chronicle: [] },
      },
    };
    expect(getOvermatchProfile(tokenOnlyCoerce).deadmanSwitches).toEqual([]);
    expect(evaluateCoercion(tokenOnlyCoerce, 'act3_tianji_goldcore').canSucceed).toBe(false);
    expect(getRelicOfferPrice(200, 'curio', tokenOnlyCoerce)).toBe(170);
    const explicitSwitchCoerce: GameState = {
      ...tokenOnlyCoerce,
      flags: { xie_deadman_switch: true },
    };
    expect(getOvermatchProfile(explicitSwitchCoerce).deadmanSwitches.length).toBe(1);
    expect(evaluateCoercion(explicitSwitchCoerce, 'act3_tianji_goldcore').canSucceed).toBe(true);
  });
});
