import {
  CompanionBondType,
  CompanionId,
  ContentRegistry,
  GameState,
} from './types';
import { getAgeYears, getSeason, toChineseYearNumber } from './time';
import { interpolateText } from './template';
import {
  isActiveDaoPartner,
  isCompanionDeceased,
  isCompanionHostile,
  isCompanionSealed,
  isDaoPartner,
  isMajorArcMissed,
} from './systems';

export function isSanctuaryClosed(state: GameState): boolean {
  return state.act === 'act6' || Boolean(state.endingId);
}

export function isSuAct4FarewellStage(state: GameState, cid: CompanionId): boolean {
  return (
    cid === 'su_zhiwei' &&
    state.act === 'act4' &&
    !isCompanionDeceased(state, 'su_zhiwei') &&
    getAgeYears(state.ageMonths) >= 75 &&
    !state.completedThreads.includes('thread_act4_mortal') &&
    !isMajorArcMissed(state, 'act4', 'thread_act4_mortal')
  );
}

export function isSuAct5SeniorStage(state: GameState, cid: CompanionId): boolean {
  return (
    cid === 'su_zhiwei' &&
    !isCompanionDeceased(state, 'su_zhiwei') &&
    getAgeYears(state.ageMonths) >= 75 &&
    (state.act === 'act5' ||
      (state.act === 'act4' && !isSuAct4FarewellStage(state, cid)))
  );
}

export interface SanctuaryActivityDef {
  id: string;
  label: string;
  subtext: string;
  tag: string;
  requiresPartner?: boolean;
  requiresBond?: boolean;
  deceasedOnly?: boolean;
  available: (state: GameState) => boolean;
}

export interface SanctuaryActionResult {
  ok: boolean;
  state: GameState;
  title: string;
  paragraphs: string[];
  notice: string;
}

const COMPANION_NAMES: Record<CompanionId, string> = {
  shen_qingshuang: '沈清霜',
  xie_wujiu: '谢无咎',
  su_zhiwei: '苏知微',
  cang_ming: '苍溟',
};

export const GIFT_TASTE_MATRIX: Record<
  CompanionId,
  Record<string, 'favorite' | 'liked' | 'neutral' | 'disliked'>
> = {
  shen_qingshuang: {
    golden_vein_sand: 'favorite',
    soul_amber: 'favorite',
    po_zhang_talisman: 'liked',
    ancient_rubbing: 'liked',
    spirit_marrow_oil: 'neutral',
    qingxin_herb: 'neutral',
  },
  xie_wujiu: {
    ancient_rubbing: 'favorite',
    soul_amber: 'favorite',
    golden_vein_sand: 'liked',
    spirit_marrow_oil: 'liked',
    po_zhang_talisman: 'neutral',
    qingxin_herb: 'disliked',
  },
  su_zhiwei: {
    qingxin_herb: 'favorite',
    spirit_marrow_oil: 'favorite',
    ancient_rubbing: 'liked',
    soul_amber: 'neutral',
    golden_vein_sand: 'neutral',
    po_zhang_talisman: 'disliked',
  },
  cang_ming: {
    soul_amber: 'favorite',
    golden_vein_sand: 'favorite',
    ancient_rubbing: 'liked',
    po_zhang_talisman: 'neutral',
    spirit_marrow_oil: 'neutral',
    qingxin_herb: 'disliked',
  },
};

function cloneStateForSanctuary(state: GameState): GameState {
  return {
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
      shen_qingshuang: {
        ...state.companions.shen_qingshuang,
        chronicle: [...state.companions.shen_qingshuang.chronicle],
        letters: [...(state.companions.shen_qingshuang.letters ?? [])],
      },
      xie_wujiu: {
        ...state.companions.xie_wujiu,
        chronicle: [...state.companions.xie_wujiu.chronicle],
        letters: [...(state.companions.xie_wujiu.letters ?? [])],
      },
      su_zhiwei: {
        ...state.companions.su_zhiwei,
        chronicle: [...state.companions.su_zhiwei.chronicle],
        letters: [...(state.companions.su_zhiwei.letters ?? [])],
      },
      cang_ming: {
        ...state.companions.cang_ming,
        chronicle: [...state.companions.cang_ming.chronicle],
        letters: [...(state.companions.cang_ming.letters ?? [])],
      },
    },
    market: {
      ...state.market,
      holdings: { ...state.market.holdings },
    },
    historyLog: [...state.historyLog],
    recentNotices: [],
  };
}

function appendUniqueChronicle(
  state: GameState,
  cid: CompanionId,
  body: string
): void {
  const resolved = interpolateText(body, state);
  const entry = `长明${state.year}年 · ${resolved}`;
  const list = state.companions[cid].chronicle;
  if (!list.some((x) => x === entry || x.endsWith(` · ${resolved}`))) {
    list.push(entry);
  }
}

function appendUniqueLetter(
  state: GameState,
  cid: CompanionId,
  id: string,
  title: string,
  body: string
): void {
  const letters = state.companions[cid].letters ?? [];
  if (letters.some((l) => l.id === id)) return;
  letters.push({
    id,
    year: state.year,
    title: interpolateText(title, state),
    body: interpolateText(body, state),
  });
  state.companions[cid].letters = letters;
}

