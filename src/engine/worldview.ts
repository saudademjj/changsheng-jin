import { ActId, ContentRegistry, GameState } from './types';
import { getAgeYears } from './time';
import {
  ACT_MAJOR_THREADS,
  getCommittedMajorArcs,
  getInvestigationProgress,
  getRemainingMajorArcSlots,
  isActiveDaoPartner,
  isCompanionDeceased,
  isCompanionHostile,
  isCompanionSealed,
  isMajorArcMissed,
  MAJOR_THREAD_LABELS,
  MAX_MAJOR_ARCS_PER_ACT,
} from './systems';

export interface ActMetaInfo {
  id: ActId;
  order: number;
  shortLabel: string;
  title: string;
  realmGoal: string;
  region: string;
  summary: string;
}

export const ACT_ORDER: ActId[] = ['act1', 'act2', 'act3', 'act4', 'act5', 'act6'];

export const ACT_META: Record<ActId, ActMetaInfo> = {
  act1: {
    id: 'act1',
    order: 1,
    shortLabel: '卷一',
    title: '尘烟初启',
    realmGoal: '引气入体（炼气）',
    region: '青岚界域',
    summary: '十六岁初入青岚烟火，立道心、识故人、攒灵石，踏出凡仙第一步。',
  },
  act2: {
    id: 'act2',
    order: 2,
    shortLabel: '卷二',
    title: '青岚暗潮',
    realmGoal: '叩关筑基（寿240载）',
    region: '青岚城 · 青州北麓',
    summary: '炼气期暗流四起，择两处大势深耕并筹备筑基道基，初窥灵枯异象。',
  },
  act3: {
    id: 'act3',
    order: 3,
    shortLabel: '卷三',
    title: '九州棋局',
    realmGoal: '凝液结丹（寿500载）',
    region: '云岭仙盟 · 青州府',
    summary: '筑基之后踏入九州大势，直面仙盟贡约、百宝商变、二十载杏林与古战场。',
  },
  act4: {
    id: 'act4',
    order: 4,
    shortLabel: '卷四',
    title: '劫世争锋',
    realmGoal: '碎丹成婴（寿1000载）',
    region: '中州赤阳 · 断魂绝渊',
    summary: '九州灵脉剧枯、灵票崩潮，与斩天余脉、商海群雄同争元婴一线生机。',
  },
  act5: {
    id: 'act5',
    order: 5,
    shortLabel: '卷五',
    title: '裂穹大劫',
    realmGoal: '化神问道（寿2000载）',
    region: '天柱残峰 · 问道绝巅',
    summary: '三千年期将满，于天柱残峰九州群雄会掀破迷雾、风雪立誓，叩响化神天劫。',
  },
  act6: {
    id: 'act6',
    order: 6,
    shortLabel: '卷六',
    title: '叩天门',
    realmGoal: '定九州三千年命数',
    region: '九霄天门之下',
    summary: '万丈白玉天门洞开、接引金光倾泻，以百年因果替九州落子终局。',
  },
};

export interface MajorArcStatusItem {
  threadId: string;
  label: string;
  status: 'completed' | 'in_progress' | 'missed' | 'available';
}

export interface ActProgressSnapshot {
  actMeta: ActMetaInfo;
  actOrder: number;
  totalActs: number;
  breakthroughUnlocked: boolean;
  breakthroughGoalLabel: string;
  breakthroughProgressText: string;
  hasMajorSlotLimit: boolean;
  majorSlotsUsed: number;
  majorSlotsTotal: number;
  majorSlotsRemaining: number;
  majorArcs: MajorArcStatusItem[];
}

