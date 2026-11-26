import {
  ChoiceEffect,
  GameState,
  RandomEventDefinition,
  SceneDefinition,
} from '../engine/types';
import { getAgeYears, toChineseYearNumber } from '../engine/time';

type NascentGuardianId = 'cang_ming' | 'shen_qingshuang' | 'xie_wujiu';

function getAct4CompletedThreadCount(state: GameState): number {
  return state.completedThreads.filter((id) => id.startsWith('thread_act4_')).length;
}

function isCangMingBlocked(state: GameState): boolean {
  return Boolean(
    state.flags.cangming_sealed ||
      state.flags.act4_cangming_sealed ||
      state.companions.cang_ming.stance === 'estranged' ||
      state.companions.cang_ming.stance === 'rival'
  );
}

function isShenHostile(state: GameState): boolean {
  const st = state.companions.shen_qingshuang.stance;
  return st === 'estranged' || st === 'rival';
}

function isXieHostile(state: GameState): boolean {
  const st = state.companions.xie_wujiu.stance;
  return st === 'estranged' || st === 'rival';
}

function isSuAliveAndHealthyInAct4(state: GameState): boolean {
  return Boolean(
    state.companions.su_zhiwei.met &&
      state.flags.su_zhiwei_saved_longlife &&
      !state.flags.su_zhiwei_passed &&
      getAgeYears(state.ageMonths) < 75
  );
}

function isSuFarewellInAct4(state: GameState): boolean {
  const age = getAgeYears(state.ageMonths);
  return Boolean(
    state.companions.su_zhiwei.met &&
      state.flags.su_zhiwei_saved_longlife &&
      !state.flags.su_zhiwei_passed &&
      age >= 75 &&
      age <= 95
  );
}

function monthsToAct5Harvest(state: GameState, minMonths: number): number {
  const targetYear = 3078;
  if (state.year < targetYear) {
    return Math.max(minMonths, (targetYear - state.year) * 12);
  }
  return minMonths;
}

function formatNascentSpan(state: GameState): string {
  const months = Number(state.flags.nascent_retreat_months ?? 240);
  if (months >= 240) return '数十载';
  if (months >= 120) return '十余载';
  return '数载';
}

function getNascentGuardians(state: GameState): NascentGuardianId[] {
  const candidates: Array<{ id: NascentGuardianId; affection: number }> = [];

  if (
    state.tags.includes('cangming_reborn') &&
    !isCangMingBlocked(state) &&
    (state.companions.cang_ming.stance === 'bonded' ||
      state.companions.cang_ming.affection >= 40)
  ) {
    candidates.push({
      id: 'cang_ming',
      affection: state.companions.cang_ming.affection,
    });
  }

  if (
    state.companions.shen_qingshuang.met &&
    !isShenHostile(state) &&
    (state.companions.shen_qingshuang.stance === 'bonded' ||
      state.companions.shen_qingshuang.affection >= 40)
  ) {
    candidates.push({
      id: 'shen_qingshuang',
      affection: state.companions.shen_qingshuang.affection,
    });
  }

  if (
    state.companions.xie_wujiu.met &&
    !isXieHostile(state) &&
    (state.companions.xie_wujiu.stance === 'bonded' ||
      state.companions.xie_wujiu.affection >= 40)
  ) {
    candidates.push({
      id: 'xie_wujiu',
      affection: state.companions.xie_wujiu.affection,
    });
  }

  candidates.sort((a, b) => b.affection - a.affection);
  return candidates.map((c) => c.id);
}

function getGuardianDisplayName(id: NascentGuardianId): string {
  if (id === 'cang_ming') return '重塑真身的苍溟';
  if (id === 'shen_qingshuang') return '沈清霜';
  return '谢无咎';
}