export function getSanctuaryActivities(
  state: GameState,
  cid: CompanionId
): SanctuaryActivityDef[] {
  const comp = state.companions[cid];
  if (!comp.met) return [];
  if (isSanctuaryClosed(state)) return [];

  if (isCompanionDeceased(state, cid)) {
    return [
      {
        id: 'mourn_lantern',
        label: '老杏树下焚香祭茶',
        subtext: '替故人拂去碑前落花、温一盏清茶静坐片刻（每卷限 1 次，静心涤虑）。',
        tag: '故人追思',
        deceasedOnly: true,
        available: (s) => (s.actionUses[`${s.act}:sanctuary_mourn_${cid}`] ?? 0) < 1,
      },
    ];
  }

  if (
    isCompanionSealed(state, cid) ||
    isCompanionHostile(state, cid) ||
    isSuAct4FarewellStage(state, cid)
  ) {
    return [];
  }

  const bonded =
    comp.bondType === 'dao_partner' ||
    comp.bondType === 'sworn' ||
    comp.affection >= 75;
  const partner = isDaoPartner(state, cid);
  const isHighRealm =
    state.act === 'act3' || state.act === 'act4' || state.act === 'act5';

  if (cid === 'shen_qingshuang') {
    const list: SanctuaryActivityDef[] = [
      {
        id: 'shen_tea_sword',
        label: isHighRealm ? '松崖石案共推剑阵' : '寒亭清泉切磋剑路',
        subtext: isHighRealm
          ? '以真剑合演破禁剑势，磨砺修为并深化默契（每卷限 1 次）。'
          : '对坐论剑听松，彼此印证剑理与心境（每卷限 1 次）。',
        tag: '日常雅叙',
        available: (s) => (s.actionUses[`${s.act}:sanctuary_act_shen_qingshuang`] ?? 0) < 1,
      },
    ];
    if (bonded) {
      list.push({
        id: 'shen_dual_cultivate',
        label: partner ? '【道侣专属】霜月双修 · 剑心共鸣' : '【挚交专属】双剑合璧 · 破阶演锋',
        subtext: partner
          ? '与道侣霜剑同频、气息交融，大涨修为心境并凝练越阶锋芒（每卷限 1 次）。'
          : '生死挚交共推碎天剑势，修为与越阶剑意俱进（每卷限 1 次）。',
        tag: partner ? '道侣双修' : '挚交合剑',
        requiresBond: true,
        requiresPartner: partner,
        available: (s) => (s.actionUses[`${s.act}:sanctuary_bond_shen_qingshuang`] ?? 0) < 1,
      });
    }
    return list;
  }

  if (cid === 'xie_wujiu') {
    const list: SanctuaryActivityDef[] = [
      {
        id: 'xie_chess_ledger',
        label: isHighRealm ? '暗楼推演九州商局' : '雅间手谈对拆坊市账',
        subtext: isHighRealm
          ? '共盘各城灵矿盈亏，得商路分红并可请他代为留意暗桩（每卷限 1 次）。'
          : '煮茶手谈兼论三行货价虚实，增心境与些许拆借盈余（每卷限 1 次）。',
        tag: '日常雅叙',
        available: (s) => (s.actionUses[`${s.act}:sanctuary_act_xie_wujiu`] ?? 0) < 1,
      },
    ];
    if (bonded) {
      list.push({
        id: 'xie_deadman_candle',
        label: partner ? '【道侣专属】红烛共算 · 百宝死手同契' : '【挚交专属】暗网托底 · 死手密信互保',
        subtext: partner
          ? '与道侣共掌百宝暗桩总印，得丰厚红利并立下全域死手威慑网（每卷限 1 次）。'
          : '彼此互留秘档暗信于七十二城暗桩，面对高阶强敌可增死手筹码（每卷限 1 次）。',
        tag: partner ? '道侣同契' : '挚交死手',
        requiresBond: true,
        requiresPartner: partner,
        available: (s) => (s.actionUses[`${s.act}:sanctuary_bond_xie_wujiu`] ?? 0) < 1,
      });
    }
    return list;
  }

  if (cid === 'su_zhiwei') {
    const isRemote = state.act === 'act4' || state.act === 'act5';
    const list: SanctuaryActivityDef[] = [
      {
        id: 'su_brew_tea',
        label: isRemote
          ? '青州驿札 · 隔空校勘《无灵医典》'
          : isHighRealm
          ? '药庐灯下共校《无灵医典》'
          : '杏林檐下晒草烹桂花茶',
        subtext: isRemote
          ? '山河相隔，借青州驿马往来尺素对校凡人脉案，涤荡躁气、心境大进（每卷限 1 次）。'
          : isHighRealm
          ? '替她研磨朱砂、校勘凡人脉案，涤荡心魔躁气、心境大进（每卷限 1 次）。'
          : '卸下佩剑帮她晾药烹茶，拂去尘途戾气、温养道心（每卷限 1 次）。',
        tag: isRemote ? '驿路鸿书' : '日常雅叙',
        available: (s) => (s.actionUses[`${s.act}:sanctuary_act_su_zhiwei`] ?? 0) < 1,
      },
    ];
    if (bonded) {
      list.push({
        id: 'su_hearth_pulse',
        label: isRemote
          ? partner
            ? '【道侣专属】尺素遥寄 · 桂香暖心'
            : '【挚交专属】青州驿札 · 守望灯火'
          : partner
          ? '【道侣专属】红尘温脉 · 竹篱共灯'
          : '【挚交专属】渡气安脉 · 杏林守灯',
        subtext: isRemote
          ? partner
            ? '拆读青州结发道侣冒风寄来的长信与桂花药包，澄明心境并化解早年血煞残印（每卷限 1 次）。'
            : '细读青州驿马捎来的医馆近况与温补药帖，守望人间灯火（每卷限 1 次）。'
          : partner
          ? '以温和真元替凡尘道侣驱寒温脉、共度静夜，可大幅澄明心境并化解早年血煞残印（每卷限 1 次）。'
          : '以柔和灵息替她疏解积劳寒气，彼此守望人间灯火（每卷限 1 次）。',
        tag: partner ? (isRemote ? '道侣鸿书' : '道侣温脉') : '挚交护脉',
        requiresBond: true,
        requiresPartner: partner,
        available: (s) => (s.actionUses[`${s.act}:sanctuary_bond_su_zhiwei`] ?? 0) < 1,
      });
    }
    return list;
  }

  // cang_ming
  const reborn = state.tags.includes('cangming_reborn');
  const list: SanctuaryActivityDef[] = [
    {
      id: 'cm_sword_lecture',
      label: reborn ? '夜院提剑实拆古招' : '识海听剑 · 拆解上古杀伐诀',
      subtext: reborn
        ? '与重塑真身的太古剑尊真剑交锋，大幅磨砺实战与越阶锋芒（每卷限 1 次）。'
        : '向三千年前古魂请教以弱胜强之剑理，提升修为与越阶战力（每卷限 1 次）。',
      tag: '古剑问锋',
      available: (s) => (s.actionUses[`${s.act}:sanctuary_act_cang_ming`] ?? 0) < 1,
    },
  ];
  if (bonded) {
    list.push({
      id: 'cm_ancient_resonance',
      label: partner
        ? reborn
          ? '【道侣专属】并肩醉剑 · 长明双锋'
          : '【道侣专属】神魂共剑 · 残玉同鸣'
        : '【挚交专属】碎天古意 · 越阶借锋',
      subtext: partner
        ? '与太古剑尊心神彻底相契，修为心境双进且令越阶战力大涨（每卷限 1 次）。'
        : '太古剑尊倾囊相授破阶杀招，大幅提升高阶抗衡底气（每卷限 1 次）。',
      tag: partner ? '道侣双锋' : '挚交古意',
      requiresBond: true,
      requiresPartner: partner,
      available: (s) => (s.actionUses[`${s.act}:sanctuary_bond_cang_ming`] ?? 0) < 1,
    });
  }
  return list;
}