export function getActProgressSnapshot(
  state: GameState,
  tianjiInsight = true
): ActProgressSnapshot {
  const actMeta = ACT_META[state.act];
  const actThreads = ACT_MAJOR_THREADS[state.act];
  const hasMajorSlotLimit = Boolean(actThreads);
  const committed = getCommittedMajorArcs(state, state.act);
  const majorSlotsRemaining = getRemainingMajorArcSlots(state, state.act);

  let breakthroughUnlocked = false;
  let breakthroughGoalLabel = actMeta.realmGoal;
  let breakthroughProgressText = '';

  if (state.act === 'act1') {
    breakthroughUnlocked =
      state.might >= 18 || state.actBeat >= 2 || Boolean(state.flags.act1_crossroads_done);
    breakthroughGoalLabel = '引气入体（炼气）';
    breakthroughProgressText = breakthroughUnlocked
      ? '破境关口已启，随时可在下方拍板闭关引气入体。'
      : tianjiInsight
      ? `再推进 ${Math.max(1, 2 - state.actBeat)} 步历练、赴听雨茶肆走一遭，或修为达 18（当前 ${state.might}）即可开启破境。`
      : '多在青岚城历练一番、赴听雨茶肆走一遭，或修为火候渐足后即可开启破境。';
  } else if (state.act === 'act2') {
    const act2Done = state.completedThreads.filter((t) =>
      (ACT_MAJOR_THREADS.act2 ?? []).includes(t)
    ).length;
    breakthroughUnlocked =
      state.actBeat >= 3 || state.completedThreads.length >= 2 || state.might >= 38;
    breakthroughGoalLabel = '闭关筑基';
    breakthroughProgressText = breakthroughUnlocked
      ? '筑基关口已启，备齐丹药、阵盘或底蕴后随时可拍板破关。'
      : tianjiInsight
      ? `推进历练至 3 步（${Math.min(state.actBeat, 3)}/3）、了结 2 处大势（${act2Done}/2）或修为达 38（当前 ${state.might}）后开启筑基关口。`
      : '在青岚历练渐深、了结两处世局大势或炼气火候圆满后，即可开启筑基关口。';
  } else if (state.act === 'act3') {
    const act3Done = state.completedThreads.filter((id) =>
      id.startsWith('thread_act3_')
    ).length;
    breakthroughUnlocked = state.actBeat >= 3 || act3Done >= 2 || state.might >= 65;
    breakthroughGoalLabel = '凝液结丹';
    breakthroughProgressText = breakthroughUnlocked
      ? '结丹关口已启，备妥凝丹丸、灵脉契或厚资后即可择机闭死关。'
      : tianjiInsight
      ? `推进历练至 3 步（${Math.min(state.actBeat, 3)}/3）、了结 2 处卷三大势（${act3Done}/2）或修为达 65（当前 ${state.might}）后开启结丹关口。`
      : '历经九州风云、了结两处卷三大势或筑基真元蓄满后，即可开启结丹关口。';
  } else if (state.act === 'act4') {
    const act4Done = state.completedThreads.filter((id) =>
      id.startsWith('thread_act4_')
    ).length;
    breakthroughUnlocked = state.actBeat >= 3 || act4Done >= 2 || state.might >= 100;
    breakthroughGoalLabel = '碎丹成婴';
    breakthroughProgressText = breakthroughUnlocked
      ? '雷台关口已启，备齐育婴莲、知己护法或阵材后即可登台渡劫。'
      : tianjiInsight
      ? `推进历练至 3 步（${Math.min(state.actBeat, 3)}/3）、了结 2 处卷四大势（${act4Done}/2）或修为达 100（当前 ${state.might}）后开启成婴关口。`
      : '深入中州劫世、了结两处卷四大势或金丹火候圆满后，即可开启成婴关口。';
  } else if (state.act === 'act5') {
    const act5Done = state.completedThreads.some((id) =>
      id.startsWith('thread_act5_')
    );
    breakthroughUnlocked = state.actBeat >= 2 || act5Done;
    breakthroughGoalLabel = '化神问道';
    breakthroughProgressText = breakthroughUnlocked
      ? '化神关口已启；建议先历九州群雄会与风雪长谈定下终战道誓，再登绝巅。'
      : '参与九州群雄会或风雪终战前夜，或完成数番战前筹备后即可开启化神关口。';
  } else {
    breakthroughUnlocked = true;
    breakthroughGoalLabel = '叩问天门';
    breakthroughProgressText = '九霄天门已开，眼下即是定鼎九州三千年命数之刻。';
  }

  let majorArcs: MajorArcStatusItem[] = [];
  if (actThreads) {
    majorArcs = actThreads.map((tid) => {
      const label = MAJOR_THREAD_LABELS[tid] ?? tid;
      if (state.completedThreads.includes(tid)) {
        return { threadId: tid, label, status: 'completed' };
      }
      if (committed.includes(tid)) {
        return { threadId: tid, label, status: 'in_progress' };
      }
      if (isMajorArcMissed(state, state.act, tid)) {
        return { threadId: tid, label, status: 'missed' };
      }
      return { threadId: tid, label, status: 'available' };
    });
  } else if (state.act === 'act5') {
    majorArcs = [
      {
        threadId: 'thread_act5_summit',
        label: '九州群雄会',
        status: state.flags.act5_summit_done ? 'completed' : 'available',
      },
      {
        threadId: 'thread_act5_eve',
        label: '终战前夜立誓',
        status: state.flags.act5_eve_done ? 'completed' : 'available',
      },
    ];
  } else if (state.act === 'act1') {
    majorArcs = [
      {
        threadId: 'act1_crossroads',
        label: '听雨茶肆风波',
        status: state.flags.act1_crossroads_done ? 'completed' : 'available',
      },
    ];
  }

  return {
    actMeta,
    actOrder: actMeta.order,
    totalActs: ACT_ORDER.length,
    breakthroughUnlocked,
    breakthroughGoalLabel,
    breakthroughProgressText,
    hasMajorSlotLimit,
    majorSlotsUsed: committed.length,
    majorSlotsTotal: MAX_MAJOR_ARCS_PER_ACT,
    majorSlotsRemaining,
    majorArcs,
  };
}

export interface WorldClimateSnapshot {
  veinPercent: number;
  veinLabel: string;
  skyStatus: string;
  societyStatus: string;
  crisisTone: 'calm' | 'uneasy' | 'tense' | 'critical';
}

export function getWorldClimateSnapshot(state: GameState): WorldClimateSnapshot {
  if (state.act === 'act1') {
    return {
      veinPercent: 54,
      veinLabel: '灵潮缓退（约余五成）',
      skyStatus: '云海如常，唯古籍载「长明三千年飞升无归音」。',
      societyStatus: state.flags.act1_heard_blood_pill
        ? '青岚暗市流出血丹风声，青州边界亦有怪热传闻。'
        : '青岚坊市烟火鼎盛，宗门招考与商号往来照旧。',
      crisisTone: 'calm',
    };
  }
  if (state.act === 'act2') {
    const plaguePenalty = state.flags.missed_thread_qingzhou_plague ? 4 : 0;
    const vein = 45 - plaguePenalty;
    return {
      veinPercent: vein,
      veinLabel: plaguePenalty > 0 ? '外域初枯（约余四成）' : '外域初枯（约余四成半）',
      skyStatus: '青州北麓偶现夜半地鸣，高空灵流隐隐倒曳。',
      societyStatus: state.flags.blood_pill_exposed
        ? '暗市血丹案轰动青岚，正统丹价骤涨，各家商帮人心浮动。'
        : '青云外门弟子失踪、暗市血丹与青州怪疫同时发酵，山雨欲来。',
      crisisTone: 'uneasy',
    };
  }
  if (state.act === 'act3') {
    const vein = state.flags.tianji_portal_destroyed ? 35 : 31;
    return {
      veinPercent: vein,
      veinLabel: vein >= 35 ? '九州断脉（约余三成半）' : '九州断脉（仅余三成）',
      skyStatus: '星象微暗，仙盟频催三宗遴选赴云岭秘境闭关的“百年飞升候补”。',
      societyStatus: state.flags.xie_reformed_merchant
        ? '青州断脉引发药荒，百宝斋开仓平价勉力稳住底层散修生计。'
        : '多座中阶灵矿断脉，药材丹粮飞涨，大宗与商行暗中争抢残矿。',
      crisisTone: 'uneasy',
    };
  }
  if (state.act === 'act4') {
    const vein = 18;
    const knowsVeinCurve =
      state.truthClues.includes('clue_zhantian_remnant') ||
      state.truthClues.includes('clue_mortal_bloodline');
    const societyStatus = state.flags.xie_new_order_founded
      ? '天机商行血契霸权崩塌，通兑公契勉力维系九州七十二重镇民心。'
      : state.flags.act4_war_warlord
      ? '赤阳矿谷血战惨烈，残存灵矿尽落铁腕霸主之手，诸宗人人自危。'
      : state.flags.act4_war_truce
      ? '赤阳矿战暂以分矿密约停火，但中州灵票契信已摇摇欲坠。'
      : '灵脉骤枯引发灵石旧制倾颓，天机商行趁乱强推“灵根质押血契”，中州烽火连天。';
    return {
      veinPercent: vein,
      veinLabel: '末法剧枯（尚余不足二成）',
      skyStatus: knowsVeinCurve
        ? '铅灰劫云终年盘踞中州，前两千五百载温养已过，九霄清棚急抽之兆日显。'
        : '铅灰劫云终年盘踞中州，近数十载灵脉枯速陡增，偶有细微金纹自高穹一闪而逝。',
      societyStatus,
      crisisTone: 'tense',
    };
  }
  if (state.act === 'act5') {
    const knowsHarvest =
      state.truthClues.length >= 3 || state.relics.includes('ascension_ledger');
    const summitExposed = knowsHarvest || state.flags.act5_summit_outcome === 'exposed';
    return {
      veinPercent: 8,
      veinLabel: '灵脉将竭（不足一成）',
      skyStatus: knowsHarvest
        ? '苍穹撕开万里金灰裂口，前温养而后清棚的三千年收割大期已近尾声，灰白长生烬随风暗落。'
        : '苍穹撕开万里金灰裂口，三千年灵脉断绝大劫迫近，劫钟长鸣。',
      societyStatus: state.flags.act5_summit_done
        ? summitExposed
          ? '天柱峰群雄会落幕，伪天门唯锁杀合道化神，留世元婴亦困于残脉归零、终生绝道之局，诸修各自抉择迎战、敛息隐世或押注仙盟。'
          : '天柱峰群雄会落幕，天门唯引化神而地脉将绝，诸宗元婴各自抉择破关问天、敛息避劫或依附仙盟。'
        : '中小宗门成片封山散伙，各方残存老祖云集天柱残峰，等待最后答卷。',
      crisisTone: 'critical',
    };
  }
  return {
    veinPercent: 4,
    veinLabel: '残脉枯竭（不足半成）',
    skyStatus: '万丈白玉天门洞开九霄，惨白接引金光垂落九州群山，唯锁神魂合道之化神。',
    societyStatus: '天地死寂，裂穹余波压境，九州群修屏息敛气，静待绝巅问道者给出最终回应。',
    crisisTone: 'critical',
  };
}