export const ACT4_SCENES: Record<string, SceneDefinition> = {
  // ==================== 卷四开篇：金丹问九州 ====================
  act4_opening: {
    id: 'act4_opening',
    act: 'act4',
    title: '金丹问九州',
    subtitle: '卷四 · 劫波起',
    location: '中州北界 · 丹成出关',
    checkpoint: true,
    checkpointLabel: '卷四初启 · 金丹问九州',
    paragraphs: [
      (s) =>
        `洞府石门缓缓推开，山风卷着微凉草木气迎面扑来。{{year}}，今岁{{age}}岁的{{name}}已凝就${
          s.flags.golden_core_method === 'blood_demon' ? '赤黑魔丹' : '无瑕金丹'
        }，五百载春秋落入掌中。距当年初入筑基已隔漫漫风霜，昔日青岚城巷尾为几块碎灵石奔波的日子，远得像是前世旧梦。`,
      '可站到金丹的高度再俯瞰九州，山河气色却叫人心头发冷。万里云海之下，青州至中州沿途七条中型灵脉近三年相继干涸成灰岩，灵气稀薄得连高阶药田都寸草难生。山门紧闭，商队佩刀，九州正像一张拉到极致的硬弓，随时会崩断在眼前。',
      {
        when: (s) => s.tags.includes('sect_rebel'),
        text: '仙盟长老阁的通缉令仍贴在各大坊市门口，只是如今你金丹威压笼罩十里，寻常巡山金丹亦不敢轻易来犯。反倒有不少对大宗寒心的散修暗暗托人递来拜帖，愿奉你为魁首。',
      },
      {
        when: (s) => s.tags.includes('alliance_envoy'),
        text: '客卿印很好用。沿途各宗灵矿执事见印无不躬身迎送，可翻开一卷卷矿脉月报，满纸尽是灵石亏空与长老倾轧，千年盟约早已外强中干。',
      },
      {
        when: (s) => s.tags.includes('tianji_nemesis'),
        text: '当年毁去天机商行抽灵支阵后，商行对你的暗花已翻到三千上品灵石。只是你结丹出关那夜，三名在山外潜伏的暗哨隔着十里便被丹威震吐了血，商行转而收紧了沿途丹药与矿材的暗路。',
      },
      {
        when: (s) => s.tags.includes('mortal_keeper'),
        text: '案头压着一卷沾着药香的青州旧札。山外修仙宗门为残存灵脉杀得血流成河，唯有那些无灵根的深山村落依旧日出而作、炊烟不断，仿佛被什么无形屏障隔绝在劫波之外。',
      },
      {
        when: (s) =>
          s.relics.includes('soul_nourishing_wood') &&
          s.companions.cang_ming.met &&
          !isCangMingBlocked(s),
        text: '储物囊中那截【千年养魂木】近日愈发温热，隔着衣襟与焦黑断玉遥遥呼应。苍溟沉默了整整一季，昨晚终于在识海里开口，说六十年一遇的寒渊雷潮将至，重塑肉身的契机就在今岁。',
      },
      '石案摆着三封急报。北麓绝渊现出「斩天会」遗窟，中州赤阳灵矿战火将起，青州旧药农更捎来口信，说槐阴深山冲出一通长明之前的无灵古碑。九州劫波已至。先落哪一子，全凭你定。',
    ],
    choices: [
      {
        id: 'act4_open_survey',
        label: '逐一拆阅案头密函，理顺九州四路风声后再稳步入局',
        subtext: '先谋后动，涵养金丹灵识，统揽九州四方劫波。',
        insightTags: ['步入劫波四起', '心境与声望'],
        effect: (s) => ({
          timeMonths: 18,
          mind: 8,
          renown: 8,
          setAct: 'act4',
          setRealm: 'golden_core',
          addTags: ['golden_core_dao'],
          activateThreads: [
            'thread_act4_zhantian',
            'thread_act4_war',
            'thread_act4_mortal',
            ...(s.companions.cang_ming.met ? ['thread_act4_rebirth'] : []),
          ],
          logSummary: '金丹初成出关，俯瞰九州灵脉大乱，正式踏入九州劫波棋局。',
        }),
        outcome: [
          '朱笔落图。你在舆图上依次圈定斩天遗窟、赤阳矿区与青州槐阴深山，窗外暮雨连绵，丹田那粒浑圆金丹悄然自转，一呼一吸间将数里残灵尽数吸入气海。棋局展开了。',
          '年余静修调息，金丹境界彻底稳固。待山风转晴，你收起舆图推门步入风波正盛的九州。',
        ],
        outcomeContinueLabel: '执图入世 · 步入劫波四起',
        bridgeNote: '金丹境界既稳，九州四方劫波已尽数摊开在你案前。',
        next: 'act4_hub',
      },
      {
        id: 'act4_open_assert',
        label: '长啸出谷，以金丹丹威震退山外窥探的各家眼线，昭告天下我必入场',
        subtext: '锋芒外露，立威九州，迎面踏入四方大势。',
        insightTags: ['步入劫波四起', '修为与威名'],
        effect: (s) => ({
          timeMonths: 18,
          might: 8,
          renown: 12,
          worldly: 5,
          setAct: 'act4',
          setRealm: 'golden_core',
          addTags: ['golden_core_dao'],
          activateThreads: [
            'thread_act4_zhantian',
            'thread_act4_war',
            'thread_act4_mortal',
            ...(s.companions.cang_ming.met ? ['thread_act4_rebirth'] : []),
          ],
          logSummary: '金丹出关立威中州，震退四方窥探，正式踏入九州劫波棋局。',
        }),
        outcome: [
          '一道清越丹鸣冲霄而起，震散了山腰终年不散的寒雾。藏在十里松林里的三拨探子脸色骤变，连传讯玉符都来不及捏碎便御器仓皇退走。',
          '不出半月，「{{name}}金丹大成」的消息传遍中州与青州。往昔高高在上的大宗长老与商行管事，如今见了你的名帖也不得不备上厚礼以平等礼数相迎。',
        ],
        outcomeContinueLabel: '扬威出山 · 步入劫波四起',
        bridgeNote: '出关一啸惊动中州各派，四方密信与战报如雪片般飞入别院。',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 卷四动态并发枢纽：劫波四起 ====================
  act4_hub: {
    id: 'act4_hub',
    act: 'act4',
    title: '劫波四起',
    subtitle: (s) =>
      s.actBeat >= 3 || getAct4CompletedThreadCount(s) >= 2
        ? '卷四 · 劫云渐聚，元婴在望'
        : '卷四 · 金丹问九州，诸事并发',
    location: (s) => {
      if (s.tags.includes('demonic_sovereign')) return '赤煞孤峰 · 洞府';
      if (s.tags.includes('sect_rebel')) return '幽谷盟所 · 听剑阁';
      if (s.tags.includes('alliance_envoy')) return '中州别苑 · 客卿府';
      return '青中交界 · 观云别院';
    },
    isHub: true,
    paragraphs: [
      {
        when: (s) => Boolean(s.lastBridgeNote),
        text: (s) => s.lastBridgeNote ?? '',
      },
      '时光荏苒，转眼已是{{year}}，你今岁{{age}}岁，身怀【金丹期】修为。九州灵脉枯竭之势越演越烈，大宗倾轧与黑市暗潮已无处可避。',
      (s) => {
        const lines: string[] = [];
        if (s.activeThreads.includes('thread_act4_zhantian')) {
          lines.push(
            '【绝渊秘窟】断魂绝渊深处传出斩天会残部的暗号，三千年反抗者的血脉遗录与锁天遗藏尽在崖底。'
          );
        }
        if (s.activeThreads.includes('thread_act4_rebirth') && s.companions.cang_ming.met) {
          lines.push(
            s.relics.includes('soul_nourishing_wood')
              ? '【古潭重塑】寒渊古潭雷云将聚，你怀中已有【千年养魂木】，随时可赴潭畔决断苍溟去留。'
              : '【古潭重塑】寒渊古潭雷期迫近，焦黑断玉裂纹渐深，若无养魂木，便须耗费重金与本源元气强行塑躯。'
          );
        }
        if (s.activeThreads.includes('thread_act4_war')) {
          lines.push(
            '【灵脉大战】九州灵脉枯竭引爆公开战火，正道各宗与天机商行厮杀不休，百宝斋暗账房发来了金丹密邀。'
          );
        }
        if (s.activeThreads.includes('thread_act4_mortal')) {
          lines.push(
            isSuAliveAndHealthyInAct4(s) || isSuFarewellInAct4(s)
              ? '【无灵古碑】青州老药农传来口信，苏知微晚年迁居槐阴深山，在祠后发现了长明之前的古碑，正候你一见。'
              : '【无灵古碑】青州深山槐阴村绝灵无脉、凡人安居，村后出土的史前石碑或藏着灵根与天幕的真正来历。'
          );
        }
        return lines.length > 0
          ? lines
          : '九州四方劫波已尽数经你之手尘埃落定，丹田金丹圆融欲裂，碎丹成婴、直面天雷初劫的关口已然迫在眉睫。';
      },
      (s) => `【黑市风声】${s.market.rumorText}`,
    ],
    choices: [
      // ---- 阶段大势（story） ----
      {
        id: 'hub4_zhantian_1',
        category: 'story',
        label: '深入断魂绝渊秘窟，探寻「斩天会」四代遗录与锁天遗藏',
        subtext: '北麓断魂绝渊藏着三千年四代反抗者的血刻、暗网星图与内窟铁坛。',
        visible: (s) => s.activeThreads.includes('thread_act4_zhantian'),
        insightTags: ['沈清霜线', '天机碎片', '可得锁天印与剑胚'],
        effect: { timeMonths: 12, beatDelta: 1 },
        next: 'act4_arc_zhantian_1',
      },
      {
        id: 'hub4_rebirth',
        category: 'story',
        label: '雷雨之夜赴寒渊古潭，主持苍溟重塑肉身大仪',
        subtext: (s) =>
          s.relics.includes('soul_nourishing_wood')
            ? '已备【千年养魂木】，可助三千年前剑尊复生，或趁机将其彻底封印。'
            : '未备养魂木，届时须耗重金与五载金丹元气强塑，或将其彻底封印。',
        visible: (s) =>
          s.activeThreads.includes('thread_act4_rebirth') &&
          s.companions.cang_ming.met,
        insightTags: ['苍溟终极转折', '古剑重塑或永封', '高额修为回报'],
        effect: { timeMonths: 18, beatDelta: 1 },
        next: 'act4_arc_cangming_rebirth',
      },
      {
        id: 'hub4_war_1',
        category: 'story',
        label: '驰赴中州赤阳矿脉与百宝总号，介入九州灵脉大战',
        subtext: '中州赤阳矿谷战火连天，百宝斋与天机商行的百年决算已至眼前。',
        visible: (s) => s.activeThreads.includes('thread_act4_war'),
        insightTags: ['谢无咎长线', '商战拆台', '可得收割总录/育婴莲'],
        effect: { timeMonths: 12, beatDelta: 1 },
        next: 'act4_arc_world_war_1',
      },
      {
        id: 'hub4_mortal',
        category: 'story',
        label: (s) =>
          isSuAliveAndHealthyInAct4(s) || isSuFarewellInAct4(s)
            ? '动身前往青州槐阴古村，拜读无灵古碑并见银发故人苏知微'
            : '探访青州槐阴无灵古村，查验长明纪元之前的无灵古碑',
        subtext: '青州南端群峰褶皱里，藏着一通从未落入高天视线的无灵古碑。',
        visible: (s) => s.activeThreads.includes('thread_act4_mortal'),
        insightTags: ['苏知微长线', '天机碎片【上古无灵纪】', '可得无灵归尘印'],
        effect: { timeMonths: 15, beatDelta: 1 },
        next: 'act4_arc_mortal_truth',
      },

      // ---- 自主谋划（plan） ----
      {
        id: 'hub4_cultivate',
        category: 'plan',
        label: '闭关淬炼金丹大道（水磨温丹 / 燃晶速修 / 借宝磨元）',
        subtext: '金丹境至多闭关两回，每次历三至五载，大幅夯实冲婴底蕴。',
        requirement: {
          maxUsesInAct: {
            key: 'cultivate',
            max: 2,
            reason: '金丹已磨至圆满瓶口，再闭门苦坐难破天雷，须历大势或直叩元婴',
          },
        },
        insightTags: ['金丹潜修', '限2回'],
        next: 'act4_action_cultivate',
      },
      {
        id: 'hub4_commission',
        category: 'plan',
        label: '九州行迹：金丹暗金悬红与劫区御剑巡游',
        subtext: '揭中州暗金悬榜赚取重金（限2回），或巡游九州劫区体察世态（限3回）。',
        insightTags: ['零耗时择行', '悬赏与劫区巡游'],
        next: 'act4_action_commission',
      },

      // ---- 九州黑市秘拍（market） ----
      {
        id: 'hub4_market',
        category: 'market',
        label: '踏入九州黑市秘拍，查验牌价、倒卖灵砂琥珀或竞购结婴重宝',
        subtext: '可购【太阴育婴莲】【残缺锁天印】【千年养魂木】【九转延寿露】，随时可入殿查价。',
        insightTags: ['九州黑市', '自由入殿不耗光阴'],
        next: 'act4_market',
      },

      // ---- 故人相会整合入口（companion） ----
      {
        id: 'hub4_companion_visit',
        category: 'companion',
        label: '抽身寻访故人旧交，赴约论剑、议商局或探望杏林',
        subtext: '可拜访尚在人世且未反目绝交的同道故人。',
        visible: (s) =>
          (s.companions.shen_qingshuang.met &&
            s.companions.shen_qingshuang.stance !== 'estranged' &&
            s.companions.shen_qingshuang.stance !== 'rival') ||
          (s.companions.xie_wujiu.met &&
            s.companions.xie_wujiu.stance !== 'estranged' &&
            s.companions.xie_wujiu.stance !== 'rival') ||
          (s.companions.cang_ming.met && !isCangMingBlocked(s)) ||
          isSuAliveAndHealthyInAct4(s),
        insightTags: ['零耗时择访', '深化故人羁绊'],
        next: 'act4_companion_visit',
      },

      // ---- 破境高潮（breakthrough） ----
      {
        id: 'hub4_nascent_gate',
        category: 'breakthrough',
        label: '【碎丹成婴】登绝巅雷台直面天雷初劫，冲击元婴老祖之境',
        subtext: (s) => {
          const hints: string[] = [];
          if (s.relics.includes('nascent_lotus')) hints.push('已备太阴育婴莲');
          const guards = getNascentGuardians(s);
          if (guards.length > 0) {
            hints.push(`${guards.map(getGuardianDisplayName).join('、')}可结阵护法`);
          }
          if (
            s.spiritStones >= 500 ||
            (s.relics.includes('spirit_vein_deed') && s.spiritStones >= 350)
          ) {
            hints.push('财力阵势充裕');
          }
          if (s.alignment.righteous <= -15 || s.tags.includes('demonic_sovereign')) {
            hints.push('可引魔煞吞雷');
          }
          return hints.length > 0
            ? `眼下依仗：${hints.join(' · ')}。破境成婴则寿元跃至千载，直面三千年大劫。`
            : '天雷初劫凶险万分，若无育婴莲、知己护法或重金泄雷阵，唯凭极深厚修为心境方能硬渡。';
        },
        visible: (s) =>
          s.actBeat >= 3 ||
          getAct4CompletedThreadCount(s) >= 2 ||
          s.might >= 100,
        insightTags: (s) => {
          const req = s.flags.read_thunder_notes ? 325 : 340;
          return [
            '卷四破境高潮',
            '碎丹成婴',
            `当前修为+心境 ${s.might + s.mind}（硬冲≥${req} / 稳渡≥500）`,
          ];
        },
        next: 'act4_nascent_gate',
      },
    ],
  },

  act4_companion_visit: {
    id: 'act4_companion_visit',
    act: 'act4',
    title: '九州访旧',
    subtitle: '故人相会',
    location: '别院廊下 · 传讯香炉',
    paragraphs: [
      '劫波四起，人命如浮萍。难得偷出片刻清闲，你抚过案上几枚旧信物，思量先去见哪一位故人。',
    ],
    choices: [
      {
        id: 'hub4_visit_shen',
        category: 'companion',
        label: (s) =>
          s.tags.includes('sect_rebel') ||
          Boolean(s.flags.shen_left_sect) ||
          Boolean(s.flags.shen_freed_from_sect)
            ? '按传讯剑符赴北麓松崖剑庐约见沈清霜，切磋剑道并互通近况'
            : '按传讯剑符赴松岭石亭约见沈清霜，切磋剑道并互通近况',
        visible: (s) =>
          s.companions.shen_qingshuang.met &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          s.companions.shen_qingshuang.stance !== 'rival',
        requirement: {
          maxUsesInAct: {
            key: 'visit_shen',
            max: 2,
            reason: '沈清霜正奔走九州收拢散修剑修，金丹境已两度相会，不便再扰',
          },
          cooldownTurns: {
            key: 'visit_shen',
            turns: 1,
            reason: '刚与沈清霜拆招别过不久，稍隔些时日再会',
          },
        },
        insightTags: ['拜访沈清霜', '金丹境限2回'],
        next: 'visit_shen_qingshuang',
      },
      {
        id: 'hub4_visit_xie',
        category: 'companion',
        label: (s) =>
          s.flags.act4_chamber_collapsed
            ? '登九州百宝总号暗楼再会谢无咎，议行情并叙旧交'
            : '登百宝斋暗楼再会谢无咎，议行情并叙旧交',
        visible: (s) =>
          s.companions.xie_wujiu.met &&
          s.companions.xie_wujiu.stance !== 'estranged' &&
          s.companions.xie_wujiu.stance !== 'rival',
        requirement: {
          maxUsesInAct: {
            key: 'visit_xie',
            max: 2,
            reason: '谢无咎忙于调拨九州银票筹码，金丹境已两度深谈',
          },
          cooldownTurns: {
            key: 'visit_xie',
            turns: 1,
            reason: '方才与谢无咎拆完商账不久，隔一阵再访',
          },
        },
        insightTags: ['拜访谢无咎', '金丹境限2回'],
        next: 'visit_xie_wujiu',
      },
      {
        id: 'hub4_visit_cangming',
        category: 'companion',
        label: (s) =>
          s.tags.includes('cangming_reborn')
            ? '邀重塑真身的苍溟对坐论剑，讨教太古行气古诀'
            : '静室叩响焦黑断玉，向苍溟问计三千年前旧事',
        visible: (s) => s.companions.cang_ming.met && !isCangMingBlocked(s),
        requirement: {
          maxUsesInAct: {
            key: 'visit_cm',
            max: 2,
            reason: '苍溟须闭目调养神魂，金丹境已两度论剑不便再扰',
          },
          cooldownTurns: {
            key: 'visit_cm',
            turns: 1,
            reason: '苍溟方才指点过剑诀，稍隔一阵再请教',
          },
        },
        insightTags: ['拜访苍溟', '金丹境限2回'],
        next: 'visit_cang_ming',
      },
      {
        id: 'hub4_visit_su',
        category: 'companion',
        label: (s) =>
          s.flags.act4_mortal_truth_found
            ? '抽身赴青州槐阴茅舍，探望两鬓斑白的故人苏知微'
            : '抽身南下青州杏林医馆，探望两鬓斑白的故人苏知微',
        visible: (s) => isSuAliveAndHealthyInAct4(s),
        requirement: {
          maxUsesInAct: {
            key: 'visit_su',
            max: 2,
            reason: '青州山路遥远，她叮嘱你莫因频频探望耽误大局',
          },
          cooldownTurns: {
            key: 'visit_su',
            turns: 1,
            reason: '刚自青州探望归来不久，莫因奔波误了正事',
          },
        },
        insightTags: ['探望苏知微', '金丹境限2回'],
        next: 'visit_su_zhiwei',
      },
      {
        id: 'hub4_visit_back',
        label: '收起信物，返回别院',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 自主修炼：金丹潜修 ====================
  act4_action_cultivate: {
    id: 'act4_action_cultivate',
    act: 'act4',
    title: '淬炼金丹',
    subtitle: '自主谋划 · 金丹静修',
    location: '别院深室 · 聚元蒲团',
    paragraphs: [
      '金丹修士每进一步都动辄以数年计。你将洞府外围的禁制全数开启，端坐蒲团之上，内视丹田那枚沉静旋转的金丹。',
      '距离碎丹成婴尚缺火候。你可以水磨枯坐省下灵石，也可以掷重金燃晶淬丹，或是借手头秘宝参悟更深一层的大道脉络。',
    ],
    choices: [
      {
        id: 'a4_cult_steady',
        label: '闭死关水磨温丹四载，不耗外物稳扎根基',
        subtext: '零花费，耗时四年，修为与心境均衡大涨。',
        insightTags: ['零花费', '耗时四载', '修为与心境'],
        effect: {
          timeMonths: 48,
          might: 14,
          mind: 12,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '四度寒暑在静室内悄无声息滑过。你借着山风潮汐一点点提纯丹元，将金丹表面几道细微杂质尽数炼化，灵识外放已可覆及百里山川。',
          '收功出室，院外老梅已粗了一圈，你的道基却比四年前沉厚得像一座铁山。',
        ],
        outcomeContinueLabel: '收功出关 · 回到局中',
        bridgeNote: '闭门温丹四载归来，金丹圆融通透，神识更添数分清明。',
        next: 'act4_hub',
      },
      {
        id: 'a4_cult_stones',
        label: '耗费一百八十灵石购入赤晶矿髓，燃晶淬丹三载',
        requirement: { minSpiritStones: 180, lockReason: '需灵石 180' },
        subtext: '重金换速度，三年便得惊人修为精进。',
        insightTags: ['消耗 180 灵石', '耗时三载', '修为暴涨'],
        effect: {
          timeMonths: 36,
          spiritStones: -180,
          might: 22,
          mind: 8,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '十二箱赤晶矿髓在阵盘里化作滚滚灵河，日夜不息涌入经脉。短短三载工夫，你的金丹已涨至拳头大小，丹晕紫中带金，几乎随时要破壳化婴。',
          '熄阵起身，满地皆是抽干灵气的白灰。这一笔灵石花得肉痛，换来的却是一身沉甸甸的硬底蕴。',
        ],
        outcomeContinueLabel: '拂袖出室 · 审视世局',
        bridgeNote: '燃晶淬丹三载，金丹威压倍增，囊中灵石也轻去一截。',
        next: 'act4_hub',
      },
      {
        id: 'a4_cult_relic',
        label: '借手头【斩天剑胚】或【千年养魂木】引气磨元五载',
        visible: (s) =>
          s.relics.includes('severing_sword_embryo') ||
          s.relics.includes('soul_nourishing_wood'),
        subtext: '以秘宝共鸣打磨丹元与神魂，耗时长而双项收益极高。',
        insightTags: ['秘宝专属', '耗时五载', '修为心境双丰收'],
        effect: {
          timeMonths: 60,
          might: 18,
          mind: 18,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '五载光阴里，你日日将秘宝横于膝前，借其中残存的上古道韵反复洗炼金丹与识海。每一缕外泄的灵压都被你稳稳压回丹核，化作破劫时的锋芒与定力。',
          '睁眼时窗外雷云隐隐有感而聚，随即又被你眉心一道清光无声震散。',
        ],
        outcomeContinueLabel: '收好秘宝 · 推门问世',
        bridgeNote: '借秘宝静修五载，丹元与灵台同时拔高一截。',
        next: 'act4_hub',
      },
      {
        id: 'a4_cult_back',
        label: '暂不闭关，先去处置九州急务',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 自主营生：金丹悬赏与劫区巡游 ====================
  act4_action_commission: {
    id: 'act4_action_commission',
    act: 'act4',
    title: '九州悬红与劫区巡游',
    subtitle: '自主谋划 · 金丹行迹',
    location: '中州灵盟玉榜 · 暗金悬单与北境风烟',
    paragraphs: [
      '如今你已是九州屈指可数的金丹人物，寻常坊市杂活早已无人敢递到案前。玉榜最上层挂着几道暗金悬红，动辄数百上品灵石。若无心接单，亦可御剑巡游末法劫区，体察世态百相。',
    ],
    choices: [
      {
        id: 'a4_comm_beast',
        label: '揭榜独闯黑水泽，斩杀盘踞灵眼的化形妖蛟',
        subtext: '耗时一载半，稳获 420 灵石，修为逾 95 则独吞全额妖丹赏银（520 灵石）。',
        requirement: {
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '九州战乱之下金丹大单已清，余下小活不值一哂',
          },
        },
        insightTags: ['420-520 灵石', '修为与威名', '悬赏限2回'],
        effect: (s) => {
          const dominant = s.might >= 95;
          return {
            timeMonths: 18,
            spiritStones: dominant ? 520 : 420,
            might: 8,
            renown: 10,
            beatDelta: 1,
            trackActionKey: 'commission',
            setFlags: { a4_beast_bonus: dominant },
          };
        },
        outcome: [
          (s) =>
            s.flags.a4_beast_bonus
              ? '剑断七寸。黑水泽瘴雾里那头半步元婴玄水蛟刚掀翻河岸便伏诛剑下，你取回悬赏玉符，又剖出完整蛟丹高价脱手，净入五百二十块灵石。'
              : '你在毒雾大泽里与妖蛟周旋了七昼夜，拼着袖袍碎裂将其重创斩于泽心。领赏管事验过蛟角，连声赞叹好手段，如数奉上四百二十块灵石。',
          '一战过后，中州北境再无敢轻视你名号的散修与世家。',
        ],
        outcomeContinueLabel: '收好赏银 · 折返别院',
        bridgeNote: '斩杀黑水妖蛟领回重赏，中州坊间对你的金丹威名更添三分敬畏。',
        next: 'act4_hub',
      },
      {
        id: 'a4_comm_escort',
        label: '受中州三大家族重聘，护送迁矿灵车穿越灵脉战区',
        subtext: '耗时一载，赚取 380 灵石，具仙盟客卿、青岚商名或守住旧族家印者加酬至 460 灵石。',
        requirement: {
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '九州战乱之下金丹大单已清，余下小活不值一哂',
          },
        },
        insightTags: ['380-460 灵石', '正道声望', '悬赏限2回'],
        effect: (s) => {
          const bonus =
            s.tags.includes('alliance_envoy') ||
            s.tags.includes('merchant_fame') ||
            Boolean(s.flags.kept_clan_seal);
          return {
            timeMonths: 12,
            spiritStones: bonus ? 460 : 380,
            mind: 6,
            renown: 8,
            righteous: 5,
            beatDelta: 1,
            trackActionKey: 'commission',
            setFlags: { a4_escort_bonus: bonus },
          };
        },
        outcome: [
          (s) =>
            s.flags.a4_escort_bonus
              ? s.flags.kept_clan_seal &&
                !s.tags.includes('alliance_envoy') &&
                !s.tags.includes('merchant_fame')
                ? '车队总管认出你腰间完好无损的旧族赤铜家印，神色立时添了三分敬意，沿途旧识关卡皆畅行无阻。货抵中州主城，三家家主亲手奉上四百六十块灵石与一匣陈茶。'
                : '沿途三道关卡见了你的名帖与金丹旗号，皆识趣放行。车队无一损伤驶入中州主城，三家家主亲手捧上四百六十块灵石外加一匣陈茶。'
              : '一路行过两处交火的荒谷，你以金丹灵压镇退两拨劫道散修，安稳护着十二辆玄铁矿车抵达中州。雇主痛快结清三百八十块灵石。',
        ],
        outcomeContinueLabel: '辞别家主 · 返回居所',
        bridgeNote: '护送迁矿灵车平安落地，既攒足灵石，也在中州世家间留下好名声。',
        next: 'act4_hub',
      },
      {
        id: 'a4_comm_bounty',
        label: '接下黑市匿名血令，截杀一名垄断残矿的大宗金丹执事',
        subtext: '报酬高达 540 灵石，出手狠辣，行事沾染煞气。',
        requirement: {
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '九州战乱之下金丹大单已清，余下小活不值一哂',
          },
        },
        insightTags: ['540 灵石', '修为大涨', '偏魔煞', '悬赏限2回'],
        effect: {
          timeMonths: 18,
          spiritStones: 540,
          might: 10,
          renown: 6,
          righteous: -8,
          beatDelta: 1,
          trackActionKey: 'commission',
        },
        outcome: [
          '未发一言。荒山客栈截住押运矿税的宗门金丹执事、封死四方退路，三百回合恶斗削平半座山头后，你提着乾坤袋与腰牌赴暗巷交差，换回五百四十块灵石。',
          '黑市牙人递来灵石时双手微抖，看你的眼神既怕又敬。',
        ],
        outcomeContinueLabel: '拭净剑血 · 返归别院',
        bridgeNote: '接黑市血令截杀宗门执事换回五百余块灵石，袖间煞气三日方散。',
        next: 'act4_hub',
      },
      {
        id: 'hub4_wander',
        category: 'plan',
        label: '御剑巡游九州劫区，体察末法世态、撞碰金丹奇遇',
        subtext: '金丹境至多巡游三回，每次历时一载，体察劫世百态。',
        visible: (s) =>
          s.seenRandomEvents.filter((id) => id.startsWith('rand_act4_')).length < 4,
        requirement: {
          maxUsesInAct: {
            key: 'wander',
            max: 3,
            reason: '九州劫区已巡行三回，劫云迫顶，宜速了大势筹备结婴',
          },
        },
        insightTags: ['九州劫区奇遇', '巡游限3回'],
        effect: {
          timeMonths: 12,
          might: 5,
          mind: 4,
          beatDelta: 1,
          trackActionKey: 'wander',
          setReturnSceneId: 'act4_hub',
        },
        next: '__RANDOM_ACT4__',
      },
      {
        id: 'a4_comm_back',
        label: '收起玉榜，折返别院',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 九州黑市秘拍 ====================
  act4_market: {
    id: 'act4_market',
    act: 'act4',
    title: '九州黑市秘拍',
    subtitle: '卷四 · 末法竞价',
    location: '中州地下 · 沉渊拍卖殿',
    market: {
      venueName: '九州黑市秘拍 · 高阶灵材与结婴重宝',
      venueDesc:
        '灵脉将枯，灵石日贱而奇珍日贵。沉渊殿只认金丹威名与实打实的筹码，趁乱世套利金脉灵砂与凝神琥珀，或拍下改写雷劫成败的压箱底至宝。',
      goodsIds: [
        'golden_vein_sand',
        'soul_amber',
        'spirit_marrow_oil',
        'ancient_rubbing',
      ],
      relicOffers: [
        {
          relicId: 'nascent_lotus',
          basePrice: 600,
          category: 'elixir',
          when: (s) => !s.relics.includes('nascent_lotus'),
        },
        {
          relicId: 'broken_sky_seal',
          basePrice: 660,
          category: 'curio',
          when: (s) => !s.relics.includes('broken_sky_seal'),
        },
        {
          relicId: 'soul_nourishing_wood',
          basePrice: 540,
          category: 'curio',
          when: (s) =>
            !s.relics.includes('soul_nourishing_wood') &&
            !s.flags.act4_cangming_reborn,
        },
        {
          relicId: 'longevity_dew',
          basePrice: 340,
          category: 'elixir',
          when: (s) => !s.relics.includes('longevity_dew'),
        },
      ],
    },
    paragraphs: [
      '沉渊拍卖殿开凿在中州一条废矿深处，十二盏幽蓝兽油灯照着黑铁高台。在座宾客皆以斗笠或阵雾遮面，气息最弱也是筑基圆满，更有数道毫不掩饰的金丹威压彼此试探。',
      {
        when: (s) => s.relics.includes('baibao_token'),
        text: (s) =>
          isXieHostile(s)
            ? '你亮出【百宝斋玄铁令】，玄字厢管事脸色一冷将牌子推回：“谢东家早把阁下名讳从暗账里勾了，今日竞拍一律照原价算。”'
            : '你亮出【百宝斋玄铁令】，侍者立刻引你入二层玄字暗厢。管事低声禀报，凭此令牌场中一切秘宝皆享八五折暗账优待。',
      },
      {
        when: (s) => Boolean(s.flags.act4_chamber_collapsed),
        text: '天机商行分号崩盘后，大批昔日被垄断的高阶丹材涌入黑市，丹药行情略见回落，唯有涉及上古阵枢与渡劫保命的秘宝被各大宗老祖疯抢至天价。',
      },
    ],
    choices: [
      {
        id: 'a4_market_leave',
        label: '清点手中灵石与奇珍，起身离开沉渊拍卖殿',
        outcome: [
          (s) =>
            s.completedThreads.includes('thread_act4_war')
              ? '拍卖槌落定，殿内灯火渐暗。你收妥新入手的灵材与筹码，借暗道步出废矿，夜风里仍飘着大战过后的余烟。'
              : '拍卖槌落定，殿内灯火渐暗。你收妥新入手的灵材与筹码，借暗道步出废矿，山风里已夹着大战将起的焦烟味。',
        ],
        outcomeContinueLabel: '离开黑市 · 回到局中',
        bridgeNote: '自九州黑市秘拍归来，你对末法将至的物价走势与自身底牌更加心明眼亮。',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 大势一：绝渊秘窟 · 斩天会四代遗录 ====================
  act4_arc_zhantian_1: {
    id: 'act4_arc_zhantian_1',
    act: 'act4',
    title: '绝渊石壁',
    subtitle: '阶段大势 · 斩天会四代遗录（上）',
    location: '北麓断魂绝渊 · 地下石窟',
    paragraphs: [
      '顺着密函所指的古老暗记，你御剑潜入断魂绝渊三百丈深处。石壁湿滑生苔，穿过一道以血灵阵掩护的水帘，豁然现出一座开凿于绝壁腹中的宽阔石窟。',
      '三丈石壁刻满名姓，分作四列。初代七名金丹推演倒流阵，寿尽坐化窟中。二代遭同门出卖，分舵焚为白地。三代百余人饮了天机商行投毒的灵井，无一生还。到了长明两千七百九十年，四代只剩几名隐姓残老，守着半幅星图枯坐至死。四代人。无一善终。',
      {
        when: (s) =>
          s.companions.shen_qingshuang.met && !isShenHostile(s),
        text: (s) =>
          s.tags.includes('sect_rebel') ||
          Boolean(s.flags.shen_left_sect) ||
          Boolean(s.flags.shen_freed_from_sect)
            ? '石窟第三盏长明灯下，一袭素衣静立如雪。沈清霜按你先前飞鹤约定的时辰提前半日抵此，指尖拂过石壁上几位青云宗叛门前辈的名姓，声音低沉：“昔年在青云禁阁翻旧档时便拼出过这处方位。原来三千年里，始终有人醒着。”'
            : '石窟第三盏长明灯下，一袭白衣静立如雪。沈清霜按你先前飞鹤约定的时辰提前半日抵此，指尖拂过石壁上几位青云宗叛门前辈的名姓，声音低沉：“我翻遍青云禁阁旧档才拼出这处方位。原来三千年里，始终有人醒着。”',
      },
      {
        when: (s) =>
          s.companions.shen_qingshuang.met && isShenHostile(s),
        text: (s) =>
          s.companions.shen_qingshuang.stance === 'estranged' &&
          !s.flags.shen_left_sect &&
          !s.flags.fought_shen_at_vault
            ? '剑气骤劈水帘！沈清霜一袭白袍踏水而入，身后跟着两名剑阁金丹执事，霜剑遥指你眉心：“果真是你。斩天会遗物落入外人手中只会招来天幕提前清剿，交出来。”寒芒抵喉。“随我回山。”'
            : '你正读到第四代遗刻，窟口水帘忽被一道森冷剑气劈开。沈清霜独自提剑步入廊影，霜锋遥指你眉心：“旧账未清，你又盯上斩天会遗物？今日别想轻易把内窟重宝带走。”',
      },
      {
        when: (s) => !s.companions.shen_qingshuang.met,
        text: '石柱后缓步转出两名鬓发如霜的老修士。断去两指的顾苍松手托裂纹阵盘，身旁老妇陆七娘袖藏寒针，二人齐齐将你锁在阵眼之中：“来者报上名号！你是仙盟的猎犬，还是真看过高天之上那座熔炉的人？”',
      },
    ],
    choices: [
      {
        id: 'zt1_read_oath',
        label: '细读四代血刻，亮明你掌握的天门铁证以求坦诚相见',
        subtext: '以真诚与见识打动残部守窟老人，开启内窟铁坛。',
        insightTags: ['得真相【斩天会四代遗录】', '心境与正道声望'],
        effect: (s) => {
          const hasDust = s.relics.includes('heaven_dust_shard');
          return {
            mind: hasDust ? 16 : 10,
            renown: hasDust ? 14 : 8,
            righteous: 6,
            addTruthClues: ['clue_zhantian_remnant'],
            setFlags: {
              act4_zhantian_step1: true,
              zt1_used_dust_shard: hasDust,
            },
            companionUpdates:
              s.companions.shen_qingshuang.met && !isShenHostile(s)
                ? {
                    shen_qingshuang: {
                      markSeen: true,
                      affectionDelta: 10,
                      chronicle: '与你同入断魂绝渊拜读四代斩天遗录，彼此决心愈发坚定。',
                    },
                  }
                : undefined,
            logSummary: '深入断魂绝渊，亲眼得见【斩天会四代遗录】。',
          };
        },
        outcome: [
          (s) => {
            const proofs: string[] = [];
            if (s.truthClues.includes('clue_stele_gap')) proofs.push('飞升碑断代反文');
            if (s.truthClues.includes('clue_vein_drain')) proofs.push('灵脉倒流暗账');
            if (s.truthClues.includes('clue_blood_pill_dust')) proofs.push('血丹中的上界微尘');
            if (s.truthClues.includes('clue_tianji_portal')) proofs.push('天机总坛抽灵天梯');
            if (s.flags.zt1_used_dust_shard) {
              return `你抬手亮出青州地底撬下的【上界落尘玉片】，并将${proofs.length > 0 ? proofs.join('、') : '沿途目睹的枯脉异象'}一并摊开。断指老修顾苍松瞥见玉片上那缕刺骨灰息，手中阵盘骤然一颤，失声叹道：“真是上界落尘！看来你并非道听途说之辈。”`;
            }
            if (proofs.length > 0) {
              return `你按次序道出${proofs.join('、')}等桩桩铁证，声震石壁。守在暗处的断指老修顾苍松听罢，手中阵盘微微发颤，良久长叹一声收起杀意。`;
            }
            return '你把亲历的灵脉枯竭与大宗封山逐一摊开。不藏半句虚言。暗处那名断指老修顾苍松盯着你看了足足十息，终究缓缓放下手中阵盘，长叹一声收了满室杀机。';
          },
          (s) =>
            s.companions.shen_qingshuang.met && isShenHostile(s)
              ? '窟口的沈清霜听见你道出的桩桩铁证，剑锋停顿了一瞬。顾苍松趁机启动水帘隔阵将外廊暂阻，低声急催你速入内窟铁坛决断遗宝归属。'
              : '陆七娘抹去眼角浑浊泪意，亲手推开石墙后的暗门：“第四代守了近三百年，总算等来一位金丹明眼人。请随我进内窟，看看前辈们拼死护下的最后家底。”',
        ],
        outcomeContinueLabel: '踏入内窟 · 直面斩天铁坛',
        next: 'act4_arc_zhantian_2',
      },
      {
        id: 'zt1_probe_array',
        label: '不动声色听完四代往事，暗中记清石窟禁制与秘宝藏位',
        subtext: '冷静审度局势，无论稍后结盟还是夺宝都占得先机。',
        insightTags: ['得真相【斩天会四代遗录】', '修为与城府'],
        effect: {
          might: 8,
          mind: 6,
          renown: 4,
          addTruthClues: ['clue_zhantian_remnant'],
          setFlags: { act4_zhantian_step1: true, act4_zhantian_mapped: true },
          logSummary: '于断魂绝渊记下【斩天会四代遗录】与石窟禁制薄弱处。',
        },
        outcome: [
          '你一面顺着残老的问话展示金丹修为与天机见识，一面以灵识细细丈量整座地窟的灵流走向。三处阵眼的死穴与内窟锁机很快在你心底勾勒分明。',
          '顾苍松虽觉你神色过分冷静，终究架不住寿元将尽、后继无人，只得引你穿过狭长甬道，走向封存遗宝的内窟铁坛。',
        ],
        outcomeContinueLabel: '步入内窟 · 权衡筹码',
        next: 'act4_arc_zhantian_2',
      },
      {
        id: 'zt1_clash_shen',
        label: '正面硬撼沈清霜的霜寒剑气，逼退阻截后再入内窟',
        visible: (s) =>
          s.companions.shen_qingshuang.met && isShenHostile(s),
        subtext: '昔日陌路，今朝以金丹剑锋分高下。',
        insightTags: ['沈清霜敌对交锋', '得真相【斩天会四代遗录】', '修为大涨'],
        effect: (s) => ({
          might: 12,
          renown: 10,
          righteous: -4,
          addTruthClues: ['clue_zhantian_remnant'],
          setFlags: { act4_zhantian_step1: true },
          companionUpdates: {
            shen_qingshuang: {
              markSeen: true,
              affectionDelta: -8,
              setStance:
                s.companions.shen_qingshuang.stance === 'estranged'
                  ? 'estranged'
                  : 'rival',
              chronicle: '断魂绝渊外廊与你金丹交锋，剑气崩碎水帘，旧怨愈深。',
            },
          },
          logSummary: '于断魂绝渊外击退沈清霜阻截，强入内窟并阅尽【斩天会四代遗录】。',
        }),
        outcome: [
          (s) =>
            s.companions.shen_qingshuang.stance === 'estranged' &&
            !s.flags.shen_left_sect &&
            !s.flags.fought_shen_at_vault
              ? '霜蓝与赤金两道金丹剑气在石廊轰然相撞，碎石如雨崩落。你横剑震开两名青云执事的合击阵势，又硬接沈清霜三记冰霜绝剑，借反震之力破入内窟石门。'
              : '霜蓝与赤金两道金丹剑气在石廊轰然相撞，碎石如雨崩落。你在狭廊中硬接沈清霜三记冰霜绝剑，剑脊擦出满廊寒火，趁势震退她半步破入内窟石门。',
          '沈清霜稳住身形，冷冷盯着合拢的玄铁重门，旋即掠进下一重暗道。内窟之中，顾苍松与陆七娘已紧张地守在铁坛前。',
        ],
        outcomeContinueLabel: '直抵内窟 · 决断遗宝',
        next: 'act4_arc_zhantian_2',
      },
    ],
  },

  act4_arc_zhantian_2: {
    id: 'act4_arc_zhantian_2',
    act: 'act4',
    title: '第五代之约',
    subtitle: '阶段大势 · 斩天会四代遗录（终章）',
    location: '断魂绝渊 · 铁坛内窟',
    checkpoint: true,
    checkpointLabel: '卷四 · 斩天铁坛抉择',
    paragraphs: [
      (s) => {
        const sealDesc = s.relics.includes('broken_sky_seal')
          ? '半枚可与你怀中锁天残印相合的青铜阵核'
          : '半方沉如山岳的【残缺锁天印】';
        const swordDesc = s.relics.includes('severing_sword_embryo')
          ? '一座足以共鸣淬炼你随身剑胚的太古剑坛残阵'
          : '一柄尚未刻铭却寒气刺骨的【斩天剑胚】';
        return `内窟中央立着一座玄铁祭坛，坛上静静陈列着三件用命守下来的遗物：${sealDesc}、${swordDesc}，还有一卷标出九州十七处暗桩的皮纸星图。`;
      },
      '顾苍松剧烈咳嗽了两声，指节发白地扶着坛沿：“前三代人都想干干净净地推翻天门，结果初代死在寿尽，二代三代折在叛徒与毒井，轮到我们第四代只剩残老枯守。如今你站在坛前，我只问一句，你打算拿这些东西做什么？”',
      {
        when: (s) => Boolean(s.flags.act4_zhantian_mapped),
        text: '你方才沿途默记下的三处阵眼死穴此刻尽收眼底，连铁坛底座暗藏的锁机位置也无所遁形，无论盟约还是强夺皆已占得先机。',
      },
      {
        when: (s) =>
          s.companions.shen_qingshuang.met &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          s.companions.shen_qingshuang.stance !== 'rival',
        text: (s) =>
          s.tags.includes('sect_rebel') ||
          Boolean(s.flags.shen_left_sect) ||
          Boolean(s.flags.shen_freed_from_sect)
            ? '早已斩碎旧牌叛离青云的沈清霜按剑立于铁坛旁，素白衣袂沾着绝渊湿雾，神色前所未有地笃定：“青云长老阁又向天门递了新一轮贡单。你若愿立第五代斩天盟，我的剑便为你守住后背。”'
            : '沈清霜解下腰间青云首座玉牌，轻轻放在铁坛边沿。她抬眸看你，神色前所未有地笃定：“青云长老阁已向天门递了新一轮贡单。从今日起，我不再是青云首座。你若愿立第五代斩天盟，我的剑便为你守住后背。”',
      },
      {
        when: (s) =>
          s.companions.shen_qingshuang.met &&
          (s.companions.shen_qingshuang.stance === 'estranged' ||
            s.companions.shen_qingshuang.stance === 'rival'),
        text: '石门轰然洞开，沈清霜孤身步入内窟，霜剑滴着血珠。她扫过墙上四代死者的名字，嗓音绷紧：“锁天残印与剑胚牵动天机，若你拿它们去逐私欲、称魔尊，下界只会死得更快。今日我绝不退让。”',
      },
    ],
    choices: [
      {
        id: 'zt2_rebuild_alliance',
        label: '以金丹道心立誓，重建第五代「斩天同盟」，堂堂正正承接遗宝与暗网',
        subtext: (s) =>
          s.companions.shen_qingshuang.met &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          s.companions.shen_qingshuang.stance !== 'rival'
            ? '继承四代遗志，凝聚九州反抗散修，与沈清霜立下同盟重誓。'
            : '继承四代遗志，收拢九州十七处反抗暗桩与坛上锁天遗宝。',
        insightTags: (s) => [
          '得命格【斩天同盟】',
          '承接锁天印与剑胚',
          ...(s.companions.shen_qingshuang.met &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          s.companions.shen_qingshuang.stance !== 'rival'
            ? ['沈清霜心许']
            : []),
        ],
        effect: (s) => {
          const hadSeal = s.relics.includes('broken_sky_seal');
          const hadSword = s.relics.includes('severing_sword_embryo');
          const relicsToAdd: string[] = [];
          if (!hadSeal) relicsToAdd.push('broken_sky_seal');
          if (!hadSword) relicsToAdd.push('severing_sword_embryo');
          const isShenAlly =
            s.companions.shen_qingshuang.met &&
            s.companions.shen_qingshuang.stance !== 'estranged' &&
            s.companions.shen_qingshuang.stance !== 'rival';
          const mappedBonus = s.flags.act4_zhantian_mapped ? 5 : 0;
          return {
            might: (hadSword ? 8 : 0) + (hadSeal ? 12 : 0) + mappedBonus,
            mind: (hadSeal ? 26 : 14) + mappedBonus,
            renown: 18,
            righteous: 14,
            beatDelta: 1,
            addTags: ['sky_slayer_ally'],
            addRelics: relicsToAdd.length > 0 ? relicsToAdd : undefined,
            completeThreads: ['thread_act4_zhantian'],
            setFlags: {
              act4_zhantian_rebuilt: true,
              zt2_had_sword: hadSword,
              ...(isShenAlly ? { shen_left_sect: true } : {}),
            },
            companionUpdates: isShenAlly
              ? {
                  shen_qingshuang: {
                    markSeen: true,
                    affectionDelta: 24,
                    setStance: 'bonded',
                    setStage: 4,
                    chronicle:
                      s.tags.includes('sect_rebel') || s.flags.shen_left_sect
                        ? '断魂绝渊铁坛前与你共立第五代斩天同盟，以叛宗霜剑相托到底。'
                        : '断魂绝渊铁坛前褪去青云旧袍，与你共立第五代斩天同盟，以剑相托。',
                  },
                }
              : s.companions.shen_qingshuang.met
              ? {
                  shen_qingshuang: {
                    markSeen: true,
                    affectionDelta: 6,
                    chronicle: '见你立誓承接斩天遗志而非逐私，霜剑终究慢了一寸，转身隐入绝渊雾色。',
                  },
                }
              : undefined,
            logSummary: '于断魂绝渊重建第五代斩天同盟，承接斩天遗宝与四代反抗暗网。',
          };
        },
        outcome: [
          (s) =>
            s.flags.zt2_had_sword
              ? '你割破指尖，将一滴泛着淡金光泽的丹血滴落铁坛。四代石壁仿佛感应到滚烫血气，坛上古阵与你随身携来的【斩天剑胚】齐声共振，一层积年锈垢剥落，剑意愈发凌厉。顾苍松与陆七娘相视一笑，郑重屈膝一礼，将锁天遗藏与暗桩星图双手捧上。'
              : '你割破指尖，将一滴泛着淡金光泽的丹血滴落铁坛。四代石壁仿佛感应到滚烫血气，整座石窟响起低沉悠长的剑鸣。顾苍松与陆七娘相视一笑，郑重屈膝一礼，将【残缺锁天印】【斩天剑胚】与暗桩星图双手捧上。',
          (s) =>
            s.companions.shen_qingshuang.met &&
            s.companions.shen_qingshuang.stance !== 'estranged' &&
            s.companions.shen_qingshuang.stance !== 'rival'
              ? '沈清霜并肩立在你身侧，霜剑出鞘三寸与剑胚遥相共鸣。她侧首望向你，冰封数十载的眼底化出一抹极亮的笑意：“往后纵使九州皆敌，斩天同盟至少还有你我两柄剑。”'
              : s.companions.shen_qingshuang.met
              ? '堵在门前的沈清霜盯着坛上血誓，握剑的指节泛白，良久缓缓收剑入鞘：“记住你今日所立之誓。若有一日你背叛下界苍生，我的剑仍会来取你性命。”说完便头也不回地掠出绝渊。'
              : '陆七娘低声嘱咐：“十七处暗桩已传令听候差遣。待你成婴入中州，九州散修便不再是一盘散沙。”',
        ],
        outcomeContinueLabel: '怀揣同盟重托 · 离开绝渊',
        bridgeNote: '你重建第五代斩天同盟，九州十七处反抗暗桩已悄然归于麾下。',
        next: 'act4_hub',
      },
      {
        id: 'zt2_seize_hegemony',
        label: '以金丹威压震服残老，强夺坛上锁天遗藏与暗桩账库，唯我独尊',
        subtext: (s) =>
          s.companions.shen_qingshuang.met
            ? '以铁血霸道收割全部遗产，此举必令正气大损，并与沈清霜彻底决裂。'
            : '不愿被四代悲情规矩捆住手脚，以铁血霸道收割全部遗产。',
        insightTags: (s) => [
          '得命格【吞煞魔尊】',
          '得锁天印与灵石',
          '修为暴涨',
          ...(s.companions.shen_qingshuang.met
            ? [
                s.companions.shen_qingshuang.stance === 'estranged'
                  ? '与沈清霜仇怨更深'
                  : '与沈清霜决裂',
              ]
            : []),
        ],
        effect: (s) => {
          const hadSeal = s.relics.includes('broken_sky_seal');
          const mappedBonus = s.flags.act4_zhantian_mapped ? 60 : 0;
          const alreadyEstranged = s.companions.shen_qingshuang.stance === 'estranged';
          return {
            might: hadSeal ? 28 : 20,
            spiritStones: (hadSeal ? 560 : 260) + mappedBonus,
            renown: 10,
            righteous: s.alignment.righteous > 10 ? -40 : -22,
            beatDelta: 1,
            addTags: ['demonic_sovereign'],
            addRelics: hadSeal ? undefined : ['broken_sky_seal'],
            completeThreads: ['thread_act4_zhantian'],
            setFlags: {
              act4_zhantian_seized: true,
              zt2_had_seal: hadSeal,
            },
            companionUpdates: s.companions.shen_qingshuang.met
              ? {
                  shen_qingshuang: {
                    markSeen: true,
                    affectionDelta: -28,
                    setStance: 'estranged',
                    chronicle: alreadyEstranged
                      ? '绝渊内窟再度狭路相逢，见你强夺斩天遗宝、威逼残老，她拔剑相向后新仇更添旧恨。'
                      : '见你强夺斩天遗宝、威逼残老，她拔剑相向后彻底与你割袍断义。',
                  },
                }
              : undefined,
            logSummary: '于绝渊内窟强夺锁天遗藏与历代暗库，立下铁腕霸业。',
          };
        },
        outcome: [
          (s) =>
            s.flags.zt2_had_seal
              ? `“四代人讲仁义讲死了三千年，如今还想拿空话套住我？”你袖袍一卷，霸道金丹威压瞬间碾碎顾苍松的护身阵盘，将坛上残核嵌入怀中原有的锁天印，顺手把暗格里${s.flags.act4_zhantian_mapped ? '六百二十块' : '五百六十块'}上品灵石席卷一空。`
              : '“四代人讲仁义讲死了三千年，如今还想拿空话套住我？”你袖袍一卷，霸道金丹威压瞬间碾碎顾苍松的护身阵盘，将【残缺锁天印】连同坛下暗格里的上品灵石尽数收入囊中。',
          (s) =>
            s.companions.shen_qingshuang.met
              ? '沈清霜怒极出剑，漫天霜华在你身前炸开，却被你借锁天印余威生生震退三丈。她抹去唇角血迹，目光冷得像绝壁玄冰：“{{name}}，你与高天之上那些掠夺者已无区别。他日再见，不死不休。”'
              : '顾苍松跌坐在冰冷石阶上，惨笑一声闭上了眼睛。你未再多留片刻，提着沉甸甸的古印与星图，大步踏出绝渊。',
        ],
        outcomeContinueLabel: '携霸业秘宝 · 扬长而去',
        bridgeNote: '你以铁腕夺走绝渊锁天遗藏与暗库，魔威自北麓一路传遍九州。',
        next: 'act4_hub',
      },
      {
        id: 'zt2_broker_xie',
        label: '与残老签下秘契，将暗桩星图抄送谢无咎，以九州商网滋养反抗火种',
        visible: (s) =>
          s.companions.xie_wujiu.met && !isXieHostile(s),
        subtext: '用百宝斋的财力盘活死局，兼收锁天遗藏与丰厚分红。',
        insightTags: (s) => [
          s.relics.includes('broken_sky_seal') ? '阵核折现 600 灵石' : '得锁天印 · 300 灵石',
          '谢无咎大幅好感',
          '心境与入世',
        ],
        effect: (s) => {
          const hadSeal = s.relics.includes('broken_sky_seal');
          const payout = hadSeal ? 600 : 300;
          const isShenAlly = s.companions.shen_qingshuang.met && !isShenHostile(s);
          return {
            spiritStones: payout,
            mind: 14,
            worldly: 10,
            renown: 12,
            beatDelta: 1,
            addRelics: hadSeal ? undefined : ['broken_sky_seal'],
            completeThreads: ['thread_act4_zhantian'],
            setFlags: {
              act4_zhantian_brokered: true,
              zt2_broker_amount: payout,
              zt2_broker_with_shen: isShenAlly,
            },
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 16,
                chronicle: `你将斩天会十七处地下暗桩与百宝商路对接，他拍案称绝，慨然分红${payout === 600 ? '六百' : '三百'}灵石。`,
              },
              ...(isShenAlly
                ? {
                    shen_qingshuang: {
                      markSeen: true,
                      affectionDelta: 6,
                      chronicle: '虽不喜商贾算计，却也承认借商路养暗桩远比空手送死高明。',
                    },
                  }
                : {}),
            },
            logSummary: '促成斩天会暗桩与百宝商路暗中合流，执掌锁天遗藏。',
          };
        },
        outcome: [
          '“前几代人缺灵石缺丹药，连条活命的退路都留不下来。”你摊开账理，提议把十七处暗桩并入百宝斋的地下转运网，由谢无咎供药供石，斩天残部握紧锁天秘闻与线报。顾苍松思索良久，终究点头签了血契。',
          (s) => {
            const payout = s.flags.zt2_broker_amount === 600 ? '六百' : '三百';
            if (s.flags.zt2_broker_with_shen) {
              return `三日后暗驿验契，同来的沈清霜按着剑柄眉峰微蹙：“把斩天暗桩交给商贾，靠得住吗？”谢无咎合起抄本，拨出${payout}块上品灵石推到案前，摇扇笑答：“沈姑娘放心，这笔保命账我谢无咎比谁都怕赔本。往后斩天会再不会穷死在山沟里。”沈清霜默然片刻，终究微微颔首。`;
            }
            return `三日后，谢无咎亲自在暗驿验过抄本，摇着折扇笑得眉眼舒展，当场拨出${payout}块上品灵石作你的暗股红利：“这笔买卖做得太漂亮。往后斩天会再不会穷死在山沟里了。”`;
          },
        ],
        outcomeContinueLabel: '收妥暗契 · 返回别院',
        bridgeNote: '斩天会暗桩已暗中接上百宝商路，你手握锁天遗藏，筹码陡增。',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 大势二：古潭重塑 · 苍溟复生 ====================
  act4_arc_cangming_rebirth: {
    id: 'act4_arc_cangming_rebirth',
    act: 'act4',
    title: '古潭塑骨',
    subtitle: '阶段大势 · 苍溟复生',
    location: '寒渊古潭 · 紫雷雨夜',
    paragraphs: [
      '豆大的冷雨砸在寒渊古潭黑沉沉的水面上，激起千层白雾。穹顶雷云压得极低，紫电在云腹间游走，正是六十年一遇的阴阳雷潮。',
      '潭心清脆一裂。蛛网般的缝隙顺着【焦黑断玉】蔓延开来，一缕玄青古袍剑魂踏水而出，眉骨犹留三千年前天门金光灼下的焦疤。雷云压顶。苍溟回身看你，敛尽平日嗤笑：',
      '“断玉撑不过这个甲子了。今晚借寒潭阴气与天雷阳火重凝肉身，我便能再执真剑踏足九州。错过此夜，这缕残魂便会随雨散尽。{{name}}，把三千年前的老怪放回人世，你敢不敢？”',
    ],
    choices: [
      {
        id: 'cm_rebirth_wood',
        label: '祭出【千年养魂木】投入潭心，引紫雷淬木化骨、替苍溟重塑真身',
        visible: (s) => s.relics.includes('soul_nourishing_wood'),
        subtext: (s) =>
          s.companions.cang_ming.affection >= 35
            ? '彼此羁绊深厚，养魂木必能助其安稳复生，成为你生死相托的剑尊盟友。'
            : s.companions.cang_ming.affection >= 10
            ? '养魂木足以成躯，只是昔日互信尚浅，剑尊复生刹那恐生夺权之试探！'
            : '昔日猜忌积怨极深，一旦放其重凝真身，恐怕即刻拔剑反目！',
        insightTags: ['消耗【千年养魂木】', '得命格【古剑重塑】', '修为暴涨'],
        effect: (s) => {
          const aff = s.companions.cang_ming.affection;
          const trusted = aff >= 35;
          const hostile = aff < 10;
          return {
            removeRelics: ['soul_nourishing_wood', 'charred_jade_relic'],
            might: trusted ? 24 : hostile ? 18 : 20,
            mind: trusted ? 12 : 16,
            renown: trusted ? 14 : 10,
            addTags: ['cangming_reborn'],
            completeThreads: ['thread_act4_rebirth'],
            setFlags: {
              act4_cangming_reborn: true,
              cangming_sealed: false,
              act4_cangming_sealed: false,
            },
            companionUpdates: {
              cang_ming: {
                markSeen: true,
                affectionDelta: trusted ? 24 : hostile ? -12 : 12,
                setStance: trusted ? 'bonded' : hostile ? 'rival' : 'confidant',
                setStage: 4,
                chronicle: trusted
                  ? '寒渊雷夜，你以千年养魂木替他重凝真身。三千年前的剑尊再度踏足人间，立誓与你平肩共斩天门。'
                  : hostile
                  ? '借养魂木重凝真身那夜，旧怨尽数翻涌，他反手挥出一记冷剑震碎石岸，拂袖远去誓于天门之下清算前账。'
                  : '养魂木塑躯成型的刹那，他曾以剑念袭入你识海欲夺主导，却被你金丹道心迎面劈碎。败后他大笑服输，自此以平辈之礼相待。',
              },
            },
            logSummary: hostile
              ? '以【千年养魂木】替苍溟重塑真身，积怨爆发下古剑尊拔剑反目远走。'
              : '于寒渊古潭以【千年养魂木】助苍溟重塑真身，古剑尊再临九州。',
          };
        },
        outcome: [
          '【千年养魂木】沉潭。九道紫雷轰然劈落！雷火寒水绞成巨茧，断玉化青烟尽融木心。三个时辰后，雷云尽散。黑水自分，玄青古袍的修长身影踏岸而出，每落一步，潭畔碎石便齐齐轻鸣。',
          (s) =>
            s.companions.cang_ming.stance === 'bonded'
              ? '苍溟低头看着生出温热脉搏的双手。许久无言。他抬眼与你平视，郑重抱拳：“三千年前没人替我收尸，三千年后倒叫你拉回阳间。命归我自持。剑永不背你。”'
              : s.companions.cang_ming.stance === 'rival'
              ? '苍溟刚站稳脚跟，并指便朝你斩出一道割裂雨幕的青色剑罡！你仓促横剑格挡，虎口震裂退开七步。他甩了甩新生的指骨，眼底寒意彻骨：“你一路防贼似的压我算计我，这具身子就算抵消早年指点之恩。从此两不相欠，待天门将开那夜，再看看谁的剑更硬！”话音未落，青影已化剑虹没入夜雨。'
              : '刚踏上湿滑石岸，苍溟眼底骤现千年未磨的锋芒，一缕凌厉剑念如雷刺入你识海，企图反客为主压服你的神魂！生死瞬息，你金丹道心轰然绽光，反手将那道剑影寸寸碾碎。苍溟闷哼退后半步，擦去唇边新血，忽地仰天大笑：“好硬的骨头！难怪能活到金丹！罢，从今往后本座认你作平肩道友，再不耍花招。”',
        ],
        outcomeContinueLabel: (s) =>
          s.companions.cang_ming.stance === 'rival'
            ? '拭去虎口血痕 · 独自离潭'
            : '与复生剑尊并肩离潭',
        bridgeNote: (s) =>
          s.companions.cang_ming.stance === 'bonded'
            ? '寒渊雷夜过后，苍溟已重获真身，那柄太古玄剑自此与你并肩共指九霄。'
            : s.companions.cang_ming.stance === 'rival'
            ? '苍溟借养魂木重凝真身，却因旧怨拔剑反目远遁，天门之下必有一战。'
            : '寒渊雷夜过后，苍溟重获真身并以平辈相交，九州暗局陡添一柄凌厉剑锋。',
        next: 'act4_hub',
      },
      {
        id: 'cm_rebirth_essence',
        label: '无养魂木可依，豪掷四百五十灵石布阵，再耗五载金丹元气替他硬凝真躯',
        visible: (s) => !s.relics.includes('soul_nourishing_wood'),
        requirement: {
          minSpiritStones: 450,
          lockReason: '需灵石 450 以购凝魂灵材布阵',
        },
        subtext: '代价极重，但足以令这位傲骨剑尊铭记终生。',
        insightTags: ['耗 450 灵石与五载元气', '得命格【古剑重塑】', '苍溟至深羁绊'],
        effect: {
          timeMonths: 60,
          spiritStones: -450,
          removeRelics: ['charred_jade_relic'],
          might: 20,
          mind: 12,
          renown: 12,
          addTags: ['cangming_reborn'],
          completeThreads: ['thread_act4_rebirth'],
          setFlags: { act4_cangming_reborn: true },
          notice: '耗去四百五十灵石与五载金丹元气，终替苍溟重凝真躯。',
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: 28,
              setStance: 'bonded',
              setStage: 4,
              chronicle: '你无养魂木仍不惜散尽重金、剖出五载金丹元气替他强凝肉身，千年傲魂自此倾心相付。',
            },
          },
          logSummary: '掷重金并耗五载金丹元气，于寒渊古潭替苍溟硬凝真身。',
        },
        outcome: [
          '四百五十块上品灵石在潭畔碎成灵雾，你咬破舌尖，引出一缕精纯金丹本源化作金线，硬生生在狂暴天雷里替那缕残魂缝合筋骨！雷鸣彻夜不绝，你数度气血翻涌几乎昏厥，仍死死钉在阵眼未退半步。',
          '黎明破晓时，苍溟一身玄青古袍踏水而出，伸手一把拉住摇摇欲坠的你。他盯着你苍白的脸色，向来毒舌的剑尊难得没哼出嘲讽，只沉声甩下一句：“别真把自己耗废在半路上，省得外头杂碎上门捡漏。这五年，你的山门本座替你盯着。”',
        ],
        outcomeContinueLabel: '休养五载元气 · 重回局中',
        bridgeNote: '你付出五载元气与重金助苍溟复生，这位太古剑尊自此视你如生死同袍。',
        next: 'act4_hub',
      },
      {
        id: 'cm_seal_jade',
        label: '拒绝放虎归山，趁雷劫未落以金丹剑印将其更深地镇封回残玉',
        subtext: '绝不赌一名三千年前老怪的人性，求绝对稳妥，心境粹然。',
        insightTags: ['零花费', '心境大涨', '永封断玉绝交'],
        effect: {
          mind: 20,
          might: 8,
          righteous: -4,
          removeTags: ['cangming_reborn'],
          completeThreads: ['thread_act4_rebirth'],
          setFlags: {
            act4_cangming_sealed: true,
            cangming_sealed: true,
            act4_cangming_reborn: false,
          },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: -40,
              setStance: 'estranged',
              chronicle: '寒渊雷夜你拒绝替他塑骨，反以金丹重印将其彻底永封于残玉深处，昔日情分一夜成灰。',
            },
          },
          logSummary: '寒渊古潭之夜断然拒绝对苍溟塑躯，以金丹剑印将其永封断玉。',
        },
        outcome: [
          '天雷将落未落之际，你骤然变诀！十二道金丹禁印凌空落下，死死扼住刚凝出半个肩头的青影，将其连同潭心残魂一寸寸压回裂痕遍布的断玉之中。',
          '“好，好一个心狠手辣的小辈！”苍溟的冷笑在封印合拢前一息炸响耳畔，“你怕我夺你造化，便干脆把我永世关进黑匣！行，本座就在玉里等着看你独自去撞那扇天门！”雨声寂寂，焦黑断玉彻底沉冷下去，再无半点回音。',
        ],
        outcomeContinueLabel: '收起沉寂断玉 · 独自归去',
        bridgeNote: '你将苍溟深封于断玉之中，少了一分难测隐患，也彻底斩断了那段千年同袍情。',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 大势三：九州灵脉大战与商行崩盘 ====================
  act4_arc_world_war_1: {
    id: 'act4_arc_world_war_1',
    act: 'act4',
    title: '赤阳烽烟',
    subtitle: '阶段大势 · 九州灵脉大战（上）',
    location: '中州前线 · 百宝总号密室',
    paragraphs: [
      '中州赤阳灵矿外围已连燃七日战火。灵脉接连干涸后，三大正道宗门与天机商行再也维持不住表面体面，为争夺这条尚能吐出上品灵石的矿脉，双方投入了逾千筑基修士与十余位金丹长老，矿谷里日夜剑光纵横。',
      '百宝总号最深处的地下账房里却安静得只听得见算珠脆响。长案上铺满百宝斋积攒百年的全部家底与一叠叠印着赤红朱印的天机商行灵石兑票。',
      {
        when: (s) => s.companions.xie_wujiu.met && !isXieHostile(s),
        text: '谢无咎袖口还沾着熬夜批账的墨迹。见你进门，他玄铁扇往账册上一敲：“大戏开锣了。天机商行放了三百万兑票，地库现石却连三成都凑不齐，我已押上百宝斋百年家底连环抛票拆台！”他眸光灼亮。“赤阳矿前，替我钉死他们。”',
      },
      {
        when: (s) => s.companions.xie_wujiu.met && isXieHostile(s),
        text: (s) =>
          s.completedThreads.includes('thread_act3_chamber')
            ? '谢无咎连眼皮都懒得抬，啪地合上玄铁算盘冷笑一声：“青州地窟那笔烂账还没算，今天找上门来，是觉得百宝斋好欺负，还是想再赚一笔黑心钱？我押百年家底砸天机商行的兑票，不指望你搭把手，别在背后捅刀子就算积德了。”'
            : '谢无咎连眼皮都懒得抬，啪地合上玄铁算盘冷笑一声：“从前那笔烂账还没算，今天找上门来，是觉得百宝斋好欺负，还是想再赚一笔黑心钱？我押百年家底砸天机商行的兑票，不指望你搭把手，别在背后捅刀子就算积德了。”',
      },
      {
        when: (s) => !s.companions.xie_wujiu.met,
        text: '你按百宝总号贴出的金丹秘邀帖步入雅室，案后那名玄衣摇扇的青年正是执掌青岚暗市的少东家谢无咎。他起身拱手含笑：“久仰{{honorific}}金丹威名。眼下天机商行外强中干，库银空虚七成，我百宝斋押上百年家底连环抛票拆台，特邀{{honorific}}入局。只要今夜撬垮他们的总库，{{honorific}}要灵石有灵石，要商行密账有密账。”',
      },
      '门外探子同时递来另外两封急信。正道两大宗门的副掌教暗中求见，愿奉重宝请你出面调停止战。赤阳矿西麓两座分矿守军也已杀得筋疲力尽，阵法摇摇欲坠。',
      {
        when: (s) => s.tags.includes('origin_scout'),
        text: '你一眼扫过战报上的布防图，早年北境戍边的斥候直觉立时浮上来：西麓矿营的哨卡排得松散，守军连轮休的暗哨都撤了，今夜便是最易撕开口子的时辰。',
      },
      {
        when: (s) => s.tags.includes('origin_orphan'),
        text: '窗外街市飘来兑票逼兑的喧哗。你在青岚南市檐下听惯了穷人抢米与商贩逃债的声响，只凭那几声嘶喊便断定，天机商行的现银撑不过三日。',
      },
    ],
    choices: [
      {
        id: 'war1_audit_ledger',
        label: '留在密室与谢无咎核对总账，摸清天机商行地下总库防卫弱点',
        visible: (s) => !isXieHostile(s),
        subtext: '为彻底抛票拆台并奇袭天机商行总库做好万全筹划。',
        insightTags: ['谢无咎路线', '心境与情报'],
        effect: {
          mind: 8,
          renown: 6,
          setFlags: { act4_war_step1: true, act4_war_intel: 'xie' },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 10,
              chronicle: '赤阳灵脉大战前夜与你彻夜核对天机商行空账，敲定抛票奇袭之计。',
            },
          },
          logSummary: '于百宝总号密室与谢无咎核对天机商行空账，锁死总库换防死穴。',
        },
        outcome: [
          '你与谢无咎对照了整整三箱暗账，很快锁死天机商行最致命的死穴：中州总库每日丑时换防，而他们最精锐的三名金丹客卿此刻全被拖在赤阳矿口抽不开身。',
          '谢无咎合上折扇，眼底冷光灼灼：“明天日落，我在九州七十二家分号同时抛售兑票引发逼兑。总库那道玄铁门，便拜托{{honorific}}替我踹开了。”',
        ],
        outcomeContinueLabel: '定计出室 · 奔赴决战之夜',
        next: 'act4_arc_world_war_2',
      },
      {
        id: 'war1_meet_envoys',
        label: '分头密会正道副掌教与商行特使，试探两家停战分矿的筹码底线',
        subtext: '两边压价、居中坐收渔利，探清他们肯拿出什么压箱底重宝。',
        insightTags: ['纵横捭阖', '声望与入世'],
        effect: {
          renown: 10,
          worldly: 6,
          mind: 6,
          setFlags: { act4_war_step1: true, act4_war_intel: 'truce' },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              chronicle: '大战前夜你没有急着表态，转而分头接见了正道与商行两路密使。',
            },
          },
          logSummary: '大战前夜密会正道与天机商行两路特使，摸清停战分矿的筹码底线。',
        },
        outcome: [
          '两家早已打空半数库存。听说你愿居中作保，顿时红了眼。正道密使当夜登门吐底，只要你能压住商行停火，仙盟便双手奉上镇阁【太阴育婴莲】与矿脉分红地契。筹码沉得惊人。',
          '你笑而不语，将两家底牌尽数记在心里，静候明夜决战时刻。',
        ],
        outcomeContinueLabel: '掌握底牌 · 踏入决战之夜',
        next: 'act4_arc_world_war_2',
      },
      {
        id: 'war1_scout_mines',
        label: '亲赴赤阳西麓勘察战阵，盯死两家摇摇欲坠的疲惫矿军',
        subtext: '螳螂捕蝉，黄雀在后，摸清趁乱强吞两座残矿的最佳路线。',
        insightTags: ['铁血军阀路向', '修为提升'],
        effect: {
          might: 10,
          righteous: -4,
          setFlags: { act4_war_step1: true, act4_war_intel: 'warlord' },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              chronicle: '你赴百宝总号听完局势便独自奔赴赤阳战区勘察矿防，心思深不可测。',
            },
          },
          logSummary: '夜赴赤阳矿谷勘察两军疲势，记下护矿大阵弱点以待决战落子。',
        },
        outcome: [
          '你隐匿金丹气息掠过硝烟弥漫的赤阳谷，只见正道与商行的护矿大阵皆已残破不堪，阵眼灵晶暗淡无光。不出两日，这两支精锐便会耗尽最后一分力气。',
          '你记下总库密道与两处矿井退路，冷眼等待火候熟透。',
        ],
        outcomeContinueLabel: '静候战机 · 迎来决战之夜',
        next: 'act4_arc_world_war_2',
      },
    ],
  },

  act4_arc_world_war_2: {
    id: 'act4_arc_world_war_2',
    act: 'act4',
    title: '商行崩盘夜',
    subtitle: '卷四 · 九州灵脉大战（终章）',
    location: '中州总号与赤阳灵矿 · 烽火彻夜',
    checkpoint: true,
    checkpointLabel: '卷四 · 赤阳商战终局',
    paragraphs: [
      '丑时鼓响，中州城内骤然大乱！上万名手攥天机商行兑票的散修与小宗执事堵死了总号朱门，高喊着立刻兑付真灵石。百宝斋放出的空账铁证在一夜之间贴满了七十二城坊市，天机商行苦心经营三百年的信用如雪崩般坍塌。',
      (s) =>
        s.flags.act4_war_intel === 'xie'
          ? '城外三十里，赤阳灵矿火光冲天。你早已核透天机总库丑时换防的空档，总号玄铁门的阵脚此刻正赤裸裸露在你剑锋之下。'
          : s.flags.act4_war_intel === 'truce'
          ? '城外三十里，赤阳灵矿火光冲天。昨夜与你密谈过的正道与商行特使已在阵前亮出白旗信箭，只等你这位金丹中间人拍板落锤。'
          : '城外三十里，赤阳灵矿火光冲天，正道宗门与商行守军正如你先前勘察的那般油尽灯枯。风暴中心，整座九州的财脉与矿权此刻全悬于你的一念之间。',
    ],
    choices: [
      {
        id: 'war2_back_xie_coup',
        label: '力挺谢无咎到底，亲率奇兵劈开天机商行总库，彻查并夺取核心账册',
        visible: (s) => !isXieHostile(s),
        subtext: '令天机商行彻底崩盘，收获【三千年收割总录】、420 灵石与谢无咎至深羁绊！',
        insightTags: ['商行崩盘', '得【三千年收割总录】', '420 灵石', '谢无咎心许'],
        effect: {
          spiritStones: 420,
          might: 10,
          mind: 10,
          renown: 16,
          worldly: 8,
          beatDelta: 1,
          addRelics: ['ascension_ledger'],
          completeThreads: ['thread_act4_war'],
          setFlags: { act4_chamber_collapsed: true },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 26,
              setStance: 'bonded',
              setStage: 4,
              chronicle: '你亲手劈开天机商行总库玄铁门，助他以百年资本一战拆垮商行、夺回兄长血仇总录，二人自此肝胆相照。',
            },
          },
          logSummary: '联手谢无咎抛票拆台并击溃天机商行，夺得铁证【三千年收割总录】与巨额灵石。',
        },
        outcome: [
          '丹剑直劈三重玄铁门。守库两名金丹管事见势不妙，抛印仓皇遁走。谢无咎紧随其后，一脚踹翻鎏金匾额。满地灵石间，他翻出一卷血丝装订的【三千年收割总录】。每任飞升候补入炉的年月俱在册上。他兄长也在其中。',
          '细雨扑进残破大堂。谢无咎眼眶通红，笑得酣畅淋漓。他把总录和四百二十块上品灵石推入你怀：“账清了！商行垮了！{{name}}，我谢无咎平生最赚的一笔买卖，便是把后背押在你身上。”',
        ],
        outcomeContinueLabel: '携血录与重金 · 步出烽火',
        bridgeNote: '天机商行分号连环崩盘，你与谢无咎平分战果，更将【三千年收割总录】收入囊中。',
        next: 'act4_hub',
      },
      {
        id: 'war2_broker_truce',
        label: '以金丹威严居中叫停战火，迫使正道与商行签下分矿停战密约、两头收取厚礼',
        subtext: (s) =>
          s.companions.xie_wujiu.met
            ? '稳赚战争红利，获【太阴育婴莲】【九州灵脉契】与仙盟客卿印，但会令谢无咎抛票拆台功亏一篑、颇为不满。'
            : '稳赚战争红利，获【太阴育婴莲】【九州灵脉契】与仙盟客卿身份。',
        insightTags: (s) => [
          s.relics.includes('nascent_lotus') ? '育婴莲折现+400灵石' : '得【太阴育婴莲】',
          s.relics.includes('spirit_vein_deed') ? '矿契折现+100灵石' : '得【九州灵脉契】',
          '仙盟客卿',
          ...(s.companions.xie_wujiu.met ? ['谢无咎微愠(-16)'] : []),
        ],
        effect: (s) => {
          const hadDeed = s.relics.includes('spirit_vein_deed');
          const hadLotus = s.relics.includes('nascent_lotus');
          const addRelics: string[] = [];
          if (!hadLotus) addRelics.push('nascent_lotus');
          if (!hadDeed) addRelics.push('spirit_vein_deed');
          return {
            spiritStones: 180 + (hadDeed ? 100 : 0) + (hadLotus ? 400 : 0),
            mind: 14,
            renown: 18,
            worldly: 10,
            beatDelta: 1,
            addRelics: addRelics.length > 0 ? addRelics : undefined,
            addTags: ['alliance_envoy'],
            completeThreads: ['thread_act4_war'],
            setFlags: {
              act4_war_truce: true,
              war2_lotus_converted: hadLotus,
            },
            companionUpdates: s.companions.xie_wujiu.met
              ? {
                  xie_wujiu: {
                    markSeen: true,
                    affectionDelta: -16,
                    chronicle: '赤阳决战夜你选择居中调停换取仙盟与商行重礼，令他的抛票大计功亏一篑。',
                  },
                }
              : undefined,
            logSummary: hadLotus
              ? '于赤阳灵矿力压两方签下停战分矿约，将多余【太阴育婴莲】折现四百灵石收妥。'
              : '于赤阳灵矿力压正道与天机商行签下停战分矿约，获【太阴育婴莲】与矿契厚酬。',
          };
        },
        outcome: [
          (s) =>
            s.flags.war2_lotus_converted
              ? '你御剑悬于赤阳矿谷上空，金丹威压如山倾覆，逼停精疲力竭的两军。天明前签订分矿停战密约，你怀中早备了一株育婴莲，便顺手将正道多奉上的那株折兑四百灵石，连同矿契厚酬一并收囊。'
              : '你御剑悬于赤阳矿谷上空，金丹威压如山倾覆，逼停了精疲力竭的两军。天明之前，三方在临时大帐里签下分矿停战密约，你作为唯一担保人，当场收下了正道奉上的【太阴育婴莲】与两方共同奉上的矿契厚酬。',
          '百宝斋那边，谢无咎连夜撤单止损才勉强保住本钱。次日街头擦肩，他合扇朝你微微一笑：“好手段，两头吃得干干净净。只是这回，我可记下这笔亏空了。”',
        ],
        outcomeContinueLabel: '收好育婴莲与矿契 · 返归别院',
        bridgeNote: '赤阳停战密约令你名震九州，结婴至宝【太阴育婴莲】亦已落入掌中。',
        next: 'act4_hub',
      },
      {
        id: 'war2_warlord_seize',
        label: '趁正道与商行拼得油尽灯枯，以魔威横扫赤阳谷，强吞两座残存灵矿与密库卷册',
        subtext: '不站任何一方，只做最冷酷的金丹霸主，但会彻底断绝与百宝斋的信任。',
        insightTags: ['得命格【吞煞魔尊】', '得【三千年收割总录】', '360 灵石与巨额修为'],
        effect: (s) => ({
          might: 22,
          spiritStones: 360,
          renown: 14,
          righteous: s.alignment.righteous > 10 ? -40 : -22,
          beatDelta: 1,
          addTags: ['demonic_sovereign'],
          addRelics: ['ascension_ledger'],
          completeThreads: ['thread_act4_war'],
          setFlags: { act4_war_warlord: true },
          companionUpdates: s.companions.xie_wujiu.met
            ? {
                xie_wujiu: {
                  markSeen: true,
                  affectionDelta: -35,
                  setStance: 'rival',
                  chronicle: '你在赤阳谷趁火打劫横扫两军，搅黄了他的拆台筹局，让他看清你只认铁血不讲情面。',
                },
              }
            : undefined,
          logSummary: '于赤阳灵脉大战中强势截胡，横扫两方疲师，吞并灵矿并夺走【三千年收割总录】。',
        }),
        outcome: [
          '战火将歇未歇的一刻，你如苍鹰搏兔般直扑赤阳西麓！两支早已被连日厮杀榨干灵力的守军根本挡不住全盛金丹的雷霆铁腕，不到半个时辰便溃散奔逃。',
          (s) =>
            s.companions.xie_wujiu.met
              ? '你接管两座残矿、搜出三百六十块上品灵石与血迹斑斑的【三千年收割总录】。归途掠过乱市，谢无咎正立在翻倒的兑票堆前，见你经过啪地合拢玄铁折扇，冷笑出声：“好一个金丹煞星。这笔百年旧账，我记在心口上了。”'
              : '你亲手接管两座尚余丰厚灵石的残矿，洗劫三百六十块上品灵石，又从商行随军密匣中搜出那卷血迹斑斑的【三千年收割总录】。自此中州坊间提起你的名号，无人不称一声乱世煞星。',
        ],
        outcomeContinueLabel: '清点战利品 · 凯旋回峰',
        bridgeNote: '你趁乱横扫赤阳残矿、夺走收割总录，九州各大宗门对你的魔威忌惮万分。',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 大势四：无灵古碑 · 上古无灵纪真相 ====================
  act4_arc_mortal_truth: {
    id: 'act4_arc_mortal_truth',
    act: 'act4',
    title: '无灵古碑',
    subtitle: '阶段大势 · 上古无灵纪真相',
    location: '青州深山 · 槐阴无灵村',
    paragraphs: [
      '风忽然软了。顺着青州旧医札穿过百里枯黄死寂的断脉山脊，一迈过群峰褶皱里的槐阴村山坳，井水甘冽，檐下垂满饱满的干玉米与艾草，全未受外界灵脉崩塌牵连。',
      '泥墙下露出半截青灰石碑。毫无灵息。正因这彻头彻尾的凡石凡胎，三千年来高天巡检九州的阵眼从未扫见过它半分，碑面却以长明之前三万年的古篆刻着一段被抹尽的真相：',
      '碑文极朴素。长明之前三万年，世人本无灵根，顺四时而生，终百岁而安。直到天外牧者降临，把灵根像草种般播进血脉，借灵气催熟，三千年一割。唯有全无灵根的凡人不在天幕眼中，仍是天地原本的自由身。',
      {
        when: (s) => isSuAliveAndHealthyInAct4(s) || isSuFarewellInAct4(s),
        text: (s) => {
          const span = getAgeYears(s.ageMonths) >= 50 ? '数十载过去' : '十余载过去';
          return isSuAliveAndHealthyInAct4(s)
            ? `石碑旁茅舍飘着陈皮药香。两鬓斑白的苏知微正倚窗分拣晒草，徒弟阿芸端来一碗热药粥。${span}你容颜如旧，她眼角刻满细纹，神智却清朗如昔：“延寿露替我多挣了这些年，《无灵医典》与药田都已交妥阿芸。守着这块碑等了数载，总算见你读懂它了。”`
            : `石碑旁茅舍温着炭火。满头银丝的苏知微披棉被倚在窗边，小炉上煨着半壶温热的陈皮汤。${span}你容颜如旧，她已是风烛残年，见你推门仍弯起眼角：“延寿露多给的几十年光阴，足够把医典交妥阿芸。守着这块碑等了数载，总算见你读懂它了。”`;
        },
      },
      {
        when: (s) =>
          s.companions.su_zhiwei.met &&
          s.companions.su_zhiwei.affection >= 10 &&
          !s.flags.left_qingzhou_coldly &&
          !isSuAliveAndHealthyInAct4(s) &&
          !isSuFarewellInAct4(s) &&
          !s.flags.su_zhiwei_passed,
        text: (s) => {
          const timePhrase = s.flags.su_zhiwei_saved_longlife
            ? '师父高龄安然寿终前郑重交代，老桂树下立了她的素坟，'
            : '师父晚年安然寿终前交代，老桂树下立着她的素坟，';
          const intro =
            getAgeYears(s.ageMonths) >= 110
              ? '石碑旁守着一位粗布衣裳的医女，自称阿芸，是青州杏林一脉传人。'
              : '石碑旁守着一位粗布衣裳的年轻医女，自称阿芸，是苏知微晚年收下的徒弟。';
          return s.relics.includes('mortal_hearth_talisman')
            ? `${intro}她红着眼眶递来一卷弥漫干桂花香的手抄遗册：“${timePhrase}若佩着无灵玉印、容貌不老的故人来寻此碑，便把古碑注解交到您手里。她说仙凡路远，您平安就好。”`
            : `${intro}她红着眼眶递来一只紫檀木匣：“${timePhrase}若容貌不老、带着剑气的故人来寻此碑，便把这枚【无灵归尘印】交到您手里。她说仙凡路远，您平安就好。”`;
        },
      },
      {
        when: (s) =>
          s.companions.su_zhiwei.met &&
          s.companions.su_zhiwei.affection >= 10 &&
          !s.flags.left_qingzhou_coldly &&
          Boolean(s.flags.su_zhiwei_passed),
        text: '祠堂侧畔一株老桂树下，立着阿芸替师父修的素净青石衣冠冢，碑前摆着新供的粗瓷茶碗。你拂去碑前落叶，想起青州杏林的药香，良久方转身回到无灵古碑前。',
      },
      {
        when: (s) =>
          !s.companions.su_zhiwei.met ||
          (s.companions.su_zhiwei.affection < 10 && !isSuAliveAndHealthyInAct4(s) && !isSuFarewellInAct4(s)) ||
          (Boolean(s.flags.left_qingzhou_coldly) && !isSuAliveAndHealthyInAct4(s) && !isSuFarewellInAct4(s)),
        text: '白发族长拄着枣木杖立在一旁，淡笑说起祖训。凡生出灵根的后辈，皆须离村远去。留下的无灵人守着几亩薄田，倒稳稳躲过了历代仙门大劫。',
      },
    ],
    choices: [
      // ---- 苏知微延寿且年未逾七十五：银发清朗，温茶相约 ----
      {
        id: 'mortal_su_warm_promise',
        label: (s) =>
          s.relics.includes('mortal_hearth_talisman')
            ? '请她替腰间【无灵归尘印】补刻古碑末句，接过续补遗册并约她静候归期'
            : '与她并肩细读无灵古碑，收下【无灵归尘印】并约定劫后同饮青州温茶',
        visible: (s) => isSuAliveAndHealthyInAct4(s),
        subtext: '她神智清朗，已将药田与医典托付徒弟阿芸，与你许下青州药炉留茶之约。',
        insightTags: ['得真相【上古无灵纪】', '苏知微安康相约', '命格【红尘守灯人】'],
        effect: (s) => {
          const hadSeal = s.relics.includes('mortal_hearth_talisman');
          const canCleanseTaint =
            s.tags.includes('blood_pill_tainted') && s.alignment.righteous >= -35;
          return {
            mind: hadSeal ? 26 : 22,
            worldly: 14,
            righteous: 10,
            addTruthClues: ['clue_mortal_bloodline'],
            addRelics: hadSeal ? undefined : ['mortal_hearth_talisman'],
            addTags: ['mortal_keeper'],
            removeTags: canCleanseTaint ? ['blood_pill_tainted'] : undefined,
            notice: canCleanseTaint
              ? '药炉清气与无灵古碑相合，早年血丹残留煞印已悄然散尽。'
              : undefined,
            completeThreads: ['thread_act4_mortal'],
            setFlags: { act4_mortal_truth_found: true, mortal_had_seal: hadSeal },
            companionUpdates: {
              su_zhiwei: {
                markSeen: true,
                affectionDelta: 22,
                setStance: 'bonded',
                setStage: 4,
                chronicle:
                  '槐阴古村重逢，两鬓斑白的她神智清朗，将药田托付徒弟阿芸后与你定下青州留茶之约。',
              },
            },
            logSummary:
              '于槐阴古村破译【上古无灵纪】真相，与安康的苏知微定下青州留茶之约。',
          };
        },
        outcome: [
          (s) =>
            s.flags.mortal_had_seal
              ? '苏知微接过你早年贴身佩着的【无灵归尘印】，取小刻刀照着古碑末行稳稳补刻了一道古篆，又将阿芸捧来的最后三卷手抄医册一并交给你：“这下印文全了。待九州劫起，青州药炉必为你留一盏温茶。”'
              : '苏知微将一枚触手温润的【无灵归尘印】轻轻放进你掌心，眉目温和：“这印里刻着古碑上蔽开天眼的法门。药田与医馆我都交给了阿芸，待九州劫起，青州药炉必为你留一盏温茶。”',
          '山风拂过村口老桂树，阿芸在一旁认真记着药方，苏知微微笑着送你到竹篱外。你回头望了一眼茅舍上空袅袅升起的茶烟，胸中沉静如铁。',
        ],
        outcomeContinueLabel: '怀揣温茶之约 · 告别槐阴村',
        bridgeNote:
          '苏知微安康如昔，已将医典托付徒弟阿芸，并与你定下劫后青州留茶之约。',
        next: 'act4_hub',
      },
      {
        id: 'mortal_su_quiet_tea',
        label: '不发沉重豪誓，只陪她在药炉旁喝完一壶桂花茶，静静记下碑文辞行',
        visible: (s) => isSuAliveAndHealthyInAct4(s),
        subtext: '淡然澄明，心境升华，她仍康健守在青州药庐候你平安。',
        insightTags: ['得真相【上古无灵纪】', '苏知微安康', '心境大圆满'],
        effect: (s) => {
          const hadSeal = s.relics.includes('mortal_hearth_talisman');
          const canCleanseTaint =
            s.tags.includes('blood_pill_tainted') && s.alignment.righteous >= -35;
          return {
            mind: hadSeal ? 28 : 24,
            worldly: 8,
            addTruthClues: ['clue_mortal_bloodline'],
            addRelics: hadSeal ? undefined : ['mortal_hearth_talisman'],
            addTags: ['mortal_keeper'],
            removeTags: canCleanseTaint ? ['blood_pill_tainted'] : undefined,
            notice: canCleanseTaint
              ? '药炉清气与无灵古碑相合，早年血丹残留煞印已悄然散尽。'
              : undefined,
            completeThreads: ['thread_act4_mortal'],
            setFlags: { act4_mortal_truth_found: true, mortal_had_seal: hadSeal },
            companionUpdates: {
              su_zhiwei: {
                markSeen: true,
                affectionDelta: 18,
                chronicle: '槐阴药炉旁你与她静静喝完一壶桂花茶，她托阿芸备好干桂花送你远行。',
              },
            },
            logSummary: '于槐阴村与苏知微静饮桂花茶，参透【上古无灵纪】真相。',
          };
        },
        outcome: [
          (s) =>
            s.flags.mortal_had_seal
              ? '你替她把补过口的青瓷碗温到恰好不烫手。苏知微小口抿完热汤，将最后两册古碑校注塞进你行囊，笑着说阿芸已能独当一面，往后青州药炉常亮，你随时可回来歇脚。'
              : '你替她把青瓷碗温到恰好不烫手。苏知微小口抿完热汤，顺手把【无灵归尘印】塞进你袖袋：“药炉常热，待风波过了，记得回来喝口热粥。”',
          '山谷宁静，晒草香漫过篱墙。你起身拂衣辞行，将那段被三千年掩埋的无灵古史记入神魂。',
        ],
        outcomeContinueLabel: '轻掩竹扉 · 重返九州',
        bridgeNote: '与苏知微静饮一壶桂花茶并读懂【上古无灵纪】，心境澄澈如洗。',
        next: 'act4_hub',
      },

      // ---- 苏知微年事已高（玩家年龄 ≥ 75）：安然辞世告别 ----
      {
        id: 'mortal_su_farewell_vow',
        label: (s) =>
          s.relics.includes('mortal_hearth_talisman')
            ? '握紧她微凉枯瘦的手陪到天明，接过手抄遗册立誓守住人间火种'
            : '握紧她微凉枯瘦的手陪到天明，接过【无灵归尘印】立誓守住人间火种',
        visible: (s) => isSuFarewellInAct4(s),
        subtext: '与银发苏知微度过最后一个安静长夜，承接红尘守灯人之志。',
        insightTags: ['得真相【上古无灵纪】', '红尘守灯人', '心境升华'],
        effect: (s) => {
          const hadSeal = s.relics.includes('mortal_hearth_talisman');
          const canCleanseTaint =
            s.tags.includes('blood_pill_tainted') && s.alignment.righteous >= -35;
          return {
            mind: hadSeal ? 26 : 22,
            worldly: 14,
            righteous: 10,
            addTruthClues: ['clue_mortal_bloodline'],
            addRelics: hadSeal ? undefined : ['mortal_hearth_talisman'],
            addTags: ['mortal_keeper'],
            removeTags: canCleanseTaint ? ['blood_pill_tainted'] : undefined,
            notice: canCleanseTaint
              ? '药炉清气与无灵古碑相合，早年血丹残留煞印已悄然散尽。'
              : undefined,
            completeThreads: ['thread_act4_mortal'],
            setFlags: {
              su_zhiwei_passed: true,
              act4_mortal_truth_found: true,
              mortal_had_seal: hadSeal,
            },
            companionUpdates: {
              su_zhiwei: {
                markSeen: true,
                affectionDelta: 22,
                setStance: 'bonded',
                setStage: 4,
                chronicle: '槐阴古村静夜，银发垂暮的她将毕生心血托付于你与阿芸，带着笑意安然辞世。',
              },
            },
            logSummary: '于槐阴古村破译【上古无灵纪】真相，送别安然辞世的苏知微。',
          };
        },
        outcome: [
          (s) =>
            s.flags.mortal_had_seal
              ? '她伸手覆住你腰间那枚早已温热的【无灵归尘印】，又将枕边亲手誊抄的最后几页古碑遗册递过来，声音轻得像窗外山风：“医馆交给了阿芸。你去掀翻那扇假天门时，别忘了山脚下还有千万盏凡人灯火。”'
              : '她将一枚触手温润的【无灵归尘印】轻轻放进你掌心，声音轻得像窗外山风：“这印里刻着古碑上蔽开天眼的法门。你去掀翻那扇假天门时，把它贴身带着，别忘了山脚下还有千万盏凡人灯火。”',
          '那一夜你没有运功，只守着炭盆，听她断断续续念起青州杏林的旧事。五更天，山风停了。她靠在枕上合上眼，唇角还停着一点安稳的笑。再没醒来。天明后，你与阿芸在老桂树下立了素碑，攥着犹温的玉印重入九州。',
        ],
        outcomeContinueLabel: '怀温印辞村 · 告别槐阴',
        bridgeNote: '苏知微于槐阴静夜安然辞世，徒弟阿芸接过药炉，你怀着无灵真相重返局中。',
        next: 'act4_hub',
      },
      {
        id: 'mortal_su_farewell_quiet',
        label: '不发沉重豪誓，只替她续满最后一盏热桂花茶，静静送故人走完最后一程',
        visible: (s) => isSuFarewellInAct4(s),
        subtext: '淡然澄明，心境升华，静送故人长眠老桂树下。',
        insightTags: ['得真相【上古无灵纪】', '心境大圆满'],
        effect: (s) => {
          const hadSeal = s.relics.includes('mortal_hearth_talisman');
          const canCleanseTaint =
            s.tags.includes('blood_pill_tainted') && s.alignment.righteous >= -35;
          return {
            mind: hadSeal ? 28 : 26,
            worldly: 8,
            addTruthClues: ['clue_mortal_bloodline'],
            addRelics: hadSeal ? undefined : ['mortal_hearth_talisman'],
            addTags: ['mortal_keeper'],
            removeTags: canCleanseTaint ? ['blood_pill_tainted'] : undefined,
            notice: canCleanseTaint
              ? '药炉清气与无灵古碑相合，早年血丹残留煞印已悄然散尽。'
              : undefined,
            completeThreads: ['thread_act4_mortal'],
            setFlags: {
              su_zhiwei_passed: true,
              act4_mortal_truth_found: true,
              mortal_had_seal: hadSeal,
            },
            companionUpdates: {
              su_zhiwei: {
                markSeen: true,
                affectionDelta: 18,
                chronicle: '静夜里你只替她温了最后一壶桂花茶，无言相伴至黎明，送她长眠老桂树下。',
              },
            },
            logSummary: '于槐阴静夜送别苏知微辞世，得【上古无灵纪】真相。',
          };
        },
        outcome: [
          (s) =>
            s.flags.mortal_had_seal
              ? '你试好水温递过青瓷茶碗，又替她掖了掖洗得发白的粗布被角。苏知微抿了一口，把枕边誊好的最后一卷医案放进你袖袋：“能再看你安稳坐在这儿，我这辈子便没有遗憾了。”'
              : '你试好水温递过青瓷茶碗，又替她掖了掖粗布被角。苏知微抿了一口，笑着把【无灵归尘印】塞进你袖袋：“就知道你不爱说大话。能多看你这一眼，我这辈子便没有遗憾了。”',
          '夜风无声，炉火燃至尽头化作一捧细白灰。她走得极轻，像一瓣落进泥土的杏花。你静坐良久，替她掩好柴扉，将那段无灵古史刻进神魂。',
        ],
        outcomeContinueLabel: '轻掩柴扉 · 重返九州',
        bridgeNote: '送别苏知微并读懂【上古无灵纪】后，你的心境澄澈如洗，再无半分迷惘。',
        next: 'act4_hub',
      },

      // ---- 其他状态（故人已逝 / 留匣相托 / 未曾结识） ----
      {
        id: 'mortal_copy_and_guard',
        label: '细拓无灵古碑全文并在谷口设下隐匿禁制，护住这座凡尘净土',
        visible: (s) =>
          !isSuAliveAndHealthyInAct4(s) && !isSuFarewellInAct4(s),
        subtext: '以金丹之力庇护槐阴村，铭记【上古无灵纪】与人间灯火。',
        insightTags: ['得真相【上古无灵纪】', '红尘守灯人'],
        effect: (s) => {
          const hadSeal = s.relics.includes('mortal_hearth_talisman');
          const suWarm =
            s.companions.su_zhiwei.met &&
            s.companions.su_zhiwei.affection >= 10 &&
            !s.flags.left_qingzhou_coldly;
          const canCleanseTaint =
            s.tags.includes('blood_pill_tainted') && s.alignment.righteous >= -35;
          return {
            mind: hadSeal ? 22 : 18,
            worldly: 10,
            righteous: 10,
            addTruthClues: ['clue_mortal_bloodline'],
            addRelics: hadSeal ? undefined : ['mortal_hearth_talisman'],
            addTags: ['mortal_keeper'],
            removeTags: canCleanseTaint ? ['blood_pill_tainted'] : undefined,
            notice: canCleanseTaint
              ? '无灵古碑清气涤脉，早年血丹残留煞印已悄然散尽。'
              : undefined,
            completeThreads: ['thread_act4_mortal'],
            setFlags: {
              act4_mortal_truth_found: true,
              mortal_had_seal: hadSeal,
              mortal_su_warm_at_visit: suWarm,
              ...(s.companions.su_zhiwei.met ? { su_zhiwei_passed: true } : {}),
            },
            companionUpdates:
              suWarm && !s.flags.su_zhiwei_passed
                ? {
                    su_zhiwei: {
                      markSeen: true,
                      chronicle: '你赴槐阴古村接过她生前托徒留下的遗物，并以金丹禁制护住了整座村落。',
                    },
                  }
                : undefined,
            logSummary: '于槐阴古村揭开【上古无灵纪】真相，布阵护村承接无灵遗志。',
          };
        },
        outcome: [
          '你取宣纸墨锭将古碑全文完整拓下，又按碑中无灵玄理在槐阴谷口布下一重顺应地脉的隐匿雾阵，绝不让外界战火与探子惊扰这座山村。',
          (s) =>
            s.flags.mortal_su_warm_at_visit
              ? s.flags.mortal_had_seal
                ? '你抚过腰间早已珍藏的【无灵归尘印】，又将古碑拓文收进书囊，向老桂树下的素坟深深一揖。凡尘虽短，这一份未曾被天幕驯服的清醒却比长生更沉。'
                : '收起阿芸捧来的那枚弥漫着淡雅桂花香的【无灵归尘印】，你向老桂树下的素坟深深一揖。凡尘虽短，这一份未曾被天幕驯服的清醒却比长生更沉。'
              : s.flags.mortal_had_seal
              ? '老族长瞥见你腰间【无灵归尘印】，神色骤变。同出一源。他起身入祠堂，双手捧出珍藏百年的前朝古笺注解并奉上热茶，待你收妥拓文细读一遍，胸中豁然洞开。'
              : '老族长见你并无修仙大能的傲慢，郑重从祠堂暗龛请出先祖传下的【无灵归尘印】赠予你作护身信物。你收好玉印，胸中豁然开朗。',
        ],
        outcomeContinueLabel: '辞别槐阴谷 · 回归九州大局',
        bridgeNote: '灵根原是上界播下的牧草之种，这一惊世真相让你彻底看穿了长生骗局。',
        next: 'act4_hub',
      },
      {
        id: 'mortal_study_blindspot',
        label: '只深研碑中“无灵蔽天”玄理入心，将其铸作日后逆伐天门的暗手',
        visible: (s) =>
          !isSuAliveAndHealthyInAct4(s) && !isSuFarewellInAct4(s),
        subtext: '冷峻务实，将上古真相转化为自身的破劫底蕴。',
        insightTags: ['得真相【上古无灵纪】', '修为与心境并进'],
        effect: (s) => ({
          mind: 16,
          might: 10,
          worldly: -6,
          addTruthClues: ['clue_mortal_bloodline'],
          completeThreads: ['thread_act4_mortal'],
          setFlags: {
            act4_mortal_truth_found: true,
            ...(s.companions.su_zhiwei.met ? { su_zhiwei_passed: true } : {}),
          },
          logSummary: '自槐阴无灵古碑参悟【上古无灵纪】蔽天玄理，留作破局暗牌。',
        }),
        outcome: [
          '你细读碑上古篆。一切骤然明了。天幕阵眼只锁高阶灵息，独对无灵凡人盲而不见。若在渡劫或直面天门时拟出一刻死寂，便可撕开九霄窥视的裂口。',
          '记全玄理后你抹去沿途足迹悄然离谷，把这枚惊天暗牌深藏心底。',
        ],
        outcomeContinueLabel: '暗记蔽天玄理 · 悄然离村',
        bridgeNote: '你自无灵古碑参透蔽天盲区之理，对日后直面天门多了几分胜算。',
        next: 'act4_hub',
      },
    ],
  },

  // ==================== 卷四四个随机奇遇事件 ====================
  rand_act4_1: {
    id: 'rand_act4_1',
    act: 'act4',
    isRandomEvent: true,
    title: '赤岭残劫',
    subtitle: '九州游历 · 劫区所见',
    location: '中州赤岭 · 雷焦山脊',
    paragraphs: [
      '巡游至赤岭荒脊时，前方天际紫雷骤歇，焦土气息刺鼻。一名须发焦黑的老散修倒在碎裂的避雷阵中，金丹已崩出三道血裂，显是冲击元婴败于最后一道天雷。',
      '见你落剑走近，老修费力递来一枚尚温的青玉简。“苦熬三百载，还是低估了天雷里那缕冰冷杀意。”他喘息微弱，“把骨灰撒进北河。这卷渡劫手札，归道友了。”',
    ],
    choices: [
      {
        id: 'r4_1_bury',
        label: '应下临终所托，敛骨送其归河，细读那卷染血的渡劫手札',
        insightTags: ['心境大增', '正道善果', '渡劫经验'],
        effect: {
          mind: 10,
          righteous: 8,
          renown: 4,
          setFlags: { read_thunder_notes: true },
        },
        outcome: [
          '你依言替老修收拢遗骨，迎着晚风撒入滚滚北河。摊开那枚青玉简，里头一笔一划记尽了元婴天雷落下的节奏与引雷偏移之法，字字皆是以命换来的经验。',
          '收好玉简回头再看焦黑山脊，你对自己即将到来的碎丹雷劫多了三分把握。',
        ],
        outcomeContinueLabel: '收好手札 · 继续行程',
        bridgeNote: '厚葬赤岭渡劫失败的老散修，得其染血手札，对元婴天雷多了几分警醒。',
        next: '__RETURN__',
      },
      {
        id: 'r4_1_plunder',
        label: '趁其丹元尚未散尽，强摄残余金丹灵粹与乾坤袋',
        insightTags: ['200 灵石', '修为提升', '偏魔煞'],
        effect: {
          spiritStones: 200,
          might: 8,
          righteous: -12,
        },
        outcome: [
          '你神色未动，指尖凝出一道噬灵诀，将老修破损金丹中最后几缕精纯丹元尽数炼化入体，顺手摘下他腰间藏有二百块灵石的乾坤袋。',
          '末法乱世本就弱肉强食，活下来的人才配替死者叩开下一重关。',
        ],
        outcomeContinueLabel: '收袋离岭 · 折返别院',
        bridgeNote: '在赤岭吞下陨落散修的残余丹元与灵石，修为微增，心底更添几分冷峭。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act4_2: {
    id: 'rand_act4_2',
    act: 'act4',
    isRandomEvent: true,
    title: '断脉流民',
    subtitle: '九州游历 · 末法众生',
    location: '青东官道 · 废弃驿站',
    paragraphs: [
      '青州东境一条小型灵脉昨夜彻底枯死，几十名依附矿镇谋生的低阶散修拖家带口西迁，却在破驿外被一伙大宗矿卫拦住去路。领头的筑基管事冷笑着逼他们交出最后两箱【金脉灵砂】抵充「弃矿罚银」。',
      '人群里哭声压抑，却无人敢向大宗矿卫拔剑。你御风掠过官道，衣袂尚未落地，那名管事已察觉金丹灵压，脸色瞬间发白。',
    ],
    choices: [
      {
        id: 'r4_2_protect',
        label: '现身斥退矿卫，护送这批散修渡过荒坡',
        insightTags: ['正道威望', '心境与人望', '获赠灵砂'],
        effect: {
          righteous: 10,
          renown: 10,
          mind: 5,
          grantMarketGoods: [{ goodId: 'golden_vein_sand', qty: 1, unitCost: 0 }],
        },
        outcome: [
          '只一眼。金丹威压顺着视线坠落，管事与十余名矿卫丢下长戟抱头鼠窜，领头白发老散修颤巍巍捧出一袋上佳【金脉灵砂】硬塞进你袖里，说是全镇人凑齐的谢礼。',
          '一路目送车队平安踏上中州官道，听着身后此起彼伏的叩谢声，你胸口久违地暖了一分。',
        ],
        outcomeContinueLabel: '收好谢礼 · 返归别院',
        bridgeNote: '官道斥退欺民矿卫，获散修赠予一袋【金脉灵砂】，声名传遍青东。',
        next: '__RETURN__',
      },
      {
        id: 'r4_2_buy_low',
        label: '顺手替他们解围，花 180 灵石低价吃下全部两箱【金脉灵砂】',
        subtext: '以现银助流民脱困，趁低收下两份紧俏矿货。',
        requirement: { minSpiritStones: 180, lockReason: '需灵石 180' },
        insightTags: ['180 灵石低价囤货', '得金脉灵砂×2'],
        effect: {
          spiritStones: -180,
          worldly: 6,
          renown: 4,
          grantMarketGoods: [{ goodId: 'golden_vein_sand', qty: 2, unitCost: 90 }],
        },
        outcome: [
          '你挥袖吓退矿卫，又爽快点出一百八十块现成灵石买下他们沉重的矿箱：“带着重货走夜路只会再招劫匪，换成轻便灵石好安家。”散修们千恩万谢，你也以近乎半价收了两份紧俏灵砂。',
          '算盘与人情两头俱妥，你满意地收好矿箱继续前行。',
        ],
        outcomeContinueLabel: '携货离驿 · 返回别院',
        bridgeNote: '于青东驿站低价收入两份【金脉灵砂】，转手黑市必有厚利。',
        next: '__RETURN__',
      },
      {
        id: 'r4_2_ignore',
        label: '末法之下处处皆是争抢，不涉闲事，借乱象磨砺自身冷铁道心',
        insightTags: ['冷眼出世', '修为与心境大增'],
        effect: {
          worldly: -6,
          mind: 9,
          might: 6,
        },
        outcome: [
          '你敛去气息自云端一掠而过，反借脚下乱世的兵戈煞气反复推演金丹杀招。大劫将倾，救得了一支车队，救不了整座枯竭的九州。唯有尽快踏破元婴，才谈得上改写棋局。',
        ],
        outcomeContinueLabel: '穿云离去 · 归回居所',
        bridgeNote: '冷眼掠过青东流民纷争，你愈发坚定了先求自身破境的念头。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act4_3: {
    id: 'rand_act4_3',
    act: 'act4',
    isRandomEvent: true,
    title: '渡口暗杀',
    subtitle: '九州游历 · 商行死士',
    location: '沧江古渡 · 浓雾孤舟',
    paragraphs: [
      '浓雾锁江，渡舟行至江心时，船舱暗板骤然炸裂！三名身披灰袍、眉心贴着上界灰尘符箓的金丹死士同时扑出，剑阵封死前后水面，杀招直指你的丹田。',
      (s) =>
        s.flags.act4_chamber_collapsed
          ? '领头死士嗓音沙哑如砂石摩擦：“天机总坛虽毁，余部仍奉死令：凡坏抽灵大计者，金丹亦斩！”'
          : '领头死士嗓音沙哑如砂石摩擦：“天机总坛有令，凡坏抽灵大计者，金丹亦斩！”',
    ],
    choices: [
      {
        id: 'r4_3_fight',
        label: '正面催动金丹剑势破阵反杀，搜缴死士身上的暗花赏金',
        insightTags: ['修为大涨', '得 240 灵石', '威名远播'],
        effect: {
          might: 10,
          spiritStones: 240,
          renown: 8,
        },
        outcome: [
          '你反手祭出护体丹光硬震开第一波剑网，借江面水汽凝剑反扑。三名死士原是靠上界灰尘强催上来的伪金丹，交手不到五十合便露出根基虚浮的破绽，被你逐一斩落江心。',
          '从死士怀里摸出二百四十块上品灵石与半纸未燃尽的暗杀密令，你踩着碎舟踏浪登岸，衣襟只沾了几点寒雾。',
        ],
        outcomeContinueLabel: '踏浪登岸 · 返回别院',
        bridgeNote: '沧江渡口反杀三名天机死士，缴获二百余块灵石，更印证了伪丹之弊。',
        next: '__RETURN__',
      },
      {
        id: 'r4_3_outwit',
        label: '以灵识引爆船底禁制借雾脱身，顺手反向追踪他们的接应暗桩',
        insightTags: ['心境与情报', '灵石 150'],
        effect: {
          mind: 10,
          spiritStones: 150,
          renown: 5,
        },
        outcome: [
          '你不与死士硬拼消耗，指尖弹出一道火符炸沉孤舟，趁滚滚白雾绕至北岸，反倒摸进了他们留在荒庙里的接应暗桩，顺手卷走一百五十块备用灵石与沿江联络名册。',
          '等三名死士湿淋淋爬上岸时，荒庙早已人去楼空。',
        ],
        outcomeContinueLabel: '收好名册 · 悄然离渡',
        bridgeNote: '沧江浓雾中巧破死士合围，还反抄了一处天机暗桩。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act4_4: {
    id: 'rand_act4_4',
    act: 'act4',
    isRandomEvent: true,
    title: '古市残炉',
    subtitle: '九州游历 · 残镇奇珍',
    location: '西麓旧药镇 · 废丹铺',
    paragraphs: [
      '古药镇快废了。灵脉干涸，老丹铺贱卖最后一批压箱杂物，墙角那只裂了半边耳的蒙尘青铜丹炉却透出一缕不属于今世丹方的沉静松脂香。',
      '老掌柜叹气道，只需一百四十灵石便连炉带底灰一并打包卖走，权当盘缠回乡养老。',
    ],
    choices: [
      {
        id: 'r4_4_buy',
        label: '花一百四十灵石买下残炉，仔细剖开炉底凝结的古药层',
        requirement: { minSpiritStones: 140, lockReason: '需灵石 140' },
        insightTags: ['耗 140 灵石', '得【凝神琥珀】×1', '心境大涨'],
        effect: {
          spiritStones: -140,
          mind: 8,
          grantMarketGoods: [{ goodId: 'soul_amber', qty: 1, unitCost: 140 }],
        },
        outcome: [
          '老掌柜千恩万谢收下盘缠离去。你运起金丹灵火缓缓烘化炉底百年药垢，果真从夹层里剥出一块鸽蛋大小的【凝神琥珀】，里头封着一缕温润古息，单论市价便远超买价。',
          '残炉虽碎，这趟顺手捡漏倒是稳赚不赔。',
        ],
        outcomeContinueLabel: '收妥琥珀 · 离开古镇',
        bridgeNote: '在废弃药镇的残炉里剖出一枚【凝神琥珀】，暗喜眼力未钝。',
        next: '__RETURN__',
      },
      {
        id: 'r4_4_appraise',
        label: '凭采药或商道眼力替老掌柜点破暗宝，分取四成鉴宝佣金与残炉丹方',
        visible: (s) =>
          s.tags.includes('origin_herbalist') ||
          s.tags.includes('merchant_fame') ||
          s.tags.includes('merchant_manual'),
        insightTags: ['出身/商名专属', '零花费赚 260 灵石', '心境与正道声望'],
        effect: {
          spiritStones: 260,
          mind: 8,
          renown: 10,
          righteous: 6,
        },
        outcome: [
          '你只轻敲炉底三下，便教老掌柜取来铁凿剥出夹层里的暗金琥珀。行商客商闻讯当场竞价疯抢，老掌柜激动得热泪盈眶，硬按行规奉上二百六十块灵石鉴宝佣金，又将丹炉夹层附带的一页前朝养神丹方双手相赠。',
          '既成人之美又得厚酬与丹道见识，你笑着挥手别过古镇。',
        ],
        outcomeContinueLabel: '揣好谢银 · 返归别院',
        bridgeNote: '在废药镇替老掌柜点破残炉藏宝，赢得一声赞誉与二百余块谢银。',
        next: '__RETURN__',
      },
      {
        id: 'r4_4_leave',
        label: '旧市赝品居多，不多耗灵石，转身离开',
        insightTags: ['稳妥省钱', '心境微升'],
        effect: { mind: 3 },
        outcome: [
          '如今大战在即，每一块灵石都要留在刀刃上。你拍去袖间药灰，径直御剑返程。',
        ],
        outcomeContinueLabel: '折返别院',
        bridgeNote: '逛过西麓废弃药镇，越发体会到末法将临时的世道萧索。',
        next: '__RETURN__',
      },
    ],
  },

  // ==================== 卷四高潮：碎丹成婴 + 天雷初劫 ====================
  act4_nascent_gate: {
    id: 'act4_nascent_gate',
    act: 'act4',
    title: '碎丹成婴',
    subtitle: '卷四高潮 · 天雷初劫',
    location: '绝巅雷台 · 九霄劫云下',
    checkpoint: true,
    checkpointLabel: '卷四高潮 · 碎丹成婴渡雷劫',
    paragraphs: [
      '{{year}}，今岁{{age}}岁的{{name}}独坐绝巅青石台。丹田之内，那粒温养多年的金丹嗡鸣震颤，表面已浮出第一道细密金纹，炽热元气几欲破壳而出。',
      (s) =>
        s.truthClues.length >= 3
          ? '头顶六十里铁云倒卷成涡，紫白雷蛇在云隙间翻滚嘶鸣。这是下界修士踏入元婴老祖之境必经的「天雷初劫」。只是如今的你已不再懵懂，望进那重冰冷劫云深处，隐约能感到一道高悬九霄的淡漠目光正审视着下界又一株即将成熟的「大药」。'
          : '头顶六十里铁云倒卷成涡，紫白雷蛇在云隙间翻滚嘶鸣。这是下界修士踏入元婴老祖之境必经的「天雷初劫」。望进那重冰冷劫云深处，你莫名生出一阵寒意，仿佛高悬九霄的某道淡漠目光正俯视着绝巅。',
      {
        when: (s) => Boolean(s.flags.read_thunder_notes),
        text: '临雷之前，当年在赤岭厚葬老散修换来的染血手札在识海里逐字浮现。紫雷落下的间隔与引雷偏移关窍历历在目，替你稳下了三分心神。',
      },
      (s) =>
        s.truthClues.length >= 3
          ? '碎丹成功，法身初成，寿元立跃千载，方有资格直面将临的收割大期。稍有差池，便是丹碎魂销，化作绝巅一捧劫灰。'
          : '碎丹成功，法身初成，寿元立跃千载，方能抗住倾覆九州的末法大劫。稍有差池，便是丹碎魂销，化作绝巅一捧劫灰。',
      (s) => {
        const dh = s.flags.dao_heart;
        if (dh === 'seek_truth') return '雷音压顶，你却只想着看清云层背后究竟藏着什么。';
        if (dh === 'seek_longevity') return '雷音压顶，千载寿元就在眼前，绝不许半途折翼。';
        if (dh === 'seek_fortune') return '雷音压顶，只有跨过这一关，才配把九州账本彻底攥进手里。';
        if (dh === 'protect_one') return '雷音压顶，唯有站得更高，才能护住山脚下那点人间灯火。';
        return null;
      },
      '你收摄万念，决意以何种依仗劈开这道雷劫？',
    ],
    choices: [
      // 途径一：消耗太阴育婴莲
      {
        id: 'nascent_lotus_path',
        label: '吞服【太阴育婴莲】，以九瓣霜莲护佑元婴初成、化解大半雷火',
        visible: (s) => s.relics.includes('nascent_lotus'),
        subtext: '最稳妥澄明的结婴正途，护持神魂无损、底蕴浑厚。',
        insightTags: ['消耗【太阴育婴莲】', '稳渡天雷初劫', '踏入【元婴期】'],
        effect: (s) => {
          const retreatMonths = monthsToAct5Harvest(s, 66);
          return {
            timeMonths: retreatMonths,
            removeRelics: ['nascent_lotus'],
            might: 24,
            mind: 20,
            renown: 18,
            setRealm: 'nascent_soul',
            setAct: 'act5',
            addTags: ['nascent_soul_dao'],
            setFlags: { nascent_method: 'lotus', nascent_retreat_months: retreatMonths },
            logSummary: '服下【太阴育婴莲】碎丹迎劫，清光护魂安渡天雷初劫，终成【元婴期】老祖！',
          };
        },
        outcome: [
          '九瓣霜莲入口化作一汪太阴灵泉，裹住欲裂的金丹。九道紫雷接连轰落，石台寸寸焦黑，你丹田内却静如寒潭。最后一声脆响。金丹破壳，化作一尊眉目与你无二的元婴，睁眼吐出一口白气。',
          (s) =>
            `${formatNascentSpan(s)}静养稳固法身。再睁眼时，百里山河草木尽在神识一念之间。你已成寿逾千载的元婴老祖，高天那场大期也近在咫尺。`,
        ],
        outcomeContinueLabel: '元婴出关 · 启卷五《见天地》',
        next: 'act5_opening',
      },

      // 途径二：羁绊伴侣结阵护法
      {
        id: 'nascent_companion_guard',
        label: (s) => {
          const guards = getNascentGuardians(s);
          if (guards.length === 0) return '请生死知己结阵护法，共渡天雷初劫';
          const names = guards.map(getGuardianDisplayName).join('、');
          return guards.length > 1
            ? `请${names}联手在雷圈外结阵护法，为你分担九霄雷威`
            : `请${names}在雷圈外结阵护法，为你分担九霄雷威`;
        },
        visible: (s) => getNascentGuardians(s).length > 0,
        subtext: '患难同舟，有人守在雷阵之外替你压住余雷，心神稳如磐石。',
        insightTags: ['伴侣护道', '深厚羁绊', '踏入【元婴期】'],
        effect: (s) => {
          const guards = getNascentGuardians(s);
          const companionUpdates: Record<
            string,
            {
              markSeen: boolean;
              affectionDelta: number;
              chronicle: string;
              chronicleAtStartYear: boolean;
            }
          > = {};
          if (guards.includes('cang_ming')) {
            companionUpdates.cang_ming = {
              markSeen: true,
              affectionDelta: 12,
              chronicleAtStartYear: true,
              chronicle:
                guards.length > 1
                  ? '渡碎丹雷劫之夜，重获真身的他持剑镇守雷圈北口，与同道合势劈散偏雷，护你安然入关稳固元婴。'
                  : '渡碎丹雷劫之夜，重获真身的他持剑独守雷圈外围，硬斩三道偏雷，护你安然入关稳固元婴。',
            };
          }
          if (guards.includes('shen_qingshuang')) {
            companionUpdates.shen_qingshuang = {
              markSeen: true,
              affectionDelta: 12,
              chronicleAtStartYear: true,
              chronicle:
                guards.length > 1
                  ? '渡碎丹雷劫之夜，她持霜剑守住西南阵眼，与诸同道齐力劈散外溢雷火，护你安然入关稳固元婴。'
                  : '渡碎丹雷劫之夜，她一身白衣仗剑立于阵外，以无垢霜剑劈散外溢雷火，护你安然入关稳固元婴。',
            };
          }
          if (guards.includes('xie_wujiu')) {
            companionUpdates.xie_wujiu = {
              markSeen: true,
              affectionDelta: 12,
              chronicleAtStartYear: true,
              chronicle:
                guards.length > 1
                  ? '渡碎丹雷劫之夜，他祭出数十面避雷玄盾封死外围阵角，与同道联手挡下四方窥伺，护你安然入关稳固元婴。'
                  : '渡碎丹雷劫之夜，他散尽数十面珍藏避雷玄盾亲镇阵角，挡下四方窥伺与余雷，护你安然入关稳固元婴。',
            };
          }
          const retreatMonths = monthsToAct5Harvest(s, 60);
          return {
            timeMonths: retreatMonths,
            might: 22,
            mind: 22,
            renown: 20,
            setRealm: 'nascent_soul',
            setAct: 'act5',
            addTags: ['nascent_soul_dao'],
            setFlags: {
              nascent_method: 'companion_guard',
              nascent_guardian: guards[0] ?? 'ally',
              nascent_guardians_csv: guards.join(','),
              nascent_retreat_months: retreatMonths,
            },
            companionUpdates,
            logSummary: '得至交故人结阵护法渡过天雷初劫，闭死关稳固元婴出关，正式踏入【元婴期】！',
          };
        },
        outcome: [
          (s) => {
            const csv = String(s.flags.nascent_guardians_csv ?? '');
            const guards = csv ? (csv.split(',') as NascentGuardianId[]) : [];
            if (guards.length >= 2) {
              const beats: string[] = [];
              if (guards.includes('cang_ming')) {
                beats.push('苍溟玄青古袍仗剑劈开当头落下的三道偏雷，冷笑喝斥高天劫云');
              }
              if (guards.includes('shen_qingshuang')) {
                beats.push('沈清霜白衣镇守西南阵眼，寒霜剑光寸步不让斩碎四散电弧');
              }
              if (guards.includes('xie_wujiu')) {
                beats.push('谢无咎祭出三十六面避雷玄盾封死绝壁退路，顺手将暗中窥伺的宵小震下悬崖');
              }
              return `雷云压顶刹那，绝巅外缘数道气机同时冲霄而起。${beats.join('。')}。向来各怀锋芒的几人竟在这一夜背脊相照，替你硬生生撑出一片风雨不透的渡劫净地！`;
            }
            const guard = s.flags.nascent_guardian;
            if (guard === 'cang_ming') {
              return '雷云压顶刹那，玄青古袍与长剑冲天而起！苍溟立在雷圈边缘朗声大笑，三千年前的碎天剑意横扫长空，硬生生替你劈散三道最阴毒的偏雷：“专心碎丹！上头那帮老东西的破雷，本座替你挡着！”';
            }
            if (guard === 'shen_qingshuang') {
              return '白衣胜雪，沈清霜持剑静立雷台西南阵眼。每当劫雷余波掀向你灵台，一道清冽霜光便后发先至将其斩碎。她肩头衣袖已被电弧灼焦，眼神却始终落在你身上，半寸未移。';
            }
            return '谢无咎摇扇立在崖外。抬手洒出三十六面避雷金盾锁死四方地脉，反袖又将两名偷袭魔修震落绝壁。“放心破境。外头这些苍蝇和雷弧，我都替你记账上了！”';
          },
          (s) =>
            `有这股毫无保留的托付压阵，你心境空前澄澈，金丹轰然裂壳，元婴法身踏着初散的霞光应运而生！${formatNascentSpan(s)}静修稳固之后，你携寿元千载之威重返九州棋局。`,
        ],
        outcomeContinueLabel: '携手下山 · 启卷五《见天地》',
        next: 'act5_opening',
      },

      // 途径三：重金与灵脉大阵泄雷
      {
        id: 'nascent_wealth_array',
        label: (s) =>
          s.relics.includes('spirit_vein_deed')
            ? '凭【九州灵脉契】调动地气并耗费三百五十灵石布设避雷大阵，以财力硬泄天雷'
            : '豪掷五百灵石买断九宫避雷阵盘，以雄厚家资铺平结婴之路',
        visible: (s) =>
          s.spiritStones >= 500 ||
          (s.relics.includes('spirit_vein_deed') && s.spiritStones >= 350),
        subtext: '一掷千金泄雷导地，稳健踏入元婴之境。',
        insightTags: ['消耗巨额灵石', '阵法泄雷', '踏入【元婴期】'],
        effect: (s) => {
          const hasDeed = s.relics.includes('spirit_vein_deed');
          const retreatMonths = monthsToAct5Harvest(s, 72);
          return {
            timeMonths: retreatMonths,
            spiritStones: hasDeed ? -350 : -500,
            might: 20,
            mind: 16,
            renown: 18,
            setRealm: 'nascent_soul',
            setAct: 'act5',
            addTags: ['nascent_soul_dao'],
            setFlags: { nascent_method: 'wealth_array', nascent_retreat_months: retreatMonths },
            logSummary: '以重金与避雷大阵硬泄九霄天雷，顺利碎丹成婴，踏入【元婴期】！',
          };
        },
        outcome: [
          '数百块上品灵石嵌入九宫铜柱，在绝巅撑起一座金碧辉煌的泄雷巨阵。狂暴紫雷接连劈下，十之七八竟被阵盘引入地下焦岩消解殆尽，只余最精纯的一缕雷元替你淬炼丹壳。',
          (s) =>
            `${formatNascentSpan(s)}闭关稳境过后，满山铜柱化作废铁，你却已步入寿元千载的【元婴期】。放眼九州，能靠财力与阵道如此从容渡劫者寥寥无几。`,
        ],
        outcomeContinueLabel: '散阵起身 · 启卷五《见天地》',
        next: 'act5_opening',
      },

      // 途径四：魔煞吞雷（魔道倾向或身负吞煞魔尊命格可见）
      {
        id: 'nascent_blood_demon',
        label: '引胸中滔天魔煞逆吞九霄天雷，以煞炼婴、搏魔道大成',
        visible: (s) =>
          s.alignment.righteous <= -15 || s.tags.includes('demonic_sovereign'),
        subtext: (s) =>
          `【极险】以魔煞生吞九霄紫雷，若心境不足 145（当前 ${s.mind}），必遭雷火与魔念反噬陨落。`,
        insightTags: (s) => [
          '魔道专属',
          `需心境≥145（当前 ${s.mind}）`,
          '高风险陨落',
        ],
        effect: (s): ChoiceEffect => {
          if (s.mind < 145) {
            return {
              timeMonths: 0,
              righteous: -18,
              setFlags: { nascent_method: 'blood_demon_fail' },
              logSummary: '碎丹渡劫时引魔煞强吞天雷，心境难御反噬，终遭雷火与心魔吞没。',
            };
          }
          const retreatMonths = monthsToAct5Harvest(s, 66);
          return {
            timeMonths: retreatMonths,
            might: 30,
            renown: 16,
            righteous: -18,
            setRealm: 'nascent_soul',
            setAct: 'act5',
            addTags: ['nascent_soul_dao', 'demonic_sovereign'],
            setFlags: { nascent_method: 'blood_demon', nascent_retreat_months: retreatMonths },
            logSummary: '以魔煞硬吞天雷初劫，死守灵台清明不灭，终成威震九州的吞煞元婴！',
          };
        },
        outcome: [
          (s) =>
            s.flags.nascent_method === 'blood_demon_fail'
              ? '你张口吞下第一道赤紫劫雷，滚烫雷火瞬间引爆体内积郁多年的煞气！识海深处泛起无数猩红裂纹，你的心境防线在尖啸声中轰然溃散，神智被无尽血煞与天雷残火寸寸焚成飞灰。'
              : '猩红魔雾迎着九霄紫雷扶摇直上！你非但不避，反倒放开经脉将整道天雷生吞入腹，借狂暴雷火把一身煞气淬炼到极致。识海濒临崩毁的刹那，你咬牙以坚不可摧的心境硬锁清明，逼出一尊缠绕紫黑雷纹的凌厉魔婴！',
          (s) =>
            s.flags.nascent_method === 'blood_demon_fail'
              ? '绝巅雷声止歇时，青石台上只余一缕不散的焦黑灰尘随风飘散。'
              : `${formatNascentSpan(s)}静修稳固之后你破关而出，一举踏入【元婴期】，魔威覆压三百里，连云海之上的冷漠窥视都似被你这一身凶悍煞气惊得微颤。`,
        ],
        outcomeContinueLabel: (s) =>
          s.flags.nascent_method === 'blood_demon_fail'
            ? '坠入血煞劫灰 · 展卷终局'
            : '携吞煞魔婴 · 启卷五《见天地》',
        next: (s) =>
          s.flags.nascent_method === 'blood_demon_fail'
            ? 'ending_blood_demon'
            : 'act5_opening',
      },

      // 途径五：无宝硬冲兜底（始终解锁）
      {
        id: 'nascent_bare_force',
        label: '不假丹宝阵势，独身碎丹硬扛天雷初劫，全凭自身底蕴争一条生路',
        subtext: (s) => {
          const req = s.flags.read_thunder_notes ? 325 : 340;
          return `零消耗硬冲：修为与心境满 500 稳渡，${req} 至 499 须带伤强渡，低于 ${req} 则碎丹身陨（当前 ${s.might + s.mind}）。`;
        },
        insightTags: (s) => {
          const req = s.flags.read_thunder_notes ? 325 : 340;
          return [
            '零消耗硬冲',
            `稳渡≥500 / ${req}~499重伤强渡（当前${s.might + s.mind}）`,
            ...(s.flags.read_thunder_notes ? ['赤岭手札助劫'] : ['高风险兜底']),
          ];
        },
        effect: (s): ChoiceEffect => {
          const req = s.flags.read_thunder_notes ? 325 : 340;
          const total = s.might + s.mind;
          if (total < req) {
            return {
              timeMonths: 0,
              setFlags: { nascent_method: 'bare_force_fail', nascent_bare_injured: false },
              logSummary: '无宝无阵强行碎丹迎劫，底蕴终差一筹，折戟于绝巅九霄天雷之下。',
            };
          }
          const strong = total >= 500;
          const retreatMonths = monthsToAct5Harvest(s, 96);
          return {
            timeMonths: retreatMonths,
            might: strong ? 18 : -6,
            mind: strong ? 14 : 4,
            renown: strong ? 20 : 12,
            setRealm: 'nascent_soul',
            setAct: 'act5',
            addTags: ['nascent_soul_dao'],
            setFlags: {
              nascent_method: strong ? 'bare_force' : 'bare_force_injured',
              nascent_bare_injured: !strong,
              nascent_retreat_months: retreatMonths,
            },
            logSummary: strong
              ? '不假外物独身碎丹硬扛天雷初劫，苦熬静修终凝纯粹无瑕的元婴法身！'
              : '无宝无阵硬扛元婴雷劫虽受雷火重创、折损修为，仍咬牙碎丹证就【元婴期】。',
          };
        },
        outcome: [
          (s) =>
            s.flags.nascent_method === 'bare_force_fail'
              ? '无丹护脉，无阵泄雷，你只凭肉身与金丹硬接第一重紫雷，经脉便寸寸焦裂。第三道劫雷轰落时，元婴雏形在丹田发出一声悲鸣，彻底溃散。终究差了半筹底蕴。'
              : s.flags.nascent_bare_injured
              ? '无宝无阵。九道紫雷当头劈落，烧焦你一身{{robe}}、震裂全身经脉，你呕血死撑灵台，生生捏碎金丹旧壳逼出元婴！伤了根本。命总算抢回来了。'
              : '无宝无阵，唯有一口不屈道心与数十年磨出的浑厚底蕴！九道劫雷将你{{robe}}劈成焦炭，你却在剧痛与雷火里亲手捏碎金丹旧壳，于死境中催生出最纯粹凝练的元婴法身。',
          (s) =>
            s.flags.nascent_method === 'bare_force_fail'
              ? '雷云散去，绝巅青石台上空余半截断剑，见证着又一名逆天修士折戟半途。'
              : `${formatNascentSpan(s)}静坐修复肉身、打磨法身。出关之日你已是寿元千载的【元婴期】老祖，大劫将至的九州正等你落子。`,
        ],
        outcomeContinueLabel: (s) =>
          s.flags.nascent_method === 'bare_force_fail'
            ? '道途折戟 · 展卷终局'
            : '浴雷成婴 · 启卷五《见天地》',
        next: (s) =>
          s.flags.nascent_method === 'bare_force_fail'
            ? 'ending_fallen_path'
            : 'act5_opening',
      },
      {
        id: 'nascent_slow_grind',
        label: '暂不引雷，在绝巅洞窟枯坐六十载，拿金丹寿元硬磨底蕴',
        subtext: '零灵石枯坐一甲子换取修为与心境各十点。若寿元耗尽仍未成婴，便会坐化老死。',
        insightTags: ['耗寿六十载', '零花费换底蕴', '慎防寿尽大限'],
        effect: {
          timeMonths: 720,
          might: 10,
          mind: 10,
          logSummary: '于绝巅石窟枯坐一甲子水磨金丹，拿六十年寿元换来几分冲婴底气。',
        },
        outcome: [
          '雷云聚了又散，山风吹老六十载春秋。你在冰冷石窟里反复打磨丹壳，把每一丝杂念压进沉寂岁月。',
          (s) =>
            `出窟时松柏已换新茬。丹元厚了半分，距${toChineseYearNumber(s.lifespanYears)}载大限又逼近了一大截。`,
        ],
        outcomeContinueLabel: '收功下台 · 返归别院',
        bridgeNote: '绝巅枯坐一甲子归来，丹元稍厚，寿元却已折去六十年。',
        next: 'act4_hub',
      },
      {
        id: 'nascent_back',
        label: '暂缓成婴，退回别院再作筹备',
        next: 'act4_hub',
      },
    ],
  },
};

export const ACT4_RANDOM_EVENTS: RandomEventDefinition[] = [
  {
    sceneId: 'rand_act4_1',
    act: 'act4',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act4_2',
    act: 'act4',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act4_3',
    act: 'act4',
    weight: (s) => (s.tags.includes('tianji_nemesis') ? 16 : 9),
    once: true,
    when: (s) =>
      !s.flags.act4_war_truce &&
      (s.tags.includes('tianji_nemesis') ||
        Boolean(s.flags.tianji_chamber_hostile) ||
        Boolean(s.flags.blood_pill_exposed) ||
        Boolean(s.flags.act4_chamber_collapsed)),
  },
  {
    sceneId: 'rand_act4_4',
    act: 'act4',
    weight: 10,
    once: true,
  },
];