export function performSanctuaryActivity(
  state: GameState,
  cid: CompanionId,
  activityId: string
): SanctuaryActionResult {
  const next = cloneStateForSanctuary(state);
  const comp = next.companions[cid];
  const name = COMPANION_NAMES[cid];
  const partner = isDaoPartner(next, cid);

  if (!comp.met) {
    return {
      ok: false,
      state,
      title: '素未谋面',
      paragraphs: ['尚无此人缘分，无从雅叙。'],
      notice: '尚未结识此人',
    };
  }
  if (isSanctuaryClosed(state)) {
    return {
      ok: false,
      state,
      title: state.endingId ? '此世已终' : '天门在即',
      paragraphs: [
        state.endingId
          ? '此世因果已然落笔，雅阁暂闭，唯余过往尺素与共历编年可览。'
          : '九霄天门洞开在即，此刻唯余迎劫落子，无暇雅叙。',
      ],
      notice: state.endingId ? '终局已定，不可再行雅叙' : '卷六天门终战期间不可雅叙',
    };
  }
  if (isSuAct4FarewellStage(next, cid)) {
    return {
      ok: false,
      state,
      title: '红尘暮年',
      paragraphs: ['故人已届耄耋暮年，请亲赴青州槐阴见她最后一面。'],
      notice: '故人垂暮，请亲赴青州槐阴相见',
    };
  }

  if (activityId === 'mourn_lantern' && isCompanionDeceased(next, cid)) {
    const key = `${next.act}:sanctuary_mourn_${cid}`;
    if ((next.actionUses[key] ?? 0) >= 1) {
      return {
        ok: false,
        state,
        title: '杏林清寂',
        paragraphs: ['本卷已往老杏树下焚香祭茶，墓前桂香未散，且把这份安宁留在心间罢。'],
        notice: '本卷已祭扫追思',
      };
    }
    next.actionUses[key] = (next.actionUses[key] ?? 0) + 1;
    next.mind += 8;
    const keeperName =
      getAgeYears(next.ageMonths) >= 120 ? '阿芸一脉传人' : '阿芸';
    const paragraphs = partner
      ? [
          `老杏树枝叶婆娑，树下那方青石碑被${keeperName}每日拭得纤尘不染。你温了一壶新采的桂花茶，轻轻浇在碑前泥土上。`,
          '山风吹过空荡药庐，仿佛又听见她轻声唤你“别总绷着剑心，坐下喝口热的”。百年仙途寒凉，唯她生前留给你的这点暖意，始终护着你的灵台清明。',
        ]
      : [
          '你在青州老杏树下点起三炷清香，替碑角拂去新落的白瓣，静静坐了一炷香工夫。',
          '故人虽已归尘，那盏不求长生、唯护凡尘的药炉灯火，却让你躁动的道心重新沉静下来。',
        ];
    next.recentNotices = ['老杏树下焚香追思，心境沉静（心境 +8）'];
    return {
      ok: true,
      state: next,
      title: '老杏树下 · 焚香祭茶',
      paragraphs: paragraphs.map((p) => interpolateText(p, next)),
      notice: '心境 +8，阴阳两隔而余温长存',
    };
  }

  if (isCompanionDeceased(next, cid) || isCompanionSealed(next, cid) || isCompanionHostile(next, cid)) {
    return {
      ok: false,
      state,
      title: '缘法难续',
      paragraphs: ['彼此已无相见雅叙之机。'],
      notice: '当前无法互动',
    };
  }

  const isBondAct =
    activityId === 'shen_dual_cultivate' ||
    activityId === 'xie_deadman_candle' ||
    activityId === 'su_hearth_pulse' ||
    activityId === 'cm_ancient_resonance';

  const useKey = `${next.act}:${isBondAct ? 'sanctuary_bond' : 'sanctuary_act'}_${cid}`;
  if ((next.actionUses[useKey] ?? 0) >= 1) {
    return {
      ok: false,
      state,
      title: '暂且留白',
      paragraphs: [`本卷已与${name}深叙过一回，彼此各有修行与尘务，待步入新境后再聚。`],
      notice: '本卷此项雅叙已用尽',
    };
  }

  next.actionUses[useKey] = (next.actionUses[useKey] ?? 0) + 1;
  comp.lastSeenAgeMonths = next.ageMonths;

  let title = '';
  let paragraphs: string[] = [];
  let notice = '';

  const isHighRealm =
    next.act === 'act3' || next.act === 'act4' || next.act === 'act5';
  const isRemoteSu = next.act === 'act4' || next.act === 'act5';

  if (activityId === 'shen_tea_sword') {
    next.might += isHighRealm ? 9 : 6;
    next.mind += isHighRealm ? 7 : 5;
    comp.affection = Math.min(500, comp.affection + 5);
    title = isHighRealm ? '松崖石案 · 共推剑阵' : '寒松对剑 · 剑心相印';
    paragraphs = isHighRealm
      ? [
          '崖顶云卷，松涛声如潮。沈清霜以剑尖在青石上划出三道破禁阵图，与你真剑交锋十余合，清冽剑意撞得满阶松针骤起。收剑时她额角微汗，眸光湛然：“如今你我的剑势已能互为犄角，纵遇大宗合围亦有破阵之机。”',
          '两人并坐石案对饮寒泉，九州风雪暂时止于崖外，胸中锋芒却磨砺得愈发沉雄。',
        ]
      : [
          '松影压阶，霜风自林梢滚落。沈清霜以鞘代剑拆解了你三处变招滞涩，收势时淡淡颔首：“比上回干净多了。你的剑开始有自己的骨头了。”',
          '两人坐于石案对饮冷泉，外头仙盟与灵脉的喧嚣暂退身外，你胸中那缕剑意也愈发澄澈凝练。',
        ];
    notice = isHighRealm
      ? '修为 +9 · 心境 +7 · 与沈清霜剑阵愈契'
      : '修为 +6 · 心境 +5 · 与沈清霜默契更深';
  } else if (activityId === 'shen_dual_cultivate') {
    next.might += partner ? 12 : 9;
    next.mind += partner ? 10 : 7;
    if (!next.tags.includes('sword_intent_seed')) next.tags.push('sword_intent_seed');
    if (next.act === 'act2') {
      next.flags.overmatch_drill_act2 = true;
    } else if (next.act !== 'act1') {
      next.flags.overmatch_drill_act3 = true;
    }
    comp.affection = Math.min(500, comp.affection + 6);
    title = partner ? '霜月双修 · 剑心共鸣' : '双剑合璧 · 破阶演锋';
    paragraphs = partner
      ? [
          '月色如霜泼满剑庐石台。你与沈清霜相对盘膝，两柄本命佩剑横于膝间轻轻共振，清冽灵气随周天往复交融，将彼此经脉间暗藏的寒煞与滞涩一点点涤净。',
          '收功时她指尖仍轻轻覆在你腕脉上，清冷眼底映着灯影与你：“往后破关也好，问天也罢，你只管往前递剑，背后永远有我。”',
        ]
      : [
          '松崖绝风里，你与沈清霜不再留手，三十余合真剑相交竟激出一道贯空霜虹！合击之势已具越阶破防之威，彼此会心一笑，尽在不言中。',
        ];
    appendUniqueChronicle(
      next,
      cid,
      partner
        ? '霜月静夜与你双修共鸣剑心，修为与越阶锋芒俱进。'
        : '松崖绝顶与你真剑合演破阶剑阵，战意相契。'
    );
    notice = partner
      ? '道侣双修：修为 +12 · 心境 +10 · 越阶锋芒提升'
      : '挚交合剑：修为 +9 · 心境 +7 · 越阶锋芒提升';
  } else if (activityId === 'xie_chess_ledger') {
    const bonusStones = next.act === 'act4' || next.act === 'act5' ? 110 : 55;
    next.spiritStones += bonusStones;
    next.mind += isHighRealm ? 7 : 5;
    comp.affection = Math.min(500, comp.affection + 5);
    title = isHighRealm ? '暗楼推演 · 九州商局' : '暗楼对弈 · 商海拆局';
    paragraphs = isHighRealm
      ? [
          '玄铁折扇点在铺满长案的九州灵矿舆图上。谢无咎将七十二城近日断脉与粮药起落的暗报逐一拆给你看，笑意里藏着几分深沉：“灵脉越枯，大宗越慌，偏偏这当口最见谁家底仓见了底。”',
          `一番推演落定，他顺手把一条稳健商路的过境暗股划进你名下，净得${toChineseYearNumber(bonusStones)}灵石红利，你对九州各派的虚实也看得愈发透亮。`,
        ]
      : [
          '玄铁折扇在案沿轻叩两下。谢无咎推过一局残棋，顺手把几张刚从各地飞鸽传回的矿行急报摊在你面前：“旁人只看涨跌，我带你看看谁在暗地里借势洗货。”',
          `半局手谈落定，你借他指点的商路间隙顺手吃下一笔${toChineseYearNumber(bonusStones)}灵石的稳健分红，眼界也比先前老辣了三分。`,
        ];
    notice = `灵石 +${bonusStones} · 心境 +${isHighRealm ? 7 : 5} · 与谢无咎交情渐深`;
  } else if (activityId === 'xie_deadman_candle') {
    const bonusStones = next.act === 'act4' || next.act === 'act5' ? 160 : 90;
    next.spiritStones += bonusStones;
    next.renown += 6;
    next.flags.xie_deadman_switch = true;
    comp.affection = Math.min(500, comp.affection + 6);
    title = partner ? '红烛共算 · 百宝死手同契' : '暗网托底 · 死手密信互保';
    paragraphs = partner
      ? [
          '红烛剪过两回花，谢无咎罕见地收起所有玩世不恭，把一枚双鱼合契的玄铁暗印推入你掌心：“百宝斋七十二城暗桩都认这半枚印。往后无论你撞上哪个金丹老鬼，只要我还在世上一日，他们动你一根指头，次日天明全九州茶楼就会贴满他们的祖宗脏账。”',
          '他笑着替你续满热酒，眼底亮得惊人：“我这辈子最划算的一笔买卖，就是把自己押给你。”',
        ]
      : [
          '谢无咎在七十二城暗桩里替你单开了一道死手密渠：凡你经手的黑账副本皆可密寄百宝分号，一旦你身陷险境，暗网立时满城散播。有此死手压阵，面对高阶强敌亦多了几分谈判筹码。',
        ];
    appendUniqueChronicle(
      next,
      cid,
      partner
        ? '红烛夜话间将百宝总号暗印相托，与你立下全域死手同契。'
        : '以百宝七十二城暗桩替你布下死手密渠，彼此互为后盾。'
    );
    notice = `获得【百宝暗桩死手威慑】· 灵石 +${bonusStones} · 声望 +6`;
  } else if (activityId === 'su_brew_tea') {
    next.mind += isHighRealm ? 11 : 9;
    next.alignment.worldly = Math.min(100, next.alignment.worldly + 5);
    comp.affection = Math.min(500, comp.affection + 5);
    title = isRemoteSu
      ? '青州驿札 · 隔空校典'
      : isHighRealm
      ? '药庐灯下 · 共校医典'
      : '竹篱煮茶 · 凡尘温墨';
    paragraphs = isRemoteSu
      ? [
          '窗外劫云沉沉，青州驿马却准时送来一卷裹着油布的新誊《无灵医典》残册，夹页里压着两朵晒透的干桂花。苏知微清秀微颤的眉批写得极细，字里行间全是凡俗乡邻的寒暑脉案。',
          '你在孤灯下研墨替她逐条校补药性批注，再封缄托驿卒回寄青州。虽隔千里山河，那缕淡淡桂香却把胸中连月积郁的躁厉涤得一干二净。',
        ]
      : isHighRealm
      ? [
          '青州夜雨敲打窗棂，案头《无灵医典》已积了厚厚三摞。苏知微鬓边添了几缕清霜，执朱笔一页页核对无灵孩童的安康脉案，见你替她研墨掌灯，眉眼柔和如昔。',
          '灯芯轻爆。你陪她校完两卷凡尘医案，听着檐雨滴落，连日周旋九州大势攒下的浮躁杀气，在这方小小灯火里尽数沉静下来。',
        ]
      : [
          '炉上砂壶咕嘟冒着白气，桂花与陈皮的苦甜漫过竹案。苏知微安静听你讲起外头山河的风雨，并不催问境界高低，只细心把刚晾温的药茶递到你手边。',
          '你替她研墨校完两页凡人脉案。窗外暮色沉落，你胸中连月积攒的浮躁与杀气，竟在这小小的药庐灯火里化得干干净净。',
        ];
    notice = `心境 +${isHighRealm ? 11 : 9} · 红尘道心更稳 · ${isRemoteSu ? '千里鸿书慰心' : '苏知微眉眼柔和'}`;
  } else if (activityId === 'su_hearth_pulse') {
    const mindGain = partner ? 15 : 11;
    next.mind += mindGain;
    next.alignment.worldly = Math.min(100, next.alignment.worldly + 8);
    const cleansed = partner && next.tags.includes('blood_pill_tainted');
    if (cleansed) {
      next.tags = next.tags.filter((t) => t !== 'blood_pill_tainted');
    }
    comp.affection = Math.min(500, comp.affection + 6);
    const cultPhrase =
      next.realm === 'nascent_soul' || next.realm === 'deity_transform'
        ? '千载修为'
        : next.realm === 'golden_core'
        ? '金丹真元'
        : '一身灵息';
    title = isRemoteSu
      ? partner
        ? '尺素遥寄 · 桂香暖心'
        : '青州驿札 · 守望灯火'
      : partner
      ? '红尘温脉 · 竹篱共灯'
      : '渡气安脉 · 杏林守灯';
    paragraphs = isRemoteSu
      ? partner
        ? [
            '山风透窗，你拆开青州结发道侣托快马送来的旧木药匣。里头是一包刚焙透的秋桂安神散，并一封字迹清稳的长信：“外头风霜重，我守着药炉替你温着茶，替我照看好自己。莫为了早些赶回来，拿身子去硬顶那些雷火。”',
            cleansed
              ? '药香伴着信纸上的叮咛散入灵台，你经脉深处早年沾染的血煞残灰竟在这一片澄明暖意中悄然褪尽。'
              : '千里之外杏林一灯如豆。你把回信连同护寒灵药一并封好交与驿卒，无论前路如何倾轧，此心终归有了落处。',
          ]
        : [
            '青州驿马送来一帖新配的桂花安神散与一纸素笺，字里行间仍惦念着你在中州风浪里可曾安好。一盏清茶下肚，你的心境亦在人间烟火里愈发澄明。',
          ]
      : partner
      ? [
          `夜风凉透杏枝。你握住她微微发凉的手腕，将自身灵力敛成极柔和的一缕春息，顺着肺经缓缓替她驱散积年药寒。苏知微靠在你肩侧轻叹：“旁人修仙都盼着忘情绝念，偏你肯把${cultPhrase}拿来替我暖一双手。”`,
          cleansed
            ? '两心澄澈相照之间，你经脉深处早年沾染的血煞残灰竟悄然褪尽，灵台温润如玉。'
            : '长夜无声，杏林一灯如豆。无论外头九霄如何倾轧，此心终归有了落处。',
        ]
      : [
          '你替苏知微引气疏通肺腑寒气，她气色肉眼可见地红润半分。两人于药炉前静坐谈医，你的心境亦在人间烟火里愈发澄明。',
        ];
    appendUniqueChronicle(
      next,
      cid,
      isRemoteSu
        ? partner
          ? '千里山河相隔，青州鸿书与秋桂药香常伴灯前，结发之情历久弥温。'
          : '万里驿书往来互报平安，彼此守望人间灯火。'
        : partner
        ? '杏林静夜你以柔息替她温脉驱寒，红尘结发之情愈深。'
        : '赴药庐以真元替她疏解积劳寒气，守望凡尘灯火。'
    );
    notice = cleansed
      ? `心境 +${mindGain} · 涤尽【血丹染煞】残印！`
      : `心境 +${mindGain} · 红尘温润`;
  } else if (activityId === 'cm_sword_lecture') {
    const reborn = next.tags.includes('cangming_reborn');
    next.might += 8;
    if (next.act !== 'act1') {
      next.flags.overmatch_drill_act2 = true;
    }
    comp.affection = Math.min(500, comp.affection + 5);
    title = reborn ? '夜院问剑 · 破阶秘理' : '识海听剑 · 破阶秘理';
    paragraphs = reborn
      ? [
          '苍溟抱臂冷哼，随手划出一道三千年前的破甲剑弧：“今世修士斗法蠢得像抡石杵，只知拿境界灵压硬砸。遇着高境老贼，就得专攻他灵流换气的半息死穴！”',
          '一番尖刻点拨虽不留半点情面，拆进实战里却字字见血。你反复推演数遍，越阶搏杀的底气扎扎实实厚了一截。',
        ]
      : [
          '焦黑断玉悬于身前，一缕冰冷古剑意直接映入你识海。苍溟冷笑的声音自心湖响起：“今世修士斗法蠢得像抡石杵，只知拿境界灵压硬砸。遇着高境老贼，就得专攻他灵流换气的半息死穴！”',
          '一缕残魂在识海里拆解古招，言辞虽刻薄却字字见血。你依势反复演剑，越阶搏杀的底气扎扎实实厚了一截。',
        ];
    notice = '修为 +8 · 领悟越阶剑理 · 苍溟难得颔首';
  } else if (activityId === 'cm_ancient_resonance') {
    const reborn = next.tags.includes('cangming_reborn');
    const knowsChangming = next.truthClues.includes('clue_changming_night');
    next.might += partner ? 14 : 11;
    next.mind += partner ? 8 : 5;
    if (next.act === 'act2') {
      next.flags.overmatch_drill_act2 = true;
    } else if (next.act !== 'act1') {
      next.flags.overmatch_drill_act3 = true;
    }
    comp.affection = Math.min(500, comp.affection + 6);
    title = partner
      ? reborn
        ? '并肩醉剑 · 长明双锋'
        : '神魂共剑 · 残玉同鸣'
      : '碎天古意 · 越阶借锋';
    paragraphs = partner
      ? reborn
        ? [
            '星野垂寒，两坛烈酒泼湿青阶。苍溟将一缕三千年前未曾示人的碎天剑意稳稳渡入你气海，眉骨焦疤在月色下少了戾气，多了几分罕见的郑重：“三千年孤魂野鬼当腻了。往后不管头顶塌下什么天，本座的剑与你的剑，合在一处递出去。”',
          ]
        : [
            '夜色如墨，焦黑断玉悬浮膝前，一缕澄澈青辉缓缓渡入你气海。苍溟虚影凝于灯下，那道隔着三千年的嗓音罕见地沉静下来：“三千年孤魂当腻了。往后不管头顶塌下什么天，本座这缕剑意与你的剑，合在一处递出去。”',
          ]
      : [
          knowsChangming
            ? '苍溟将当年九剑尊合击碎天的一式残锋拆给你研习，凌厉古意渗入丹田，令你面对高阶大能亦多了一记杀手锏。'
            : '苍溟将三千年前秘传的一式破境残锋拆给你研习，凌厉古意渗入丹田，令你面对高阶大能亦多了一记杀手锏。',
        ];
    appendUniqueChronicle(
      next,
      cid,
      partner
        ? reborn
          ? '月下醉剑、双锋共鸣，三千年剑尊将最深一缕碎天剑意交托于你。'
          : '残玉青辉贯入识海，三千年古魂将最深一缕碎天剑意交托于你。'
        : knowsChangming
        ? '倾囊传授长明碎天杀招，助你蓄足越阶锋芒。'
        : '倾囊传授太古破境杀招，助你蓄足越阶锋芒。'
    );
    notice = partner
      ? '道侣双锋：修为 +14 · 心境 +8 · 越阶杀伐大涨'
      : '挚交古意：修为 +11 · 心境 +5 · 越阶战力大涨';
  }

  next.recentNotices = [notice];
  return {
    ok: true,
    state: next,
    title,
    paragraphs: paragraphs.map((p) => interpolateText(p, next)),
    notice,
  };
}

