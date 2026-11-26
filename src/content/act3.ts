import {
  ChoiceEffect,
  GameState,
  RandomEventDefinition,
  SceneDefinition,
} from '../engine/types';
import { getAgeYears, toChineseYearNumber, yearsSinceAgeMonths } from '../engine/time';
import { isSuZhiweiAlive } from './companions';
import {
  canCommitMajorArc,
  evaluateCoercion,
  getRemainingMajorArcSlots,
  isMajorArcMissed,
} from '../engine/systems';

function foundationRealmLabel(realm: GameState['realm']): string {
  if (realm === 'foundation_mid') return '筑基中期';
  if (realm === 'foundation_late') return '筑基后期';
  return '筑基初期';
}

function isSuAliveInAct3Hearth(state: GameState): boolean {
  if (
    !state.companions.su_zhiwei.met ||
    state.flags.su_zhiwei_passed ||
    state.companions.su_zhiwei.deceased
  ) {
    return false;
  }
  if (isSuZhiweiAlive(state)) return true;
  if (state.flags.hearth1_met_alive) {
    const cap = state.flags.su_zhiwei_saved_longlife ? 96 : 66;
    return getAgeYears(state.ageMonths) <= cap;
  }
  return false;
}

function nextFoundationRealm(state: GameState) {
  if (state.realm === 'foundation_early') return 'foundation_mid' as const;
  if (state.realm === 'foundation_mid') return 'foundation_late' as const;
  return state.realm;
}

function isShenHostile(state: GameState): boolean {
  const st = state.companions.shen_qingshuang.stance;
  return st === 'estranged' || st === 'rival';
}

function isXieHostile(state: GameState): boolean {
  const st = state.companions.xie_wujiu.stance;
  return st === 'estranged' || st === 'rival';
}

function isCangMingHostile(state: GameState): boolean {
  const c = state.companions.cang_ming;
  return c.stance === 'estranged' || c.stance === 'rival' || c.affection < 10;
}

function buildInitialAct3Threads(state: GameState): string[] {
  const threads: string[] = [];
  if (
    state.companions.shen_qingshuang.met ||
    state.tags.includes('qingyun_outer') ||
    Boolean(state.flags.qingyun_elders_hostile)
  ) {
    threads.push('thread_act3_sect');
  }
  if (
    state.companions.xie_wujiu.met ||
    state.tags.includes('dark_market_broker') ||
    Boolean(state.flags.blood_pill_exposed) ||
    Boolean(state.flags.black_market_boom)
  ) {
    threads.push('thread_act3_chamber');
  }
  if (
    state.companions.su_zhiwei.met ||
    state.tags.includes('qingzhou_guardian') ||
    state.tags.includes('qingzhou_vow')
  ) {
    threads.push('thread_act3_hearth');
  }
  if (
    state.companions.cang_ming.met ||
    state.tags.includes('vein_witness') ||
    state.relics.includes('charred_jade_relic')
  ) {
    threads.push('thread_act3_soul');
  }
  if (threads.length < 2) {
    if (!threads.includes('thread_act3_sect')) threads.push('thread_act3_sect');
    if (!threads.includes('thread_act3_chamber')) {
      threads.push('thread_act3_chamber');
    }
  }
  return threads;
}