export interface FactionStandingItem {
  id: string;
  name: string;
  category: string;
  region: string;
  standingLabel: string;
  standingTone: 'muted' | 'neutral' | 'warm' | 'accent' | 'danger' | 'partner';
  powerStatus: string;
  summary: string;
}

export function getFactionStandings(state: GameState): FactionStandingItem[] {
  const actOrder = ACT_META[state.act].order;
  const xieHostile = isCompanionHostile(state, 'xie_wujiu');
  const shenHostile = isCompanionHostile(state, 'shen_qingshuang');
  const suDeceased = isCompanionDeceased(state, 'su_zhiwei');

  // 1. 青云剑宗
  let qyStanding = '素无瓜葛';
  let qyTone: FactionStandingItem['standingTone'] = 'neutral';
  if (state.tags.includes('sect_rebel') || state.flags.qingyun_elders_hostile) {
    qyStanding = '叛宗通缉';
    qyTone = 'danger';
  } else if (state.flags.betrayed_shen_at_stele) {
    qyStanding = '长老私赏';
    qyTone = 'warm';
  } else if (state.tags.includes('qingyun_outer')) {
    qyStanding = '青云弟子';
    qyTone = 'accent';
  } else if (state.companions.shen_qingshuang.met && !shenHostile) {
    qyStanding = '首座之交';
    qyTone = 'warm';
  }

  const qyPower =
    actOrder <= 2
      ? '青岚第一剑门 · 暗隐飞升旧秘'
      : actOrder === 3
      ? '云岭仙盟柱石 · 内部分歧渐显'
      : actOrder === 4
      ? '灵脉大枯 · 外门裁撤收缩'
      : '护山大阵濒裂 · 老祖摇摆';

  const qySummary =
    state.tags.includes('sect_rebel') || Boolean(state.flags.qingyun_elders_hostile)
      ? '你与执法长老彻底翻脸，山门已将你列为剑宗大敌，唯少数年轻弟子暗自佩服。'
      : state.tags.includes('qingyun_outer')
      ? '青岚境正统剑宗，执掌三千年飞升古碑；你身佩外门名籍，受其庇护亦受其规矩所限。'
      : '长明历来最负盛名的正道剑宗，明面曾出七位化神飞升大能，禁地古碑却暗藏断代疑云。';

  // 2. 九州仙盟
  let alStanding = actOrder <= 2 ? '远观大势' : '平辈相交';
  let alTone: FactionStandingItem['standingTone'] = 'neutral';
  if (state.tags.includes('sect_rebel')) {
    alStanding = '仙盟逆党';
    alTone = 'danger';
  } else if (state.tags.includes('alliance_envoy')) {
    alStanding = '仙盟客卿';
    alTone = 'accent';
  } else if (state.flags.act3_sect_compromise) {
    alStanding = '暗约交易';
    alTone = 'warm';
  } else if (state.tags.includes('demonic_sovereign')) {
    alStanding = '正道公敌';
    alTone = 'danger';
  }

  const knowsAllianceTribute =
    state.truthClues.includes('clue_alliance_pact') ||
    Boolean(state.flags.act3_sect_step1) ||
    Boolean(state.flags.act3_sect_conflict) ||
    Boolean(state.flags.act3_sect_compromise) ||
    state.completedThreads.includes('thread_act3_sect');

  const alPower =
    actOrder <= 2
      ? '统御九州宗门 · 威令四海'
      : actOrder === 3
      ? knowsAllianceTribute
        ? '力主「护界进贡」· 强征候补'
        : '云岭议事频仍 · 暗调各宗名额'
      : actOrder === 4
      ? '赤阳矿战失血 · 号令衰微'
      : state.flags.act5_summit_done
      ? '群雄会落幕 · 贡约公信崩解'
      : '天柱峰召集残存诸老';

  const alSummary = state.truthClues.includes('clue_alliance_pact')
    ? '三大宗门结成的九州最高正道同盟，千年来以“保送秘境冲化神”为名，将百年候补暗送转运井折抵炉薪，自欺为“纳贡稳固界壁”。'
    : '统领九州各大宗门的盟主机构，维护正道秩序、统筹灵矿分配与高阶飞升盛典。';

  // 3. 天机商行
  let tjStanding = '暗中观望';
  let tjTone: FactionStandingItem['standingTone'] = 'neutral';
  if (state.flags.act4_chamber_collapsed) {
    tjStanding = '总号崩灭';
    tjTone = 'muted';
  } else if (
    state.tags.includes('tianji_nemesis') ||
    state.flags.tianji_chamber_hostile
  ) {
    tjStanding = '必杀死敌';
    tjTone = 'danger';
  } else if (state.flags.act4_war_truce) {
    tjStanding = '分矿暗协';
    tjTone = 'warm';
  } else if (state.flags.blood_pill_exposed) {
    tjStanding = '暗市怀恨';
    tjTone = 'danger';
  }

  const knowsTianjiPortal =
    state.truthClues.includes('clue_tianji_portal') ||
    Boolean(state.flags.act3_chamber_step1) ||
    Boolean(state.flags.tianji_chamber_hostile) ||
    state.completedThreads.includes('thread_act3_chamber');

  const knowsTianjiDark =
    knowsTianjiPortal ||
    state.truthClues.includes('clue_blood_pill_dust') ||
    Boolean(state.flags.blood_pill_exposed) ||
    Boolean(state.flags.blood_arc_step1) ||
    Boolean(state.flags.act4_chamber_collapsed) ||
    Boolean(state.flags.act4_war_step1);

  const tjPower = state.flags.act4_chamber_collapsed
    ? '商脉霸权瓦解 · 残部遁逃'
    : actOrder <= 2
    ? knowsTianjiDark
      ? '暗布青岚血丹与矿账网络'
      : '掌九州灵矿奇珍 · 暗流莫测'
    : actOrder === 3
    ? knowsTianjiPortal
      ? '操控青州转运暗港 · 勾结内鬼'
      : knowsTianjiDark
      ? '收紧青州药路 · 账目深藏玄机'
      : '纵横九州矿丹大行 · 动向莫测'
    : actOrder === 4
    ? Boolean(state.flags.act4_war_step1) || state.completedThreads.includes('thread_act4_war')
      ? '趁灵票倾覆强推灵根质押血契'
      : '灵脉骤枯之际大肆收拢灵矿财脉'
    : '隐退幕后 · 静候天门开启';

  const tjSummary = state.flags.act4_chamber_collapsed
    ? '实为上界历代扶植的敛财外柜几经易名改换门庭、近三百年整合而成的巨商，如今已在九州七十二重镇公契风暴中土崩瓦解，其代代移交续纂的《三千年收割总录》母本亦流落人间。'
    : state.relics.includes('ascension_ledger')
    ? '实为上界历代扶植的敛财外柜几经易名改换门庭、近三百年整合而成的跨州巨商，暗中染指血丹及转运井，并代代移交续纂《三千年收割总录》母本。'
    : knowsTianjiPortal
    ? '近三百年整合崛起的跨州巨商，疑承袭前代神秘旧号，表面经营矿脉丹药，暗中染指血丹、转运井与上界密账。'
    : knowsTianjiDark
    ? '背景深不可测的跨州商行，表面经营矿脉与丹药，暗中却似与血丹黑市及异常矿账脱不开干系。'
    : '背景深不可测的跨州商行，掌管九州诸多灵矿与珍丹行路，行事极密，坊间莫测其深浅。';

  // 4. 百宝斋
  let bbStanding = '寻常过客';
  let bbTone: FactionStandingItem['standingTone'] = 'neutral';
  if (xieHostile) {
    bbStanding = '商路反目';
    bbTone = 'danger';
  } else if (isActiveDaoPartner(state, 'xie_wujiu')) {
    bbStanding = '总号同契';
    bbTone = 'partner';
  } else if (state.flags.xie_new_order_founded) {
    bbStanding = '公盟共主';
    bbTone = 'accent';
  } else if (state.flags.xie_reformed_merchant) {
    bbStanding = '仁商东家';
    bbTone = 'accent';
  } else if (state.relics.includes('baibao_token')) {
    bbStanding = '玄铁贵宾';
    bbTone = 'warm';
  } else if (state.companions.xie_wujiu.met) {
    bbStanding = '暗楼熟客';
    bbTone = 'warm';
  }

  const bbPower = state.flags.xie_new_order_founded
    ? '颁行九州通兑公契 · 众商归心'
    : state.flags.xie_reformed_merchant
    ? '清叛平荒 · 由暗商转为仁商'
    : actOrder <= 2
    ? '青岚暗市消息与货殖枢纽'
    : '分号承压 · 与天机商行暗战';

  const knowsXieBrother =
    state.truthClues.includes('clue_blood_pill_dust') ||
    state.truthClues.includes('clue_tianji_portal') ||
    Boolean(state.flags.blood_arc_step1) ||
    Boolean(state.flags.act3_chamber_step1) ||
    (state.companions.xie_wujiu.milestoneStage ?? 0) >= 1;

  const bbSummary = state.flags.xie_new_order_founded
    ? '在谢无咎与你联手下放弃独霸旧章，改以九州通兑公契串联七十二城商帮，成为乱世民心所向。'
    : knowsXieBrother
    ? '谢无咎执掌的暗市大商号，耳目遍布七十二城茶楼暗桩，既讲盈亏筹码，也藏兄长失踪旧恨。'
    : '谢无咎执掌的暗市大商号，耳目遍布九州暗巷茶楼，重利守信，背后却似另有所图。';

  // 5. 斩天会
  const knowsZhantian =
    state.tags.includes('sky_slayer_ally') ||
    state.truthClues.includes('clue_zhantian_remnant') ||
    Boolean(state.flags.act4_zhantian_step1) ||
    state.completedThreads.includes('thread_act4_zhantian');

  const knowsZhantianSeal =
    state.relics.includes('broken_sky_seal') ||
    state.tags.includes('sky_slayer_ally') ||
    state.truthClues.includes('clue_zhantian_remnant');

  let ztStanding = knowsZhantian ? '有所耳闻' : '秘辛未显';
  let ztTone: FactionStandingItem['standingTone'] = knowsZhantian ? 'neutral' : 'muted';
  if (state.tags.includes('sky_slayer_ally')) {
    ztStanding = '斩天同盟';
    ztTone = 'accent';
  } else if (state.flags.act4_zhantian_step1 && state.tags.includes('demonic_sovereign')) {
    ztStanding = '各怀鬼胎';
    ztTone = 'danger';
  } else if (state.truthClues.includes('clue_zhantian_remnant')) {
    ztStanding = '承其遗录';
    ztTone = 'warm';
  }

  const ztPower = !knowsZhantian
    ? '隐匿绝渊 · 坊间偶闻只言片语'
    : state.tags.includes('sky_slayer_ally')
    ? '四纪残火重聚 · 剑指九霄'
    : '四度绝而复续 · 孤军测绘枯脉';

  const ztSummary = !knowsZhantian
    ? '传闻三千年来曾有不甘俯首的修士暗结密会，历代皆遭仙盟剿灭，至今不知虚实。'
    : knowsZhantianSeal
    ? '长明三千年间四度绝而复续的大兴世系（四纪），凭师徒薪火代代相传，测绘出前温养后急抽的完整枯脉星图，并留有【残缺锁天印】线索。'
    : '长明三千年间四度绝而复续的反抗世系，经师徒数辈薪火相传藏身断魂绝渊，正于乱世中测绘枯脉异象。';

  // 6. 青州凡尘（杏林·槐阴）
  let mtStanding = '红尘行客';
  let mtTone: FactionStandingItem['standingTone'] = 'neutral';
  if (state.tags.includes('mortal_keeper')) {
    mtStanding = '红尘守灯人';
    mtTone = 'accent';
  } else if (state.tags.includes('qingzhou_guardian')) {
    mtStanding = '青州恩人';
    mtTone = 'warm';
  } else if (state.tags.includes('demonic_sovereign')) {
    mtStanding = '凡俗畏避';
    mtTone = 'danger';
  } else if (state.flags.left_qingzhou_coldly) {
    mtStanding = '仙凡疏离';
    mtTone = 'muted';
  }

  const knowsMortalDeep =
    actOrder >= 4 ||
    suDeceased ||
    Boolean(state.flags.su_zhiwei_passed) ||
    Boolean(state.flags.act4_mortal_truth_found);

  const mtPower = suDeceased
    ? getAgeYears(state.ageMonths) >= 120
      ? '阿芸一脉承继杏林药庐 · 无灵灯火未熄'
      : '阿芸承继杏林药庐 · 无灵灯火未熄'
    : state.flags.su_zhiwei_saved_longlife
    ? knowsMortalDeep
      ? '苏知微安康传灯 · 杏林与槐阴相望'
      : '苏知微安康坐诊 · 杏林药炉灯火不熄'
    : actOrder === 1
    ? '青州烟火寻常 · 唯边界偶传怪热风声'
    : actOrder === 2
    ? state.completedThreads.includes('thread_qingzhou_plague')
      ? '青州怪疫渐息 · 杏林药庐重归安宁'
      : '青州怪疫侵扰 · 凡人药庐苦撑'
    : '杏林药庐守灯 · 静察凡尘灵潮异动';

  const mtSummary = state.truthClues.includes('clue_mortal_bloodline')
    ? '太古无灵纪遗脉，彻头彻尾无灵根的凡人血脉反倒置身牧灵大网之外；杏林《无灵医典》与槐阴古碑共同守着人间最后火种，亦是日后无伤剥离灵根牧种的医理基石。'
    : actOrder === 1
    ? '青州城外杏林医馆与散落村镇的凡俗百姓，远离仙门争锋，唯在岁末烟火里守着柴米与药香。'
    : '青州城外杏林医馆与散落村镇的凡俗百姓，虽无灵根法力，却在灵潮怪疫中透出奇异规律。';

  return [
    {
      id: 'qingyun',
      name: '青云剑宗',
      category: '名门剑宗',
      region: '青岚山麓',
      standingLabel: qyStanding,
      standingTone: qyTone,
      powerStatus: qyPower,
      summary: qySummary,
    },
    {
      id: 'alliance',
      name: '九州仙盟',
      category: '正道盟主',
      region: '云岭 · 天柱峰',
      standingLabel: alStanding,
      standingTone: alTone,
      powerStatus: alPower,
      summary: alSummary,
    },
    {
      id: 'tianji',
      name: '天机商行',
      category: '神秘巨商',
      region: '九州暗网 · 赤阳',
      standingLabel: tjStanding,
      standingTone: tjTone,
      powerStatus: tjPower,
      summary: tjSummary,
    },
    {
      id: 'baibao',
      name: '百宝斋',
      category: '暗市商帮',
      region: '青岚 · 青州 · 中州',
      standingLabel: bbStanding,
      standingTone: bbTone,
      powerStatus: bbPower,
      summary: bbSummary,
    },
    {
      id: 'zhantian',
      name: '斩天会',
      category: '隐秘反抗者',
      region: '断魂绝渊',
      standingLabel: ztStanding,
      standingTone: ztTone,
      powerStatus: ztPower,
      summary: ztSummary,
    },
    {
      id: 'mortal_realm',
      name: '青州凡尘',
      category: knowsMortalDeep ? '杏林 · 槐阴' : '青州杏林',
      region: knowsMortalDeep ? '青州城外 · 槐阴村' : '青州城外药庐',
      standingLabel: mtStanding,
      standingTone: mtTone,
      powerStatus: mtPower,
      summary: mtSummary,
    },
  ];
}