export function giveSanctuaryGift(
  state: GameState,
  cid: CompanionId,
  goodId: string,
  registry: ContentRegistry
): SanctuaryActionResult {
  const comp = state.companions[cid];
  const goodDef = registry.marketGoods[goodId];
  const name = COMPANION_NAMES[cid];

  if (!comp.met || !goodDef) {
    return {
      ok: false,
      state,
      title: '赠礼不成',
      paragraphs: ['行囊中无此物或故人未识。'],
      notice: '无法赠礼',
    };
  }
  if (isSanctuaryClosed(state)) {
    return {
      ok: false,
      state,
      title: state.endingId ? '此世已终' : '天门在即',
      paragraphs: [
        state.endingId
          ? '此世因果已然落笔，此刻无暇再行馈赠。'
          : '九霄天门洞开在即，此刻无暇馈赠尘物。',
      ],
      notice: state.endingId ? '终局已定，不可再行赠礼' : '卷六天门终战期间不可赠礼',
    };
  }
  if (
    isCompanionDeceased(state, cid) ||
    isCompanionSealed(state, cid) ||
    isCompanionHostile(state, cid) ||
    isSuAct4FarewellStage(state, cid)
  ) {
    return {
      ok: false,
      state,
      title: '无处相赠',
      paragraphs: ['故人阴阳两隔、垂暮将别或道途决裂，此物已无处送达。'],
      notice: '当前无法赠礼',
    };
  }

  const holding = state.market.holdings[goodId];
  if (!holding || holding.qty <= 0) {
    return {
      ok: false,
      state,
      title: '行囊空缺',
      paragraphs: [`行囊中暂未备有【${goodDef.name}】，可先往坊市购置。`],
      notice: `未持有【${goodDef.name}】`,
    };
  }

  const giftKey = `${state.act}:sanctuary_gift_${cid}`;
  if ((state.actionUses[giftKey] ?? 0) >= 1) {
    return {
      ok: false,
      state,
      title: '礼不在繁',
      paragraphs: [`本卷已赠过${name}心意之物，频频送礼反倒显得生分。`],
      notice: '每卷对同一故人限赠礼 1 次',
    };
  }

  const next = cloneStateForSanctuary(state);
  next.actionUses[giftKey] = 1;
  const nextQty = holding.qty - 1;
  if (nextQty <= 0) {
    delete next.market.holdings[goodId];
  } else {
    next.market.holdings[goodId] = { ...holding, qty: nextQty };
  }

  const taste = GIFT_TASTE_MATRIX[cid][goodId] ?? 'neutral';
  const delta =
    taste === 'favorite' ? 10 : taste === 'liked' ? 6 : taste === 'neutral' ? 2 : -4;
  next.companions[cid].affection = Math.max(
    -100,
    Math.min(500, next.companions[cid].affection + delta)
  );
  next.companions[cid].lastSeenAgeMonths = next.ageMonths;

  const isRemoteSu = next.act === 'act4' || next.act === 'act5';
  const cmReborn = next.tags.includes('cangming_reborn');

  let response = '';
  if (taste === 'favorite') {
    if (cid === 'shen_qingshuang') {
      response = `沈清霜指尖拂过【${goodDef.name}】，冰冷眉梢罕见地化开一丝柔和：“正合我淬剑定神之用。你倒总记得我缺什么。”`;
    } else if (cid === 'xie_wujiu') {
      response = `谢无咎接过【${goodDef.name}】细看半晌，折扇一收笑得真心实意：“好眼力，这正是我高价寻不到的紧俏孤品。这份人情我记账上了！”`;
    } else if (cid === 'su_zhiwei') {
      response = isRemoteSu
        ? `你托青州快马将【${goodDef.name}】封匣寄往杏林医馆。旬日后驿卒带回苏知微一纸素笺，字里行间欣喜难掩：“坊市里这味灵材贵得吓人，医馆正缺它救重症呢。千里之外还劳你替百姓惦记着。”`
        : `苏知微捧着【${goodDef.name}】眼眶微微一亮：“坊市里这味灵材贵得吓人，医馆正缺它救重症呢。多谢你总替百姓惦记着。”`;
    } else {
      response = cmReborn
        ? `苍溟哼了一声，随手将【${goodDef.name}】收进剑息温养：“倒还算你这小辈有些眼力，这东西成色勉强入得本座法眼。”`
        : `焦黑断玉骤起一缕清光，将【${goodDef.name}】灵气卷入玉纹之中。苍溟冷哼的声音自识海响起：“倒还算你这小辈有些眼力，这东西成色勉强入得本座法眼。”`;
    }
  } else if (taste === 'liked') {
    if (cid === 'cang_ming') {
      response = cmReborn
        ? `苍溟睨了【${goodDef.name}】一眼，虽未多言，仍随手将其纳入袖中：“成色尚可，算你有点长进。”`
        : `焦黑断玉轻颤半息，将【${goodDef.name}】的一缕灵韵吸纳殆尽。苍溟自识海冷淡丢下一句：“成色尚可，算你有点长进。”`;
    } else if (cid === 'su_zhiwei' && isRemoteSu) {
      response = `你托驿马将【${goodDef.name}】寄往青州药庐。苏知微很快回笺致谢，字迹温润，透着几分难得的喜意。`;
    } else {
      response = `${name}接过【${goodDef.name}】，微微颔首道谢，神色较平日亲和了几分。`;
    }
  } else if (taste === 'neutral') {
    if (cid === 'cang_ming') {
      response = cmReborn
        ? `苍溟扫了【${goodDef.name}】一眼，兴致缺缺地随手收下：“寻常货色，聊胜于无。”`
        : `焦黑断玉微不可察地亮了一瞬，将【${goodDef.name}】的气息淡漠卷走：“寻常货色，聊胜于无。”`;
    } else if (cid === 'su_zhiwei' && isRemoteSu) {
      response = `你托驿马将【${goodDef.name}】捎往青州杏林。苏知微回笺礼数周全地致谢，言语客气而克制。`;
    } else {
      response = `${name}礼数周全地收下【${goodDef.name}】，客气致谢，却并未显出太多波澜。`;
    }
  } else {
    if (cid === 'su_zhiwei') {
      response = isRemoteSu
        ? `你托驿马将【${goodDef.name}】寄往青州。旬日后驿卒带回苏知微一纸轻叹的回笺：“医馆只救人、不涉斗法杀伐，那件器物我已托邻村善人转赠游方道士。你的好意我心领，往后莫寄这类物件了。”`
        : `苏知微看着锋芒逼人的【${goodDef.name}】，轻叹着推回半寸：“医馆只救人、不涉斗法杀伐。你的好意我心领，往后莫送这类物件了。”`;
    } else if (cid === 'xie_wujiu') {
      response = `谢无咎摇扇失笑：“【${goodDef.name}】？街口药铺一文钱能买三捆的寻常货，{{honorific}}这是拿我打趣呢？”`;
    } else {
      response = cmReborn
        ? `苍溟嗤笑一声，连看都懒得多看【${goodDef.name}】一眼：“拿这种凡俗草屑糊弄三千年前的剑尊，你是诚心来折辱本座的？”`
        : `焦黑断玉纹丝不动，苍溟在识海里嗤笑一声：“拿这种凡俗草屑糊弄三千年前的剑尊，你是诚心来折辱本座的？”`;
    }
  }

  const notice =
    taste === 'favorite'
      ? `正合心意！${name}欣然收下【${goodDef.name}】`
      : taste === 'disliked'
      ? `投其所忌：${name}对【${goodDef.name}】兴致寥寥`
      : `${name}收下了【${goodDef.name}】`;

  next.recentNotices = [notice];
  return {
    ok: true,
    state: next,
    title: `赠礼 · 【${goodDef.name}】`,
    paragraphs: [interpolateText(response, next)],
    notice,
  };
}

