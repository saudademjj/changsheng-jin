import { ChoiceEffect, GameState, SceneDefinition } from '../engine/types';
import { getAgeYears, toChineseYearNumber, yearsSinceAgeMonths } from '../engine/time';
import { isSuZhiweiAlive } from './companions';
import {
  canCommitMajorArc,
  evaluateCoercion,
  getRemainingMajorArcSlots,
  isMajorArcMissed,
} from '../engine/systems';

function nextQiRealm(state: GameState) {
  if (state.realm === 'qi_early') return 'qi_mid' as const;
  if (state.realm === 'qi_mid') return 'qi_late' as const;
  if (state.realm === 'qi_late') return 'qi_peak' as const;
  return state.realm;
}

const ACT2_THREAD_IDS = [
  'thread_sword_trial',
  'thread_blood_pill',
  'thread_qingzhou_plague',
  'thread_ancient_vein',
] as const;

function countActiveAct2Threads(state: GameState): number {
  return ACT2_THREAD_IDS.filter((id) => state.activeThreads.includes(id)).length;
}

export const ACT2_SCENES: Record<string, SceneDefinition> = {
  // ==================== 三大卷二开篇（由卷一终章动态路由） ====================
  act2_opening_qingyun: {
    id: 'act2_opening_qingyun',
    act: 'act2',
    title: '青云外山',
    subtitle: '卷二 · 问途（试剑大势启）',
    location: '青云剑宗 · 外门石阶',
    checkpoint: true,
    checkpointLabel: '卷二初启 · 拜入青云外门',
    paragraphs: [
      '三千六百级青石阶穿云而上，山风卷着松涛与若有似无的剑鸣。{{year}}，身着素青道袍的{{name}}领了外门青铜剑令，成为青云剑宗最年轻的一批炼气弟子。',
      '可山门之内远不如凡尘传说那般清净。刚安顿下来，你便听见{{dormMate}}压低声音议论，说距外门试剑大典不过两载，后山却已有三名即将冲击筑基的精英弟子无故失踪，宗门执事对外一律称其“下山历练陨落”。',
      {
        when: (s) => s.companions.shen_qingshuang.met,
        text: '傍晚你在剑坪炼气时，一道熟悉白影自竹林间掠过。沈清霜驻足片刻，淡淡抛给你一瓶静心露：“既入了青云，便莫只埋头苦修。近期若夜里听见后山禁地钟响，切勿独自靠近。”',
      },
      {
        when: (s) => !s.companions.shen_qingshuang.met,
        text: '寒风压台。高耸试剑台上一名白衣女修独剑自试，剑过处霜气久聚不散，台下众弟子交口称道那是内门首座沈清霜，也是宗内唯一敢暗查同门失踪案的人。',
      },
    ],
    choices: [
      {
        id: 'act2_qy_enter_hub',
        label: '记住山中暗流，先理清眼下可行的几条线索与生计',
        insightTags: ['进入问途云海', '修为微升'],
        effect: {
          might: 5,
          mind: 4,
        },
        bridgeNote: '你在青云外山听松居安顿下来，山门失踪案与山下血丹风波正双双发酵。',
        next: 'act2_hub',
      },
    ],
  },

  act2_opening_darkmarket: {
    id: 'act2_opening_darkmarket',
    act: 'act2',
    title: '灯火暗市',
    subtitle: '卷二 · 问途（血丹大势启）',
    location: '青岚城西 · 地下暗市',
    checkpoint: true,
    checkpointLabel: '卷二初启 · 扎根青岚暗市',
    paragraphs: [
      '白日的青岚城属于仙门规矩，入夜后的城西地下长街才属于灵石与野心。{{year}}，已成炼气修士的{{name}}不再是当年寄人篱下的凡人，推开百宝斋后院那扇沉重的乌木门时，伙计已懂得拱手唤一声“{{honorific}}”。',
      '可暗市眼下正处于风暴眼。一批号称“三成价钱、七成筑基”的血煞丹在散修间疯传，惹得仙盟执法队连夜封锁了半条灵药街。另一边，青州方向也不断有流民涌入，称城外起了连修士都会染上的怪疫。',
      {
        when: (s) => s.companions.xie_wujiu.met,
        text: '二楼雅间里，谢无咎替你斟了盏热茶，眼底藏着冷光：“来得正好。青岚这潭浑水马上要烧开了，跟我联手做一笔大局，还是借机查清那批血丹到底是谁在背后供货？”',
      },
      {
        when: (s) => !s.companions.xie_wujiu.met,
        text: '屏风后转出一名摇着玄铁折扇的玄衣青年，含笑打量你：“在下百宝斋谢无咎。听闻{{honorific}}在青岚颇有胆识，眼下血丹风波将起，不知可愿入雅间共谋几笔大买卖？”',
      },
    ],
    choices: [
      {
        id: 'act2_dm_enter_hub',
        label: '与谢无咎交换消息，开始在暗市风云中谋篇布局',
        insightTags: ['进入问途云海', '谢无咎结缘', '坊市风声'],
        effect: {
          renown: 6,
          setFlags: { xie_market_tip: true },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              affectionDelta: 8,
              chronicle: '炼气初成时邀你入百宝斋雅间，共议青岚血丹与坊市变局。',
            },
          },
        },
        outcome: [
          '雅间茶烟袅袅，你与谢无咎各自摊开手里的风声。血丹暴利与仙盟封查，再加上青州传来的怪疫，三桩事明面上各不相干，细算之下却全指向青岚坊市即将倾覆的平衡。',
          '“消息我已经给你铺好了，接下来先动哪颗棋子，全凭{{honorific}}定夺。”谢无咎合扇含笑，命人替你在百宝别院备下一间静室作为落脚点。',
        ],
        outcomeContinueLabel: '步入百宝别院 · 统筹暗流',
        bridgeNote: '自百宝斋雅间议定风向后，暗市血丹与青州疫局两条暗线同时摆在你案前。',
        next: 'act2_hub',
      },
    ],
  },

  act2_opening_wanderer: {
    id: 'act2_opening_wanderer',
    act: 'act2',
    title: '南下青州',
    subtitle: '卷二 · 问途（古脉疫局启）',
    location: '青州官道 · 暮色长亭',
    checkpoint: true,
    checkpointLabel: '卷二初启 · 散修南下青州',
    paragraphs: [
      '{{year}}，炼气初成的{{name}}背着一口粗铁剑踏入青州地界。',
      '甫一靠近青州城，风中的气息便叫你心头一紧。这片土地的灵气干涸得极不寻常，连草木都透着灰败。城外搭起了十余座避疫草棚，病倒的全是略具灵窍的游方散修与富户子弟，反倒是泥腿子凡人个个安好。',
      '更诡异的是，每逢子夜，青州北麓地底深处便会传出如巨兽吸气般的闷响，仿佛有什么东西正在大地之下疯狂吞噬残存的灵脉。',
    ],
    choices: [
      {
        id: 'act2_wd_enter_hub',
        label: '在青州落脚安顿，逐一探查怪疫与地底古脉的真相',
        insightTags: ['进入问途云海', '心境微升'],
        effect: {
          mind: 6,
        },
        bridgeNote: '你在青州城外租下客舍，城外杏林的药烟与北麓夜半的地鸣，都在催着你给出答案。',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 卷二动态并发枢纽（核心玩法舞台） ====================
  act2_hub: {
    id: 'act2_hub',
    act: 'act2',
    title: '问途云海',
    subtitle: (s) =>
      s.actBeat >= 4
        ? '卷二 · 气海将满，风云汇聚'
        : '卷二 · 暗流并发，择机而行',
    location: (s) =>
      s.flags.act2_primary_route === 'qingyun'
        ? '青云山麓 · 听松居'
        : s.flags.act2_primary_route === 'darkmarket'
        ? '青岚暗市 · 百宝别院'
        : '青州城外 · 客舍青灯',
    isHub: true,
    paragraphs: [
      {
        when: (s) => Boolean(s.lastBridgeNote),
        text: (s) => s.lastBridgeNote ?? '',
      },
      (s) =>
        `光阴似水，转眼已是{{year}}，你今岁已{{age}}岁，修为已至【${
          s.realm === 'qi_peak'
            ? '炼气圆满'
            : s.realm === 'qi_late'
            ? '炼气后期'
            : s.realm === 'qi_mid'
            ? '炼气中期'
            : '炼气初期'
        }】。青岚界域的风浪正围绕着你做过的选择悄然合拢。`,
      (s) => {
        const lines: string[] = [];
        const remSlots = getRemainingMajorArcSlots(s, 'act2');
        if (remSlots > 0) {
          lines.push(
            `【天时筹度】青岚界域四方暗流齐涌，你分身乏术，眼下至多尚可亲身介入${remSlots === 1 ? '一' : '两'}处大势；未及插手之地，世局将随光阴自行演进。`
          );
        } else {
          const missed: string[] = [];
          if (isMajorArcMissed(s, 'act2', 'thread_sword_trial')) {
            missed.push('青云山门已悄然封山，坊间传闻沈清霜独查禁地触怒长老遭罚软禁');
          }
          if (isMajorArcMissed(s, 'act2', 'thread_blood_pill')) {
            missed.push('青岚暗市血丹肆虐无人遏制，天机商行趁势攥紧了丹药货源');
          }
          if (isMajorArcMissed(s, 'act2', 'thread_qingzhou_plague')) {
            missed.push(
              isSuZhiweiAlive(s)
                ? '青州疫火连绵未绝，听闻城外杏林医女独撑数月已积劳成疾'
                : '青州城外杏林旧疫早已熄作陈年旧闻，唯老杏树下留下一座素碑与尘封医案'
            );
          }
          if (isMajorArcMissed(s, 'act2', 'thread_ancient_vein')) {
            missed.push('青州北麓枯脉悄然塌陷，地底那道异响已被山岩彻底埋死');
          }
          if (missed.length > 0) {
            lines.push(`【分身乏术 · 世局余波】${missed.join('；')}。`);
          }
        }
        if (s.activeThreads.includes('thread_sword_trial')) {
          const shenHostile =
            Boolean(s.flags.shen_rival_tension) ||
            s.companions.shen_qingshuang.stance === 'rival' ||
            s.companions.shen_qingshuang.stance === 'estranged';
          const missingLabel = s.tags.includes('qingyun_outer') ? '失踪同门' : '失踪青云弟子';
          lines.push(
            s.flags.sword_arc_step1
              ? shenHostile
                ? `【青云试剑案】${missingLabel}的线索直指后山禁地飞升古碑，寒松林既已不欢而散，月晦之夜你便只凭自己摸上禁地。`
                : `【青云试剑案】你已摸清${missingLabel}的线索指向后山禁地，沈清霜正暗中约你一探飞升古碑。`
              : '【青云试剑案】外门试剑大典渐近，几名待筑基弟子的离奇失踪令山中人心浮动。'
          );
        }
        if (s.activeThreads.includes('thread_blood_pill')) {
          lines.push(
            s.flags.blood_arc_step1
              ? '【青岚血丹局】血丹工坊的幕后黑手与百宝斋密账已现端倪，仙盟与暗市的最终碰撞一触即发。'
              : s.companions.xie_wujiu.met
              ? '【青岚血丹局】暗市血丹肆虐，坊市丹药行市紊乱，谢无咎正等着看你站向哪一边。'
              : '【青岚血丹局】暗市血丹肆虐，坊市丹药行市紊乱，传闻百宝斋地下秘库正压着这桩黑幕的底账。'
          );
        }
        if (s.activeThreads.includes('thread_qingzhou_plague')) {
          lines.push(
            s.flags.plague_arc_step1
              ? isSuZhiweiAlive(s)
                ? '【青州怪疫】疫势已逼近杏林医馆，苏知微独撑危局、油尽灯枯，急需灵药或断然决断。'
                : '【青州怪疫】城外杏林医馆疫火早已成尘，遗留素碑脉案正待了结。'
              : isSuZhiweiAlive(s)
              ? '【青州怪疫】城外怪疫愈演愈烈，唯独凡人安然无恙的异象透着说不出的寒意。'
              : '【青州怪疫】数十载光阴匆匆而过，当年青州怪疫旧案仍封存于城外杏林素碑之下。'
          );
        }
        if (s.activeThreads.includes('thread_ancient_vein')) {
          lines.push(
            s.flags.vein_arc_step1
              ? s.relics.includes('charred_jade_relic') && s.companions.cang_ming.met
                ? '【青州古脉】地底逆抽灵脉的残阵已露冰山一角，断玉与古阵的共鸣直指三千年前长明元年之夜。'
                : '【青州古脉】地底逆抽灵脉的残阵已露冰山一角，岩壁深处残留的太古剑息直指长明元年旧事。'
              : '【青州古脉】北麓地底夜夜闷响，残存灵脉正以肉眼可见的速度崩塌枯竭。'
          );
        }
        return lines.length > 0
          ? lines
          : '青岚几桩大风波暂告段落，你的气海鼓荡不息，筑基大关已然迫在眉睫。';
      },
      (s) => `【坊市风声】${s.market.rumorText}`,
    ],
    choices: [
      {
        id: 'hub_sword_1',
        category: 'story',
        label: (s) =>
          s.tags.includes('qingyun_outer')
            ? '赴青云山试剑台，探查同门失踪与沈清霜的隐秘调查'
            : '赴青云山试剑台，探查青云弟子失踪与沈清霜的隐秘调查',
        subtext: (s) =>
          s.tags.includes('qingyun_outer')
            ? '外门试剑大典将近，松林剑坪下藏着失踪同门的端倪（占本卷 1 处大势席位）。'
            : '外门试剑大典将近，松林剑坪下藏着失踪弟子的端倪（占本卷 1 处大势席位）。',
        visible: (s) =>
          s.activeThreads.includes('thread_sword_trial') &&
          !s.flags.sword_arc_step1 &&
          canCommitMajorArc(s, 'act2', 'thread_sword_trial'),
        insightTags: ['青云秘辛', '故人同行', '占一席天时大势'],
        effect: {
          timeMonths: 8,
          beatDelta: 1,
          commitMajorArc: { act: 'act2', threadId: 'thread_sword_trial' },
        },
        next: 'act2_arc_sword_1',
      },
      {
        id: 'hub_sword_2',
        category: 'story',
        label: (s) =>
          s.flags.shen_rival_tension ||
          s.companions.shen_qingshuang.stance === 'rival' ||
          s.companions.shen_qingshuang.stance === 'estranged'
            ? '月晦夜独自摸上青云后山飞升碑，强探三千年断代之谜'
            : '夜探青云后山飞升碑，与沈清霜共揭三千年断代之谜',
        subtext: '月晦无光，正是潜入青云后山禁地查验古碑背面的良机。',
        visible: (s) =>
          s.activeThreads.includes('thread_sword_trial') && Boolean(s.flags.sword_arc_step1),
        insightTags: ['飞升古碑', '天机残卷', '关键抉择'],
        effect: { timeMonths: 10, beatDelta: 1 },
        next: 'act2_arc_sword_2',
      },
      {
        id: 'hub_blood_1',
        category: 'story',
        label: (s) =>
          s.companions.xie_wujiu.met
            ? '深入青岚地下暗坊，追查血煞丹货源与谢无咎的底牌'
            : '循暗市风声潜入百宝斋秘库，追查血煞丹幕后货源',
        subtext: '暗市廉价血丹已搅乱青岚药价，总账背后的影子渐渐浮出水面（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_blood_pill') &&
          !s.flags.blood_arc_step1 &&
          canCommitMajorArc(s, 'act2', 'thread_blood_pill'),
        insightTags: ['百宝暗潮', '行情剧烈变动', '占一席天时大势'],
        effect: {
          timeMonths: 8,
          beatDelta: 1,
          commitMajorArc: { act: 'act2', threadId: 'thread_blood_pill' },
        },
        next: 'act2_arc_blood_1',
      },
      {
        id: 'hub_blood_2',
        category: 'story',
        label: '直面暗市血丹总账，决断揭发清剿、暗拓取证还是与谢无咎反挟商行',
        subtext: '仙盟执法队与暗市势力一触即发，此番落子将改写青岚坊市格局。',
        visible: (s) =>
          s.activeThreads.includes('thread_blood_pill') && Boolean(s.flags.blood_arc_step1),
        insightTags: ['血丹总账', '天机残卷', '灵石与正邪分叉'],
        effect: { timeMonths: 10, beatDelta: 1 },
        next: 'act2_arc_blood_2',
      },
      {
        id: 'hub_plague_1',
        category: 'story',
        label: (s) =>
          !isSuZhiweiAlive(s)
            ? '重返青州城外杏林旧址，凭吊素碑并查验尘封怪疫医案'
            : s.companions.su_zhiwei.met
            ? '驰赴青州城外杏林医馆，探看苏知微与怪疫异象'
            : '驰赴青州城外避疫药棚，查探怪疫异象与守棚凡医',
        subtext: (s) =>
          !isSuZhiweiAlive(s)
            ? '数十年光阴已逝，老杏树下尚存当年怪疫病案与故人遗录（须占本卷一席大势）。'
            : '城外避疫草棚日渐增多，专蚀微灵根的怪疫透着彻骨寒意（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_qingzhou_plague') &&
          !s.flags.plague_arc_step1 &&
          canCommitMajorArc(s, 'act2', 'thread_qingzhou_plague'),
        insightTags: ['青州疫局', '天机残卷', '占一席天时大势'],
        effect: {
          timeMonths: 8,
          beatDelta: 1,
          commitMajorArc: { act: 'act2', threadId: 'thread_qingzhou_plague' },
        },
        next: 'act2_arc_plague_1',
      },
      {
        id: 'hub_plague_2',
        category: 'story',
        label: (s) =>
          isSuZhiweiAlive(s)
            ? '重返青州杏林，应对怪疫反扑与苏知微的宿命危局'
            : '重返青州杏林空庐，凭吊素碑并收检故人遗笺',
        subtext: (s) =>
          isSuZhiweiAlive(s)
            ? '杏林药火摇曳欲熄，你须在仙途与红尘之间做出决断。'
            : '数十载闭关已错过凡尘一世，空庐药炉前唯余旧笺待收。',
        visible: (s) =>
          s.activeThreads.includes('thread_qingzhou_plague') &&
          Boolean(s.flags.plague_arc_step1),
        insightTags: (s) =>
          isSuZhiweiAlive(s)
            ? ['杏林危局', '续命抉择', '红尘归途']
            : ['杏林旧冢', '故人遗笺', '红尘归途'],
        effect: { timeMonths: 12, beatDelta: 1 },
        next: 'act2_arc_plague_2',
      },
      {
        id: 'hub_vein_1',
        category: 'story',
        label: '孤身潜入青州北麓干涸灵脉裂隙，探寻夜半地鸣之源',
        subtext: '北麓地底夜夜沉鸣，枯竭的灵脉深处似藏着前朝逆阵（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_ancient_vein') &&
          !s.flags.vein_arc_step1 &&
          canCommitMajorArc(s, 'act2', 'thread_ancient_vein'),
        insightTags: ['北麓古脉', '地脉真相', '占一席天时大势'],
        effect: {
          timeMonths: 9,
          beatDelta: 1,
          commitMajorArc: { act: 'act2', threadId: 'thread_ancient_vein' },
        },
        next: 'act2_arc_vein_1',
      },
      {
        id: 'hub_vein_2',
        category: 'story',
        label: '再入古脉深处残阵，唤醒苍溟关于长明元年的尘封记忆',
        subtext: '地底残阵剑意未散，三千年前碎天台旧事正待揭晓。',
        visible: (s) =>
          s.activeThreads.includes('thread_ancient_vein') && Boolean(s.flags.vein_arc_step1),
        insightTags: ['古脉残阵', '天机残卷', '千年重誓'],
        effect: { timeMonths: 10, beatDelta: 1 },
        next: 'act2_arc_vein_2',
      },
      {
        id: 'hub2_engagement_echo',
        category: 'story',
        label: '望月酒楼独饮，忽见昔日退婚小族家主登门请安',
        subtext: '当年一纸退婚庚帖压在行囊深处，今日旧事主动找上了门。',
        visible: (s) =>
          s.tags.includes('broken_engagement') &&
          !s.flags.engagement_echo_done &&
          s.actBeat >= 1 &&
          countActiveAct2Threads(s) <= 3,
        insightTags: ['退婚旧缘应劫', '心境与灵石'],
        effect: {
          timeMonths: 2,
          setFlags: { engagement_echo_done: true },
          setReturnSceneId: 'act2_hub',
        },
        next: 'rand_act2_engagement_echo',
      },
      {
        id: 'hub2_talisman_echo',
        category: 'story',
        label: '子夜静室吐纳，怀中【荒庙旧符】发烫示警',
        subtext: '识海深处响起诡异温柔的呢喃，疯道人留下的旧符似有异动。',
        visible: (s) => {
          const engVisible =
            s.tags.includes('broken_engagement') && !s.flags.engagement_echo_done;
          return (
            s.tags.includes('old_daoist_talisman') &&
            !s.flags.old_talisman_echo_done &&
            s.actBeat >= 1 &&
            countActiveAct2Threads(s) + (engVisible ? 1 : 0) <= 3
          );
        },
        insightTags: ['荒庙旧符应劫', '心境大进'],
        effect: {
          timeMonths: 2,
          setFlags: { old_talisman_echo_done: true },
          setReturnSceneId: 'act2_hub',
        },
        next: 'rand_act2_heart_whisper',
      },
      {
        id: 'hub2_cultivate',
        category: 'plan',
        label: '闭门潜修炼气气海（苦修 / 租灵眼 / 启聚灵阵盘）',
        subtext: '筑基前至多自主闭关两回，稳步推升炼气小阶。',
        requirement: {
          maxUsesInAct: {
            key: 'cultivate',
            max: 2,
            reason: '气海已臻当前瓶口，单靠闭门枯坐难有寸进，须历风波或直叩筑基',
          },
        },
        insightTags: ['自主潜修', '本卷限二回'],
        next: 'act2_action_cultivate',
      },
      {
        id: 'hub2_errands',
        category: 'plan',
        label: '出城行迹：炼气悬赏、暗桩买讯与山野游历',
        subtext: '接执事堂悬赏赚灵石、去听风酒肆撬开跨线风波，或御风游历青岚山野。',
        insightTags: ['不耗光阴', '悬赏、买讯与游历'],
        next: 'act2_action_errands',
      },
      {
        id: 'hub_open_market',
        category: 'market',
        label: '入青岚大坊与百宝暗拍，查看行市或购置筑基丹与延寿露',
        subtext: '随时入坊查价不耗光阴，行市正随当前青岚与青州风波起伏。',
        insightTags: ['坊市行商', '入坊不耗光阴', '可购筑基丹与延寿露'],
        next: 'act2_market_grand',
      },
      {
        id: 'hub2_companion_visit',
        category: 'companion',
        label: (s) =>
          Object.values(s.companions).some((c) => c.met)
            ? '抽身寻访故人旧识（论剑 / 访商 / 问药 / 叩玉）'
            : '循已有门路登门拜访（论剑 / 访商 / 问药）',
        subtext: '按已有交情或门路主动登门，不耗光阴即可先行筹度去向。',
        visible: (s) => {
          const canShen =
            (s.companions.shen_qingshuang.met ||
              s.tags.includes('qingyun_outer') ||
              Boolean(s.flags.shen_invited_player)) &&
            s.companions.shen_qingshuang.stance !== 'estranged' &&
            s.companions.shen_qingshuang.stance !== 'rival' &&
            !s.flags.betrayed_shen_at_stele &&
            !s.flags.shen_rival_tension &&
            !isMajorArcMissed(s, 'act2', 'thread_sword_trial');
          const canXie =
            (s.companions.xie_wujiu.met ||
              s.tags.includes('dark_market_broker') ||
              Boolean(s.flags.xie_invited_player) ||
              s.relics.includes('baibao_token')) &&
            s.companions.xie_wujiu.stance !== 'estranged' &&
            s.companions.xie_wujiu.stance !== 'rival';
          const canSu =
            isSuZhiweiAlive(s) &&
            !s.flags.su_zhiwei_fading &&
            !(
              Boolean(s.flags.plague_arc_step1) &&
              s.activeThreads.includes('thread_qingzhou_plague')
            ) &&
            (s.companions.su_zhiwei.met ||
              Boolean(s.flags.arc_plague_active) ||
              Boolean(s.flags.act1_rumor_plague));
          const canCm =
            s.companions.cang_ming.met &&
            s.companions.cang_ming.stance !== 'estranged' &&
            s.companions.cang_ming.stance !== 'rival' &&
            !s.flags.cangming_sealed;
          return canShen || canXie || canSu || canCm;
        },
        insightTags: ['寻访旧识故人'],
        next: 'act2_companion_visit',
      },
      {
        id: 'hub_foundation_gate',
        category: 'breakthrough',
        label: '【闭关筑基】冲击筑基大关，跨越凡仙第二道天堑',
        subtext: (s) => {
          const readiness: string[] = [];
          if (s.relics.includes('foundation_pill')) readiness.push('已备上品筑基丹');
          if (s.relics.includes('broken_gathering_array') && s.spiritStones >= 60) {
            readiness.push('聚灵阵盘配60灵石可启');
          } else if (s.relics.includes('broken_gathering_array')) {
            readiness.push('已备阵盘（尚差60灵石驱动）');
          } else {
            const hasArrayPrereq =
              s.tags.includes('merchant_fame') ||
              s.tags.includes('merchant_manual') ||
              s.tags.includes('dark_market_broker') ||
              s.mind >= 55;
            if (hasArrayPrereq && s.spiritStones >= 220) {
              readiness.push('商道阵理与220灵石齐备可布阵');
            }
          }
          return readiness.length > 0
            ? `当前筹备：${readiness.join(' · ')}。你随时可拍板闭关破境。`
            : '破境凶险，建议先备妥筑基丹与阵盘，或具备商道/心境≥55且攒足二百二十灵石后再入关。';
        },
        visible: (s) => s.actBeat >= 3 || s.completedThreads.length >= 2 || s.might >= 38,
        insightTags: (s) => [
          '筑基破境关口',
          `当前修为+心境 ${s.might + s.mind}`,
          '无丹硬冲≥95（稳渡≥145）',
        ],
        next: 'act2_foundation_gate',
      },
    ],
  },

  // ==================== 动态坊市与百宝暗拍 ====================
  act2_market_grand: {
    id: 'act2_market_grand',
    act: 'act2',
    title: '青岚大坊与暗拍',
    subtitle: '卷二 · 灵石博弈',
    location: '青岚城 · 聚宝阁与暗市雅间',
    market: {
      venueName: '青岚大坊 · 实时行情与秘宝寄售',
      venueDesc:
        '大势动荡之秋，正是有人倾家荡产、有人一步登天之时。看准风声低买高卖货品，或一掷千金拍下决定命运的稀世奇物。',
      goodsIds: ['qingxin_herb', 'po_zhang_talisman', 'ancient_rubbing', 'spirit_marrow_oil'],
      relicOffers: [
        {
          relicId: 'foundation_pill',
          basePrice: 280,
          category: 'elixir',
          when: (s) => !s.relics.includes('foundation_pill'),
        },
        {
          relicId: 'longevity_dew',
          basePrice: 240,
          category: 'elixir',
          when: (s) =>
            !s.relics.includes('longevity_dew') &&
            !s.flags.su_zhiwei_saved_longlife &&
            !s.flags.longevity_dew_self_used,
        },
        {
          relicId: 'broken_gathering_array',
          basePrice: 150,
          category: 'artifact',
          when: (s) => !s.relics.includes('broken_gathering_array'),
        },
        {
          relicId: 'blood_foundation_pill',
          basePrice: 95,
          category: 'elixir',
          when: (s) =>
            !s.flags.blood_pill_exposed &&
            !s.relics.includes('blood_foundation_pill'),
        },
      ],
    },
    paragraphs: [
      '聚宝阁内檀香缭绕，玉牌翻动间便是数百灵石易主。隔着一层珠帘，散修们低声交换着青云试剑、暗市封查与青州怪疫的最新风声，每一次消息落地，牌价便随之微颤。',
      {
        when: (s) => s.relics.includes('baibao_token'),
        text: (s) =>
          s.companions.xie_wujiu.stance === 'rival' ||
          s.companions.xie_wujiu.stance === 'estranged'
            ? '你亮出【百宝斋玄铁令】，管事瞥了一眼便神色一冷，将木牌推回案沿：“谢少东家早已销了阁下这块铁令的账，今日奇物一律照市价算。”'
            : '你亮出怀中【百宝斋玄铁令】，管事立刻满脸堆笑地奉上香茗，全场奇物按谢少东家吩咐一律予你折让一成半礼遇。',
      },
      {
        when: (s) => s.spiritStones >= 600,
        text: '你袖中灵石之丰厚，已令阁中几位筑基执事暗暗侧目。放眼整个青岚炼气修士，能握着这等身家谈笑自若的屈指可数。',
      },
    ],
    choices: [
      {
        id: 'market_merchant_ending',
        label: '【弃仙从商】长生虚妄、天门无音，不如盘下青岚三座灵阁执掌一城商脉',
        subtext:
          '放下仙途争逐，借手中厚实本钱与商脉眼光坐断青岚财路。此择将收束此世，另辟商道终局【灵石通神】。',
        visible: (s) =>
          s.spiritStones >= 650 ||
          (s.spiritStones >= 350 &&
            (s.tags.includes('merchant_fame') ||
              Number(s.flags.total_trade_profit ?? 0) >= 260)),
        insightTags: [
          '商道终局【灵石通神】',
          '灵石≥650，或商名/行商净利≥260且现持≥350灵石',
        ],
        effect: {
          addTags: ['merchant_fame'],
          logSummary: '看淡虚无缥缈的天门飞升，以惊人财力执掌青岚灵市商脉。',
        },
        outcome: [
          '珠帘之外，又有几名白发炼气散修为了半瓶筑基丹争得面红耳赤。你忽然合上灵石匣。这逐仙一途实在可笑，世人追着三千年无回音的虚影拼死拼活，却忘了脚下万千烟火皆系于灵石一字。',
          '当夜你唤来聚宝阁大掌柜，以雷霆手腕签下青岚城三座核心灵阁的契书。笔锋落下那一瞬，你放下了长剑，却将整座仙城的命脉握进了掌心。',
        ],
        outcomeContinueLabel: '展卷终局 · 【灵石通神】',
        next: 'ending_merchant_lord',
      },
      {
        id: 'market_return_hub',
        label: '合上账簿收好奇物，离开聚宝阁重回局中',
        insightTags: ['返回问途云海'],
        bridgeNote: '你自青岚大坊归来，袖中筹码已重新盘整，窗外天色愈发晦暗。',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 暗线一：青云试剑与失踪案（沈清霜长线） ====================
  act2_arc_sword_1: {
    id: 'act2_arc_sword_1',
    act: 'act2',
    title: '试剑暗影',
    subtitle: '卷二 · 青云试剑案（上）',
    location: '青云剑宗 · 寒松试剑坪',
    paragraphs: [
      '山风扫过试剑坪，数百柄青钢长剑在白玉石阶下寒光如林。锣鼓旗幡热闹非常，可你细心比对名册时，却发现去年名列外门前三的弟子名字均被朱笔悄悄划去，连同他们的命牌一道消失在宗祠里。',
      '散场后你在松林后截住了独自擦拭佩剑的沈清霜。剑锋映着她清冷的眉眼，她并未否认你的猜测，只低声道：“执法堂对外托词，说将那三名炼气圆满的师弟秘密送入了宗门秘境深造、淬炼道基；可我去秘境外的偏殿查过，他们临行前都曾被单独召去禁地‘赐丹’。我验过丹方残渣……那根本不是青云正统丹药。”',
      {
        when: (s) => Boolean(s.flags.heard_ascension_doubt),
        text: '你心头一凛，记起早年在青岚临河茶棚听过的老散修酒话，青云禁地那座飞升碑阴面果然另有蹊跷。',
      },
      {
        when: (s) => Boolean(s.flags.act1_helped_darkmarket) || s.alignment.righteous <= -10,
        text: (s) =>
          s.tags.includes('qingyun_outer')
            ? '说到此处，她忽然抬眸直视你，剑意微凝：“只是我听说你在青岚暗市素有往来。今日找我问这些，究竟是想护同门，还是替暗市探听宗门虚实？”'
            : '说到此处，她忽然抬眸直视你，剑意微凝：“只是我听说你在青岚暗市素有往来。今日找我问这些，究竟是存心查明真相，还是替暗市探听青云虚实？”',
      },
    ],
    choices: [
      {
        id: 'sword1_ally_shen',
        label: '坦诚相告自己所见异象，愿与她联手暗查禁地古碑',
        subtext: '与青云首座站在一起，意味着直面宗门高层的压力。',
        insightTags: ['沈清霜深厚好感', '剑意精进', '正道'],
        effect: (s) => ({
          might: 8,
          righteous: 10,
          addTags: ['sword_intent_seed'],
          setRealm: nextQiRealm(s),
          setFlags: { sword_arc_step1: true, shen_trusted_ally: true },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 12,
              setStage: 2,
              chronicle: '试剑坪后松林夜话，你毫无保留地站在她身侧，二人定下夜探后山古碑之约。',
            },
          },
          logSummary: '与沈清霜在松林立约，联手追查青云外门失踪弟子与禁地赐丹黑幕。',
        }),
        outcome: [
          (s) => {
            const knowsDust = Boolean(
              s.flags.act1_bought_blood_pill_sample ||
                s.flags.act1_observed_dust ||
                s.truthClues.includes('clue_blood_pill_dust') ||
                s.relics.includes('blood_foundation_pill')
            );
            return knowsDust
              ? '你将初入炼气时窥见的天穹冷眼与暗市血丹上的灰白微尘和盘托出。沈清霜听罢指节骤白，霜剑归鞘，发出一声清越寒鸣：“……原来不止青云宗。难怪历代飞升碑后都被设了禁制。”'
              : '你将初入炼气时窥见的天穹冷眼与青岚坊市诸多失踪怪闻和盘托出。沈清霜听罢指节骤白，霜剑归鞘，发出一声清越寒鸣：“……原来不止青云宗。难怪历代飞升碑后都被设了禁制。”';
          },
          '松影落在她肩头。她声线放缓：“执法堂耳目太多，今夜不可妄动。待下一个月晦之夜，我们在后山飞升崖外会合。”临别她顺手点拨了两处运剑滞涩。你气海豁然一通，境界顺势再进一层。',
        ],
        outcomeContinueLabel: '辞别寒松林 · 静候月晦之约',
        bridgeNote: '与沈清霜在寒松林定下月晦夜探飞升碑之约后，山中巡逻明显比往日森严。',
        next: 'act2_hub',
      },
      {
        id: 'sword1_clash_shen',
        label: '冷笑直言正道宗门也不过藏污纳垢，转身独行查案',
        subtext: '不愿受她剑意逼问，宁可与她分庭抗礼、各凭本事揭开真相。',
        insightTags: ['沈清霜对立张力', '心境与修为', '孤峭'],
        effect: (s) => ({
          might: 9,
          mind: 6,
          righteous: -8,
          setRealm: nextQiRealm(s),
          setFlags: { sword_arc_step1: true, shen_rival_tension: true },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: -16,
              setStance: 'rival',
              setStage: 2,
              chronicle: '松林间言语交锋，她认定你行事偏激难测，却也在剑影交错间记住了你的锐气。',
            },
          },
          logSummary: '于青云松林与沈清霜理念相左，决意凭一己之力撬开后山禁地之谜。',
        }),
        outcome: [
          '“正道首座倒挺会审人。”你迎着她的霜寒剑意半步不退，冷笑反击，“若青云宗当真清白，又何必把失踪弟子的名字从宗祠抹个干净？”',
          '枯枝应声而断。沈清霜眸冷如冰，终未拔剑：“各凭本事。若叫我发现你勾结暗市祸乱同门，下回落的就不是松枝了。”你转身下山，胸中激荡的锋芒竟顺势冲破一重炼气瓶颈。一剑抵一境。',
        ],
        outcomeContinueLabel: '拂袖离林 · 暗自摸查后山',
        bridgeNote: '寒松林与沈清霜不欢而散，你已打定主意独自在月晦之夜摸上后山禁地。',
        next: 'act2_hub',
      },
      {
        id: 'sword1_buy_insider',
        label: '暗中花一百灵石买通看守命牌堂的老杂役，套出禁地守卫换班时辰',
        requirement: { minSpiritStones: 100, lockReason: '需灵石 100' },
        insightTags: ['以财破局', '沈清霜赞许', '稳妥情报'],
        effect: (s) => ({
          spiritStones: -100,
          renown: 8,
          mind: 6,
          setRealm: nextQiRealm(s),
          setFlags: { sword_arc_step1: true, sword_bribed_guard: true },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 14,
              setStage: 2,
              chronicle: '你以极务实的法子弄来禁地换班图，她虽不惯此道，却也由衷道了一声谢。',
            },
          },
          logSummary: '重金买通命牌堂老杂役，摸清青云禁地暗哨虚实，为夜探古碑铺平道路。',
        }),
        outcome: [
          '世上没有灵石撬不开的嘴。一百块灵石悄悄塞进老杂役袖中后，你不出半日便拿到了一张画着执法堂巡哨盲区与换班刻度的草图。',
          '你将草图递给沈清霜时，向来恪守规矩的青云首座愣了一瞬，耳尖竟微微泛红，随即轻叹一声郑重收好：“是我拘泥了。有了这张图，月晦之夜我们至少多了五成全身而退的把握。”',
        ],
        outcomeContinueLabel: '收好暗哨图 · 静待月晦夜探',
        bridgeNote: '手握重金换来的禁地暗哨换班图，你与沈清霜已做好夜探飞升碑的万全准备。',
        next: 'act2_hub',
      },
    ],
  },

  act2_arc_sword_2: {
    id: 'act2_arc_sword_2',
    act: 'act2',
    title: '飞升碑背',
    subtitle: '卷二 · 青云试剑案（终章）',
    location: '青云后山 · 禁地飞升崖',
    checkpoint: true,
    checkpointLabel: '卷二 · 夜探青云飞升古碑',
    paragraphs: [
      '月晦无光，寒星稀疏，你避开巡山禁制摸上了云雾缭绕的飞升崖。崖顶矗立着一座十丈青石古碑，正面密密麻麻刻着三千年来青云宗七位踏至化神极境、“白日飞升”大能的道号与功绩。',
      (s) =>
        s.flags.shen_rival_tension ||
        s.companions.shen_qingshuang.stance === 'rival' ||
        s.companions.shen_qingshuang.stance === 'estranged'
          ? '沈清霜已先你一步立在碑后。听见你落步声，她反手按住霜剑冷声道：“你果然还是摸上来了。自己看罢，看看你们冷嘲热讽的正道仙途，背后究竟刻着什么！”火折微亮，古碑背面光滑的石面上，赫然藏着一道被人用惊天剑气仓促刻下、又被后人削去大半的血红反文：'
          : '沈清霜已先你一步立在碑后。火折微亮，你顺着她指尖望去，古碑背面原本光滑的石面上，竟藏着一道被人用惊天剑气仓促刻下、又被后人狠狠削去大半的血红反文：',
      '“长明以来，七度光落，无一音回。灵脉岁减，非天灾也。慎叩其门。”',
      {
        when: (s) => Boolean(s.flags.sword_bribed_guard),
        text: '你提前按着那张重金买来的换班草图盯紧了山道转角。果然比寻常早了半柱香，远处林梢先闪出执法堂探路的赤色灵灯，让你与沈清霜抢先占住了崖侧撤离盲区。',
      },
      (s) => {
        const knowsDust = Boolean(
          s.flags.act1_bought_blood_pill_sample ||
            s.flags.act1_observed_dust ||
            s.truthClues.includes('clue_blood_pill_dust') ||
            s.relics.includes('blood_foundation_pill')
        );
        const pillPhrase = knowsDust ? '掺着灰白异尘的丹药' : '来历不明的古怪秘丹';
        return s.flags.shen_rival_tension ||
          s.companions.shen_qingshuang.stance === 'rival' ||
          s.companions.shen_qingshuang.stance === 'estranged'
          ? `风声骤紧，山道尽头亮起数盏执法堂的赤色灵灯！沈清霜收回指尖，剑意森寒却声音发哑：“七位化神先祖引光飞升竟无一回音，而宗门近来又借‘送入秘境深造淬炼道基’为名，暗中挑走优秀弟子赐下${pillPhrase}。下一个名单上写的正是我的名字。执法长老到了，你是趁机落井下石，还是各凭本事脱身，随你。”`
          : `风声骤紧。山道尽头亮起数盏执法堂赤灯！沈清霜按剑而立，面白如雪，目冷如铁：“三千年七度化神光落竟真藏着隐情。执法堂口口声声将外门天骄送入秘境深造淬炼道基，却暗中赐下${pillPhrase}，究竟要送去何处？”她顿了顿，“下一份候补名单，有我。”`;
      },
    ],
    choices: [
      {
        id: 'sword2_protect_shen',
        label: '拓下碑背反文，拉住沈清霜的手杀出重围护她逃离执法暗哨',
        subtext: '从此与青云顽固高层结下深仇，却与沈清霜生死相托。',
        insightTags: ['得真相【飞升碑断代】', '沈清霜深厚羁绊', '得古碑残拓'],
        effect: (s) => ({
          might: 10,
          mind: s.flags.sword_bribed_guard ? 13 : 8,
          renown: s.flags.sword_bribed_guard ? 6 : 0,
          righteous: 10,
          addRelics: ['ancient_stele_rubbing'],
          addTruthClues: ['clue_stele_gap'],
          completeThreads: ['thread_sword_trial'],
          setFlags: {
            shen_saved_from_sect: true,
            qingyun_elders_hostile: true,
            shen_rival_tension: false,
            arc_sword_trial_active: false,
          },
          companionUpdates: {
            shen_qingshuang: {
              markSeen: true,
              affectionDelta: 16,
              setStance:
                s.companions.shen_qingshuang.affection + 16 >= 75
                  ? 'bonded'
                  : 'confidant',
              setStage: 3,
              chronicle: '飞升崖夜半见真章，你冒死护她脱险并拓下碑背反文，她首次在你面前卸下首座孤冷。',
            },
          },
          logSummary: '夜探飞升崖得【飞升碑断代】真相，冒死护沈清霜脱出禁地，令青云长老震怒。',
        }),
        outcome: [
          (s) =>
            s.flags.sword_bribed_guard
              ? '“走西侧松崖盲区！”你飞快撕下湿墨拓纸塞入怀中，攥住沈清霜手腕直切老杂役所画的换班空当。执法堂剑网慢了半拍，你们仅接下一道偏斜缚灵索，便从容纵出禁地！'
              : '“别发愣，走！”你飞快撕下湿墨拓纸塞入怀中，一把攥住沈清霜冰凉的手腕。执法堂的赤灯与剑网迎面罩落，你与她并肩而战，霜寒剑气劈开山雾，你替她挡下侧翼袭来的一道缚灵索，两人硬生生从百丈断崖借松枝连纵脱身！',
          '直至逃入山外荒溪边，两人才靠着青石大口喘息。清冷星辉洒在沈清霜凌乱的白衣上，她望着你替她挡剑擦伤的手臂，轻声道：“青云已容不下我。既已知晓碑背真相，这一剑我不会再收回。你也莫死在我前头。”',
          '她暂时隐匿行踪去联络宗内尚存良知的师叔，约定待你筑基之后再汇合。你捂紧怀中带着松烟墨香的【飞升古碑残拓】，在黎明前折返落脚处。',
        ],
        outcomeContinueLabel: '藏好古碑残拓 · 归返筹谋筑基',
        bridgeNote: '飞升崖一夜血战，你护着沈清霜杀出青云禁地，碑背那道血色反文仍灼烧着你的心神。',
        next: 'act2_hub',
      },
      {
        id: 'sword2_calm_retreat',
        label: (s) =>
          s.tags.includes('qingyun_outer')
            ? '劝沈清霜切莫打草惊蛇，悄然拓印反文后各自伪装退回山门蛰伏'
            : '劝沈清霜切莫打草惊蛇，悄然拓印反文后各自隐匿行迹暂且蛰伏',
        subtext: (s) =>
          s.tags.includes('qingyun_outer')
            ? '敌众我寡，留着青云身份在暗处积蓄筑基之力方为上策。'
            : '敌众我寡，保住她在青云的身份、各自在暗处积蓄筑基之力方为上策。',
        insightTags: ['得真相【飞升碑断代】', '沈清霜知己', '保全声望与隐蔽'],
        effect: (s) => ({
          mind: s.flags.sword_bribed_guard ? 17 : 12,
          renown: s.flags.sword_bribed_guard ? 14 : 8,
          addRelics: ['ancient_stele_rubbing'],
          addTruthClues: ['clue_stele_gap'],
          completeThreads: ['thread_sword_trial'],
          setFlags: {
            shen_covert_pact: true,
            shen_rival_tension: false,
            arc_sword_trial_active: false,
          },
          companionUpdates: {
            shen_qingshuang: {
              markSeen: true,
              affectionDelta: 12,
              setStance: 'confidant',
              setStage: 3,
              chronicle: '飞升崖上你冷静劝她蛰伏待时，二人各自藏起残拓，约定筑基后再谋查明真相。',
            },
          },
          logSummary: '于飞升崖暗拓反文并冷静脱身，与沈清霜结成隐秘同盟。',
        }),
        outcome: [
          '你一把摁住她欲拔剑的腕骨，压低声音：“此刻翻脸，你我连青岚郡都走不出去。先装作什么都不知道！”',
          (s) =>
            s.flags.sword_bribed_guard
              ? '沈清霜深吸一口气，压下翻涌剑意。你按着买来的换班草图精准错开两拨巡哨，拓完反文、拂去足迹后分道折返，连执法堂半缕神识也未惊动。擦肩前，她在暗夜里低声道：“那张暗哨图救了大急。等彼此筑基，再讨公道。”'
              : '沈清霜深深吸了一口气，瞬间压下翻涌的剑意。你以灵力飞快拓完碑背反文、拂去石阶足迹，两人借着崖边浓雾分道悄然折返。擦肩前，她在暗夜里极轻地道了一句：“多亏你冷静。等我筑基，你也筑基，到时候我们再来问长老讨个公道。”',
        ],
        outcomeContinueLabel: '借夜雾脱身 · 蛰伏待时',
        bridgeNote: '飞升崖上的血色反文已被你悄然收入囊中，表面风平浪静之下，你与沈清霜已结成隐秘同盟。',
        next: 'act2_hub',
      },
      {
        id: 'sword2_betray_for_pill',
        label: '暗中记下真相，却在执法长老现身时佯装不知情，反借功领赏一枚上品筑基丹',
        subtext: '极度冷静甚至残酷的抉择，你将彻底失去沈清霜的信任，但换来货真价实的破境重宝。',
        insightTags: (s) => [
          s.relics.includes('foundation_pill') ? '易得260灵石' : '得【上品筑基丹】+80灵石',
          '得真相【飞升碑断代】',
          '沈清霜决裂',
        ],
        effect: (s) => {
          const hadPill = s.relics.includes('foundation_pill');
          return {
            spiritStones: hadPill ? 260 : 80,
            righteous: -28,
            addRelics: hadPill ? undefined : ['foundation_pill'],
            addTruthClues: ['clue_stele_gap'],
            completeThreads: ['thread_sword_trial'],
            setFlags: {
              betrayed_shen_at_stele: true,
              arc_sword_trial_active: false,
              sword2_pill_converted: hadPill,
            },
            companionUpdates: {
              shen_qingshuang: {
                markSeen: true,
                affectionDelta: -40,
                setStance: 'estranged',
                setStage: 3,
                chronicle: '飞升崖寒夜中，她望着你向执法长老拱手领赏的背影，一剑斩断衣袂自此陌路。',
              },
            },
            logSummary: hadPill
              ? '虽窥得飞升碑反文，却选择向宗门示顺领赏，暗兑多丹共得二百六十灵石，与沈清霜彻底决裂。'
              : '虽窥得飞升碑反文，却选择明哲保身向宗门示顺换得上品筑基丹，与沈清霜彻底决裂。',
            notice: hadPill
              ? '你已备有上品筑基丹，下山后托暗坊将多出赏丹易得一百八十灵石。'
              : undefined,
          };
        },
        outcome: [
          (s) =>
            s.tags.includes('qingyun_outer')
              ? '执法长老阴沉现身的那一刻，你垂下眼帘将反文尽数咽回腹中，拱手禀报：“弟子夜巡误入禁地，见沈师姐神色有异，特来相劝。”'
              : '执法长老阴沉现身的那一刻，你垂下眼帘将反文尽数咽回腹中，拱手禀报：“晚辈追查失踪风声误入贵宗外山，见沈首座在禁地神色有异，特来禀明。”',
          '长老眯眼打量你半晌，当场赏下一枚封存完好的【上品筑基丹】与八十灵石，挥手命人把沈清霜押回思过崖。转身前，她没骂你一个字。剑光一闪，半截素白衣袖坠入深渊。那一眼冷得像三九寒霜。',
          (s) =>
            s.flags.sword2_pill_converted
              ? '筹码在袖中沉甸甸的。下山后，你托暗坊将多出的那枚赏丹暗中易得一百八十灵石——你拿到了最稳妥的破境本钱，也亲手断了飞升崖上一段旧缘。'
              : '筹码在袖中沉甸甸的。你拿到了最稳妥的破境本钱，也亲手断了飞升崖上一段旧缘。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.sword2_pill_converted ? '揣紧赏银灵石 · 独自离崖' : '收好筑基药匣 · 独自离崖',
        bridgeNote: (s) =>
          s.flags.sword2_pill_converted
            ? '你揣着自飞升崖领赏折换的二百六十灵石，可沈清霜斩袖离去的那一眼，却久久挥之不去。'
            : '你手握自飞升崖换来的【上品筑基丹】，可沈清霜斩袖离去的那一眼，却久久挥之不去。',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 暗线二：血丹风波与坊市震荡（谢无咎长线） ====================
  act2_arc_blood_1: {
    id: 'act2_arc_blood_1',
    act: 'act2',
    title: '血丹密账',
    subtitle: '卷二 · 血丹风波（上）',
    location: '青岚地下暗市 · 百宝斋秘库',
    paragraphs: [
      (s) =>
        s.companions.xie_wujiu.met
          ? '穿过三道刻着隔音阵的铁门，谢无咎将一卷泛黄的厚重账册推到灯下，又捏碎了一枚暗市疯抢的血煞丹。猩红药粉散落桌面，在灵灯下竟析出一撮寒凉刺骨、绝非凡间灵草所能炼出的灰白细尘。'
          : '你循着暗市风声递上拜帖，被百宝斋管事引过三道刻着隔音阵的铁门，终于在地下秘库初见那名传闻中的玄衣东家。谢无咎合上玄铁算盘，待你落座便捏碎一枚暗市疯抢的血煞丹，猩红药粉散落灯下，析出一撮寒凉刺骨的灰白细尘。',
      (s) =>
        s.companions.xie_wujiu.met
          ? '“看清了吗？”谢无咎收起了平日那副玩世不恭的笑意，声音轻得像刀背贴颈，“青岚坊市卖血丹的后台并非寻常魔修，坐庄的是背景深不可测的‘天机商行’。他们低价抛售血丹扰乱市价，同时把三百年来青州矿脉大半亏空都抹作了无名‘上供转运口’。更要命的是，我刚接手百宝斋不久，分号里几名老掌柜早已暗中倒向天机商行。”'
          : '“初见便请阁下看这本黑账，是我谢无咎唐突了。”他声音轻得像刀背贴颈，“青岚坊市卖血丹的后台并非寻常魔修，坐庄的是背景深不可测的‘天机商行’。他们把三百年来青州矿脉大半亏空都抹作了无名‘上供转运口’，连百宝斋里几名老掌柜都暗中倒向了他们。”',
      (s) =>
        (s.companions.xie_wujiu.milestoneStage ?? 0) >= 1
          ? '他抬眼看你，眼神比那夜暗楼对坐时更冷：“先前同你提过我哥的事——他昔年修至金丹巅峰，吞了天机商行所赠的一枚奇丹，被他们捧作罕见奇才，次日竟在城头万众瞩目下沐光破界、号称破格引渡上界，可从此连半张传讯符都没落回凡尘。眼下天机商行有筑基后期管事坐镇青岚，硬碰必死。这趟浑水，你是愿替我暗布后手、截断货源，还是另作打算？”'
          : '他抬眼看你：“我哥哥昔年修至金丹巅峰，吞了天机商行所赠的一枚奇丹，被他们捧作罕见奇才，次日竟在城头万众瞩目下沐光破界、号称破格引渡上界，可从此连半张传讯符都没落回凡尘。眼下天机商行有筑基后期管事坐镇青岚，硬碰必死。这趟浑水，你是愿替我暗布后手、截断货源，还是另作打算？”',
    ],
    choices: [
      {
        id: 'blood1_partner_xie',
        label: (s) =>
          s.relics.includes('baibao_token')
            ? '与谢无咎联手截断血丹原料，并提前在青岚暗桩寄存「死手账本」防备灭口'
            : '与谢无咎联手截断血丹原料，并提前在暗市茶楼寄存「死手抄本」以备反制',
        subtext: '既查真相、趁势囤抬正丹，更为后续直面高阶商行管事埋下保命死手。',
        insightTags: (s) => [
          '布下【暗桩死手】',
          '谢无咎好感',
          s.relics.includes('baibao_token') ? '分红 140 灵石' : '得百宝斋玄铁令 + 100 灵石',
        ],
        effect: (s) => {
          const hadToken = s.relics.includes('baibao_token');
          return {
            spiritStones: hadToken ? 140 : 100,
            mind: hadToken ? 5 : 3,
            renown: 8,
            setRealm: nextQiRealm(s),
            addRelics: hadToken ? undefined : ['baibao_token'],
            addTruthClues: ['clue_blood_pill_dust'],
            setFlags: {
              blood_arc_step1: true,
              xie_market_tip: true,
              xie_allied: true,
              act2_deadman_switch: true,
              blood1_had_token_already: hadToken,
            },
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 13,
                setStage: 2,
                chronicle:
                  (s.companions.xie_wujiu.milestoneStage ?? 0) >= 1
                    ? '秘库孤灯下你与他联手布下死手暗桩，携手深查当年他兄长失踪背后的黑账。'
                    : '秘库孤灯下你选择与他联手布下死手暗桩，他首次对你吐露兄长飞升失踪的旧痛。',
              },
            },
            logSummary: '识破血丹中混有【灰白异尘】，与谢无咎联手截货并在青岚暗桩埋下死手抄本。',
          };
        },
        outcome: [
          (s) =>
            s.flags.blood1_had_token_already
              ? '“高境修士最擅长杀人灭口，要掀翻他们的旧局，得先把底牌撒进全城耳目里。”你与谢无咎不谋而合，先将初步账页抄成六份密寄百宝暗桩，约定你二人若逾时未归便满城张贴，随后截断两批血丹灵药船，分得一百四十灵石。'
              : '“高境修士最擅长杀人灭口，要掀翻他们的旧局，得先把底牌撒进全城耳目里。”你与谢无咎不谋而合，将初步账页抄成六份密寄暗桩作死手，随后截断两批血丹灵药船，分得一百灵石。',
          (s) =>
            s.flags.blood1_had_token_already
              ? '谢无咎瞥见你腰间早已悬着玄铁令，挑眉笑道：“既早是自家持令人，客套话便省了。有了这层死手压阵，下回大雨夜天机商行总账靠岸，纵然对方筑基管事坐镇也不敢轻易灭我们的口！”'
              : '谢无咎将一块镌着私印的【百宝斋玄铁令】推到你面前，收起惯常的戏谑：“多谢你肯信我，还想出死手牵制这一招。等大雨夜总账船靠岸，我们便去会一会天机商行！”',
        ],
        outcomeContinueLabel: '静候雨夜收网 · 归返筹谋',
        bridgeNote: '你与谢无咎已布下青岚暗桩死手并截断血丹原料，静候总账船靠岸。',
        next: 'act2_hub',
      },
      {
        id: 'blood1_take_bribe_pills',
        label: '不动声色稳住谢无咎，私下低价囤积血煞丹与灰尘样本',
        subtext: '管他商行恩怨，先借乱局把自己的筹码捏紧；但未布死手且易惹正道反感。',
        insightTags: (s) => [
          s.relics.includes('blood_foundation_pill')
            ? '多余血丹转售共得 150 灵石'
            : '得【血煞筑基丹】+80 灵石',
          '染煞风险',
          ...(s.companions.shen_qingshuang.met ? ['沈清霜微愠'] : []),
        ],
        effect: (s) => {
          const hadBloodPill = s.relics.includes('blood_foundation_pill');
          return {
            spiritStones: hadBloodPill ? 150 : 80,
            righteous: -12,
            setRealm: nextQiRealm(s),
            addRelics: hadBloodPill ? undefined : ['blood_foundation_pill'],
            addTruthClues: ['clue_blood_pill_dust'],
            setFlags: {
              blood_arc_step1: true,
              hoarded_blood_pills: true,
              blood1_pill_converted: hadBloodPill,
            },
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 3,
                setStage: 2,
                chronicle: '他看穿你暗自囤丹的算盘，挑眉笑道：“倒是个比我还冷血的生意人。”',
              },
              ...(s.companions.shen_qingshuang.met
                ? {
                    shen_qingshuang: {
                      affectionDelta: -6,
                      chronicle: '听闻你在青岚暗市囤积血煞禁丹，松林间的眉峰沉了几分。',
                    },
                  }
                : {}),
            },
            logSummary: hadBloodPill
              ? '洞悉血丹异尘后未布同盟，倒手转卖多余血丹共获一百五十灵石。'
              : '洞悉血丹异尘后未布同盟，暗中低价收入血煞筑基丹静观其变。',
          };
        },
        outcome: [
          (s) =>
            s.flags.blood1_pill_converted
              ? '你并未答应谢无咎的豪赌，转身借着他漏出的风声低价吃进一批血丹倒卖，净落一百五十灵石现银入囊。'
              : '你并未答应谢无咎的豪赌，转身借着暗线低价吃进一批血丹差价，给自己留下一枚成色最浓的【血煞筑基丹】作为后手。',
          '几天后在暗市走廊擦肩，谢无咎摇着折扇似笑非笑：“{{honorific}}这手两头吃筹码的本事倒利落。只是没百宝暗桩托底，总账船靠岸那夜可得掂量好天机筑基管事的脾气。”',
        ],
        outcomeContinueLabel: '揣紧筹码 · 静观暗市风云',
        bridgeNote: '你暗中囤下了血丹样本与灵石，却并未在暗市布下防备灭口的死手。',
        next: 'act2_hub',
      },
    ],
  },

  act2_arc_blood_2: {
    id: 'act2_arc_blood_2',
    act: 'act2',
    title: '坊市翻盘夜',
    subtitle: '卷二 · 血丹风波（终章）',
    location: '青岚南市 · 天机商行分号外',
    checkpoint: true,
    checkpointLabel: '卷二 · 血丹案终局抉择',
    paragraphs: [
      '暴雨倾盆的亥时，天机商行分号密库灯火通明。谢无咎的暗桩已截下三箱三百年灵矿总账。账本上触目惊心地记着：青州开采的七成灵石从未流入下界宗门，尽数被划入无名“上供转运口”，分毫不留。',
      '门外脚步骤紧，坐镇分号的筑基后期大管事已提着赤铜剑带人合围，周身威压直逼炼气修士心肺！谢无咎压低嗓音、眸光冷冽：“对方是筑基后期，正面硬拼讨不了好。要么立刻点火烧坊、把罪证甩给赶来的仙盟执法队；要么凭暗桩死手或硬实力镇住管事敲他一笔；要么干脆趁乱拓走密账与灰尘样本抽身脱险——你定！”',
    ],
    choices: [
      {
        id: 'blood2_expose_all',
        label: '火烧血丹坊并将罪证甩给仙盟执法队，借公势逼退天机管事',
        subtext: (s) =>
          s.relics.includes('blood_foundation_pill')
            ? '【改写大势】仙盟被迫封查血丹、正丹暴涨，随身【血煞筑基丹】亦须当众上缴封存，换额外六十灵石赏银。'
            : '【改写大势】借满城散修与执法队之眼掀翻黑市，全城正统丹药暴涨，安全脱身并赢得清名。',
        insightTags: (s) => [
          '得真相【灵脉倒流账】',
          '丹药行情暴涨',
          '谢无咎好感',
          ...(s.relics.includes('blood_foundation_pill')
            ? ['呈交血丹样本额外+60石']
            : ['正道声望']),
        ],
        effect: (s) => {
          const hadSample = s.relics.includes('blood_foundation_pill');
          return {
            renown: hadSample ? 20 : 14,
            righteous: 14,
            spiritStones: hadSample ? 185 : 125,
            removeRelics: hadSample ? ['blood_foundation_pill'] : undefined,
            addTags: ['blood_pill_whistleblower', 'merchant_fame'],
            addTruthClues: ['clue_vein_drain'],
            completeThreads: ['thread_blood_pill'],
            setFlags: {
              blood_pill_exposed: true,
              tianji_chamber_hostile: true,
              blood2_submitted_sample: hadSample,
            },
            companionUpdates: {
              xie_wujiu: {
                markSeen: true,
                affectionDelta: 14,
                setStage: 3,
                chronicle: '暴雨夜借公势同烧血丹暗坊，大火映红半座青岚城。他笑着说这是他生平最痛快的一笔险账。',
              },
              ...(s.companions.shen_qingshuang.met
                ? {
                    shen_qingshuang: {
                      affectionDelta: 6,
                    },
                  }
                : {}),
            },
            logSummary: hadSample
              ? '暴雨夜火烧血丹坊并当众呈交血煞丹样本铁证，夺得【灵脉倒流账】，获额外悬赏共百八十五灵石。'
              : '暴雨夜与谢无咎联手火烧血丹坊并借公势公开黑账，夺得【灵脉倒流账】，青岚丹价骤涨。',
          };
        },
        outcome: [
          (s) =>
            s.flags.blood2_submitted_sample
              ? '“烧！”赤焰符脱手！你顺势将蜡封的【血煞筑基丹】样本与罪证一并抛向破门而入的执法队。满街散修围观之下，天机筑基管事纵有杀心也不敢众目睽睽斩杀证人，只得铁青着脸弃坊遁走。执法队按例记你六十灵石赏金。'
              : '“烧！”你反手甩出一道赤焰符，谢无咎同时将几十卷血丹罪证散入雨夜长街！火龙冲天，赶到的仙盟执法队与围观散修瞬间堵死巷口，天机筑基管事纵然目眦欲裂也不敢当众杀人灭口，只得狠狠剜了你们一眼破瓦逃走。',
          '雨雾朦胧的屋檐上，谢无咎护着怀中那卷最要紧的【灵脉倒流账】，笑得肆意飞扬：“借满城众目当盾牌，筑基管事也只能干瞪眼！明日正丹必涨，咱们早先备下的货够赚一笔——更重要的是，总算顺藤摸瓜摸到总坛尾巴了。”',
          (s) =>
            s.flags.blood2_submitted_sample
              ? '加上谢无咎分来的一百二十五灵石红利，此夜实收一百八十五灵石。你们碰杯相约，待筑基之后再查明那些“上供灵石”究竟运往何处。'
              : '他分予你一百二十五灵石红利，与你相约待筑基之后，再查清青州矿脉究竟流向何方。',
        ],
        outcomeContinueLabel: '踏过雨夜灰烬 · 归返布局',
        bridgeNote: '暴雨夜火烧血丹坊后，全城正统丹药身价暴涨，你的名字已传遍青岚坊市。',
        next: 'act2_hub',
      },
      {
        id: 'blood2_blackmail_chamber',
        label: '密藏总账副本，径直推门与天机筑基大管事摊牌勒索灵石与上品筑基丹',
        subtext: (s) => evaluateCoercion(s, 'act2_tianji_steward').warningText,
        insightTags: (s) => {
          const ev = evaluateCoercion(s, 'act2_tianji_steward');
          return ev.canSucceed
            ? [
                `底牌已成：${ev.leverageSummary}`,
                s.relics.includes('foundation_pill') ? '易石共四百二十' : '240灵石+【上品筑基丹】',
                '正道好感下降',
              ]
            : [
                '【极险】无越阶战力/暗桩死手',
                ev.canSurviveFail ? '恐遭筑基管事重创逃亡' : '恐遭当场杀人灭口（陨落）',
              ];
        },
        effect: (s): ChoiceEffect => {
          const ev = evaluateCoercion(s, 'act2_tianji_steward');
          if (!ev.canSucceed) {
            if (!ev.canSurviveFail) {
              return {
                timeMonths: 0,
                setFlags: {
                  killed_by_silencing: true,
                  silencing_killer: '天机商行青岚分号筑基大管事',
                  silencing_context: 'act2_blood',
                  blood2_coercion_result: 'killed',
                },
                logSummary: '炼气之身无底牌强行拿账本要挟天机商行筑基大管事，惨遭当场格杀灭口。',
              };
            }
            return {
              timeMonths: 6,
              spiritStones: -Math.min(s.spiritStones, 60),
              might: -3,
              lifespanBonus: -3,
              addTruthClues: ['clue_vein_drain'],
              completeThreads: ['thread_blood_pill'],
              setFlags: {
                tianji_chamber_hostile: true,
                escaped_silencing_act2: true,
                blood2_coercion_result: 'escaped',
              },
              companionUpdates: {
                xie_wujiu: {
                  markSeen: true,
                  affectionDelta: -4,
                  chronicle: '你未备死手便强胁筑基管事，险些丧命密室，靠保命底牌负伤杀出雨巷。',
                },
              },
              logSummary: '无暗桩死手却强行拿账本要挟筑基大管事，遭对方暴起灭口，折寿三载、重伤逃出生天。',
            };
          }

          const hadPill = s.relics.includes('foundation_pill');
          const leveragePhrase =
            ev.switchOk && ev.powerOk
              ? '死手暗桩与越阶锋芒'
              : ev.switchOk
              ? '死手暗桩'
              : '越阶锋芒';
          return {
            spiritStones: hadPill ? 420 : 240,
            renown: 10,
            righteous: -16,
            worldly: 12,
            addTags: ['merchant_fame'],
            addRelics: hadPill ? undefined : ['foundation_pill'],
            addTruthClues: ['clue_vein_drain'],
            completeThreads: ['thread_blood_pill'],
            setFlags: {
              black_market_boom: true,
              blackmailed_tianji: true,
              blood2_pill_converted: hadPill,
              blood2_coercion_result: 'success',
              blood2_used_power: ev.powerOk,
              blood2_used_switch: ev.switchOk,
            },
            companionUpdates: {
              xie_wujiu: {
                markSeen: true,
                affectionDelta: 12,
                setStage: 3,
                chronicle: `你凭${leveragePhrase}逼退天机筑基管事，分账那夜他举杯叹服。`,
              },
              ...(s.companions.shen_qingshuang.met
                ? {
                    shen_qingshuang: {
                      affectionDelta: -8,
                      chronicle: '得知你借血丹黑账勒索天机商行私分重宝，她眼底泛起一层冷霜。',
                    },
                  }
                : {}),
              ...(s.companions.su_zhiwei.met && isSuZhiweiAlive(s)
                ? {
                    su_zhiwei: {
                      affectionDelta: -6,
                      chronicle: '听闻青岚血丹暗市未除反盛，你竟从中大发横财，她微叹一声未再多问。',
                    },
                  }
                : {}),
            },
            logSummary: hadPill
              ? `凭${leveragePhrase}反挟天机分号筑基管事，将多余筑基丹暗兑易石，共取四百二十灵石。`
              : `凭${leveragePhrase}反挟天机分号筑基管事，逼出二百四十灵石与【上品筑基丹】。`,
          };
        },
        outcome: [
          (s) => {
            if (s.flags.blood2_coercion_result === 'killed') {
              return '你推开密室门，将一页账本拍在案上欲逼对方出石封口。案后那名筑基后期大管事却合上账册，唇角泛起一丝市侩冷笑：“区区炼气小辈，没靠山、没后手，就敢拿一页孤账进天机密室讨价还价？杀你省下的封口费，比这笔账划算得多！”';
            }
            if (s.flags.blood2_coercion_result === 'escaped') {
              return '你刚把账页拍上茶案，那名筑基后期大管事便拨着玉算盘冷笑暴起：“区区炼气散修，连外头暗桩都没留，还敢拿孤账要挟老夫？拿你性命平账岂不更省事！”磅礴筑基威压瞬间碾碎半边木案，赤铜剑罡直劈咽喉！';
            }
            const hasBaibaoSwitch = Boolean(
              s.flags.xie_deadman_switch || s.flags.xie_allied
            );
            const switchDesc = hasBaibaoSwitch
              ? '百宝暗桩早已压了六份抄本'
              : '青岚暗市六处茶肆驿馆早已压了六份抄本';
            if (s.flags.blood2_used_switch && s.flags.blood2_used_power) {
              return `你推开密室，将账本副本拍在案上，周身凝练剑意震碎桌上茶盏。天机筑基管事刚欲暴起灭口，你冷笑弹指：“${switchDesc}，亥时三刻我若走不出南市，明日全城茶楼便会贴满你的罪证；你大可试试能不能在我捏碎传讯玉符前留住我！”`;
            }
            if (s.flags.blood2_used_switch) {
              return hasBaibaoSwitch
                ? '你推开密室拍出副本，天机筑基管事杀机骤起、剑已出鞘三寸。你却稳稳亮出百宝暗记：“早知你筑基修为捏死我易如反掌，所以我与百宝暗桩把六份抄本押在了城西六处据点，半个时辰我不去取回，全城散修与执法队都会瞧见你贪墨上供灵石的大罪！”'
                : '你推开密室拍出副本，天机筑基管事杀机骤起、剑已出鞘三寸。你神色不动，将六张茶肆寄存回执推上桌面：“早知你筑基修为捏死我易如反掌，所以我把六份散抄副本分押在城西六处暗市茶肆，半个时辰我不去取回，全城散修与执法队都会瞧见你贪墨上供灵石的大罪！”';
            }
            return '天机筑基管事本欲冷笑灭口，一掌拍来却骤然脸色大变！你体内爆发出的越阶锋芒竟硬生生震偏了他的筑基护体罡气，剑尖反指其咽喉半寸：“动静闹大把执法队引来，猜猜你我谁先见不得光？”';
          },
          (s) => {
            if (s.flags.blood2_coercion_result === 'killed') {
              return '筑基赤铜剑光如山压顶，你连护体灵气都未能撑过半息，胸口便已被剑气洞穿。雨声灌入窗棂，你倒在血泊里，最后看见那张账本被对方随手丢进炭盆烧成灰烬。';
            }
            if (s.flags.blood2_coercion_result === 'escaped') {
              return '生死一瞬，你拼死催动随身护命底牌硬挨了这一记剑罡，经脉如裂、呕血撞破后窗跌入雨巷！虽拼着折损三年寿元与数十灵石药资，总算保住性命及一页账纸，筑基丹与封口灵石早已成了泡影。';
            }
            return s.flags.blood2_pill_converted
              ? '管事眸底寒意森然，死死盯了你十息，终究投鼠忌器缓缓归剑入鞘。半个时辰后，对方奉上二百四十灵石与一枚【上品筑基丹】求封口；你怀中早备正丹，谢无咎顺手托暗坊易得一百八十灵石，共落四百二十灵石。'
              : '管事眸底寒意森然，死死盯了你十息，终究投鼠忌器缓缓归剑入鞘。不到半个时辰，对方乖乖奉上二百四十灵石与一枚【上品筑基丹】买你二人暂闭其口。';
          },
        ],
        outcomeContinueLabel: (s) =>
          s.flags.blood2_coercion_result === 'killed'
            ? '怀璧灭口 · 展卷终局'
            : s.flags.blood2_coercion_result === 'escaped'
            ? '带伤遁走 · 痛定思痛'
            : '收妥筹码 · 归返暗市',
        bridgeNote: (s) => {
          if (s.flags.blood2_coercion_result === 'escaped') {
            return '强胁筑基管事反遭灭口重创，你折寿养伤半年方愈，再不敢轻视境界鸿沟。';
          }
          const basis =
            s.flags.blood2_used_switch && s.flags.blood2_used_power
              ? '死手暗桩与越阶锋芒'
              : s.flags.blood2_used_switch
              ? '死手暗桩'
              : '越阶锋芒';
          return `你凭${basis}迫使天机分号低头吐出重资，暗市风声骤紧，正道故人却多有微词。`;
        },
        next: (s) =>
          s.flags.blood2_coercion_result === 'killed' ? 'ending_silenced' : 'act2_hub',
      },
      {
        id: 'blood2_quiet_evidence',
        label: '不惊动高阶管事，趁雨夜拓全灵脉赤字账与血丹样本，留作日后实证',
        subtext: '稳健查案路线：避开以弱搏强之险，完整留存物证并提升心境。',
        insightTags: ['稳妥取证', '得真相【灵脉倒流账】', '心境大进', '补布暗桩死手'],
        effect: {
          mind: 12,
          spiritStones: 75,
          renown: 6,
          addTruthClues: ['clue_vein_drain'],
          completeThreads: ['thread_blood_pill'],
          setFlags: {
            act2_deadman_switch: true,
            blood2_quiet_copied: true,
          },
          companionUpdates: {
            xie_wujiu: {
              markSeen: true,
              affectionDelta: 10,
              setStage: 3,
              chronicle: '暴雨夜你冷静劝住正面硬拼，完整拓下灵脉赤字总账后全身而退，他赞你极沉得住气。',
            },
          },
          logSummary: '暴雨夜未惊动天机筑基管事，悄然拓全【灵脉倒流账】与灰尘样本留作实证。',
        },
        outcome: [
          '“我们眼下只是炼气，不该拿性命替执法队打头阵。”你一把按住谢无咎，以留影拓纸飞速拓完三百年灵脉赤字账页，又用玉瓶封存一撮血丹灰尘，赶在筑基管事合围前顺着暗渠悄然撤离。',
          '雨巷深处，谢无咎抹去脸颊雨水低笑一声：“沉得住气。分号只是冰山一角，留着这本干净无缺的账底，等我们踏入筑基，再去青州找总坛算总账。”',
        ],
        outcomeContinueLabel: '藏妥账拓与样本 · 归返布局',
        bridgeNote: '你冷静拓全青岚灵脉亏空账册并安然退走，线索与实力俱未折损。',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 暗线三：青州怪疫与红尘岁月（苏知微长线） ====================
  act2_arc_plague_1: {
    id: 'act2_arc_plague_1',
    act: 'act2',
    title: '杏林疫火',
    subtitle: '卷二 · 青州怪疫（上）',
    location: '青州城外 · 避疫药棚',
    paragraphs: [
      (s) => {
        if (!isSuZhiweiAlive(s)) {
          return '静室闭关多年，再赴青州城外十里，当年的疫火早已熄作旧闻。当年那排避疫草棚翻修成了青砖药庐，药架后守着一名束发清秀的年轻医徒。';
        }
        const yrs = yearsSinceAgeMonths(s.ageMonths, s.companions.su_zhiwei.lastSeenAgeMonths);
        if (s.companions.su_zhiwei.met && yrs >= 2) {
          return `距离上次别过杏林，光阴竟已悄然滑过${toChineseYearNumber(yrs)}载。你已踏入炼气之境、容颜如初，可推开竹篱再见苏知微时，她眼下已有难以遮掩的倦色，鬓边一缕碎发被药烟熏得微枯。`;
        }
        return '青州城外十里已不见往日杏花盛景，只剩连绵的避疫草棚与昼夜不息的煎药黑烟。素衣挽袖的医女苏知微正在棚间奔走，声音已哑得不成样子。';
      },
      (s) => {
        if (!isSuZhiweiAlive(s)) {
          return s.companions.su_zhiwei.met
            ? '提起苏知微的名字，年轻医徒神色一黯，引你走到院后老杏树下一方素碑前：“师父多年前便积劳成疾安然去了。她临终前反复翻看青州怪疫旧案，嘱托若有一位名唤{{name}}的故人回来，务必要把这摞手抄医案转交。”'
            : '问起苏知微，年轻医徒眼圈一红。“去了。”他转身捧出一匣封存严密的麻纸手抄，“师父积劳成疾，临终把青州怪疫病案逐字誊完，说若有查疫的仙师路过，便请一观。”';
        }
        return s.companions.su_zhiwei.met || s.tags.includes('qingzhou_vow')
          ? '见你走近，苏知微愣了愣，眼底露出一丝疲惫而真切的笑：“你成仙师了。容貌一点也没老，真好。”'
          : '见你佩剑步入疫棚，苏知微先是一愣，听你报出姓名与查疫来意后，苦笑着抬袖一礼：“原是{{name}}仙师。这棚里疫气重，连累{{honorific}}走这一趟了。”';
      },
      (s) => {
        if (!isSuZhiweiAlive(s)) {
          return '翻开泛黄医案，字字沉静却叫人脊背发凉。那场横扫青州的怪疫专蚀身负微弱灵根的孩童与散修，似有异力隔空抽走其精气；唯独全无灵根的凡人守在病榻旁反倒安然无恙。纸页末行留着一行清秀批注：“怪疫认灵不认人，莫非北麓地底藏着专吸灵息之物？”';
        }
        return s.companions.su_zhiwei.met || s.tags.includes('qingzhou_vow')
          ? '她领你翻开厚厚一摞脉案，眉头深锁：“这怪疫极反常。凡有半丝灵根的孩童、散修，一入青州北麓便高热萎靡，像体中精气被隔空抽离。可像我这般全无灵根的凡人，日日守在病榻前反倒安然无恙。{{name}}，你说，这怪疫专找有灵窍之人下手，背后究竟是什么缘故？”'
          : '她领你翻开厚厚一摞脉案，眉头深锁：“这怪疫极反常。凡有半丝灵根的孩童、散修，一入青州北麓便高热萎靡，像体中精气被隔空抽离。可像我这般全无灵根的凡人，日日守在病榻前反倒安然无恙。{{honorific}}，你说，这怪疫专找有灵窍之人下手，背后究竟是什么缘故？”';
      },
    ],
    choices: [
      {
        id: 'plague1_fund_clinic',
        label: '留下一百灵石托车马搜罗乡野散存的清心药苗，并运灵力助她稳住重症病患',
        visible: (s) => isSuZhiweiAlive(s),
        requirement: { minSpiritStones: 100, lockReason: '需灵石 100' },
        insightTags: ['耗灵石救人', '苏知微深厚羁绊', '得真相【无灵之盲区】'],
        effect: (s) => ({
          spiritStones: -100,
          mind: 10,
          righteous: 14,
          worldly: 12,
          setRealm: nextQiRealm(s),
          addTags: ['qingzhou_guardian'],
          addTruthClues: ['clue_mortal_blindspot'],
          setFlags: { plague_arc_step1: true, funded_qingzhou_clinic: true },
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 15,
              setStage: 2,
              chronicle: '青州大疫中你慷慨解囊、不避凶险相助杏林，她深夜为你煮了碗桂花汤圆，久久未语。',
            },
          },
          logSummary: '掷百枚灵石相助苏知微抗击青州怪疫，从医案中悟得【无灵之盲区】真相。',
        }),
        outcome: [
          '你二话不说掏出一百灵石，托镇上车马分赴周边三县山村搜罗乡野散存的清心草药苗——凡俗山野初采的青草虽远不如坊市精炼入丹的灵草昂贵，却足以熬汤压住疫热；你又连续七昼夜以自身灵力替重症孩童护脉镇热。原本死气沉沉的药棚，终于第一次传出孩童退烧后的啼哭声。',
          '深夜疫棚熄灯后，苏知微端来两碗热腾腾的桂花汤圆。她看着你依旧年轻如昔的侧脸，轻声道：“若是修仙界的人都像你一样，长生或许也没那么冷冰冰的。”而你握着那卷医案，心头却掀起惊涛骇浪。为何唯有毫无灵根者不被天幕窥视？',
        ],
        outcomeContinueLabel: '珍藏医案线索 · 暂别杏林',
        bridgeNote: '你倾资相助青州杏林后，苏知微医案中【无灵之盲区】的异象令你久久难平。',
        next: 'act2_hub',
      },
      {
        id: 'plague1_help_labor',
        label: (s) =>
          s.relics.includes('qingzhou_silver_needle')
            ? '取出【杏林银针匣】驻留药棚四月，施针逼毒并共理医案'
            : '手头灵石紧俏，便亲身留驻杏林半载以灵气逼毒、照料伤患',
        visible: (s) => isSuZhiweiAlive(s),
        subtext: (s) =>
          s.relics.includes('qingzhou_silver_needle')
            ? '银针定脉事半功倍，省去两月光阴且心境更稳。'
            : '虽耗去半年光阴与精力，却也能护住大半病人并记下宝贵医案。',
        insightTags: (s) => [
          s.relics.includes('qingzhou_silver_needle') ? '银针省时至4月' : '耗时半载',
          '苏知微好感',
          '得真相【无灵之盲区】',
        ],
        effect: (s) => {
          const hasNeedle = s.relics.includes('qingzhou_silver_needle');
          return {
            timeMonths: hasNeedle ? 4 : 6,
            mind: hasNeedle ? 15 : 12,
            righteous: 10,
            worldly: 10,
            setRealm: nextQiRealm(s),
            addTags: ['qingzhou_guardian'],
            addTruthClues: ['clue_mortal_blindspot'],
            setFlags: { plague_arc_step1: true, plague1_used_needle: hasNeedle },
            companionUpdates: {
              su_zhiwei: {
                meet: true,
                markSeen: true,
                affectionDelta: 13,
                setStage: 2,
                chronicle: '你放下仙途争逐，在青州疫棚陪她熬过漫长苦夜。',
              },
            },
            logSummary: '于青州杏林驻守相助苏知微，共参怪疫异象，得【无灵之盲区】线索。',
          };
        },
        outcome: [
          (s) =>
            s.flags.plague1_used_needle
              ? '你解下剑囊，取出她早年相赠的【杏林银针匣】按穴渡气。银针引脉极省灵力，不过四月便稳住了大半重症疫棚，气海反在反复温养间水磨般跨过一重炼气关隘。'
              : '你解下剑囊，换上粗布衣裳在药棚一住便是整整半载。白日煎药抬水，夜里与苏知微对着油灯一页页核对脉案。在反复以灵力替人祛寒的过程里，你的气海竟也水磨般跨过了一重炼气关隘。',
          '疫势稍缓，苏知微眼里却多了一抹难以化开的疲惫。临别时她塞给你一份亲手抄录的【无灵医案】，嘱咐你千万保重，自己却仍坚持守在最后几间病棚不肯歇息。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.plague1_used_needle
            ? '辞别四月杏林 · 重回尘途'
            : '辞别半载杏林 · 重回尘途',
        bridgeNote: (s) =>
          s.flags.plague1_used_needle
            ? '青州疫棚四月相伴令你道心愈发澄明，可苏知微日渐消瘦的身影仍牵动着你的心弦。'
            : '青州疫棚半载相伴令你道心愈发澄明，可苏知微日渐消瘦的身影仍牵动着你的心弦。',
        next: 'act2_hub',
      },
      {
        id: 'plague1_record_leave',
        label: '抄录这份惊人医案后婉言告辞，凡尘劫难非我一人之力可挽',
        subtext: '求道者须斩牵挂，你带走了最重要的线索。',
        visible: (s) => isSuZhiweiAlive(s),
        insightTags: ['冷眼出世', '心境', '得真相【无灵之盲区】'],
        effect: {
          mind: 8,
          worldly: -14,
          addTruthClues: ['clue_mortal_blindspot'],
          setFlags: { plague_arc_step1: true, left_qingzhou_coldly: true },
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: -10,
              setStage: 2,
              chronicle: '你抄录医案后便匆匆离去，她站在药烟里轻声道了句“仙师珍重”。',
            },
          },
          logSummary: '记下青州怪疫【无灵之盲区】异象后抽身离去，未深陷红尘疫局。',
        },
        outcome: [
          '你迅速将“唯无灵者不受侵染”的核心规律誊抄入玉简，旋即起身拱手告辞：“苏姑娘，此事牵扯天道大势，非区区草药可解，我须尽早回青岚筹备破境。”',
          '苏知微手里那半碗刚晾温的药茶微微晃了晃。她没有挽留，只是垂眸轻轻笑了笑：“是啊，仙师本就该往云端去，是我耽误你了。珍重。”你转身踏出浓重药烟，背后再无脚步声追来。',
        ],
        outcomeContinueLabel: '收好医案玉简 · 抽身离去',
        bridgeNote: '你带着【无灵之盲区】的惊人医案离开了青州，只是偶尔想起药烟中那道孤单背影。',
        next: 'act2_hub',
      },
      {
        id: 'plague1_read_late_records',
        label: '于老杏树碑前焚香三拜，抄录她遗留的【无灵医案】后悄然离去',
        subtext: '枯坐数十载已错过凡尘一世，唯有带走她用性命记下的真相。',
        visible: (s) => !isSuZhiweiAlive(s),
        insightTags: ['得真相【无灵之盲区】', '心境沉凝', '收束青州疫线'],
        effect: (s) => ({
          mind: 14,
          worldly: 4,
          addTruthClues: ['clue_mortal_blindspot'],
          completeThreads: ['thread_qingzhou_plague'],
          setFlags: {
            plague_arc_step1: true,
            su_zhiwei_passed: true,
            arc_plague_active: false,
          },
          companionUpdates: s.companions.su_zhiwei.met
            ? {
                su_zhiwei: {
                  markSeen: true,
                  markDeceased: true,
                  silentNotice: true,
                  chronicle: '你闭关数十载后再返青州杏林，故人早已积劳辞世，只余老杏树下一碑与半生无灵医案。',
                },
              }
            : undefined,
          logSummary: '枯坐数十年后再返青州，苏知微早已辞世，于碑前收下【无灵之盲区】遗案。',
        }),
        outcome: [
          '你在老杏树下立了半日。山风吹落满地碎白杏瓣，将碑角轻轻盖住。修士一闭关便是半生，凡人的一辈子就在石门开合间无声烧完了。',
          '你替碑前添了三炷清香，将那卷【无灵医案】收入袖中。纸背墨痕犹新，唯余心头寒意未散：怪疫专蚀灵窍、独漏凡人，背后究竟藏着何等隐秘？',
        ],
        outcomeContinueLabel: '拜别素碑 · 重返尘途',
        bridgeNote: '青州故人已成冢中旧影，你怀揣【无灵之盲区】遗案折返青岚。',
        next: 'act2_hub',
      },
    ],
  },

  act2_arc_plague_2: {
    id: 'act2_arc_plague_2',
    act: 'act2',
    title: '白发与长生',
    subtitle: '卷二 · 青州怪疫（终章）',
    location: '青州城外 · 杏林草庐',
    checkpoint: true,
    checkpointLabel: '卷二 · 青州杏林宿命抉择',
    paragraphs: [
      (s) =>
        isSuZhiweiAlive(s)
          ? '又过数月。青州怪疫在一次剧烈的地底灵脉塌陷后终于缓缓退去，可连年操劳加上为护住几名垂死孩童强行吸出寒毒，苏知微终究倒在了药炉旁。'
          : '石门开合之间，数十年光阴无声倾泻。当你再度回到青州城外杏林，昔日疫火早已消散多年，只剩一间打扫得干干净净的空草庐与树下一抔青冢。',
      (s) => {
        if (!isSuZhiweiAlive(s)) {
          return '守庐的年轻医徒红着眼眶递来一只素布小包，里头是晒干的桂花与几页墨迹清秀的残笺：“师父临走前说，长生客闭关动辄数十载，您若迟了些回来，莫要自责。”';
        }
        const suAge = getAgeYears(s.ageMonths) + 4;
        const agePhrase =
          suAge < 30
            ? '不过二十余岁的年纪'
            : suAge < 40
            ? '不过三十余岁的年纪'
            : suAge < 60
            ? '尚不及花甲之年'
            : '已是花甲之年';
        return s.tags.includes('origin_orphan')
          ? `你推开竹门时，她靠在藤椅上盖着厚棉被，${agePhrase}，两鬓已生出刺眼的霜白。而你站在灯影里，气海丰盈、面容如初，一如当年在青岚南市檐下听雨时的模样。`
          : `你推开竹门时，她靠在藤椅上盖着厚棉被，${agePhrase}，两鬓已生出刺眼的霜白。而你站在灯影里，气海丰盈、面容如初，一如当年十六岁离乡时的模样。`;
      },
      {
        when: (s) => isSuZhiweiAlive(s),
        text: '她抬头看你，指尖摩挲着茶杯沿，笑得比山风还轻：“{{name}}，凡人的一辈子原是这么短啊……你若筑了基，便有两百多年好活。我这副身子怕是熬不过几个寒暑了。可别为我耽误了你的仙途。”',
      },
      {
        when: (s) => isSuZhiweiAlive(s),
        text: '炉火噼啪一响，檐雨打湿了青阶。她搁在膝上的手背瘦得透出青筋，你腰间剑柄却还冰凉。',
      },
    ],
    choices: [
      {
        id: 'plague2_use_longevity_dew',
        label: '取出倾尽财力求来的【九转延寿露】，亲手喂她服下逆天续命三十载',
        subtext: '以稀世地乳换她病骨重春、延寿三十载；药力霸道，无灵凡躯毕生只堪承此一瓶，复饮必致经脉寸断。',
        visible: (s) => isSuZhiweiAlive(s) && s.relics.includes('longevity_dew'),
        insightTags: ['消耗【九转延寿露】', '苏知微至深羁绊', '保她安康入后途'],
        effect: (s) => ({
          removeRelics: ['longevity_dew'],
          mind: 14,
          righteous: 10,
          worldly: 14,
          completeThreads: ['thread_qingzhou_plague'],
          setFlags: {
            su_zhiwei_saved_longlife: true,
            arc_plague_active: false,
          },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 24,
              setStance:
                s.companions.su_zhiwei.stance === 'bonded' ||
                s.companions.su_zhiwei.affection + 24 >= 75
                  ? 'bonded'
                  : 'confidant',
              setStage: 3,
              chronicle: '油尽灯枯之际，你以稀世【九转延寿露】为她洗去沉疴、续命三十载，约定来日山河重逢。',
            },
          },
          logSummary: '以【九转延寿露】救活油尽灯枯的苏知微，护住这份红尘深情，继续踏上问仙之路。',
        }),
        outcome: [
          '“谁说凡人的命就只能任由老天定？”你拔开玉瓶塞子，一缕清冽生机瞬间盈满整间草庐。苏知微认出那是坊市千金难买的延寿奇珍，急忙推拒，却被你轻柔而坚定地按住手背，一点点喂她服下。',
          '半个时辰后，温润地乳化作暖流游遍她的肺腑，苍白如纸的脸颊竟肉眼可见地泛起血色，连折磨她数月的寒咳都彻底平息！你替她切过脉象，知这地乳药力霸道，无灵凡躯毕生只堪承此一瓶，再多一滴便会经脉寸断；可仅这一瓶，也足以替她硬生生续出三十载安康阳寿。她怔怔摸着自己重新温热起来的掌心，泪珠大颗滚落下来，哽咽道：“你把这样贵重的东西给了我……{{name}}，那你一定要平安筑基，不许食言，我在杏林等你回来。”',
          '雨声渐停，你替她重新燃旺炭炉，第一次觉得脚下的长生路不再那么孤单。',
        ],
        outcomeContinueLabel: '定下重逢之约 · 昂首归途',
        bridgeNote: '【九转延寿露】已替苏知微续命三十载，你与她约定筑基之后再回青州看杏花。',
        next: 'act2_hub',
      },
      {
        id: 'plague2_spend_stones_medicine',
        label: (s) =>
          s.flags.funded_qingzhou_clinic
            ? '再出一百灵石延请青州府名医并以本命灵气替她温养肺腑'
            : '散尽一百八十灵石延请青州府名医并以本命灵气替她温养肺腑',
        subtext: (s) =>
          s.flags.funded_qingzhou_clinic
            ? '你先前已掷百石捐药，丹阁老医感念义举仅收药材成本百石。'
            : '以重金请动丹阁老医并耗真元护脉，替她稳住十余载安宁光阴。',
        visible: (s) => isSuZhiweiAlive(s),
        requirement: {
          custom: (s) => {
            const cost = s.flags.funded_qingzhou_clinic ? 100 : 180;
            return s.spiritStones >= cost
              ? { ok: true }
              : { ok: false, reason: `需灵石 ${cost}` };
          },
        },
        insightTags: (s) => [
          s.flags.funded_qingzhou_clinic ? '义举折价 100 灵石' : '耗 180 灵石',
          '稳住苏知微性命',
          '苏知微深厚羁绊',
        ],
        effect: (s) => {
          const cost = s.flags.funded_qingzhou_clinic ? 100 : 180;
          return {
            spiritStones: -cost,
            mind: 10,
            worldly: 10,
            completeThreads: ['thread_qingzhou_plague'],
            setFlags: {
              su_zhiwei_stabilized: true,
              arc_plague_active: false,
            },
            companionUpdates: {
              su_zhiwei: {
                markSeen: true,
                affectionDelta: 16,
                setStage: 3,
                chronicle: '你耗费重金与真元将她从鬼门关拉回，她握着你的袖口泣不成声。',
              },
            },
            logSummary: s.flags.funded_qingzhou_clinic
              ? '再出百石请名医并耗真元稳住苏知微沉疴，暂留她十余载安宁光阴。'
              : '散财百八十灵石并耗费真元稳住苏知微沉疴，暂留她十余载安宁光阴。',
          };
        },
        outcome: [
          (s) =>
            s.flags.funded_qingzhou_clinic
              ? '你耗去两张神行符星夜兼程，数日内自青州府丹阁请来老医。老医久闻你先前掷百石救疫之义，只收了百块灵石药材本钱便随你赶赴杏林，又经你整整三日以炼气真元替她逼出肺腑寒毒，终究硬生生将她从鬼门关前拽了回来。'
              : '你耗去两张神行符星夜兼程，数日内散尽一百八十块灵石自青州府丹阁请来老医，又整整三日以自身炼气真元替她一点点逼出肺腑寒毒。虽比不上延寿神药，终究硬生生将她从鬼门关前拽了回来。',
          '苏知微醒来时，见你眼底布满血丝，忍不住攥紧你的袖口泣不成声：“值什么……我这副凡胎俗骨，值得你散尽家财去救吗？”你只替她拭去泪痕，轻声答她：“灵石散了还能再赚，人没了，这世间就真的少了一盏灯。”',
        ],
        outcomeContinueLabel: '安顿好杏林 · 重整仙途',
        bridgeNote: '你散尽重金终究稳住了苏知微的性命，可岁月无情，你深知自己必须尽快踏入更高境界。',
        next: 'act2_hub',
      },
      {
        id: 'plague2_stay_forever_ending',
        label: '【红尘抉择】仙门冷酷、长生孤寂，你解下佩剑，愿散功留守杏林陪她走完凡尘一生',
        subtext: '放弃筑基与修仙之途，直接收束为温情独立结局【青州烟火】。',
        visible: (s) => isSuZhiweiAlive(s) && s.companions.su_zhiwei.affection >= 20,
        insightTags: ['步入独立结局【青州烟火】'],
        effect: {
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 30,
              setStance: 'bonded',
              chronicle: '你为她停下了逐仙的脚步，青州杏林从此多了一盏共守白头的灯。',
            },
          },
          logSummary: '放弃长生仙途，留守青州杏林陪伴苏知微共度人间烟火。',
        },
        outcome: [
          '你沉默地走到药案前，解下陪伴多年的长剑与储物囊，轻轻放在了满是药香的木桌上。“两百年的孤身长生，我不要了。”',
          '苏知微浑身一震，不可置信地抬头望你。你蹲下身握住她微凉的手，将最后一缕灵气化作温和春风替她暖身、顺势逼散肺腑寒毒，然后任由一身修为缓缓散归夜雨。从此不再逆天争命，只陪她看花开花落、共守白头。',
        ],
        outcomeContinueLabel: '展卷终局 · 【青州烟火】',
        next: 'ending_qingzhou_hearth',
      },
      {
        id: 'plague2_farewell_dao',
        label: '替她掖好被角，守过这一夜细雨，天明后忍痛转身继续问仙',
        subtext: '唯有修至更高境界，或许才真有打破生死与天命的资格。',
        visible: (s) => isSuZhiweiAlive(s),
        insightTags: ['苍凉心境大进', '出世', '苏知微遗憾离别'],
        effect: (s) => ({
          mind: 16,
          worldly: -10,
          completeThreads: ['thread_qingzhou_plague'],
          setFlags: {
            su_zhiwei_fading: true,
            arc_plague_active: false,
          },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: s.flags.left_qingzhou_coldly ? 2 : 6,
              setStage: 3,
              chronicle: s.flags.left_qingzhou_coldly
                ? '细雨长夜你替她添了一宿炭火，天明后悄然留书离去，两人之间仍隔着一道冷雾。'
                : '夜雨相伴至天明，她笑着送你出门，却没敢看你远去的背影。',
            },
          },
          logSummary: '伴病重的苏知微坐尽细雨长夜，怀着沉重红尘之念重返仙途。',
        }),
        outcome: [
          (s) =>
            s.flags.left_qingzhou_coldly
              ? '那一夜谁也没有多话。你替她添了一宿炭火，听着檐外细雨打阶。天色擦白时，她已在棉被里沉沉睡去。'
              : s.tags.includes('qingzhou_vow')
              ? '那一夜你们没再提仙凡生死。你替她添了一宿炭火，听着檐外细雨，聊起十四岁那年青州城外的桂花与旧事，仿佛光阴真停在了旧梦里。'
              : '那一夜你们没再提仙凡生死。你替她添了一宿炭火，听着檐雨滴阶，只捡着疫棚里几桩琐事与草药名目慢慢叙话。',
          '天色微明，你替熟睡的她掖好被角，留下一纸道别，转身步入清晨薄雾。心口空落落的，道心反倒在这一刻清寒如冰。若不能站到足够高的地方，便永远留不住想留的人。',
        ],
        outcomeContinueLabel: '踏入清晨薄雾 · 忍痛问仙',
        bridgeNote: '青州细雨那一夜的告别沉重如山，你的心境在痛楚中骤然蜕变，唯余破境之念。',
        next: 'act2_hub',
      },
      {
        id: 'plague2_late_mourning',
        label: '在青冢前接过干桂花与残笺，默坐半日后挥袖辞别杏林',
        subtext: '数十年闭关已隔阴阳，唯余一缕旧香随你入道。',
        visible: (s) => !isSuZhiweiAlive(s),
        insightTags: ['心境澄明', '收束青州疫线'],
        effect: (s) => ({
          mind: 16,
          worldly: 4,
          completeThreads: ['thread_qingzhou_plague'],
          setFlags: {
            su_zhiwei_passed: true,
            arc_plague_active: false,
          },
          companionUpdates: s.companions.su_zhiwei.met
            ? {
                su_zhiwei: {
                  markSeen: true,
                  markDeceased: true,
                  silentNotice: true,
                  chronicle: '数十年闭关后再临杏林，她早已安然辞世，唯留干桂花与一纸残笺托徒转交。',
                },
              }
            : undefined,
          logSummary: '数十年闭关后再返青州杏林，故人已逝，独对青冢收下干桂花与残笺。',
        }),
        outcome: [
          '残笺字迹清秀克制，只写着城外病棚全撤、药田已托给阿芸打理，末行轻轻搁了一句：“望你早日筑基，莫忘当年桂花香。”',
          '你在坟前坐到日落西山，把那小包晒干的桂花贴身收进怀里。凡人岁月如露如电，长生路却还漫长。',
        ],
        outcomeContinueLabel: '收好桂花残笺 · 重返尘途',
        bridgeNote: '杏林草庐已成旧梦，你携苏知微遗留的干桂花与残笺重归青岚。',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 暗线四：地底古脉与残魂往事（苍溟长线） ====================
  act2_arc_vein_1: {
    id: 'act2_arc_vein_1',
    act: 'act2',
    title: '地脉逆阵',
    subtitle: '卷二 · 青州古脉（上）',
    location: '青州北麓 · 地底干涸灵窟',
    paragraphs: [
      '顺着夜半震鸣寻入青州北麓的断崖裂隙，地下百丈处竟豁然开朗。这里曾是一条足够养活三座大宗的上品灵脉，如今岩壁却像被活生生吸干血肉的枯骨，只余满地碎裂的灰白灵晶。',
      '更令你脊背发寒的，是整条灵脉岩壁上被人用神通硬生生凿出的巨型青铜符纹！那些符纹丝毫不见聚灵阵的回旋走势，反如亿万根倒刺扎入岩心，将大地最后的灵息笔直抽向头顶苍穹！',
      {
        when: (s) => s.companions.cang_ming.met,
        text: '焦黑断玉剧烈震颤，苍溟的声音第一次没了戏谑，只剩浸透三千年恨意的沙哑：“果然还在运转……这青铜阵纹根本不是聚灵，是在把整条地脉的灵气往九霄倒抽！三千年前那场大劫，根本就没结束！”',
      },
      {
        when: (s) => !s.companions.cang_ming.met,
        text: '细看青铜阵眼的断口，一道三千年前的古老剑痕把阵纹劈开半尺，缝隙里卡着半枚被天雷灼黑的古玉。你伸手将它撬出来的刹那，玉身骤烫，一道沧桑而孤傲的男声顺着掌心灵力撞入识海：“……终于有人摸进支眼了。抓紧了，本座苍溟，替你卸开这阵眼余压！”',
      },
    ],
    choices: [
      {
        id: 'vein1_study_sigil',
        label: '忍着灵压临摹逆抽阵纹，并撬下一枚阵眼剥落的灰白玉片',
        insightTags: ['得真相【地脉逆抽阵纹】', '得【上界落尘玉片】', '苍溟结缘'],
        effect: (s) => ({
          might: 8,
          mind: 10,
          setRealm: nextQiRealm(s),
          addTags: ['vein_witness'],
          addRelics: ['heaven_dust_shard', 'charred_jade_relic'],
          addTruthClues: ['clue_ancient_vein_sigil'],
          setFlags: { vein_arc_step1: true, cangming_awake: true },
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 12,
              setStage: 2,
              chronicle: '地底枯脉残阵前与你共睹逆汲支眼，见你无惧灵压而拓阵取证，收起几分傲色。',
            },
          },
          logSummary: '深入青州地底灵窟目睹逆向汲灵大阵，获【地脉逆抽阵纹】与【上界落尘玉片】。',
        }),
        outcome: [
          '地底灵压如山崩般碾在肩头，你却咬破舌尖顶着气血翻涌，将岩壁上最核心的逆抽符纹一一拓入脑海，反手以剑尖从青铜阵眼撬下一枚冰冷刺骨的【上界落尘玉片】！',
          '阵眼剧震欲塌，苍溟冷喝一声催动残识护着你疾掠出洞。站在断崖山风里，苍溟收起几分孤傲：“有胆魄。连上界落尘都敢伸手去掰……等下次你准备好，我带你看看三千年前天门初开那夜的真正模样。”',
        ],
        outcomeContinueLabel: '收好上界玉片 · 攀出古脉裂隙',
        bridgeNote: '你亲眼见证了青州地底的逆向抽灵残阵，怀中【上界落尘玉片】与断玉正隐隐共鸣。',
        next: 'act2_hub',
      },
      {
        id: 'vein1_salvage_crystals',
        label: '听从苍溟指点，借阵眼短暂停歇之机抢挖一袋残存灵脉余晶',
        insightTags: ['大额灵石', '得真相【地脉逆抽阵纹】', '苍溟好感'],
        effect: (s) => ({
          spiritStones: 165,
          might: 6,
          setRealm: nextQiRealm(s),
          addTags: ['vein_witness'],
          addRelics: ['charred_jade_relic'],
          addTruthClues: ['clue_ancient_vein_sigil'],
          setFlags: { vein_arc_step1: true, cangming_awake: true },
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 14,
              setStage: 2,
              chronicle: '他指点你虎口夺食挖出灵脉余晶，笑称“既要掀翻旧局，总得先填饱肚子”。',
            },
          },
          logSummary: '于地脉逆阵前借苍溟指点抢得百六十五灵石，洞悉【地脉逆抽阵纹】之秘。',
        }),
        outcome: [
          '“左三丈，岩缝底下还有几块没被抽干的灵晶，趁阵纹换气只有二十息，快挖！”在苍溟精准的指点下，你手起剑落连撬带卷，在青铜阵纹再度轰鸣前惊险抢出足足折合一百六十五块灵石的灵脉余晶！',
          '狼狈逃出地窟后，你扶着山壁喘息，苍溟却在识海里畅快大笑：“哈哈哈哈，从九霄嘴里抢食吃，痛快！记着这笔债，等下次再来这枯脉深处，本座给你看场更大的旧戏。”',
        ],
        outcomeContinueLabel: '满载灵晶脱险 · 归返整备',
        bridgeNote: '你自青州地底逆阵前虎口夺食满载而归，断玉中苍溟似乎还有一段三千年前的记忆要向你敞开。',
        next: 'act2_hub',
      },
      {
        id: 'vein1_suppress_soul',
        label: '冷眼压下断玉躁动，以神识强截一缕逆阵灵精反哺己身，绝不听残魂摆布',
        subtext: '对来历不明的三千年残魂步步设防，以己为先。',
        insightTags: ['强压残魂', '修为与心境', '苍溟芥蒂'],
        effect: (s) => ({
          might: 10,
          mind: 6,
          righteous: -8,
          setRealm: nextQiRealm(s),
          addTags: ['vein_witness'],
          addRelics: ['charred_jade_relic'],
          addTruthClues: ['clue_ancient_vein_sigil'],
          setFlags: { vein_arc_step1: true, cangming_awake: true, cangming_suppressed: true },
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: -14,
              setStage: 2,
              chronicle: '地底枯脉阵前你强压断玉残识、独截灵精，令他对你戒心顿生。',
            },
          },
          logSummary: '深入青州地底目睹【地脉逆抽阵纹】，冷眼压制断玉残魂并独截灵精脱身。',
        }),
        outcome: [
          '你根本不理会识海里苍溟的喝阻，反手以灵力锁死断玉震颤，借逆阵停顿的刹那生生截下一缕残余地脉精气纳入气海！',
          '跃出断崖后，焦黑断玉里传来一声森冷短嗤：“好一个防人如防贼的小辈。你既信不过本座，便莫怪本座日后也留着三分余地。”山风寂寂，你收起断玉，只觉得攥在自己手里的修为比任何口头盟约都更踏实。',
        ],
        outcomeContinueLabel: '收玉出窟 · 归返整备',
        bridgeNote: '你在地底枯脉强压断玉残识独截灵精，与苍溟之间已横生裂痕。',
        next: 'act2_hub',
      },
    ],
  },

  act2_arc_vein_2: {
    id: 'act2_arc_vein_2',
    act: 'act2',
    title: '长明元年之夜',
    subtitle: '卷二 · 青州古脉（终章）',
    location: '识海幻境 · 三千年前碎天台',
    checkpoint: true,
    checkpointLabel: '卷二 · 苍溟三千年记忆回响',
    paragraphs: [
      '再临枯脉深处，你以灵力催动焦黑断玉，刹那间天地倒转，你被拉入了苍溟尘封三千年的记忆碎片。',
      '眼前哪有什么史书记载的祥瑞飞升。苍穹裂开一道金色巨口，那位最先登仙的“长明真仙”竟从金光中折身垂目，脸上全无得道欢喜，唯余深骨骇然——他临闭天门前嘶声狂笑，原来九霄之上并非无劫乐土，上界仙庭早已同陷大道衰朽、并无真正长生，唯靠熬炼下界合道元神方能续命。为求自己在上界苟活，他踩着同门尸骨反手钉下锁天大阵，将九州彻底封作三千年一熟的封闭丹炉。',
      '苍溟与八位同袍横剑阻拦，满天金光如熔炉倾泻！旧世护界主脉在一息间被彻底抽空，余脉此后须耗数百年方能缓过几分元气。滚滚炉火之中，苍溟八位同袍连同整片碎天台尽数化作飘散天地的惨白灰烬——那正是上界仙炉炼尽元神后排回下界的余灰，世称「长生烬」。唯苍溟一缕不甘残魂封入断玉，坠落凡尘。',
      (s) =>
        s.flags.cangming_suppressed
          ? '幻境散尽。苍溟的虚影第一次清清楚楚凝在你身前，黑衣染灰，断剑横膝。“这就是长明历的来历。”他眼底透出倦意，“你我虽互相提防，可既摸进这枯脉深处，三千年的血账你也绕不开了。日后修至高处，是帮我重塑肉身一起斩那扇天门，还是怕了，趁早把烂玉扔进深潭？”'
          : s.flags.cangming_taught_qi || s.tags.includes('cangming_pact')
          ? '幻境散尽。苍溟的虚影第一次清清楚楚凝在你身前，黑衣染灰，断剑横膝。“这就是长明历的来历。”他神色极倦，“我教你的功法、给你的眼界，从不是白给的。日后修至高处，是帮我重塑肉身一起斩那扇天门，还是怕了，趁早把烂玉扔进深潭？”'
          : '幻境散尽。苍溟的虚影第一次清清楚楚凝在你身前，黑衣染灰，断剑横膝。“这就是长明历的来历。”他神色极倦，“我指点你的脉路、借给你的眼界，从不是白给的。日后修至高处，是帮我重塑肉身一起斩那扇天门，还是怕了，趁早把烂玉扔进深潭？”',
    ],
    choices: [
      {
        id: 'vein2_swear_with_cangming',
        label: '握紧焦黑断玉，与苍溟立誓来日必助他重塑真身、共斩天门',
        subtext: '与三千年前的逆天遗民深度绑定，彼此交付后背。',
        insightTags: ['得真相【长明元年之夜】', '苍溟至深羁绊', '修为与心境大增'],
        effect: (s) => ({
          might: 12,
          mind: 12,
          addTags: ['cangming_pact'],
          addTruthClues: ['clue_changming_night'],
          completeThreads: ['thread_ancient_vein'],
          setFlags: { cangming_vow_sworn: true },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: 16,
              setStance:
                s.companions.cang_ming.stance === 'bonded' ||
                s.companions.cang_ming.affection + 16 >= 75
                  ? 'bonded'
                  : 'confidant',
              setStage: 3,
              chronicle: '共历长明元年记忆烬火后，你与他定下重塑肉身、查明并斩断旧债之重誓。',
            },
          },
          logSummary: '亲历【长明元年之夜】记忆，与苍溟立下重塑肉身、共斩天门之重誓。',
        }),
        outcome: [
          '你伸手穿过炽热虚影，攥紧焦黑断玉：“长明元年他们没斩断的门，这一世我陪你再斩。重塑肉身的奇物我替你找，天门血债一起算。”',
          '苍溟怔住了。那双孤寂太久的眸子头一回褪尽防备与戾气。他起身以断剑轻点你眉心，一缕太古剑意直入丹田：“好！{{name}}，本座这条残魂赌在你身上了。先去把筑基关漂漂亮亮劈开！”',
        ],
        outcomeContinueLabel: '携千年重誓 · 步出古脉',
        bridgeNote: '你与苍溟立下了重塑肉身、共斩天门之重誓，太古剑意在气海中隐隐呼啸。',
        next: 'act2_hub',
      },
      {
        id: 'vein2_cautious_deal',
        label: '坦言自己并非救世圣人，但只要利益一致，愿继续互惠同行',
        subtext: '不轻易交出全部信任，保持平等的筹码与清醒。',
        insightTags: ['得真相【长明元年之夜】', '苍溟知己', '心境稳固'],
        effect: {
          mind: 14,
          might: 8,
          addTruthClues: ['clue_changming_night'],
          completeThreads: ['thread_ancient_vein'],
          setFlags: { cangming_pragmatic_deal: true },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: 16,
              setStance: 'confidant',
              setStage: 3,
              chronicle: '你不唱高调、只论等价筹码，他反倒朗声大笑：“好！不轻信人，才活得到化神！”',
            },
          },
          logSummary: '得知【长明元年之夜】真相后保持清醒，与苍溟确立平等互利之约。',
        },
        outcome: [
          '“我不想变成九霄金光下的劫灰，也不愿盲目替谁卖命。”你直视苍溟的虚影，神色从容，“但既然你我都要掀翻天门，这桩交易便成立。你出古法眼界，我出性命修为与寻宝之力，各取所需。”',
          '苍溟先是一滞，旋即放声大笑，笑声震得古窟落尘纷纷：“说得好！三千年前我那些同袍，就是太轻信誓言才死得那么惨！就冲你这份清醒，这一程本座陪你走到底！”',
        ],
        outcomeContinueLabel: '定下平等盟约 · 返回尘世',
        bridgeNote: '揭开【长明元年之夜】的血色旧事后，你与苍溟确立了彼此敬重的平等盟约。',
        next: 'act2_hub',
      },
      {
        id: 'vein2_cold_distrust',
        label: '冷笑直言他不过是败于天门的残魂，此玉只作探路器物，绝不许诺重塑肉身',
        subtext: '彻底撕破温情面纱，将彼此关系推向互相戒备与猜忌的边缘。',
        insightTags: ['得真相【长明元年之夜】', '苍溟大幅降好感', '冷酷孤行'],
        effect: {
          mind: 12,
          might: 10,
          righteous: -10,
          addTruthClues: ['clue_changming_night'],
          completeThreads: ['thread_ancient_vein'],
          setFlags: { cangming_distrusted: true },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: -18,
              setStance: 'rival',
              setStage: 3,
              chronicle: '长明元年记忆回响之后，你冷言只视断玉为探路器物，三千年孤魂眸中寒意骤凝。',
            },
          },
          logSummary: '洞悉【长明元年之夜】旧事后拒绝承诺为苍溟塑躯，彼此心生深重猜忌。',
        },
        outcome: [
          '“三千年前连九位剑尊联手都化作灰烬，如今凭一缕残魂便想拿我当复仇的替死鬼？”你手指摩挲过冰凉的断玉，嗓音淡漠，“记忆我看完了，这块玉我会带着，至于塑不塑身，全看我日后心情。”',
          '黑衣虚影定定盯了你三息，周身剑气骤然冷得像万载寒冰，随即寸寸缩回断玉：“好，真好。三千年后的小辈果然比旧日狠心。记住你今天说的话，别叫本座逮到反客为主的那一天。”',
        ],
        outcomeContinueLabel: '收好冰冷断玉 · 独自离窟',
        bridgeNote: '你窥见了长明元年的惨烈往事，却也彻底寒了断玉残魂的心，此后彼此只余冷眼提防。',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 卷二高潮：筑基大关与心魔问心 ====================
  act2_foundation_gate: {
    id: 'act2_foundation_gate',
    act: 'act2',
    title: '筑基天堑',
    subtitle: '卷二 · 气化灵液',
    location: '青岚静室 · 闭死关',
    checkpoint: true,
    checkpointLabel: '卷二 · 筑基大关前',
    paragraphs: [
      '{{year}}，你今岁已{{age}}岁。丹田气海胀满如欲决的春湖，经脉隐隐发痛。十之八九的炼气修士，终老一生都折在这道「筑基天堑」前。',
      '气海液化成功，寿元立跃至二百四十载，可御剑穿云踏入九州大局。若功败垂成，轻则道基崩裂，重则爆体身陨。',
      '石室厚门缓缓合拢。你审视着这些年攒下的灵石奇物与自身底气，决意如何叩关？',
    ],
    choices: [
      {
        id: 'found_pill_orthodox',
        label: '吞服【上品筑基丹】，循正统法门稳健凝液铸就无瑕道基',
        subtext: (s) =>
          s.tags.includes('blood_pill_tainted')
            ? '需心境 ≥ 55 以压下早年血丹残留煞气；成功后铸就【无瑕道基】，大增后续底蕴。'
            : '需心境 ≥ 42 方能驾驭上品丹力；成功后铸就【无瑕道基】，大增后续底蕴。',
        visible: (s) => s.relics.includes('foundation_pill'),
        requirement: {
          custom: (s) => {
            const need = s.tags.includes('blood_pill_tainted') ? 55 : 42;
            return s.mind >= need
              ? { ok: true }
              : { ok: false, reason: `正统丹道须心境定力 ≥ ${need}（当前 ${s.mind}）` };
          },
        },
        insightTags: ['正统丹道 · 无瑕道基', '消耗【上品筑基丹】', '增越阶底蕴'],
        effect: {
          timeMonths: 14,
          removeRelics: ['foundation_pill'],
          might: 18,
          mind: 10,
          setFlags: {
            foundation_method: 'orthodox_pill',
            foundation_grade: 'flawless',
          },
          logSummary: '静室吞服【上品筑基丹】闭关一载余，铸就无瑕道基雏形，直面筑基问心劫。',
        },
        outcome: [
          '【上品筑基丹】入口即化，化作一道沉静醇厚的青色丹河护住四肢百骸。一载零两月静坐之间，暴躁的气海在药力调和下缓缓旋转、压缩，第一滴晶莹剔透的无瑕灵液终于凝落丹田！',
          '偏在此时，四周石壁无声消融，一阵彻骨寒风扑面而来。破境最后一道劫数，心魔幻境降临了。',
        ],
        outcomeContinueLabel: '稳守灵台 · 直面问心幻境',
        next: 'act2_heart_demon',
      },
      {
        id: 'found_array_or_stones',
        label: (s) =>
          s.relics.includes('broken_gathering_array')
            ? '以【残缺聚灵阵盘】配六十灵石引动灵潮，铸就地脉道基'
            : '凭商道阵理豪掷二百二十灵石布设聚灵大阵，以财力硬铺道基',
        subtext: '阵道/商道专属途径：须持有【残缺聚灵阵盘】，或具备商名/商经/暗市客卿/心境≥55 阵理方可布阵。',
        visible: (s) =>
          s.relics.includes('broken_gathering_array') ||
          s.tags.includes('merchant_fame') ||
          s.tags.includes('merchant_manual') ||
          s.tags.includes('dark_market_broker') ||
          s.mind >= 55,
        requirement: {
          custom: (s) => {
            const cost = s.relics.includes('broken_gathering_array') ? 60 : 220;
            return s.spiritStones >= cost
              ? { ok: true }
              : { ok: false, reason: `需灵石 ${cost} 驱动大阵` };
          },
        },
        insightTags: (s) => [
          '阵道/商道专属 · 地脉道基',
          s.relics.includes('broken_gathering_array') ? '阵盘+60灵石' : '耗220灵石',
        ],
        effect: (s) => {
          const useArray = s.relics.includes('broken_gathering_array');
          return {
            timeMonths: 18,
            spiritStones: useArray ? -60 : -220,
            might: 15,
            mind: 8,
            setFlags: {
              foundation_method: 'array_wealth',
              foundation_grade: 'merchant_vein',
            },
            notice: useArray
              ? '借残缺聚灵阵盘与六十灵石引动灵潮，稳住气海凝液！'
              : '耗费二百二十灵石铺成聚灵阵，滚滚灵光护住经脉！',
            logSummary: useArray
              ? '启【残缺聚灵阵盘】引灵潮凝液，踏入筑基问心关口。'
              : '凭商道阵理耗费二百二十灵石布设聚灵大阵催气化液，直面筑基问心劫。',
          };
        },
        outcome: [
          '灵石如流水般碎成齑粉，静室内灵雾浓得几乎化不开。整整十八个月光阴，你硬是以雄厚财力与精妙阵理铺出了一条直通筑基的灵气长河，滚烫灵气轰然压缩成液！',
          '就在道基即将定型的刹那，灯影骤灭，无尽灰雪自识海深处翻涌而出。你迎来了筑基心魔的终极拷问。',
        ],
        outcomeContinueLabel: '踏入灰雪 · 直面问心幻境',
        next: 'act2_heart_demon',
      },
      {
        id: 'found_cangming_guard',
        label: '请识海中的苍溟以三千年前剑意护法，行上古剑基古法',
        subtext: '剑道/古魂专属途径：需与苍溟推心知己（好感≥30）且具【剑意雏形】或【残魂之契】；铸就【太古剑基】，极增越阶战力！',
        visible: (s) =>
          s.companions.cang_ming.met &&
          s.companions.cang_ming.stance !== 'estranged' &&
          s.companions.cang_ming.stance !== 'rival',
        requirement: {
          custom: (s) => {
            if (s.companions.cang_ming.affection < 30) {
              return {
                ok: false,
                reason: `须与苍溟推心知己（好感≥30，当前 ${s.companions.cang_ming.affection}）`,
              };
            }
            if (!s.tags.includes('sword_intent_seed') && !s.tags.includes('cangming_pact')) {
              return { ok: false, reason: '须具【剑意雏形】或【残魂之契】方可承受上古剑基' };
            }
            return { ok: true };
          },
        },
        insightTags: ['剑道专属 · 太古剑基', '极强越阶底蕴', '苍溟护法'],
        effect: {
          timeMonths: 12,
          might: 22,
          mind: 8,
          addTags: ['sword_intent_seed'],
          setFlags: {
            foundation_method: 'cangming_ancient',
            foundation_grade: 'sword_ancient',
          },
          companionUpdates: {
            cang_ming: {
              affectionDelta: 8,
              chronicle: '你冲刺筑基时他不惜耗损残魂本源替你镇压灵液乱流，助你铸就太古剑基。',
            },
          },
          logSummary: '得苍溟以残魂剑意护法行上古剑基古法，铸成越阶剑道灵液，步入问心劫。',
        },
        outcome: [
          '“凝神守一，别分心！”苍溟低喝一声，焦黑断玉绽出夺目青芒，三千年前的古老剑意化作九道锁链死死箍住你狂暴沸腾的气海！一载苦熬，硬是以最凌厉的上古法门铸成自带锋芒的【太古剑基】。',
          '苍溟的声音明显虚弱了下去：“经脉我替你压住了……有这副太古剑基在身，日后同阶乃至越阶交锋皆不虚旁人。剩下的心魔关，自己劈开它！”话音刚落，灰雪漫天席卷而来。',
        ],
        outcomeContinueLabel: '提剑入幻 · 斩破问心之劫',
        next: 'act2_heart_demon',
      },
      {
        id: 'found_blood_pill',
        label: '吞服【血煞筑基丹】，借丹中诡异灰白异尘强行冲破天堑',
        subtext: (s) => {
          const req = s.relics.includes('qingzhou_silver_needle') ? 52 : 62;
          return `【魔煞捷径】须行事不拘正道（正气≤15或已染煞）且心境≥${req}（当前 ${s.mind}），否则血煞焚心反噬殒命；强铸【煞血道基】但惹正道故人寒心。`;
        },
        visible: (s) =>
          s.relics.includes('blood_foundation_pill') &&
          (s.alignment.righteous <= 15 || s.tags.includes('blood_pill_tainted')),
        insightTags: (s) => {
          const req = s.relics.includes('qingzhou_silver_needle') ? 52 : 62;
          return [
            '魔煞捷径 · 煞血道基',
            s.relics.includes('qingzhou_silver_needle')
              ? `银针安神：心境≥${req}（当前 ${s.mind}）`
              : `心境≥${req}方可压煞（当前 ${s.mind}）`,
            '正道故人寒心',
          ];
        },
        effect: (s) => {
          const hasNeedle = s.relics.includes('qingzhou_silver_needle');
          const fail = s.mind < (hasNeedle ? 52 : 62);
          return {
            timeMonths: fail ? 0 : 8,
            removeRelics: ['blood_foundation_pill'],
            might: fail ? 0 : 22,
            righteous: -18,
            addTags: ['blood_pill_tainted'],
            setFlags: {
              foundation_method: 'blood_pill',
              foundation_grade: fail ? 'failed' : 'blood_demon',
              found_blood_failed: fail,
              found_blood_used_needle: hasNeedle,
            },
            companionUpdates: !fail
              ? {
                  ...(s.companions.shen_qingshuang.met
                    ? { shen_qingshuang: { affectionDelta: -10 } }
                    : {}),
                  ...(s.companions.su_zhiwei.met && isSuZhiweiAlive(s)
                    ? { su_zhiwei: { affectionDelta: -8 } }
                    : {}),
                }
              : undefined,
            logSummary: fail
              ? '吞服【血煞筑基丹】强冲道基，心境失守遭血煞微尘反噬。'
              : '吞服【血煞筑基丹】强压丹毒逼气化液，铸就霸道煞血道基踏入问心幻境。',
          };
        },
        outcome: [
          (s) =>
            s.flags.found_blood_failed
              ? '猩红血丹入腹的瞬间，狂暴药力如决堤血海冲垮经脉！藏在丹核里的灰白微尘趁虚钻入灵台，无数冰冷窃笑在你耳边炸响，你的心境防线终究没能扛住这股非人侵蚀，神智如沙堡般崩塌！'
              : s.flags.found_blood_used_needle
              ? '猩红药力几乎将你的经脉烧成焦炭，灰白微尘直扑识海！危急关头，你反手自【杏林银针匣】拈出安神银针刺入百会，一缕温润桂花药香稳住摇摇欲坠的灵台，助你硬生生吞下狂暴药力逼气化液！下一刻，带着血色的灰雪幻境轰然降临。'
              : '猩红药力几乎将你的经脉烧成焦炭，灰白微尘更化作阴毒锁链直扑识海！生死关头，你凭着多年磨砺出的坚韧心境强行咬牙锁住灵台清明，硬生生吞下狂暴药力逼气化液！下一刻，带着血色的灰雪幻境轰然降临。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.found_blood_failed ? '坠入血煞深渊 · 展卷终局' : '带煞强撑 · 直面问心幻境',
        next: (s) => (s.flags.found_blood_failed ? 'ending_blood_demon' : 'act2_heart_demon'),
      },
      {
        id: 'found_bare_force',
        label: '不假外物丹药，凭一身磨砺出的修为与心境强行破关',
        subtext: (s) =>
          `无丹无阵硬闯天堑：修为与心境满 145 方能稳渡，95 至 144 间须以重伤换生机，不足 95 则气海崩裂殒命（当前 ${s.might + s.mind}）。`,
        insightTags: (s) => [
          '零消耗硬冲',
          `稳渡≥145 / 95~144重伤强渡（当前 ${s.might + s.mind}）`,
          '背水强冲',
        ],
        effect: (s) => {
          const total = s.might + s.mind;
          if (total < 95) {
            return {
              timeMonths: 24,
              setFlags: {
                foundation_method: 'bare_force_fail',
                found_bare_failed: true,
                found_bare_injured: false,
              },
              logSummary: '无丹无阵强行冲刺筑基大关，底蕴尚差半寸，气海倾颓折戟静室。',
            };
          }
          const strong = total >= 145;
          return {
            timeMonths: 24,
            mind: strong ? 8 : 2,
            might: strong ? 8 : -2,
            setFlags: {
              foundation_method: strong ? 'bare_force' : 'bare_force_injured',
              found_bare_failed: false,
              found_bare_injured: !strong,
            },
            logSummary: strong
              ? '无丹无阵枯坐两载硬熬气海，绝处逢生凝出纯粹灵液，步入问心劫。'
              : '无丹无阵强冲筑基虽受内伤折损两分修为，仍咬牙凝出灵液踏入问心劫。',
          };
        },
        outcome: [
          (s) =>
            s.flags.found_bare_failed
              ? '两载硬冲，稀薄天地灵气终究难以为继。最后关头丹田灵流倒灌失控，你喷出一口逆血，听见气海深处传来瓷器崩裂般的脆响。无丹无阵之下，终差了半寸火候。'
              : s.flags.found_bare_injured
              ? '两载枯坐，无丹无阵。狂暴灵气撕裂数道侧脉，你满口腥甜，硬凭一口孤勇把散乱气海死死压成灵液！虽落下内伤折了些许修为，道基总算立住。眼前石壁无声消融，问心幻境已至。'
              : '两载孤坐，无丹无阵。你凭一口不肯屈于天命的孤勇硬熬气海！灵力压榨到极致那一瞬，一滴比任何丹药催化都更纯粹的灵液轰然凝成。识海微震，问心幻境已在眼前展开。',
        ],
        outcomeContinueLabel: (s) =>
          !s.flags.found_bare_failed ? '绝处逢生 · 直面问心幻境' : '气海倾颓 · 展卷终局',
        next: (s) =>
          !s.flags.found_bare_failed ? 'act2_heart_demon' : 'ending_fallen_path',
      },
      {
        id: 'found_slow_grind',
        label: '暂不硬冲，闭死关枯坐十五载，拿寿元水磨气海底蕴',
        subtext: '零灵石苦磨十五年换取修为与心境各六点（此境限闭一轮）。若岁月耗尽仍未破境，恐将坐化老死。',
        requirement: {
          maxUsesInAct: {
            key: 'found_slow_grind',
            max: 1,
            reason: '大劫灵潮日紧，此境闭死关至多一轮，再久恐误时局。',
          },
        },
        insightTags: ['耗寿十五载', '此境限1回', '零花费换底蕴'],
        effect: {
          timeMonths: 180,
          might: 6,
          mind: 6,
          trackActionKey: 'found_slow_grind',
          logSummary: '于静室枯坐十五载水磨气海，以岁月换来几分筑基底气。',
        },
        outcome: [
          '静室不见天日，石门外枯荣十五轮。你省下每一枚灵石，只凭凡躯一寸寸筛滤稀薄清气。',
          '起身推门时，两鬓已有微霜。气海比从前沉了一线，窗外山风却催得更紧。',
        ],
        outcomeContinueLabel: '推门出室 · 再作打算',
        bridgeNote: '十五载枯坐换来几分底蕴，寿元也悄然折去一大截。',
        next: 'act2_hub',
      },
      {
        id: 'found_back',
        label: '暂缓筑基，退回青岚再作筹备',
        next: 'act2_hub',
      },
    ],
  },

  act2_heart_demon: {
    id: 'act2_heart_demon',
    act: 'act2',
    title: '问心幻境',
    subtitle: '卷二 · 问心之劫',
    location: '识海深处 · 无尽灰雪',
    paragraphs: [
      '灵气轰然化液的刹那，你眼前石室骤然坍塌，化作漫天无声飘落的灰白雪原。一道与你容貌一模一样的黑影立在雪中，轻声发问：',
      (s) => {
        if (s.companions.su_zhiwei.met && s.companions.su_zhiwei.affection >= 20) {
          return '“你看看自己，容颜永驻，却眼睁睁看着杏林故人白发苍苍。所谓长生，不过是把在乎你的人一个个送进黄土。你真敢走下去吗？”';
        }
        if (s.companions.shen_qingshuang.met && s.companions.shen_qingshuang.stance === 'estranged') {
          return '“为了区区一枚筑基丹，你连飞升崖上并肩之人都敢弃之不顾。今日铸成的道基，沾的全是凉薄之血，你夜里睡得安稳吗？”';
        }
        if (s.truthClues.includes('clue_changming_night')) {
          return '“你已经见过三千年前长明元年那片吞没九位剑尊的金色烈焰。连当年绝顶大能都拦不住九霄变故，你如今拼死筑基，岂非飞蛾扑火、可笑至极？”';
        }
        if (s.truthClues.includes('clue_stele_gap')) {
          return '“你已经亲眼见过飞升崖碑背的反文。三千年七度光落无一音回，高天背后分明藏着未解杀机，如今拼死筑基，岂非自投迷雾、可笑至极？”';
        }
        if (s.truthClues.length >= 2) {
          const hasVein =
            s.truthClues.includes('clue_vein_drain') ||
            s.truthClues.includes('clue_ancient_vein_sigil');
          const hasBlood = s.truthClues.includes('clue_blood_pill_dust');
          const hasMortal = s.truthClues.includes('clue_mortal_blindspot');
          if (hasVein && hasBlood) {
            return '“青州灵脉七成抽空，市井血丹蚀骨。大宗与高天暗中贪墨灵气，你如今拼死筑基，究竟是求长生，还是跳进更深的泥淖？”';
          }
          if (hasVein && hasMortal) {
            return '“青州地底灵脉暗遭逆汲，城外怪疫专蚀灵窍。天地处处透着说不清的诡谲，你如今拼死筑基，究竟是求长生，还是自投更深的泥淖？”';
          }
          if (hasBlood && hasMortal) {
            return '“市井血丹藏着异尘，青州怪疫专蚀微灵根。仙途暗处危机四伏，你如今拼死筑基，究竟是求长生，还是跳进更深的泥淖？”';
          }
          return '“你已窥见这方仙途暗藏的诸多诡谲与破绽。天地灵气日渐稀薄，你如今拼死筑基，究竟是求长生，还是跳进更深的泥淖？”';
        }
        return '“三千年飞升无归音，灵气又在日渐枯竭。你耗尽半生风霜踏上这条前途未卜之路，究竟是在求仙，还是在自欺欺人？”';
      },
      (s) => {
        const dh = s.flags.dao_heart;
        if (dh === 'seek_longevity') {
          return '雪声呜咽里，十六岁初入尘世那句“唯我身久存”的初念忽在耳畔响起。黑影冷笑：“为了多活两百载，连人心都肯凉透，这算哪门子长生？”';
        }
        if (dh === 'seek_truth') {
          return s.truthClues.includes('clue_changming_night')
            ? '雪声呜咽里，十六岁那句“我偏要看个明白”的初念忽在耳畔响起。黑影冷笑：“看明白了又如何？知道天门是炉，你手里这把炼气小剑劈得开么？”'
            : '雪声呜咽里，十六岁那句“我偏要看个明白”的初念忽在耳畔响起。黑影冷笑：“就算三千年无人回音，你手里这把炼气小剑劈得开高天迷雾么？”';
        }
        if (dh === 'seek_fortune') {
          return '雪声呜咽里，十六岁那句“掌财借势、快意人间”的初念忽在耳畔响起。黑影冷笑：“满袖灵石买得来一城体面，买得来高天之上的活路么？”';
        }
        if (dh === 'protect_one') {
          return '雪声呜咽里，十六岁那句“人间总该留一盏灯”的初念忽在耳畔响起。黑影冷笑：“自身尚在泥淖，连故人白头都拦不住，还敢妄谈护人周全？”';
        }
        return null;
      },
      '丹田灵液骤寒骤沸，只待你开口作答。',
    ],
    choices: [
      {
        id: 'demon_answer_defy',
        label: (s) =>
          s.truthClues.includes('clue_changming_night')
            ? '“天门是假，我手中之剑、脚下之路却是真！正因知其为炉，才更要破境掀翻它！”'
            : s.truthClues.includes('clue_stele_gap')
            ? '“三千年飞升无归音又如何，我手中之剑、脚下之路却是真！正因疑其藏奸，才更要破境掀开它！”'
            : '“前路真伪未明，我手中之剑、脚下之路却是真！管它九霄有何阻拦，破境去看便是！”',
        insightTags: ['心境圆满', '铸就筑基道基', '稳固道基四载'],
        effect: (s) => ({
          timeMonths: 48,
          mind: 10,
          might: 6,
          setRealm: 'foundation_early',
          setAct: 'act3',
          addTags: ['foundation_dao'],
          logSummary:
            s.truthClues.includes('clue_changming_night') ||
            s.truthClues.includes('clue_stele_gap')
              ? '于筑基心魔幻境中直面天门虚妄，道心不折，成功气化灵液踏入【筑基初期】！'
              : '于筑基心魔幻境中斩破迷惘，道心不折，成功气化灵液踏入【筑基初期】！',
        }),
        outcome: [
          '你的声音如惊雷滚过雪原！黑影微微一怔，旋即在万丈清光中寸寸瓦解。漫天灰雪刹那消融，化作丹田内奔涌不息的灵液大江。',
          '破关之后你又静修四载稳固初成道基，再推开石门时已是寿逾二百四十载的筑基真人，真正的九州风云正徐徐展开。',
        ],
        outcomeContinueLabel: '破关而出 · 启幕第三卷《世局动》',
        next: 'act3_opening',
      },
      {
        id: 'demon_answer_cherish',
        label: '“长生纵冷，但只要我还活着，便总有再见、守护与改写结局的可能。”',
        insightTags: ['红尘道心', '铸就筑基道基', '稳固道基四载'],
        effect: {
          timeMonths: 48,
          mind: 10,
          worldly: 8,
          setRealm: 'foundation_early',
          setAct: 'act3',
          addTags: ['foundation_dao'],
          logSummary: '怀揣人间牵挂斩破筑基心魔，气海凝液成基，正式踏入【筑基初期】！',
        },
        outcome: [
          '黑影冷笑欲辩，却见你眼底澄澈得没有半分动摇，反而生出一抹极暖的春意。灰雪原上悄然绽出漫山杏花，幻象轰然碎散！',
          '丹田灵液澄明如湖，你又闭门四载打磨根骨，携着满腔红尘深情踏出青岚，迎向更为辽阔的九州世局。',
        ],
        outcomeContinueLabel: '破关而出 · 启幕第三卷《世局动》',
        next: 'act3_opening',
      },
      {
        id: 'demon_answer_cold',
        label: (s) =>
          s.truthClues.includes('clue_changming_night')
            ? '“弱肉强食本是天地常态，只要筹码足够厚、修为足够高，谁是炉鼎尚未可知。”'
            : '“弱肉强食本是天地常态，只要筹码足够厚、修为足够高，仙途规矩便由我定。”',
        insightTags: ['冷峻道心', '修为精进', '铸就筑基道基', '稳固道基四载'],
        effect: {
          timeMonths: 48,
          might: 10,
          mind: 6,
          righteous: -6,
          setRealm: 'foundation_early',
          setAct: 'act3',
          addTags: ['foundation_dao'],
          logSummary: '以冷峻野心压服心魔幻象，强铸道基，正式踏入【筑基初期】！',
        },
        outcome: [
          '你连一寸退意也无，反倒伸手将那道黑影一把捏碎吞入腹中！既然天道无情，那便以更冷峻的铁腕去博弈。',
          '霸道灵液瞬间贯通周天，四载稳境之后，你踏出石门，目光直指风云渐起的九州。',
        ],
        outcomeContinueLabel: '破关而出 · 启幕第三卷《世局动》',
        next: 'act3_opening',
      },
    ],
  },
};