export interface WorldRegionItem {
  id: string;
  name: string;
  actRange: string;
  status: 'current' | 'visited' | 'upcoming';
  desc: string;
}

export function getWorldRegions(state: GameState): WorldRegionItem[] {
  const order = ACT_META[state.act].order;
  const qzStatus =
    order === 2 || order === 3 ? 'current' : order > 3 ? 'visited' : 'upcoming';
  const ylStatus = order === 3 ? 'current' : order > 3 ? 'visited' : 'upcoming';
  const bfStatus =
    order === 3 || order === 4 ? 'current' : order > 4 ? 'visited' : 'upcoming';
  const zzStatus = order === 4 ? 'current' : order > 4 ? 'visited' : 'upcoming';
  const tzStatus = order >= 5 ? 'current' : 'upcoming';

  const knowsVeinArray =
    state.truthClues.includes('clue_ancient_vein_sigil') ||
    Boolean(state.flags.ancient_vein_disturbed) ||
    state.completedThreads.includes('thread_ancient_vein');
  const knowsHuaiyinStele =
    Boolean(state.flags.act4_mortal_truth_found) ||
    state.truthClues.includes('clue_mortal_bloodline');
  const knowsChangmingHistory = state.truthClues.includes('clue_changming_night');
  const knowsZhantianAbyss =
    state.tags.includes('sky_slayer_ally') ||
    state.truthClues.includes('clue_zhantian_remnant') ||
    Boolean(state.flags.act4_zhantian_step1) ||
    state.completedThreads.includes('thread_act4_zhantian');

  const knowsGateWeakness = state.truthClues.includes('clue_gate_weakness');

  return [
    {
      id: 'qinglan',
      name: '青岚城与断剑松林',
      actRange: '卷一 ~ 卷二',
      status: order <= 2 ? 'current' : 'visited',
      desc: '青州北境边城，散修云集，青云剑宗山门、南市灵肆与百宝暗楼皆聚于此。',
    },
    {
      id: 'qingzhou',
      name: order >= 2 ? '青州府 · 杏林与北麓古脉' : '青州府 · 杏林药市',
      actRange: '卷二 ~ 卷四',
      status: qzStatus,
      desc:
        qzStatus === 'upcoming'
          ? '青岚以南重镇，药市繁盛、凡俗安居，近来坊间偶传城外起了怪异风热。'
          : knowsVeinArray && knowsHuaiyinStele
          ? '怪疫初起之地；城外杏林药庐、地底枯脉逆阵与槐阴无灵古碑皆藏于此域。'
          : knowsHuaiyinStele
          ? '怪疫初起之地；城外杏林药庐与槐阴无灵古碑皆藏于此域，守着人间最后火种。'
          : knowsVeinArray
          ? '怪疫初起之地；城外杏林药庐与北麓地底枯脉逆阵皆藏于此域，暗流涌动。'
          : '怪疫初起之地；城外杏林药庐与北麓灵脉山谷皆属此域，山中似另藏隐秘。',
    },
    {
      id: 'yunling',
      name: '云州 · 云岭仙盟总坛',
      actRange: '卷三',
      status: ylStatus,
      desc:
        ylStatus === 'upcoming'
          ? '高悬云州云海之上的正道总坛，三大宗门定期共议九州灵矿与仙途盛典。'
          : '云州云海之上三大宗门共议九州大势与百年飞升名录之地，秘阁高悬绝顶。',
    },
    {
      id: 'battlefield',
      name: knowsZhantianAbyss ? '玄州界 · 长明古战场与断魂绝渊' : '玄州界 · 长明古战场旧址',
      actRange: '卷三 ~ 卷四',
      status: bfStatus,
      desc:
        bfStatus === 'upcoming'
          ? '三千年前旧史语焉不详的禁忌古地，灵潮紊乱，寻常低阶修士难窥其全貌。'
          : knowsChangmingHistory && knowsZhantianAbyss
          ? '三千年前九剑尊血战、旧世护界主脉一息抽空之所；荒泽孕育养魂古木，绝渊深处潜伏斩天四纪遗窟。'
          : knowsChangmingHistory
          ? '三千年前九剑尊血战、旧世护界主脉一息抽空之所；焦土荒泽间灵潮紊乱，深处传说孕育养魂古木。'
          : knowsZhantianAbyss
          ? '三千年前旧战荒原与断魂绝渊所在，绝渊深处潜伏着四度绝而复续的斩天反抗者遗窟。'
          : '三千年前旧史讳言的荒原古地，阴雾重重、残剑遍野，深处传说藏有养魂奇材与绝渊险地。',
    },
    {
      id: 'zhongzhou',
      name: '中州三十六大城与赤阳灵矿',
      actRange: '卷四',
      status: zzStatus,
      desc:
        zzStatus === 'upcoming'
          ? '九州腹地商旅与大宗灵矿荟萃之所，中州三十六大城辐射九州七十二重镇，财脉交错、风起云涌。'
          : '九州腹地最后几条大矿与中州三十六大城财脉所在，辐射九州七十二重镇，乃灵票崩潮及商海决战的主战场。',
    },
    {
      id: 'jiuzhou_outer',
      name: '幽沧炎澜灵诸州 · 九州外域',
      actRange: '卷一 ~ 卷六',
      status: order >= 5 ? 'current' : order >= 3 ? 'visited' : 'upcoming',
      desc: knowsHuaiyinStele
        ? '北境幽州、东海沧州、南疆炎州及澜州水镇、西陲玄州与灵州药谷，合中、青、云三州共构九州七十二重镇；幽州荒原妖兽实为上古牧者同步投下的同源“牧犬”，借边患驱迫凡俗世代依附仙门。'
        : '除中州、青州及云州外，北境幽州苦寒多妖兽边患，东临沧州瀚海，南接炎州火脉及澜州水镇，西连玄州荒原与灵州药谷，合构九州七十二重镇版图。',
    },
    {
      id: 'tianzhu',
      name: '天柱残峰与问道绝巅',
      actRange: '卷五 ~ 卷六',
      status: tzStatus,
      desc:
        tzStatus === 'upcoming'
          ? '传说中离九霄天幕最近的上古圣峰，历代化神大能皆往此地问道。'
          : knowsGateWeakness
          ? '直面九霄伪天门的绝顶圣地；九州九大主灵眼经金柱连通门框凝成“天地九枢”唯一界海星标，强行跨界之耗百倍于一纪产出，内破九枢即可令下界彻底脱离上界星图。'
          : '直面苍穹金灰裂口的绝顶圣地，九州群雄会与叩问三千年天门的终极舞台。',
    },
  ];
}