export function canTriggerMilestone1(state: GameState, cid: CompanionId): boolean {
  const comp = state.companions[cid];
  if (!comp.met) return false;
  if (state.act === 'act1' || isSanctuaryClosed(state)) return false;
  if (
    isCompanionDeceased(state, cid) ||
    isCompanionSealed(state, cid) ||
    isCompanionHostile(state, cid) ||
    isSuAct4FarewellStage(state, cid) ||
    isSuAct5SeniorStage(state, cid)
  ) {
    return false;
  }
  return (comp.milestoneStage ?? 0) < 1 && comp.affection >= 30;
}

export function triggerMilestone1(
  state: GameState,
  cid: CompanionId
): SanctuaryActionResult {
  if (!canTriggerMilestone1(state, cid)) {
    return {
      ok: false,
      state,
      title: '时机未至',
      paragraphs: [
        state.act === 'act1'
          ? '尚在青岚凡胎初识之境，待引气入道、共历风霜后再行夜话。'
          : isSuAct5SeniorStage(state, cid)
          ? '故人已届耄耋高龄、远居青州安养，唯余尺素往来相伴。'
          : '彼此交情尚浅，待情谊渐深后再行深谈。',
      ],
      notice: '当前尚未满足知交夜话契机',
    };
  }
  const next = cloneStateForSanctuary(state);
  const comp = next.companions[cid];
  comp.milestoneStage = 1;
  comp.affection = Math.min(500, comp.affection + 5);
  comp.lastSeenAgeMonths = next.ageMonths;

  let title = '';
  let paragraphs: string[] = [];
  let letterTitle = '';
  let letterBody = '';
  const isRemoteSu = next.act === 'act4' || next.act === 'act5';

  if (cid === 'shen_qingshuang') {
    next.mind += 8;
    next.might += 4;
    title = '知交夜话 · 寒霜卸甲';
    const shenDoubtText = next.truthClues.includes('clue_stele_gap')
      ? '一个人盯着飞升碑后的疑影发呆'
      : '一个人盯着宗门三千年无归音的旧籍发呆';
    paragraphs = [
      '夜雨敲打亭檐。沈清霜第一次在你面前解下那柄寸步不离的寒霜长剑，轻轻搁在石案边。',
      `“八岁入青云山门时，师尊说无情方能剑心无垢。所以我习惯了一个人练剑、一个人背着首座虚名、${shenDoubtText}。”她抬眸看你，灯影落进她清冽瞳仁，“直到遇见你，我才发现这世上原来还有人，敢接住我递出去的这一剑。”`,
      '她将一枚刻着寒梅剑纹的素玉剑穗系在你佩剑之上：“往后山路再黑，若你信我，便不必再独自扛着。”',
    ];
    letterTitle = '寒梅剑札 · 致{{name}}';
    letterBody =
      '松亭一别，雨气犹寒。昔年只觉剑道唯孤，今知天下尚有同道。剑穗既赠，若遇大宗围逼或破境凶险，飞剑传讯，清霜必至。';
  } else if (cid === 'xie_wujiu') {
    next.mind += 6;
    next.spiritStones += 80;
    title = '知交夜话 · 算盘背后';
    const brotherFate = next.truthClues.includes('clue_tianji_portal')
      ? '最后连骨灰都没留全'
      : '最后白日入光便音讯全无，生不见人、死不见尸';
    paragraphs = [
      '百宝斋二楼打烊后，谢无咎没再摇那柄玄铁折扇。他从暗匣里取出一张早已泛黄的旧契纸，纸角还留着幼时笨拙的墨迹。',
      `“人人都骂我谢无咎眼里只有灵石，贪财重利连亲哥都敢拿来当筹码。”他自嘲地笑了一声，指尖轻轻摩挲纸角，“可这修仙界就是这么个地方，当年我哥天资绝顶、不屑算计，${brotherFate}。我学会算尽天下盈亏，不过是怕哪一天，连身边在意的人也保不住。”`,
      '他替你斟满一杯烈酒，眼里褪去七分世故：“{{name}}，旁人跟我算账我都留三手，唯独你，这本真账我摊开给你看。”',
    ];
    letterTitle = '玄铁暗笺 · 账外真言';
    letterBody =
      '商海浮沉半生，所遇多为利来利往之客。唯君既识市井算计，犹存脊梁风骨。这八十灵石不算借贷，算我提前替你备下的茶酒资。';
  } else if (cid === 'su_zhiwei') {
    next.mind += 10;
    next.alignment.worldly = Math.min(100, next.alignment.worldly + 8);
    title = isRemoteSu ? '知交驿札 · 杏林心灯' : '知交夜话 · 杏林心灯';
    const suRiseText = next.act === 'act2' ? '如今你已踏入仙途' : '你走得越来越高了';
    paragraphs = isRemoteSu
      ? [
          `青州快马送来一只油布封口的旧木匣，里头压着一只绣着杏花的香囊，并一封字迹清稳的长信：“{{name}}，${suRiseText}。等以后飞上九霄云外，回头看青州城外这三亩杏林，会不会小得像一粒尘埃？”`,
          '信纸末尾她的笔意却又温温柔柔地落了下来：“我天生没有灵根，注定陪不了你几百年。可只要我还守着这间医馆一日，这盏灯就一直替你点着。你在外头累了、冷了，随时可以回青州喝口热汤。”',
        ]
      : [
          `药炉火苗映红了窗纸。苏知微低头挑了挑灯芯，轻声问你：“{{name}}，${suRiseText}。等以后飞上九霄云外，回头看青州城外这三亩杏林，会不会小得像一粒尘埃？”`,
          '未等你开口，她先温温柔柔地笑起来，从针匣里取出一只绣着杏花的香囊放进你掌心：“我天生没有灵根，注定陪不了你几百年。可只要我还守着这间医馆一日，这盏灯就一直替你点着。你在外头累了、冷了，随时可以回来喝口热汤。”',
        ];
    letterTitle = '桂花素笺 · 杏林留灯';
    letterBody =
      '秋桂已晒透，新封了两包置于药橱左格。仙途多风霜，莫要只顾破境而忘歇息。青州虽远，药炉常热，盼君平安。';
  } else {
    const reborn = next.tags.includes('cangming_reborn');
    const knowsChangming = next.truthClues.includes('clue_changming_night');
    next.might += 10;
    next.mind += 5;
    title = '知交夜话 · 三千年孤剑';
    paragraphs = [
      knowsChangming
        ? '夜半无风，苍溟罕见地没再出言讥讽。他凝视着你手中长剑，嗓音像隔着三千年烟尘传来：“长明元年那晚，我那八个同袍个个比你天资耀眼、比你嘴甜。可金光落下来的时候，连句像样的遗言都没来得及留。”'
        : '夜半无风，苍溟罕见地没再出言讥讽。他隔着三千年尘烟低声道：“三千年前那场劫数里，我那八个同袍个个比你天资耀眼、比你嘴甜。可高天变脸的时候，连句像样的遗言都没来得及留。”',
      reborn
        ? '他偏过头冷哼一声，耳廓却隐约泛起一点不自在的青芒：“你这小辈修为虽还差得远，骨头倒比他们还硬。行了，别拿那种眼神看本座；往后你真要闯什么死局，本座拼了这缕老命也替你劈开一道缝。”'
        : '残玉青光微微一颤，他硬邦邦地哼了一声：“你这小辈修为虽还差得远，骨头倒比他们还硬。行了，别拿那种眼神盯玉佩；往后你真要闯什么死局，本座拼了这缕残魂也替你劈开一道缝。”',
    ];
    letterTitle = '剑意刻痕 · 长明旧志';
    letterBody =
      '三千载困于焦玉，本以为今世尽是奴颜婢膝之辈。遇你方知人间剑骨未绝。莫折在半道上，旧日那笔血账，本座只认你同去清算。';
  }

  appendUniqueLetter(next, cid, `milestone1_${cid}`, letterTitle, letterBody);
  appendUniqueChronicle(
    next,
    cid,
    cid === 'su_zhiwei' && isRemoteSu
      ? '千里驿札推心深谈，卸下心防并寄赠信物尺素。'
      : '长夜推心深谈，卸下心防并留赠信物尺素。'
  );
  next.historyLog.push({
    year: next.year,
    season: getSeason(next.seasonIndex),
    ageYears: getAgeYears(next.ageMonths),
    title,
    summary:
      cid === 'su_zhiwei' && isRemoteSu
        ? '与苏知微隔空鸿书推心深谈，心结尽解，情谊更进一层。'
        : `与${COMPANION_NAMES[cid]}长夜推心深谈，心结尽解，情谊更进一层。`,
  });
  const notice = `知交夜话已成：与${COMPANION_NAMES[cid]}推心置腹（获赠尺素）`;
  next.recentNotices = [notice];
  return {
    ok: true,
    state: next,
    title,
    paragraphs: paragraphs.map((p) => interpolateText(p, next)),
    notice,
  };
}

