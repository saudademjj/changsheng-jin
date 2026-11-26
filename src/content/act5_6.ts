import {
  CompanionId,
  GameState,
  RandomEventDefinition,
  SceneDefinition,
} from '../engine/types';
import { getAgeYears, toChineseYearNumber } from '../engine/time';

const LOYAL_COMPANION_IDS: CompanionId[] = [
  'shen_qingshuang',
  'xie_wujiu',
  'cang_ming',
];

function isCangMingSealed(state: GameState): boolean {
  return Boolean(state.flags.cangming_sealed || state.flags.act4_cangming_sealed);
}

function isCangMingReborn(state: GameState): boolean {
  return state.tags.includes('cangming_reborn') && !isCangMingSealed(state);
}

function isLoyalCompanion(state: GameState, id: CompanionId): boolean {
  if (id === 'cang_ming' && isCangMingSealed(state)) return false;
  const c = state.companions[id];
  if (!c.met || c.stance === 'estranged' || c.stance === 'rival') return false;
  if (id === 'cang_ming' && state.flags.cangming_distrusted && c.affection < 20) {
    return false;
  }
  return c.stance === 'confidant' || c.stance === 'bonded' || c.affection >= 20;
}

function isHostileCompanion(state: GameState, id: CompanionId): boolean {
  const c = state.companions[id];
  return c.met && (c.stance === 'estranged' || c.stance === 'rival');
}

function getSnowFoes(state: GameState): CompanionId[] {
  return LOYAL_COMPANION_IDS.filter((id) => {
    if (!isHostileCompanion(state, id)) return false;
    if (id === 'cang_ming') return isCangMingReborn(state);
    return true;
  });
}

function isSuZhiweiAliveInAct5(state: GameState): boolean {
  return Boolean(
    state.companions.su_zhiwei.met &&
      state.flags.su_zhiwei_saved_longlife &&
      !state.flags.su_zhiwei_passed &&
      getAgeYears(state.ageMonths) <= 95
  );
}

function isSuWarm(state: GameState): boolean {
  return (
    state.companions.su_zhiwei.met &&
    state.companions.su_zhiwei.affection >= 10 &&
    !state.flags.left_qingzhou_coldly
  );
}

function getBondedCompanions(state: GameState): CompanionId[] {
  return LOYAL_COMPANION_IDS.filter(
    (id) =>
      isLoyalCompanion(state, id) &&
      (state.companions[id].stance === 'bonded' ||
        state.companions[id].affection >= 60)
  );
}

function getPhysicalLoyalAllies(state: GameState): CompanionId[] {
  return LOYAL_COMPANION_IDS.filter((id) => {
    if (!isLoyalCompanion(state, id)) return false;
    if (id === 'cang_ming') return isCangMingReborn(state);
    return true;
  });
}

function hasJadeLoyalCangMing(state: GameState): boolean {
  return isLoyalCompanion(state, 'cang_ming') && !isCangMingReborn(state);
}

function companionDisplayName(id: CompanionId): string {
  if (id === 'shen_qingshuang') return '沈清霜';
  if (id === 'xie_wujiu') return '谢无咎';
  if (id === 'su_zhiwei') return '苏知微';
  return '苍溟';
}

function formatNameList(names: string[]): string {
  return names.join('、');
}