export const ACT3_SCENES: Record<string, SceneDefinition> = {
  // ==================== 卷三开篇：筑基入九州 ====================
  act3_opening: {
    id: 'act3_opening',
    act: 'act3',
    title: '筑基入九州',
    subtitle: '卷三 · 世局动',
    location: '青州官道 · 云岭南望',
    checkpoint: true,
    checkpointLabel: '卷三初启 · 筑基入九州',
    paragraphs: [
      '御剑掠过青岚群山南下青州府，脚下云海翻涌，昔日步行半月的官道，如今只需一炷香工夫便能越过。',
      '可站得高了，看得也更冷。这四年间九州灵脉干涸之势陡然加剧，青州周边已有三座小型灵矿彻底断脉。仙盟贴出告示，定于近日在云岭召开「九州灵脉分派大议」，各宗筑基以上修士皆可持帖观礼。',
      {
        when: (s) => Boolean(s.flags.blood_pill_exposed),
        text: '你刚在青州城南望云客馆落脚，茶寮里便传遍了天机商行的反扑消息。自青岚血丹暗坊被烧毁后，商行总坛派了两名金丹执事坐镇青州，收紧各路灵药商道，暗中悬赏查拿当年纵火之人。',
      },
      {
        when: (s) =>
          Boolean(s.flags.black_market_boom) && !s.flags.blood_pill_exposed,
        text: '青州暗市近四年膨胀得惊人。百宝斋与天机商行在台面下暗自角力，大批来路不明的灵砂涌入散修手中，仙盟执法船已连续两季沿运河夜巡，随时可能与暗市彻底撕破脸。',
      },
      {
        when: (s) => Boolean(s.flags.qingyun_elders_hostile),
        text: '客馆门房悄悄递来一封无名剑羽密信，封蜡上印着半朵霜梅。沈清霜在信中急促写道：青云执法长老已把她软禁在云岭别院，拟于仙盟大议当众宣读她的「飞升候补」名牒，邀你务必在开议前赶赴云岭侧廊相见。',
      },
      {
        when: (s) => Boolean(s.flags.su_zhiwei_saved_longlife) && isSuZhiweiAlive(s),
        text: '行囊夹层里还压着一封青州驿卒前些月转交的家书，纸页间夹着几瓣晒干的杏花。苏知微字迹清隽有力，说延寿露护住了她的肺腑，这几年身子硬朗如常，已收了两名药童，正把半生所见的凡人无灵医案逐卷誊录成册。',
      },
      {
        when: (s) => Boolean(s.flags.cangming_vow_sworn),
        text: '入夜推窗望北，怀中【焦黑断玉】隐隐发烫。苍溟沉声开口：“西北三百里外，长明古战场的黑雾退了半里。当年我几位同袍陨落之处生有【千年养魂木】，趁着九州各宗的眼线还盯在灵脉大议上，这趟浑水必须去趟。”',
      },
      {
        when: (s) =>
          !s.flags.blood_pill_exposed &&
          !s.flags.black_market_boom &&
          !s.flags.qingyun_elders_hostile &&
          !(Boolean(s.flags.su_zhiwei_saved_longlife) && isSuZhiweiAlive(s)) &&
          !s.flags.cangming_vow_sworn,
        text: '桌案上摊着三份你托青州牙行买来的舆图与公文：云岭仙盟大议的观礼帖、天机商行接管青州暗河货栈的契文抄本，还有一份标注着长明古战场雾散缺口的残图。筑基之后，九州的棋盘已摊在你眼前。',
      },
    ],
    choices: [
      {
        id: 'act3_open_survey_all',
        label: '在青州望云客馆安顿行装，梳理各方来信与九州局势',
        subtext: '稳固筑基修为，理清青州各方风声与九州大势。',
        insightTags: ['耗时三月', '修为与心境', '步入青州风云'],
        effect: (s) => ({
          timeMonths: 3,
          might: 6,
          mind: 6,
          renown: 6,
          activateThreads: buildInitialAct3Threads(s),
          setFlags: {
            act3_started: true,
            act3_battlefield_open:
              Boolean(s.flags.cangming_vow_sworn) ||
              s.companions.cang_ming.met ||
              Boolean(s.flags.act3_battlefield_open),
          },
          logSummary:
            '筑基四载稳固道基，御剑南下青州府，正式踏入九州大势棋局。',
        }),
        outcome: [
          '九州暗涌。你在客馆顶楼租下隔音静室排开各方风声，仙盟大议在即，天机商行总坛虎视眈眈，青州杏林岁华悄逝，西北古战场黑雾才刚退去一角。',
          '窗外暮钟敲过三声，你按住腰间剑柄。炼气时只能随波逐流，筑基之后，你终于有了落子搅局的资格。',
        ],
        outcomeContinueLabel: '推窗望九州 · 步入青州风云',
        bridgeNote:
          '筑基四载方稳，青州内外风云齐聚，几桩牵动金丹大道的世局正待你落子。',
        next: 'act3_hub',
      },
      {
        id: 'act3_open_sharpen_blade',
        label: '先往青州外城校场与坊市走一遭，立稳筑基真人的威名再议诸事',
        subtext: '多耗半年打点声势，起步多得锋芒与四方人脉。',
        insightTags: ['耗时半载', '修为与声望', '步入青州风云'],
        effect: (s) => ({
          timeMonths: 6,
          might: 10,
          renown: 10,
          worldly: 6,
          activateThreads: buildInitialAct3Threads(s),
          setFlags: {
            act3_started: true,
            act3_battlefield_open:
              Boolean(s.flags.cangming_vow_sworn) ||
              s.companions.cang_ming.met ||
              Boolean(s.flags.act3_battlefield_open),
          },
          logSummary:
            '筑基南下青州后先立声名，各方宗门与商行执事纷纷递上拜帖。',
        }),
        outcome: [
          '你在青州奇珍楼外三招震退两名借势欺人的宗门外事执事，又在南门茶肆痛快包下三席宴请老散修。不出半月，青州城内便传开新晋筑基真人{{name}}的名号。',
          '回到望云客馆时，门房已替你攒下厚厚一叠拜帖与密函。有了这层威势护身，接下来无论入仙盟还是闯商行，旁人都不敢轻视你三分。',
        ],
        outcomeContinueLabel: '收拢拜帖 · 执棋青州风云',
        bridgeNote:
          '你在青州城先声夺人，四方拜帖与密报接踵而至，真正的博弈才刚开场。',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 卷三核心并发枢纽：青州风云 ====================
  act3_hub: {
    id: 'act3_hub',
    act: 'act3',
    title: '青州风云',
    subtitle: (s) =>
      s.actBeat >= 3 ||
      s.completedThreads.filter((id) => id.startsWith('thread_act3_')).length >= 2
        ? '卷三 · 灵液将凝，金丹在望'
        : '卷三 · 九州棋局，暗流并发',
    location: (s) =>
      s.tags.includes('alliance_envoy')
        ? '云岭仙盟 · 客卿别苑'
        : s.tags.includes('dark_market_broker')
        ? '青州府 · 百宝分号雅院'
        : '青州府 · 望云客馆',
    isHub: true,
    paragraphs: [
      {
        when: (s) => Boolean(s.lastBridgeNote),
        text: (s) => s.lastBridgeNote ?? '',
      },
      (s) =>
        `转眼已是{{year}}，你今岁{{age}}岁，修为立于【${
          s.realm === 'foundation_late'
            ? '筑基后期'
            : s.realm === 'foundation_mid'
            ? '筑基中期'
            : '筑基初期'
        }】。二百余载寿元让寒暑在眉宇间走得极缓，可九州灵脉枯竭的速度，却比谁预想得都要急促。`,
      (s) => {
        const lines: string[] = [];
        const remSlots = getRemainingMajorArcSlots(s, 'act3');
        if (remSlots > 0) {
          lines.push(
            `【天时筹度】九州风波齐起，筑基光阴虽长却难分身四顾。本卷至多亲身介入两处九州大势（尚余${remSlots === 1 ? '一' : '两'}席）；未及兼顾之地，将随岁月自行落子。`
          );
        } else {
          const missed: string[] = [];
          if (isMajorArcMissed(s, 'act3', 'thread_act3_sect')) {
            missed.push('云岭仙盟大议已在你缺席下落幕，沈清霜被强押入内阁候补名录');
          }
          if (isMajorArcMissed(s, 'act3', 'thread_act3_chamber')) {
            missed.push('青州百宝商变无人相助，谢无咎险死还生退守暗路、商行趁机吞并半数矿权');
          }
          if (isMajorArcMissed(s, 'act3', 'thread_act3_hearth')) {
            missed.push(
              s.companions.su_zhiwei.met
                ? '你奔波九州未能重返青州杏林，凡尘寒暑无声碾过小院'
                : '你奔波九州未及探访青州城外杏林，凡尘寒暑无声碾过那座旧院'
            );
          }
          if (isMajorArcMissed(s, 'act3', 'thread_act3_soul')) {
            missed.push('长明古战场雾散期满，岛心【千年养魂木】已被北域大宗捷足先登');
          }
          if (missed.length > 0) {
            lines.push(`【分身乏术 · 世局余波】${missed.join('；')}。`);
          }
        }
        if (s.activeThreads.includes('thread_act3_sect')) {
          lines.push(
            s.flags.act3_sect_step1
              ? '【仙盟大议】封宴之夜将至，仙盟秘阁里的百年贡约与寒铁剑胚正守卫森严，破局只在今宵。'
              : s.companions.shen_qingshuang.met
              ? '【仙盟大议】九州灵脉分派大议在云岭召开，沈清霜被长老列入「飞升候补」首位，暗潮汹涌。'
              : '【仙盟大议】九州灵脉分派大议在云岭召开，青云宗内门首座被长老列入「飞升候补」首位，暗潮汹涌。'
          );
        }
        if (s.activeThreads.includes('thread_act3_chamber')) {
          lines.push(
            s.flags.act3_chamber_step1
              ? '【百宝商变】青州分号内鬼与老掌柜逼宫在即，转运深井与谢家兄长旧案的血证正待账堂公审。'
              : s.companions.xie_wujiu.met
              ? '【百宝商变】九州断脉引发青州药荒，百宝斋内部老掌柜勾结天机商行逼宫，谢无咎处境凶险。'
              : '【百宝商变】九州断脉引发青州药荒，百宝斋分号内乱与天机商行吞矿暗潮正在青州激荡。'
          );
        }
        if (s.activeThreads.includes('thread_act3_hearth')) {
          lines.push(
            s.flags.act3_hearth_step1
              ? isSuAliveInAct3Hearth(s)
                ? '【青州故人】杏林院里又添新岁风霜，苏知微毕生整理的凡尘无灵医卷已近尾声。'
                : '【青州故人】杏林旧屋已成空庐，故人留下的二十载无灵医典与玉匣正待你去收存。'
              : isSuZhiweiAlive(s)
              ? '【青州故人】距当年青州别过已匆匆十余载，你容颜未改，城外杏林的故人与旧屋不知已成何等模样。'
              : '【青州故人】岁月无情，当年城外杏林的旧屋不知如今何人守灯，遗留的医案尚未寻回。'
          );
        }
        if (s.activeThreads.includes('thread_act3_soul')) {
          lines.push(
            s.flags.act3_soul_step1
              ? '【古战场寻木】月圆雾退在即，黑柏孤岛上的千年养魂木与各宗争夺者已剑拔弩张。'
              : '【古战场寻木】长明古战场荒泽黑雾稀薄，传闻岛心长有千年养魂木，引得各方筑基修士暗中赶赴。'
          );
        }
        return lines.length > 0
          ? lines
          : '青州四方大势渐次尘埃落定，你丹田内的灵液凝重如汞，已到直面金丹大关的时刻。';
      },
      (s) => `【九州行市】${s.market.rumorText}`,
    ],
    choices: [
      // ----- 故事大势（4条并发主线） -----
      {
        id: 'hub3_sect_1',
        category: 'story',
        label: '御剑北上云岭仙盟大殿，赴九州灵脉大议查探「飞升候补」暗局',
        subtext: (s) =>
          s.companions.shen_qingshuang.met
            ? '云岭灵脉大议风波渐起，沈清霜正深陷候补名录暗局（须占本卷一席大势）。'
            : '云岭灵脉大议风波渐起，大殿暗处正酝酿候补名录交易（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_sect') &&
          !s.flags.act3_sect_step1 &&
          canCommitMajorArc(s, 'act3', 'thread_act3_sect'),
        insightTags: ['云岭大议', '仙盟秘辛', '占一席天时大势'],
        effect: {
          timeMonths: 8,
          beatDelta: 1,
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_sect' },
        },
        next: 'act3_arc_sect_1',
      },
      {
        id: 'hub3_sect_2',
        category: 'story',
        label: (s) =>
          s.companions.shen_qingshuang.met
            ? '趁云岭封宴夜潜仙盟秘阁，决断百年贡约与沈清霜的命运'
            : '趁云岭封宴夜潜仙盟秘阁，直面百年贡约与秘阁寒铁剑胚',
        subtext: '封宴之夜灯火最盛，亦是秘阁防卫露出空当的唯一时刻。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_sect') &&
          Boolean(s.flags.act3_sect_step1),
        insightTags: ['得真相【仙盟百年贡约】', '斩天剑胚或仙盟客卿', '秘阁破枷'],
        effect: { timeMonths: 2, beatDelta: 1 },
        next: 'act3_arc_sect_2',
      },
      {
        id: 'hub3_chamber_1',
        category: 'story',
        label: '驰赴青州百宝分号，查探商号内变、断脉药荒与旧押运卒秘闻',
        subtext: (s) =>
          s.companions.xie_wujiu.met
            ? '百宝斋老掌柜勾结天机商行逼宫夺权，谢无咎兄长旧案露出惊人内鬼（须占本卷一席大势）。'
            : '断脉引发青州药荒，百宝分号内乱背后牵扯着一桩十年前的旧案（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_chamber') &&
          !s.flags.act3_chamber_step1 &&
          canCommitMajorArc(s, 'act3', 'thread_act3_chamber'),
        insightTags: ['百宝内变', '青州药荒', '占一席天时大势'],
        effect: {
          timeMonths: 8,
          beatDelta: 1,
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_chamber' },
        },
        next: 'act3_arc_chamber_1',
      },
      {
        id: 'hub3_chamber_2',
        category: 'story',
        label: (s) =>
          s.companions.xie_wujiu.met
            ? '入百宝总账堂公审内鬼，验明兄长残佩灵灰并直面天机金丹管事'
            : '入百宝总账堂直面商变终局，验明转运井灵灰并与金丹管事周旋',
        subtext: '老掌柜已引天机商行金丹大管事赴堂镇压，商道仁心与越阶博弈一触即发。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_chamber') &&
          Boolean(s.flags.act3_chamber_step1),
        insightTags: ['得真相【转运井灵灰】', '灵脉契与凝丹丸', '总账公审'],
        effect: { timeMonths: 2, beatDelta: 1 },
        next: 'act3_arc_chamber_2',
      },
      {
        id: 'hub3_hearth_1',
        category: 'story',
        label: '越过十余载光阴重返青州城外，踏访旧日杏林医馆',
        subtext: '数载静修流转后重归青州，此行将跨过十五载凡尘岁月（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_hearth') &&
          !s.flags.act3_hearth_step1 &&
          canCommitMajorArc(s, 'act3', 'thread_act3_hearth'),
        insightTags: ['岁月跨度十五载', '杏林旧约', '占一席天时大势'],
        effect: {
          timeMonths: 180,
          beatDelta: 1,
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_hearth' },
        },
        next: 'act3_arc_hearth_1',
      },
      {
        id: 'hub3_hearth_2',
        category: 'story',
        label: (s) =>
          isSuAliveInAct3Hearth(s)
            ? '重回杏林小院，接过苏知微整理完稿的二十载无灵医典'
            : '重回杏林旧庐，收存故人留下的二十载无灵医典与素布玉匣',
        subtext: (s) =>
          isSuAliveInAct3Hearth(s)
            ? '二十载笔墨终成定稿，小院灯火正候着你的脚步。'
            : '杏林旧屋已成空庐，唯余二十载医典与玉匣静候来人。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_hearth') &&
          Boolean(s.flags.act3_hearth_step1),
        insightTags: ['得【无灵归尘印】', '红尘守灯人', '红尘归途'],
        effect: { timeMonths: 12, beatDelta: 1 },
        next: 'act3_arc_hearth_2',
      },
      {
        id: 'hub3_soul_1',
        category: 'story',
        label: '赴西北长明古战场荒泽，查探千年养魂木与上古反抗者遗痕',
        subtext: '荒泽黑雾难得退开一角，各宗筑基修士已纷纷潜往南岸（须占本卷一席大势）。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_soul') &&
          !s.flags.act3_soul_step1 &&
          canCommitMajorArc(s, 'act3', 'thread_act3_soul'),
        insightTags: ['古战荒泽', '斩天会线索', '占一席天时大势'],
        effect: {
          timeMonths: 9,
          beatDelta: 1,
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_soul' },
        },
        next: 'act3_arc_soul_1',
      },
      {
        id: 'hub3_soul_2',
        category: 'story',
        label: '趁月圆雾退登黑柏孤岛，与各宗筑基修士争夺【千年养魂木】',
        subtext: '满月大潮将退尽荒泽瘴雾，孤岛之争一触即发。',
        visible: (s) =>
          s.activeThreads.includes('thread_act3_soul') &&
          Boolean(s.flags.act3_soul_step1),
        insightTags: ['得【千年养魂木】', '苍溟重塑关键', '孤岛争木'],
        effect: { timeMonths: 2, beatDelta: 1 },
        next: 'act3_arc_soul_2',
      },

      // ----- 整合后的九州异动风声入口（保持枢纽精炼） -----
      {
        id: 'hub3_cross_leads',
        category: 'story',
        label: '打听青州与九州四方异动，借公开榜文与舆图切入其余风波',
        subtext: '可借仙盟观礼榜、商路旧闻与古战场海图切入尚未探访的九州大势。',
        visible: (s) =>
          getRemainingMajorArcSlots(s, 'act3') > 0 &&
          ((!s.activeThreads.includes('thread_act3_sect') &&
            !s.completedThreads.includes('thread_act3_sect')) ||
            (!s.activeThreads.includes('thread_act3_chamber') &&
              !s.completedThreads.includes('thread_act3_chamber')) ||
            (!s.activeThreads.includes('thread_act3_hearth') &&
              !s.completedThreads.includes('thread_act3_hearth')) ||
            (!s.activeThreads.includes('thread_act3_soul') &&
              !s.completedThreads.includes('thread_act3_soul'))),
        insightTags: ['不耗光阴打听', '探查其余九州大势'],
        next: 'act3_cross_leads',
      },

      // ----- 谋划台受限行动 -----
      {
        id: 'hub3_cultivate',
        category: 'plan',
        label: '闭关凝练筑基灵液（水磨苦修 / 租地肺灵窟 / 启阵盘灵契）',
        subtext: '筑基境至多闭关两回，稳步推升至筑基中期与后期。',
        requirement: {
          maxUsesInAct: {
            key: 'cultivate',
            max: 2,
            reason: '筑基灵液已达当前圆满极限，须历大势风波或直接叩问金丹大关',
          },
        },
        insightTags: ['自主闭关', '本卷限二回'],
        next: 'act3_action_cultivate',
      },
      {
        id: 'hub3_commission',
        category: 'plan',
        label: '青州行迹：金榜筑基委托与御剑巡游山川',
        subtext: '揭青州金榜赚取二三百灵石（限二回），或御剑巡游古道感悟世情（限三回）。',
        insightTags: ['不耗光阴', '悬赏与巡游'],
        next: 'act3_action_commission',
      },
      {
        id: 'hub3_open_market',
        category: 'market',
        label: '登青州奇珍楼三层大坊，查验牌价、倒卖灵材或竞拍重宝',
        subtext: '灵砂、琥珀与秘宝随九州动荡起伏，随时可入楼查价易物。',
        insightTags: ['九州高阶坊市', '自由入坊不耗光阴'],
        next: 'act3_market',
      },

      // ----- 已结识伴侣的统一拜访入口 -----
      {
        id: 'hub3_companion_visit',
        category: 'companion',
        label: '抽身寻访故人旧交，共论剑意、商局或叩玉问计',
        subtext: '可拜访青州与云岭间已结识且未决裂的同道故人。',
        visible: (s) =>
          (s.companions.shen_qingshuang.met &&
            s.companions.shen_qingshuang.stance !== 'estranged' &&
            s.companions.shen_qingshuang.stance !== 'rival') ||
          (s.companions.xie_wujiu.met &&
            s.companions.xie_wujiu.stance !== 'estranged' &&
            s.companions.xie_wujiu.stance !== 'rival') ||
          (s.companions.su_zhiwei.met && isSuZhiweiAlive(s)) ||
          (s.companions.cang_ming.met &&
            !s.flags.cangming_sealed &&
            s.companions.cang_ming.stance !== 'estranged' &&
            s.companions.cang_ming.stance !== 'rival'),
        insightTags: ['不耗光阴择访', '深化故人情谊'],
        next: 'act3_companion_visit',
      },

      // ----- 卷三高潮入口：结丹大关 -----
      {
        id: 'hub3_golden_core_gate',
        category: 'breakthrough',
        label: '【择机叩关】择一处秘窟闭死关，凝液结丹踏入五百载金丹大道',
        subtext: (s) => {
          const ready: string[] = [];
          if (s.relics.includes('golden_core_elixir')) {
            ready.push('已备九纹凝丹丸');
          }
          if (s.relics.includes('spirit_vein_deed') && s.spiritStones >= 100) {
            ready.push('灵脉契配百石可布阵');
          } else if (s.relics.includes('spirit_vein_deed')) {
            ready.push('手握灵脉契（尚差百石阵引）');
          } else {
            const hasVeinArrayPrereq =
              s.tags.includes('merchant_fame') ||
              s.tags.includes('dark_market_broker') ||
              s.tags.includes('alliance_envoy') ||
              s.mind >= 95;
            if (hasVeinArrayPrereq && s.spiritStones >= 420) {
              ready.push('阵理与四百二十灵石齐备可布九宫阵');
            }
          }
          const hasSwordRoot =
            s.tags.includes('sword_intent_seed') ||
            s.tags.includes('cangming_pact') ||
            s.flags.foundation_grade === 'sword_ancient';
          if (
            s.relics.includes('soul_nourishing_wood') &&
            s.companions.cang_ming.met &&
            s.companions.cang_ming.stance !== 'estranged' &&
            s.companions.cang_ming.stance !== 'rival' &&
            s.companions.cang_ming.affection >= 45 &&
            hasSwordRoot
          ) {
            ready.push('可借养魂木与苍溟古法');
          }
          return ready.length > 0
            ? `眼下筹备：${ready.join(' · ')}，已具叩问金丹之底气。`
            : '结丹九死一生，若无丹药、灵脉契、四百二十灵石九宫大阵或苍溟剑丹古法护道，唯凭极深厚的修为与心境方敢强闯。';
        },
        visible: (s) =>
          s.actBeat >= 3 ||
          s.completedThreads.filter((id) => id.startsWith('thread_act3_')).length >= 2 ||
          s.might >= 65,
        insightTags: (s) => {
          const req = s.flags.studied_core_failure ? 195 : 210;
          return [
            '卷三破境高潮',
            '结丹大道',
            `当前修为+心境 ${s.might + s.mind}（硬冲≥${req} / 稳渡≥300）`,
          ];
        },
        next: 'act3_golden_core_gate',
      },
    ],
  },

  act3_cross_leads: {
    id: 'act3_cross_leads',
    act: 'act3',
    title: '九州风声',
    subtitle: '青州茶肆与牙行传闻',
    location: '青州府 · 望云茶楼',
    paragraphs: [
      '筑基之后，九州四方的动静不再遥不可及。你在茶楼凭栏而坐，案头摆着近来搜罗的几份公开榜文、商报与旧舆图，哪一处暗潮都牵连着金丹机缘。',
    ],
    choices: [
      {
        id: 'hub3_open_sect',
        category: 'story',
        label: '揭下云岭仙盟广发的筑基观礼榜文，主动北上插手灵脉大议',
        subtext: '介入【云岭仙盟大议与沈清霜破枷】之局（须占本卷一席大势）。',
        visible: (s) =>
          !s.activeThreads.includes('thread_act3_sect') &&
          !s.completedThreads.includes('thread_act3_sect') &&
          canCommitMajorArc(s, 'act3', 'thread_act3_sect'),
        insightTags: ['入云岭仙盟大议', '占一席天时大势'],
        effect: {
          timeMonths: 6,
          beatDelta: 1,
          activateThreads: ['thread_act3_sect'],
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_sect' },
        },
        next: 'act3_arc_sect_1',
      },
      {
        id: 'hub3_open_chamber',
        category: 'story',
        label: '循青州药荒与商帮风声，介入百宝斋内变与十年前押运旧案',
        subtext: '介入【青州百宝商变与谢无咎蜕变】之局（须占本卷一席大势）。',
        visible: (s) =>
          !s.activeThreads.includes('thread_act3_chamber') &&
          !s.completedThreads.includes('thread_act3_chamber') &&
          canCommitMajorArc(s, 'act3', 'thread_act3_chamber'),
        insightTags: ['入青州百宝商变', '占一席天时大势'],
        effect: {
          timeMonths: 6,
          beatDelta: 1,
          activateThreads: ['thread_act3_chamber'],
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_chamber' },
        },
        next: 'act3_arc_chamber_1',
      },
      {
        id: 'hub3_open_hearth',
        category: 'story',
        label: '听闻青州城外有位凡医专录无灵疫案二十载，趁行途南下杏林一访',
        subtext: '赴【青州二十载 · 杏林传灯】之约（跨过十五载光阴，须占本卷一席大势）。',
        visible: (s) =>
          !s.activeThreads.includes('thread_act3_hearth') &&
          !s.completedThreads.includes('thread_act3_hearth') &&
          canCommitMajorArc(s, 'act3', 'thread_act3_hearth'),
        insightTags: ['赴青州杏林旧约', '占一席天时大势'],
        effect: {
          timeMonths: 180,
          beatDelta: 1,
          activateThreads: ['thread_act3_hearth'],
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_hearth' },
        },
        next: 'act3_arc_hearth_1',
      },
      {
        id: 'hub3_open_soul',
        category: 'story',
        label: '自青州舆图铺购得长明古战场雾退海图，动身前往荒泽寻养魂木',
        subtext: '赴【长明古战场寻木】之行（须占本卷一席大势）。',
        visible: (s) =>
          !s.activeThreads.includes('thread_act3_soul') &&
          !s.completedThreads.includes('thread_act3_soul') &&
          canCommitMajorArc(s, 'act3', 'thread_act3_soul'),
        insightTags: ['赴古战场寻木', '占一席天时大势'],
        effect: {
          timeMonths: 6,
          beatDelta: 1,
          activateThreads: ['thread_act3_soul'],
          commitMajorArc: { act: 'act3', threadId: 'thread_act3_soul' },
          setFlags: { act3_battlefield_open: true },
        },
        next: 'act3_arc_soul_1',
      },
      {
        id: 'hub3_cross_back',
        label: '收拢舆图与榜文，返回客馆',
        next: 'act3_hub',
      },
    ],
  },

  act3_companion_visit: {
    id: 'act3_companion_visit',
    act: 'act3',
    title: '青州寻故',
    subtitle: '故人相会',
    location: '青州府 · 客馆清阶',
    paragraphs: [
      '筑基岁月漫长，难得几日闲暇。你整了整衣袖，细数仍在青州与云岭间往来的故人旧交，思量先去见谁。',
    ],
    choices: [
      {
        id: 'hub3_visit_shen',
        category: 'companion',
        label: (s) =>
          s.tags.includes('sect_rebel') ||
          Boolean(s.flags.shen_left_sect) ||
          Boolean(s.flags.shen_freed_from_sect)
            ? '循剑羽密信赴云岭松崖剑庐，私会沈清霜共论剑意与仙盟风云'
            : '循剑羽密信赴云岭偏亭，私会沈清霜共论剑意与仙盟风云',
        visible: (s) =>
          s.companions.shen_qingshuang.met &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          s.companions.shen_qingshuang.stance !== 'rival',
        requirement: {
          maxUsesInAct: {
            key: 'visit_shen',
            max: 2,
            reason: '云岭耳目众多，筑基境已两度私会，待正事落定再叙',
          },
          cooldownTurns: {
            key: 'visit_shen',
            turns: 1,
            reason: '刚自云岭别过沈清霜不久，待风声稍缓再叙',
          },
        },
        insightTags: ['拜访沈清霜', '筑基境限2回'],
        next: 'visit_shen_qingshuang',
      },
      {
        id: 'hub3_visit_xie',
        category: 'companion',
        label: (s) =>
          s.relics.includes('baibao_token')
            ? '持玄铁令赴百宝斋分号雅间，寻谢无咎品茗拆解九州商局'
            : '托青岚商路递去暗柬，赴百宝斋分号寻谢无咎拆解九州商局',
        visible: (s) =>
          s.companions.xie_wujiu.met &&
          s.companions.xie_wujiu.stance !== 'estranged' &&
          s.companions.xie_wujiu.stance !== 'rival',
        requirement: {
          maxUsesInAct: {
            key: 'visit_xie',
            max: 2,
            reason: '谢无咎正忙于调度九州暗网，筑基境已两度深谈',
          },
          cooldownTurns: {
            key: 'visit_xie',
            turns: 1,
            reason: '方才自百宝分号叙旧归来，隔一阵再访',
          },
        },
        insightTags: ['拜访谢无咎', '筑基境限2回'],
        next: 'visit_xie_wujiu',
      },
      {
        id: 'hub3_visit_su',
        category: 'companion',
        label: '携一包干桂花南下城外杏林，探望故人苏知微',
        visible: (s) =>
          s.companions.su_zhiwei.met && isSuZhiweiAlive(s),
        requirement: {
          maxUsesInAct: {
            key: 'visit_su',
            max: 2,
            reason: '杏林清幽，筑基境已两度探望，余事留待大势定后再赴',
          },
          cooldownTurns: {
            key: 'visit_su',
            turns: 1,
            reason: '方才自城外杏林辞别不久，过些时日再探',
          },
        },
        insightTags: ['拜访苏知微', '筑基境限2回'],
        next: 'visit_su_zhiwei',
      },
      {
        id: 'hub3_visit_cangming',
        category: 'companion',
        label: '夜半静室叩响焦黑断玉，向苍溟请教上古结丹剑理',
        visible: (s) =>
          s.companions.cang_ming.met &&
          !s.flags.cangming_sealed &&
          s.companions.cang_ming.stance !== 'estranged' &&
          s.companions.cang_ming.stance !== 'rival',
        requirement: {
          maxUsesInAct: {
            key: 'visit_cm',
            max: 2,
            reason: '苍溟残魂须蓄养神光待你结丹，近来暂封断玉休眠',
          },
          cooldownTurns: {
            key: 'visit_cm',
            turns: 1,
            reason: '苍溟方才拆解完剑理，需歇息一阵再叩断玉',
          },
        },
        insightTags: ['唤出苍溟', '筑基境限2回'],
        next: 'visit_cang_ming',
      },
      {
        id: 'hub3_visit_back',
        label: '暂不叨扰故人，折返客馆',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 卷三自主修炼 ====================
  act3_action_cultivate: {
    id: 'act3_action_cultivate',
    act: 'act3',
    title: '筑基凝液',
    subtitle: '自主谋划 · 闭关潜修',
    location: '青州静室 · 聚灵石榻',
    paragraphs: [
      '筑基之后，每一重小境都要以年岁计。丹田灵液若只靠平日吐纳，动辄十载难有寸进。唯借灵脉地气或静坐打磨，方能将灵液炼至如汞沉凝，为结丹铺平根骨。',
      '静室禁制已闭，你盘算着这番闭关该投入几分财力与光阴。',
    ],
    choices: [
      {
        id: 'a3_cult_steady',
        label: (s) =>
          s.realm === 'foundation_late'
            ? '闭门水磨潜修两载，分文不花凝练筑基后期灵液'
            : '闭门水磨潜修两载，分文不花稳步推升筑基小阶',
        subtext: '耗去两年光阴，换来扎实的修为与心境沉淀。',
        insightTags: (s) => [
          '零花费',
          '耗时两载',
          s.realm === 'foundation_late' ? '凝练筑基后期' : '推升筑基小阶',
        ],
        effect: (s) => {
          const nextR = nextFoundationRealm(s);
          const advanced = nextR !== s.realm;
          return {
            timeMonths: 24,
            might: 10,
            mind: 8,
            beatDelta: 1,
            trackActionKey: 'cultivate',
            setRealm: nextR,
            setFlags: { a3_cult_advanced_realm: advanced },
            logSummary: advanced
              ? `于青州静室水磨潜修两载，灵液沉凝踏入【${foundationRealmLabel(nextR)}】。`
              : undefined,
          };
        },
        outcome: [
          '两载寒暑自石室窗缝滑过。你在青灯下将周天灵液反复提纯，去除早年炼气期残留的杂气，灵液越炼越沉，丹田深处渐渐生出一粒温热光核的雏形。',
          (s) =>
            s.flags.a3_cult_advanced_realm
              ? '出关撤去禁制时，楼下客馆的小二已换了一茬。你拂去肩头微尘，身轻如鹤，筑基修为再进一步。'
              : '出关撤去禁制时，楼下客馆的小二已换了一茬。你拂去肩头微尘，筑基后期灵液已沉凝如汞，只待择机叩关结丹。',
        ],
        outcomeContinueLabel: '收功出关 · 返回青州风云',
        bridgeNote: '两年水磨闭关出室，丹田灵液凝实许多，离金丹门槛又近了一步。',
        next: 'act3_hub',
      },
      {
        id: 'a3_cult_vein_chamber',
        label: (s) =>
          s.realm === 'foundation_late'
            ? '掷一百六十灵石租用青州地肺灵窟，一年速炼筑基后期灵液'
            : '掷一百六十灵石租用青州地肺灵窟，一年速成推升小境',
        requirement: { minSpiritStones: 160, lockReason: '需灵石 160' },
        insightTags: ['耗 160 灵石', '耗时一载', '修为暴涨'],
        effect: (s) => {
          const nextR = nextFoundationRealm(s);
          return {
            timeMonths: 12,
            spiritStones: -160,
            might: 16,
            mind: 6,
            beatDelta: 1,
            trackActionKey: 'cultivate',
            setRealm: nextR,
            logSummary:
              nextR !== s.realm
                ? `租用青州地肺灵窟潜修一载，道基精进踏入【${foundationRealmLabel(nextR)}】。`
                : undefined,
          };
        },
        outcome: [
          '青州城北，百丈地底。赤褐岩壁间犹存半条未枯残脉，一百六十块灵石砸进阵眼，满窟阵纹轰然齐亮，滚烫精纯的土灵之气顷刻倒灌经脉。久旱逢霖。',
          '短短一载光阴，你便省下了寻常散修五六年的苦熬。踏出地窟仰望天光，周身灵压沉厚得令守窟执事都微微躬身。',
        ],
        outcomeContinueLabel: '交还窟牌 · 重回青州局中',
        bridgeNote: '重金租用青州地肺灵窟潜修一载，筑基修为大涨。',
        next: 'act3_hub',
      },
      {
        id: 'a3_cult_relic_assist',
        label: '耗四十灵石并借灵脉地契或聚灵阵盘布设洞府大阵，静修一年半',
        visible: (s) =>
          s.relics.includes('spirit_vein_deed') ||
          s.relics.includes('broken_gathering_array'),
        requirement: { minSpiritStones: 40, lockReason: '需灵石 40 置办阵引' },
        insightTags: ['奇物专属', '低耗高收益', '修为心境双增'],
        effect: (s) => {
          const nextR = nextFoundationRealm(s);
          return {
            timeMonths: 18,
            spiritStones: -40,
            might: 16,
            mind: 10,
            beatDelta: 1,
            trackActionKey: 'cultivate',
            setRealm: nextR,
            logSummary:
              nextR !== s.realm
                ? `借随身秘宝布阵静修一年半，修为精进踏入【${foundationRealmLabel(nextR)}】。`
                : undefined,
          };
        },
        outcome: [
          '你仅花了四十灵石购置布阵朱砂与灵炭，便借手头秘宝引来方圆十里的游离灵雾。石室内灵雨绵绵，一载零半年的闭关里气海从未有过半分躁郁。',
          '收阵起身时，你指尖轻轻一弹便激出一道三尺清冽灵芒，修为与心境皆迈上新台阶。',
        ],
        outcomeContinueLabel: '撤阵出关 · 回到青州',
        bridgeNote: '借随身秘宝聚灵潜修一年半，省下重金且修为心境双双精进。',
        next: 'act3_hub',
      },
      {
        id: 'a3_cult_back',
        label: '眼下外头风云吃紧，先不闭关',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 卷三筑基高阶委托与山川巡游 ====================
  act3_action_commission: {
    id: 'act3_action_commission',
    act: 'act3',
    title: '青州金榜与山川巡游',
    subtitle: '自主谋划 · 筑基行迹',
    location: '青州府 · 仙盟矿务司与古道长亭',
    paragraphs: [
      '筑基真人在青州已算得上一号人物。矿务司大厅的紫铜榜上，专留着几桩连宗门外门执事都不敢轻易接下的重金委托，每单动辄二三百灵石。若无心接单，也可直接御剑巡游青州山川古道。',
      '赏金丰厚，凶险也摆在明面上。你扫过几张朱批告示，权衡今日行踪。',
    ],
    choices: [
      {
        id: 'a3_job_mine_beast',
        label: '接下矿务司重赏，下矿斩杀盘踞枯脉深处的二阶玄甲地龙',
        requirement: {
          minMight: 95,
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '青州府高阶悬赏已尽数清榜，短时间内再无配得上筑基真人的大单',
          },
          lockReason: '需修为实力 95',
        },
        insightTags: ['二百八十灵石', '修为与声望', '悬赏限2回'],
        effect: {
          timeMonths: 10,
          spiritStones: 280,
          might: 7,
          renown: 10,
          beatDelta: 1,
          trackActionKey: 'commission',
        },
        outcome: [
          '那头玄甲地龙因枯脉断气发狂，已在矿道里吞了四名采矿护卫。你循着硫磺腥气潜至矿底，以筑基灵压锁死退路，激战半个时辰终将其一剑贯喉。',
          '提着玄甲龙头回到矿务司时，主事喜出望外，当场点清二百八十块中品灵石，并将你的名姓录进了青州客卿录。',
        ],
        outcomeContinueLabel: '收好赏金 · 返回客馆',
        bridgeNote: '矿底斩杀玄甲地龙换得二百八十灵石，青州矿商对你赞誉有加。',
        next: 'act3_hub',
      },
      {
        id: 'a3_job_escort_fleet',
        label: '受九州大商队礼聘，御剑压阵护送灵砂车队穿越云岭裂谷',
        subtext: '凭筑基威势镇场，若握百宝斋令牌或青岚商名还可多拿红利。',
        requirement: {
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '青州府高阶悬赏已尽数清榜，短时间内再无配得上筑基真人的大单',
          },
        },
        insightTags: (s) => [
          (s.relics.includes('baibao_token') && !isXieHostile(s)) ||
          s.tags.includes('merchant_fame')
            ? '二百九十灵石·商道红利'
            : '二百二十灵石',
          '声望与入世',
          '悬赏限2回',
        ],
        effect: (s) => {
          const hasBaibaoEdge =
            s.relics.includes('baibao_token') && !isXieHostile(s);
          const hasTradeEdge = hasBaibaoEdge || s.tags.includes('merchant_fame');
          return {
            timeMonths: 12,
            spiritStones: hasTradeEdge ? 290 : 220,
            renown: hasTradeEdge ? 10 : 8,
            mind: 5,
            worldly: hasTradeEdge ? 6 : 3,
            beatDelta: 1,
            trackActionKey: 'commission',
          };
        },
        outcome: [
          (s) =>
            s.relics.includes('baibao_token') && !isXieHostile(s)
              ? '商队大掌柜见你有百宝斋门路，一路礼敬有加。行经云岭裂谷时两伙劫修远远感应到你的筑基剑气，连面都没敢露便缩回崖雾。货抵青州南埠，对方痛快结清二百九十块灵石，还替你在九州商号间广传美名。'
              : s.tags.includes('merchant_fame')
              ? '商队大掌柜久闻你在青岚攒下的商道威名，一路礼敬有加。行经云岭裂谷时两伙劫修远远感应到你的筑基剑气，连面都没敢露便缩回崖雾。货抵青州南埠，对方痛快结清二百九十块灵石，还替你在九州商号间广传美名。'
              : '十二个月风霜跋涉，你日夜以神识覆盖车队前后十里，在云岭裂谷口一剑逼退企图截货的散修头目。交货落袋，东家双手奉上二百二十块灵石，连声称谢。',
        ],
        outcomeContinueLabel: '辞别商队 · 返回青州',
        bridgeNote: '护送灵砂商队安然越过云岭，腰囊一下子充盈起来。',
        next: 'act3_hub',
      },
      {
        id: 'a3_job_ancient_formation',
        label: '应旧族重金邀请，入南山古废墟拆解一处前朝残阵起出阵核',
        requirement: {
          minMind: 135,
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '青州府高阶悬赏已尽数清榜，短时间内再无配得上筑基真人的大单',
          },
          lockReason: '需心境定力 135',
        },
        insightTags: ['三百一十灵石', '心境与声望', '悬赏限2回'],
        effect: {
          timeMonths: 10,
          spiritStones: 310,
          mind: 7,
          renown: 9,
          beatDelta: 1,
          trackActionKey: 'commission',
        },
        outcome: [
          '前朝残阵杀机暗藏，一步踏错便会被雷火绞成飞灰。你沉心静气，对着残碑推演七日才找准生门死位，稳稳将那枚温热的玉质阵核起出废墟。',
          '雇主如约奉上三百一十块灵石，临走前还将半张记录残阵刻纹的拓纸送你留念，令你对上古阵法又多悟三分。',
        ],
        outcomeContinueLabel: '收好润笔 · 返回青州',
        bridgeNote: '拆解南山前朝残阵换得三百一十灵石，距筹齐结丹重宝又近一步。',
        next: 'act3_hub',
      },
      {
        id: 'hub3_wander',
        category: 'plan',
        label: '御剑巡游青州山川与古道驿站，感悟寒暑世情、撞碰九州机缘',
        subtext: '筑基期间至多巡游三回，偶遇青州奇闻机缘。',
        visible: (s) =>
          s.seenRandomEvents.filter((id) => id.startsWith('rand_act3_')).length <
          4,
        requirement: {
          maxUsesInAct: {
            key: 'wander',
            max: 3,
            reason: '青州山川古道已巡行三遍，眼下重事在身，不宜再分神游荡',
          },
        },
        insightTags: ['青州游历奇遇', '巡游限3回'],
        effect: {
          timeMonths: 10,
          might: 5,
          beatDelta: 1,
          trackActionKey: 'wander',
          setReturnSceneId: 'act3_hub',
        },
        next: '__RANDOM_ACT3__',
      },
      {
        id: 'a3_job_back',
        label: '合上悬赏榜，折返客馆',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 卷三九州大坊 ====================
  act3_market: {
    id: 'act3_market',
    act: 'act3',
    title: '九州奇珍楼',
    subtitle: '卷三 · 筑基大坊',
    location: '青州城南 · 奇珍楼三层雅席',
    market: {
      venueName: '九州奇珍楼 · 筑基灵材与秘宝暗拍',
      venueDesc:
        '此间专供筑基与金丹修士吞吐重货。仙盟剑拔弩张、天机商行锁药与古战场雾散，都会在三楼玉牌上化作真金白银的涨跌。',
      goodsIds: [
        'golden_vein_sand',
        'soul_amber',
        'spirit_marrow_oil',
        'ancient_rubbing',
      ],
      relicOffers: [
        {
          relicId: 'golden_core_elixir',
          basePrice: 520,
          category: 'elixir',
          when: (s) => !s.relics.includes('golden_core_elixir'),
        },
        {
          relicId: 'soul_nourishing_wood',
          basePrice: 460,
          category: 'curio',
          when: (s) => !s.relics.includes('soul_nourishing_wood'),
        },
        {
          relicId: 'longevity_dew',
          basePrice: 280,
          category: 'elixir',
          when: (s) => !s.relics.includes('longevity_dew'),
        },
      ],
    },
    paragraphs: [
      '奇珍楼三层铺着隔绝神识的寒玉地砖，席间坐着的尽是各宗执事与成名散修。高台上侍者每揭开一只紫檀匣，台下灵石牌价便是一阵无声厮杀。',
      {
        when: (s) => s.relics.includes('baibao_token'),
        text: (s) =>
          isXieHostile(s)
            ? '你搁下【百宝斋玄铁令】，楼中管事瞥了一眼便神色一冷，将木牌推回案沿：“谢少东家早已销了阁下这块铁令的账，今日奇物一律照市价算。”'
            : '你随手将【百宝斋玄铁令】搁在茶案边，楼中管事神色一肃，亲自奉上明前灵茶，压低声音道：“谢少东家早有交代，阁下今日竞拍奇物，照旧享折让一成半礼遇。”',
      },
      {
        when: (s) => s.relics.includes('spirit_vein_deed'),
        text: '听说你手握青州灵脉地契，邻座几名丹铺大掌柜纷纷起身敬茶，言语间处处透着结交之意。',
      },
    ],
    choices: [
      {
        id: 'market3_return_hub',
        label: '收拢账目与购得的灵材奇物，步出奇珍楼',
        insightTags: ['返回青州风云'],
        bridgeNote: '自九州奇珍楼归来，手头筹码重新落定，窗外山雨欲来。',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 暗线一：仙盟大议与沈清霜破枷 ====================
  act3_arc_sect_1: {
    id: 'act3_arc_sect_1',
    act: 'act3',
    title: '仙盟大议',
    subtitle: '卷三 · 仙盟风云（上）',
    location: '云岭 · 九州仙盟白玉大殿',
    paragraphs: [
      '云岭白玉大殿前旌旗猎猎，青云剑宗、太乙丹谷与天星阁三位金丹长老高坐玄坛。台下聚着青州百余名筑基修士，名义上是商议枯竭灵脉的重新分派，实则半个时辰里尽是三大宗门瓜分残矿的官样文章。',
      '午时刚过，青云宗刑律长老起身展开一卷金丝名牒，朗声宣读本届九州「飞升候补」首位人选：青云剑宗内门首座沈清霜。满殿顿时响起一阵违心的恭贺声，唯独殿柱后的几位老散修交换着讳莫如深的眼神。',
      {
        when: (s) => s.relics.includes('qingyun_sword_tally'),
        text: (s) =>
          s.flags.qingyun_elders_hostile
            ? '你早将那枚【青云外门剑令】压进袖底，只混在散修偏席后排冷眼旁观，免得引来青云执法长老发难。'
            : '你袖中那枚【青云外门剑令】让你免去盘查径直坐到了偏席前排，几名青云旧识执事远远朝你颔首致意，浑然不知你此刻心头寒意正盛。',
      },
      {
        when: (s) => s.tags.includes('origin_fallen_clan'),
        text: '殿上三名长老举盏示意时的古礼暗指，你自幼在祠堂旧谱里见过。那是前朝大宗宣读死囚名牒的礼数，绝非什么飞升贺仪。',
      },
      {
        when: (s) =>
          s.companions.shen_qingshuang.met && !isShenHostile(s),
        text: (s) =>
          s.flags.qingyun_elders_hostile
            ? '散会歇息时，你依着剑羽信中约定的暗记转入大殿西侧梅廊。沈清霜一袭素白剑袍立在廊柱阴影里，袖中指节微凉，迅速将一枚铜钥滑进你掌心：“那是封宴夜仙盟秘阁偏门的钥匙。长老们把三宗与上界使者签的百年贡约锁在里头，阁底寒坛还封着一柄前朝遗下的【斩天剑胚】。封宴那晚若不破枷，明年开春我便会被送去充作百年大贡的飞升候补，再无归期。”'
            : '散会歇息时，你在大殿西侧梅廊寻见了避开人群的沈清霜。她一袭素白剑袍立在廊柱阴影里，见是你来，微凉指节迅速将一枚铜钥滑进你掌心：“那是封宴夜仙盟秘阁偏门的钥匙。长老们把三宗与上界使者签的百年贡约锁在里头，阁底寒坛还封着一柄前朝遗下的【斩天剑胚】。封宴那晚若不破枷，明年开春我便会被送去充作百年大贡的飞升候补，再无归期。”',
      },
      {
        when: (s) => s.companions.shen_qingshuang.met && isShenHostile(s),
        text: (s) =>
          s.companions.shen_qingshuang.stance === 'estranged'
            ? '沈清霜端坐于青云席首，听见自己名字时连眉峰都未动一下。散场经由偏廊，她与你擦肩而过，剑鞘微震透出一缕刺骨霜气：“当年飞升崖你拿我换了筑基丹，今日又来云岭看我笑话？滚开，秘阁里的债我自己去算。”她话音未落便疾步消失在回廊尽头，眼中杀意与决绝毫不掩饰。'
            : '沈清霜端坐青云席首，听见点名时只按住剑柄冷冷扫了你一眼。散场在梅廊错身，她未递半寸温情，嗓音寒如松雪：“你我道不同，仙盟秘阁的事不必插手。若封宴夜撞见，剑锋不认旧识。”',
      },
      {
        when: (s) => !s.companions.shen_qingshuang.met,
        text: '你冷眼旁观。那名白衣女修沈清霜接过候补玉牌时，指腹竟把玉沿捏出了细裂。退席后你在梅廊拦住她，压低声音道出早年在青岚听闻的「天门无归」旧疑。沈清霜眸光骤凝，审视你片刻后自袖中悄然露出一枚偏门铜钥：“你既知飞升是局，封宴夜仙盟秘阁必有铁证，里头还封着一柄前朝【斩天剑胚】。敢不敢同走一遭？”',
      },
    ],
    choices: [
      {
        id: 'sect1_plan_heist',
        label: '收下秘阁铜钥，与沈清霜约定封宴夜直闯秘阁盗出贡约与剑胚',
        subtext: '彻底与仙盟顽固高层撕破脸，换沈清霜自由与斩天重宝。',
        visible: (s) => !isShenHostile(s),
        insightTags: ['沈清霜深厚信任', '备战秘阁破枷', '修为与正道'],
        effect: (s) => {
          const metBefore = s.companions.shen_qingshuang.met;
          return {
            might: 8,
            mind: 6,
            righteous: 8,
            setFlags: {
              act3_sect_step1: true,
              act3_sect_conflict: true,
              act3_sect_plan: 'heist',
            },
            companionUpdates: {
              shen_qingshuang: {
                meet: true,
                markSeen: true,
                affectionDelta: 14,
                chronicle: metBefore
                  ? '云岭梅廊重逢，你毫不犹豫接下秘阁铜钥，愿陪她于封宴之夜斩断仙盟枷锁。'
                  : '云岭梅廊初逢，你毫不犹豫接下秘阁铜钥，愿陪她于封宴之夜斩断仙盟枷锁。',
              },
            },
            logSummary:
              '赴云岭仙盟大议与沈清霜密议，定下封宴夜闯仙盟秘阁破枷之计。',
          };
        },
        outcome: [
          '你接过并攥紧那枚还带着她掌心微温的铜钥，压低声音道：“既叫飞升候补，不如就让全九州看看，仙盟到底把弟子送进了什么地方。”',
          '沈清霜紧绷的肩线松了半分。她将秘阁三道阵纹的生门画在你掌心，随即在巡殿执事转过廊角前抽身离去：“两月后封宴亥时，秘阁青铜门外见。”',
        ],
        outcomeContinueLabel: '暗记阵位 · 退回客馆整备',
        bridgeNote:
          '云岭大议暗潮已起，你与沈清霜定下了封宴夜闯仙盟秘阁的险计。',
        next: 'act3_hub',
      },
      {
        id: 'sect1_probe_elders',
        label: '暂不急于硬闯，先持筑基名帖周旋于各宗执事间摸清仙盟裂隙',
        subtext: '太乙丹谷与天星阁未必铁板一块，握住筹码或许能以巧破局。',
        insightTags: ['心境与声望', '开启权谋妥协路'],
        effect: (s) => {
          const hasRubbing = s.relics.includes('ancient_stele_rubbing');
          return {
            mind: hasRubbing ? 14 : 10,
            renown: hasRubbing ? 16 : 10,
            worldly: 8,
            setFlags: {
              act3_sect_step1: true,
              act3_sect_conflict: true,
              act3_sect_plan: 'diplomacy',
              sect1_used_rubbing: hasRubbing,
            },
            companionUpdates: !isShenHostile(s)
              ? {
                  shen_qingshuang: {
                    meet: true,
                    markSeen: true,
                    affectionDelta: 6,
                    chronicle:
                      '大议间隙你替她暗中探清各宗长老派系分歧，谋定而后动。',
                  },
                }
              : undefined,
            logSummary:
              '于云岭大议间周旋各宗执事，摸清仙盟内部对百年贡约的暗中分歧。',
          };
        },
        outcome: [
          (s) =>
            s.flags.sect1_used_rubbing
              ? '接下来两日，你借观礼筑基真人身份连赴夜宴，私下向两名抱怨分矿不公的太乙丹谷执事亮出一角【飞升古碑残拓】。对方看清拓文顿时脸色发白，再不敢藏私，和盘托出三宗主战派对年年纳贡的怨怼与长老裂隙。'
              : '接下来两日，你借着观礼筑基真人的身份连赴三场夜宴，从两名抱怨灵矿分配不公的太乙丹谷执事口中套出了实话：三大宗里本就有主战派不满年年向天门纳贡，只是苦无铁证压服顽固长老。',
          (s) =>
            isShenHostile(s)
              ? '你未向沈清霜递去半字风声，只暗记下各宗执事的破绽与秘阁换防时辰。待封宴夜拿到贡约，进退筹码全握在你自己掌中。'
              : '你将这份底细借剑羽捎给沈清霜，约好封宴亥时在仙盟秘阁偏门会合。如今软硬两套筹算都在掌中，无论撕破脸还是逼长老低头，你都有了进退余地。',
        ],
        outcomeContinueLabel: '胸有成竹 · 静候封宴之夜',
        bridgeNote:
          '你已摸清仙盟各宗之间的裂隙，待封宴夜进秘阁拿到贡约，便能反客为主。',
        next: 'act3_hub',
      },
      {
        id: 'sect1_confront_rival',
        label: '盯紧沈清霜动向，准备在封宴夜秘阁外坐收渔利、强夺重宝',
        subtext: '既然理念相左，秘阁里的贡约与剑胚各凭剑锋说话。',
        visible: (s) =>
          isShenHostile(s) ||
          s.alignment.righteous <= -10,
        insightTags: ['对立交锋', '锋芒与魔煞'],
        effect: {
          might: 10,
          mind: 5,
          righteous: -8,
          setFlags: {
            act3_sect_step1: true,
            act3_sect_conflict: true,
            act3_sect_plan: 'rival',
          },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
            },
          },
          logSummary:
            '云岭大议上冷眼旁观沈清霜困局，决意在封宴之夜借机抢夺仙盟秘阁重宝。',
        },
        outcome: [
          '你远远缀在青云弟子队列后方，记下了沈清霜深夜勘察秘阁偏门的落脚处。她要掀青云的桌子，你便顺手截下那张桌子上最沉的筹码。',
          '山风刮过云岭石阶，你擦亮剑锋返回青州落脚处，静待两月后封宴钟响。',
        ],
        outcomeContinueLabel: '拭剑待夜 · 返回客馆',
        bridgeNote:
          '你已锁死沈清霜夜闯秘阁的路线，两月后的封宴之夜必有一场恶战。',
        next: 'act3_hub',
      },
    ],
  },

  act3_arc_sect_2: {
    id: 'act3_arc_sect_2',
    act: 'act3',
    title: '秘阁破枷',
    subtitle: '卷三 · 仙盟风云（终章）',
    location: '云岭 · 仙盟秘阁玄铁密室',
    checkpoint: true,
    checkpointLabel: '卷三 · 仙盟秘阁抉择',
    paragraphs: [
      '封宴亥时。前殿丝竹喧天，后山秘阁却静得只闻寒风刮过檐铃。玄铁密室中央供着赤铜封匣。匣中血契墨迹森然，正是三大正宗千年前与上界签下的【仙盟百年贡约】：每百年举荐三名天骄充作飞升候补，并定期上交灵石矿税。',
      '然而与你先前设想的纯粹勾结不同，血契末页附着一卷历代太乙长老的泣血按语——上面赫然写着：“千年前域外天幕频现裂纹，上界使者言明，唯有下界按期奉上灵脉与化神道种，上界方肯赐力稳固界壁不崩。我等手送亲传弟子赴天门，非贪荣华，实为替九州亿万生灵续命百年！”',
      (s) => {
        const refutations: string[] = [];
        if (s.truthClues.includes('clue_tianji_portal')) {
          refutations.push('转运井底化作药渣的灵灰');
        }
        if (s.truthClues.includes('clue_changming_night')) {
          refutations.push('长明元年焚灭九位剑尊的烬火');
        }
        return refutations.length > 0
          ? `你指尖微冷：若未见过${refutations.join('与')}，几乎真要信了这份冠冕堂皇的“保命贡约论”！所谓护界之约，究竟是不得已的妥协，还是上界用来驯服正道宗门的弥天大谎？`
          : '读罢这段按语，你心头骤然沉重几分——若仙盟长老所言不虚，掀翻贡约会不会反令九州天幕崩塌？在找到更硬的物证戳穿之前，这桩三千年旧案远比表面复杂。';
      },
      '密室最深处的寒冰石台上，斜插着一柄尚未刻铭的漆黑剑胚。你刚靠近三步，腰间佩剑便发出低沉嗡鸣，青石地板凝起一层薄霜。那便是长明旧纪遗落的【斩天剑胚】。',
      {
        when: (s) => Boolean(s.flags.ev_broken_sword_note),
        text: '剑脊上残存的三道斜刻，竟与当年旧书摊淘来的那半页【断剑残帖】严丝合缝。原是同一柄剑上拓下的锋意。',
      },
      {
        when: (s) =>
          !isShenHostile(s) &&
          s.flags.act3_sect_plan !== 'rival',
        text: '石门外忽有巡逻铜锣急响，数道筑基巅峰的执法剑光正疾掠而来。沈清霜依约先一步挑开封匣取出百年贡约，白衣在灯火下亮得惊人，转身望你：“执事们已封住山道。此刻拿剑胚硬杀出去，你我再无回头路。若你想借这份血契逼长老低头谈条件，我也听你的。”',
      },
      {
        when: (s) =>
          isShenHostile(s) ||
          s.flags.act3_sect_plan === 'rival',
        text: (s) =>
          s.companions.shen_qingshuang.stance === 'estranged'
            ? '寒风灌入密室。沈清霜刚把百年贡约收入袖中并拔起【斩天剑胚】，闻声豁然回身，双剑齐鸣、杀气透骨：“果然是你！上回飞升崖替长老递刀，今日休想带走半页纸！”剑锋直指咽喉。'
            : '寒风卷入密室，沈清霜正将百年贡约收入袖中，反手握住寒台上的【斩天剑胚】。见你未发暗号便悄无声息踏入石门，她剑尖微抬，目光冷峻审视：“阁下尾随我潜入秘阁，究竟是来助我破枷，还是打算螳螂捕蝉？”',
      },
    ],
    choices: [
      {
        id: 'sect2_break_vault_with_shen',
        label: '与沈清霜并肩夺下【斩天剑胚】与百年贡约，斩碎候补玉牌杀出云岭',
        subtext: '背上「仙盟叛逆」之名，彻底解放沈清霜并握紧未来斩断天门的核心兵器。',
        visible: (s) => !isShenHostile(s),
        insightTags: [
          '得【斩天剑胚】',
          '得真相【仙盟百年贡约】',
          '命格【仙盟叛逆】',
          '沈清霜至深羁绊',
        ],
        effect: (s) => ({
          might: 12,
          mind: 10,
          renown: 12,
          righteous: 14,
          addTags: ['sect_rebel'],
          removeRelics: s.relics.includes('qingyun_sword_tally')
            ? ['qingyun_sword_tally']
            : undefined,
          addRelics: ['severing_sword_embryo'],
          addTruthClues: ['clue_alliance_pact'],
          completeThreads: ['thread_act3_sect'],
          setFlags: {
            qingyun_elders_hostile: true,
            shen_freed_from_sect: true,
            shen_left_sect: true,
            act3_sect_conflict: true,
          },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 18,
              setStance:
                s.companions.shen_qingshuang.affection + 18 >= 75
                  ? 'bonded'
                  : 'confidant',
              setStage: 4,
              chronicle:
                '仙盟秘阁之夜，她当众斩碎飞升候补玉牌，与你携【斩天剑胚】杀出云岭，自此叛离宗门与你并肩逆天。',
            },
          },
          logSummary:
            '夜闯云岭仙盟秘阁夺得【斩天剑胚】与【仙盟百年贡约】，护沈清霜斩碎候补玉牌杀出重围。',
        }),
        outcome: [
          '你大步上前拔起寒台上的【斩天剑胚】，刺骨锋芒顺着臂骨直冲灵台！石门轰然撞开的一瞬，你与沈清霜剑气交汇，一道白霜青芒硬生生劈断迎面罩落的十二柄执法飞剑！',
          '冲上殿前白玉阶时，沈清霜在数十名大宗长老惊怒的目光中抬手抛起那块「飞升候补」金玉牌，回剑将其斩成两截！碎玉滚落石阶，她回首望你，清冷眉眼散尽多年枷锁：“青云首座今日已死。往后这一剑不为宗门，只与你共指九霄。”',
          '二人御剑冲破云岭护山大阵的缺口，身后钟鼓齐鸣，仙盟通缉令彻夜传遍九州，却也有无数寒心散修在暗处记住了你的名字。',
        ],
        outcomeContinueLabel: '携剑胚破雾南归 · 返回青州',
        bridgeNote:
          '你与沈清霜大闹云岭秘阁、携【斩天剑胚】杀出重围，仙盟追令已下，却也彻底斩断了套在她颈上的枷锁。',
        next: 'act3_hub',
      },
      {
        id: 'sect2_cunning_compromise',
        label: '迅速拓印百年贡约留作把柄，反凭铁证逼仙盟金丹长老密谈妥协',
        subtext: (s) => evaluateCoercion(s, 'act3_sect_elder').warningText,
        insightTags: (s) => {
          const ev = evaluateCoercion(s, 'act3_sect_elder');
          return ev.canSucceed
            ? [
                `底牌已成：${ev.leverageSummary}`,
                '命格【仙盟客卿】（后续斩天盟忌惮）',
                '灵石180与高声望',
              ]
            : [
                '【极险】无内线/越阶战力压阵',
                ev.canSurviveFail ? '恐遭金丹长老灭口重伤遁走' : '恐遭金丹长老当场格杀（陨落）',
              ];
        },
        effect: (s): ChoiceEffect => {
          const ev = evaluateCoercion(s, 'act3_sect_elder');
          if (!ev.canSucceed) {
            if (!ev.canSurviveFail) {
              return {
                timeMonths: 0,
                setFlags: {
                  killed_by_silencing: true,
                  silencing_killer: '云岭仙盟执法金丹长老',
                  silencing_context: 'act3_sect',
                  sect2_coercion_result: 'killed',
                },
                logSummary: '筑基之身无内线死手亦无越阶实力，在仙盟秘阁亮贡约威胁金丹长老，遭当场镇杀灭口。',
              };
            }
            return {
              timeMonths: 6,
              might: -5,
              lifespanBonus: -6,
              addTags: ['sect_rebel'],
              removeRelics: s.relics.includes('qingyun_sword_tally')
                ? ['qingyun_sword_tally']
                : undefined,
              addTruthClues: ['clue_alliance_pact'],
              completeThreads: ['thread_act3_sect'],
              setFlags: {
                qingyun_elders_hostile: true,
                escaped_silencing_act3_sect: true,
                sect2_coercion_result: 'escaped',
              },
              companionUpdates: !isShenHostile(s)
                ? {
                    shen_qingshuang: {
                      markSeen: true,
                      affectionDelta: -4,
                      chronicle: '秘阁内你误判形势欲空手要挟金丹长老，险遭灭口，全靠保命底牌血战逃出云岭。',
                    },
                  }
                : undefined,
              logSummary: '无底牌在仙盟秘阁强胁金丹长老反遭灭口，折寿六载重伤逃出云岭，反被通缉为叛逆。',
            };
          }

          return {
            mind: 12,
            renown: 18,
            spiritStones: 180,
            worldly: 10,
            addTags: ['alliance_envoy'],
            addTruthClues: ['clue_alliance_pact'],
            completeThreads: ['thread_act3_sect'],
            setFlags: {
              act3_sect_compromise: true,
              sect2_compromise_hostile_shen: isShenHostile(s),
              sect2_coercion_result: 'success',
              sect2_used_power: ev.powerOk,
              sect2_used_switch: ev.switchOk,
            },
            companionUpdates: {
              ...(!isShenHostile(s)
                ? {
                    shen_qingshuang: {
                      meet: true,
                      markSeen: true,
                      affectionDelta: 6,
                      setStage: 4,
                      chronicle:
                        '你借暗线筹码与铁证逼退顽固长老，替她争来外巡避祸之机，但你也正式挂上了仙盟客卿之印。',
                    },
                  }
                : {}),
              ...(s.companions.cang_ming.met && s.companions.cang_ming.stance !== 'estranged'
                ? {
                    cang_ming: {
                      affectionDelta: -8,
                      chronicle: '见你接下仙盟客卿玄印与顽固长老妥协，他在断玉里冷嗤了一声。',
                    },
                  }
                : {}),
            },
            logSummary: isShenHostile(s)
              ? '凭暗约与底牌反挟仙盟金丹长老，独取【仙盟客卿】印与百八灵石封口。'
              : '凭暗约与底牌反挟仙盟金丹长老，获授【仙盟客卿】印并换得沈清霜外巡避祸。',
          };
        },
        outcome: [
          (s) => {
            if (s.flags.sect2_coercion_result === 'killed') {
              return '你刚亮出一角拓下的血契，破门而入的仙盟金丹长老便袖袍一甩、金印轰然镇落，嗓音威严冰冷：“放肆！小小筑基散修，无宗无凭也敢窃持仙盟秘录胁迫长老？此殿禁制隔绝万里，今日就地正法，谁知晓你曾踏足云岭半步！”';
            }
            if (s.flags.sect2_coercion_result === 'escaped') {
              return '你刚亮出血契威胁，破门而入的金丹长老便寒眉倒竖，冷哼如雷：“连个外应都未布置，便敢在云岭秘阁挟制金丹？清理门户，可比与你讨价还价省事百倍！”金丹威压如泰山压顶，一记赤金掌印直拍天灵！';
            }
            if (s.flags.sect2_used_switch) {
              if (s.flags.act3_sect_plan === 'diplomacy') {
                return '执事破门前夕，你从容亮出血契拓影与先前太乙主战派执事签押的暗约玉简：“太乙丹谷偏殿与青州多处茶楼各压着一份抄本，若我今夜死在秘阁，天明前全九州便会看见仙盟百年贡约！”赶来的金丹长老脸色剧变，喝退弟子请你入偏殿密谈。';
              }
              const hasBaibaoNet = Boolean(
                s.flags.xie_deadman_switch ||
                  (s.relics.includes('baibao_token') &&
                    !isXieHostile(s) &&
                    s.companions.xie_wujiu.affection >= 25) ||
                  (s.daoPartnerId === 'xie_wujiu' && !isXieHostile(s))
              );
              const netPhrase = hasBaibaoNet
                ? '百宝暗网与青州多处茶楼'
                : '青岚与青州多处暗桩茶楼';
              return `执事破门前夕，你从容亮出血契拓影与早就分寄暗桩的死手回执：“${netPhrase}已压下连环死手密信，若我今夜死在秘阁，天明前全九州便会看见仙盟百年贡约！”赶来的金丹长老脸色剧变，喝退弟子请你入偏殿密谈。`;
            }
            return '金丹长老本欲出手灭口，却在掌风触及你身前三尺时骇然止步——你周身勃发的越阶剑意竟震裂了他护身法袍！眼见强杀必闹出惊天动静引来前殿百余宗门观礼修士，长老脸色铁青，终究喝退弟子请你入偏殿密谈。';
          },
          (s) => {
            if (s.flags.sect2_coercion_result === 'killed') {
              return '金丹杀意碾碎了你所有防御，你的元神与血契拓纸一同化作飞灰。次日云岭大议照常举行，无人知道秘阁石砖下多了一缕不甘的筑基残魂。';
            }
            if (s.flags.sect2_coercion_result === 'escaped') {
              return '危急关头你燃尽保命底牌硬扛下金丹一击，经脉焦裂、呕血撞穿秘阁暗窗坠入云雾！折损六载寿元狼狈逃回青州后，仙盟通缉令已贴满大街。你靠在冷巷墙根缓缓喘定，指间残纸犹带焦烟。';
            }
            return s.flags.sect2_compromise_hostile_shen
              ? '三炷香定案。长老沉声苦辩百年贡约乃为“替九州稳住天幕不崩”，你暂不公开血契，仙盟赐下【仙盟客卿】玄印并奉一百八十灵石封口。你深知此印必令反抗者对你心生忌惮，却也换来了实实在在的通行权势。'
              : '三炷香后交易落定。长老苦辩百年贡约乃为“换上界稳住九州界壁”，你暂不公开血契，仙盟赐你【仙盟客卿】玄印、奉百八灵石，并改令沈清霜离山外巡暂缓入阁。只是手握此印，往后若遇真正反抗仙盟之人，只怕难再轻信于你。';
          },
        ],
        outcomeContinueLabel: (s) =>
          s.flags.sect2_coercion_result === 'killed'
            ? '秘阁灭口 · 展卷终局'
            : s.flags.sect2_coercion_result === 'escaped'
            ? '重伤遁出云岭 · 返回青州'
            : '佩客卿印下山 · 返回青州',
        bridgeNote: (s) =>
          s.flags.sect2_coercion_result === 'escaped'
            ? '空手威胁金丹长老反遭灭口重创，你折寿逃出云岭，从此上了仙盟通缉榜。'
            : '你凭暗线筹码与铁证逼得仙盟妥协，身佩【仙盟客卿】印下山。',
        next: (s) =>
          s.flags.sect2_coercion_result === 'killed' ? 'ending_silenced' : 'act3_hub',
      },
      {
        id: 'sect2_rival_duel',
        label: '趁机出手正面截击沈清霜，以剑锋分高下，强夺【斩天剑胚】与贡约',
        subtext: '彻底坐实与沈清霜的宿敌之局，但所有重宝尽归你手。',
        visible: (s) =>
          isShenHostile(s) ||
          s.flags.act3_sect_plan === 'rival',
        insightTags: [
          '宿敌决战',
          '强夺【斩天剑胚】',
          '得真相【仙盟百年贡约】',
          '修为大增',
        ],
        effect: (s) => ({
          might: 15,
          renown: 10,
          righteous: -16,
          addRelics: ['severing_sword_embryo'],
          addTruthClues: ['clue_alliance_pact'],
          completeThreads: ['thread_act3_sect'],
          setFlags: {
            fought_shen_at_vault: true,
            shen_left_sect: true,
            qingyun_elders_hostile: true,
          },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: -18,
              setStance:
                s.companions.shen_qingshuang.stance === 'estranged'
                  ? 'estranged'
                  : 'rival',
              setStage: 4,
              chronicle:
                '仙盟秘阁前与你血战三十回合，肩伤失剑胚，退入夜雾前冷誓他日天门之下再分生死。',
            },
          },
          logSummary:
            '在云岭仙盟秘阁正面击败宿敌沈清霜，强夺【斩天剑胚】与【仙盟百年贡约】脱身。',
        }),
        outcome: [
          '狭室之中剑影如瀑！沈清霜含恨出剑，霜气逼得石壁结满冰棱，你却借着先手卡住石门地利，三十回合后硬生生震偏她手腕，反手夺过漆黑沉重的【斩天剑胚】与半卷百年贡约！',
          '执法铜锣已逼近廊口。沈清霜捂着渗血的右肩掠上檐角，居高临下望着你，声音冷得像万载寒潭：“拿稳这柄剑。待你我踏上金丹、元婴，这笔账与天门那笔账，我会亲手找你一并清算。”',
          '话音散入山风，她借雾远遁。你拎着嗡鸣不休的剑胚破窗跃下云岭，身后追兵怒吼连连却再难追上你的遁光。',
        ],
        outcomeContinueLabel: '携战利剑胚远遁 · 返回青州',
        bridgeNote:
          '秘阁一战你强夺【斩天剑胚】与百年贡约，与沈清霜的恩怨已成不死不休之局。',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 暗线二：百宝内变与仁商血债（谢无咎全新卷三线） ====================
  act3_arc_chamber_1: {
    id: 'act3_arc_chamber_1',
    act: 'act3',
    title: '百宝内变',
    subtitle: '卷三 · 青州商潮（上）',
    location: '青州府 · 百宝分号后院密室',
    paragraphs: [
      '青州周边三座灵矿断脉后，城中丹药与辟谷粮价一日三涨，无数底层散修连最寻常的培元散都买不起。原本平抑市价的百宝斋青州分号却忽然大门紧闭——坐镇三十年的二掌柜周恪串通几位顽固元老发动逼宫，欲趁断脉灾荒囤药哄抬五倍市价，并把谢无咎当作投名状交给天机商行，以换取半条新矿开采份子！',
      '更令百宝暗楼气氛骤降冰点的，是昨晚一名满身箭伤的告老押运老卒爬进后院吐出的一句遗言：当年谢无咎兄长在青州“沐光飞升”前夜，并非自愿入阵，而是被周恪亲手下药迷倒、卖进了城东暗港那口天机转运深井！',
      {
        when: (s) => s.companions.xie_wujiu.met && !isXieHostile(s),
        text: '油灯下，向来笑谈盈亏的谢无咎第一次显得有些狼狈。袖口沾着老卒临终留下的血迹，他合起玄铁折扇，声音沙哑：“当年我总笑我哥太过仁善不懂算计，才信了外人。没想到卖掉他的，竟是看着我长大的百宝老掌柜。不日账堂公审，周恪已请来天机商行的金丹大管事压阵——我手头能调动的现石全被他拿账房旧印扣死了。{{name}}，这一回不是赚钱的买卖，是保命与清门户的死局。”',
      },
      {
        when: (s) => s.companions.xie_wujiu.met && isXieHostile(s),
        text: '百宝分号外剑拔弩张。谢无咎立在廊下冷瞥你一眼，合拢玄铁扇：“冤家路窄。我百宝斋自家清理门户，不指望你搭把手；你若想趁火打劫周恪手里的黑矿契，各凭本事便是。”',
      },
      {
        when: (s) => !s.companions.xie_wujiu.met,
        text: '你在青州暗坊循着药荒风声摸到百宝分号后院，正撞见玄衣少东家谢无咎独对满屋残账。他见你气息沉稳、已是筑基真人，起身拱手苦笑：“阁下既撞破百宝内变，我也不藏掖了。不日分号账堂公审，叛徒周恪引了天机金丹管事来压我。阁下若愿助我稳住局势，九州灵脉契与暗网情分尽可相商。”',
      },
    ],
    choices: [
      {
        id: 'chamber1_team_xie',
        label: '连夜替谢无咎查核老掌柜私账，并在青州七处茶楼布下「连环死手密信」',
        subtext: '提前把转运井账底与老卒供词寄存暗桩，公审之夜哪怕金丹大管事亲临也不敢轻易灭口！',
        visible: (s) => !isXieHostile(s),
        insightTags: ['布下【青州死手密信】', '谢无咎深厚信任', '心境与情报'],
        effect: {
          mind: 8,
          renown: 6,
          setFlags: {
            act3_chamber_step1: true,
            act3_chamber_mode: 'with_xie',
            act3_chamber_deadman_switch: true,
            act3_chamber_letter_switch: true,
            xie_deadman_switch: true,
            tianji_chamber_hostile: true,
          },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 12,
              chronicle: '百宝分号内变危急之夜，你陪他查抄叛徒私账并布下七处茶楼连环死手，替他顶住了灭顶危机。',
            },
          },
          logSummary: '助谢无咎彻查百宝内鬼私账，并于青州七处茶楼布下连环死手密信以备制衡金丹管事。',
        },
        outcome: [
          '整整一夜灯火未熄。你与谢无咎从周恪密室抄出十年私账，连同老卒血供与从暗港灰坑秘密起出的一只锦盒一并抄录七份，悄悄分寄青州七处散修茶楼与青云驿馆——只要公审子时前无人撤信，所有秘辛即刻公之于众！',
          '天色擦白时，谢无咎长吁一口气，望你的眼神彻底少了客套：“有这七道死手挂在头顶，哪怕天机金丹管事来了，也得先掂量掂量杀我们灭口的代价。待公审之夜账堂见真章！”',
        ],
        outcomeContinueLabel: '布妥死手密信 · 静候账堂公审',
        bridgeNote: '你与谢无咎已在青州七处布下连环死手密信，百宝总账堂公审一触即发。',
        next: 'act3_hub',
      },
      {
        id: 'chamber1_solo_infiltrate',
        label: '自掏七十灵石暗中贴补青州穷苦散修与百宝底层伙计，收拢商号人心',
        subtext: '以仁商之道反制周恪囤药之举，赢得青州民心并同样织成一张众目睽睽的护身网。',
        requirement: { minSpiritStones: 70, lockReason: '需灵石 70' },
        insightTags: ['耗灵石70', '获【民心死手网】', '正道与声望大涨'],
        effect: (s) => ({
          spiritStones: -70,
          mind: 8,
          renown: 12,
          righteous: 10,
          worldly: 8,
          setFlags: {
            act3_chamber_step1: true,
            act3_chamber_mode: isXieHostile(s) ? 'solo' : 'with_xie',
            act3_chamber_deadman_switch: true,
            act3_chamber_crowd_shield: true,
          },
          companionUpdates: !isXieHostile(s)
            ? {
                xie_wujiu: {
                  meet: true,
                  markSeen: true,
                  affectionDelta: 10,
                  chronicle: '分号危局时你反掏私囊平抑穷散修药价、收拢百宝伙计人心，令这位素来唯利是图的少东家一时失语。',
                },
              }
            : undefined,
          logSummary: '于青州断脉药荒中出资七十灵石救济底层散修与百宝伙计，以民心众目反制内鬼逼宫。',
        }),
        outcome: [
          '七十枚灵石换成实实在在的低价清心散与米粮，经百宝底层伙计之手悄悄发到城南散修棚里。不到三日，满城都知道周恪借荒囤药、而你暗中施药救人，连分号护院都纷纷倒戈！一名感念恩情的暗港老伙计更冒死摸黑送来一只浸着冷灰的乌木锦盒，称那是当年从转运井底捞出的谢家旧物。',
          (s) =>
            isXieHostile(s)
              ? '满城散修与百宝底层伙计已盯紧账堂风声，众目睽睽之下，待公审开堂无论谁想暗下杀手都须掂量三分。'
              : '谢无咎站在门廊后看着排起长队的散修，第一次没拨算珠，只轻声自语：“原来世上真有些账，亏了灵石反倒赢了命。”众目睽睽之下，将启的公审账堂已成青州焦点。',
        ],
        outcomeContinueLabel: '稳住百宝人心 · 迎向账堂公审',
        bridgeNote: '你以七十灵石稳住青州药价与百宝人心，不日账堂公审已占尽大义先机。',
        next: 'act3_hub',
      },
      {
        id: 'chamber1_scout_ledger',
        label: '不介入百宝内斗，独自伏在城东暗港蹲守四月摸清转运井底细',
        subtext: '不耗灵石独行暗查，多耗四月光阴换取心境与井底物证，但不曾布下牵制金丹的死手。',
        insightTags: ['不耗灵石', '耗时四月', '独行无死手'],
        effect: {
          timeMonths: 4,
          mind: 10,
          setFlags: {
            act3_chamber_step1: true,
            act3_chamber_mode: 'solo',
          },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
            },
          },
          logSummary: '连续四月暗中蹲守青州暗港转运井，独身摸清百宝叛徒与天机商行勾连内幕。',
        },
        outcome: [
          '你未向百宝斋借半点势力。趁着周恪与天机商行几度推延公审、暗中清账的这四个月，你独自伏在暗港对岸茶楼静守，亲眼摸清了周恪深夜向天机转运井输送灵矿的暗道，还顺手从井畔废灰坑里撬出半块沾满惨白灵灰的「谢」字青玉佩。',
          '合上炭笔册子时，一拖再拖的账堂公审终于定下正期。你虽独揽物证，却也清楚自己并未在外头布下牵制金丹大管事的死手。',
        ],
        outcomeContinueLabel: '收好残佩与暗查札记 · 赴账堂公审',
        bridgeNote: '四月独行暗查让你拿到了井底关键残佩，却也无暗桩死手护身。',
        next: 'act3_hub',
      },
    ],
  },

  act3_arc_chamber_2: {
    id: 'act3_arc_chamber_2',
    act: 'act3',
    title: '仁商与血债',
    subtitle: '卷三 · 青州商潮（终章）',
    location: '青州府 · 百宝总账堂',
    checkpoint: true,
    checkpointLabel: '卷三 · 百宝总账堂公审',
    paragraphs: [
      '亥时三刻，百宝总账堂灯火如昼。叛徒老掌柜周恪趾高气扬地端坐客席，身旁端坐着一名闭目品茶的紫袍老者——天机商行青州金丹大管事！凛冽金丹威压笼罩整座大堂，令堂下数十名筑基伙计连抬头都觉胸口发闷。',
      '你当堂掀开一只乌木锦盒，将从青州暗港转运井废灰坑起出的半块焦裂青玉佩摆在灯下。内侧一个焦黑「谢」字触目惊心，玉面更固结着厚厚一层冰冷刺骨的惨白灵灰！',
      (s) => {
        const hasBloodDust = s.truthClues.includes('clue_blood_pill_dust');
        const hasVeinSigil = s.truthClues.includes('clue_ancient_vein_sigil');
        if (hasBloodDust || hasVeinSigil) {
          const matchedSources: string[] = [];
          if (hasBloodDust) matchedSources.push('青岚血丹丹核里的灰白微尘');
          if (hasVeinSigil) matchedSources.push('青州地底逆阵剥落的落尘玉屑');
          return `你的神识微微一震——那层固结在残佩上的惨白灵灰，与${matchedSources.join('、')}，气息竟一模一样！根本没有什么“羽化登仙”，当年谢家兄长连半步仙门都没踏进，人在转运井半空便化作了同源药渣！这一枚物证，彻底击穿了${s.truthClues.includes('clue_alliance_pact') ? '仙盟所谓“护界进贡”的谎言' : '三千年“白日登仙”的旧说'}。`;
        }
        return '细辨玉面那层冰冷惨白的灵灰，丹炉焦糊味呛得人反胃——那绝非寻常火焚之灰，而是修士元神与灵力被生生抽炼后的残渣！所谓飞升接引，人在半空便已被炼成药灰。';
      },
      {
        when: (s) => s.flags.act3_chamber_mode === 'with_xie',
        text: '谢无咎死死盯着那半块沾满灵灰的焦玉，指节攥得渗出血丝。良久，他站直脊背，声音冷得像淬了冰的铁：“周恪，你替天机商行害死我哥，如今还要拿全青州散修的救命药钱去讨好他们。金丹大管事就坐在这儿，但今天这笔账，百宝斋自己来清！”堂外已被数百闻讯赶来的青州商贾与散修团团围住，喧声震天。',
      },
      {
        when: (s) => s.flags.act3_chamber_mode !== 'with_xie',
        text: '紫袍金丹大管事缓缓睁开眼，冷漠扫过你与桌上的焦裂残佩。门窗已被他的金丹灵域暗暗封锁，内堂铁匣里锁着周恪囤积的青州灵矿地契、成箱救命灵石与一枚【九纹凝丹丸】。如何在金丹眼皮底下破局，全在你一念之间。',
      },
    ],
    choices: [
      {
        id: 'chamber2_smash_ladder',
        label: (s) =>
          s.flags.act3_chamber_mode === 'with_xie' && !isXieHostile(s)
            ? '当众揭穿老掌柜通敌血案，助谢无咎焚毁高利血契、开仓放药逼退金丹管事'
            : '当众揭穿老掌柜通敌血案，焚毁高利血契并开仓放药逼退金丹管事',
        subtext: (s) =>
          s.flags.act3_chamber_mode === 'with_xie' && !isXieHostile(s)
            ? '【商道蜕变】借满堂商贾与城外散修众目护身，放弃趁乱暴利，换九州商德、【九州灵脉契】与谢无咎真正脱胎换骨。'
            : '【商道清源】借满堂商贾与城外散修众目护身，放弃趁乱暴利，换九州商德与【九州灵脉契】。',
        insightTags: (s) => [
          '得真相【转运井灵灰】',
          '得【九州灵脉契】',
          '命格【商行死敌】',
          s.flags.act3_chamber_mode === 'with_xie' && !isXieHostile(s)
            ? '谢无咎心性蜕变 · 情谊大进'
            : '声望大涨 · 180灵石',
        ],
        effect: (s): ChoiceEffect => {
          const withXie = s.flags.act3_chamber_mode === 'with_xie' && !isXieHostile(s);
          return {
            spiritStones: 180,
            might: 10,
            mind: 10,
            righteous: 14,
            renown: 18,
            addTags: ['tianji_nemesis', 'merchant_fame'],
            addRelics: ['spirit_vein_deed'],
            addTruthClues: ['clue_tianji_portal'],
            completeThreads: ['thread_act3_chamber'],
            setFlags: {
              tianji_chamber_hostile: true,
              tianji_portal_destroyed: true,
              xie_reformed_merchant: withXie,
              chamber2_smash_with_xie: withXie,
            },
            companionUpdates: {
              ...(withXie
                ? {
                    xie_wujiu: {
                      meet: true,
                      markSeen: true,
                      affectionDelta: 18,
                      setStance:
                        s.companions.xie_wujiu.affection + 18 >= 75
                          ? 'bonded'
                          : 'confidant',
                      setStage: 4,
                      chronicle:
                        '百宝总账堂公审之夜，你陪他清理叛徒、当众焚毁高利血契平抑青州药荒。他收起兄长残佩，不再只做算计盈亏的暗市少东，立誓以商道护住九州人心。',
                    },
                  }
                : {}),
              ...(s.companions.su_zhiwei.met && isSuZhiweiAlive(s)
                ? {
                    su_zhiwei: {
                      affectionDelta: 6,
                      chronicle: '听闻你在青州城开仓放药平抑药荒，她对着药炉浅浅一笑。',
                    },
                  }
                : {}),
            },
            logSummary:
              '于百宝总账堂揭穿内鬼与【转运井灵灰】铁证，开仓放药逼退天机金丹管事，获【九州灵脉契】。',
          };
        },
        outcome: [
          '“启扉，请青州诸坊商贾、散修同听此账！”你挥剑斩断正门铁栓，高擎那半块覆满灵灰的残佩，与周恪勾结天机、囤药居奇的血契同举灯下。数百散修与各帮掌柜闻声蜂拥入庭，怒潮掀瓦。座上紫袍金丹管事眸光骤寒，然忌惮众目睽睽之下屠戮满城商帮激起九州哗变，终不敢妄动，唯冷哼拂袖，顺手击晕周恪以绝后患，破空遁去。',
          (s) =>
            s.flags.chamber2_smash_with_xie
              ? '尘嚣渐定，谢无咎亲取一叠逼杀无数散修的灵矿高利血契投诸炭盆，传令开百宝药仓平价放药，以解青州之荒。火光映其清瘦侧颜，他将兄长残佩纳回怀中，双手奉上【九州灵脉契】，沉声道：“昔日谢某以为，商道唯在握筹敛利、步步占先。今夜方知，若连苍生性命亦不能护，纵聚万金，不过替高天蓄薪耳。自今日始，百宝斋改立新律；这半壁商号，愿与君共持之。”'
              : '堂内风波既平，百宝斋残存伙计齐齐揖首，感念你保全商号清名，奉上抄没叛徒私产所得【九州灵脉契】与灵石一百八十枚。青州药价一夜平抑，而天机商行必杀黑榜之上，自此亦镌上了你的名姓。',
        ],
        outcomeContinueLabel: '踏过账堂余烬 · 返回青州',
        bridgeNote: '百宝总账堂公审落幕，你借众目大义逼退金丹管事并重立青州商序，手握【九州灵脉契】。',
        next: 'act3_hub',
      },
      {
        id: 'chamber2_seize_ledger_deal',
        label: '扣住总坛密账与灵灰残佩，当面逼天机金丹大管事交出【九纹凝丹丸】与【九州灵脉契】',
        subtext: (s) => evaluateCoercion(s, 'act3_tianji_goldcore').warningText,
        insightTags: (s) => {
          const ev = evaluateCoercion(s, 'act3_tianji_goldcore');
          return ev.canSucceed
            ? [
                `底牌已成：${ev.leverageSummary}`,
                s.relics.includes('golden_core_elixir') ? '凝丹丸易石共四百八十' : '得【九纹凝丹丸】+160石',
                '得【九州灵脉契】与【转运井灵灰】',
              ]
            : [
                '【极险】境界悬殊！无死手/越阶杀招',
                ev.canSurviveFail ? '恐遭金丹管事重创折寿逃遁' : '恐遭金丹当场镇杀灭口（陨落）',
              ];
        },
        effect: (s): ChoiceEffect => {
          const ev = evaluateCoercion(s, 'act3_tianji_goldcore');
          if (!ev.canSucceed) {
            if (!ev.canSurviveFail) {
              return {
                timeMonths: 0,
                setFlags: {
                  killed_by_silencing: true,
                  silencing_killer: '天机商行青州金丹大管事',
                  silencing_context: 'act3_chamber',
                  chamber2_coercion_result: 'killed',
                },
                logSummary: '筑基之身无死手暗网亦无越阶战力，当堂拿账本威胁金丹大管事，惨遭一掌镇杀灭口。',
              };
            }
            return {
              timeMonths: 8,
              spiritStones: -Math.min(s.spiritStones, 120),
              might: -6,
              lifespanBonus: -8,
              addTruthClues: ['clue_tianji_portal'],
              completeThreads: ['thread_act3_chamber'],
              setFlags: {
                tianji_chamber_hostile: true,
                escaped_silencing_act3_chamber: true,
                chamber2_coercion_result: 'escaped',
              },
              companionUpdates: s.companions.xie_wujiu.met
                ? {
                    xie_wujiu: {
                      markSeen: true,
                      affectionDelta: -8,
                      chronicle: '总账堂上你未备死手却硬胁金丹大管事，遭对方暴起灭口、重伤逃遁，令百宝分号损失惨重。',
                    },
                  }
                : undefined,
              logSummary: '无死手底牌却当面要挟天机金丹大管事，遭金丹掌印重创折寿八载，狼狈遁出青州。',
            };
          }

          const hadElixir = s.relics.includes('golden_core_elixir');
          const hasBaibaoSwitchPre = Boolean(
            s.flags.xie_deadman_switch ||
              (s.relics.includes('baibao_token') &&
                !isXieHostile(s) &&
                s.companions.xie_wujiu.affection >= 25) ||
              (s.daoPartnerId === 'xie_wujiu' && !isXieHostile(s))
          );
          const isCrowdOnlyPre =
            Boolean(s.flags.act3_chamber_crowd_shield) &&
            !s.flags.act3_chamber_letter_switch &&
            !hasBaibaoSwitchPre;
          const switchWord = isCrowdOnlyPre ? '满城民心众目' : '死手暗桩';
          const leveragePhrase =
            ev.switchOk && ev.powerOk
              ? `${switchWord}与越阶底气`
              : ev.switchOk
              ? switchWord
              : '越阶锋芒';
          return {
            spiritStones: hadElixir ? 480 : 160,
            mind: 10,
            renown: 12,
            worldly: 12,
            righteous: -10,
            addRelics: hadElixir
              ? ['spirit_vein_deed']
              : ['golden_core_elixir', 'spirit_vein_deed'],
            addTruthClues: ['clue_tianji_portal'],
            completeThreads: ['thread_act3_chamber'],
            setFlags: {
              act3_extorted_chamber: true,
              chamber2_elixir_converted: hadElixir,
              chamber2_coercion_result: 'success',
              chamber2_used_power: ev.powerOk,
              chamber2_used_switch: ev.switchOk,
            },
            companionUpdates: {
              ...(s.flags.act3_chamber_mode === 'with_xie' && !isXieHostile(s)
                ? {
                    xie_wujiu: {
                      meet: true,
                      markSeen: true,
                      affectionDelta: 8,
                      setStage: 4,
                      chronicle: `总账堂上你以${leveragePhrase}逼得金丹管事低头吐出凝丹丸与灵脉契，虽未当场报仇，却让他见识了真正的筹码博弈。`,
                    },
                  }
                : !s.companions.xie_wujiu.met
                ? { xie_wujiu: { meet: true, markSeen: true } }
                : {}),
              ...(s.companions.shen_qingshuang.met
                ? { shen_qingshuang: { affectionDelta: -6 } }
                : {}),
            },
            logSummary: hadElixir
              ? `凭${leveragePhrase}迫使天机金丹管事低头，取【九州灵脉契】并将多余凝丹丸暗兑易得共四百八十灵石。`
              : `凭${leveragePhrase}迫使天机金丹管事低头，豪取【九纹凝丹丸】【九州灵脉契】与百六灵石。`,
          };
        },
        outcome: [
          (s) => {
            if (s.flags.chamber2_coercion_result === 'killed') {
              return '你举起沾灰残佩与私账副本，冷声要挟金丹大管事交出凝丹丸封口。紫袍金丹缓缓放下茶盏，像看一个笑话般笑了：“筑基小儿，外头没留死手、手里没越阶的剑，凭两页纸就想拿捏金丹？今日把你连同账本一道烧成灰，青州谁知晓井底事？”';
            }
            if (s.flags.chamber2_coercion_result === 'escaped') {
              return '你高举残佩与账本欲逼对方低头，紫袍金丹却丝毫未见慌色，反而袖袍一震冷笑：“区区筑基，既无外网死手牵制，也无抗衡老夫之能，拿把柄威胁金丹就是找死！”浩瀚金丹威压轰然砸碎地板，一只赤紫灵掌瞬间拍穿你的护体灵光！';
            }
            const hasBaibaoSwitch = Boolean(
              s.flags.xie_deadman_switch ||
                (s.relics.includes('baibao_token') &&
                  !isXieHostile(s) &&
                  s.companions.xie_wujiu.affection >= 25) ||
                (s.daoPartnerId === 'xie_wujiu' && !isXieHostile(s))
            );
            const isCrowdOnly =
              Boolean(s.flags.act3_chamber_crowd_shield) &&
              !s.flags.act3_chamber_letter_switch &&
              !hasBaibaoSwitch;
            if (isCrowdOnly) {
              if (s.flags.chamber2_used_switch && s.flags.chamber2_used_power) {
                return '金丹大管事杀意骤起，你却不退反进！腰间剑气轰然激荡，竟在对方金丹灵域里生生撕开一道缺口，同时扬声指向门外围堵的数百散修与商贾：“满城受过我施药恩情的青州散修与百宝伙计就在门外候着，你大可试试能不能在我一剑劈开堂门前悄无声息灭了我的口！”';
              }
              if (s.flags.chamber2_used_switch) {
                return '金丹大管事周身杀气暴涨，眼看就要挥袖灭口。你神色不动，反手亮出传声玉符指向门外人声鼎沸的长街：“论境界我接不住你一掌，可门外数百受过我施药恩情的青州散修与百宝伙计正盯着账堂动静。我若横死堂内，转运井灵灰与高利黑账片刻便会传遍全城，你上头那位使者头一个便饶不了你！”';
              }
            }
            const switchLabel = s.flags.act3_chamber_letter_switch
              ? '青州七处茶楼与青云驿馆的死手回执'
              : hasBaibaoSwitch
              ? '百宝七十二城暗桩的连环死手回执'
              : s.flags.act2_deadman_switch
              ? '青岚暗市多处茶楼的散抄死手回执'
              : '预先分寄九州多处茶楼的死手回执';
            if (s.flags.chamber2_used_switch && s.flags.chamber2_used_power) {
              return `金丹大管事杀意骤起，你却不退反进！腰间剑气轰然激荡，竟在对方金丹灵域里生生撕开一道缺口，同时扬手弹出${switchLabel}：“子时前我若走不出这道门，转运井灵灰与上供黑账明天就传遍九州茶楼——你大可试试能不能在我催动传讯玉符前灭了我的口！”`;
            }
            if (s.flags.chamber2_used_switch) {
              return `金丹大管事周身杀气暴涨，眼看就要挥袖灭口。你神色不动，将${switchLabel}一一摊上桌面：“论境界我接不住你一掌，可我早在进门前便把灵灰样本与账底分寄多处暗桩，过子时未撤便自动传遍九州。杀了我，你上头那位使者头一个便饶不了你！”`;
            }
            return '金丹大管事冷笑出手欲将你当场格杀，却在半空中骤然变色！你爆发出的越阶底蕴与太古锋芒竟硬生生接下他七成威压、反震碎其袖口玉佩！眼见短时间内拿不下你、反要闹得满城皆知，大管事脸色铁青地收掌回撤。';
          },
          (s) => {
            if (s.flags.chamber2_coercion_result === 'killed') {
              return '金丹掌印落下，你的筑基道基瞬间崩得粉碎。在视线彻底沉入黑暗前，你看见那枚染灰残佩被紫袍老者随手碾作齑粉，账堂灯火未曾晃动半分。';
            }
            if (s.flags.chamber2_coercion_result === 'escaped') {
              return '千钧一发之际，你燃尽保命底牌硬接了金丹半记杀招，吐血撞塌偏墙逃入暗巷！虽九死一生保住性命与残佩秘密，却折寿八载、散财疗伤，凝丹丸与灵脉契半件也未能染指。你扶着冷墙喘定，胸口掌印犹自灼痛。';
            }
            const extra = s.flags.chamber2_elixir_converted
              ? '怀中既早备有一枚凝丹丸，次日脱身后你便将多出这枚转交暗市，另易得三百二十灵石。'
              : '';
            const hasBaibaoPost = Boolean(
              s.flags.xie_deadman_switch ||
                (s.relics.includes('baibao_token') &&
                  !isXieHostile(s) &&
                  s.companions.xie_wujiu.affection >= 25) ||
                (s.daoPartnerId === 'xie_wujiu' && !isXieHostile(s))
            );
            const crowdOnlyPost =
              Boolean(s.flags.act3_chamber_crowd_shield) &&
              !s.flags.act3_chamber_letter_switch &&
              !hasBaibaoPost;
            const switchWord = crowdOnlyPost ? '民心众目' : '暗桩先手';
            const basisDesc =
              s.flags.chamber2_used_switch && s.flags.chamber2_used_power
                ? `${switchWord}与越阶底蕴`
                : s.flags.chamber2_used_switch
                ? switchWord
                : '越阶底蕴';
            return `金丹大管事目中阴鸷如淬毒锋刃，死死权衡了足足半炷香，终究投鼠忌器，咬牙挥手命人奉上【九纹凝丹丸】【九州灵脉契】与一百六十灵石换你暂封其口。待你带着筹码稳步踏出账堂，才真正体会到${basisDesc}的份量。${extra}`;
          },
        ],
        outcomeContinueLabel: (s) =>
          s.flags.chamber2_coercion_result === 'killed'
            ? '怀璧灭口 · 展卷终局'
            : s.flags.chamber2_coercion_result === 'escaped'
            ? '折寿逃生 · 痛定思痛'
            : '揣紧凝丹重宝 · 从容离堂',
        bridgeNote: (s) => {
          if (s.flags.chamber2_coercion_result === 'escaped') {
            return '无底牌硬胁金丹大管事反遭灭口重创，折寿八载养伤方才捡回一条命。';
          }
          const hasBaibaoPost = Boolean(
            s.flags.xie_deadman_switch ||
              (s.relics.includes('baibao_token') &&
                !isXieHostile(s) &&
                s.companions.xie_wujiu.affection >= 25) ||
              (s.daoPartnerId === 'xie_wujiu' && !isXieHostile(s))
          );
          const crowdOnlyPost =
            Boolean(s.flags.act3_chamber_crowd_shield) &&
            !s.flags.act3_chamber_letter_switch &&
            !hasBaibaoPost;
          const switchWord = crowdOnlyPost ? '满城民心众目' : '死手暗网';
          const basis =
            s.flags.chamber2_used_switch && s.flags.chamber2_used_power
              ? `${switchWord}与越阶底气`
              : s.flags.chamber2_used_switch
              ? switchWord
              : '越阶锋芒';
          return `你凭${basis}迫使天机金丹管事低头吐出凝丹丸与灵脉契，震动青州暗坊。`;
        },
        next: (s) =>
          s.flags.chamber2_coercion_result === 'killed' ? 'ending_silenced' : 'act3_hub',
      },
      {
        id: 'chamber2_ruthless_cut',
        label: '趁账堂大乱直接接管周恪的黑矿契与囤积救命药，收割青州药荒暴利',
        subtext: '冷酷务实的枭雄手腕，换来巨额横财与凝丹丸，但必与谢无咎彻底反目，且令苏知微痛心寒心。',
        insightTags: (s) => [
          s.relics.includes('golden_core_elixir') ? '凝丹丸易石共六百八十' : '得【九纹凝丹丸】+360灵石',
          '得真相【转运井灵灰】',
          '谢无咎反目 · 苏知微寒心',
        ],
        effect: (s): ChoiceEffect => {
          const hadElixir = s.relics.includes('golden_core_elixir');
          const metXieBefore = s.companions.xie_wujiu.met;
          return {
            spiritStones: hadElixir ? 680 : 360,
            might: 8,
            righteous: -24,
            worldly: 10,
            addRelics: hadElixir ? undefined : ['golden_core_elixir'],
            addTruthClues: ['clue_tianji_portal'],
            completeThreads: ['thread_act3_chamber'],
            setFlags: {
              act3_solo_looted_chamber: true,
              chamber2_elixir_converted: hadElixir,
              chamber2_ruthless_met_xie_before: metXieBefore,
            },
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: -36,
                setStance: 'rival',
                setStage: 4,
                chronicle:
                  '百宝内变大乱之际你竟接管叛徒周恪的囤药黑契、踩着青州散修血汗发横财，玄铁折扇自此彻底对你合拢。',
              },
              ...(s.companions.su_zhiwei.met && isSuZhiweiAlive(s)
                ? {
                    su_zhiwei: {
                      affectionDelta: -15,
                      chronicle: '听闻你在青州断脉药荒中接手高价囤药狠捞横财，她握紧药杵久久不语，眼神彻底黯淡下来。',
                    },
                  }
                : {}),
            },
            logSummary: hadElixir
              ? '趁百宝内变吞下叛徒黑矿契与囤药暴利并将多余凝丹丸暗兑易石，共掠六百八十灵石。'
              : '趁百宝内变吞下叛徒黑矿契与囤药暴利，掠得【九纹凝丹丸】与三百六十灵石。',
          };
        },
        outcome: [
          (s) =>
            s.flags.chamber2_elixir_converted
              ? '账堂混战骤起，你连半瞬犹豫也无，反手击毙周恪夺走其囤药仓钥与库银，顺手转卖多余凝丹丸共掠六百八十灵石，任由青州高价药市沸反盈天。'
              : '账堂混战骤起，你连半瞬犹豫也无，反手劈开周恪内库夺走【九纹凝丹丸】与三百六十灵石囤药暴利，顺手抄走一页转运井账底便借乱掠出青州府！',
          (s) =>
            s.flags.chamber2_ruthless_met_xie_before
              ? '回望狼藉大堂，谢无咎捏着兄长焦裂残佩立在碎裂牌匾下，听见你掠走救命药仓银箱的动静猛然抬头。四目相接的刹那，他眼底最后一丝暖意熄灭，合拢玄铁折扇，扇骨扣得指节泛白：“你比周恪还狠。这笔人命账，我记下了。”'
              : '袖中丹匣与灵石沉甸甸的。这乱世人人都在吃人，先把自己推上金丹高位，才配谈什么是非慈悲。',
        ],
        outcomeContinueLabel: '满载横财遁走 · 返回青州',
        bridgeNote: '你趁百宝内变发了一笔冷血药荒财，令谢无咎彻底反目，青州民间亦骂声四起。',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 暗线三：青州二十载 · 苏知微与岁月 ====================
  act3_arc_hearth_1: {
    id: 'act3_arc_hearth_1',
    act: 'act3',
    title: '二十载重归',
    subtitle: '卷三 · 岁月与杏林（上）',
    location: '青州城东 · 杏林医馆外',
    paragraphs: [
      (s) => {
        const yrs = yearsSinceAgeMonths(
          s.ageMonths,
          s.companions.su_zhiwei.lastSeenAgeMonths
        );
        return s.companions.su_zhiwei.met && yrs >= 10
          ? `修士闭关吐纳、奔波九州，弹指便是十数寒暑。距你上次别过青州杏林，竟已整整过去了${toChineseYearNumber(yrs)}载光阴。`
          : '修士闭关吐纳、奔波九州，弹指便是十数寒暑。距你当年炼气期走过青州官道，不知不觉竟已过去了十数载光阴。';
      },
      '城门外的老柳树粗了两抱，守门兵卒早换成了从未见过面的年轻人。唯独低头映照护城河水，你的容颜仍停留在二十出头的模样，眉眼间连一道细纹都不曾添上。',
      {
        when: (s) =>
          isSuAliveInAct3Hearth(s) && Boolean(s.flags.su_zhiwei_saved_longlife),
        text: '推开竹篱时，院里满架晒着切好的当归与陈皮，两名十来岁的药童正认真翻晒药草。杏树下，鬓添霜色的苏知微束着素色发髻，气色温润康健。当年那瓶【九转延寿露】彻底洗去了她的沉疴。听见竹门轻响，她甚至不必抬头便笑道：“步子这样轻，除了{{name}}还能有谁？茶壶刚滚，快坐吧。”',
      },
      {
        when: (s) =>
          isSuAliveInAct3Hearth(s) && !s.flags.su_zhiwei_saved_longlife,
        text: (s) =>
          s.flags.su_zhiwei_stabilized
            ? '竹篱小院比记忆里低矮了许多，墙角生满青苔。屋内炭炉烧得极旺，苏知微斜靠在青布软枕上，一头青丝早已尽数化白。她睁眼看清是你，嘴角轻轻弯起来：“当年你散尽灵石请老医、又耗真元替我续回这十余载安稳光阴，我才赶得及把青州无灵病案全部誊完。能再见你一面，我早已心满意足。”'
            : '小院矮了，墙角生满青苔。炭炉烧得极旺，苏知微斜靠软枕，青丝尽白，瘦得像一截风干的桂枝，二十载光阴将她推至暮年，而你立在门框阴影里仍年轻得格格不入。她睁眼看清是你，唇角微弯：“还是当年模样。”',
      },
      {
        when: (s) => !isSuAliveInAct3Hearth(s),
        text: (s) =>
          s.companions.su_zhiwei.met
            ? '城外杏林医馆已空了多年。邻里老妪提起那位白首女医，说你在秘窟闭关的数十载里，她始终守着这间草庐整理无灵病案，直到油尽灯枯安然闭眼。如今屋里窗明几净，街坊日日来替她扫阶上香，药案上整齐码着她临终留给故人的医录与一只素布包着的玉印。'
            : '城外杏林医馆已空了两年。邻里老妪告诉你，这里曾住着一位姓苏的凡尘女医，早年大疫时救活过半城百姓，后来又花二十年走遍青州各县记录无灵之人的病案，直到油尽灯枯才闭眼。如今屋里窗明几净，街坊日日来替她扫阶上香，药案上整齐码着她临终留下的医录与一只素布包着的玉印。',
      },
    ],
    choices: [
      {
        id: 'hearth1_bring_dew',
        label: '立刻取出怀中【九转延寿露】亲手喂她服下，替她续回二十载阳寿',
        subtext: '纵然已近暮年，这瓶稀世地乳仍能替她洗去衰朽、换回康健晚岁。',
        visible: (s) =>
          isSuAliveInAct3Hearth(s) &&
          !s.flags.su_zhiwei_saved_longlife &&
          s.relics.includes('longevity_dew'),
        insightTags: ['消耗【九转延寿露】', '挽回苏知微性命', '至深羁绊'],
        effect: {
          timeMonths: 12,
          removeRelics: ['longevity_dew'],
          mind: 14,
          worldly: 14,
          righteous: 10,
          setFlags: {
            su_zhiwei_saved_longlife: true,
            act3_hearth_step1: true,
            hearth1_met_alive: true,
          },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 30,
              setStance: 'bonded',
              chronicle:
                '阔别多年重逢她已白发垂暮，你毫不吝惜取出【九转延寿露】为她逆天续命，药庐复见春色。',
            },
          },
          logSummary:
            '阔别多年重返杏林，以【九转延寿露】救回垂暮病重的苏知微。',
        },
        outcome: [
          '你快步坐到榻前，拔开玉塞将清冽甘露一点点喂进她唇间。温和地乳顺着经络散开，屋里浓重的药苦味竟被一阵清幽生机压了下去。',
          '不过半日，她冰凉的指尖渐渐回暖，呼吸也沉稳下来。连守七天之后，苏知微已能扶着门框在杏树下晒太阳。她望着自己重新有力的双手，眼眶发红却笑得极软：“你这傻子，九州那么凶险，怎还留着这瓶保命的露水给我？”',
        ],
        outcomeContinueLabel: '陪她在杏树下坐过一季 · 细读医典',
        next: 'act3_arc_hearth_2',
      },
      {
        id: 'hearth1_stay_companion',
        label: '卸下佩剑留在杏林住上一载，陪她劈柴煎药、逐页誊清二十载医卷',
        visible: (s) => isSuAliveInAct3Hearth(s),
        insightTags: ['耗时一载', '苏知微深厚好感', '心境与红尘'],
        effect: {
          timeMonths: 12,
          mind: 10,
          worldly: 10,
          setFlags: { act3_hearth_step1: true, hearth1_met_alive: true },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 14,
              chronicle:
                '阔别多年你卸剑小住杏林一载，陪她将半生所记无灵医案整理成册。',
            },
          },
          logSummary: '多年重归青州杏林，卸剑陪伴苏知微小住一载，助其誊清无灵医卷。',
        },
        outcome: [
          (s) =>
            s.flags.su_zhiwei_saved_longlife
              ? '这一年里你收起所有筑基真人的架子，晨起帮她替药童讲药性，傍晚坐于杏树下听她讲起这些年走遍青州乡野的见闻。她的嗓音沉静温暖，让你几乎忘了外头九州的血雨腥风。'
              : '这一年里你哪儿也没去，日日守在炭炉旁替她煎药、读她写下的医案。她的精神一天比一天轻浅，却总强撑着笑意把最后几卷批注讲给你听，生怕漏掉半个紧要的字眼。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.su_zhiwei_saved_longlife
            ? '待医卷终稿落定 · 细读无灵医典'
            : '待医卷终稿落定 · 听她最后嘱托',
        next: 'act3_arc_hearth_2',
      },
      {
        id: 'hearth1_return_briefly',
        label: '先与她共饮一盏温好的陈皮热茶，约好待书册编就再回来细看医典',
        visible: (s) =>
          isSuAliveInAct3Hearth(s) && Boolean(s.flags.su_zhiwei_saved_longlife),
        insightTags: ['暂返枢纽', '心境微长'],
        effect: {
          timeMonths: 3,
          mind: 6,
          worldly: 6,
          setFlags: { act3_hearth_step1: true },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 8,
            },
          },
          logSummary: '阔别多年重访安康的苏知微，共饮陈皮热茶，约好待无灵医卷装订妥当再归。',
        },
        outcome: [
          '杏影落在补过三次的青瓷药碗边，你与苏知微并肩坐了半日。她身子康健，笑着催你先去把青州正事办妥：“书册最后两卷还要装订，等装订妥当你再来，我亲手交给你。”',
        ],
        outcomeContinueLabel: '暂别杏林 · 返回青州风云',
        bridgeNote:
          '阔别多年重见安康如常的苏知微，你与她约好待医卷装订妥当再赴杏林。',
        next: 'act3_hub',
      },
      {
        id: 'hearth1_read_journals',
        label: (s) =>
          s.companions.su_zhiwei.met
            ? '对着故人清冷灵位焚香一拜，在寂静药庐通读她留下的二十载医卷'
            : '净手焚香拜过素未谋面的凡医灵位，在寂静药庐通读二十载遗稿',
        visible: (s) => !isSuAliveInAct3Hearth(s),
        insightTags: ['耗时半载', '心境大增', '补得真相【无灵之盲区】'],
        effect: {
          timeMonths: 6,
          mind: 12,
          worldly: 8,
          addTruthClues: ['clue_mortal_blindspot'],
          setFlags: {
            act3_hearth_step1: true,
            su_zhiwei_passed: true,
          },
          logSummary:
            '访青州城外已故凡医苏知微旧居，研读其耗尽二十载编成的无灵医录。',
        },
        outcome: [
          '你在药庐静坐半载。泛黄纸页密密记着三千余例凡人病案，笔笔克制，末页却如惊雷炸响：灵枯与天幕异象专蚀有灵根者。唯彻底无灵之凡人，置身九霄之外。天眼看不见他们。',
        ],
        outcomeContinueLabel: '翻至遗稿终卷 · 开启素布玉匣',
        next: 'act3_arc_hearth_2',
      },
    ],
  },

  act3_arc_hearth_2: {
    id: 'act3_arc_hearth_2',
    act: 'act3',
    title: '无灵归尘',
    subtitle: '卷三 · 岁月与杏林（终章）',
    location: '青州城外 · 杏林药庐',
    checkpoint: true,
    checkpointLabel: '卷三 · 杏林传灯',
    paragraphs: [
      {
        when: (s) =>
          isSuAliveInAct3Hearth(s) && Boolean(s.flags.su_zhiwei_saved_longlife),
        text: '午后日影斜斜铺满小院。银丝挽髻的苏知微从樟木箱底捧出一只青布包袱，解开来是一套手抄的无灵医典与一枚温润如脂的玉印【无灵归尘印】。她微笑着放进你掌心：“这二十年我翻遍青州旧志，又在一口枯井里拓出半块前朝无灵古碑，才明白凡人无灵根从不是老天亏待，反倒是护身符。这枚玉印里嵌着古碑残玉，带上它，日后纵使站在九霄之下，也别忘了凡尘还有一盏灯等你回家。”',
      },
      {
        when: (s) =>
          isSuAliveInAct3Hearth(s) && !s.flags.su_zhiwei_saved_longlife,
        text: [
          '那一夜，青州的风很静。炉火快熄了，只剩几点暗红，映在她枯瘦的指节上。灯花偶尔轻轻一爆，屋里便更静一分。',
          '苏知微已连抬手的力气都快没了。可她还是把那枚【无灵归尘印】塞进了你掌心。玉印很暖。暖得让你心里发疼。',
          '“仙界是什么样子，我没见过。”她的声音很轻，轻得像怕惊灭了案头那盏灯，“可青州凡人的命，我记了二十年。天上的眼睛很大，却看不见没有灵根的人。”',
          '她停了停，喘过一口极浅的气，忽然看着你笑了一下。那笑容很淡，却像二十年前一样干净。“{{name}}，拿着这枚印。替我去看一眼。看一眼头顶没有天门压着的世道，究竟是什么样子。”',
          '你的喉咙像被炭灰堵住了，一个字也说不出。她好像看出来了。那只瘦得只剩骨节的手，轻轻拍了拍你手背。“别难过。”她说，“临走前，灯还亮着，你还在我眼前坐着。”',
          '她的声音低下去，几乎融进夜风里。“人活一世，还能求什么？”',
        ],
      },
      {
        when: (s) => !isSuAliveInAct3Hearth(s),
        text: '医录终卷之下压着一只蓝布包袱，里面是一枚雕着杏花纹的温润玉印【无灵归尘印】，随印附着一张端正小楷笺纸：“长生高门专猎灵根，独遗无灵凡血。今刻前朝枯井古碑之玉成印，留赠后来有心人，愿护人间烟火不灭。青州医女苏知微绝笔。”',
      },
    ],
    choices: [
      {
        id: 'hearth2_accept_healthy',
        label: (s) =>
          s.truthClues.length >= 3 || s.truthClues.includes('clue_changming_night')
            ? '郑重收下【无灵归尘印】与医典，约她待斩断天门之日再回杏林赏花'
            : '郑重收下【无灵归尘印】与医典，约她待厘清九霄迷局之日再回杏林赏花',
        visible: (s) =>
          isSuAliveInAct3Hearth(s) && Boolean(s.flags.su_zhiwei_saved_longlife),
        insightTags: [
          '得【无灵归尘印】',
          '命格【红尘守灯人】',
          '苏知微安康留青州',
        ],
        effect: {
          mind: 16,
          worldly: 12,
          righteous: 8,
          addRelics: ['mortal_hearth_talisman'],
          addTags: ['mortal_keeper'],
          addTruthClues: ['clue_mortal_blindspot'],
          completeThreads: ['thread_act3_hearth'],
          setFlags: { act3_hearth_done: true },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 20,
              setStage: 4,
              chronicle:
                '银发康健之时将毕生无灵医典与【无灵归尘印】交托于你，仍守杏林静待你功成归来。',
            },
          },
          logSummary:
            '自安康的苏知微手中接过【无灵归尘印】与二十载医典，身承【红尘守灯人】之愿。',
        },
        outcome: [
          '你双手接过那枚犹带她体温的【无灵归尘印】，贴身收进衣襟。玉印温润，瞬间将你周身凌厉的筑基灵压化得柔和内敛，连神识扫过都宛如寻常凡人。',
          '辞行出篱时，苏知微站在满树疏朗杏影下朝你挥手，身影沉静从容。你回头看了很久，才御剑直上青云。这一次，你身后有灯火，更有归处。',
        ],
        outcomeContinueLabel: '怀揣无灵玉印 · 返回青州风云',
        bridgeNote:
          '苏知微康健如昔，你携她托付的【无灵归尘印】回到局中，道心愈发坚定温润。',
        next: 'act3_hub',
      },
      {
        id: 'hearth2_farewell_passing',
        label: '守她于静夜安然离世，葬于杏树之下，携【无灵归尘印】继续问道',
        visible: (s) =>
          isSuAliveInAct3Hearth(s) && !s.flags.su_zhiwei_saved_longlife,
        insightTags: [
          '得【无灵归尘印】',
          '命格【红尘守灯人】',
          '心境巨幅蜕变',
        ],
        effect: {
          timeMonths: 1,
          mind: 20,
          worldly: 8,
          righteous: 8,
          addRelics: ['mortal_hearth_talisman'],
          addTags: ['mortal_keeper'],
          addTruthClues: ['clue_mortal_blindspot'],
          completeThreads: ['thread_act3_hearth'],
          setFlags: {
            su_zhiwei_passed: true,
            act3_hearth_done: true,
          },
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              markDeceased: true,
              silentNotice: true,
              setStage: 4,
              chronicle:
                '青州静夜安然闭目，将毕生无灵医典与【无灵归尘印】托付于你，长眠杏林树下。',
            },
          },
          logSummary:
            '伴苏知微走完最后一程，葬之于青州杏树下，携【无灵归尘印】独行长生。',
        },
        outcome: [
          '天明之前，炭炉化作一捧白灰，握在你掌心的那只手彻底凉了下去。她的眉眼十分安详，仿佛只是忙碌二十年后终于睡了一个好觉。',
          '你没有动用法术，亲手在院中老杏树下掘土立碑，刻下「青州医女苏知微之墓」九字。夜风拂过满院杏枝，你在坟前坐了一整夜，将她留下的【无灵归尘印】系于腰间。凡尘一灯已熄，那把火，从此烧在你胸口里。',
        ],
        outcomeContinueLabel: '拜别孤坟 · 重返九州',
        bridgeNote:
          '静夜里你亲手安葬了苏知微，腰间【无灵归尘印】温热依旧，心境在巨痛中澄明如铁。',
        next: 'act3_hub',
      },
      {
        id: 'hearth2_stay_ending',
        label: '就此散去一身筑基修为，留在这座杏林小院陪她共度余下春秋',
        subtext: '放下五百载金丹与九霄争逐，此择将直接收束为红尘结局。',
        visible: (s) =>
          isSuAliveInAct3Hearth(s) &&
          Boolean(s.flags.su_zhiwei_saved_longlife) &&
          s.companions.su_zhiwei.affection >= 25,
        insightTags: ['步入红尘结局【青州烟火】'],
        effect: {
          worldly: 30,
          addTags: ['mortal_keeper'],
          companionUpdates: {
            su_zhiwei: {
              markSeen: true,
              affectionDelta: 30,
              setStance: 'bonded',
              chronicle:
                '二十载沧桑之后，你终究在杏林解剑散功，陪她走完人间最后的春秋。',
            },
          },
          logSummary:
            '二十载重逢杏林后决意解剑散功，舍弃长生仙途陪伴苏知微终老青州。',
        },
        outcome: [
          (s) =>
            s.truthClues.length >= 3 || s.truthClues.includes('clue_changming_night')
              ? '你望向窗外摇曳的杏影与山风，忽然解下佩剑轻轻靠在门扉旁。什么金丹大道，什么三千年天门骗局，都抵不过眼前这一炉药火。'
              : '你望向窗外摇曳的杏影与山风，忽然解下佩剑轻轻靠在门扉旁。什么金丹大道，什么九霄仙途疑云，都抵不过眼前这一炉药火。',
          '你运功将一身筑基灵液缓缓散入大地，任由容颜自此随凡人一同生出风霜。握住她的手时，她先是一怔，随后泪光盈盈地靠进你怀里。从此长生路上少了一名真人，青州杏林多了一对白首之人。',
        ],
        outcomeContinueLabel: '展卷终局 · 【青州烟火】',
        next: 'ending_qingzhou_hearth',
      },
      {
        id: 'hearth2_inherit_stranger',
        label: (s) =>
          s.companions.su_zhiwei.met
            ? '对着故人空庐深深三揖，收下【无灵归尘印】与医典誓护人间火种'
            : '对着空庐深深三揖，收下【无灵归尘印】与医典誓护凡尘火种',
        visible: (s) => !isSuAliveInAct3Hearth(s),
        insightTags: ['得【无灵归尘印】', '命格【红尘守灯人】', '心境大增'],
        effect: {
          mind: 16,
          worldly: 10,
          righteous: 8,
          addRelics: ['mortal_hearth_talisman'],
          addTags: ['mortal_keeper'],
          addTruthClues: ['clue_mortal_blindspot'],
          completeThreads: ['thread_act3_hearth'],
          setFlags: {
            su_zhiwei_passed: true,
            act3_hearth_done: true,
          },
          logSummary:
            '承接青州故医苏知微遗物【无灵归尘印】与无灵医典，自此身负守灯之念。',
        },
        outcome: [
          (s) =>
            s.companions.su_zhiwei.met
              ? '灯油添满了。收好【无灵归尘印】与整套无灵医典，当年那位手稳心静的故人竟凭二十载笔墨窥破高天盲区，叫你对着空庐久久难言。'
              : '灯油添满了。收好【无灵归尘印】与整套无灵医典，素未谋面的凡人女医竟凭二十载笔墨窥破高天盲区，叫你对着空庐久久难言。',
          '走出杏林回望那座简朴药庐，你心中多了一份沉甸甸的承诺。',
        ],
        outcomeContinueLabel: '携遗印北返 · 回到青州风云',
        bridgeNote:
          '自青州旧药庐得【无灵归尘印】与无灵医典，你对天门之外的破局之道已隐隐明悟。',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 暗线四：长明古战场寻木（苍溟线） ====================
  act3_arc_soul_1: {
    id: 'act3_arc_soul_1',
    act: 'act3',
    title: '古战荒泽',
    subtitle: '卷三 · 长明遗烬（上）',
    location: '青州西北 · 长明古战场外泽',
    paragraphs: [
      (s) =>
        s.truthClues.includes('clue_changming_night')
          ? '青州西北三百里的黑水荒泽，正是三千年前长明元年九位剑尊陨落的古战场。焦黑泥沼里斜插着数不清的熔断巨剑，天空终年压着一层铅灰瘴雾，连筑基修士的神识探出百丈都会如泥牛入海。'
          : '青州西北三百里的黑水荒泽，传闻是三千年前长明旧纪一场惊天古战遗下的废墟。焦黑泥沼里斜插着数不清的熔断巨剑，天空终年压着一层铅灰瘴雾，连筑基修士的神识探出百丈都会如泥牛入海。',
      '瘴雾退了。沼泽中央露出一座死柏孤岛，岛心焦黑枯柏裂缝间隐约透出墨玉似的【千年养魂木】，南岸三名太乙丹谷与外宗筑基修士早已抢先扎营，正催动阵旗试探沼中残存的古剑阵。',
      '绕行北岸残碑时，你忽然在一块半沉石碑背面发现一道极新的剑痕，旁边卡着一枚沾泥的青铜残牌，正面刻着「斩天」二字古篆。近半年里，竟有自称「斩天会」的神秘人先来此地勘察过古阵走位。',
      {
        when: (s) => s.companions.cang_ming.met && !isCangMingHostile(s),
        text: '怀中【焦黑断玉】骤然发出清越低鸣。苍溟的虚影沉沉叹道：“三千年了，当年我那帮蠢同袍的剑意还没散干净……至于那块‘斩天’铜牌，哼，历代不肯认命的小辈总爱用这两个字。别急着跟南岸那群蠢货硬拼，暮雾要合拢了，待两月后满月大潮雾退，我带你走生门直取养魂木！”',
      },
      {
        when: (s) => s.companions.cang_ming.met && isCangMingHostile(s),
        text: '怀中【焦黑断玉】微震一瞬，传出一声淬冰似的嗤笑：“三千年旧冢，倒让个工于心计的小辈摸进来了。岛心养魂木就在那儿，本座倒要瞧瞧，离了我指路，你敢不敢往南岸剑煞坑里踩。”',
      },
      {
        when: (s) => !s.companions.cang_ming.met,
        text: '你俯身拾起那块「斩天」铜牌，指腹抚过碑旁密密麻麻的阵位刻痕，隐约察觉碑底泥缝中还埋着一缕奇异剑息。天色骤暗，荒泽瘴雾重新翻涌合拢，南岸大宗修士也只能鸣金退回坡顶扎营，双方都须等两月后满月大潮雾退再决胜负。',
      },
    ],
    choices: [
      {
        id: 'soul1_follow_cangming',
        label: '依苍溟指点的三千年前残阵生门记熟沼路，并拓下斩天会暗记',
        visible: (s) => s.companions.cang_ming.met && !isCangMingHostile(s),
        insightTags: ['苍溟好感', '得斩天会线索', '决战先机'],
        effect: {
          might: 8,
          mind: 8,
          setFlags: {
            act3_soul_step1: true,
            act3_soul_advantage: true,
            act3_battlefield_open: true,
            act3_found_zhantian_lead: true,
          },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: 12,
              chronicle:
                '共临长明古战场荒泽，他隔着三千年重见故友遗剑，指点你记熟残阵生门以夺养魂木。',
            },
          },
          logSummary:
            '探查长明古战场荒泽，得苍溟指点摸清生门，并发现神秘组织「斩天会」遗留铜牌。',
        },
        outcome: [
          '暮雾漫过膝盖前，你照着苍溟口述的三千年前古阵方位，在羊皮纸上标出七处绝不可踏入的剑煞暗坑，顺手收起那枚刻着「斩天」二字的青铜残牌。',
          '苍溟沉默良久，低声道：“拿到养魂木，等结成金丹便真有几分替我重塑肉身的希望。先退回青州养精蓄锐，两月后满月，本座陪你杀上孤岛。”',
        ],
        outcomeContinueLabel: '收图退避暮雾 · 返回青州整备',
        bridgeNote:
          '长明古战场生门与「斩天会」暗记皆已到手，只待两月后满月雾退便登岛夺取【千年养魂木】。',
        next: 'act3_hub',
      },
      {
        id: 'soul1_cangming_suppress',
        label: '冷声打断苍溟的指手画脚，以筑基神识强压断玉逼他吐出全部古阵死门',
        subtext: '提防三千年前的残魂反客为主，宁可结怨也要把阵眼底细握在自己手里。',
        visible: (s) => s.companions.cang_ming.met,
        insightTags: ['强压残魂', '苍溟显著降好感', '修为与城府'],
        effect: {
          might: 9,
          mind: 6,
          righteous: -6,
          setFlags: {
            act3_soul_step1: true,
            act3_soul_advantage: true,
            act3_battlefield_open: true,
            act3_found_zhantian_lead: true,
          },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: -16,
              chronicle:
                '长明荒泽边你以神识锁住断玉强逼阵眼死门，他冷笑应下，玉中剑息自此疏离。',
            },
          },
          logSummary:
            '以筑基神识压制断玉残魂逼出古阵生门，与苍溟之间裂痕加深。',
        },
        outcome: [
          '“你指哪步我便踩哪步，真把我当牵线傀儡？”你指腹并拢，筑基灵压化作寒针顺着断玉裂纹刺入，冷冷锁住那缕青衣残魂，逼他将七处杀阵死门与碑旁残记逐一印证。',
          '苍溟闷哼一声，笑声冷得像荒泽黑水：“羽翼已丰，开始防着老祖宗了？好，死门我全报给你。两月后满月登岛，你自己掂量。”断玉青光骤暗，再不吐半字。',
        ],
        outcomeContinueLabel: '冷收断玉与铜牌 · 返回青州',
        bridgeNote:
          '你强压断玉逼出古战场生门，却也在与苍溟之间埋下难以消弭的冷隙。',
        next: 'act3_hub',
      },
      {
        id: 'soul1_study_zhantian_mark',
        label: '趁雾合前拓下残碑上斩天会留下的阵位图，先退回青州备齐护身符',
        insightTags: ['心境大增', '得斩天会线索', '决战先机'],
        effect: {
          mind: 10,
          renown: 4,
          setFlags: {
            act3_soul_step1: true,
            act3_soul_advantage: true,
            act3_battlefield_open: true,
            act3_found_zhantian_lead: true,
          },
          logSummary:
            '于长明古战场残碑拓下「斩天会」遗留古阵走位图，为夺取千年养魂木做好万全筹备。',
        },
        outcome: [
          '那位先你一步来过的「斩天会」前辈极通阵道，碑背寥寥十几道剑痕，便把沼泽死门点得一清二楚。你迅速拓印入纸，收好青铜残牌，在黑雾彻底吞没沼面之前安然折返。',
        ],
        outcomeContinueLabel: '收好阵位拓图 · 返回青州',
        bridgeNote:
          '你在古战场觅得「斩天会」留下的走位拓图，两月后满月登岛抢夺养魂木已占尽先机。',
        next: 'act3_hub',
      },
      {
        id: 'soul1_probe_rivals',
        label: '趁南岸宗门修士收阵懈怠，突袭外围哨修逼退对手并抢下一袋灵砂',
        insightTags: ['灵石90', '修为大增', '得斩天会线索'],
        effect: {
          might: 10,
          spiritStones: 90,
          setFlags: {
            act3_soul_step1: true,
            act3_soul_rivals_alert: true,
            act3_battlefield_open: true,
            act3_found_zhantian_lead: true,
          },
          logSummary:
            '于长明古战场外围突袭宗门哨修夺得九十灵石，并拾获「斩天会」青铜残牌。',
        },
        outcome: [
          '你藏身雾中连出两剑，轻松掀翻两名落在队尾的宗门哨修，顺手抄走他们腰间价值九十灵石的采矿灵砂与那枚碑旁「斩天」铜牌，不等对方主将赶来便借暮雾飘然远遁。',
          '南岸营地顿时警钟大作。两月后满月再登孤岛，对方必然严阵以待，可你气势已压过他们一头。',
        ],
        outcomeContinueLabel: '满载遁入暮雾 · 返回青州',
        bridgeNote:
          '你在长明荒泽先声夺人斩获灵砂，并发现了「斩天会」行踪，两月后满月便要决战孤岛。',
        next: 'act3_hub',
      },
    ],
  },

  act3_arc_soul_2: {
    id: 'act3_arc_soul_2',
    act: 'act3',
    title: '千年养魂木',
    subtitle: '卷三 · 长明遗烬（终章）',
    location: '长明古战场 · 黑柏孤岛',
    checkpoint: true,
    checkpointLabel: '卷三 · 古战场争木',
    paragraphs: [
      '满月悬于黑水荒泽上空，常年不散的铅灰瘴雾如潮水般向两侧分开。枯柏孤岛彻底显露在清冷月色下，岛心那截【千年养魂木】散发着柔和清冽的墨玉光华，吸一口便觉识海神清气爽。',
      '南岸三名宗门筑基修士率先踏沼强冲，却误触泥下埋藏三千年的剑煞残阵！瞬间数道淡金劫火夹杂凄厉剑鸣冲天而起，将领头那名丹谷执事震得嘴角溢血，整座孤岛剑气乱窜、危如累卵。',
      {
        when: (s) => Boolean(s.flags.act3_soul_advantage),
        text: '亏得你两月前早已记熟古阵七处生门死位，眼下立于北岸青石之上竟未受半缕剑煞波及，进退节奏尽在掌中。',
      },
      {
        when: (s) => Boolean(s.flags.act3_soul_rivals_alert),
        text: '南岸丹谷执事瞥见你现身，眼神登时如毒蛇般锁来。两月前那场外围夜袭令他们早早张开了护阵铜铃，却也在仓促变阵间漏出了坎位破绽。',
      },
      {
        when: (s) => s.companions.cang_ming.met && !isCangMingHostile(s),
        text: '苍溟的声音在识海里骤然高昂：“就是现在！左踏坎位借我当年那道断剑余气镇压劫火，直接去劈枯柏木心！这群蠢货懂什么叫养魂木！”',
      },
      {
        when: (s) => s.companions.cang_ming.met && isCangMingHostile(s),
        text: '识海里的苍溟冷冷开口，半句多余人情不带：“坎位是生门，离位埋着我师兄的碎剑。爱信不信，死了可别怪本座没提点。”',
      },
      {
        when: (s) => !s.companions.cang_ming.met,
        text: '就在剑煞冲天的一瞬，枯柏树根底下震出半枚雷击焦黑的古青玉，玉中骤然炸开一道孤傲沧桑的剑意传音：“好大的胆子，连三千年前的碎天阵眼都敢硬闯！小辈，若想拿这截养魂木，听本座苍溟一句话，往左三步借古剑煞势破局！”',
      },
    ],
    choices: [
      {
        id: 'soul2_seize_wood_sword',
        label: '借苍溟指点与残阵走位引动古战场剑意震退群修，亲手斩取【千年养魂木】',
        visible: (s) => !s.companions.cang_ming.met || !isCangMingHostile(s),
        insightTags: (s) => [
          s.relics.includes('soul_nourishing_wood') ? '多得养魂木易石三百二十' : '得【千年养魂木】',
          '苍溟深厚羁绊',
          '修为心境双增',
        ],
        effect: (s) => {
          const hadWood = s.relics.includes('soul_nourishing_wood');
          const metBefore = s.companions.cang_ming.met;
          const hadJadeBefore = s.relics.includes('charred_jade_relic');
          return {
            might: 14,
            mind: 10,
            renown: 10,
            spiritStones: hadWood ? 320 : 0,
            addRelics: hadWood
              ? ['charred_jade_relic']
              : ['soul_nourishing_wood', 'charred_jade_relic'],
            completeThreads: ['thread_act3_soul'],
            setFlags: {
              act3_found_zhantian_lead: true,
              act3_won_soul_wood: true,
              soul2_wood_converted: hadWood,
              soul2_met_cangming_before: metBefore,
              soul2_had_jade_before: hadJadeBefore,
            },
            companionUpdates: {
              cang_ming: {
                meet: true,
                markSeen: true,
                affectionDelta: 24,
                setStage: 4,
                chronicle: metBefore
                  ? '满月之夜你借他指点破开古战场残阵，亲手斩下【千年养魂木】，替他重塑真身迈出最关键的一步。'
                  : '长明古战场黑柏孤岛满月之夜自断玉中苏醒相逢，你顺手斩下【千年养魂木】并收起残玉，立下同行之约。',
              },
            },
            logSummary: hadWood
              ? '月圆之夜登长明古战场震退大宗修士，将多斩下的养魂木暗兑三百二十灵石。'
              : '月圆之夜登长明古战场孤岛，借古剑煞势震退大宗修士，成功夺得【千年养魂木】。',
          };
        },
        outcome: [
          '你足尖连点坎位残碑，三千年前未散的古剑余意仿佛认出了苍溟的气息，轰然化作一道青虹屏障将那三名大宗修士逼退十丈！趁此良机，你凌空一剑斜劈焦柏裂缝，稳稳抄住那截温润如墨玉的【千年养魂木】！',
          (s) => {
            if (!s.flags.soul2_met_cangming_before) {
              const afterReturn = s.flags.soul2_wood_converted
                ? '待次日回到青州，你将多出这截新木交予奇珍楼暗兑三百二十灵石，只留妥先前备好那截。'
                : '';
              return `丹谷执事惊疑退沼，孤岛重归寂静。你顺手将树根泥土里震出的那枚【焦黑断玉】也一并拾进袖中。玉中那道太古残魂沉默两息，声音难得正色几分：“小辈，算你有胆色。留好这截养魂木别白白糟蹋，结丹时可借它温息护魂，待你金丹大成、叩问元婴前夕，更足以替本座重塑真躯。”${afterReturn}`;
            }
            return s.flags.soul2_wood_converted
              ? '丹谷执事惊疑退沼，孤岛重归寂静。苍溟见你怀中本就收妥一截，不由嗤笑：“既备了双份，多出来那截拿去换石买酒便是，只管留好原来那截替本座塑躯。”次日回到青州，你将新斩这截交由奇珍楼暗兑了三百二十灵石。'
              : '丹谷执事眼见古阵杀机竟为你所用，惊疑之下不敢恋战，只得喝令同门仓皇退沼。孤岛重归寂静，断玉中的苍溟久久凝视着那截养魂木，收起平日讥诮：“好样的，{{name}}。留着这木心别白白糟蹋，结丹时只需借它一丝温息护魂，待你金丹大成、叩问元婴前夕，便足以替本座重塑真躯！”';
          },
        ],
        outcomeContinueLabel: '收好战利 · 踏月归返青州',
        bridgeNote:
          '你力压宗门修士夺得【千年养魂木】，这截灵木既可护你结丹，更系着苍溟重塑真身的希望。',
        next: 'act3_hub',
      },
      {
        id: 'soul2_seize_wood_for_self',
        label: (s) =>
          s.flags.act3_soul_advantage
            ? '独凭所记阵位抢斩【千年养魂木】，明言此木只作己身底牌、绝不轻许塑身'
            : '独凭剑锋硬闯古阵抢斩【千年养魂木】，明言此木只作己身底牌、绝不轻许塑身',
        subtext: '养魂木留作己用，当面浇冷苍溟借躯复生的心思，令其彻底戒备反目。',
        visible: (s) => s.companions.cang_ming.met,
        insightTags: (s) => [
          s.relics.includes('soul_nourishing_wood') ? '易石三百二十' : '得【千年养魂木】',
          '苍溟大幅降好感',
          '修为与心境',
        ],
        effect: (s) => {
          const hadWood = s.relics.includes('soul_nourishing_wood');
          return {
            might: 12,
            mind: 10,
            righteous: -6,
            spiritStones: hadWood ? 320 : 0,
            addRelics: hadWood
              ? ['charred_jade_relic']
              : ['soul_nourishing_wood', 'charred_jade_relic'],
            completeThreads: ['thread_act3_soul'],
            setFlags: {
              act3_found_zhantian_lead: true,
              act3_won_soul_wood: true,
              soul2_wood_converted: hadWood,
            },
            companionUpdates: {
              cang_ming: {
                markSeen: true,
                affectionDelta: -18,
                setStage: 4,
                chronicle:
                  '黑柏孤岛斩获养魂木后，你冷声宣告此木只为己用，断玉内的剑气骤然冷如寒铁。',
              },
            },
            logSummary: s.flags.act3_soul_advantage
              ? '独凭所记阵位夺得【千年养魂木】，当面拒许塑身之诺，与苍溟渐成冰炭。'
              : '独凭剑锋硬闯古阵夺得【千年养魂木】，当面拒许塑身之诺，与苍溟渐成冰炭。',
          };
        },
        outcome: [
          (s) =>
            s.flags.act3_soul_advantage
              ? '你并未顺着苍溟的口令引剑，而是依着早先记熟的生门方位避开离位碎剑死门、斜切坎侧，三剑震飞挡路的丹谷执事，反手把那截温润沉重的【千年养魂木】收入怀中。'
              : '你并未顺着苍溟的口令引剑，而是冷眼避开离位剑煞死门、仗着筑基剑锋强劈坎侧破绽，三剑震飞挡路的丹谷执事，反手把那截温润沉重的【千年养魂木】收入怀中。',
          (s) =>
            s.flags.soul2_wood_converted
              ? '袖中断玉猛地一颤，苍溟嗓音低哑：“你手里本就有一截，这截也不肯留给我？”你淡淡扣紧木匣：“归谁用，由我说了算。”玉中死寂片刻，只剩一声冷嗤在荒泽夜风里散开。次日折返青州后，你将多出这截托暗市暗兑了三百二十灵石。'
              : '袖中断玉猛地一颤，苍溟嗓音低哑：“你既得了养魂木，便该知道它对我意味着什么。”你淡淡扣紧木匣：“木是我拿命抢来的，归谁用，由我说了算。”玉中死寂片刻，只剩一声冷嗤在识海散开。',
        ],
        outcomeContinueLabel: '独收战利 · 踏月离开荒泽',
        bridgeNote:
          '你截下【千年养魂木】归为己用，袖中断玉自此寒寂，苍溟对你已生戒心。',
        next: 'act3_hub',
      },
      {
        id: 'soul2_buy_out_truce',
        label: '出面以二百灵石与古阵灵晶分润条件说和，换取无伤带走【千年养魂木】',
        requirement: { minSpiritStones: 200, lockReason: '需灵石 200' },
        insightTags: (s) => [
          s.relics.includes('soul_nourishing_wood') ? '转手净赚120灵石' : '耗灵石200得【千年养魂木】',
          '声望与正道',
        ],
        effect: (s) => {
          const hadWood = s.relics.includes('soul_nourishing_wood');
          return {
            spiritStones: hadWood ? 120 : -200,
            mind: 12,
            renown: 14,
            righteous: 6,
            addRelics: hadWood
              ? ['charred_jade_relic']
              : ['soul_nourishing_wood', 'charred_jade_relic'],
            completeThreads: ['thread_act3_soul'],
            setFlags: {
              act3_found_zhantian_lead: true,
              act3_won_soul_wood: true,
              soul2_had_jade_before: s.relics.includes('charred_jade_relic'),
              soul2_wood_converted: hadWood,
            },
            companionUpdates: {
              cang_ming: {
                meet: true,
                markSeen: true,
                affectionDelta: 18,
                setStage: 4,
                chronicle:
                  '你以灵石与古阵生门换得众修退让，兵不血刃收下【千年养魂木】，他嘴上嗤笑却暗赞你老练。',
              },
            },
            logSummary:
              '在长明古战场以生门相助并折价二百灵石换得宗门退让，稳妥收入【千年养魂木】。',
          };
        },
        outcome: [
          '你并未趁火打劫，反手一剑替那名受困的丹谷执事荡开一道劫火，扬声报出价码：外围残阵散落的古灵晶尽归他们，另补二百灵石作赔，唯有岛心这截养魂木归你。',
          (s) => {
            const afterReturn = s.flags.soul2_wood_converted
              ? '次日回城后，你把多出这截新木易予奇珍楼，扣去赔款反净赚一百二十灵石。'
              : '';
            return s.flags.soul2_had_jade_before
              ? `对手伤势不轻，见你识得生门又有诚意，顺水推舟拱手应诺。你安安稳稳收起【千年养魂木】，苍溟在识海里哼了一声：“虽不够痛快，倒也没白添几个大宗死敌，算你会算账。”${afterReturn}`
              : `对手伤势不轻，见你识得生门又有诚意，顺水推舟拱手应诺。你安安稳稳收起【千年养魂木】与树根旧玉，苍溟在识海里哼了一声：“虽不够痛快，倒也没白添几个大宗死敌，算你会算账。”${afterReturn}`;
          },
        ],
        outcomeContinueLabel: '携木离岛 · 返回青州风云',
        bridgeNote:
          '你兵不血刃收入【千年养魂木】，既结下丹谷善缘，也备齐了护魂重宝。',
        next: 'act3_hub',
      },
      {
        id: 'soul2_ruthless_ambush',
        label: '冷眼坐视对手被古阵重创后骤然出手清场，尽收养魂木与储物重金',
        insightTags: (s) => [
          s.relics.includes('soul_nourishing_wood') ? '多木易石共五百四十' : '得【千年养魂木】+220灵石',
          '修为与魔煞',
        ],
        effect: (s) => {
          const hadWood = s.relics.includes('soul_nourishing_wood');
          const hadJadeBefore = s.relics.includes('charred_jade_relic');
          const metBefore = s.companions.cang_ming.met;
          return {
            spiritStones: hadWood ? 540 : 220,
            might: 12,
            righteous: -18,
            addRelics: hadWood
              ? ['charred_jade_relic']
              : ['soul_nourishing_wood', 'charred_jade_relic'],
            completeThreads: ['thread_act3_soul'],
            setFlags: {
              act3_found_zhantian_lead: true,
              act3_won_soul_wood: true,
              soul2_wood_converted: hadWood,
              soul2_had_jade_before: hadJadeBefore,
              soul2_met_cangming_before: metBefore,
            },
            companionUpdates: {
              cang_ming: {
                meet: true,
                markSeen: true,
                affectionDelta: s.companions.cang_ming.affection < 10 ? 0 : 10,
                setStage: 4,
                chronicle: metBefore
                  ? '古战场孤岛上你出手果决清场夺木，他大笑称长明遗世本就不养心软之人。'
                  : '长明古战场黑柏孤岛自断玉中苏醒相逢，你果决清场夺木并拾起旧玉，他冷笑赞你狠辣。',
              },
            },
            logSummary: hadWood
              ? '趁宗门修士折戟古战场残阵果断清场，多余养魂木暗兑易石，共掠五百四十灵石。'
              : '趁宗门修士折戟古战场残阵之际果断清场，独吞【千年养魂木】与二百二十灵石。',
          };
        },
        outcome: [
          '你匿在雾影里耐心等了两息，直到古阵劫火彻底轰碎对手护身玉佩，才自暗影里暴起扑落！三招剑光闪过，重伤的宗门修士无力抵抗，丢下储物袋狼狈逃入黑水。',
          (s) => {
            const jadePickup = s.flags.soul2_had_jade_before
              ? ''
              : '顺手把树根旁那枚【焦黑断玉】一并揣入袖中。';
            return s.flags.soul2_wood_converted
              ? `你卷走二百二十块灵石并劈下【千年养魂木】，${jadePickup}苍溟冷哼：“够狠，这末法世道，心慈手软的人早在筑基前就成灰了。”次日回城，你便将多出这截新木暗兑了三百二十灵石。`
              : `你挥袖卷走二百二十块灵石，反手劈下墨玉生辉的【千年养魂木】，${jadePickup}苍溟在识海里冷哼一声：“够狠，这末法世道，心慈手软的人早在筑基前就成灰了。”`;
          },
        ],
        outcomeContinueLabel: '满载而归 · 踏出荒泽',
        bridgeNote: (s) =>
          s.flags.soul2_wood_converted
            ? '你以铁血手腕清场荒泽并将多余养魂木暗兑，共收五百四十灵石，身家与杀伐气俱涨。'
            : '你以铁血手腕自长明古战场夺回【千年养魂木】与二百二十灵石，身家与杀伐气俱涨。',
        next: 'act3_hub',
      },
    ],
  },

  // ==================== 卷三四个随机奇遇事件 ====================
  rand_act3_1: {
    id: 'rand_act3_1',
    act: 'act3',
    isRandomEvent: true,
    title: '云岭断碑客',
    subtitle: '青州游历 · 江湖奇遇',
    location: '云岭古道 · 残剑土地庙',
    paragraphs: [
      '你在云岭山道一座塌了半边顶的旧庙避雨，庙檐下坐着一名断了左袖的筑基散修，正对着火堆磨一柄无锋铁剑。见你气息凝练，他抬眼打量片刻，忽然把半截拓满剑图的枯竹简抛在火边。',
      '“九州灵脉一天比一天薄，仙盟却只顾着往天上送‘候补’。”独臂散修嗓音沙哑，“我听闻北边荒泽有人重举三千年前‘斩天会’的旧旗。道友若有胆量，用五十灵石换这半卷破阵剑诀，或是陪我喝一壶冷酒聊几句实话？”',
    ],
    choices: [
      {
        id: 'r3_1_buy_manual',
        label: '付五十灵石买下残卷，并细问他所知「斩天会」的下落',
        requirement: { minSpiritStones: 50, lockReason: '需灵石 50' },
        insightTags: (s) => [
          '耗灵石50',
          s.tags.includes('sword_intent_seed') ? '剑意精纯' : '得命格【剑意雏形】',
          '修为与心境',
        ],
        effect: {
          spiritStones: -50,
          might: 8,
          mind: 8,
          addTags: ['sword_intent_seed'],
          setFlags: { act3_found_zhantian_lead: true },
        },
        outcome: [
          '五十灵石落地，独臂散修爽快地将枯竹简推过来，顺手在地上划出几道古怪的暗号：“若你日后结成金丹、往绝渊走，见了这三道折剑印记，便知是斩天会余脉的联络处。”',
          '雨歇风清，你在庙外试了试简上记载的破阵剑势，只觉胸中锋意顿利三分。收剑告别时，那独臂散修早已背着无锋铁剑没入山雾。',
        ],
        outcomeContinueLabel: '记熟暗号 · 返回青州风云',
        bridgeNote:
          '云岭破庙中换得半卷破阵剑诀，也摸到了神秘「斩天会」的一缕联络暗号。',
        next: '__RETURN__',
      },
      {
        id: 'r3_1_drink_talk',
        label: '解下酒囊与他对饮一壶，共论九州灵潮枯竭之怪',
        insightTags: ['零花费', '心境与声望'],
        effect: {
          mind: 8,
          renown: 5,
          setFlags: { act3_found_zhantian_lead: true },
        },
        outcome: [
          '两人就着山雨喝尽一壶烈酒。独臂散修讲起自己师父当年如何苦修百年、却在飞升前夜被仙盟密使带走后再无音讯的旧事，字字血泪。',
          '雨停辞行，他抱拳祝你早日结丹，莫要做大宗案板上的鱼肉。你记下这份江湖凉热，御剑折返青州。',
        ],
        outcomeContinueLabel: '挥手别过 · 返回青州风云',
        bridgeNote:
          '破庙避雨与独臂散修对饮一场，愈发看清九州散修对仙盟的寒心。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act3_2: {
    id: 'rand_act3_2',
    act: 'act3',
    isRandomEvent: true,
    title: '枯矿急抛',
    subtitle: '青州游历 · 坊市商机',
    location: '青州西郊 · 赤沙矿坑',
    paragraphs: [
      '行经西郊赤沙矿坑，正撞见几十名矿工慌乱撤出矿道。矿脉昨夜突发地陷，仙盟矿务司的封条下午便要贴上门。满面煤灰的小矿主急得团团转，抱着两匣刚洗出来的上品【金脉灵砂】，咬牙喊着一百八十灵石打包急售，只求换笔安家费给弟兄们遣散。',
      '矿坑岩壁裂缝里，几丝微弱灵气正反常地笔直朝天空逸散，连塌陷都透着几分人为抽空的痕迹。',
    ],
    choices: [
      {
        id: 'r3_2_buy_sand',
        label: '趁低价花一百八十灵石吃下两份【金脉灵砂】，日后逢高出货',
        requirement: { minSpiritStones: 180, lockReason: '需灵石 180' },
        insightTags: ['趁贱购入两份金脉灵砂', '待涨出货'],
        effect: {
          spiritStones: -180,
          renown: 4,
          grantMarketGoods: [
            { goodId: 'golden_vein_sand', qty: 2, unitCost: 90 },
          ],
        },
        outcome: [
          '两份【金脉灵砂】在奇珍楼平日至少值三百余灵石，如今一百八十灵石便收入囊中。小矿主攥着灵石连连作揖，立刻招呼矿工们分石散伙。',
          '你验过砂质赤金透亮，满意地收进储物囊，待仙盟封矿风声一起，这两匣货便能赚个盆满钵满。',
        ],
        outcomeContinueLabel: '收好灵砂 · 返回青州风云',
        bridgeNote:
          '于西郊塌矿处低价吃进两份【金脉灵砂】，只待奇珍楼涨价便可获利。',
        next: '__RETURN__',
      },
      {
        id: 'r3_2_save_miners',
        label: '出手以筑基灵力撑住摇摇欲坠的矿口，帮最后几名矿工抢出工具与灵石',
        insightTags: ['正道善名', '灵石110与声望'],
        effect: {
          spiritStones: 110,
          might: 4,
          righteous: 10,
          renown: 8,
        },
        outcome: [
          '你纵身掠至矿道拱门下，催动灵液硬生生托住塌落的青岩半炷香，护着困在里头的六名矿工连滚带爬逃出生天。',
          '轰隆巨响里矿洞彻底合拢。小矿主红着眼眶硬塞给你一百一十块凑出来的灵石谢礼，周围百姓纷纷跪拜称赞真人仁义。',
        ],
        outcomeContinueLabel: '婉辞余谢 · 返回青州风云',
        bridgeNote:
          '你在西郊矿塌之际出手救下六名矿工，青州坊间对你的仁厚传为美谈。',
        next: '__RETURN__',
      },
      {
        id: 'r3_2_inspect_fissure',
        label: '只立在高坡静观地裂处向上逸散的灵气流向，记入行记',
        insightTags: ['零花费', '心境大增'],
        effect: {
          mind: 9,
          worldly: -4,
        },
        outcome: [
          '你在高坡凝望良久，眼见赤沙矿最后那一缕地气并未散入山风，而是被云层之上的无形巨力笔直抽走。记下这处地脉方位后，你静静转身回城。',
        ],
        outcomeContinueLabel: '收起行记 · 返回青州风云',
        bridgeNote:
          '亲见西郊赤沙矿残气被苍穹抽空，你对九州末法根源又多一分明悟。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act3_3: {
    id: 'rand_act3_3',
    act: 'act3',
    isRandomEvent: true,
    title: '旧帖喜乐',
    subtitle: '青州游历 · 红尘沧桑',
    location: '青州南街 · 红绸小院外',
    paragraphs: [
      (s) =>
        s.tags.includes('origin_orphan')
          ? '红纸喜帖。青州南街茶楼歇脚时驿差寻来递上，拆开一看，落款竟是当年青岚巷口那位总顺手塞你半块热饼的客栈老掌柜之孙，如今也在青州落户成亲了。'
          : '红纸喜帖。青州南街茶楼歇脚时驿差寻来递上，拆开一看，落款竟是早年在青岚住过那间小客栈掌柜的孙儿，如今也在青州落户成亲了。',
      (s) => {
        const guestRef = s.tags.includes('origin_orphan')
          ? '当年常蹲在客栈檐下避雨的故人'
          : '当年住过客栈西厢的那位年轻恩客';
        return getAgeYears(s.ageMonths) >= 40
          ? `帖子末尾细细写了一句：老掌柜十年前已寿终正寝，临终前常提起${guestRef}，嘱咐后人若在青州打听到你的名号，务必递张喜帖报个平安。而今你立在红绸飘扬的小院外，听着里头热闹的唢呐声，才惊觉人间已是两代人。`
          : `帖子末尾细细写了一句：老掌柜几年前安然寿终，临终前常提起${guestRef}，嘱咐后人若在青州打听到你的名号，务必递张喜帖报个平安。而今你立在红绸飘扬的小院外，听着里头热闹的唢呐声，方觉世事如流水，眨眼已换了光景。`;
      },
    ],
    choices: [
      {
        id: 'r3_3_send_gift',
        label: '匿名托门房送进四十灵石折成的金银贺礼，不露真容便转身离去',
        requirement: { minSpiritStones: 40, lockReason: '需灵石 40' },
        insightTags: ['耗灵石40', '心境与红尘大增', '正道'],
        effect: {
          spiritStones: -40,
          mind: 13,
          renown: 5,
          worldly: 10,
          righteous: 6,
        },
        outcome: [
          (s) =>
            `你在银楼把四十灵石换成一对雕着长命锁的赤金手镯，写上「${
              s.tags.includes('origin_orphan') ? '青岚故人贺' : '青岚旧客贺'
            }」五字托门房送进院里，随后便隐入熙攘长街。`,
          '听着身后院里传出新娘的轻笑与满堂喝彩，你嘴角不自觉扬起半分。修仙岁月孤冷漫长，能替凡间故人添一笔喜气，心口竟也跟着暖了起来。',
        ],
        outcomeContinueLabel: '迎着烟火回程 · 返回青州风云',
        bridgeNote:
          '替青岚旧客栈的后人匿名送上大婚贺礼，红尘暖意令你道心愈发通透。',
        next: '__RETURN__',
      },
      {
        id: 'r3_3_watch_quietly',
        label: '站在巷口老槐树下静听一曲喜乐，饮尽尘缘后悄然御风远去',
        insightTags: ['零花费', '心境大增', '出世'],
        effect: {
          mind: 9,
          worldly: -6,
        },
        outcome: [
          '仙凡殊途，你贸然现身反倒惊扰了人家大喜。你在老槐树影里静静听完拜堂礼成，对着青岚方向微微颔首，算作送过老掌柜最后一程，随即踏风归去。',
        ],
        outcomeContinueLabel: '收神回城 · 返回青州风云',
        bridgeNote:
          '红绸巷口听罢一曲凡尘喜乐，你更深切地尝到了长生岁月的清冷滋味。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act3_4: {
    id: 'rand_act3_4',
    act: 'act3',
    isRandomEvent: true,
    title: '金丹劫灰',
    subtitle: '青州游历 · 破境前鉴',
    location: '青州南岭 · 焦黑坐关崖',
    paragraphs: [
      '御剑掠过南岭一处绝壁，你在山腹岩洞里撞见一座早已冷透的坐关石台。石壁被天火烧成琉璃色，地上留着半只炸裂的丹炉与一具端坐化灰的骸骨，显是一位前辈当年冲击金丹大关功败垂成之所。',
      '石台角落压着两片耐火青铜手记，密密麻麻刻着他凝丹失败时的灵力反噬教训。裂炉灰烬里还滚落着一块被丹火烧出包浆的【凝神琥珀】与一袋未毁灵石。',
    ],
    choices: [
      {
        id: 'r3_4_study_notes',
        label: '恭敬敛骨入土，静坐三日研读青铜手记里的结丹破障心得',
        insightTags: ['心境与修为', '大幅折减强冲结丹之险'],
        effect: {
          mind: 12,
          might: 6,
          righteous: 6,
          setFlags: { studied_core_failure: true },
        },
        outcome: [
          '你替这位素未谋面的前辈在崖畔立了座衣冠冢，随即盘膝细读两片青铜手记。上头逐寸记着灵液化丹瞬间最易爆脉的三处经穴，以及心魔趁虚而入的时机，字字都是前人用性命换来的血鉴。',
          '合上手记时，你原本对结丹大关隐隐发怵的几处疑难豁然冰释。',
        ],
        outcomeContinueLabel: '拜别石崖 · 返回青州风云',
        bridgeNote:
          '南岭石崖读罢前辈结丹败亡手记，你对即将到来的金丹大关多了几分底气。',
        next: '__RETURN__',
      },
      {
        id: 'r3_4_salvage_loot',
        label: '向骸骨拱手告罪，收走炉灰里的【凝神琥珀】与一百四十灵石',
        insightTags: ['灵石140', '得货品【凝神琥珀】'],
        effect: {
          spiritStones: 140,
          worldly: 5,
          grantMarketGoods: [{ goodId: 'soul_amber', qty: 1, unitCost: 0 }],
        },
        outcome: [
          '前人已逝，奇珍留于荒山亦是暴殄天物。你对着石台拱手三礼，将那块品相极佳的【凝神琥珀】与一百四十块上品灵石尽数收入囊中。转手去奇珍楼一抛，便是极可观的一笔结丹本钱。',
        ],
        outcomeContinueLabel: '收好遗藏 · 返回青州风云',
        bridgeNote:
          '自南岭败关石崖收得【凝神琥珀】与百四十灵石，手头本钱越发宽裕。',
        next: '__RETURN__',
      },
    ],
  },

  // ==================== 卷三高潮：结丹大关 ====================
  act3_golden_core_gate: {
    id: 'act3_golden_core_gate',
    act: 'act3',
    title: '结丹大关',
    subtitle: '卷三高潮 · 灵液凝丹',
    location: '青州云麓 · 闭死关石窟',
    checkpoint: true,
    checkpointLabel: '卷三高潮 · 结丹大关前',
    paragraphs: [
      '{{year}}，你今岁{{age}}岁。石窟外三重禁制已闭。丹田内灵液沉如铅汞，只差最后一把烈火，便能坍缩成那一粒寿逾五百载的金丹。',
      '丹成则足以左右一域风云，大宗与商行皆须以平礼相待。若炉毁丹碎，数十年苦修便一朝化灰。',
      {
        when: (s) => Boolean(s.flags.studied_core_failure),
        text: '脑海中浮现出南岭焦黑石崖那两片青铜手记，前人爆脉的每一处险穴历历在目，令你的呼吸愈发沉稳。',
      },
      (s) => {
        const dh = s.flags.dao_heart;
        if (dh === 'seek_truth') return '凝丹不为飞升虚名，只为再往高处走一步，把旧天背后的账看个通透。';
        if (dh === 'seek_longevity') return '五百载寿元近在咫尺。今日成丹，方才算真正挣脱凡俗短命的泥沼。';
        if (dh === 'seek_fortune') return '金丹一成，九州灵矿与商局才真能由你拍板。';
        if (dh === 'protect_one') return '唯有结丹立威，才护得住你想留住的那方人间烟火。';
        return null;
      },
      '你审视着半生攒下的奇珍、灵脉与道心，决意以哪条法门叩开金丹之门？',
    ],
    choices: [
      {
        id: 'core_orthodox_elixir',
        label: '吞服【九纹凝丹丸】，依正统丹道火候稳健凝成九纹无瑕金丹',
        subtext: '正统丹道专属：消耗【九纹凝丹丸】且须心境定力 ≥ 78，凝成【九纹无瑕金丹】大增底蕴。',
        visible: (s) => s.relics.includes('golden_core_elixir'),
        requirement: {
          minMind: 78,
          lockReason: '驾驭九纹丹火须心境定力 ≥ 78',
        },
        insightTags: ['正统丹道 · 九纹无瑕金丹', '消耗【九纹凝丹丸】', '增越阶底蕴'],
        effect: {
          timeMonths: 42,
          removeRelics: ['golden_core_elixir'],
          might: 22,
          mind: 14,
          renown: 12,
          setRealm: 'golden_core',
          setAct: 'act4',
          addTags: ['golden_core_dao'],
          setFlags: {
            golden_core_method: 'orthodox_elixir',
            core_grade: 'flawless',
          },
          logSummary:
            '吞服【九纹凝丹丸】闭死关三载半，丹成九纹无瑕，平安踏入【金丹期】！',
        },
        outcome: [
          '【九纹凝丹丸】入腹化作九道赤金丹环，将狂暴旋转的灵液漩涡牢牢束于中宫。三载零半年的静坐里，你听着石窟外风雨交替，神识却始终澄澈如明镜。',
          '某日拂晓，丹田内忽传一声清越龙吟！万千灵液坍缩成一粒圆润无瑕的九纹赤金灵丹，磅礴神识轰然破窟而出，覆盖方圆五十里山河！山间云气倒卷成涡，你长身而起，正式踏入五百载寿元的【金丹期】。',
        ],
        outcomeContinueLabel: '金丹初成 · 启卷四《劫波起》',
        next: 'act4_opening',
      },
      {
        id: 'core_vein_array',
        label: (s) =>
          s.relics.includes('spirit_vein_deed')
            ? '以【九州灵脉契】配百枚灵石调动三矿残脉凝丹'
            : '凭商道阵理豪掷四百二十灵石布九宫大阵凝丹',
        subtext:
          '商道/阵道专属途径：须握有【九州灵脉契】，或具备商名/暗市客卿/仙盟客卿/心境≥95 阵理且备足四百二十灵石。',
        visible: (s) =>
          s.relics.includes('spirit_vein_deed') ||
          s.tags.includes('merchant_fame') ||
          s.tags.includes('dark_market_broker') ||
          s.tags.includes('alliance_envoy') ||
          s.mind >= 95,
        requirement: {
          custom: (s) => {
            const cost = s.relics.includes('spirit_vein_deed') ? 100 : 420;
            return s.spiritStones >= cost
              ? { ok: true }
              : { ok: false, reason: `需灵石 ${cost} 布阵` };
          },
        },
        insightTags: (s) => [
          '商道/阵道专属 · 地脉金丹',
          s.relics.includes('spirit_vein_deed') ? '灵脉契+100灵石' : '耗420灵石',
        ],
        effect: (s) => {
          const useDeed = s.relics.includes('spirit_vein_deed');
          return {
            timeMonths: 48,
            spiritStones: useDeed ? -100 : -420,
            might: 20,
            mind: 12,
            renown: 14,
            setRealm: 'golden_core',
            setAct: 'act4',
            addTags: ['golden_core_dao'],
            setFlags: {
              golden_core_method: 'vein_array',
              core_grade: 'vein_core',
            },
            notice: useDeed
              ? '催动【九州灵脉契】引来三矿地气，保留地契且安稳凝丹！'
              : '耗尽四百二十灵石铺成九宫聚灵大阵，灵潮贯体凝成金丹！',
            logSummary:
              '借九宫灵脉大阵聚拢四方地气闭关四载，终成【金丹期】大道！',
          };
        },
        outcome: [
          '山腹醒了！九宫阵盘埋入青石地脉，滚滚灵雾沿阵线倒灌石窟，四载寒暑间灵石与矿气在阵眼化作漫天银辉，硬生生撑出一片宛如上古未枯的浓稠灵域。',
          '第四年岁暮，灵雾尽敛。一粒沉重辉煌的金丹稳稳悬定气海，石窟穹顶绽开十丈青莲虚影，待你推开石门，九州大宗亦须尊称一声真人。五百载寿元入命，尘劫暂远。',
        ],
        outcomeContinueLabel: '出窟望九州 · 启卷四《劫波起》',
        next: 'act4_opening',
      },
      {
        id: 'core_cangming_soulwood',
        label: '请苍溟行三千年前剑丹古法，借【千年养魂木】温息护魂凝就太古剑丹',
        subtext:
          '剑道/古魂专属途径：须持【千年养魂木】、与苍溟情谊≥45 且具剑道根基（剑意雏形/残魂之契/太古剑基）；不损耗养魂木且铸就极强越阶【太古剑丹】！',
        visible: (s) =>
          s.relics.includes('soul_nourishing_wood') &&
          s.companions.cang_ming.met &&
          s.companions.cang_ming.stance !== 'estranged' &&
          s.companions.cang_ming.stance !== 'rival',
        requirement: {
          custom: (s) => {
            if (s.companions.cang_ming.affection < 45) {
              return {
                ok: false,
                reason: `须与苍溟深厚互信（好感≥45，当前 ${s.companions.cang_ming.affection}）`,
              };
            }
            if (
              !s.tags.includes('sword_intent_seed') &&
              !s.tags.includes('cangming_pact') &&
              s.flags.foundation_grade !== 'sword_ancient'
            ) {
              return { ok: false, reason: '须具剑道根基（剑意雏形/残魂之契/太古剑基）' };
            }
            return { ok: true };
          },
        },
        insightTags: ['剑道专属 · 太古剑丹', '不消耗养魂木', '极强越阶杀伐'],
        effect: {
          timeMonths: 36,
          might: 28,
          mind: 14,
          renown: 10,
          setRealm: 'golden_core',
          setAct: 'act4',
          addTags: ['golden_core_dao', 'sword_intent_seed'],
          setFlags: {
            golden_core_method: 'cangming_sword_core',
            core_grade: 'sword_core',
          },
          companionUpdates: {
            cang_ming: {
              markSeen: true,
              affectionDelta: 10,
              chronicle:
                '你结丹之际，他亲以三千年前剑丹古法为你镇脉，借千年养魂木清气护你凝出越阶太古剑丹。',
            },
          },
          logSummary:
            '得苍溟亲授上古剑丹之法，借【千年养魂木】温息护魂三载，一举凝就无上太古剑丹！',
        },
        outcome: [
          '你将【千年养魂木】横置于膝前，怀中焦黑断玉悬空绽出万道青芒。苍溟低喝如雷：“守住中宫，以灵液为铁，以剑意为锤，千锻成丹！”养魂木散出的温润墨玉清气丝丝缕缕缠住你的识海，将所有凝丹燥煞抚得服服帖帖，而木心本源丝毫无损。',
          '三载锻磨，一朝破茧！丹成之刻，整座石窟石壁被无形剑气刻满细密剑纹，你的金丹之上隐现一道微不可察的青色剑环。苍溟长吁一口气，笑声畅快：“好一粒太古剑丹！走吧，有此丹在腹，元婴之下皆可一战！”',
        ],
        outcomeContinueLabel: '携剑丹出关 · 启卷四《劫波起》',
        next: 'act4_opening',
      },
      {
        id: 'core_blood_demon_shortcut',
        label: '逆行吞煞古诀，强纳地底残煞与劫灰催熟魔道血丹',
        subtext: (s) =>
          `【魔道专属】须已步入魔煞道途（正气≤-10或身负血丹染煞），若心境不足 105（当前 ${s.mind}）必遭煞火焚神；成丹则正道故人寒心。`,
        visible: (s) =>
          s.alignment.righteous <= -10 || s.tags.includes('blood_pill_tainted'),
        insightTags: (s) => [
          '魔道专属 · 吞煞魔丹',
          `需心境≥105（当前 ${s.mind}）`,
          '命格【吞煞魔尊】',
        ],
        effect: (s): ChoiceEffect => {
          const failed = s.mind < 105;
          if (failed) {
            return {
              timeMonths: 0,
              righteous: -25,
              setFlags: { core_blood_failed: true },
              logSummary:
                '强纳地煞催熟金丹之际心境失守，惨遭劫煞焚心走火入魔。',
            };
          }
          return {
            timeMonths: 36,
            might: 30,
            righteous: -24,
            renown: 14,
            setRealm: 'golden_core',
            setAct: 'act4',
            addTags: ['golden_core_dao', 'demonic_sovereign'],
            setFlags: {
              golden_core_method: 'blood_demon',
              core_grade: 'blood_demon',
              core_blood_failed: false,
            },
            companionUpdates: {
              ...(s.companions.shen_qingshuang.met
                ? { shen_qingshuang: { affectionDelta: -12 } }
                : {}),
              ...(s.companions.su_zhiwei.met && isSuZhiweiAlive(s)
                ? { su_zhiwei: { affectionDelta: -10 } }
                : {}),
            },
            logSummary:
              '以冷铁心境强吞地底残煞凝就魔道金丹，成就【吞煞魔尊】威名！',
          };
        },
        outcome: [
          (s) =>
            s.flags.core_blood_failed
              ? '滚烫阴冷的地煞狂潮顺着经脉倒冲灵台，无数凄厉嘶嚎在你识海炸开！你的心境终究撑不住这股凶煞反噬，灵液失控炸散，石窟刹那被猩红劫火吞没，一身神智尽数化作血煞囚徒！'
              : '黑潮倒灌经脉！百骸欲裂。生死一线，你以铁石心境反客为主，生生把漫天凶煞死死压进丹田炼作薪柴，三载后一粒赤黑霸道金丹轰然成型，震碎整座石窟山门！正道色变。九霄亦难折你半寸。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.core_blood_failed
            ? '煞火焚神 · 展卷终局'
            : '携魔丹踏世 · 启卷四《劫波起》',
        next: (s) =>
          s.flags.core_blood_failed ? 'ending_blood_demon' : 'act4_opening',
      },
      {
        id: 'core_bare_force',
        label: '不假丹药奇阵，唯凭一身深厚修为与心境孤注一掷硬凝金丹',
        subtext: (s) => {
          const req = s.flags.studied_core_failure ? 195 : 210;
          return `零消耗硬冲：修为与心境满 300 稳渡，${req} 至 299 须带伤强凝，低于 ${req} 则丹碎身陨（当前 ${s.might + s.mind}）。`;
        },
        insightTags: (s) => {
          const req = s.flags.studied_core_failure ? 195 : 210;
          return [
            '零消耗硬冲',
            s.flags.studied_core_failure
              ? `手记减免：稳渡≥300 / ${req}~299重伤（当前${s.might + s.mind}）`
              : `稳渡≥300 / ${req}~299重伤（当前${s.might + s.mind}）`,
            '极高风险',
          ];
        },
        effect: (s): ChoiceEffect => {
          const req = s.flags.studied_core_failure ? 195 : 210;
          const total = s.might + s.mind;
          if (total < req) {
            return {
              timeMonths: 36,
              setFlags: { core_bare_failed: true, core_bare_injured: false },
              logSummary:
                '无丹无阵强冲金丹大关，因底蕴尚差一线火候，灵液崩散道消身陨。',
            };
          }
          const strong = total >= 300;
          return {
            timeMonths: 54,
            might: strong ? 14 : -4,
            mind: strong ? 12 : 4,
            renown: strong ? 12 : 6,
            setRealm: 'golden_core',
            setAct: 'act4',
            addTags: ['golden_core_dao'],
            setFlags: {
              golden_core_method: strong ? 'bare_force' : 'bare_force_injured',
              core_grade: strong ? 'bare_pure' : 'bare_injured',
              core_bare_failed: false,
              core_bare_injured: !strong,
            },
            logSummary: strong
              ? '无丹无阵苦熬四载半，凭一身雄厚底蕴强凝无垢金丹，踏入【金丹期】！'
              : '无丹无阵硬凝金丹虽遭灵流反噬折损修为，仍咬牙成丹踏入【金丹期】。',
          };
        },
        outcome: [
          (s) =>
            s.flags.core_bare_failed
              ? '三年孤坐。稀薄灵气终究撑不起灵液坍缩的末步，金丹雏形将凝未凝之际气海轰然倒卷崩裂，你呕出逆血，耳畔唯余石壁落尘簌簌。差了半步。'
              : s.flags.core_bare_injured
              ? '四载半枯坐，无丹无阵。坍缩灵液震裂数道经脉，你唇角溢血，凭着一股不肯松劲的狠意死死箍住丹核！虽落下一身暗伤折损几分修为，一粒赤金灵丹到底在气海稳住了。'
              : '整整四载半，石窟内无丹香无大阵，唯有你日复一日压榨灵液。山穷水尽那夜，积攒数十年的修为与心境轰然共振，竟在末法死地里逼出一粒纤尘不染的纯粹金丹。睁开双目，山河尽在眼底。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.core_bare_failed
            ? '丹碎人亡 · 展卷终局'
            : '孤勇破关 · 启卷四《劫波起》',
        next: (s) =>
          s.flags.core_bare_failed ? 'ending_fallen_path' : 'act4_opening',
      },
      {
        id: 'core_slow_grind',
        label: '暂不强凝，在石窟枯坐三十载，拿筑基寿元硬磨丹胎底蕴',
        subtext: '零灵石苦熬三十年换取修为与心境各八点。若寿元耗尽仍未成丹，便将坐化石窟。',
        insightTags: ['耗寿三十载', '零花费换底蕴', '慎防寿尽大限'],
        effect: {
          timeMonths: 360,
          might: 8,
          mind: 8,
          logSummary: '于云麓石窟枯坐三十载水磨灵液，以大把流年换取结丹底气。',
        },
        outcome: [
          '石窟封门三十载，人间已换过一代人。你一寸寸淬炼灵液，不借外物，只拿光阴往丹田里填。',
          (s) => `出窟时青州古木已合抱粗。灵液沉了几分，距${toChineseYearNumber(s.lifespanYears)}载大限又逼近了一大截。`,
        ],
        outcomeContinueLabel: '撤禁出窟 · 返归青州',
        bridgeNote: '石窟枯坐三十载归来，灵液渐沉，寿元也悄然折去三十年。',
        next: 'act3_hub',
      },
      {
        id: 'core_back',
        label: '暂缓结丹，退回青州再作筹备',
        next: 'act3_hub',
      },
    ],
  },
};

export const ACT3_RANDOM_EVENTS: RandomEventDefinition[] = [
  {
    sceneId: 'rand_act3_1',
    act: 'act3',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act3_2',
    act: 'act3',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act3_3',
    act: 'act3',
    weight: 10,
    once: true,
  },
  {
    sceneId: 'rand_act3_4',
    act: 'act3',
    weight: 10,
    once: true,
  },
];