export function canCommitBond(
  state: GameState,
  cid: CompanionId,
  bondChoice: Exclude<CompanionBondType, 'none'>
): { ok: boolean; reason?: string } {
  const comp = state.companions[cid];
  if (!comp.met) return { ok: false, reason: '素未谋面' };
  if (state.act === 'act1') {
    return { ok: false, reason: '尚在凡胎启蒙之境，待踏入仙途后再议终身之诺' };
  }
  if (isSanctuaryClosed(state)) {
    return {
      ok: false,
      reason: state.endingId ? '此世因果已然落笔' : '九霄天门洞开在即，此刻唯余迎劫落子',
    };
  }
  if (isCompanionDeceased(state, cid)) return { ok: false, reason: '故人已辞世，阴阳两隔' };
  if (isSuAct4FarewellStage(state, cid)) {
    return { ok: false, reason: '故人已入暮年，请往青州槐阴亲赴最后一程' };
  }
  if (isSuAct5SeniorStage(state, cid)) {
    return { ok: false, reason: '故人已届耄耋高龄、远居青州安养，唯余尺素往来与旧谊相伴' };
  }
  if (isCompanionSealed(state, cid)) return { ok: false, reason: '残魂已遭永封' };
  if (isCompanionHostile(state, cid)) return { ok: false, reason: '彼此道途相左，无法结契' };
  if ((comp.milestoneStage ?? 0) < 1) {
    return { ok: false, reason: '须先共赴「知交夜话」解开心结' };
  }
  if (comp.affection < 75) {
    return { ok: false, reason: `须情谊达到 75（当前 ${comp.affection}）` };
  }
  if (comp.bondType === 'dao_partner' || comp.bondType === 'sworn') {
    return { ok: false, reason: '已定下此生名分' };
  }
  if (
    bondChoice === 'dao_partner' &&
    state.daoPartnerId &&
    state.daoPartnerId !== cid &&
    (isCompanionDeceased(state, state.daoPartnerId) ||
      isActiveDaoPartner(state, state.daoPartnerId))
  ) {
    const existingName = COMPANION_NAMES[state.daoPartnerId];
    return {
      ok: false,
      reason: `你已与【${existingName}】结为唯一道侣，不可再许他人道侣名分（可结为生死挚交）`,
    };
  }
  return { ok: true };
}

