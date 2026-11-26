import { GameState, SceneDefinition } from '../engine/types';

function resolveFirstOpeningEventScene(state: GameState): string {
  if (state.flags.ev_qingzhou_vow && !state.flags.done_ev_qingzhou_vow) {
    return 'act1_event_xinglin';
  }
  if (state.flags.ev_charred_jade && !state.flags.done_ev_charred_jade) {
    return 'act1_event_jade';
  }
  if (state.flags.ev_broken_sword_note && !state.flags.done_ev_broken_sword_note) {
    return 'act1_event_swordnote';
  }
  const hasCommonOmen = Boolean(
    state.flags.ev_spirit_eyes ||
      state.flags.ev_broken_engagement ||
      state.flags.ev_merchant_manual ||
      state.flags.ev_old_daoist_talisman
  );
  if (hasCommonOmen && !state.flags.done_ev_common_omen) {
    return 'act1_event_common_omen';
  }
  if (state.flags.ev_blood_letter && !state.flags.done_ev_blood_letter) {
    return 'act1_event_darkletter';
  }
  return 'act1_qinglan_arrival';
}

function getNextOpeningStepHint(state: GameState): string {
  const next = resolveFirstOpeningEventScene(state);
  const isOrphan = state.tags.includes('origin_orphan');
  if (next === 'act1_event_xinglin') {
    return isOrphan ? '南下青州送货，顺道赴杏林旧约' : '绕道青州，赴杏林旧约';
  }
  if (next === 'act1_event_jade') {
    return isOrphan ? '冒雨避进城郊荒驿，夜听断玉' : '启程上路，夜宿荒驿';
  }
  if (next === 'act1_event_swordnote') {
    return isOrphan ? '出城登麓，驻足断剑古亭' : '行至山麓，驻足断剑古亭';
  }
  if (next === 'act1_event_common_omen') {
    return isOrphan ? '暮色折回，驻足青岚南门城楼下' : '踏上官道，远望青岚城垣';
  }
  if (next === 'act1_event_darkletter') {
    return isOrphan ? '怀揣密信，趁夜摸进城西暗巷' : '怀揣密信，趁夜入青岚暗巷';
  }
  return isOrphan ? '穿过熟稔水巷，回到青岚街市' : '整理行囊，正式步入青岚城';
}