export interface RealmTierItem {
  id: string;
  name: string;
  lifespanText: string;
  status: 'passed' | 'current' | 'next' | 'future';
  desc: string;
}

export function getRealmLadder(
  state: GameState,
  registry: ContentRegistry
): RealmTierItem[] {
  const curOrder = registry.realms[state.realm]?.order ?? 0;
  const tiers: Array<{
    id: string;
    name: string;
    lifespanText: string;
    minOrder: number;
    maxOrder: number;
    desc: string;
  }> = [
    {
      id: 'mortal',
      name: '凡胎肉身',
      lifespanText: '寿 80 载',
      minOrder: 0,
      maxOrder: 0,
      desc: '未开灵窍，寒暑易老。',
    },
    {
      id: 'qi',
      name: '炼气期（初→圆满）',
      lifespanText: '寿 115~130 载',
      minOrder: 1,
      maxOrder: 4,
      desc: '初引清气入脉，立足坊市与外门。',
    },
    {
      id: 'foundation',
      name: '筑基期（初→后期）',
      lifespanText: '寿 240~260 载',
      minOrder: 5,
      maxOrder: 7,
      desc: '气化灵液，神识外放十里，御剑穿云，正式入九州棋局。',
    },
    {
      id: 'golden_core',
      name: '金丹大道',
      lifespanText: '寿 500 载',
      minOrder: 8,
      maxOrder: 8,
      desc: '灵液凝丹，神识覆及百里，足以左右一州宗门与商路风云。',
    },
    {
      id: 'nascent_soul',
      name: '元婴老祖',
      lifespanText: '寿 1000 载',
      minOrder: 9,
      maxOrder: 9,
      desc: '碎丹成婴，神识笼罩五百里，立于下界之巅，直面三千年天裂大劫。',
    },
    {
      id: 'deity_transform',
      name: '化神问道',
      lifespanText: '寿 2000 载',
      minOrder: 10,
      maxOrder: 10,
      desc: '神魂合道，神识横绝千里，接引金光落顶，直面三千年无归音之九霄天门。',
    },
  ];

  let seenCurrent = false;
  return tiers.map((t) => {
    let status: RealmTierItem['status'];
    if (curOrder > t.maxOrder) {
      status = 'passed';
    } else if (curOrder >= t.minOrder && curOrder <= t.maxOrder) {
      status = 'current';
      seenCurrent = true;
    } else if (seenCurrent) {
      status = 'next';
      seenCurrent = false;
    } else {
      status = 'future';
    }
    return {
      id: t.id,
      name: t.name,
      lifespanText: t.lifespanText,
      status,
      desc: t.desc,
    };
  });
}