export function commitCompanionBond(
  state: GameState,
  cid: CompanionId,
  bondChoice: Exclude<CompanionBondType, 'none'>
): SanctuaryActionResult {
  const check = canCommitBond(state, cid, bondChoice);
  if (!check.ok) {
    return {
      ok: false,
      state,
      title: '结契未成',
      paragraphs: [check.reason ?? '结契条件尚未完备。'],
      notice: check.reason ?? '结契未成',
    };
  }

  const next = cloneStateForSanctuary(state);
  const comp = next.companions[cid];
  const name = COMPANION_NAMES[cid];
  comp.bondType = bondChoice;
  comp.stance = 'bonded';
  comp.milestoneStage = 2;
  comp.lastSeenAgeMonths = next.ageMonths;

  if (bondChoice === 'dao_partner') {
    next.daoPartnerId = cid;
  }

  let title = '';
  let paragraphs: string[] = [];
  let letterTitle = '';
  let letterBody = '';
  let bonusText = '';
  const isRemoteSu = next.act === 'act4' || next.act === 'act5';

  if (bondChoice === 'dao_partner') {
    if (cid === 'shen_qingshuang') {
      next.might += 12;
      next.mind += 10;
      title = '双剑结契 · 道侣同心';
      paragraphs = [
        '月色很冷，寒松的影子落在青石上，像一柄没有出鞘的剑。沈清霜解下佩了许多年的霜梅剑坠，亲手系在你腰间。她的指尖很凉，打结时却极稳。',
        '霜剑出鞘半寸，在青石上划出一道笔直的剑痕。',
        '“宗门规矩说，剑修当绝情。”她抬眼望你，月色落进眸子里，清冽得让人移不开眼，“可他们没说过，若心里空无一人，这柄剑拔出来又是为了谁。”',
        '长剑归鞘，清鸣一声。她握住你的手，声音很轻，却像金铁落地：“{{name}}，从今夜起，你是我沈清霜唯一的道侣。生同剑鸣，死同霜雪。”',
      ];
      letterTitle = '结契书 · 霜雪同途';
      letterBody =
        '昔闻剑修当绝情忘念，方得不摧。今夜方知，心有所系之剑，反倒更难折断。漫漫长途，风雪同往，此身此剑，皆不负君。';
      bonusText = '修为 +12 · 心境 +10 · 启【霜月双修】与破境护道';
    } else if (cid === 'xie_wujiu') {
      next.spiritStones += 150;
      next.renown += 10;
      next.mind += 8;
      next.flags.xie_deadman_switch = true;
      title = '红烛同契 · 商海白首';
      paragraphs = [
        '红烛烧过半截，烛泪在铜盘里凝成暗红的一滴。谢无咎伸手推开满案账册，只从袖中摸出一对玄铁算珠，放在灯下。',
        '铁珠很沉，却已被他在掌心里捂热了。',
        '“我算了半辈子账。”他垂眼拨了拨那对算珠，唇边那点惯常的懒散笑意不知何时敛尽了，“算天时，算人心，算每一笔买卖的退路。总怕亏，总怕输，总留着一只脚在门外。”',
        `他抬起头，把其中一枚玄铁珠放进你掌心，反手合拢你的五指。“可这一次，我不想留退路了。{{name}}，${next.act === 'act2' ? '百宝斋暗桩与我手中这笔家当' : '百宝斋七十二城暗桩、半壁身家'}，连同我这条命，今夜一并押在你这里。往后生死盈亏，只认你一人。”`,
      ];
      letterTitle = '同心红契 · 百年不悔';
      letterBody =
        next.act === 'act2'
          ? '百宝斋暗桩与我手中家当，自今夜起尽听君令。世人皆道商贾薄情，只因未见精算之人动了真念。此契无悔，余生盈亏，与君共担。'
          : '九州七十二城暗桩，自今夜起尽听君令。世人皆道商贾薄情，只因未见精算之人动了真念。此契无悔，余生盈亏，与君共担。';
      bonusText = '灵石 +150 · 声望 +10 · 启【百宝全域死手网】与【红烛共算】';
    } else if (cid === 'su_zhiwei') {
      next.mind += 18;
      next.alignment.worldly = Math.min(100, next.alignment.worldly + 15);
      next.tags = next.tags.filter((t) => t !== 'blood_pill_tainted');
      const hairWord = getAgeYears(next.ageMonths) >= 60 ? '霜丝' : '青丝';
      title = isRemoteSu ? '鸿书结发 · 红尘道侣' : '杏林结发 · 红尘道侣';
      paragraphs = isRemoteSu
        ? [
            '你提笔写下此生唯一道侣之契，托青州快马星夜送往杏林医馆。旬日后驿卒冒风返程，带回一只仔细封蜡的桂花锦囊与一纸墨痕微湿的回笺。',
            `锦囊里静静躺着一缕以红绳束紧的${hairWord}与两朵新晒秋桂。她在信中写道：“${next.act === 'act2' ? '你有百载寿数' : '你有几百年寿数'}，我却只有区区数十载春秋。原怕往后我先走了，剩你一个人走那么长的路，会冷的。”`,
            '翻过信笺背面，字迹却比先前稳了许多：“可你既愿隔着千里山河许我此生唯一，我便不问百年之后。{{name}}，只要我还在世上一天，青州这盏灯便为你留着。”',
          ]
        : [
            '风过小院，几瓣杏花落在青石阶上，很快便被晚露沾湿了。',
            `听见你说愿以修士之身，与一个无灵凡女结为唯一道侣，苏知微端着药碗的手轻轻一顿。她放下碗，垂下眼帘，声音轻得像怕被风吹散：“${next.act === 'act2' ? '你有百载寿数' : '你有几百年寿数'}，我却只有区区数十载春秋。往后我先走了，剩你一个人走那么长的路，会冷的。”`,
            '你没有应声，只握紧她沾着药草苦香的手，不曾松开半分。',
            `她望进你眼底，泪珠滑落颊边，唇角却弯了起来。她取过银剪，剪下一缕${hairWord}与你结发收进桂花锦囊，轻轻按在你胸前：“好。我不问百年之后。{{name}}，只要我还在世上一天，这盏灯便为你留着。”`,
          ];
      letterTitle = '杏林结发笺 · 岁岁安康';
      letterBody =
        '锦囊里收着你我结发与新晒秋桂。莫叹凡躯寿短，能陪长生客共过这数十寒暑，灯火可亲，此生已足。纵使他年先一步归尘，这颗心仍随君行至天涯。';
      bonusText = isRemoteSu
        ? '心境 +18 · 涤尽血煞 · 启【尺素遥寄】专属雅叙'
        : '心境 +18 · 涤尽血煞 · 启【红尘温脉】专属雅叙';
    } else {
      const reborn = next.tags.includes('cangming_reborn');
      next.might += 15;
      next.mind += 10;
      title = reborn ? '太古并剑 · 三千年一诺' : '断玉魂契 · 千年相许';
      paragraphs = reborn
        ? [
            '孤崖风烈。重塑真身的苍溟反手将古剑插进青石，剑脊犹在低鸣。',
            '他盯着你看了很久。那双熬过三千年孤寒的眼睛里，第一次没有了嘲弄，也没有了杀意。',
            '“长明元年，我以为这世上除了剑与旧恨，再没别的去处。”他忽然低笑了一声，伸手扣住你的手腕，将你拉到身侧。他掌心很烫，那是死而复生后才重新拥有的体温。',
            '“三千年熬下来，倒教一个后辈近了身。”他眉眼锋芒未减，落字却沉得像孤峰上的古钟，“道侣便道侣。{{name}}，我这具重活一回的骨血，连同这口饮过三千年风霜的剑，往后都放在你身旁。你要斩天，我替你开锋；天要杀你，先过我这一剑。”',
          ]
        : [
            '焦黑断玉浮在半空，澄澈青辉照亮了半寸夜色。苍溟的虚影渐渐凝实，眉目如刻，却终究触不到你的衣袖。',
            '这名孤傲了三千年的古剑尊沉默了很久。风从他虚幻的肩头穿过去，连一缕衣角都没能吹动。',
            '“我见过不少疯子。”他终于开口，嗓音低沉，藏着一丝极难察觉的哑意，“可敢拿一世唯一道侣之名，去许一缕连血肉都没有的残魂的，你是头一个。”',
            '断玉忽然清鸣一声，青光如剑，轻轻绕过你的指节，像一次隔着三千年光阴的握持。“既敢如此，本座便接下这一诺。{{name}}，欠你并肩而行的岁月，待他日塑骨成人，我一寸一寸还你。”',
          ];
      letterTitle = '青玉剑契 · 不负此世';
      letterBody =
        '三千年风霜未折我剑骨，唯你一人撞进了这片死灰。往后九霄雷劫也罢，群仙压境也罢，既有此契，欲伤君者，须先踏过本座剑锋。';
      bonusText = reborn
        ? '修为 +15 · 心境 +10 · 启【并肩醉剑】与极强越阶双锋加成'
        : '修为 +15 · 心境 +10 · 启【神魂共剑】与极强越阶双锋加成';
    }
  } else {
    // 结为生死挚交（四人专属誓词与尺素）
    next.mind += 8;
    next.might += 6;
    if (cid === 'shen_qingshuang') {
      title = '松崖剑誓 · 生死同锋';
      paragraphs = [
        '松崖风冷，两柄佩剑斜斜相抵，清越剑鸣震落满树寒露。沈清霜收剑回鞘，眸光清澈如洗：“不谈儿女私情，只论剑道同行。此世若遇大宗围逼或天劫压顶，只要你我剑锋未折，便绝不留彼此独行。”',
        '她解下一段素白剑穗系于你剑格，拱手一礼，干脆利落得像立下一道永不违背的剑规。',
      ];
      letterTitle = '寒松盟书 · 剑道同途';
      letterBody = '昔年只知独剑孤行，今幸得一可以后背相托之同道。剑穗为凭，危难相召，清霜必提剑赴约。';
    } else if (cid === 'xie_wujiu') {
      title = '暗楼铁誓 · 肝胆同契';
      paragraphs = [
        '两只粗瓷海碗重重一碰，酒花溅湿了满案账册。谢无咎随手抹去唇边酒渍，将一枚刻着百宝暗纹的玄铁算珠抛进你怀里，笑得比平日畅快十倍：“这世上人人都在算计我，唯有跟你做买卖从来不用防背地暗算。”',
        '“往后不谈虚礼，只认过命交情：你缺灵石、缺退路、缺挡灾的盾，亮这颗珠子，我谢无咎倾百宝家底替你担着！”',
      ];
      letterTitle = '玄铁盟笺 · 过命交情';
      letterBody = '商海浮沉半生，盈亏皆有定价，唯独过命之交无价。此珠既授，无论九州风雨如何，百宝暗网永为君留一道生路。';
    } else if (cid === 'su_zhiwei') {
      title = isRemoteSu ? '驿札灯誓 · 凡仙守望' : '杏林灯誓 · 凡仙守望';
      paragraphs = isRemoteSu
        ? [
            '青州驿马捎回一包温焙过的秋桂新茶与一纸素笺。苏知微在信中安宁写道：“旁人结金兰要设香案、歃血为盟，咱们山河相隔，便以这盏桂花茶与杏林药火为证罢。”',
            '“你在九霄云外替人间撑伞，我就在青州城外守好这间医馆与这盏灯。哪天走累了、受伤了，随时回青州推门进来，茶永远是热的。”',
          ]
        : [
            '药炉青烟袅袅，苏知微以温好的桂花茶代酒，与你轻轻碰了一盏。她笑意安宁：“旁人结金兰要设香案、歃血为盟，咱们便以这炉药火为证罢。”',
            '“你在九霄云外替人间撑伞，我就在青州城外守好这间医馆与这盏灯。哪天走累了、受伤了，推门进来，茶永远是热的。”',
          ];
      letterTitle = '杏林素盟 · 灯火常热';
      letterBody = '凡仙虽殊途，守灯之志无二致。前路风霜万重，请君善自珍重；人间这一头，知微替君守着。';
    } else {
      const reborn = next.tags.includes('cangming_reborn');
      title = reborn ? '孤崖酒誓 · 碎天同道' : '断玉剑盟 · 跨世相托';
      paragraphs = reborn
        ? [
            '烈酒泼地祭长明旧魂。苍溟仰脖饮尽碗中浊酒，把空碗往青石上一砸，眉骨焦疤在火光里亮得惊人：“三千年了，本座头一回认个后辈作平辈剑友！往后不管劈开哪重天，算本座一把剑！”',
          ]
        : [
            '焦黑断玉凌空清鸣，一道凌厉青辉与你丹田剑意遥遥相击。苍溟哼笑一声，嗓音难得收起刻薄：“三千年前我那八个同袍死了，没想到今世还能撞见个骨头一样硬的小辈。这声同道，本座认了！”',
          ];
      letterTitle = '碎天旧誓 · 平肩同往';
      letterBody = '三千年孤魂不轻易许人。既认你作生死同道，此后破关斩劫，本座剑锋必随君侧。';
    }
    bonusText = '修为 +6 · 心境 +8 · 启高阶挚交雅叙与破境护法';
  }

  appendUniqueLetter(next, cid, `bond_${bondChoice}_${cid}`, letterTitle, letterBody);
  appendUniqueChronicle(
    next,
    cid,
    bondChoice === 'dao_partner'
      ? cid === 'su_zhiwei' && isRemoteSu
        ? '千里鸿书郑重定下道侣之契，成为此生唯一相守之人。'
        : '与你郑重定下道侣之契，成为此生唯一相守之人。'
      : cid === 'su_zhiwei' && isRemoteSu
      ? '千里鸿书立誓结为生死挚交，从此守望人间灯火。'
      : '与你举盏立誓结为生死挚交，从此肝胆相照。'
  );
  next.historyLog.push({
    year: next.year,
    season: getSeason(next.seasonIndex),
    ageYears: getAgeYears(next.ageMonths),
    title,
    summary:
      bondChoice === 'dao_partner'
        ? `与【${name}】定下此生唯一道侣之契。`
        : cid === 'su_zhiwei' && isRemoteSu
        ? '与【苏知微】以千里驿札立誓结为生死挚交。'
        : `与【${name}】举盏结为生死挚交。`,
  });

  const notice =
    bondChoice === 'dao_partner'
      ? `仙缘大成：与【${name}】结为唯一道侣！（${bonusText}）`
      : `情义金石：与【${name}】结为生死挚交！（${bonusText}）`;
  next.recentNotices = [notice];

  return {
    ok: true,
    state: next,
    title,
    paragraphs: paragraphs.map((p) => interpolateText(p, next)),
    notice,
  };
}