export const ACT1_SCENES: Record<string, SceneDefinition> = {
  // ==================== 四大出身开篇 ====================
  act1_start_herbalist: {
    id: 'act1_start_herbalist',
    act: 'act1',
    title: '山雾采药',
    subtitle: '卷一 · 尘缘起',
    location: '青州北麓 · 翠微崖',
    checkpoint: true,
    checkpointLabel: '卷一初启 · 寒门采药',
    paragraphs: [
      '长明三千零一十二年春，青州北麓的晨雾比往年更寒。老人们说，近二十年山里的灵草越来越稀，连寻常止血的青霜叶都要攀到绝壁背阴处才寻得着。',
      '十六岁的{{name}}背着竹篓踩在湿滑的石阶上，指缝里还留着草汁的苦涩。忽有一阵异样的铁锈味混着檀香从崖下飘来，循味探头看去，一名浑身焦黑的青衫散修靠在枯松下，气息将绝。',
      '他听见脚步声，竟还有力气抬起半截断指，将一只微温的粗布囊袋推到你脚边，沙哑笑道：“小娃……莫去碰青岚暗市的新丹……这囊里半卷引气诀，换你帮我把尸骨埋进土里，别叫野狗叼了去。”',
    ],
    choices: [
      {
        id: 'bury_respectfully',
        label: '敛起他遗骨入土为安，再取那半卷引气诀',
        subtext: '耽搁半日工夫，或许会错过山脚药铺的收市。',
        insightTags: ['正道', '心境', '耗时数月潜修基础'],
        effect: {
          timeMonths: 2,
          mind: 5,
          righteous: 8,
          spiritStones: 20,
          setFlags: { act1_heard_blood_pill: true, buried_wanderer: true },
          logSummary: '于翠微崖安葬濒死散修，得半卷引气诀与二十块灵石，初闻暗市异丹流言。',
        },
        outcome: [
          '你卸下竹篓，用短柄药锄在枯松后掘出一座深坑。山雾湿冷，泥土混着松针黏满十指，直到日影偏西，你才将那具焦黑的尸身放正，盖上厚土，又折了两枝带露的松枝插在坟前。',
          '布囊还暖。里头裹着二十块碎灵石与半卷字迹工整的《吐纳引气诀》，此后两月你白日照旧上崖采药，夜里对着油灯默诵行气法门，终究下定决心走出穷山去青岚城见识真正的仙途。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'search_thoroughly',
        label: '先收下囊袋与贴身灵石，再草草掩土离开',
        subtext: '山中风紧，荒山野岭里死去的散修往往招来仇家。',
        insightTags: ['务实', '灵石', '修为'],
        effect: {
          timeMonths: 1,
          spiritStones: 55,
          might: 3,
          righteous: -5,
          setFlags: { act1_heard_blood_pill: true },
          logSummary: '自翠微崖濒死散修处得引气诀与五十五块灵石，果断离山入世。',
        },
        outcome: [
          '那散修咽下最后一口气时，眼睛仍死死望着青岚城方向。你屏住呼吸替他合上双目，除了粗布囊里的二十块碎灵石与引气诀，又从他腰间暗袋摸出额外三十五块品相极佳的灵石。',
          '怕引来追杀他的仇家，你只就近搬来碎石与落叶将尸身遮掩妥当，便趁着暮雾未散急步下山。怀里沉甸甸的灵石隔着粗布衣襟发凉，远方的青岚城灯火已隐约可见。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_start_fallen_clan: {
    id: 'act1_start_fallen_clan',
    act: 'act1',
    title: '旧祠残香',
    subtitle: '卷一 · 尘缘起',
    location: '青岚郡西 · 破败旧祠',
    checkpoint: true,
    checkpointLabel: '卷一初启 · 落魄世家',
    paragraphs: [
      '春雨打在缺了一角的琉璃瓦上，淅淅沥沥落进祠堂天井。三百年前，你家祖上也曾是青岚郡叫得上号的金丹世家，可灵潮渐退，族中灵脉枯成了干井，最后一位筑基长辈也在去年冬夜坐化。',
      '十六岁的{{name}}立在空荡荡的香案前。案上摆着两件最后的祖产：一卷虫蛀的《青岚引气正注》，以及一枚还能典当出不少灵石的祖传赤铜家印。门外已有邻族管事候着，说愿出高价收了这处荒宅与家印。',
    ],
    choices: [
      {
        id: 'keep_seal',
        label: '拒卖祖印，只携引气残卷悄然离宅入青岚',
        subtext: '身上盘缠不多，但旧族颜面与一丝隐秘人情尚在。',
        insightTags: ['心境', '声望', '正道'],
        effect: {
          timeMonths: 2,
          mind: 6,
          renown: 6,
          righteous: 6,
          setFlags: { kept_clan_seal: true },
          logSummary: '辞别破败祖祠，守住旧族家印，携引气残卷启程前往青岚城。',
        },
        outcome: [
          '你推开斑驳的朱漆大门，平静地谢绝了邻族管事递来的灵石匣。管事嗤笑一声“死要面子”，拂袖离去。可巷口几位曾受你祖上恩惠的老药农，却默默往你行囊里塞了些干粮与旧路引。',
          '回望在春雨中渐渐隐去的旧祠飞檐，你将冰凉的赤铜家印贴身收好。宅子可以荒，人不能先折了脊梁。你迎着微寒山风，大步踏上前往青岚城的长路。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'sell_estate',
        label: '干脆典尽荒宅与旧印，换成实实在在的灵石',
        subtext: '死物守不住长生，唯有灵石能买来踏入仙门的门径。',
        insightTags: ['大量灵石', '务实入世'],
        effect: {
          timeMonths: 1,
          spiritStones: 85,
          worldly: 8,
          renown: -3,
          setFlags: { sold_clan_estate: true },
          logSummary: '变卖衰败祖产换得八十五块灵石，一身轻装直奔青岚坊市。',
        },
        outcome: [
          '你在契纸上干脆利落地按了手印。邻族管事掂着那枚赤铜家印，笑得眼尾堆满褶子，反手点出八十五块灵石递给你，顺口讥讽了一句“果然识时务”。',
          '你没抬头。系紧腰间灵石袋，临行前最后给祖宗牌位插上三炷清香，守着漏雨空壳终究是等死，揣着这点余荫进青岚城兴许还能搏出活路。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_start_orphan: {
    id: 'act1_start_orphan',
    act: 'act1',
    title: '暗巷听风',
    subtitle: '卷一 · 尘缘起',
    location: '青岚南市 · 潮湿后巷',
    checkpoint: true,
    checkpointLabel: '卷一初启 · 坊市孤儿',
    paragraphs: [
      '青岚城从不缺想修仙的穷孩子，也不缺横死在暗巷里的野修士。十六岁的{{name}}缩在丹铺后的砖垛阴影里，听着雨棚外两道压低的声音交谈。',
      '“……青州那边好像起了怪热，老鬼让我这批清心草先压着不出。倒是那批刚试出来的血色丹丸，卖给急着炼气的散修正好。”',
      '说话人听见巷口巡夜梆子响，仓促扯紧斗篷转身，怀里松开的旧皮囊擦过砖角，一枚暗青玉简与一小袋碎灵石掉进了泥水里。巷口灯笼晃动，那人随时可能折返。',
    ],
    choices: [
      {
        id: 'grab_and_vanish',
        label: '顺手抄起玉简与灵石，借雨幕钻进熟稔的窄巷',
        subtext: '坊市规矩，落地无主便是你的机缘，前提是别被当场抓住。',
        insightTags: ['灵石', '风声情报', '修为'],
        effect: {
          timeMonths: 1,
          spiritStones: 45,
          might: 3,
          righteous: -4,
          setFlags: { act1_rumor_plague: true, act1_heard_blood_pill: true },
          logSummary: '在青岚暗巷偷听得青州怪热与血丹风声，顺手拾获引气玉简与灵石。',
        },
        outcome: [
          '你如狸猫般掠出阴影，指尖一勾便将泥水里的玉简与灵石袋一并抄进袖中，转瞬间翻过矮墙，没入错综复杂的青岚水巷。身后隐约传来折返咒骂的脚步声，却早已被大雨冲散了踪迹。',
          '躲在破桥洞下擦净玉简，你惊喜地发现里头竟刻着完整的入门引气诀，而“青州怪热”与“血色丹丸”两句话，也像两颗种子落进了你心里。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'memorize_only',
        label: '只记下话中风声，待人远去后再捡走无主的引气玉简',
        subtext: '沾了暗市血钱容易惹祸，记住行情消息比几块碎灵石更值钱。',
        insightTags: ['心境', '风声情报', '稳妥'],
        effect: {
          timeMonths: 2,
          mind: 6,
          renown: 4,
          setFlags: { act1_rumor_plague: true, act1_heard_blood_pill: true },
          logSummary: '冷静记下坊市暗流与青州怪热消息，得无主引气玉简开始暗自摸索。',
        },
        outcome: [
          '你死死按捺住扑出去的冲动。果然不过十息，方才那人便骂骂咧咧地折回来摸走了泥里的灵石袋，却漏看了滚进砖缝深处的那枚暗青玉简。',
          '待巷口彻底归于寂静，你才不紧不慢地拾起玉简。坊市里活得久的人从不贪小利。凭着这枚引气玉简与刚刚听来的行情风声，你终于有了跳出泥淖的本钱。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_start_scout: {
    id: 'act1_start_scout',
    act: 'act1',
    title: '铁甲未寒',
    subtitle: '卷一 · 尘缘起',
    location: '北境官道 · 临青岚界碑',
    checkpoint: true,
    checkpointLabel: '卷一初启 · 边关斥候',
    paragraphs: [
      '北境的风沙早把你的嗓子磨出了粗粝味。半年前那场妖兽夜袭里，整座斥候营三百号弟兄只剩你一人爬出死人堆。悬在云端观战的两名仙门修士，直到妖兽退去才慢悠悠落下来收割兽丹，连眼皮都没往凡兵尸体上抬一下。',
      '你脱了染血的旧甲，拿死去同袍留下的碎银换来半本《粗浅引气图》贴身揣好，风尘仆仆站在了青岚界碑下。前方白雾缭绕，便是仙凡分界处。',
    ],
    choices: [
      {
        id: 'sharpen_resolve',
        label: '将旧军牌埋在界碑下，发誓此生不再任人鱼肉',
        subtext: '执刀者先稳心，杀伐气收进鞘中才最锋利。',
        insightTags: ['修为', '心境', '出世冷眼'],
        effect: {
          timeMonths: 2,
          might: 6,
          mind: 4,
          worldly: -6,
          logSummary: '埋葬北境军牌于青岚界碑下，携一腔冷峻执念踏上修仙之途。',
        },
        outcome: [
          '你拔出随身短刃，在冰冷的界碑根部挖出一尺浅坑，将那面刻着营号的铁牌放进去，一捧捧覆上沙土。从此北境的凡俗斥候死在了那夜血火里，活下来的只有求道者{{name}}。',
          '接下来的两月里，你循着引气图反复打磨气血，将沙场养出的凛冽杀意尽数敛进骨血深处，大步穿过了青岚白雾。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'keep_dogtag',
        label: '留下同袍军牌贴身带着，先往青岚城寻路子换灵石',
        subtext: '凡人命贱，但你不想忘了自己从哪儿来。',
        insightTags: ['正道', '入世', '灵石'],
        effect: {
          timeMonths: 2,
          spiritStones: 35,
          righteous: 8,
          worldly: 8,
          logSummary: '怀揣同袍军牌入青岚，未忘凡尘旧义，誓求立足仙途之法。',
        },
        outcome: [
          '冰凉的铁牌贴在胸口，隔着粗布衣裳硌得人心安。你把余下几件北境兽皮与军弩在界碑驿站折换成了三十五块灵石，又向过路商队仔细打听了一番青岚城的规矩。',
          '云端修士视凡人如蝼蚁，你偏要带着这三百条凡命的分量，走上去看看仙门里头究竟站着些什么人。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  // ==================== 开局事件专属奇遇展开 ====================
  act1_event_jade: {
    id: 'act1_event_jade',
    act: 'act1',
    title: '断玉初鸣',
    subtitle: '卷一 · 苍溟初醒',
    location: (s) =>
      s.tags.includes('origin_orphan') ? '青岚城郊 · 废弃歇脚亭' : '青岚官道 · 荒驿残灯',
    paragraphs: [
      (s) =>
        s.tags.includes('origin_orphan')
          ? '入夜暴雨倾盆，你替丹铺跑完城外一趟腿，索性缩进城南破旧的歇脚驿亭避雨。子时刚过，贴身收着的【焦黑断玉】比往夜烫得更厉害，像一块烧红的炭贴在胸口，随即一股苍凉锋锐的气息直撞识海！'
          : '入夜后，你借宿在官道旁的破旧驿馆。窗外寒雨敲瓦，子时刚过，贴身收着的【焦黑断玉】比往夜烫得更厉害，像一块烧红的炭贴在胸口，随即一股苍凉锋锐的气息直撞识海！',
      '眼前残灯骤暗，你仿佛看见一座崩塌在金色烈焰中的通天巨门。紧接着，一道又冷又倦、透着三分讥诮的男子声音直接响在你脑海深处：',
      '“……长明三千零一十二年？哼，三千年过去了，下界灵气竟稀薄成这副残羹冷炙模样。小辈，你手里那套破烂引气诀错漏百出，照着练下去，怕是连筑基的门槛都摸不着。”',
    ],
    choices: [
      {
        id: 'question_cangming',
        label: '稳住心神，冷声反问他究竟是何方残魂',
        subtext: '识海藏着来历不明的古灵，若不立住心防，日后必受掣肘。',
        insightTags: ['心境', '苍溟初遇', '好感微升'],
        effect: {
          mind: 5,
          setFlags: { done_ev_charred_jade: true, cangming_awake: true },
          companionUpdates: {
            cang_ming: {
              meet: true,
              affectionDelta: 12,
              setStage: 1,
              chronicle: '雨夜荒亭破驿中于焦黑断玉内苏醒，对你临危不乱的心性颇有几分赞许。',
            },
          },
          logSummary: '焦黑断玉内三千年前残魂「苍溟」苏醒，与你定下初次试探之语。',
        },
        outcome: [
          '你并未像寻常初入仙途的凡人那般跪地求仙，反而咬紧牙关守住灵台，在心底冷声反诘：“藏头露尾居于人识海，前辈既自称三千年前故人，总该先报个名姓与所图。”',
          '识海静默了一瞬，随即响起一声低沉短笑：“有点骨头，不像个软脚虾。记住，本座苍溟。如今我残魂虚弱，夺不了你的舍，倒还要借你的眼去看看如今这方天地变成什么鬼样子。且同行一程罢。”',
          (s) =>
            s.tags.includes('origin_orphan')
              ? '残烛重新摇曳起昏黄火光，断玉归于微温。亭外雨声渐歇，天亮后，你带着识海里这位深不可测的古魂起身折返青岚城。'
              : '油灯重新摇曳起昏黄火光，断玉归于微温。窗外雨声渐歇，天亮后，你带着识海里这位深不可测的古魂继续启程。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'ask_guidance',
        label: '既已撞上大机缘，干脆拱手请教正确的引气法门',
        subtext: '傲岸前辈多半吃软不吃硬，先学真本事再说。',
        insightTags: ['修为', '苍溟初遇', '残魂契约'],
        effect: {
          might: 7,
          addTags: ['cangming_pact'],
          setFlags: {
            done_ev_charred_jade: true,
            cangming_awake: true,
            cangming_taught_qi: true,
          },
          companionUpdates: {
            cang_ming: {
              meet: true,
              affectionDelta: 16,
              setStage: 1,
              chronicle: '指点你修正引气诀错漏，虽口称嫌弃，却已默许暂居你识海同行。',
            },
          },
          logSummary: '得残魂苍溟指点修正引气法门，与其立下互助初契。',
        },
        outcome: [
          '你干脆利落地对着虚空抱拳一礼：“晚辈{{name}}愚钝，若前辈肯指点迷津，他日但有所需，必不相负。”',
          '“嘴倒挺甜，可惜修仙界最不值钱的就是誓言。”苍溟嗤了一声，话虽毒舌，却仍旧将三处行气关窍化作一道流光打进你脑海，“按我改过的路线行气，少走三年弯路。记住了，我叫苍溟，等哪天你站稳了脚跟，这笔债本座可是要连本带利讨回来的。”',
          '你照着新法吐纳一夜，只觉经脉间竟生出一股从未有过的清凉气感。次日晨光破晓，你收好断玉，脚步比昨日沉稳了数倍。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_event_xinglin: {
    id: 'act1_event_xinglin',
    act: 'act1',
    title: '杏林春雨',
    subtitle: '卷一 · 苏知微重逢',
    location: '青州城外 · 杏林医馆',
    paragraphs: [
      (s) =>
        s.tags.includes('origin_orphan')
          ? '趁替青岚药铺南下青州送货的空当，你顺道绕去了青州城外的杏林医馆。檐下挂着一串晒干的艾草，细雨里飘着淡淡桂花与当归味。'
          : s.tags.includes('origin_scout')
          ? '离了北境南下，赴青岚城前你先绕道去了趟青州城外的杏林医馆。檐下挂着一串晒干的艾草，细雨里飘着淡淡桂花与当归味。'
          : '赴青岚城前，你绕道去了趟青州城外的杏林医馆。檐下挂着一串晒干的艾草，细雨里飘着淡淡桂花与当归味。',
      '听见竹门轻响，正在廊下捣药的素衣女子抬起头来。苏知微不过双十年华，发间只插一根素木簪，见是你，眉眼霎时舒展开来：“{{name}}？还当你在外头忘了这间破医馆。快进来烤火，雨衣都湿透了。”',
      (s) =>
        s.tags.includes('origin_orphan')
          ? '替你斟茶时，她无意间轻叹了一声：“近来城北来了些面色发青的病患，脉象像被什么活活抽干了精气，寻常药石竟不大管用。你回青岚走动时风浪大，莫要逞强。”'
          : '替你斟茶时，她无意间轻叹了一声：“近来城北来了些面色发青的病患，脉象像被什么活活抽干了精气，寻常药石竟不大管用。你若去青岚修仙，外头风浪大，莫要逞强。”',
    ],
    choices: [
      {
        id: 'stay_help_suzhiwei',
        label: '留下替她劈柴晒药三日，并记下怪病症状待入青岚打探',
        subtext: '不差这几日工夫，况且她提到的怪病透着一丝古怪。',
        insightTags: ['苏知微羁绊', '入世正道', '青州风声'],
        effect: {
          timeMonths: 0,
          mind: 4,
          righteous: 6,
          worldly: 8,
          addRelics: ['qingzhou_silver_needle'],
          setFlags: { done_ev_qingzhou_vow: true, act1_rumor_plague: true },
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              affectionDelta: 18,
              setStage: 1,
              chronicle: '你临行前绕道青州相伴三日，她将贴身杏林银针匣与安神桂花散赠你防身。',
            },
          },
          logSummary: '于青州杏林重逢苏知微，获赠杏林银针匣，得知青州城北异症端倪。',
        },
        outcome: [
          '这三日春雨未停，你白日替她修补漏雨的药棚、把潮湿的草药一筐筐烘干，夜晚便坐在药案旁，听她一字一句细述城北病患发青的脉象。药炉微暖，仿佛外头险恶的修仙界离这间小院很远。',
          (s) =>
            s.tags.includes('origin_orphan')
              ? '第四日雨霁启程时，苏知微追到竹门外，将一只磨得温润的紫檀针匣塞进你掌心：“里头有几帖我晒的桂花安神散。你在青岚若遇见难处，或者哪天厌了坊市勾心斗角，杏林的门随时开着。”'
              : '第四日雨霁启程时，苏知微追到竹门外，将一只磨得温润的紫檀针匣塞进你掌心：“里头有几帖我晒的桂花安神散。你去了仙城若遇见难处，或者哪天厌了打打杀杀，杏林的门随时开着。”',
          (s) =>
            s.tags.includes('origin_orphan')
              ? '回首望去，素衣身影仍立在湿漉漉的杏树下朝你挥手。你握紧针匣，转身踏上北返青岚城的官道。'
              : '回首望去，素衣身影仍立在湿漉漉的杏树下朝你挥手。你握紧针匣，转身汇入通往青岚城的官道。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'leave_stones_suzhiwei',
        label: '悄悄留下二十灵石压在药柜下，道别后趁早赶路',
        subtext: '仙凡殊途，留些实惠能帮她买药救人，也不必添太多牵绊。',
        insightTags: ['消耗 20 灵石', '苏知微好感', '克制'],
        requirement: { minSpiritStones: 20, lockReason: '需灵石 20' },
        effect: {
          spiritStones: -20,
          mind: 5,
          setFlags: { done_ev_qingzhou_vow: true, act1_rumor_plague: true },
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              affectionDelta: 14,
              setStage: 1,
              chronicle: '你临行前暗留灵石助她购药，她站在雨廊下望了你许久。',
            },
          },
          logSummary: '辞别苏知微并暗留二十灵石相助医馆。',
        },
        outcome: [
          '喝完那盏温热的桂花茶，你趁她回里屋添炭的空当，将二十块足够医馆买下整季药材的灵石用帕子包好，悄悄压在药柜最顺手的一格下。',
          '告别时她仿佛隐隐猜到了什么，没有揭穿，只在雨廊下轻轻替你掸落肩头水珠：“仙路漫长，{{name}}，照顾好自己。”你点头转身没入雨幕，心里却已记下那桩奇怪的青州病症。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_event_darkletter: {
    id: 'act1_event_darkletter',
    act: 'act1',
    title: '子夜茶坊',
    subtitle: '卷一 · 初见谢无咎',
    location: '青岚暗巷 · 无名茶肆二楼',
    paragraphs: [
      '按着染血密信上的暗记，你在子夜推开了青岚城西一间挂着无字白灯笼的茶坊。二楼雅间里只坐着一名玄衣青年，正漫不经心地用折扇拨弄炭盆里的银霜炭。',
      '他接过那封血函，只扫了半眼，唇角微挑，神色似笑非笑：“我那位跑腿的伙计死在城外了？可惜，这封账单原本值二百灵石，如今倒便宜了{{honorific}}。”',
      '谢无咎合拢折扇，抬眼打量你：“我叫谢无咎，百宝斋的少东家。信我收下了。你是打算拿一笔现钱从此两清，还是留个交情，换一块能进青岚暗市的玄铁令？”',
    ],
    choices: [
      {
        id: 'take_token',
        label: '只要这块玄铁令与你百宝斋的一份人情',
        subtext: '现钱花完就没，暗市门路与谢无咎的眼光才是长远筹码。',
        insightTags: ['得百宝斋玄铁令', '谢无咎羁绊', '商道便利'],
        effect: {
          addRelics: ['baibao_token'],
          renown: 6,
          setFlags: { done_ev_blood_letter: true, act1_heard_blood_pill: true },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              affectionDelta: 18,
              setStage: 1,
              chronicle: '你携血函赴约，不贪眼前现银而择玄铁令，令他对你高看一眼。',
            },
          },
          logSummary: '向百宝斋少东家谢无咎递交血函，换得【百宝斋玄铁令】与一份交情。',
        },
        outcome: [
          '谢无咎闻言一挑眉，旋即大笑出声，随手将一块沉甸甸的乌黑铁令抛到你怀里：“年纪不大，胃口和眼光倒都不小！寻常散修见了现灵石早就走不动道了。”',
          '他起身替你拉开木窗，窗外正是青岚城灯火通明的灵市轮廓：“拿着这块令，今后在青岚买奇物报我名号一律折让一成半。对了，最近暗市里新冒出来一种血色丹丸，便宜得反常，{{honorific}}若想活命，可别轻易往嘴里送。”',
          '走下茶坊木梯时，你摩挲着冰凉的玄铁令，知道自己已在青岚最隐秘的圈子里撕开了一道口子。',
        ],
        outcomeContinueLabel: (s) =>
          s.tags.includes('origin_orphan')
            ? '穿过熟稔水巷，回到青岚街市'
            : '走出子夜茶坊，步入青岚灵石坊街',
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'take_cash',
        label: '交情虚无缥缈，不如给我一百二十块灵石现结',
        subtext: '手头有了厚实本钱，进坊市也好、买丹药也好都硬气得多。',
        insightTags: ['大量灵石', '谢无咎初遇'],
        effect: {
          spiritStones: 120,
          worldly: 6,
          setFlags: { done_ev_blood_letter: true, act1_heard_blood_pill: true },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              affectionDelta: 10,
              setStage: 1,
              chronicle: '你爽快要了现钱两清，他笑称你是个懂行规的明白人。',
            },
          },
          logSummary: '以染血密信向谢无咎换得一百二十块灵石，初识百宝斋少东家。',
        },
        outcome: [
          '谢无咎也不啰嗦，拍了拍手，屏风后立刻转出账房奉上一只沉甸甸的鹿皮灵石袋。一百二十块下品灵石在烛火下泛着柔和清光，足够寻常散修苦攒三四年。',
          '“爽快！银货两讫，最不伤和气。”他摇扇送你到楼梯口，临别意味深长地添了一句，“不过青岚很快就要起风了，{{honorific}}揣着这笔钱去南市转转，说不定我们很快还会做第二笔生意。”',
        ],
        outcomeContinueLabel: (s) =>
          s.tags.includes('origin_orphan')
            ? '穿过熟稔水巷，回到青岚街市'
            : '走出子夜茶坊，步入青岚灵石坊街',
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_event_swordnote: {
    id: 'act1_event_swordnote',
    act: 'act1',
    title: '断剑古亭',
    subtitle: '卷一 · 初见沈清霜',
    location: '青岚山麓 · 断剑古亭',
    paragraphs: [
      (s) => {
        const prefix = s.tags.includes('origin_orphan')
          ? '休沐日出城登麓，你来到少有人至的断剑亭，取出怀中那页【断剑残帖】，俯身对照石柱上斑驳的古剑痕。'
          : '入城前途经山麓断剑亭，你取出怀中那页【断剑残帖】，俯身对照石柱上斑驳的古剑痕。';
        const weather =
          s.seasonIndex === 0 || s.seasonIndex === 3
            ? '石阶外传来极轻的踏雪声，松枝上的积雪簌簌抖落。'
            : '石阶外传来极轻的足音，松枝上的松针与山露簌簌抖落。';
        return `${prefix}${weather}`;
      },
      '一名白衣佩剑的女子缓步拾阶入亭，原本只扫了一眼柱上剑痕，待目光落到你展开的残笺上时，脚步一顿，眉峰微不可察地动了动：“那半页剑诀，是从何处得来？”',
      '她自报家门乃青云剑宗内门沈清霜。虽语气疏淡，却并无仗势抢夺之意，只静静道：“纸角所记乃本宗三百年前一位飞升师叔的剑意残笔，只是……宗门典籍中从未提过这几句逆行剑诀。”',
    ],
    choices: [
      {
        id: 'share_note_honestly',
        label: '大方呈与她观摩，并请教其中一式剑意关窍',
        subtext: '既遇正主，坦荡相交或许能换来名门指点与真挚缘分。',
        insightTags: ['修为与剑意', '沈清霜羁绊', '正道'],
        effect: {
          might: 6,
          righteous: 8,
          addTags: ['sword_intent_seed'],
          setFlags: { done_ev_broken_sword_note: true },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              affectionDelta: 18,
              setStage: 1,
              chronicle: '断剑亭中见你坦荡示出古剑残帖，遂以枯枝为你拆解三招青云剑意。',
            },
          },
          logSummary: '于断剑亭初遇青云内门沈清霜，共观古剑残帖，领悟【剑意雏形】。',
        },
        outcome: [
          '你双手奉上残帖，如实道出是在废书堆里偶得。沈清霜细细读完那几行逆行剑诀，眸底掠过一抹极深的凝重，片刻后却郑重将纸页交还于你：“君子不夺人机缘。既承你坦荡相示，我便以三式青云基础剑意回礼。”',
          (s) => {
            const cold = s.seasonIndex === 0 || s.seasonIndex === 3;
            const ground = cold ? '在雪地上缓缓划出三道剑痕' : '在亭前落松针间缓缓划出三道剑痕';
            const leave = cold ? '白衣人已踏雪远去' : '白衣人已御风远去';
            const qinglanWord = s.tags.includes('origin_orphan') ? '若在青岚修仙' : '若入青岚修仙';
            return `她折了一段枯松枝${ground}，明明只是枯枝，落笔处却似有霜寒剑鸣直透肺腑！等你回神细品胸中那缕新生的锐意时，${leave}，只余一句清音留在亭间：“${qinglanWord}，莫忘正心。来日青云山门，或许会再见。”`;
          },
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'trade_note_for_favor',
        label: '直言残帖乃我机缘，若想借阅，须换一封青云外门举荐信或灵石',
        subtext: '天下没有白给的秘密，哪怕对方是剑宗天骄。',
        insightTags: ['灵石与声望', '沈清霜初遇', '务实'],
        effect: {
          spiritStones: 60,
          renown: 6,
          setFlags: { done_ev_broken_sword_note: true, shen_recommend_letter: true },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              affectionDelta: 8,
              setStage: 1,
              chronicle: '你以残帖换取她的举荐手书与灵石，她虽淡然，却记住了你的姓名。',
            },
          },
          logSummary: '于断剑亭与沈清霜交易残帖阅览权，得六十灵石与青云举荐手书。',
        },
        outcome: [
          (s) => {
            const inkSource =
              s.seasonIndex === 0 || s.seasonIndex === 3 ? '借亭中残雪研墨' : '借亭中山露研墨';
            return `沈清霜微微一怔，旋即颔首：“言之有理，是我唐突了。”她并未因你讨价还价而动怒，反倒坦然解下腰间灵袋数出六十块灵石，又${inkSource}，当场为你写下一封署着私印的青云外门举荐手书。`;
          },
          (s) =>
            `抄录完那几句令她神色变幻的逆行剑诀后，她将原帖归还，深深看了你一眼：“{{name}}，我记下了。这世道人心难测，但愿你将来握剑时，仍记得今日这份清醒。”说罢御风离去，你也收好灵石与手书，${
              s.tags.includes('origin_orphan') ? '顺山道折返青岚城。' : '顺山道走向青岚城。'
            }`,
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  act1_event_common_omen: {
    id: 'act1_event_common_omen',
    act: 'act1',
    title: '城门微澜',
    subtitle: '卷一 · 宿命微澜',
    location: '青岚城南门外',
    paragraphs: [
      (s) =>
        s.tags.includes('origin_orphan')
          ? '傍晚走过青岚南门城楼下时，暮色正沉。城楼上嵌着三枚用以聚拢稀薄灵气的月光石，听过路老修叹说比十年前黯淡了不少。'
          : '远远望见青岚城高耸的青石城墙时，暮色正沉。城楼上嵌着三枚用以聚拢稀薄灵气的月光石，听过路老修叹说比十年前黯淡了不少。',
      {
        when: (s) => Boolean(s.flags.ev_spirit_eyes),
        text: '你下意识抬眼望天，天生异瞳之中，整座青岚城上空飘浮着无数细若尘埃的淡青丝线，正顺着某种看不见的漩涡，一点点被抽往漆黑的九霄之上。你心口莫名发凉。',
      },
      {
        when: (s) => Boolean(s.flags.ev_broken_engagement),
        text: (s) =>
          s.tags.includes('origin_orphan')
            ? '城门口一辆绣着锦云纹的灵兽车擦肩而过，车帘微掀，正是退你婚约那家小族的管事。他瞥见你一身粗布旧衫，轻嗤一声便放下了帘子。你只垂眸按紧袖中庚帖，步履未乱半分。'
            : '城门口一辆绣着锦云纹的灵兽车擦肩而过，车帘微掀，正是退你婚约那家小族的管事。他瞥见你一身风尘，轻嗤一声便放下了帘子。你只垂眸按紧袖中庚帖，步履未乱半分。',
      },
      {
        when: (s) => Boolean(s.flags.ev_merchant_manual),
        text: '你顺手翻了翻怀中《灵市货殖考》，扫过城门口进出的药车与符贩，心中已大致算出今年青岚坊市的几笔虚实账。',
      },
      {
        when: (s) => Boolean(s.flags.ev_old_daoist_talisman),
        text: '怀中那道疯道人所赠的暗红旧符，竟在走过青岚护城大阵光幕的一瞬微微发烫，仿佛在提醒你这仙城并非净土。',
      },
    ],
    choices: [
      {
        id: 'enter_city_steady',
        label: (s) =>
          s.tags.includes('origin_orphan')
            ? '敛去心绪，沿南门石阶回城静待风起'
            : '敛去心绪，从容步入青岚城',
        subtext: '不动声色收拢异兆思绪，以清净心境应对将至的风波。',
        insightTags: ['心境', '稳健入局'],
        effect: {
          mind: 4,
          setFlags: { done_ev_common_omen: true },
        },
        next: resolveFirstOpeningEventScene,
      },
      {
        id: 'enter_city_market_eye',
        label: (s) =>
          s.tags.includes('origin_orphan')
            ? '借熟门熟路在南门茶棚打听近来丹符行情，再回街市'
            : '顺道在城门茶棚落脚，先摸清青岚灵市风向与暗流',
        subtext: '既见异兆，不如先听听往来散修口中的真实市价与忌讳。',
        insightTags: ['入世', '灵石微利', '暗市风声'],
        effect: {
          worldly: 5,
          spiritStones: 15,
          renown: 2,
          setFlags: { done_ev_common_omen: true, act1_heard_blood_pill: true },
        },
        outcome: [
          (s) =>
            s.tags.includes('origin_orphan')
              ? '你在城门茶棚点了碗粗茶，顺手替一队刚进城的采药散修指了指药铺门路，换来十五块谢礼灵石与两句实底话。近来城西暗市冒出一批低价血色丹丸，连巡查司都暗中盯紧了城门进出。'
              : '你在城门茶棚点了碗粗茶，顺口替几名南下采药散修辨出两味混杂的假灵草，换来十五块谢礼灵石与两句实底话。近来城西暗市冒出一批低价血色丹丸，连巡查司都暗中盯紧了城门进出。',
          '揣好灵石起身，你心中对青岚水深几何，已先有了三分底数。',
        ],
        outcomeContinueLabel: getNextOpeningStepHint,
        next: resolveFirstOpeningEventScene,
      },
    ],
  },

  // ==================== 青岚自由行迹枢纽（卷一核心自主舞台） ====================
  act1_qinglan_arrival: {
    id: 'act1_qinglan_arrival',
    act: 'act1',
    title: '青岚立身',
    subtitle: (s) =>
      s.might >= 20 || s.actBeat >= 2
        ? '卷一 · 羽翼渐丰，可择机引气'
        : '卷一 · 自由谋划，立身青岚',
    location: '青岚城 · 灵石坊街',
    isHub: true,
    paragraphs: [
      {
        when: (s) => Boolean(s.lastBridgeNote),
        text: (s) => s.lastBridgeNote ?? '',
      },
      '{{year}}，你年方{{age}}岁。青岚城青石长街两侧，左面挂着丹炉幌子，右面飘着热汤饼香气。街边老修士抿着浊茶摇头，说灵气一年比一年稀薄。',
      (s) => {
        const hasMetAny = Object.values(s.companions).some((c) => c.met);
        if (s.flags.act1_crossroads_done) {
          return hasMetAny
            ? '听雨茶肆的血丹风波已暂告一段落。你可以继续在城里攒灵石、跑坊市，或是寻访几位相识的故人，觉得底蕴够了便随时闭关引气入体。'
            : '听雨茶肆的血丹风波已暂告一段落。你可以继续在城里攒灵石、跑坊市，或是循风声拜访城内外门路，觉得底蕴够了便随时闭关引气入体。';
        }
        return hasMetAny
          ? '你尚未引气入体，眼下每一季的光阴都由你自己做主。无论是闭门潜修、接悬赏赚灵石，还是去南市倒卖奇物、寻访城内外故人，抑或径直去茶肆探探风波，全凭你排兵布阵。'
          : '你尚未引气入体，眼下每一季的光阴都由你自己做主。无论是闭门潜修、接悬赏赚灵石，还是去南市倒卖奇物、循风声拜访门路，抑或径直去茶肆探探风波，全凭你排兵布阵。';
      },
      (s) => `【坊市风声】${s.market.rumorText}`,
    ],
    choices: [
      {
        id: 'hub1_crossroads',
        category: 'story',
        label: '前往听雨茶肆打探拜师门路，听听散修议论',
        subtext: '青岚城内风声日紧，茶肆中似藏着宗门与暗市的门路。',
        visible: (s) => !s.flags.act1_crossroads_done,
        insightTags: ['青岚关键风波', '青云/暗市因果分叉'],
        effect: { timeMonths: 2, beatDelta: 1 },
        next: 'act1_crossroads_incident',
      },
      {
        id: 'hub1_cultivate',
        category: 'plan',
        label: '回西城静室打磨气脉（省钱苦修 / 焚香速修 / 练剑）',
        subtext: '引气前至多自主打磨两回，积攒踏入仙途的硬底气。',
        requirement: {
          maxUsesInAct: {
            key: 'cultivate',
            max: 2,
            reason: '凡胎气脉已打磨至当前极限，再苦坐难有寸进，须历尘事或闭关引气',
          },
        },
        insightTags: ['自主潜修', '此间限2次'],
        next: 'act1_action_cultivate',
      },
      {
        id: 'hub1_commission',
        category: 'plan',
        label: '去散修悬赏榜接一桩营生（采药 / 押货 / 暗巷跑腿）',
        subtext: '引气前至多接单两回，主动赚取第一桶灵石与声望。',
        requirement: {
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '近季木牌上已无合你身手的悬赏，待踏入炼气后再看新榜',
          },
        },
        insightTags: ['主动赚灵石', '此间限2次'],
        next: 'act1_action_commission',
      },
      {
        id: 'go_first_market',
        category: 'market',
        label: '前往青岚南市查看行市牌价，交易货品与奇物',
        subtext: '看行情不耗光阴，可低买高卖清心草与破障符，或购下【残缺聚灵阵盘】。',
        insightTags: ['坊市行商', '看价不耗光阴'],
        next: 'act1_first_market',
      },
      {
        id: 'stroll_random_act1',
        category: 'plan',
        label: '去茶楼买风声，或沿着青岚长街游历撞碰机缘',
        subtext: '此间限两回，提前摸清行情涨跌或偶遇长街奇缘。',
        requirement: {
          maxUsesInAct: {
            key: 'intel',
            max: 2,
            reason: '青岚长街近来的风声已打探详尽',
          },
        },
        insightTags: ['打探风声与奇遇', '此间限2次'],
        next: 'act1_action_intel',
      },
      {
        id: 'hub1_companion_visit',
        category: 'companion',
        label: (s) =>
          Object.values(s.companions).some((c) => c.met)
            ? '抽身寻访故人旧识（问药 / 论商 / 问道 / 叩玉）'
            : '循已有门路登门拜访（问药 / 论商 / 问道）',
        subtext: '按已有门路或交情主动登门，不耗光阴即可先行择访。',
        visible: (s) =>
          s.companions.su_zhiwei.met ||
          Boolean(s.flags.act1_rumor_plague) ||
          s.companions.xie_wujiu.met ||
          Boolean(s.flags.xie_invited_player) ||
          s.companions.shen_qingshuang.met ||
          Boolean(s.flags.shen_invited_player) ||
          s.companions.cang_ming.met,
        insightTags: ['不耗光阴', '深化初识情谊'],
        next: 'act1_companion_visit',
      },
      {
        id: 'hub1_ready_breakthrough',
        category: 'breakthrough',
        label: '【引气破境】闭关冲击「引气入体」，踏入炼气期',
        subtext: (s) =>
          s.flags.act1_crossroads_done
            ? '筹码与气脉既成，随时可闭关跨过凡仙第一关。'
            : '你也可以先去听雨茶肆走一遭，或者直接闭关破境。',
        visible: (s) => s.might >= 18 || s.actBeat >= 2 || Boolean(s.flags.act1_crossroads_done),
        insightTags: ['自主决定破境时机', '跨入炼气期'],
        next: 'act1_breakthrough_prep',
      },
    ],
  },

  act1_first_market: {
    id: 'act1_first_market',
    act: 'act1',
    title: '青岚南市',
    subtitle: '卷一 · 坊市行市',
    location: '青岚城 · 南市灵肆',
    market: {
      venueName: '青岚南市 · 散修摊集',
      venueDesc:
        '摊位沿着护城河排开，有叫卖清心草的采药客，也有兜售前朝残阵的老散修。你可以趁机低价备些货品或购入防身奇物，待来日局势变动时居奇获利或助破关。',
      goodsIds: ['qingxin_herb', 'po_zhang_talisman', 'ancient_rubbing'],
      relicOffers: [
        {
          relicId: 'broken_gathering_array',
          basePrice: 120,
          category: 'artifact',
          when: (s) => !s.relics.includes('broken_gathering_array'),
        },
        {
          relicId: 'blood_foundation_pill',
          basePrice: 110,
          category: 'elixir',
          when: (s) =>
            Boolean(s.flags.act1_heard_blood_pill) &&
            !s.relics.includes('blood_foundation_pill'),
        },
      ],
    },
    paragraphs: [
      '青岚南市人声鼎沸，空气里飘着劣质丹香与潮湿草木味。一块灵石足够凡人一家衣食无忧一年，在这里却往往只够买半张破障符。',
      {
        when: (s) => Boolean(s.flags.ev_merchant_manual),
        text: (s) => {
          const heardPlague = Boolean(s.flags.done_ev_qingzhou_vow);
          const heardBloodPill = Boolean(
            s.flags.act1_heard_blood_pill || s.flags.act1_crossroads_done
          );
          if (heardPlague && heardBloodPill) {
            return '你对照着《灵市货殖考》扫了一圈摊面，心里渐渐有了底。眼下青岚街市还算太平，可只要青州疫势或血丹风波一炸，如今不起眼的清心草与符箓便会身价翻番。';
          }
          if (heardBloodPill) {
            return '你对照着《灵市货殖考》扫了一圈摊面，心里渐渐有了底。眼下青岚街市还算太平，可只要暗市血丹风波一炸，如今不起眼的清心草与符箓便会身价翻番。';
          }
          if (heardPlague) {
            return '你对照着《灵市货殖考》扫了一圈摊面，心里渐渐有了底。眼下青岚街市还算太平，可只要青州怪病势起或丹坊生变，如今不起眼的清心草与符箓便会身价翻番。';
          }
          return '你对照着《灵市货殖考》扫了一圈摊面，心里渐渐有了底。眼下青岚街市还算太平，可按商经旧例，凡遇疫病或丹坊生变，如今不起眼的清心草与符箓便会身价翻番。';
        },
      },
      {
        when: (s) => s.relics.includes('baibao_token'),
        text: '你袖口微露那枚乌沉沉的【百宝斋玄铁令】，奇物摊主瞥见后顿时换了副殷勤笑脸，低声道南市奇物照百宝斋旧例一律折让一成半。',
      },
      (s) =>
        s.flags.act1_crossroads_done
          ? '你可以在此自由置办些行市货品或奇物，亦可直接离开坊市，返回青岚街市筹备引气破境或另寻机缘。'
          : '你可以在此自由置办些行市货品或奇物，亦可直接离开坊市，前往城中茶肆打探拜师与引气门路。',
    ],
    choices: [
      {
        id: 'leave_first_market',
        label: '收好行囊离开南市，返回青岚街市另行筹谋',
        insightTags: ['返回青岚自由行迹'],
        bridgeNote: '你收起坊市账目走出南市，青岚城各处仍在运转。',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  // ==================== 卷一中段核心风波：血丹茶肆冲突 ====================
  act1_crossroads_incident: {
    id: 'act1_crossroads_incident',
    act: 'act1',
    title: '茶肆血丹波',
    subtitle: '卷一 · 因果初分',
    location: '青岚城 · 听雨茶肆',
    checkpoint: true,
    checkpointLabel: '卷一 · 茶肆血丹风波',
    paragraphs: [
      '你刚在听雨茶肆落座，二楼忽然传出一声瓷盏碎裂的脆响。一名满脸青气的瘦削散修被两名青云宗外门巡查弟子按在栏杆上，袖中滚落出一枚猩红刺鼻、泛着灰尘光泽的丹丸。',
      '“好大的胆子！连暗市禁售的‘血煞丹’也敢在城中兜售！”巡查弟子厉声喝道。那散修红着眼嘶吼：“正统丹药都被大宗门攥在手里，涨到天价，我们散修不靠这丹，难道活活等死吗？”',
      '楼上茶客纷纷避让，那枚滚到你脚边的血丹散发着甜腥异香。巡查弟子正忙着制住对方双臂，一时腾不出手去拾丹丸。',
    ],
    choices: [
      {
        id: 'side_with_qingyun',
        label: '一脚踩住血丹，协助青云弟子制住散修并上交禁丹',
        subtext: '站在正道与规矩这一边，自然会惹暗市不快。',
        insightTags: ['正道声望', '得青云引荐口讯', '青云好感'],
        effect: {
          might: 4,
          renown: 8,
          righteous: 14,
          spiritStones: 30,
          addTags: ['blood_pill_whistleblower'],
          setFlags: {
            act1_sided_qingyun: true,
            act1_heard_blood_pill: true,
            act1_crossroads_done: true,
            shen_invited_player: true,
          },
          companionUpdates: {
            shen_qingshuang: {
              affectionDelta: 6,
            },
            xie_wujiu: {
              affectionDelta: -6,
            },
          },
          logSummary: '于听雨茶肆协助青云宗查扣暗市血丹，得正道清名与巡查司引荐口讯。',
        },
        outcome: [
          '你上前一步，脚尖一挑将血丹踢入玉盒，顺手扣住散修挣扎的手腕。青云巡查弟子松了口气，按仙盟赏格点给你三十块灵石。',
          '领队弟子收好玉盒，顺口提了一句：“阁下身手干脆。内门沈清霜师姐近期也在查这批血丹去向，常在山麓断剑亭歇脚。你若有意投青云，可凭我巡查司的口讯去拜会她。”',
          '茶肆很快恢复喧闹，你揣好灵石走出长街，心里已盘算起下一步去向。',
        ],
        outcomeContinueLabel: '携赏金返青岚，筹备下一步',
        bridgeNote: (s) =>
          s.companions.shen_qingshuang.met
            ? '听雨茶肆助青云宗扣下血丹后，巡查司口讯也指向断剑亭，你盘算着找机会再去寻沈清霜一叙。'
            : '听雨茶肆助青云宗扣下血丹后，你得了巡查司口讯，可择日登断剑亭拜会沈清霜。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'cover_for_darkmarket',
        label: '佯装慌乱撞翻茶桌，趁乱将血丹塞回那散修袖中放他脱身',
        subtext: '仙门高高在上，底层散修与暗市门路有时反而更讲实际。',
        insightTags: (s) =>
          s.companions.xie_wujiu.met
            ? ['谢无咎熟人回礼', '灵石收益']
            : ['暗市缘分', '得百宝斋拜帖', '灵石收益'],
        effect: (s) => ({
          spiritStones: 55,
          righteous: -10,
          worldly: 8,
          setFlags: {
            act1_helped_darkmarket: true,
            act1_heard_blood_pill: true,
            act1_crossroads_done: true,
            xie_invited_player: true,
          },
          companionUpdates: {
            xie_wujiu: {
              affectionDelta: 8,
            },
            shen_qingshuang: {
              affectionDelta: -6,
            },
          },
          logSummary: s.companions.xie_wujiu.met
            ? '于听雨茶肆暗助血丹散修脱身，三日后收到谢无咎派人送来的灵石与熟人口信。'
            : '于听雨茶肆暗助血丹散修脱身，三日后收到百宝斋少东家谢无咎送来的灵石与拜帖。',
        }),
        outcome: [
          '茶盏翻滚、热汤四溅的混乱只持续了三息。你借势往前一扑，肩背挡在巡查弟子身前，顺手将滚落脚边的血丹飞快塞回那散修怀中。对方感激地瞥了你一眼，撞破临街木窗没入人群。',
          (s) =>
            s.companions.xie_wujiu.met
              ? '巡查弟子扑了个空，骂骂咧咧地收队离开。直到三日后的傍晚，百宝斋那名灰衣伙计才敲开你的石室门，奉上五十五块灵石笑道：“少东家托我带话，说{{honorific}}这手搅局脱身的本事倒比在子夜茶坊还利落。这点灵石算茶水资，得空随时来二楼雅间喝茶。”'
              : '巡查弟子扑了个空，骂骂咧咧地收队离开。直到三日后的傍晚，一名灰衣伙计才敲开你的石室门，奉上五十五块灵石与一张暗红拜帖：“百宝斋谢少东家听说了茶肆的事，托我送份薄礼。阁下得空时，可凭帖去城西后门喝杯茶。”',
          (s) =>
            s.companions.xie_wujiu.met
              ? '你掂了掂这份顺水人情，盘算着是花灵石购阵盘，还是抽空再登百宝斋二楼同谢无咎对对风声。'
              : '你掂了掂这份暗市人情，决定接下来是花灵石购阵盘，还是先赴百宝斋看看谢无咎的虚实。',
        ],
        outcomeContinueLabel: (s) =>
          s.companions.xie_wujiu.met
            ? '收好灵石，重回青岚谋划'
            : '收好谢礼与拜帖，重回青岚谋划',
        bridgeNote: (s) =>
          s.companions.xie_wujiu.met
            ? '茶肆暗助脱身三日后，谢无咎派伙计送来五十五块灵石，邀你得空再赴百宝斋雅间喝茶。'
            : '茶肆暗助暗市脱身三日后，百宝斋谢无咎派人送来灵石与拜帖。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'pay_to_settle',
        label: '掷出六十灵石替那散修赔罪息事，顺手买走这枚古怪血丹暗中研究',
        subtext: '既不得罪两边，又能亲手把玩这枚透着古怪的丹药。',
        requirement: { minSpiritStones: 60, lockReason: '需灵石 60' },
        insightTags: ['以财破局', '得血煞丹样本', '心境'],
        effect: {
          spiritStones: -60,
          mind: 7,
          renown: 6,
          addRelics: ['blood_foundation_pill'],
          setFlags: {
            act1_bought_blood_pill_sample: true,
            act1_heard_blood_pill: true,
            act1_crossroads_done: true,
          },
          logSummary: '掷六十灵石平息茶肆风波，暗中留下一枚血煞丹样本细查端倪。',
        },
        outcome: [
          '你笑吟吟地上前打圆场，反手拍出六十块灵石替茶肆赔了损失、又给巡查弟子递了台阶，只说这枚来路不明的怪丹由你买下封存、绝不流入坊市。众人见你出手阔绰、谈吐不俗，各自顺坡下驴散了场。',
          '回到住处灯下细看那枚猩红丹丸，丹壳纹理里嵌着一丝冰冷的灰白细尘，绝非凡间灵草所能炼出。将它蜡封收好后，你走出屋门继续在青岚筹备破境。',
        ],
        outcomeContinueLabel: '封存血丹，返回青岚',
        bridgeNote: '茶肆买下的血煞丹样本已蜡封入囊，你随时可以筹备引气破境。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'stay_detached',
        label: '拂袖退至檐下冷眼旁观，只记下那丹丸上异样的灰白微尘',
        subtext: '修仙界水深，未成炼气前不轻涉任何一方争斗。',
        insightTags: ['出世定力', '心境', '稳健'],
        effect: {
          mind: 8,
          worldly: -8,
          setFlags: {
            act1_observed_dust: true,
            act1_heard_blood_pill: true,
            act1_crossroads_done: true,
          },
          logSummary: '于茶肆风波中冷眼旁观，未沾因果，却敏锐记下了血丹表面的灰白微尘。',
        },
        outcome: [
          '你悄无声息退到廊柱阴影里，看着那名散修被巡查弟子锁走、满楼茶客重新喧哗，自始至终未曾沾染半分因果。唯独那枚血丹滚过眼前时表面泛起的灰白微尘，叫你久久难以忘怀。',
          '结清茶钱走出茶肆，你心里更加清醒，先攒足筹码跨入炼气期，再谈看透青岚。',
        ],
        outcomeContinueLabel: '结账离去，重回青岚',
        bridgeNote: '听雨茶肆中你冷眼抽身未沾因果，如今可以安心筹谋引气破境。',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  // ==================== 卷一突破：引气入体 ====================
  act1_breakthrough_prep: {
    id: 'act1_breakthrough_prep',
    act: 'act1',
    title: '闭关引气',
    subtitle: '卷一 · 凡仙一隔',
    location: '青岚城西 · 租来的静室',
    paragraphs: [
      '这些时日你在青岚城西租了一间僻静石室，日夜推演手中引气诀。经脉隐隐发胀，你终于摸到了“引气入体”的门槛。',
      '末法年景里天地清气本就稀薄，凡胎开窍从来不是轻省事。空手苦熬便多耗几年阳寿，舍得砸灵石或借外物，便能抢出先机。',
      {
        when: (s) => s.companions.cang_ming.met,
        text: '识海里，苍溟懒洋洋打了个哈欠：“本座教你一招逆转三脉的古法，可省你两年苦功，只是疼得像刀刮骨，且要你许我日后替我寻一味‘养魂木’。”',
      },
    ],
    choices: [
      {
        id: 'qi_use_array',
        label: '祭出【残缺聚灵阵盘】，引方圆清气一鼓作气冲开灵窍',
        visible: (s) => s.relics.includes('broken_gathering_array'),
        insightTags: ['奇物助阵', '修为大进', '省寿元'],
        effect: {
          timeMonths: 12,
          might: 14,
          mind: 6,
          setRealm: 'qi_mid',
          addTags: ['qi_awakened'],
          logSummary: '借残缺聚灵阵盘之力仅耗一载便引气入体，一举稳固炼气中期。',
        },
        outcome: [
          '你将【残缺聚灵阵盘】置于蒲团之下，指尖微颤着嵌入灵石。阵纹逐一亮起微青幽光，石室外方圆三里的稀薄清气顿时如百川归海般朝你涌来！',
          '寒暑易节，转眼便是一载闭关。澎湃灵流冲开最后一道经脉壁垒，你一举越过初期桎梏，直入炼气中期！',
        ],
        outcomeContinueLabel: '感受初开灵窍 · 望向静室夜空',
        next: 'act1_breakthrough_trial',
      },
      {
        id: 'qi_use_stones',
        label: '豪掷八十灵石租下灵眼静室，以灵石堆开仙门',
        requirement: { minSpiritStones: 80, lockReason: '需灵石 80' },
        insightTags: ['以灵石买时间', '修为提升', '稳健'],
        effect: {
          timeMonths: 14,
          spiritStones: -80,
          might: 11,
          mind: 5,
          setRealm: 'qi_early',
          addTags: ['qi_awakened'],
          logSummary: '耗费八十灵石租借灵眼静室，一载有余顺遂引气入体，踏入炼气期。',
        },
        outcome: [
          '八十块灵石交出去的那一刻虽叫人心疼，踏入青岚灵眼静室后，满室浓润灵息立刻证明这笔灵石没白花。',
          '一载零二月光阴在静坐中滑过。某日寅时，腹中温热气旋彻底成型，你叩开了修仙第一关。',
        ],
        outcomeContinueLabel: '破关而出 · 初窥仙门夜空',
        next: 'act1_breakthrough_trial',
      },
      {
        id: 'qi_cangming_method',
        label: '依苍溟所授上古逆脉法强冲灵窍',
        visible: (s) => s.companions.cang_ming.met,
        insightTags: ['苍溟羁绊', '修为暴涨', '承残魂人情'],
        effect: {
          timeMonths: 10,
          might: 15,
          mind: 4,
          setRealm: 'qi_mid',
          addTags: ['qi_awakened', 'cangming_pact'],
          setFlags: { cangming_taught_qi: true },
          companionUpdates: {
            cang_ming: {
              affectionDelta: 12,
              chronicle: '以三千年前逆脉古法助你十月成炼气，你也应下日后助他温养残魂之诺。',
            },
          },
          logSummary: '忍受刮骨之痛行苍溟上古逆脉法，十月便直入炼气中期。',
        },
        outcome: [
          '逆脉行气之痛远超想象，十个月里你数次疼得咬破嘴唇、冷汗浸透{{robe}}，全靠苍溟在识海里时而喝骂、时而精准护住心脉才未致经脉寸断。',
          '终于在第十月朔夜，三道奇脉逆冲贯通！苍溟长长舒了口气，语气放软一分：“不错，竟真咬牙撑下来了。这具根基，比如今那些大宗门靠丹药喂出来的宗阁娇苗强上十倍。”',
        ],
        outcomeContinueLabel: '调息破关 · 推窗夜望',
        next: 'act1_breakthrough_trial',
      },
      {
        id: 'qi_bitter_meditation',
        label: '不假外物，闭门三载水磨苦修，以凡心磨开天窍',
        subtext: '多耗三年凡俗岁月，却根基最稳、心境最澄明。',
        insightTags: ['耗时三载', '心境大进', '零花费'],
        effect: {
          timeMonths: 36,
          might: 8,
          mind: 12,
          setRealm: 'qi_early',
          addTags: ['qi_awakened'],
          logSummary: '于陋室清修三载，终凭己力引气入体，虽耗流年却道心澄澈。',
        },
        outcome: [
          '没有丹药，也没有聚灵大阵。春燕在窗檐筑巢又南飞，寒雪落满院中老梅三次。你在枯坐中一点点筛滤稀薄的天地灵气，将浮躁、执念与寒苦尽数磨成澄澈道心。',
          '整整三载春秋之后，水到渠成，丹田灵窍无声自开。虽然流逝了三年凡尘年华，你的根基却稳得如千年磐石。',
        ],
        outcomeContinueLabel: '三载破关 · 推窗见天地',
        next: 'act1_breakthrough_trial',
      },
      {
        id: 'qi_back',
        label: '暂缓引气，先退回青岚街市再作筹备',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  act1_breakthrough_trial: {
    id: 'act1_breakthrough_trial',
    act: 'act1',
    title: '天穹一瞥',
    subtitle: '卷一 · 破境成炼气',
    location: '青岚城西 · 静室',
    paragraphs: [
      '一股清冽灵息自丹田深处漾开，仿佛封冻多年的春溪终于破冰。第一缕真正属于你的灵气顺着奇经八脉奔涌，耳畔听得清百步之外檐角滴水的节拍，体内沉沉的凡俗倦意一扫而空。',
      '你推开木窗，迎着微凉夜风深吸一口气。从此寿逾百载，凡仙殊途。',
      (s) => {
        const dh = s.profile.daoHeartId;
        if (dh === 'seek_longevity') {
          return '你按住微热的丹田，初衷愈明：既跨凡寿第一关，便要一步步踏碎百年枯荣。';
        }
        if (dh === 'seek_truth') {
          return '你望着夜空暗忖：三千年天门无归音，既有灵识在身，总要亲眼看个明白。';
        }
        if (dh === 'seek_fortune') {
          return '你轻笑一声：炼气已成，灵石与人间风月，往后总算有了伸手去拿的底气。';
        }
        return '你缓缓合拢五指：既得超凡之力，日后岁月汹涌，总算更有几分护住灯火的把握。';
      },
      '灵窍初开。灵识本能探向夜空的那一息，极高极远的云海之上似有一双毫无温度的巨眼顺着新开的灵窍淡漠扫过，随即合拢。你浑身汗毛倒竖。',
      {
        when: (s) => s.companions.cang_ming.met,
        text: '识海里，苍溟的声音沉了下来：“你也感觉到了？别声张……每个初开灵窍的人都会被那东西记上一笔。如今你我已入局中。”',
      },
      {
        when: (s) => !s.companions.cang_ming.met,
        text: '转眼间夜色重归寂静，唯余满天星斗。你怔怔立在窗前，分不清方才那抹令人窒息的窥视究竟是幻觉，还是长明旧历背后的隐秘。',
      },
    ],
    choices: [
      {
        id: 'proceed_act1_finale',
        label: '压下心头寒意，走出静室迎向全新的仙途',
        insightTags: ['步入炼气新途抉择'],
        effect: {
          timeMonths: 3,
          mind: 4,
        },
        next: 'act1_finale',
      },
    ],
  },

  // ==================== 卷一终章：决定卷二动态世界大势 ====================
  act1_finale: {
    id: 'act1_finale',
    act: 'act1',
    title: '问途三岔口',
    subtitle: '卷一终章 · 世局初分',
    location: '青岚城 · 观云台',
    checkpoint: true,
    checkpointLabel: '卷一终章 · 炼气问途抉择',
    paragraphs: [
      '此刻已是{{year}}，你年方{{age}}岁，已是一名真正的炼气期修士。',
      '登临观云台。青云剑宗筹备试剑大典，外门精英却接连失踪，城中暗市血丹愈演愈烈，远处青州怪疫未息、地底古脉闷响不绝。风已起。路在脚下。',
      '脚下三条山道各自伸向雾里。岁月不等人，气海初开后的头几年，你打算借哪一股风势在青岚立身？',
    ],
    choices: [
      {
        id: 'act1_choose_qingyun',
        label: '赴青云山门投考外门，借名门之势问剑求道',
        subtext: (s) =>
          s.flags.shen_recommend_letter
            ? '手握沈清霜私印举荐手书，投考青云外门可省去重重苛难，直入试剑风波。'
            : '青云开山收徒，外门却频传弟子失踪。借名门正统立足，亦须直面山门深处的暗影。',
        insightTags: ['青云外门', '开启试剑大势', '沈清霜尘缘'],
        effect: (s) => {
          const hasRec = Boolean(s.flags.shen_recommend_letter);
          return {
            timeMonths: 6,
            setAct: 'act2',
            addTags: ['qingyun_outer'],
            addRelics: ['qingyun_sword_tally'],
            renown: hasRec ? 16 : 8,
            spiritStones: hasRec ? 40 : 0,
            righteous: 8,
            setFlags: {
              act2_primary_route: 'qingyun',
              arc_sword_trial_active: true,
              arc_blood_pill_active: true,
            },
            activateThreads: ['thread_sword_trial', 'thread_blood_pill'],
            logSummary: hasRec
              ? '持沈清霜私印手书免试入青云外门，直面试剑失踪案与血丹暗流。'
              : '炼气成道后拜入青云剑宗外门，卷入试剑失踪案与血丹暗流。',
          };
        },
        outcome: [
          (s) =>
            s.flags.shen_recommend_letter
              ? '你转身望向云雾缭绕的青云主峰。山门执事验过你递上的沈清霜私印举荐手书，当即免去繁琐杂役考核，不仅特拨四十块外门安家灵石，还亲手奉上素青道袍与青铜剑令。'
              : '你转身望向云雾缭绕的青云主峰，终究决定先借名门正统之势站稳脚跟。半载之后，你凭着沉稳心境与炼气修为顺利通过外门三关考核，换上素青道袍，接过了沉甸甸的青铜剑令。',
          '踏入山门的那一日，山风骤冷。外门试剑在即，失踪同门与青岚血丹的暗涌，正向着你的新身份缓缓合拢。',
        ],
        outcomeContinueLabel: '启幕第二卷 · 踏入《问途 · 青云外山》',
        next: 'act2_opening_qingyun',
      },
      {
        id: 'act1_choose_darkmarket',
        label: '扎根青岚暗市，借百宝斋与坊市风云以财问道',
        subtext: '暗市血丹涌动、坊市牌价震荡。与百宝斋同席博弈，在黑白夹缝里以灵石开路。',
        insightTags: ['暗市客卿', '开启血丹大势', '谢无咎尘缘', '高经济收益'],
        effect: {
          timeMonths: 6,
          setAct: 'act2',
          addTags: ['dark_market_broker'],
          spiritStones: 70,
          worldly: 10,
          setFlags: {
            act2_primary_route: 'darkmarket',
            arc_blood_pill_active: true,
            arc_plague_active: true,
          },
          activateThreads: ['thread_blood_pill', 'thread_qingzhou_plague'],
          logSummary: '择暗市客卿之道立足青岚，直面血丹风暴与青州疫局。',
        },
        outcome: [
          '在大宗门里仰长老鼻息终究受制于人，把灵石和消息攥在自己手里才最实在。半年之间，你凭着炼气身手替暗市走了几趟隐秘押运，很快在青岚城西立住了“暗市客卿”的名号，腰包也日渐丰盈。',
          '只是灯火愈盛，暗影愈深。随着血丹黑幕与青州怪疫双双发酵，青岚坊市百年未有的大震荡已近在眼前。',
        ],
        outcomeContinueLabel: '启幕第二卷 · 踏入《问途 · 灯火暗市》',
        next: 'act2_opening_darkmarket',
      },
      {
        id: 'act1_choose_wanderer',
        label: '不入樊笼，作红尘散修南下青州探查怪疫与古脉',
        subtext: '青州怪疫未息，北麓地底夜夜闷响。不入樊笼，只凭一己眼光探向尘世与枯脉深处。',
        insightTags: ['红尘散修', '开启青州古脉大势', '苏知微与苍溟尘缘'],
        effect: {
          timeMonths: 6,
          setAct: 'act2',
          addTags: ['wandering_cultivator'],
          mind: 8,
          setFlags: {
            act2_primary_route: 'wanderer',
            arc_plague_active: true,
            ancient_vein_disturbed: true,
          },
          activateThreads: ['thread_qingzhou_plague', 'thread_ancient_vein'],
          logSummary: '拒绝宗门与暗市拘束，以散修之身南下青州探查怪疫与古脉。',
        },
        outcome: [
          '你不愿被宗门清规锁死，也不愿与暗市豺狼同席。整顿好佩剑与干粮后，你孤身离开喧嚣的青岚城，沿着灵气日渐稀薄的官道一路南下，迎着扑面而来的{{season}}风走向青州。',
          '愈近青州，草木愈发枯黄，夜半大地深处甚至能听见沉闷的低鸣。这片土地之下，藏着足以动摇三千年长明历的裂痕。',
        ],
        outcomeContinueLabel: '启幕第二卷 · 踏入《问途 · 南下青州》',
        next: 'act2_opening_wanderer',
      },
    ],
  },
};