export const ACT56_SCENES: Record<string, SceneDefinition> = {
  // ==================== 卷五开篇 · 见天地 ====================
  act5_opening: {
    id: 'act5_opening',
    act: 'act5',
    title: '裂穹见天地',
    subtitle: '卷五 · 见天地（三千年收割大期启）',
    location: '青州北巅 · 望天台',
    checkpoint: true,
    checkpointLabel: '卷五初启 · 元婴见天地',
    paragraphs: [
      (s) => {
        const retreatMonths = Number(s.flags.nascent_retreat_months ?? 0);
        const spanPhrase =
          retreatMonths >= 240
            ? '碎丹成婴后的数十寒暑终于落幕。'
            : '碎丹成婴后的漫长闭关终于落幕。';
        return `${spanPhrase}你出关推开石门，抬头便望见苍穹正中横亘着一道金灰相间的巨大裂痕。白日里它亮得刺眼，入夜后又泛出炉火将熄时的暗赤，九州万里无一处躲得开这双俯视大地的天眼。`;
      },
      (s) =>
        s.truthClues.length >= 3
          ? '元婴神识放开百里，山河凋敝一览无余。九州灵脉已干涸九成，曾经云雾缭绕的福地只剩枯石寒风，灵石握在掌心也失了温润。诸多延续千年的小宗门陆续撞响封山钟，遣散弟子自谋生路。收割大期，落到了这一代人头上。'
          : '元婴神识放开百里，山河凋敝一览无余。九州灵脉已干涸九成，曾经云雾缭绕的福地只剩枯石寒风，灵石握在掌心也失了温润。诸多延续千年的小宗门陆续撞响封山钟，遣散弟子自谋生路。席卷九州的灵脉断绝大劫，落到了这一代人头上。',
      {
        when: (s) => s.tags.includes('spirit_eyes'),
        text: '你双目微灼，天生异瞳望穿铅云：年少时暮色里偶见的那几缕淡青游丝，此刻已汇成倒卷九霄的滔天金河。',
      },
      {
        when: (s) => isCangMingReborn(s) && isLoyalCompanion(s, 'cang_ming'),
        text: '石阶尽头，重塑真身的苍溟负手仰望天裂，衣袂被燥热的高空罡风吹得猎猎作响。“和长明元年那夜一模一样，”他声音低沉，“先枯地脉，再裂穹顶，等最后一层天幕烧穿，接引金光就会顺着裂口倾泻下来。”',
      },
      {
        when: (s) =>
          !isCangMingReborn(s) &&
          !isCangMingSealed(s) &&
          isLoyalCompanion(s, 'cang_ming'),
        text: '袖中焦黑断玉发烫得几乎灼手，苍溟沙哑的嗓音在识海深处响起：“别发愣了，这就是长明元年那晚的天色。三千年一轮的火候到了，上界马上就要开炉收药。”',
      },
      {
        when: (s) => isCangMingSealed(s),
        text: '袖中那枚被你亲手重印深封的【焦黑断玉】彻底沉寂冰冷，任凭头顶裂穹金火翻涌，再无半缕残魂回声。',
      },
      {
        when: (s) => isLoyalCompanion(s, 'shen_qingshuang'),
        text: (s) =>
          s.tags.includes('sect_rebel') ||
          Boolean(s.flags.shen_left_sect) ||
          Boolean(s.flags.shen_freed_from_sect)
            ? '案头压着一封霜梅暗印剑札，是沈清霜托灵鹤连夜递来的。信纸上只有短短两行墨字：仙盟已发青铜钟帖，定于近季在中州天柱残峰召开九州群雄会，她已提前动身赴约，请你在峰下旧松林会合。'
            : '案头压着一封青云密信，是沈清霜托灵鹤连夜递来的。信纸上只有短短两行墨字：仙盟已发青铜钟帖，定于近季在中州天柱残峰召开九州群雄会，她已提前动身赴约，请你在峰下旧松林会合。',
      },
      {
        when: (s) => isLoyalCompanion(s, 'xie_wujiu'),
        text: '窗格里插着一枚百宝斋火漆急笺。谢无咎在信中算得明白：九州仅存的几处灵矿一夜停产，仙盟大长老却借机召集各路元婴老祖赴中州议事，明为共商飞升盛典，暗地里正筹备开启九霄接引大阵。',
      },
      {
        when: (s) =>
          s.companions.su_zhiwei.met &&
          (s.relics.includes('mortal_hearth_talisman') ||
            s.relics.includes('qingzhou_silver_needle')),
        text: (s) => {
          const hasNeedle = s.relics.includes('qingzhou_silver_needle');
          const hasSeal = s.relics.includes('mortal_hearth_talisman');
          const itemLabel =
            hasNeedle && hasSeal
              ? '紫檀针匣与温润玉印'
              : hasNeedle
              ? '紫檀针匣'
              : '温润玉印';
          return `你低头触碰怀中旧物，${itemLabel}还残留着极淡的干桂花气。算来距初见青州杏林已过数十春秋，凡人一生不过寒暑几十回，唯有她留下的那份无灵医案，在这漫天威压里仍透着一丝不被天幕察觉的安宁。`;
        },
      },
    ],
    choices: [
      {
        id: 'act5_open_sword_resolve',
        label: '敛起元婴锋芒，先理清中州群雄会与终战前夜的筹谋',
        subtext: '记入天机碎片【三千年收割大期】，步入见天地终局筹谋。',
        insightTags: ['耗时三月', '解锁天机碎片', '修为与心境'],
        effect: () => ({
          timeMonths: 3,
          might: 8,
          mind: 8,
          setRealm: 'nascent_soul',
          addTags: ['nascent_soul_dao'],
          addTruthClues: ['clue_furnace_cycle'],
          activateThreads: ['thread_act5_summit', 'thread_act5_eve'],
          logSummary:
            '元婴出关目睹九州裂穹异象，确认三千年收割大期已至，启程谋划破局之策。',
        }),
        outcome: [
          '你深吸一口带着焦尘味的山风，将百里神识收回丹田。元婴法身在紫府中睁开双目，澄澈灵光顺着周天大脉流转一周，将高天垂落的沉闷威压尽数挡在身外。',
          '数月整备匆匆而过。中州天柱峰的青铜钟声已经传遍九州，各路老祖、残宗掌门与散修巨擘正陆续汇聚，这方天地留给众人的最后喘息已屈指可数。',
        ],
        outcomeContinueLabel: '收神入局 · 步入见天地',
        bridgeNote: '裂穹悬顶，三千年收割大期已启，九州群雄会与化神天堑俱在眼前。',
        next: 'act5_hub',
      },
      {
        id: 'act5_open_calm_watch',
        label: '御剑巡视青州枯脉三日，再定夺化神与破门之策',
        subtext: '同样解锁【三千年收割大期】，偏重澄明心境与入世体察。',
        insightTags: ['耗时一月', '解锁天机碎片', '心境与入世'],
        effect: () => ({
          timeMonths: 1,
          mind: 12,
          worldly: 8,
          setRealm: 'nascent_soul',
          addTags: ['nascent_soul_dao'],
          addTruthClues: ['clue_furnace_cycle'],
          activateThreads: ['thread_act5_summit', 'thread_act5_eve'],
          logSummary:
            '御风巡视青州干涸灵脉，亲见裂穹之下凡俗尚安而仙山尽枯，遂归座筹谋终局。',
        }),
        outcome: [
          '三日御剑南行，青云山昔日万丈松海已黄了大半，青岚坊市十室九空。反倒是青州城外官道旁的麦田里，几户全无灵根的农家照旧点着晚炊，炊烟笔直升向灰蒙蒙的暮空。',
          '这一眼让你胸中再无迟疑。待回到观星高台，是时候亲手替这笔长明旧账画上句号。',
        ],
        outcomeContinueLabel: '落座高台 · 筹谋终局',
        bridgeNote: '巡罢枯脉归来，高天裂痕愈发清晰，中州群雄会已在眉睫。',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 卷五枢纽 · 见天地 ====================
  act5_hub: {
    id: 'act5_hub',
    act: 'act5',
    title: '见天地',
    subtitle: (s) =>
      s.flags.act5_summit_done && s.flags.act5_eve_done
        ? '卷五 · 万事俱备，唯余化神叩门'
        : '卷五 · 裂穹悬顶，终局筹谋',
    location: (s) => {
      if (s.tags.includes('sky_slayer_ally')) return '中州孤峰 · 斩天观星台';
      if (s.tags.includes('demonic_sovereign')) return '玄渊绝壁 · 裂天魔殿';
      if (s.tags.includes('merchant_fame')) return '百宝总楼 · 悬空飞檐';
      return '青州北巅 · 望天草庐';
    },
    isHub: true,
    paragraphs: [
      {
        when: (s) => Boolean(s.lastBridgeNote),
        text: (s) => s.lastBridgeNote ?? '',
      },
      (s) =>
        `转眼已是{{year}}，你今岁{{age}}岁，身具元婴法身，寿数可逾${toChineseYearNumber(s.lifespanYears)}载。苍穹正中那道金灰裂痕已宽如天河，每逢子夜便有细碎金火顺着云层滴落，整座九州的灵脉都发出将断未断的哀鸣。`,
      (s) => {
        const lines: string[] = [];
        if (s.activeThreads.includes('thread_act5_summit')) {
          lines.push(
            '【九州群雄会】中州天柱残峰已聚齐九州仅存的元婴老祖与各大宗门执事，仙盟大长老正借锁天古阵宣讲接引大典，九大阵眼破绽便藏在祭坛之后。'
          );
        }
        if (s.activeThreads.includes('thread_act5_eve')) {
          const hasPhysical = getPhysicalLoyalAllies(s).length > 0;
          const hasRemoteOrJade = hasJadeLoyalCangMing(s) || isSuWarm(s);
          const hasFoes = getSnowFoes(s).length > 0;
          lines.push(
            hasPhysical && hasFoes
              ? '【终战前夜】大雪已封九州北境，在迈出化神一步之前，那些陪你走过百年风霜的故人，或已决裂的旧敌，都在等着与你做最后一场长谈。'
              : hasPhysical
              ? '【终战前夜】大雪已封九州北境，在迈出化神一步之前，那些陪你走过百年风霜的故人正候在炉火旁，等你共做最后一场长谈。'
              : hasRemoteOrJade && hasFoes
              ? '【终战前夜】大雪已封九州北境，孤峰草庐灯火如豆。断玉远信犹带暖意，门外旧敌却已递来战帖，正待你今夜一并了断。'
              : hasRemoteOrJade
              ? '【终战前夜】大雪已封九州北境，孤峰草庐灯火如豆。案头旧物与远信犹带暖意，正待你寒炉静夜立下最后道誓。'
              : hasFoes
              ? '【终战前夜】大雪已封九州北境，在迈出化神一步之前，昔日与你反目决裂的旧敌已在风雪外递来战帖，候着了断百年恩怨。'
              : '【终战前夜】大雪已封九州北境，孤峰草庐灯火如豆。在迈出化神一步之前，是时候独对寒炉与长剑，立下叩天门前的最后道誓。'
          );
        }
        if (lines.length === 0) {
          lines.push(
            '九州群雄会与风雪夜谈俱已尘埃落定。你已摸清天门逆枢，也立定了此生最后的道誓，唯余踏破化神关口，直面九霄金光。'
          );
        }
        return lines;
      },
      (s) => {
        const clueMood =
          s.truthClues.length >= 6
            ? '袖中积攒的残卷秘录已近乎拼全伪仙真相，'
            : s.truthClues.length >= 3
            ? '案头零散旧录已串起大半天机，'
            : '高天秘辛仍笼在重雾之中，';
        const wealthMood =
          s.spiritStones >= 800
            ? '行囊里的灵石亦沉甸甸足堪布阵破局。'
            : s.spiritStones >= 300
            ? '手头灵石尚可周转一二。'
            : '手头灵石所剩无几，每一步筹谋皆须落在实处。';
        return `${clueMood}${wealthMood}【末法风声】${s.market.rumorText}`;
      },
    ],
    choices: [
      {
        id: 'hub5_summit',
        category: 'story',
        label: '亲赴中州天柱残峰，出席九州群雄会并探取天门逆枢',
        subtext: (s) =>
          s.relics.includes('ascension_ledger') || s.truthClues.length >= 3
            ? '九州残存元婴齐聚白玉高坛，可揭穿牧灵总录、强夺锁天阵器，或暗查阵眼坐标。'
            : '九州残存元婴齐聚白玉高坛，可伺机强夺锁天阵器，或潜入后殿暗查阵眼坐标。',
        visible: (s) => s.activeThreads.includes('thread_act5_summit'),
        insightTags: ['解锁【天门逆枢】', '锁天印/阵核', '决定九州大势'],
        effect: { timeMonths: 6, beatDelta: 1 },
        next: 'act5_arc_summit',
      },
      {
        id: 'hub5_final_eve',
        category: 'story',
        label: (s) => {
          const hasAllies =
            LOYAL_COMPANION_IDS.some((id) => isLoyalCompanion(s, id)) || isSuWarm(s);
          const hasFoes = getSnowFoes(s).length > 0;
          if (hasAllies) return '在终战前夜的大雪里赴故人之约，立下叩天门前最后道誓';
          if (hasFoes) return '踏入终战前夜的大雪，了断旧敌恩怨并立下叩天门前最后道誓';
          return '在终战前夜的大雪里独坐草庐，立下叩天门前最后道誓';
        },
        subtext: (s) => {
          const hasAllies =
            LOYAL_COMPANION_IDS.some((id) => isLoyalCompanion(s, id)) || isSuWarm(s);
          const hasFoes = getSnowFoes(s).length > 0;
          if (hasAllies && hasFoes) {
            return '大雪将封孤峰，与挚友围炉长谈、凭吊凡尘旧愿，或直面决裂故敌。';
          }
          if (hasAllies) {
            return '大雪将封孤峰，与挚友围炉长谈、凭吊凡尘旧愿，或独坐拭剑明志。';
          }
          if (hasFoes) {
            return '大雪将封孤峰，推门直面决裂旧敌，或独对孤灯拭剑明志。';
          }
          return '大雪将封孤峰，独对寒炉拭剑明志，或凭吊凡尘无灵旧愿。';
        },
        visible: (s) => s.activeThreads.includes('thread_act5_eve'),
        insightTags: (s) =>
          LOYAL_COMPANION_IDS.some((id) => isLoyalCompanion(s, id))
            ? ['故人终章羁绊', '心境大涨', '开启共破天门契机']
            : ['终战道誓', '心境大涨'],
        effect: { timeMonths: 6, beatDelta: 1 },
        next: 'act5_arc_final_eve',
      },
      {
        id: 'hub5_cultivate',
        category: 'plan',
        label: '入静室闭关打磨元婴法身（观裂穹 / 燃灵石 / 演阵破门）',
        subtext: '元婴境至多闭关两回，为化神渡劫与终战备足修为和心境。',
        requirement: {
          maxUsesInAct: {
            key: 'cultivate',
            max: 2,
            reason: '元婴法身已温养至极致，再行闭关亦难寸进，唯有直叩化神',
          },
        },
        insightTags: ['自主潜修', '限2回'],
        next: 'act5_action_cultivate',
      },
      {
        id: 'hub5_wander',
        category: 'plan',
        label: '御剑巡游裂穹下的残破九州，体察末法众生百态',
        subtext: '元婴期间至多巡游两回，遍览末世见闻，磨砺元婴道心。',
        visible: (s) =>
          s.seenRandomEvents.filter((id) => id.startsWith('rand_act5_')).length < 3,
        requirement: {
          maxUsesInAct: {
            key: 'wander',
            max: 2,
            reason: '九州山河已巡视两遭，大劫迫在眉睫，宜速决终局',
          },
        },
        insightTags: ['末法见闻奇遇', '限2回'],
        effect: {
          timeMonths: 12,
          might: 5,
          mind: 5,
          beatDelta: 1,
          trackActionKey: 'wander',
          setReturnSceneId: 'act5_hub',
        },
        next: '__RANDOM_ACT5__',
      },
      {
        id: 'hub5_market',
        category: 'market',
        label: '踏入中州末法易物会，查验牌价、出清灵材或购置重宝',
        subtext: '终局前最后一次大拍，随时可入阁查价换取锁天印、剑胚或霜莲。',
        insightTags: ['终局易物会', '自由入阁不耗光阴'],
        next: 'act5_market',
      },
      {
        id: 'hub5_companion_parley',
        category: 'companion',
        label: '飞符传讯旧日同道，调集终战前最后一批筹码与剑意印证',
        subtext: '大劫前仅可传讯一回，按已有交情向故人借势、问剑或结清商路余利。',
        visible: (s) =>
          isLoyalCompanion(s, 'shen_qingshuang') ||
          isLoyalCompanion(s, 'xie_wujiu') ||
          isLoyalCompanion(s, 'cang_ming') ||
          isSuWarm(s),
        requirement: {
          maxUsesInAct: {
            key: 'companion_parley',
            max: 1,
            reason: '终战前传讯已发，余下前路唯凭各人赴约',
          },
        },
        insightTags: ['故人筹备', '限1回'],
        next: 'act5_companion_parley',
      },
      {
        id: 'hub5_deity_breakthrough',
        category: 'breakthrough',
        label: '【化神关口】登问道绝巅，踏破化神问道或自封修为隐入红尘',
        subtext: (s) =>
          s.flags.act5_summit_done && s.flags.act5_eve_done
            ? '天门逆枢与终战誓言皆已就绪，迈出这一步便将迎来叩天门终局。'
            : '可先赴九州群雄会与风雪长谈补全底牌。若执意提前破境，也可径直登山。',
        visible: (s) =>
          s.actBeat >= 2 ||
          s.completedThreads.some((id) => id.startsWith('thread_act5_')),
        insightTags: (s) => [
          '踏入化神问道',
          `当前修为+心境 ${s.might + s.mind}（孤身稳渡≥620）`,
          '开启叩天门终局',
        ],
        next: 'act5_deity_breakthrough',
      },
    ],
  },

  // ==================== 剧情弧 1：九州群雄会 · 天门逆枢 ====================
  act5_arc_summit: {
    id: 'act5_arc_summit',
    act: 'act5',
    title: '九州群雄会',
    subtitle: '卷五主势 · 天门逆枢',
    location: '中州天柱残峰 · 白玉高坛',
    checkpoint: true,
    checkpointLabel: '卷五 · 九州群雄会前',
    paragraphs: [
      '天柱残峰曾是仙门圣地。如今半山塌成碎砾，峰顶只余一座百丈白玉坛。三十余名元婴老祖与残宗掌门分列两厢。平日不可一世的人物此刻俱都锁眉，不住瞥向头顶翻涌的金灰裂痕。',
      (s) =>
        s.relics.includes('broken_sky_seal')
          ? '高坛正中，仙盟大长老玄霄真人身披九星金袍。他身前铜鼎浮着一枚金纹阵核，与你怀中【残缺锁天印】隐隐呼应。玄霄朗声宣道：“天门将启，诸位速速合炼残脉踏入化神，随老夫共迎仙辇！”'
          : '高坛正中，仙盟大长老玄霄真人身披九星金袍。他身前铜鼎浮着一方缺角古印，边缘吞吐着与天裂同源的金纹，正是【残缺锁天印】。玄霄朗声宣道：“天门将启，诸位速速合炼残脉踏入化神，随老夫共迎仙辇！”',
      {
        when: (s) => s.tags.includes('sect_rebel') || s.tags.includes('blood_pill_whistleblower'),
        text: '你刚踏上白玉石阶，几名仙盟执法长老便齐齐按住剑柄，冷冷盯住你的背影。当年你在青岚与仙盟掀开的旧账，他们至今没忘。',
      },
      {
        when: (s) => isLoyalCompanion(s, 'shen_qingshuang'),
        text: '东侧枯松下，一袭霜白道袍的沈清霜如约而至。她只微微颔首，指尖在剑鞘上轻扣两下，示意高坛后殿的禁制轮值已按昨夜商定的时辰空出一角。',
      },
      {
        when: (s) => isLoyalCompanion(s, 'xie_wujiu'),
        text: (s) =>
          s.flags.act4_chamber_collapsed || s.relics.includes('ascension_ledger')
            ? '西厢商盟席位上，谢无咎摇着那柄玄铁折扇，唇角噙着三分冷笑。他冲你极轻地抬了抬下巴，袖口露出一角暗红总账，正等着你先落子。'
            : '西厢商盟席位上，谢无咎摇着那柄玄铁折扇，唇角噙着三分冷笑。他冲你极轻地抬了抬下巴，袖口露出一角百宝斋暗账抄卷，正等着你先落子。',
      },
      '石坛下暗流涌动。不少散修元婴脸色惨白，显然早已对历代无归人的飞升心存怀疑，只缺一把敢当众捅破窗纸的利刃。',
    ],
    choices: [
      {
        id: 'summit_expose_ledger',
        label: (s) =>
          s.relics.includes('ascension_ledger')
            ? '当众祭出【三千年收割总录】与历年天机铁证，掀翻仙盟牧灵骗局'
            : '当众摊开历年搜集的血证与天机残录，掀翻仙盟飞升骗局',
        subtext: '号召九州反抗者共抗仙盟，同时夺下高坛铜鼎里的锁天阵器。',
        visible: (s) =>
          s.relics.includes('ascension_ledger') ||
          s.truthClues.length >= 5 ||
          (s.truthClues.length >= 4 && s.relics.includes('heaven_dust_shard')),
        insightTags: ['揭穿收割真相', '得【天门逆枢】', '锁天印/补全阵核'],
        effect: (s) => {
          const hadSeal = s.relics.includes('broken_sky_seal');
          const canRedeem =
            (s.tags.includes('demonic_sovereign') ||
              s.tags.includes('blood_pill_tainted')) &&
            s.alignment.righteous >= -25;
          return {
            timeMonths: 12,
            might: hadSeal ? 12 : 0,
            renown: (s.relics.includes('heaven_dust_shard') ? 26 : 22) + (hadSeal ? 6 : 0),
            mind: hadSeal ? 26 : 14,
            righteous: 10,
            beatDelta: 1,
            addTruthClues: ['clue_gate_weakness'],
            addTags: ['sky_slayer_ally'],
            removeTags: canRedeem
              ? ['demonic_sovereign', 'blood_pill_tainted']
              : undefined,
            notice: canRedeem
              ? '当众掀翻伪仙骗局、散尽旧年煞气，昔日魔名已随山风化作尘烟。'
              : undefined,
            addRelics: hadSeal ? undefined : ['broken_sky_seal'],
            completeThreads: ['thread_act5_summit'],
            setFlags: {
              act5_summit_done: true,
              act5_summit_outcome: 'exposed',
              act5_summit_completed_seal: hadSeal,
            },
            companionUpdates: {
              ...(isLoyalCompanion(s, 'shen_qingshuang')
                ? {
                    shen_qingshuang: {
                      affectionDelta: 10,
                      markSeen: true,
                      chronicle: '在天柱残峰群雄会上与你并肩发难，当众斩破仙盟祭坛。',
                    },
                  }
                : {}),
              ...(isLoyalCompanion(s, 'xie_wujiu')
                ? {
                    xie_wujiu: {
                      affectionDelta: 10,
                      markSeen: true,
                      chronicle:
                        s.flags.act4_chamber_collapsed || s.relics.includes('ascension_ledger')
                          ? '在群雄会上甩出天机商行总账佐证，助你彻底掀翻仙盟骗局。'
                          : '在群雄会上甩出百宝斋三百年灵脉倒流私账佐证，助你彻底掀翻仙盟骗局。',
                    },
                  }
                : {}),
              ...(isLoyalCompanion(s, 'cang_ming')
                ? {
                    cang_ming: {
                      affectionDelta: 8,
                      markSeen: true,
                      chronicle: '见你于九州群雄前揭破牧灵骗局，长笑称赞大快人心。',
                    },
                  }
                : {}),
            },
            logSummary: hadSeal
              ? '于天柱残峰群雄会当众揭穿牧灵骗局，夺铜鼎阵核补全锁天印并识破【天门逆枢】。'
              : '于天柱残峰九州群雄会当众揭穿三千年牧灵铁证，聚拢斩天同盟，夺得【残缺锁天印】并识破【天门逆枢】。',
          };
        },
        outcome: [
          (s) => {
            const exhibits: string[] = [];
            if (s.relics.includes('ascension_ledger')) exhibits.push('血丝装订的【三千年收割总录】');
            if (s.relics.includes('ancient_stele_rubbing') || s.truthClues.includes('clue_stele_gap')) {
              exhibits.push('青云飞升碑反文拓影');
            }
            if (s.truthClues.includes('clue_vein_drain')) exhibits.push('灵脉倒流暗账');
            if (s.truthClues.includes('clue_alliance_pact')) exhibits.push('仙盟百年血契贡约');
            if (s.relics.includes('heaven_dust_shard')) exhibits.push('裹着冷灰的【上界落尘玉片】');
            const exhibitStr =
              exhibits.length > 0 ? exhibits.join('、') : '历年搜集的逆脉阵图与飞升断代密卷';
            const support: string[] = [];
            if (isLoyalCompanion(s, 'xie_wujiu')) {
              support.push(
                s.flags.act4_chamber_collapsed || s.relics.includes('ascension_ledger')
                  ? '西厢席间，谢无咎适时扬手甩出天机总坛红账副本，将玄霄的抵赖当场堵死'
                  : '西厢席间，谢无咎适时扬手甩出百宝斋三百年灵脉倒流私账与抽灵铁证，将玄霄的抵赖当场堵死'
              );
            }
            if (isLoyalCompanion(s, 'shen_qingshuang')) {
              support.push('东侧松林霜剑破空，沈清霜先发制人斩裂高坛护鼎禁纹');
            }
            if (isLoyalCompanion(s, 'cang_ming')) {
              support.push(
                isCangMingReborn(s)
                  ? '苍溟纵剑踏阶，太古剑压震退两名企图偷袭的仙盟暗卫'
                  : '袖中断玉青芒暴涨，苍溟古剑余威震退两名企图偷袭的仙盟暗卫'
              );
            }
            const allyLine = support.length > 0 ? `${support.join('。')}。` : '';
            return `你一步踏出人群，元婴灵光直冲云霄。${exhibitStr}在真元托举下凌空展开，在白玉坛上空照出长达十丈的光幕。${allyLine}台下先是死寂，片刻后一名苦修四百载的老散修失声痛哭，指着玄霄真人怒骂他把同道当猪羊圈养。`;
          },
          (s) =>
            s.flags.act5_summit_completed_seal
              ? '玄霄真人脸色铁青，袖袍猛拂催动铜鼎阵核，欲以仙盟大阵灭口。数十道剑光法宝齐起！白玉高坛轰然四裂。混乱中你欺身压鼎，扣腕摘下青铜阵核。阵核落掌，与怀中【残缺锁天印】严丝合缝嵌作一体，印底九道逆槽骤亮。'
              : '玄霄真人脸色铁青，拂袖催动鼎中残印欲当场灭口。数十道剑光与法宝同时炸开！白玉高坛轰然崩裂。你欺身压住铜鼎，硬扣下那方沉重古印，指腹立刻摸到印底九道逆向凹槽。',
          '风沙落定。玄霄真人率残部狼狈遁入云海，余下十余位元婴老祖齐齐向你抱拳。你细看印底刻文，豁然贯通：接引金光降世那一息，下界九座主阵眼必反向洞开。门户大敞。那是斩天的唯一逆枢。',
        ],
        outcomeContinueLabel: '收好锁天重宝，归返观星台',
        bridgeNote: '九州群雄会大乱，仙盟威信扫地，你手握锁天古印与九大阵眼逆枢归来。',
        next: 'act5_hub',
      },
      {
        id: 'summit_storm_altar',
        label: '废话多说无益，以元婴法身悍然镇压高坛，硬抢铜鼎中的锁天阵器',
        subtext: (s) =>
          isLoyalCompanion(s, 'shen_qingshuang') || isLoyalCompanion(s, 'xie_wujiu')
            ? '以绝对实力强夺高坛重宝与九枢阵图，却会令正气大损、同场旧友寒心疏离。'
            : '以绝对实力硬夺高坛重宝与九枢阵图，此举行事酷烈、正气大损。',
        requirement: {
          custom: (s) =>
            s.might >= 180 || s.tags.includes('demonic_sovereign')
              ? { ok: true }
              : { ok: false, reason: '需修为底蕴达到 180，或身具【吞煞魔尊】命格' },
        },
        insightTags: (s) => [
          '强权夺宝',
          '得【天门逆枢】',
          '正气大损',
          ...(isLoyalCompanion(s, 'shen_qingshuang') ? ['沈清霜寒心(-18)'] : []),
          ...(isLoyalCompanion(s, 'xie_wujiu') ? ['谢无咎微愠(-10)'] : []),
        ],
        effect: (s) => {
          const hadSeal = s.relics.includes('broken_sky_seal');
          const wasRighteous = s.alignment.righteous >= 20;
          const rgDelta = wasRighteous ? -38 : -16;
          const becomesDemon =
            s.tags.includes('demonic_sovereign') ||
            s.alignment.righteous + rgDelta <= 10;
          return {
            timeMonths: 10,
            might: hadSeal ? 24 : 16,
            renown: 16,
            righteous: rgDelta,
            beatDelta: 1,
            addTruthClues: ['clue_gate_weakness'],
            addTags: becomesDemon ? ['demonic_sovereign'] : undefined,
            addRelics: hadSeal ? undefined : ['broken_sky_seal'],
            completeThreads: ['thread_act5_summit'],
            setFlags: {
              act5_summit_done: true,
              act5_summit_outcome: 'stormed',
              act5_summit_completed_seal: hadSeal,
              act5_storm_became_demon: becomesDemon,
              act5_storm_shocked_shen: isLoyalCompanion(s, 'shen_qingshuang'),
              act5_storm_shocked_xie: isLoyalCompanion(s, 'xie_wujiu'),
            },
            companionUpdates: {
              ...(isLoyalCompanion(s, 'shen_qingshuang')
                ? {
                    shen_qingshuang: {
                      affectionDelta: -18,
                      markSeen: true,
                      chronicle:
                        '群雄会上你悍然踏碎白玉坛强抢古印、视同道如草芥，她在松林下收剑沉默良久，眼底添了三分冷意。',
                    },
                  }
                : {}),
              ...(isLoyalCompanion(s, 'xie_wujiu')
                ? {
                    xie_wujiu: {
                      affectionDelta: -10,
                      markSeen: true,
                      chronicle:
                        '群雄会上你掀翻商盟预演好的揭账局势、硬靠拳头抢印，他合上折扇暗自皱眉。',
                    },
                  }
                : {}),
            },
            logSummary: hadSeal
              ? '于天柱残峰踏碎仙盟白玉坛，强夺铜鼎阵核补全锁天印并烙下【天门逆枢】阵图。'
              : '于天柱残峰以元婴巨力踏碎仙盟白玉坛，强夺【残缺锁天印】并烙下【天门逆枢】阵图。',
          };
        },
        outcome: [
          '你懒得和这群老东西辩经。脚步前踏半寸，元婴威压如坍塌山岳轰然砸落，白玉石阶从你脚下寸寸崩裂，直逼高坛铜鼎。',
          (s) =>
            s.flags.act5_summit_completed_seal
              ? '玄霄真人惊怒祭出本命金钟硬抗一掌，被震得呕血连退七步。你探手穿过剑阵，生生拔出滚烫青铜阵核嵌入锁天印缺角，神识直冲印核，将九座反向阵眼坐标烙进识海。'
              : '玄霄真人惊怒祭出本命金钟硬抗一掌，被震得呕血连退七步。坛下三十余位元婴竟无一人敢拦。你探手穿过剑阵拔出滚烫古印，神识直冲印核，将九座反向阵眼坐标烙进识海。',
          (s) => {
            const titleStr = s.flags.act5_storm_became_demon
              ? '九州魔尊之名'
              : '横行无忌的霸主之名';
            const quote =
              s.truthClues.length >= 3
                ? '“谁愿做仙炉大药便自己去。”'
                : '“谁愿替高天卖命便自己去。”';
            const shenShock = Boolean(s.flags.act5_storm_shocked_shen);
            const xieShock = Boolean(s.flags.act5_storm_shocked_xie);
            const allyReaction =
              shenShock && xieShock
                ? '远处松林与西厢席间，原本等你举事的沈清霜与谢无咎各自按住剑柄与折扇，神色陡然转冷。'
                : shenShock
                ? '远处松林下，原本等你举事的沈清霜缓缓按住剑柄，神色陡然转冷。'
                : xieShock
                ? '西厢席间，原本等你举事的谢无咎啪地合上折扇，笑意彻底淡了下去。'
                : '';
            return `临行前你扫过满地碎玉与噤若寒蝉的众修，淡声丢下一句${quote}${allyReaction}漫天冷风里，${titleStr}再无人敢轻慢半分。`;
          },
        ],
        outcomeContinueLabel: '提印踏风，返回驻地',
        bridgeNote: '你以雷霆之势踏碎天柱高坛，硬夺锁天阵器与九枢阵图而归。',
        next: 'act5_hub',
      },
      {
        id: 'summit_stealth_copy',
        label: '避开正面死斗，趁午时撞钟潜入高坛后殿拓下九大阵眼坐标',
        subtext: '稳妥周全之策，不引发九州内耗，同样可摸清【天门逆枢】破绽。',
        insightTags: ['潜行夺图', '解锁【天门逆枢】', '免于内耗'],
        effect: (s) => ({
          timeMonths: 10,
          mind: 12,
          might: 8,
          beatDelta: 1,
          addTruthClues: ['clue_gate_weakness'],
          completeThreads: ['thread_act5_summit'],
          setFlags: { act5_summit_done: true, act5_summit_outcome: 'stealth' },
          companionUpdates: {
            ...(isLoyalCompanion(s, 'xie_wujiu')
              ? {
                  xie_wujiu: {
                    affectionDelta: 8,
                    markSeen: true,
                    chronicle: '在群雄会午钟响起时借盘账拖住仙盟执事，掩护你潜入后殿拓下阵图。',
                  },
                }
              : {}),
            ...(isLoyalCompanion(s, 'shen_qingshuang')
              ? {
                  shen_qingshuang: {
                    affectionDelta: 8,
                    markSeen: true,
                    chronicle: '在天柱峰东麓布下寒雾剑幕，替你遮掩潜入后殿的气机。',
                  },
                }
              : {}),
          },
          logSummary:
            '趁天柱残峰群雄会午钟杂乱之际潜入后殿，秘密拓下天门九大反向阵眼坐标。',
        }),
        outcome: [
          (s) => {
            const hasXie = isLoyalCompanion(s, 'xie_wujiu');
            const hasShen = isLoyalCompanion(s, 'shen_qingshuang');
            if (hasXie && hasShen) {
              return '午时青铜大钟连鸣九响。西厢谢无咎恰到好处地拍案争执灵矿折算，引走三名值守执事。东侧枯松林同时漫出清冷剑雾，沈清霜以寒锋折偏了巡山灵镜的探照。一商一武无声合围，你化作贴地清风直入檀香沉沉的秘阁。';
            }
            if (hasXie) {
              return '午时青铜大钟连鸣九响，谢无咎恰到好处地在西厢拍案争执灵矿折算，引得三名值守后殿的仙盟执事匆忙前去调停。你化作一缕贴地清风，无声滑入檀香沉沉的秘阁。';
            }
            if (hasShen) {
              return '午时钟声起，东侧枯松林漫出一层清冷剑雾，将仙盟巡山灵镜的探照尽数折偏半寸。你借着沈清霜遮出的这片盲区，悄无声息翻入高坛后殿。';
            }
            return '大劫当前，再在山下掀起元婴混战只会徒增白骨。你耐心等到午时青铜大钟连鸣九响，收敛元婴气息化作一缕极淡的游风，避开巡逻弟子悄然潜入高坛后殿。';
          },
          '石壁悬着上古青铜星盘。星盘背面以极细朱砂标着九州九座主灵眼的反向通道，你展帛速拓，立时印证接引金光垂落一瞬正是九枢倒转、门户中空的死穴。破局在此。',
          '一刻钟后你悄然退回山道，后殿门锁未损分毫。高坛上玄霄真人仍在高谈阔论，全然不知最要命的底牌已被你揣进袖中。',
        ],
        outcomeContinueLabel: '收拢拓片，悄然下山',
        bridgeNote: '后殿暗拓得手，天门九枢破绽已尽数掌于胸中。',
        next: 'act5_hub',
      },
      {
        id: 'summit_observe_orthodox',
        label: '不动声色旁听三日，私下结交动摇的宗门宿老探听阵眼破绽',
        subtext: '进退自如，既得【天门逆枢】情报，亦能趁乱收拢一笔灵石人脉。',
        insightTags: ['稳健观局', '得灵石与声望', '解锁【天门逆枢】'],
        effect: {
          timeMonths: 8,
          mind: 8,
          spiritStones: 180,
          renown: 8,
          beatDelta: 1,
          addTruthClues: ['clue_gate_weakness'],
          completeThreads: ['thread_act5_summit'],
          setFlags: { act5_summit_done: true, act5_summit_outcome: 'observed' },
          logSummary:
            '在九州群雄会冷眼旁听三日，从几位心怀鬼胎的宿老口中套出了天门九枢反冲之弊。',
        },
        outcome: [
          '三天会期里你始终端坐末席品茗，既不附和玄霄真人的飞升宏论，也不轻易显露锋芒。到了第三夜散席时，两名早已想留后路的丹宗宿老主动寻到客舍，送上一百八十枚高纯灵石与几句掏心窝的醉话。',
          '顺着他们忧心忡忡提到的“接引金光降世时，九州九大灵眼必起逆向回潮”，你把历年线索一并串联，瞬间看破了上界天门阵枢藏在金光背后的致命缺口。',
        ],
        outcomeContinueLabel: '记下情报，辞别天柱残峰',
        bridgeNote: '群雄会散场，你虽未亮剑，却已摸透天门阵枢的回潮破绽。',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 剧情弧 2：终战前夜 · 风雪长谈 ====================
  act5_arc_final_eve: {
    id: 'act5_arc_final_eve',
    act: 'act5',
    title: '风雪长谈',
    subtitle: '卷五情劫 · 终战前夜',
    location: '裂穹雪夜 · 炭炉草庐',
    paragraphs: [
      '裂穹下坠的第一场怪雪来得反常。鹅毛大雪从金灰裂痕里倾泻而下，落到青石板上竟带着一丝极淡的焦铁余温。你生起一盆银丝炭火，把长剑横在膝侧，迎来踏入化神之前的最后一夜。',
      {
        when: (s) => isLoyalCompanion(s, 'shen_qingshuang'),
        text: (s) => {
          const multi =
            LOYAL_COMPANION_IDS.filter((id) => isLoyalCompanion(s, id)).length > 1;
          const teaAct = multi ? '往炭炉上坐了一壶雪水' : '斟满两盏热茶';
          const originLine = s.truthClues.includes('clue_stele_gap')
            ? '从青云后山那块飞升碑算起'
            : s.completedThreads.includes('thread_act3_sect')
            ? '从云岭大议并肩算起'
            : '从当年初见算起';
          return `戌时刚过，门外传来轻缓叩门声。沈清霜拍去肩头灰雪走进来，解下佩剑搁在炉边。几十载春秋未曾在她眉眼留下多少衰老，昔日青云首座的孤峭已化作沉静笃定。她${teaAct}，轻声道：“${originLine}，我们走了快一百年。明日天门若开，东侧三座阵眼的金光我替你挡住。”`;
        },
      },
      {
        when: (s) => isLoyalCompanion(s, 'xie_wujiu'),
        text: '风雪里响起熟悉的折扇轻敲木柱声。谢无咎按前日约好的时辰推门入内，手里拎着两坛封泥斑驳的老酒，往炭炉旁一坐，没再提半句生意经。“九州商盟的暗桩和灵脉契我都压上去了，”他替你满上一碗，“当年我哥傻乎乎进了金光再没回头，这一回，我陪你把上界那本黑账彻底撕了。”',
      },
      {
        when: (s) => isLoyalCompanion(s, 'cang_ming') && isCangMingReborn(s),
        text: '屋檐下，重塑真身的苍溟伸出手指接住一片灰雪，看着雪花在温热掌心融成水珠，忽地低笑出声。“三千年没觉得冬天冷过了，”他转身坐到火盆对面，眸子里燃着淬火般的剑芒，“长明元年那夜，我八个师兄弟化作灰时都没能劈开那扇门。明朝并肩上去，也算对得起这具新骨头。”',
      },
      {
        when: (s) => isLoyalCompanion(s, 'cang_ming') && !isCangMingReborn(s),
        text: '焦黑断玉静静躺在油灯旁，温润青光把你的影子拉得很长。苍溟难得没再毒舌嗤笑，只沉声道：“一路从炼气看你走到元婴，你比当年的我更沉得住气。明朝天门洞开，别留手，把我最后这点残魂也一并拿去祭剑便是。”',
      },
      {
        when: (s) => getPhysicalLoyalAllies(s).length >= 2,
        text: (s) => {
          const hasShen = isLoyalCompanion(s, 'shen_qingshuang');
          const hasXie = isLoyalCompanion(s, 'xie_wujiu');
          const hasRebornCm =
            isLoyalCompanion(s, 'cang_ming') && isCangMingReborn(s);
          if (hasShen && hasXie && hasRebornCm) {
            return '炭火噼啪一响。沈清霜瞥了一眼谢无咎手里的酒坛，淡声提醒：“明日要闯九枢，少饮些。”谢无咎笑叹着将温好的茶盏推过她手边：“沈姑娘放心，我这把老骨头还得留着去收天门赔偿呢。”对面的苍溟端起粗瓷酒碗哼笑一声：“一个青云丫头，一个算盘精，倒凑在了一张桌子上。明朝别死得太快，省得本座没人喝酒。”';
          }
          if (hasShen && hasXie) {
            return '炭火噼啪一响。沈清霜瞥了眼谢无咎手里的酒坛，淡声道：“明日破九枢容不得半分迟钝，少喝些。”谢无咎失笑，顺手替她添了半盏滚水：“沈姑娘连我喝酒都要管了？放心，我这算盘精比谁都惜命，明天绝不拖你剑势后腿。”';
          }
          if (hasShen && hasRebornCm) {
            return '苍溟打量着炉边那柄霜剑，唇角微挑：“青云宗这些年没出几个像样货色，你这丫头的剑倒有几分当年老三的寒气。”沈清霜迎上他目光，不卑不亢颔首：“前辈过誉。明日东侧阵眼，清霜绝不让一道金光漏过。”';
          }
          return '谢无咎麻利替苍溟满上一大碗老酒，摇扇笑道：“长明元年的古剑尊肯屈尊坐进我这俗人酒席，这坛酒怎么也得记在百宝斋头一页账上。”苍溟仰脖饮尽，抹去唇边酒渍冷哼：“少油嘴滑舌。明朝阵眼一开，你这算盘精记得护紧自己的脖子。”';
        },
      },
      {
        when: (s) => isSuWarm(s),
        text: (s) =>
          isSuZhiweiAliveInAct5(s)
            ? '案头摆着青州驿马送来的旧木匣。里头一包新焙秋桂，一封字迹微颤的长信。苏知微已满头银丝。信尾只淡淡一句：听说天裂了口子，若真要上去，穿暖些。莫把命丢在云里。'
            : '案头摆着一只从青州驿站快马送来的旧木匣，里头是一包新焙的秋桂花与两卷续写的《无灵医典》。寄信人是苏知微当年的徒弟阿芸，如今已接掌青州杏林药庐。她在信尾替故去的师父带了句话：“师父临终前吩咐过，待天上裂开口子那日，请您务必穿暖些。青州药炉的灯还亮着，人间这一头，弟子替她守着。”',
      },
      {
        when: (s) => getSnowFoes(s).length > 0,
        text: (s) => {
          const foes = getSnowFoes(s).map(companionDisplayName);
          const figWord = foes.length === 1 ? '一道冷寂身影' : '几道冷寂身影';
          return `子夜前，院外竹篱忽然停了${figWord}。${formatNameList(foes)}早先递过战帖，今夜如约立在雪地里，隔着一院飞雪静静望向灯光里的你。百年恩怨走到天地将倾这一夜，终究到了清算的时候。`;
        },
      },
      {
        when: (s) =>
          !isLoyalCompanion(s, 'shen_qingshuang') &&
          !isLoyalCompanion(s, 'xie_wujiu') &&
          !isLoyalCompanion(s, 'cang_ming') &&
          !isSuWarm(s) &&
          getSnowFoes(s).length === 0,
        text: (s) =>
          s.truthClues.length >= 3
            ? '草庐里只有炭火轻响与窗外呼啸的雪风。你独自温了一壶浊酒，想起十六岁踏入尘世那年，谁也没料到这条长生路的尽头竟是一座高悬九霄的大炉。'
            : '草庐里只有炭火轻响与窗外呼啸的雪风。你独自温了一壶浊酒，想起十六岁离开凡尘那年，谁也没料到问仙路的尽头竟会走到天裂地枯这一步。',
      },
    ],
    choices: [
      {
        id: 'eve_vow_bonded',
        label: (s) =>
          getPhysicalLoyalAllies(s).length > 0
            ? '举盏敬漫天残雪，与知己立誓破门之后务必一同活着归来'
            : '举盏敬漫天残雪，与玉中苍溟立誓明朝破门了结三千年旧债',
        subtext: '深化挚友羁绊，定下心许同行之誓，为携手斩破长明奠定道心。',
        visible: (s) =>
          isLoyalCompanion(s, 'shen_qingshuang') ||
          isLoyalCompanion(s, 'xie_wujiu') ||
          isLoyalCompanion(s, 'cang_ming'),
        insightTags: ['挚友终局羁绊', '心境大涨', '开启双剑破长明契机'],
        effect: (s) => {
          const physical = getPhysicalLoyalAllies(s);
          const updates: NonNullable<
            import('../engine/types').ChoiceEffect['companionUpdates']
          > = {};
          for (const id of LOYAL_COMPANION_IDS) {
            if (isLoyalCompanion(s, id)) {
              const nextAff = s.companions[id].affection + 15;
              const isJadeCm = id === 'cang_ming' && !isCangMingReborn(s);
              updates[id] = {
                affectionDelta: 15,
                setStance: nextAff >= 60 ? 'bonded' : undefined,
                markSeen: true,
                chronicle: isJadeCm
                  ? '于终战前夜孤灯下隔玉共誓，言明明日破门必斩三千年旧债。'
                  : '于终战前夜炭炉旁共饮残雪，立誓叩破天门后定要一同生还。',
              };
            }
          }
          return {
            mind: 14,
            might: 8,
            beatDelta: 1,
            completeThreads: ['thread_act5_eve'],
            setFlags: { act5_eve_done: true, act5_final_vow: 'bonded' },
            companionUpdates: updates,
            logSummary:
              physical.length > 0
                ? '终战前夜与生死挚友围炉长谈，立下破门之后同归人间的死生之约。'
                : '终战前夜孤灯叩玉，与苍溟残魂定下明朝共斩天门之约。',
          };
        },
        outcome: [
          (s) => {
            const physical = getPhysicalLoyalAllies(s).map(companionDisplayName);
            const hasJade = hasJadeLoyalCangMing(s);
            if (physical.length > 0) {
              const jadeTail = hasJade ? '案头焦黑断玉随之清鸣一声，青光微漾。' : '';
              return `你举起粗瓷酒碗，火光映在${formatNameList(physical)}眼底。“三千年都没人从天门回来，”你一饮而尽，“这一回，我们一个都不许留在金光里。”${jadeTail}`;
            }
            return '你举起粗瓷酒碗，对着油灯旁的焦黑断玉一饮而尽：“三千年都没人劈开过那扇门。明朝上去，我们一起把这笔旧债彻底清算。”断玉骤然发出一声清越剑鸣，青光在孤庐内流转不散。';
          },
          (s) =>
            getPhysicalLoyalAllies(s).length > 0
              ? '碗底磕在木案上，发出清脆一响。窗外灰雪越落越急，屋里炉火却烧得极旺。百年修仙路上的算计与孤寂，都在这一夜化作彼此背脊相托的笃定。'
              : '碗底磕在木案上，发出清脆一响。窗外灰雪越落越急，识海里苍溟低笑一声：“算你这小辈有种。今夜歇足精神，明日莫给本座丢人。”',
          (s) =>
            getPhysicalLoyalAllies(s).length > 0
              ? '天色微明时，雪势渐歇。你们各自整衣佩剑，约好化神雷劫过后于九霄天裂正下会师。'
              : '天色微明时，雪势渐歇。你将尚带余温的焦黑断玉贴身收妥，提剑推门，迎向九霄天裂。',
        ],
        outcomeContinueLabel: '拂雪起身，准备踏入化神',
        bridgeNote: '雪夜死生之约已定，纵使九霄天门压顶，你也不再孤身一人。',
        next: 'act5_hub',
      },
      {
        id: 'eve_vow_mortal',
        label: (s) =>
          isSuWarm(s)
            ? '煮一壶青州桂花茶，立誓替人间斩断灵根牧草，还凡尘永世安宁'
            : '抚过无灵古碑拓文，立誓斩断上界灵根牧种，还凡尘永世安宁',
        subtext: (s) =>
          isSuWarm(s)
            ? '承继苏知微与无灵古碑之志，坚定向凡尘归真的守灯道心。'
            : '承继槐阴无灵古碑之志，坚定向凡尘归真的守灯道心。',
        visible: (s) =>
          s.alignment.righteous >= -25 &&
          (s.truthClues.includes('clue_mortal_bloodline') ||
            s.relics.includes('mortal_hearth_talisman') ||
            s.tags.includes('mortal_keeper')),
        insightTags: ['红尘守灯人', '心境与入世大涨', '无灵新世契机'],
        effect: (s) => {
          const canRedeem =
            (s.tags.includes('demonic_sovereign') ||
              s.tags.includes('blood_pill_tainted')) &&
            s.alignment.righteous >= -25;
          return {
            mind: 16,
            worldly: 14,
            beatDelta: 1,
            addTags: ['mortal_keeper'],
            removeTags: canRedeem
              ? ['demonic_sovereign', 'blood_pill_tainted']
              : undefined,
            notice: canRedeem
              ? '炉火茶香里你放下旧年戾气，昔日魔名与血煞尽散。'
              : undefined,
            completeThreads: ['thread_act5_eve'],
            setFlags: { act5_eve_done: true, act5_final_vow: 'mortal' },
            logSummary: isSuWarm(s)
              ? '终战前夜烹桂花旧茶，立誓斩断上界种在凡人血脉中的牧灵枷锁。'
              : '终战前夜静观无灵古碑拓文，立誓斩断上界种在凡人血脉中的牧灵枷锁。',
          };
        },
        outcome: [
          (s) =>
            isSuWarm(s)
              ? '你取来几撮新焙干桂花投进沸水，清甜药香很快压过了风雪里的焦铁气。青州城外那座杏林小院仿佛就在眼前，檐下油灯微黄，凡人一生不过数十载，却活得比九霄之上的冷眼更像活人。'
              : '无灵碑拓在灯下铺开。炭火映着三万年前朴素古篆，山脚下万家炊烟袅袅升起，他们一生不过数十寒暑，却活得比九霄冷眼更像活人。此心足矣。',
          (s) => {
            const physical = getPhysicalLoyalAllies(s);
            const hasJade = hasJadeLoyalCangMing(s);
            const sealPart = s.relics.includes('mortal_hearth_talisman')
              ? '你把无灵归尘印贴身收好'
              : '你合上那卷古碑拓文';
            const foes = getSnowFoes(s);
            const foeTail =
              foes.length > 1
                ? '推窗望去，竹篱外雪地里那几道冷冽身影只隔空停驻了三息，见你无意出门了断，终究各自转身没入灰雾。'
                : foes.length === 1
                ? '推窗望去，竹篱外雪地里那道冷冽身影只隔空停驻了三息，见你无意出门了断，终究转身没入灰雾。'
                : '';
            if (physical.length >= 2) {
              return `${sealPart}，炭炉旁诸人听清你的志向后各自搁下酒碗，不约而同端起刚沏好的热茶与你一碰。既然所谓灵根不过是上界撒进血脉里的牧草种子，那便由你们把这颗种子连根焚净。往后山河岁月，再无长生骗局，也再无天门收割。${foeTail}`;
            }
            if (physical.length === 1) {
              return `${sealPart}，炉火对面的${companionDisplayName(physical[0])}听清你的志向后搁下酒碗，端起刚沏好的热茶与你轻轻一碰。既然所谓灵根不过是上界撒进血脉里的牧草种子，那便由你们把这颗种子连根焚净。往后山河岁月，再无长生骗局，也再无天门收割。${foeTail}`;
            }
            if (hasJade) {
              return `${sealPart}，油灯旁的焦黑断玉轻鸣一声，苍溟在识海里低笑叫好。你对着孤灯低声许诺：既然所谓灵根不过是上界撒进血脉里的牧草种子，那便由你把这颗种子连根焚净。往后山河岁月，再无长生骗局，也再无天门收割。${foeTail}`;
            }
            return `${sealPart}，对着孤灯低声许诺：既然所谓灵根不过是上界撒进血脉里的牧草种子，那便由你把这颗种子连根焚净。往后山河岁月，再无长生骗局，也再无天门收割。${foeTail}`;
          },
        ],
        outcomeContinueLabel: '熄灯整衣，迎向终局',
        bridgeNote: '终战前夜立下红尘守灯之誓，你的心境澄明无垢。',
        next: 'act5_hub',
      },
      {
        id: 'eve_confront_rival',
        label: '推门步入深雪，与昔日决裂故人做最后一次了断',
        subtext: '直面恩怨旧敌，斩却心头余念，换得孤绝凌厉的元婴剑意。',
        visible: (s) => getSnowFoes(s).length > 0,
        insightTags: ['直面旧敌', '修为与心境大进', '斩断旧缘'],
        effect: (s) => {
          const foes = getSnowFoes(s);
          const updates: NonNullable<
            import('../engine/types').ChoiceEffect['companionUpdates']
          > = {};
          for (const id of foes) {
            updates[id] = {
              markSeen: true,
              chronicle:
                id === 'shen_qingshuang'
                  ? '裂穹雪夜竹篱外与你最后相见，未动血光而了断百年旧账，各自赴天门生死。'
                  : id === 'xie_wujiu'
                  ? '裂穹雪夜踏雪相见，弹落一枚焦黑算珠，言明百年商怨至此勾销、明朝各凭生死。'
                  : '裂穹雪夜院外一剑划石，笑言旧债至此两清，明朝天门下各凭剑锋。',
            };
          }
          return {
            might: 15,
            mind: 12,
            beatDelta: 1,
            completeThreads: ['thread_act5_eve'],
            setFlags: {
              act5_eve_done: true,
              act5_final_vow: 'severed',
              act5_snow_foes_csv: foes.join(','),
            },
            companionUpdates: updates,
            logSummary: '终战前夜踏雪会旧敌，未见血光而断尽前尘，道心愈发孤峻冷利。',
          };
        },
        outcome: [
          (s) => {
            const csv = String(s.flags.act5_snow_foes_csv ?? '');
            const foes = csv
              ? (csv.split(',') as CompanionId[])
              : getSnowFoes(s);
            const lines: string[] = [];
            if (foes.includes('shen_qingshuang')) {
              lines.push(
                s.flags.betrayed_shen_at_stele
                  ? '沈清霜立在寒梅影里，将半截早年被你出卖时割断的旧青云剑穗掷入雪堆，嗓音冷澈：“飞升崖的刀我记了一百年。明朝天门若倾，你我先斩上界，再算私怨。”'
                  : '沈清霜按剑立于雪中，眉目如冰：“道不同不相为谋。明朝天门洞开，若你敢卖下界苍生，我先斩你。”'
              );
            }
            if (foes.includes('xie_wujiu')) {
              lines.push(
                '谢无咎指尖弹飞一枚焦黑算珠落入你脚前雪地，笑意已无半分温度：“百年烂账一笔勾销。明天谁先死在金光里，谁就算赔本。”'
              );
            }
            if (foes.includes('cang_ming')) {
              lines.push(
                '复生的苍溟反手在冻石上划出一道半寸深剑痕，嗤笑转身：“小辈，这具新身子的因果今日两清。明日看谁的剑先递到那帮老贼脸上。”'
              );
            }
            return `你提剑推开木门，踩碎积雪停在三丈之外。无人拔剑，亦无多余寒暄。${lines.join('')}`;
          },
          '身影次第没入漫天灰雾。你俯身拂去剑鞘霜花，胸口最后一丝余念随之散尽。天裂之下，旧缘已了，明日只问生死。',
        ],
        outcomeContinueLabel: '收剑回庐，待明朝破境',
        bridgeNote: '雪夜断尽旧缘，你心中再无半分牵绊，唯余锋芒直指九霄。',
        next: 'act5_hub',
      },
      {
        id: 'eve_vow_solo',
        label: (s) =>
          getPhysicalLoyalAllies(s).length > 0
            ? '送别炉边故人后独坐拭剑至天明，决意孤身揽下死局、不累同道'
            : '独对孤灯拭剑至天明，立誓纵使举世无伴亦凭一剑叩天门',
        subtext: '孤勇问道，修为与心境双增，为孤剑斩天门积蓄锋芒。',
        insightTags: ['孤剑问道', '修为与心境双涨'],
        effect: {
          might: 12,
          mind: 12,
          beatDelta: 1,
          completeThreads: ['thread_act5_eve'],
          setFlags: { act5_eve_done: true, act5_final_vow: 'solo' },
          logSummary: '终战前夜独坐拭剑至晓，立誓以一己孤锋直面九霄天门。',
        },
        outcome: [
          (s) => {
            const allies = getPhysicalLoyalAllies(s).map(companionDisplayName);
            return allies.length > 0
              ? `夜深酒尽，你笑着送走${formatNameList(allies)}，轻轻掩上柴扉。这一剑逆冲天门十死无生，既已同行至此，最后那道死局你便只留给自己去扛。`
              : s.tags.includes('origin_orphan')
              ? '你用白布沾着冷酒，一寸寸擦净剑脊。自十六岁在青岚南市檐下听雨那日起，从炼气一路熬到元婴，哪一重关口不是拿血汗和孤夜换出来的？'
              : '你用白布沾着冷酒，一寸寸擦净剑脊。自十六岁踏进青岚城门那日起，从炼气一路熬到元婴，哪一重关口不是拿血汗和孤夜换出来的？';
          },
          (s) => {
            const foes = getSnowFoes(s);
            if (foes.length > 1) {
              return '油灯燃尽最后一滴灯油，东方云缝里透出惨白天光。你合上剑鞘起身推门，竹篱外那几道在风雪里枯立半夜的冷冽身影只与你隔空对望了一息，便默契各自转身没入灰雾，明朝天门下再分生死。';
            }
            if (foes.length === 1) {
              return '油灯燃尽最后一滴灯油，东方云缝里透出惨白天光。你合上剑鞘起身推门，竹篱外那道在风雪里枯立半夜的冷冽身影只与你隔空对望了一息，便默契转身没入灰雾，明朝天门下再分生死。';
            }
            return '油灯燃尽最后一滴灯油，东方云缝里透出惨白天光。你合上剑鞘起身推门，漫天残雪竟在离你三尺处自行分开。无论身畔有无同行者，明日这一剑皆足可问天。';
          },
        ],
        outcomeContinueLabel: '推门迎雪，归返观星台',
        bridgeNote: '孤夜拭剑至晓，你的元婴剑意已蓄至巅峰。',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 卷五自主谋划：元婴闭关 ====================
  act5_action_cultivate: {
    id: 'act5_action_cultivate',
    act: 'act5',
    title: '元婴温养',
    subtitle: '终战谋划 · 闭关潜修',
    location: '观星静室 · 聚元石台',
    paragraphs: [
      '九州灵气虽已枯竭九成，元婴法身却能直接吞吐星辉与高空清煞。你合目坐于石台，盘算着在叩响化神天堑之前，再把这一身底蕴磨厚几分。',
    ],
    choices: [
      {
        id: 'a5_cult_sky_watch',
        label: '静坐两载观摩苍穹裂纹，以无上心境锤炼元婴法身',
        subtext: '零花费，稳步提升修为与心境。',
        insightTags: ['零花费', '耗时两载', '心境大进'],
        effect: {
          timeMonths: 24,
          might: 10,
          mind: 12,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '两载寒暑静坐不动，你把头顶那道金灰裂痕当成磨刀石，每日以神识触碰其垂落的威压，碎了再聚，聚了再磨。出关时，紫府元婴已凝实得如真玉雕就，高天威压再难令你心湖生波。',
        ],
        outcomeContinueLabel: '收功出室，重回观星台',
        bridgeNote: '观裂穹苦修两载出关，元婴法身浑圆如一。',
        next: 'act5_hub',
      },
      {
        id: 'a5_cult_burn_stones',
        label: '燃耗三百灵石催动聚元古阵，以财力强提元婴修为',
        requirement: { minSpiritStones: 300, lockReason: '需灵石 300' },
        insightTags: ['耗灵石 300', '耗时一载', '修为暴涨'],
        effect: {
          timeMonths: 12,
          spiritStones: -300,
          might: 22,
          mind: 10,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '三百枚上品灵石在阵眼中同时化作白灰，磅礴灵潮如江河倒灌入你的紫府。仅仅一载工夫，元婴周身灵环便亮了整整一倍，距离化神圆满只差临门一脚。',
        ],
        outcomeContinueLabel: '散去阵灰，起身视事',
        bridgeNote: '豪掷三百灵石强修一载，元婴修为暴涨一截。',
        next: 'act5_hub',
      },
      {
        id: 'a5_cult_relic_drill',
        label: '以【斩天剑胚】或【残缺锁天印】为引，闭关推演逆冲天门杀招',
        visible: (s) =>
          s.relics.includes('severing_sword_embryo') ||
          s.relics.includes('broken_sky_seal'),
        insightTags: ['秘宝专属', '修为与心境双暴涨'],
        effect: {
          timeMonths: 18,
          might: 16,
          mind: 15,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '重宝悬空。一载半孤坐里你反复推演接引金光降世时的九枢回流，待双目重睁，指尖一缕剑意合着阵纹无声流转，竟将静室穹顶石梁震落一层细灰。锋芒已就。',
        ],
        outcomeContinueLabel: '收宝归鞘，重回局中',
        bridgeNote: '借秘宝推演逆冲天门之法，终战底气大增。',
        next: 'act5_hub',
      },
      {
        id: 'a5_cult_back',
        label: '暂不闭关，先处理外界要事',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 卷五动态易物会 ====================
  act5_market: {
    id: 'act5_market',
    act: 'act5',
    title: '末法易物会',
    subtitle: '卷五 · 终局易宝',
    location: '中州废城 · 地下易宝阁',
    market: {
      venueName: '末法易物会 · 压箱重宝流拍',
      venueDesc:
        '大劫将临，寻常灵石在天门之前已渐成废铁。覆灭大宗与避世老祖纷纷拿出镇派秘宝与灵材换取最后一口保命资粮，此刻正是查缺补漏的最后机会。',
      goodsIds: [
        'golden_vein_sand',
        'soul_amber',
        'spirit_marrow_oil',
        'ancient_rubbing',
      ],
      relicOffers: [
        {
          relicId: 'broken_sky_seal',
          basePrice: 720,
          category: 'curio',
          when: (s) => !s.relics.includes('broken_sky_seal'),
        },
        {
          relicId: 'severing_sword_embryo',
          basePrice: 560,
          category: 'artifact',
          when: (s) => !s.relics.includes('severing_sword_embryo'),
        },
        {
          relicId: 'nascent_lotus',
          basePrice: 620,
          category: 'elixir',
          when: (s) => !s.relics.includes('nascent_lotus'),
        },
      ],
    },
    paragraphs: [
      '地底点着数百盏幽蓝魂灯。数十名黑袍元婴与金丹沉默穿行木台间，昔日高悬庙堂的宗门重宝如今就摊在粗麻布上，无人还价。一颔首，一易主。',
      {
        when: (s) => s.relics.includes('baibao_token'),
        text: (s) =>
          isHostileCompanion(s, 'xie_wujiu')
            ? '你亮出【百宝斋玄铁令】，灰衣老掌柜只扫了一眼便冷冷摇头：“谢东家早传下死令，你这块铁令已废，易宝照原价算。”'
            : '你出示【百宝斋玄铁令】，坐镇高台的灰衣老掌柜立刻起身拱手。即便世道崩塌，谢无咎定下的八五折规矩在这里依旧作数。',
      },
      {
        when: (s) => s.spiritStones >= 800,
        text: '你袖中堆积如山的灵石在末法世道里反而成了最硬的筹码。几位正愁无法凑齐护山大阵灵材的商盟管事频频向你投来敬畏目光。',
      },
    ],
    choices: [
      {
        id: 'a5_market_fund_refugees',
        label: '散出两百灵石托商盟购粮护送避难散修与凡民南迁',
        visible: (s) => !s.flags.act5_funded_refugees,
        requirement: { minSpiritStones: 200, lockReason: '需灵石 200' },
        insightTags: ['散财聚心', '声望与入世大增', '限1回'],
        effect: {
          timeMonths: 2,
          spiritStones: -200,
          renown: 14,
          righteous: 10,
          worldly: 10,
          beatDelta: 1,
          setFlags: { act5_funded_refugees: true },
          logSummary: '于末法易物会散财两百灵石，托九州商盟庇护大批流离散修与凡俗南迁。',
        },
        outcome: [
          '两百枚上品灵石落在木案上，连冷面管事都愣了一瞬。不出半日，南迁车队便挂起了你的名号，十余名原本心灰意冷的金丹散修主动赶来护送，高声称终战那日愿替你守住山下阵脚。',
        ],
        outcomeContinueLabel: '离开易宝阁，返回观星台',
        bridgeNote: '易物会散财护民，九州暗处又多了几分向你靠拢的人心。',
        next: 'act5_hub',
      },
      {
        id: 'a5_market_leave',
        label: '清点妥当手中宝物，起身离开易物会',
        bridgeNote: '自末法易物会归来，行囊里的重宝与灵石已各就其位。',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 卷五故人传讯筹备 ====================
  act5_companion_parley: {
    id: 'act5_companion_parley',
    act: 'act5',
    title: '裂天传讯',
    subtitle: '故人筹备 · 终战传讯',
    location: '观星台 · 传讯香案',
    paragraphs: [
      '天裂威压日甚，万里传音符大多在半空烧成灰烬，唯有刻了私人灵印的旧信物或凡俗驿路尚能穿透云煞。你点起一炷凝神香，决定趁化神闭关前再向一位故人发出最后一道讯息。',
    ],
    choices: [
      {
        id: 'parley_shen',
        label: (s) =>
          s.tags.includes('sect_rebel') ||
          Boolean(s.flags.shen_left_sect) ||
          Boolean(s.flags.shen_freed_from_sect)
            ? '借旧日剑印传讯沈清霜，合演破门双剑式'
            : '以青云剑意传讯沈清霜，借寒锋合演破门双剑式',
        visible: (s) => isLoyalCompanion(s, 'shen_qingshuang'),
        insightTags: ['沈清霜专属', '修为与心境大涨'],
        effect: {
          timeMonths: 6,
          might: 12,
          mind: 10,
          beatDelta: 1,
          trackActionKey: 'companion_parley',
          companionUpdates: {
            shen_qingshuang: {
              affectionDelta: 8,
              markSeen: true,
              chronicle: '终战前隔空传剑三百里，与你合演破门剑式。',
            },
          },
        },
        outcome: [
          '三日后，一道素白剑光破开铅云落在你案前，化作三寸冰莲缓缓绽开。沈清霜将青云历代秘传的破阵剑意与她自己悟出的寒锋合二为一，封入莲心送到了你手里。你依式练剑半载，胸中剑气愈发冷冽无匹。',
        ],
        outcomeContinueLabel: '收剑入鞘，重回观星台',
        bridgeNote: '得沈清霜万里传剑印证，你的破门剑势已成。',
        next: 'act5_hub',
      },
      {
        id: 'parley_xie',
        label: (s) =>
          s.relics.includes('baibao_token')
            ? '以玄铁令印信联络谢无咎，结清九州商路最后一批红利与阵材'
            : '托百宝斋旧识传讯谢无咎，结清九州商路最后一批红利与阵材',
        visible: (s) => isLoyalCompanion(s, 'xie_wujiu'),
        insightTags: ['谢无咎专属', '大额灵石与声望'],
        effect: {
          timeMonths: 6,
          spiritStones: 320,
          renown: 8,
          beatDelta: 1,
          trackActionKey: 'companion_parley',
          companionUpdates: {
            xie_wujiu: {
              affectionDelta: 8,
              markSeen: true,
              chronicle: '于末法前夕替你变现九州商路余利，送来三百二十灵石军资。',
            },
          },
        },
        outcome: [
          '不过七日，百宝斋三辆玄铁马车趁夜驶到山下，卸下满满两箱上品灵石，另附谢无咎亲笔字条：“留着买命，别替我省钱。天门若能打穿，日后九州商税我分你一半。”',
        ],
        outcomeContinueLabel: '收妥军资，重回观星台',
        bridgeNote: '谢无咎送来三百二十灵石商路余利，终战资粮充足。',
        next: 'act5_hub',
      },
      {
        id: 'parley_cang',
        label: '请教苍溟长明元年九剑破阵残式，淬炼逆斩天门之锋',
        visible: (s) => isLoyalCompanion(s, 'cang_ming'),
        insightTags: ['苍溟专属', '修为暴涨'],
        effect: {
          timeMonths: 6,
          might: 15,
          mind: 8,
          beatDelta: 1,
          trackActionKey: 'companion_parley',
          companionUpdates: {
            cang_ming: {
              affectionDelta: 8,
              markSeen: true,
              chronicle: '倾囊相授长明元年九剑尊共创的碎天残式。',
            },
          },
        },
        outcome: [
          (s) =>
            isCangMingReborn(s)
              ? '苍溟一改往日漫不经心的腔调，亲手在青石地上划出九道深深剑沟，将长明元年九位剑尊临死前悟出的碎天残式一字不漏拆解给你。半载苦练后，你随手一划便能在空中斩出细微漆黑裂隙。'
              : '断玉悬于半空，青光在石壁上刻出九道凌厉剑痕。苍溟收起往日嗤笑，将长明元年九位剑尊临死前悟出的碎天残式逐一拆解给你。半载苦练后，你随手一划便能在空中斩出细微漆黑裂隙。',
        ],
        outcomeContinueLabel: (s) =>
          isCangMingReborn(s) ? '收剑拱手，返回观星台' : '谢过古剑前辈，返回观星台',
        bridgeNote: '习得长明元年碎天残式，元婴杀伐之力大进。',
        next: 'act5_hub',
      },
      {
        id: 'parley_su',
        label: (s) =>
          isSuZhiweiAliveInAct5(s)
            ? '致信青州杏林问安苏知微，重读无灵医案体悟遮蔽天幕之理'
            : s.flags.act5_eve_done
            ? '回信青州杏林阿芸，补问南岭无灵盲区的脉案细目'
            : '致信青州杏林，请苏知微徒弟阿芸寄来续写的《无灵医典》细读',
        visible: (s) => isSuWarm(s),
        insightTags: (s) => [
          '青州杏林传灯',
          s.truthClues.includes('clue_mortal_bloodline')
            ? '印证无灵盲区'
            : '得真相【上古无灵纪】',
          '心境与入世大涨',
        ],
        effect: (s) => {
          const hadClue = s.truthClues.includes('clue_mortal_bloodline');
          return {
            timeMonths: 6,
            mind: 16,
            worldly: 10,
            beatDelta: 1,
            trackActionKey: 'companion_parley',
            addTruthClues: ['clue_mortal_bloodline'],
            companionUpdates: isSuZhiweiAliveInAct5(s)
              ? {
                  su_zhiwei: {
                    affectionDelta: 8,
                    markSeen: true,
                    chronicle:
                      '裂穹前夕托驿卒捎来近札与干杏花瓣，以半生凡尘脉案稳你道心。',
                  },
                }
              : undefined,
            logSummary: isSuZhiweiAliveInAct5(s)
              ? hadClue
                ? '裂穹前夕致信青州杏林问安苏知微，重温无灵脉案印证【上古无灵纪】之理。'
                : '裂穹前夕致信青州杏林问安苏知微，重读无灵脉案悟得【上古无灵纪】之理。'
              : hadClue
              ? '裂穹前夕得青州杏林阿芸寄来续写医典，重温印证【上古无灵纪】无灵蔽天之理。'
              : '裂穹前夕得青州杏林阿芸寄来续写医典，补悟【上古无灵纪】无灵蔽天之理。',
          };
        },
        outcome: [
          (s) =>
            isSuZhiweiAliveInAct5(s)
              ? '油灯下，你展开苏知微托驿卒捎来的近札，又一页页重读那些夹着干杏花瓣的脉案。从青州怪疫到无灵古碑，她用半生心血记下的每一个凡人脉象，此刻全化作你心海里最坚固的屏障。纵然九霄金光倾泻，你也有把握守住一点灵台清明。'
              : s.flags.act5_eve_done
              ? '十日后青州快马送回一卷油布封好的南岭脉案补注。阿芸在纸尾细细标出了七处连灵识都扫不透的凡村谷口，并附言青州药炉薪火已蓄满，静候风波落定。油灯下读罢，你胸口多了一分脚踏实地的沉静。'
              : '不出十日，青州驿马送来一卷油布包得严实的书册与一小包新焙秋桂花。苏知微的徒弟阿芸在扉页用端正小楷写着：“师父生前未竟的南岭凡人脉案，弟子已替她续完。谨奉前辈一阅，青州杏林灯火不绝，望君珍重。”油灯下细读每一页字迹，人间代代相传的温热护住了你的灵台清明。',
        ],
        outcomeContinueLabel: '合上医典，返回观星台',
        bridgeNote: '细读青州杏林医典，人间薪火在心底澄明不灭。',
        next: 'act5_hub',
      },
      {
        id: 'parley_back',
        label: '暂不发讯，起身返回观星台',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 卷五随机奇遇（3则末法残景） ====================
  rand_act5_dying_sect: {
    id: 'rand_act5_dying_sect',
    act: 'act5',
    isRandomEvent: true,
    title: '封山孤钟',
    subtitle: '末法见闻 · 封山余音',
    location: '云岭东麓 · 断脉古宗',
    paragraphs: [
      '你御剑掠过云岭东麓，忽然听见群山间响起七声嘶哑的铜钟。一座传承八百年的中等剑派今晨彻底断了主灵脉，护山大阵像纸糊般塌成漫天星屑。',
      '青石阶上只剩老道一人。几口樟木箱大敞，里头是宗门八百年攒下的玉简与灵砂，被他分装成包塞给过路散修与猎户。见你气息深沉，他拱手苦笑：“门下早无有灵根的弟子了。留着也是陪石头烂掉。前辈用得上，拿去便是。”',
    ],
    choices: [
      {
        id: 'r5_sect_preserve',
        label: '郑重行晚辈礼，收存半卷上古地脉残图并助老道封好祖师祠堂',
        insightTags: ['心境与声望', '正道仁心'],
        effect: {
          mind: 10,
          renown: 10,
          righteous: 8,
        },
        outcome: [
          '你落步石阶，亲自以元婴真元在祖师祠堂外刻下百年避尘禁制，只取走那半卷记载九州支脉流向的残图。白发老道眼眶微红，冲你深深一揖。走出山门数里，那口孤钟才彻底停了余音。',
        ],
        outcomeContinueLabel: '收好残图 · 归返观星台',
        bridgeNote: '云岭古宗封山绝响，令你更明灭脉之痛。',
        next: '__RETURN__',
      },
      {
        id: 'r5_sect_buy_cache',
        label: '留下一百二十灵石作山门凡俗安家费，收走宗门最后一批金脉灵砂与凝神琥珀',
        requirement: { minSpiritStones: 120, lockReason: '需灵石 120' },
        insightTags: ['公道易货', '获金脉灵砂与凝神琥珀'],
        effect: {
          spiritStones: -120,
          mind: 6,
          righteous: 4,
          grantMarketGoods: [
            { goodId: 'golden_vein_sand', qty: 1, unitCost: 60 },
            { goodId: 'soul_amber', qty: 1, unitCost: 60 },
          ],
        },
        outcome: [
          '老道本不肯收，听你说这笔钱拿去替山下杂役和老人置办南迁田产，这才颤抖着双手接过灵石。你拎走那两箱珍稀灵材，身后的古老山门彻底合上了最后一扇朱漆木门。',
        ],
        outcomeContinueLabel: '收入行囊 · 归返观星台',
        bridgeNote: '以灵石换得云岭古宗残存灵材，也算替山脚凡人留了生路。',
        next: '__RETURN__',
      },
      {
        id: 'r5_sect_silent',
        label: '只默默伫立片刻，观残阵生灭砺剑意后转身离去',
        insightTags: ['冷眼出世', '修为与心境大涨'],
        effect: { mind: 12, might: 6, worldly: -8 },
        outcome: [
          '世间万宗皆有枯荣，大劫之下谁也替不了谁。你凝视护山大阵彻底熄灭前的最后一缕灵流走势，心底剑意反添三分冷冽，对着空荡山门微微颔首，旋即化虹离去。',
        ],
        outcomeContinueLabel: '化虹而去 · 返回观星台',
        next: '__RETURN__',
      },
    ],
  },

  rand_act5_false_prophet: {
    id: 'rand_act5_false_prophet',
    act: 'act5',
    isRandomEvent: true,
    title: '金光狂徒',
    subtitle: '末法见闻 · 末世人心',
    location: '西泽荒原 · 祭天土坛',
    paragraphs: [
      '西泽荒原聚着三百余惶恐散修。土坛上，一名赤目金丹披发嘶吼。他宣称天裂是上仙降罪，唯有自焚灵脉献出精血，方能在天门洞开时换一张活命仙籍。',
      '已有七八名绝望的炼气散修掏出匕首抵住丹田，坛脚堆满人们哭泣着献上的灵石与法器。',
    ],
    choices: [
      {
        id: 'r5_prophet_truth',
        label: '以元婴清音压全场，道破三千年收割真相唤醒愚迷众修',
        visible: (s) => s.truthClues.length >= 4,
        insightTags: (s) => [
          '真相专属',
          '声望大增',
          s.alignment.righteous >= -30 ? '斩天同盟' : '震散狂徒',
        ],
        effect: (s) => {
          const rallyAllies =
            s.tags.includes('sky_slayer_ally') || s.alignment.righteous >= -30;
          return {
            mind: 10,
            renown: 14,
            righteous: 8,
            addTags: s.alignment.righteous >= -30 ? ['sky_slayer_ally'] : undefined,
            setFlags: { r5_prophet_joined_ally: rallyAllies },
          };
        },
        outcome: [
          (s) =>
            s.flags.r5_prophet_joined_ally
              ? '铜铃碎了。你凌空落定土坛前，将天门为炉、飞升化药的真相一字字抖进荒原烈风，又挥袖震散狂徒袖底血丹尘灰，几十名尚存血性的筑基散修如梦初醒，当场折断仙盟木牌愿随斩天同盟共抗大劫。'
              : '铜铃碎了。你凌空落定土坛前，将天门为炉、飞升化药的真相一字字抖进荒原烈风，又挥袖震散狂徒袖底血丹尘灰。台下众修虽忌惮你周身森冷杀气不敢近身，仍如梦初醒般折断仙盟木牌，各自散去另寻反抗同道。',
        ],
        outcomeContinueLabel: '散去人群 · 归返观星台',
        bridgeNote: (s) =>
          s.flags.r5_prophet_joined_ally
            ? '你在西泽荒原唤醒数百绝望散修，斩天声势又盛一分。'
            : '你在西泽荒原当众拆穿飞升骗局，数百散修折牌散去。',
        next: '__RETURN__',
      },
      {
        id: 'r5_prophet_smash',
        label: '一掌震碎祭天土坛，打晕疯癫金丹驱散众修',
        insightTags: ['雷霆出手', '修为与声望'],
        effect: {
          might: 8,
          renown: 10,
          righteous: 6,
        },
        outcome: [
          '懒得废话。元婴掌风横扫过去，土坛连同装神弄鬼的狂徒一齐掀翻，台下散修见高阶大能出手顿时作鸟兽散，总算保住了今夜几条命。',
        ],
        outcomeContinueLabel: '拂袖离去 · 归返观星台',
        bridgeNote: '顺手拍散荒原邪坛，省得末世再添冤魂。',
        next: '__RETURN__',
      },
      {
        id: 'r5_prophet_loot',
        label: '冷眼驱散闹剧，顺手收走坛脚那堆无人敢认的供奉灵石',
        insightTags: ['得灵石 220', '冷峻行事'],
        effect: {
          spiritStones: 220,
          righteous: -8,
        },
        outcome: [
          '愚人自寻死路本就救不完。你一袖将疯癫金丹扫出十丈，在众人惊恐的目光里收起坛脚二百二十块散碎灵石。这笔横财留在骗子手里纯属糟蹋，正好拿去填你终战的筹码。',
        ],
        outcomeContinueLabel: '收好灵石 · 归返观星台',
        bridgeNote: '在西泽荒原顺手收了一笔无主灵石。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act5_mortal_harvest: {
    id: 'rand_act5_mortal_harvest',
    act: 'act5',
    isRandomEvent: true,
    title: '麦田无灵',
    subtitle: '末法见闻 · 凡尘盲区',
    location: '南岭深谷 · 无名农庄',
    paragraphs: [
      '穿过灵草尽枯的黑石谷，百亩麦浪豁然铺开。土坯农舍炊烟袅袅，犬吠鸡鸣清亮安稳。抬头看，那道令仙门胆寒的金灰天裂正悬在谷口上方。它丝缕抽干山壁最后一星灵气。唯独对田埂间挥镰抢收的凡人，视若无睹。',
      '一名晒得黝黑的老农见你衣袂染尘，热情地舀了半碗热腾腾的小米粥递来，顺手抹了把汗问：“客官从北边来？天上那道黄口子挂了大半年了，不知秋播前能不能下场透雨？”',
    ],
    choices: [
      {
        id: 'r5_wheat_protect',
        label: '喝尽热粥，暗中替山谷布下一道只挡落石妖风的隐蔽阵脚',
        insightTags: (s) => [
          '红尘入世',
          '心境大涨',
          s.truthClues.includes('clue_mortal_bloodline')
            ? '印证无灵盲区'
            : '窥得【上古无灵纪】',
        ],
        effect: (s) => ({
          mind: 12,
          worldly: 10,
          righteous: 6,
          addTruthClues: ['clue_mortal_bloodline'],
          setFlags: {
            r5_wheat_had_clue: s.truthClues.includes('clue_mortal_bloodline'),
          },
          logSummary: '南岭无灵农庄布隐阵护民，观天裂盲区悟得【上古无灵纪】真意。',
        }),
        outcome: [
          (s) =>
            `米粥滚烫朴素，带着久违的谷物香。你放回粗瓷碗，转身出谷时指尖逼出数缕极微弱的土元灵息埋入山石，只化作最寻常的挡风聚露之阵，不留半分仙家波动。回头再望，农舍灯火在无灵的夜色里安稳如常，${
              s.flags.r5_wheat_had_clue
                ? '你对上古无灵纪的真意又悟透了三分'
                : '你初次悟透了上古无灵纪的真意'
            }。`,
        ],
        outcomeContinueLabel: '辞别农庄 · 归返观星台',
        bridgeNote: '南岭麦田一碗热粥，让你更深切看清何为天幕盲区。',
        next: '__RETURN__',
      },
      {
        id: 'r5_wheat_ponder',
        label: '道谢辞过，立于谷口静看麦浪翻涌半晌',
        insightTags: ['心境圆满', '出世清观'],
        effect: {
          mind: 14,
          worldly: -4,
        },
        outcome: [
          '你没有打破山谷的宁静。风吹麦浪沙沙作响，高天金裂静默无言。世间万千修士苦求长生，反倒成了天炉里最显眼的炭火，这无灵凡谷倒比无数仙山活得更自在。',
        ],
        outcomeContinueLabel: '默然离谷 · 归返观星台',
        bridgeNote: '南岭深谷一瞥，你对生死与天命多了几分透彻。',
        next: '__RETURN__',
      },
    ],
  },

  // ==================== 卷五终关：化神问道（破境 / 隐世分岔） ====================
  act5_deity_breakthrough: {
    id: 'act5_deity_breakthrough',
    act: 'act5',
    title: '化神问道',
    subtitle: '卷五终关 · 天人交感',
    location: '天裂正下 · 问道绝巅',
    checkpoint: true,
    checkpointLabel: '卷五 · 化神问道关口',
    paragraphs: [
      '问道绝巅寸草不生，狂风卷着碎金般的云煞拍打岩壁。你盘膝落座，紫府内的元婴已丰满至极，只差一步便可褪去下界凡壳，令神魂与天地大道相合，踏入寿逾两千载的【化神问道】之境。',
      '可你也再清楚不过这一步的代价。元婴合道化神的刹那，你的神魂气息将如黑夜烽火般被高悬九霄的天门牢牢锁定，再无藏身之所。一旦跨过这道门槛，三千年未曾停歇的接引金光便会直指你的眉心。',
      {
        when: (s) =>
          s.alignment.righteous >= -20 &&
          ((s.truthClues.length >= 4 && s.mind >= 300) ||
            (s.relics.includes('mortal_hearth_talisman') && s.mind >= 220)),
        text: '你指尖忽然停顿半寸。若在合道前的最后一瞬刻意收束神魂、自封境界于半步化神之下，再借无灵盲区隐去灵根气息，高天那只只盯着成熟大药的巨眼，便永远找不到你的踪迹。',
      },
    ],
    choices: [
      {
        id: 'deity_with_lotus',
        label: '服下【太阴育婴莲】，护持元婴安稳合道踏入【化神问道】',
        subtext: '消耗【太阴育婴莲】，无损渡过化神天劫，修为与心境大涨，直面天门终局。',
        visible: (s) => s.relics.includes('nascent_lotus'),
        insightTags: ['消耗【太阴育婴莲】', '踏入化神问道', '直入叩天门'],
        effect: {
          timeMonths: 24,
          removeRelics: ['nascent_lotus'],
          might: 20,
          mind: 18,
          setRealm: 'deity_transform',
          setAct: 'act6',
          addTags: ['deity_dao'],
          logSummary: '服太阴育婴莲稳渡化神天劫，寿元增至两千载，静候九霄天门洞开。',
        },
        outcome: [
          '霜莲入口即化。清冽太阴真气裹住紫府元婴，九道紫金天雷接连劈落绝巅，全被寒华稳稳卸入山岩！两载转瞬。神魂透体而出，百里山河草木尽收灵觉。',
          '天裂骤颤。亿万道金丝顺着天幕悍然锁向你的眉心！你缓缓睁眼。两千载寿元的化神威压直冲九霄，硬生生接下了天门落下的第一声钟鸣。',
        ],
        outcomeContinueLabel: '化神圆满 · 启卷六《叩天门》',
        next: 'act6_sky_gate',
      },
      {
        id: 'deity_with_companion',
        label: '邀生死挚友护法共抗化神雷劫，稳步踏入【化神问道】',
        subtext: '由高羁绊故人在绝巅外围替你分担劫雷，安稳踏入化神并迎向终章。',
        visible: (s) =>
          LOYAL_COMPANION_IDS.some(
            (id) => isLoyalCompanion(s, id) && s.companions[id].affection >= 30
          ),
        insightTags: ['挚友护法', '踏入化神问道', '直入叩天门'],
        effect: (s) => {
          const updates: NonNullable<
            import('../engine/types').ChoiceEffect['companionUpdates']
          > = {};
          for (const id of LOYAL_COMPANION_IDS) {
            if (isLoyalCompanion(s, id) && s.companions[id].affection >= 30) {
              updates[id] = {
                affectionDelta: 6,
                markSeen: true,
                chronicle: '于问道绝巅替你护法抵挡化神雷劫，共迎天门洞开。',
              };
            }
          }
          return {
            timeMonths: 30,
            might: 18,
            mind: 18,
            setRealm: 'deity_transform',
            setAct: 'act6',
            addTags: ['deity_dao'],
            companionUpdates: updates,
            logSummary: '得生死挚友护法渡过化神天劫，破境入【化神问道】，共迎天门终局。',
          };
        },
        outcome: [
          (s) => {
            const physical = (['shen_qingshuang', 'xie_wujiu', 'cang_ming'] as CompanionId[])
              .filter((id) => {
                if (!isLoyalCompanion(s, id) || s.companions[id].affection < 30) return false;
                if (id === 'cang_ming') return isCangMingReborn(s);
                return true;
              })
              .map(companionDisplayName);
            const hasJadeCangMing =
              !isCangMingReborn(s) &&
              isLoyalCompanion(s, 'cang_ming') &&
              s.companions.cang_ming.affection >= 30;

            if (physical.length === 0 && hasJadeCangMing) {
              return '劫云压顶之际，焦黑断玉自行悬于你头顶三尺，苍溟燃起三千年积蓄的青色残魂，硬生生替你引偏了最毒辣的三道紫金天雷。';
            }
            if (physical.length === 1) {
              const base = `劫云压顶之际，${physical[0]}孤身立于绝巅外缘，剑气与灵光直迎雷幕，硬生生替你拦下了第一重劫雷余波。`;
              return hasJadeCangMing
                ? `${base}头顶三尺处，焦黑断玉亦嗡鸣绽放青芒，苍溟以残魂替你引偏了一道斜刺而来的毒雷。`
                : base;
            }
            const base = `劫云压顶之际，${formatNameList(physical)}分立绝巅四周，剑气与阵光织成一片不透风的穹盖，硬生生替你削去了三成天雷余波。`;
            return hasJadeCangMing
              ? `${base}你头顶三尺处，焦黑断玉亦绽出澄澈青光，苍溟以三千年残魂替你护住灵台。`
              : base;
          },
          '你趁势散去元婴桎梏，神魂与天地残脉合而为一。长啸声响彻孤峰，你正式踏入化神问道之境。头顶裂穹应声发出低沉轰鸣，三千年一开的金色天门，终于要在你眼前现出全貌。',
        ],
        outcomeContinueLabel: (s) => {
          const hasPhysical = (['shen_qingshuang', 'xie_wujiu', 'cang_ming'] as CompanionId[]).some(
            (id) =>
              isLoyalCompanion(s, id) &&
              s.companions[id].affection >= 30 &&
              (id !== 'cang_ming' || isCangMingReborn(s))
          );
          return hasPhysical ? '起身并肩 · 启卷六《叩天门》' : '收玉起身 · 启卷六《叩天门》';
        },
        next: 'act6_sky_gate',
      },
      {
        id: 'deity_with_stones_array',
        label: '豪掷五百灵石布设九霄引雷大阵，以雄厚财力硬卸化神紫雷',
        subtext: '以重金购置阵桩与上品灵石泄雷导地，稳健踏入【化神问道】。',
        visible: (s) => s.spiritStones >= 500,
        insightTags: ['耗灵石 500', '大阵泄雷', '稳入化神问道'],
        effect: {
          timeMonths: 30,
          spiritStones: -500,
          might: 18,
          mind: 16,
          setRealm: 'deity_transform',
          setAct: 'act6',
          addTags: ['deity_dao'],
          logSummary: '于问道绝巅豪掷五百灵石布下九霄引雷大阵，安稳渡劫踏入【化神问道】。',
        },
        outcome: [
          '五百块上品灵石嵌入问道台九座雷柱，瞬间在绝巅撑起一重金碧交辉的引雷大阵。九道紫金雷柱接连劈落，七成雷威被阵网导入山腹岩层消解殆尽，余下雷火恰好替你锻尽元婴最后几丝浊气。',
          '两载半后阵柱化作焦灰，你却从容踏出阵心，步入寿逾两千载的【化神问道】之境。高天裂口轰然外张，九霄巨门已现轮廓。',
        ],
        outcomeContinueLabel: '散阵仰天 · 启卷六《叩天门》',
        next: 'act6_sky_gate',
      },
      {
        id: 'deity_pure_will',
        label: '不借外物丹药，凭百年磨砺出的修为与道心硬渡化神天劫',
        subtext: (s) =>
          `无丹无阵孤身迎雷：修为+心境≥620 稳渡，320 至 619 且心境≥110 重伤强渡，不足则雷劫道消（当前修为+心境 ${s.might + s.mind}，心境 ${s.mind}）。`,
        insightTags: (s) => [
          '孤身渡劫兜底',
          `稳渡≥620 / 320~619且心境≥110重伤（当前${s.might + s.mind}，心境${s.mind}）`,
        ],
        effect: (s) => {
          const strong = s.might + s.mind >= 620;
          const collapse = !strong && (s.might + s.mind < 320 || s.mind < 110);
          if (collapse) {
            return {
              timeMonths: 0,
              setFlags: { deity_pure_failed: true, deity_pure_injured: false },
              logSummary: '无宝无阵强扛化神紫金雷劫，底蕴与心境双双失守，魂散道消于绝巅。',
            };
          }
          return {
            timeMonths: 36,
            might: strong ? 18 : -8,
            mind: strong ? 16 : -6,
            setRealm: 'deity_transform',
            setAct: 'act6',
            addTags: ['deity_dao'],
            setFlags: {
              deity_pure_failed: false,
              deity_pure_injured: !strong,
            },
            logSummary: strong
              ? '于问道绝巅孤身硬扛紫金雷劫，终成【化神问道】之身，直面九霄天门。'
              : '孤身硬扛化神紫雷虽受重创折损几分元气，仍咬牙撑进【化神问道】之境。',
          };
        },
        outcome: [
          (s) =>
            s.flags.deity_pure_failed
              ? '无丹无阵之下，九道紫金雷柱如天河倾泻砸碎你的护体灵光。心境防线在雷音嘶啸里崩解，未及合道的元婴瞬间被天火吞没，只余一缕焦灰飘向裂穹。'
              : !s.flags.deity_pure_injured
              ? '三载枯坐，九道紫金雷柱接连灌顶。你连眉头都没皱一下，凭着百年修出的深厚底蕴将狂暴雷火生生炼成淬魂之火，元婴一跃合道，衣袍焦黑却脊背笔直。'
              : '九道紫金雷柱砸落绝巅！护体灵光寸寸崩裂，经脉焦灼，血沫漫出唇角。你没退半步。生死一线，咬碎牙关以百年不屈孤勇硬扛末道天火，虽损元气，终踏化神！',
          (s) =>
            s.flags.deity_pure_failed
              ? '问道绝巅风声呜咽，这一世逆天之途终究折戟在天门之前。'
              : '神魂合道那一瞬，高天裂口轰然向外扩张。你拭去唇边血迹，抬眼望向正缓缓推开的金色巨门。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.deity_pure_failed
            ? '雷劫道消 · 展卷终局'
            : '踏入化神 · 启卷六《叩天门》',
        next: (s) => (s.flags.deity_pure_failed ? 'ending_fallen_path' : 'act6_sky_gate'),
      },
      {
        id: 'deity_seal_earth_immortal',
        label: '【半步自封】在合道前一息收剑自封神魂，借无灵盲区瞒过天门收割',
        subtext: '于合道前一息隐去灵息瞒过九霄冷眼，此择将直接收束此世，步入隐世结局【红尘散仙】。',
        visible: (s) =>
          s.alignment.righteous >= -20 &&
          ((s.truthClues.length >= 4 && s.mind >= 300) ||
            (s.relics.includes('mortal_hearth_talisman') && s.mind >= 220)),
        insightTags: ['隐世终局【红尘散仙】', '瞒天过海'],
        effect: {
          timeMonths: 12,
          mind: 12,
          worldly: 10,
          logSummary: '洞悉天门只收化神之秘，于绝巅半步收剑自封修为，隐入人间山河。',
        },
        outcome: [
          (s) =>
            s.relics.includes('mortal_hearth_talisman')
              ? '元婴将要破壳化神的刹那，你却唇角微扬，反手落下九道自封灵印。即将沸腾冲天的神魂气息跌回凡俗尘埃，连一丝灵根波动都隐没在【无灵归尘印】与百年心境之下。'
              : '元婴将要破壳化神的刹那，你却唇角微扬，反手落下九道自封灵印。即将沸腾冲天的神魂气息跌回凡俗尘埃，在澄澈如洗的百年道心遮掩下寂然无波。',
          '高悬头顶的金灰裂痕似乎在绝巅上空迟疑地扫过两轮，终究没能捕捉到任何“熟透大药”的讯号，很快冷漠地移向了别处。',
          '你起身抖落{{robe}}石屑，把佩剑埋进山顶乱石堆里，迎着初升的淡白晨光走下山去。天门爱开便开，九州爱争便争，从今往后，这千载寿元只属于青山白云与人间酒肆。',
        ],
        outcomeContinueLabel: '步入终局 · 红尘散仙',
        next: 'ending_earth_immortal',
      },
      {
        id: 'deity_back',
        label: '暂缓破境，先退回观星台再作筹备',
        next: 'act5_hub',
      },
    ],
  },

  // ==================== 卷六开篇：天门洞开 ====================
  act6_sky_gate: {
    id: 'act6_sky_gate',
    act: 'act6',
    title: '天门洞开',
    subtitle: '卷六 · 叩天门（长明三千年大劫）',
    location: '九霄裂穹之下 · 问道台',
    paragraphs: [
      '踏入化神不过半月，天裂开了。云海向东西无声退避，一扇万丈巨门以白玉冷金铸就，缓缓浮出九霄。门扉推开一线。惨白的接引金光倾泻而下，照得整座九州连影子都无处藏身。',
      '一道不含半分喜怒的宏大嗓音在九州修士识海同时响起，平淡得像药童查验火候：“三千载期满。下界丹熟，化神以上者，速入接引金光，莫误仙炉时辰。”',
      '千里外几座大宗主峰上，数位苦修七八百年的老祖热泪盈眶，呼喊着先祖名号化虹冲进金柱。凡人肉眼里，他们沐浴仙乐扶摇直上。唯有你展开化神神识穿透云层，看见那些元神刚触门楣便如雪遇沸油，寸寸化作灰白药渣，被门后漆黑巨炉吸净。',
      {
        when: (s) => Boolean(s.flags.ev_old_daoist_talisman),
        text: '耳畔忽然响起年少雨夜破庙里那名疯道士的大笑：“记住，天门开了也莫要上去！”',
      },
      {
        when: (s) => Boolean(s.flags.ev_spirit_eyes),
        text: '你天生异瞳隐隐刺痛。幼年暮色里见过无数次的那缕淡青游丝，此刻正汇作万丈洪流涌入巨门。',
      },
      {
        when: (s) => s.truthClues.includes('clue_gate_weakness'),
        text: '你的目光越过漫天金辉，锁死门框内侧那九点微旋的暗金漩涡。正如群雄会上所推演，接引金光垂落的这数十息间，下界九座阵眼正反向敞开。那是唯一能从下往上反刺天门的破绽。',
      },
      {
        when: (s) => getBondedCompanions(s).length > 0,
        text: (s) => {
          const physical = getBondedCompanions(s)
            .filter((id) => id !== 'cang_ming' || isCangMingReborn(s))
            .map(companionDisplayName);
          const hasJadeCangMing =
            getBondedCompanions(s).includes('cang_ming') && !isCangMingReborn(s);
          if (physical.length === 0 && hasJadeCangMing) {
            return '袖中【焦黑断玉】骤然腾空化出万丈青芒。苍溟三千年的孤魂迎着漫天金压放声长笑，替你先一步劈开了接引金光外围的一道缺口。';
          }
          const base = `东侧绝壁传来清越剑吟与阵火轰鸣。${formatNameList(physical)}果然如雪夜所誓，已抢先占住外围阵眼，替你撕开了漫天金光威压的一道缺口，正远远朝你颔首。`;
          return hasJadeCangMing
            ? `${base}你袖中焦黑断玉亦嗡鸣震颤，苍溟的残魂剑意与你融为一体。`
            : base;
        },
      },
      {
        when: (s) => Boolean(s.flags.deity_pure_injured),
        text: '硬扛化神紫雷留下的焦裂经脉仍在隐隐作痛，每吸一口金光威压都如吞铁屑，可你按在剑柄上的手背却稳得未颤半分。',
      },
      {
        when: (s) =>
          s.relics.includes('mortal_hearth_talisman') || s.tags.includes('mortal_keeper'),
        text: (s) => {
          const suMet = s.companions.su_zhiwei.met;
          if (s.relics.includes('mortal_hearth_talisman')) {
            return suMet
              ? '贴身收藏的【无灵归尘印】在漫天金光里始终温润沉静，连一丝涟漪都未惊动。苏知微穷尽半生找出的那条凡尘活路，此刻正稳稳压在你掌心。'
              : '贴身收藏的【无灵归尘印】在漫天金光里始终温润沉静，连一丝涟漪都未惊动。槐阴无灵古碑指出的那条凡尘活路，此刻正稳稳压在你掌心。';
          }
          return suMet
            ? '无灵古碑上的古篆与青州杏林的旧愿在心湖静静亮起，在这漫天灼人的金辉之下，替你守住了一方不被天幕察觉的清明。'
            : '槐阴无灵古碑上的三万年古篆在心湖静静亮起，在这漫天灼人的金辉之下，替你守住了一方不被天幕察觉的清明。';
        },
      },
    ],
    choices: [
      {
        id: 'act6_step_to_climax',
        label: '迎着倾泻而下的接引金光踏上孤峰绝顶，替这三千年给出你的回答',
        insightTags: ['步入最终抉择', '收束全篇命盘'],
        effect: (s) => ({
          mind: 6,
          logSummary:
            getBondedCompanions(s).length > 0
              ? '天门洞开、金光倾泻之际，与挚友并肩登临裂穹绝顶直面上界接引使者。'
              : '天门洞开、金光倾泻之际，孤身登临裂穹绝顶直面上界接引使者。',
        }),
        outcome: [
          (s) => {
            const originAnchor = s.tags.includes('origin_orphan')
              ? '十六岁那年青岚南市檐下的旧雨'
              : s.tags.includes('origin_scout')
              ? '十六岁那年北境界碑下的风沙与铁牌'
              : s.tags.includes('origin_fallen_clan')
              ? '十六岁那年破败旧祠里的春雨与家印'
              : '十六岁那年翠微崖上的湿冷松雾';
            const memories: string[] = [originAnchor];
            if (s.companions.su_zhiwei.met && !isHostileCompanion(s, 'su_zhiwei')) {
              memories.push('青州杏林的桂花药香');
            }
            if (
              s.companions.cang_ming.met &&
              !isCangMingSealed(s) &&
              !isHostileCompanion(s, 'cang_ming')
            ) {
              memories.push('断玉里三千年前的冷笑');
            }
            if (s.companions.xie_wujiu.met && !isHostileCompanion(s, 'xie_wujiu')) {
              memories.push('百宝斋翻飞的算珠');
            }
            if (s.truthClues.includes('clue_stele_gap')) {
              memories.push('飞升碑背面那道被剑削去大半的血色反文');
            } else if (
              s.companions.shen_qingshuang.met &&
              !isHostileCompanion(s, 'shen_qingshuang')
            ) {
              memories.push('那抹清冷如雪的霜剑寒光');
            }
            if (memories.length === 1) {
              memories.push('百年问道间踏过的枯脉荒山与孤灯长夜');
            }
            const dh = s.flags.dao_heart;
            const heartEcho =
              dh === 'seek_longevity'
                ? '初入仙途时立下“唯我身久存”的那份执念，此刻已被岁月淬炼得透彻如冰。'
                : dh === 'seek_truth'
                ? '当年那句“三千年天门无归音，我偏要看个明白”，终于走到了揭晓答案的这一刻。'
                : dh === 'seek_fortune'
                ? '昔年想掌财借势、快意人间的心气，兜转百年竟连九霄之上的账本也一并算清。'
                : dh === 'protect_one'
                ? '当年立誓“人间总该留一盏灯”的微末初愿，百年风霜过后仍在胸口亮着。'
                : '';
            return `你一步步踏碎金光走上问道台最高处。风把衣袍吹得笔直，百年修仙记忆在识海里一闪而过：${memories.join('，')}。${heartEcho}`;
          },
          '一道最粗壮的接引金柱轰然罩落你的头顶。九霄之上，天门阵枢的九道漩涡正在眼前缓缓张开。',
        ],
        outcomeContinueLabel: '直面天门 · 落子终局',
        next: 'act6_final_choice',
      },
    ],
  },

  // ==================== 卷六最终抉择（七大终局总汇） ====================
  act6_final_choice: {
    id: 'act6_final_choice',
    act: 'act6',
    title: '叩问天门',
    subtitle: '卷六终章 · 终极抉择',
    location: '九霄天门正下 · 金柱之中',
    checkpoint: true,
    checkpointLabel: '卷六终局 · 叩天门最终抉择',
    paragraphs: [
      '金光如熔铁。炽烈吸力死死扯住你的化神元神，欲将你拖进那座燃了三千年的上界大炉，脚下山河震颤，头顶九道逆枢明灭不定。天地死寂。只剩你的呼吸。',
      '这一步迈向何方，便决定了九州往后三千年的命运，也决定了{{name}}此生究为仙炉余烬，还是破天之人。',
    ],
    choices: [
      {
        id: 'final_sever_sky_bonded',
        label: (s) => {
          const names = getBondedCompanions(s).map(companionDisplayName);
          return `【双剑破长明】与${formatNameList(names)}并肩逆冲九大阵眼，斩碎三千年伪天门`;
        },
        subtext: '携生死相托的挚友并肩迎光而上，共斩三千年牧灵伪天门。',
        visible: (s) => s.truthClues.length >= 5 && getBondedCompanions(s).length > 0,
        insightTags: ['真结局【双剑破长明】', '携挚友共破天门'],
        effect: {
          logSummary: '携生死挚友逆冲天门九枢，双锋合力斩碎三千年牧灵伪仙门，携手生还人间。',
        },
        outcome: [
          (s) => {
            const physical = getBondedCompanions(s)
              .filter((id) => id !== 'cang_ming' || isCangMingReborn(s))
              .map(companionDisplayName);
            const hasJadeCangMing =
              getBondedCompanions(s).includes('cang_ming') && !isCangMingReborn(s);
            if (physical.length === 0 && hasJadeCangMing) {
              return '你反手抽出长剑，将袖中焦黑断玉抛入剑锋！苍溟三千年的孤魂剑意轰然灌入剑身，与你的化神灵光在半空凝作一柄横贯千里的青白光刃。';
            }
            const base = `你反手抽出长剑，冲着东麓放声长啸！下一瞬，${formatNameList(physical)}化作决绝长虹冲破金幕，与你的化神灵光在半空交汇成一柄横贯千里的璀璨光刃。`;
            return hasJadeCangMing
              ? `${base}焦黑断玉亦在剑脊之上碎作青芒，汇入这逆天一击。`
              : base;
          },
          (s) => {
            const multi = getBondedCompanions(s).length >= 2;
            const helpPhrase = multi
              ? '数道熟悉的剑气与阵光自左右合流托住你的攻势'
              : '那股熟悉的力量稳稳托住你的腕骨';
            return s.relics.includes('broken_sky_seal')
              ? `你们逆着倾泻的接引金柱直撞九霄。外围三座阵眼在合力一击下崩裂，上界使者第一次发出带着惊怒的厉啸，试图强行合拢天门将你们碾碎在门缝之中。千钧一发之际，你以残缺锁天印卡死门枢，${helpPhrase}，合力递出最后一剑。`
              : `你们逆着倾泻的接引金柱直撞九霄。外围三座阵眼在合力一击下崩裂，上界使者第一次发出带着惊怒的厉啸，试图强行合拢天门将你们碾碎在门缝之中。千钧一发之际，你以化神剑意硬生生楔入第九逆枢，${helpPhrase}，合力递出最后一剑。`;
          },
          (s) => {
            const physical = getBondedCompanions(s).filter(
              (id) => id !== 'cang_ming' || isCangMingReborn(s)
            );
            const hasJadeCangMing =
              getBondedCompanions(s).includes('cang_ming') && !isCangMingReborn(s);
            return physical.length === 0 && hasJadeCangMing
              ? '万丈白玉巨门轰然炸成漫天金雨！狂暴气浪将你掀回云海。跌落青峰雪地时虽伤痕累累，你到底活着落回了人间，掌中那枚断玉却在最后一缕金雨里彻底归于温凉。抬头望去，压在九州头顶的那道天裂，彻底熄灭了。'
              : '万丈白玉巨门轰然炸成漫天金雨！狂暴气浪将你们掀回云海。跌落青峰雪地时虽伤痕累累，你们到底一起活了下来。抬头望去，压在九州头顶的那道天裂，彻底熄灭了。';
          },
        ],
        outcomeContinueLabel: '展卷终局 · 双剑破长明',
        next: 'ending_sever_sky_bonded',
      },
      {
        id: 'final_sever_sky_solo',
        label: '【孤剑斩天门】独身逆上接引金柱，以斩天剑意与孤锋断绝牧灵锁链',
        subtext: '孤身逆行九霄，凭绝世锋芒与洞悉的天机真相独自斩断三千年天门。',
        visible: (s) =>
          s.truthClues.length >= 5 &&
          (s.relics.includes('severing_sword_embryo') ||
            s.relics.includes('broken_sky_seal') ||
            s.might >= 220),
        insightTags: ['真结局【孤剑斩天门】', '一剑独断三千年'],
        effect: {
          logSummary: '孤身逆行接引金光直上九霄，以一身化神大道斩断三千年天门锁链。',
        },
        outcome: [
          (s) => {
            const hasPhysicalBonded = getBondedCompanions(s).some(
              (id) => id !== 'cang_ming' || isCangMingReborn(s)
            );
            const lead = hasPhysicalBonded
              ? '你回首朝东麓遥遥一揖，反手挥出一道剑气隔断来路不许故人涉险，旋即收拢一身化神修为，化作逆天孤锋直刺金柱中央。'
              : '你不退反进，收拢一身化神修为，化作一道逆天孤锋直刺金柱中央。';
            return `${lead}上界金光烧焦了你的{{robe}}，刮落护体灵甲，你却越战越狂，把百年见过的所有不公与白骨尽数压进这一剑。`;
          },
          '轰鸣震彻九州万里。剑锋楔入天门核心第九阵眼，久未动摇的牧灵锁链应声崩断。上界使者怒斥下界蝼蚁竟敢毁炉，却只能眼睁睁看着连通两界的通道在璀璨剑火中坍塌。',
          '漫天金灰如雪飘落山河，断去抽灵枷锁的大地深处重新传出低沉脉动。九霄云散。九州苍生仰头望向空荡蓝天，记住了那道孤绝逆行的背影。',
        ],
        outcomeContinueLabel: '展卷终局 · 孤剑斩天门',
        next: 'ending_sever_sky_solo',
      },
      {
        id: 'final_mortal_new_era',
        label: (s) =>
          s.relics.includes('mortal_hearth_talisman')
            ? '【无灵新世】借【无灵归尘印】逆转大阵，焚尽凡人血脉里的上界灵根之种'
            : '【无灵新世】借无灵古碑玄理逆转大阵，焚尽凡人血脉里的上界灵根之种',
        subtext: '承继凡尘守灯之志，散去天地灵根牧种，令高天巨眼永失收割坐标。',
        visible: (s) =>
          s.alignment.righteous >= -20 &&
          (s.relics.includes('mortal_hearth_talisman') ||
            s.tags.includes('mortal_keeper') ||
            s.truthClues.includes('clue_mortal_bloodline')),
        insightTags: ['真结局【无灵新世】', '断绝灵根，还世间自由'],
        effect: {
          logSummary: '以化神修为催动无灵归尘大阵，焚去九州血脉中的上界灵根牧种，开启无灵新世。',
        },
        outcome: [
          (s) =>
            s.relics.includes('mortal_hearth_talisman')
              ? '你收剑入鞘，将【无灵归尘印】按向脚下大地，把一身化神灵力连同头顶倾泻而下的接引金光一并引入逆转的九州地脉。'
              : '你收剑入鞘，依着无灵古碑的古法将双掌按向脚下大地，把一身化神灵力连同头顶倾泻而下的接引金光一并引入逆转的九州地脉。',
          '一道温柔得近乎无声的白光掠过山川城郭。大地上所有被上界播撒在凡人血脉深处的灵根牧种纷纷化作青烟消散。九霄之上，天门巨眼猛地一滞，俯视着这片再无半点灵气坐标的广阔人间，彻底失去了收割的目标，在死寂中缓缓闭合隐没。',
          '你的修为随之如春雪消融，发丝悄然染上一缕霜白。可你听见山下青州城的早市喧闹起来，此后千秋万代，人间再无仙凡之别，也再无高悬头顶的冷眼与丹炉。',
        ],
        outcomeContinueLabel: '展卷终局 · 无灵新世',
        next: 'ending_mortal_new_era',
      },
      {
        id: 'final_gilded_realm',
        label: (s) => {
          const useBaibaoNet =
            s.companions.xie_wujiu.met &&
            !isHostileCompanion(s, 'xie_wujiu') &&
            s.companions.xie_wujiu.affection >= 20;
          return s.relics.includes('spirit_vein_deed')
            ? '【万金镇山河】祭出【九州灵脉契】与商盟大阵，以倾世财力逼退上界收割使'
            : useBaibaoNet
            ? '【万金镇山河】调动百宝商盟暗网与千金商契，以倾世财力逼退上界收割使'
            : '【万金镇山河】调动七十二城散修金网与千金商契，以倾世财力逼退上界收割使';
        },
        subtext: '以万城灵石与九州商契重分地气，让上界仙使算清破阵代价后知难而退。',
        visible: (s) =>
          (s.relics.includes('spirit_vein_deed') &&
            (s.spiritStones >= 300 ||
              s.tags.includes('merchant_fame') ||
              Number(s.flags.total_trade_profit ?? 0) >= 260)) ||
          (s.spiritStones >= 1000 &&
            (s.tags.includes('merchant_fame') ||
              s.companions.xie_wujiu.affection >= 30)),
        insightTags: ['商道终局【万金镇山河】', '以九州商盟与重金抗天'],
        effect: {
          logSummary: '燃尽百年蓄积与万里商契地脉，布下镇金大阵逼退上界使者。',
        },
        outcome: [
          (s) => {
            const useBaibaoNet =
              s.companions.xie_wujiu.met &&
              !isHostileCompanion(s, 'xie_wujiu') &&
              s.companions.xie_wujiu.affection >= 20;
            return s.relics.includes('spirit_vein_deed')
              ? useBaibaoNet
                ? '你从袖中抽出【九州灵脉契】高举过顶，同时捏碎百宝商盟九枚赤金传令符。九州三十六座大城同时燃起万丈灵石烽火，百万灵石与商盟契约法阵串联成覆盖山河的赤金天网。'
                : '你从袖中抽出【九州灵脉契】高举过顶，同时捏碎九枚自铸的赤金传令符。九州三十六座大城同时燃起万丈灵石烽火，百万灵石与矿契法阵串联成覆盖山河的赤金天网。'
              : useBaibaoNet
              ? '袖中令符尽出。你甩出百宝暗网总帖与九枚千金商契，以千石燃亮阵枢，九州三十六座商埠同时升起万丈烽火，顷刻织成覆盖山河的赤金天网！天地为之一赤。'
              : '袖中令符尽出。你甩出七十二城金网总帖与九枚千金商契，以千枚灵石燃亮阵枢，九州三十六座商埠同时升起万丈烽火，顷刻织成覆盖山河的赤金天网！天地为之一赤。';
          },
          '金柱撞网，雷火炸裂！寸步难进。九霄上那道冷漠嗓音陡然一滞，显然在细算强行破阵要折损多少上界本源，僵持半炷香后，金柱无声回缩。天门关了。',
          '连仙人也要算一笔盈亏账。你拂去袖口金灰，望着山下重新亮起的万家灯火轻笑出声：这九州山河，往后由契约与灵石说了算。',
        ],
        outcomeContinueLabel: '展卷终局 · 万金镇山河',
        next: 'ending_gilded_realm',
      },
      {
        id: 'final_demonic_devour',
        label: '【以魔吞界】张开吞煞魔炉逆吸接引金光，把上界仙炉反炼作己身资粮',
        subtext: '以无上魔威反客为主，生撕半扇天门精气，令九州换上新天。',
        visible: (s) =>
          s.alignment.righteous <= -20 ||
          (s.tags.includes('demonic_sovereign') && s.alignment.righteous <= 10),
        insightTags: ['魔道终局【以魔吞界】', '反客为主，自成新天'],
        effect: {
          logSummary: '于天门之下以无上魔功倒吞接引金光，震退上界使者，自立为九州新天。',
        },
        outcome: [
          '上界把九州当炉鼎，你偏要反过来把这扇天门当成自己的大药！你在金光正中放声狂笑，周身黑金魔焰暴涨百丈，化作一尊遮天蔽日的太古魔炉，顺着接引金柱疯狂倒吸上界倾泻下来的纯阳仙元。',
          '九霄之上传来一声惊骇的怒喝，金光急欲撤回，却被你的煞气锁链死死咬住，硬生生撕下半截门扉精气吞入腹中！天门仓皇崩闭，裂穹之上只剩你黑袍猎猎的魔尊法相。',
          '从这一日起，旧天已退，九州山河换了新主。世人敬你畏你，却再无人敢替上界收割你治下的半缕魂灵。',
        ],
        outcomeContinueLabel: '展卷终局 · 以魔吞界',
        next: 'ending_demonic_devour',
      },
      {
        id: 'final_earth_immortal',
        label: '【红尘散仙】在金柱落顶前一息脱壳假死，携两千载寿元隐入青山',
        subtext: '以澄澈道心瞒天过海，留下一具空壳应付天门名录，从此逍遥尘外。',
        visible: (s) =>
          s.alignment.righteous >= -20 &&
          (s.mind >= 300 ||
            (s.relics.includes('mortal_hearth_talisman') && s.mind >= 220)),
        insightTags: ['隐世终局【红尘散仙】', '金蝉脱壳，逍遥山河'],
        effect: {
          logSummary: '于接引金光落顶刹那以空壳剑影假死瞒天，自此化作红尘散仙云游九州。',
        },
        outcome: [
          '接引金柱彻底吞没问道台的刹那，你把百年祭炼的一缕剑意留作空壳迎向天火，真身却借无上心境收敛所有灵息，如一滴露水滑进山背的浓雾之中。',
          (s) =>
            `金光烧尽那具空壳，心满意足地散去。天门缓缓闭合，高天之上的名录里多了一条“已陨”的冰冷朱笔，却没人看见十里外松林小道上，一名身背竹笠的{{robe}}旅人正踩着${
              s.seasonIndex === 0 || s.seasonIndex === 3 ? '残雪' : '松针薄雾'
            }缓步南行。`,
          '天塌也好，换代也罢，你握着两千载悠长光阴，终于把长生过成了自己的日子。',
        ],
        outcomeContinueLabel: '展卷终局 · 红尘散仙',
        next: 'ending_earth_immortal',
      },
      {
        id: 'final_false_ascension',
        label: '【金光大药】收剑低眉，顺从正统古训步入接引金光羽化登仙',
        subtext: '踏入历代先辈走过的同一条金光之路，汇入九霄青玉仙炉。',
        insightTags: ['飞升终局【金光大药】', '步入仙炉'],
        effect: {
          logSummary: '于天门洞开之日放弃抗争，步入接引金光化作上界仙炉最后一枚大药。',
        },
        outcome: [
          '你垂下握剑的手，呼出一口压抑百年的浊气。纵然猜透了几分寒意，望着那片温暖耀眼的漫天金辉，你还是像历代飞升前辈一样迈进了金柱。',
          '起初三息，耳畔真有缥缈仙乐与云宫幻影。第四息，滚烫金焰透入元神。百年修为连同记忆一寸寸化作晶莹药液，顺着冷玉渠流进门后漆黑的深渊。',
          '山下稚童望见祥瑞，纷纷跪拜。史官提笔蘸墨，面不改色地在长明仙纪里添上一行璀璨的羽化旧话。又多一炉新灰。',
        ],
        outcomeContinueLabel: '展卷终局 · 金光大药',
        next: 'ending_false_ascension',
      },
    ],
  },
};

export const ACT5_RANDOM_EVENTS: RandomEventDefinition[] = [
  {
    sceneId: 'rand_act5_dying_sect',
    act: 'act5',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act5_false_prophet',
    act: 'act5',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act5_mortal_harvest',
    act: 'act5',
    weight: 10,
    once: true,
  },
];