export interface ActTransitionEcho {
  actBanner: string;
  title: string;
  bullets: string[];
}

const OPENING_SCENES = new Set([
  'act2_opening_qingyun',
  'act2_opening_darkmarket',
  'act2_opening_wanderer',
  'act3_opening',
  'act4_opening',
  'act5_opening',
  'act6_sky_gate',
]);

export function getActTransitionEcho(
  state: GameState,
  sceneId: string,
  registry: ContentRegistry
): ActTransitionEcho | null {
  if (!OPENING_SCENES.has(sceneId)) return null;

  const bullets: string[] = [];

  if (sceneId.startsWith('act2_opening_')) {
    const pathText = state.tags.includes('qingyun_outer')
      ? '你拜入【青云剑宗】外门，得宗门剑令与名门庇护，亦踏进了飞升古碑疑局。'
      : state.tags.includes('dark_market_broker')
      ? '你以【暗市客卿】身份扎根青岚暗巷，借百宝斋耳目直面天机商行血丹暗流。'
      : '你择【红尘散修】之路独行南下，不受宗门樊笼，亲探青州怪疫与北麓古脉。';
    bullets.push(pathText);
    bullets.push('本卷核心目标：在天时所限的 2 席大势内深耕线索与底蕴，跨越【筑基】大关。');
    return {
      actBanner: '卷二启幕 · 前尘落定',
      title: '炼气初成，青岚暗流已动',
      bullets,
    };
  }

  if (sceneId === 'act3_opening') {
    const gradeLabel =
      state.flags.foundation_grade === 'sword_ancient'
        ? '铸就【太古剑基】，身负越阶杀伐之锋。'
        : state.flags.foundation_grade === 'flawless'
        ? '铸就【无瑕正统道基】，根基浑厚稳健。'
        : state.flags.foundation_grade === 'merchant_vein'
        ? '以阵道财脉铸就【地脉道基】，气海绵长。'
        : state.flags.foundation_grade === 'blood_demon'
        ? '强铸【煞血道基】，战力悍厉而正道故人渐生戒心。'
        : '历经生死熬成筑基道种，正式踏入九州棋局。';
    bullets.push(`破境底蕴：${gradeLabel}`);

    if (state.companions.su_zhiwei.met && isCompanionDeceased(state, 'su_zhiwei')) {
      bullets.push('青州余波：凡尘岁月无情，青州杏林故人已安然辞世，唯有旧药庐与医案尚存。');
    } else if (state.flags.su_zhiwei_saved_longlife && !isCompanionDeceased(state, 'su_zhiwei')) {
      bullets.push('青州余波：你曾以【九转延寿露】救下苏知微，这数载杏林药庐灯火安康，正陆续誊录凡人医案。');
    } else if (state.companions.su_zhiwei.met) {
      bullets.push(
        getAgeYears(state.ageMonths) >= 45
          ? '青州余波：凡尘岁月如刀，未曾延寿的杏林故人已渐入暮年。'
          : '青州余波：仙凡寿数殊途，筑基二百载光阴已悄然拉开了你与杏林故人的岁月距离。'
      );
    }
    if (state.flags.blood_pill_exposed) {
      bullets.push('坊市余波：青岚血丹黑幕曾被你当众掀开，天机商行已把你记入必杀暗册。');
    }
    const missedAct2 = (ACT_MAJOR_THREADS.act2 ?? []).filter((t) =>
      Boolean(state.flags[`missed_${t}`])
    );
    if (missedAct2.length > 0) {
      bullets.push(
        `未及插手：卷二未亲历的【${missedAct2
          .map((t) => MAJOR_THREAD_LABELS[t] ?? t)
          .join('、')}】已随世局自行演进，改写了今朝九州风声。`
      );
    }
    return {
      actBanner: '卷三启幕 · 筑基前尘余波',
      title: '筑基入九州，六方势力渐明',
      bullets,
    };
  }

  if (sceneId === 'act4_opening') {
    const coreLabel =
      state.flags.core_grade === 'sword_core'
        ? '凝成【太古剑意金丹】，锋芒足可逆伐高阶。'
        : state.flags.core_grade === 'flawless'
        ? '凝成【九纹无瑕金丹】，五百载大道根基无缺。'
        : state.flags.core_grade === 'vein_core'
        ? '借九州灵脉凝成【地脉金丹】，底气充盈。'
        : state.flags.core_grade === 'blood_demon'
        ? '强炼【吞煞魔丹】，凶名震动九州正魔两道。'
        : '熬破金丹天堑，从此寿逾五百载。';
    bullets.push(`金丹道果：${coreLabel}`);

    if (state.tags.includes('sect_rebel')) {
      bullets.push('仙盟局势：云岭大议公开反目后你已背负【仙盟叛逆】之名，各大正道宗门严阵戒备。');
    } else if (state.tags.includes('alliance_envoy')) {
      bullets.push('仙盟局势：你身佩【仙盟客卿】印通行各宗，却也卷入正道高层的利益牵制。');
    }
    if (state.flags.xie_reformed_merchant) {
      bullets.push('商海局势：百宝总账堂公审后，谢无咎焚毁高利契改立仁商，与天机商行势同水火。');
    }
    if (isCompanionDeceased(state, 'su_zhiwei') && state.companions.su_zhiwei.met) {
      bullets.push('故人追思：苏知微已安然辞世，徒弟阿芸接过青州药庐与无灵医典。');
    }
    const missedAct3 = (ACT_MAJOR_THREADS.act3 ?? []).filter((t) =>
      Boolean(state.flags[`missed_${t}`])
    );
    if (missedAct3.length > 0) {
      bullets.push(
        `未及插手：卷三错过的【${missedAct3
          .map((t) => MAJOR_THREAD_LABELS[t] ?? t)
          .join('、')}】余波正汇入中州劫世风云。`
      );
    }
    return {
      actBanner: '卷四启幕 · 劫世因果回响',
      title: '金丹问中州，灵脉骤枯血契起',
      bullets,
    };
  }

  if (sceneId === 'act5_opening') {
    const inv = getInvestigationProgress(state, registry);
    bullets.push(`天机勘验：已集得 ${inv.totalClues} / 12 卷实证（${inv.tierLabel}）。`);
    if (state.tags.includes('sky_slayer_ally')) {
      bullets.push('绝渊同盟：你已重聚斩天会四纪残火，成为反抗三千年收割大局的核心旗手。');
    }
    if (state.flags.xie_new_order_founded) {
      bullets.push('商道新序：九州通兑公契击溃了天机商行商脉霸权，九州七十二重镇民心皆向公盟。');
    } else if (state.flags.act4_war_warlord) {
      bullets.push('铁血霸权：赤阳灵矿尽归你掌中，九州诸宗对你既敬且惧。');
    }
    if (state.tags.includes('cangming_reborn')) {
      bullets.push(
        isCompanionHostile(state, 'cang_ming')
          ? '太古故敌：苍溟虽已于寒渊雷夜重塑真身，昔年积怨却已决裂，天门之下恐有恶战。'
          : '太古故友：苍溟已于寒渊雷夜重塑真身，三千年前的碎天剑尊再度行走人间。'
      );
    } else if (isCompanionSealed(state, 'cang_ming')) {
      bullets.push('断玉归寂：焦黑断玉已永沉荒泽，再无古魂低语。');
    }
    const suAutoPassedInAct5 =
      getAgeYears(state.ageMonths) >= 75 &&
      Boolean(state.flags.su_zhiwei_saved_longlife) &&
      !state.flags.act4_mortal_truth_found;
    if (
      state.companions.su_zhiwei.met &&
      state.daoPartnerId !== 'su_zhiwei' &&
      (Boolean(state.flags.su_auto_passed_act5_opening) ||
        (suAutoPassedInAct5 &&
          !state.flags.su_zhiwei_passed &&
          !state.companions.su_zhiwei.deceased))
    ) {
      bullets.push('故人追思：闭关岁月漫长，苏知微已于槐阴药庐安然辞世，医典交由阿芸一脉传灯。');
    }
    if (
      state.daoPartnerId &&
      (isCompanionDeceased(state, state.daoPartnerId) ||
        (state.daoPartnerId === 'su_zhiwei' && suAutoPassedInAct5) ||
        isActiveDaoPartner(state, state.daoPartnerId))
    ) {
      const pName = registry.companions[state.daoPartnerId].name;
      const isPartnerDead =
        isCompanionDeceased(state, state.daoPartnerId) ||
        (state.daoPartnerId === 'su_zhiwei' && suAutoPassedInAct5);
      bullets.push(
        isPartnerDead
          ? `此生道侣：故去道侣【${pName}】的遗灯长明心底。`
          : state.daoPartnerId === 'su_zhiwei'
          ? `此生道侣：凡尘道侣【${pName}】仍守青州药庐一灯，与你遥隔山河、心念相系。`
          : `此生道侣：你与【${pName}】已定唯一道侣之契，共迎三千年裂穹大劫。`
      );
    }
    return {
      actBanner: '卷五启幕 · 元婴见天地',
      title: '三千年期将满，终战棋局落定',
      bullets,
    };
  }

  // act6_sky_gate
  const inv = getInvestigationProgress(state, registry);
  bullets.push(`此世天机：共集 ${inv.totalClues} / 12 卷证据（${inv.tierLabel}）。`);
  const vowMap: Record<string, string> = {
    bonded: '终战前夜立下【与挚友同生共死破天门】之誓。',
    solo: '终战前夜立下【孤身一剑独断九霄】之誓。',
    mortal: '终战前夜立下【红尘守灯 · 无灵归真】之愿。',
    severed: '风雪之中断尽旧缘，唯余孤锋问天。',
  };
  if (typeof state.flags.act5_final_vow === 'string' && vowMap[state.flags.act5_final_vow]) {
    bullets.push(vowMap[state.flags.act5_final_vow]);
  }
  if (
    state.daoPartnerId &&
    (isCompanionDeceased(state, state.daoPartnerId) ||
      isActiveDaoPartner(state, state.daoPartnerId))
  ) {
    const pName = registry.companions[state.daoPartnerId].name;
    bullets.push(
      isCompanionDeceased(state, state.daoPartnerId)
        ? `道侣印记：怀揣故去道侣【${pName}】留下的灯火，直面九霄金柱。`
        : state.daoPartnerId === 'su_zhiwei'
        ? `道侣寄望：怀揣青州道侣【${pName}】留下的无灵灯火与温茶嘱托，孤峰迎向九霄金柱。`
        : state.daoPartnerId === 'cang_ming' && !state.tags.includes('cangming_reborn')
        ? `道侣同行：此生唯一道侣【${pName}】以断玉剑魂随侍剑侧，共迎九霄天门。`
        : `道侣同行：此生唯一道侣【${pName}】已与你并肩迎向天门。`
    );
  }
  return {
    actBanner: '卷六终幕 · 百年因果汇流',
    title: '化神问道已成，天门就在眼前',
    bullets,
  };
}
