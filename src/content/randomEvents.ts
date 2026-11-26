import { RandomEventDefinition, SceneDefinition } from '../engine/types';
import { getAgeYears } from '../engine/time';
import { isMajorArcMissed } from '../engine/systems';

export const RANDOM_EVENT_SCENES: Record<string, SceneDefinition> = {
  // ==================== 卷一随机事件 ====================
  rand_act1_teahouse_rumor: {
    id: 'rand_act1_teahouse_rumor',
    act: 'act1',
    isRandomEvent: true,
    title: '茶肆残话',
    subtitle: '青岚偶遇',
    location: '青岚城 · 临河茶棚',
    paragraphs: [
      '你在河边茶棚歇脚，邻桌一名独臂老散修喝得半醉，指着万里无云的天空含混笑道：“都说三千年前长明真仙开了天门，可诸位听说过哪位飞升前辈托梦回下界报一声平安吗？没有！一个都没有！”',
      '茶博士赶忙上前捂他的嘴，说莫要犯仙盟忌讳。老散修却撇撇嘴，从怀里摸出一块粗糙的清心草干叶问你愿不愿意用十五灵石换他一壶酒钱。',
    ],
    choices: [
      {
        id: 'r1_tea_buy',
        label: '花十五灵石请他吃酒，顺势细问三千年飞升旧闻',
        requirement: { minSpiritStones: 15, lockReason: '需灵石 15' },
        insightTags: ['耗灵石', '心境', '世界秘辛'],
        effect: {
          spiritStones: -15,
          mind: 6,
          renown: 2,
          setFlags: { heard_ascension_doubt: true },
        },
        outcome: [
          '十五灵石换来两壶浊酒，老散修醉眼微眯，左右张望一圈才压低嗓音：“小友有心了。老朽年轻时给青云宗挑过水，听见两名醉酒执事漏嘴，说禁地那座飞升碑从不许外门弟子绕到后头去，只推说碑阴有邪气。”',
          '说完他拎着空酒葫芦哼着荒腔走了，留你对着微凉茶水思忖良久，随后起身折返喧嚣的青岚长街。',
        ],
        outcomeContinueLabel: '记下酒话 · 折返青岚长街',
        next: '__RETURN__',
      },
      {
        id: 'r1_tea_listen',
        label: '只默默听在耳里，饮尽冷茶便起身告辞',
        insightTags: ['心境微长', '无花费'],
        effect: { mind: 3 },
        outcome: [
          '你不露声色地饮尽盏中冷茶。老散修的话虽带着三分酒气，却像一根细刺悄然扎进了心里。出了茶棚，你顺着河岸折返青岚长街。',
        ],
        outcomeContinueLabel: '走出茶棚 · 折返青岚长街',
        next: '__RETURN__',
      },
    ],
  },

  rand_act1_fake_pill: {
    id: 'rand_act1_fake_pill',
    act: 'act1',
    isRandomEvent: true,
    title: '街角假丹',
    subtitle: '青岚偶遇',
    location: '青岚东街 · 牌坊下',
    paragraphs: [
      '一名油头粉面的游方道人拉住你衣袖，神秘兮兮地亮出一只紫檀药盒：“小友印堂发亮，乃天生修仙奇才！贫道这枚‘聚气正丹’原价五十灵石，今日有缘，三十灵石结个善缘！”',
      '药香虽浓，却隐隐透着一股劣质甘草与朱砂混炒的焦苦气。',
    ],
    choices: [
      {
        id: 'r1_pill_expose',
        label: '当众点破这是甘草裹蜡的假丹，顺手从慌乱逃窜的骗子摊上捡走真灵石',
        visible: (s) =>
          s.tags.includes('origin_herbalist') ||
          s.tags.includes('origin_orphan') ||
          s.tags.includes('origin_fallen_clan') ||
          s.tags.includes('merchant_manual'),
        insightTags: ['出身/商经专属识破', '灵石与声望'],
        effect: {
          spiritStones: 35,
          renown: 5,
        },
        outcome: [
          (s) =>
            s.tags.includes('origin_fallen_clan')
              ? '你一眼便认出盒底伪造的丹阁落款破绽百出，伸指在丹壳上一刮，冲鼻的生甘草与蜂蜡味立刻散了开来！围观路人顿时大哗，那假道人脸色大变，连藏在摊底的三十五块灵石都顾不上收，一溜烟钻进人群逃得无影无踪。'
              : '你伸指在丹壳上一刮，一股冲鼻的生甘草与蜂蜡味立刻散了开来！围观路人顿时大哗，那假道人脸色大变，连藏在摊底的三十五块灵石都顾不上收，一溜烟钻进人群逃得无影无踪。',
          '街坊们纷纷夸你好眼力，你淡笑着收好这笔意外之财，顺着石道折返青岚长街。',
        ],
        outcomeContinueLabel: '收好意外之财 · 折返青岚长街',
        next: '__RETURN__',
      },
      {
        id: 'r1_pill_walk_away',
        label: '淡笑婉拒，修仙界哪有平白掉馅饼的好事',
        insightTags: ['稳妥', '心境'],
        effect: { mind: 4 },
        outcome: [
          '你抽回衣袖连药盒都没看便径直走开。假道人在身后嘀咕了两句“不识货”，很快又去纠缠别的初入仙途的嫩雏了。你心中更添几分警醒，转道折返青岚长街。',
        ],
        outcomeContinueLabel: '淡然离开 · 折返青岚长街',
        next: '__RETURN__',
      },
      {
        id: 'r1_pill_buy_gamble',
        label: '抱着万一淘到遗珍的心思花三十灵石买下细查',
        requirement: { minSpiritStones: 30, lockReason: '需灵石 30' },
        insightTags: ['耗灵石', '以石博运'],
        effect: {
          spiritStones: -30,
          mind: 2,
        },
        outcome: [
          '走过两条街，你满怀期待地掰开丹丸，里头竟真是一团揉了朱砂的甘草面团！回头再找，牌坊下早已空无一人。这三十灵石买了个刻骨铭心的教训，让你折返青岚长街时双目雪亮了许多。',
        ],
        outcomeContinueLabel: '自认吃亏 · 折返青岚长街',
        next: '__RETURN__',
      },
    ],
  },

  rand_act1_injured_fox: {
    id: 'rand_act1_injured_fox',
    act: 'act1',
    isRandomEvent: true,
    title: '寒林白狐',
    subtitle: '青岚偶遇',
    location: '青岚城外 · 乱石坡',
    paragraphs: [
      '城外林间薄雾未散，你听见草丛中传来微弱呜咽。一只耳尖雪白的小灵狐后腿被猎兽夹伤得鲜血淋漓，眼瞳清亮如琥珀，正警惕地盯着你。',
      '它脖颈间松松系着一条褪色的红绳，似乎曾受过哪位散修点化。',
    ],
    choices: [
      {
        id: 'r1_fox_save',
        label: '掰开兽夹替它敷上草药，任其归山',
        insightTags: ['正道善因', '心境', '偶得灵草'],
        effect: {
          righteous: 8,
          mind: 5,
          spiritStones: 20,
        },
        outcome: [
          '你放轻动作掰开锈迹斑斑的铁夹，嚼碎路边止血草小心敷在它伤口上。小白狐通人性般舔了舔你的手背，转身窜入林间，不一会儿竟叼来一株带露的百年野山参放在你脚边，回眸一瞥便隐入深雾。',
          '你在城门口药铺将山参顺手折换了二十灵石，心情也随之舒朗几分，径直折返青岚长街。',
        ],
        outcomeContinueLabel: '携善缘入城 · 折返青岚长街',
        next: '__RETURN__',
      },
      {
        id: 'r1_fox_ignore',
        label: '山野自有弱肉强食之理，顺手记下猎修布夹手法后绕道而行',
        insightTags: ['出世冷眼', '修为与心境'],
        effect: { worldly: -5, might: 4, mind: 5 },
        outcome: [
          '你驻足片刻，没有插手山林因果，只蹲身看清那副精钢兽夹上暗刻的灵丝牵机手法，将这份防身见闻记入心底后踏回青石官道。身后呜咽渐远，你很快回到熙攘的青岚长街。',
        ],
        outcomeContinueLabel: '记法返道 · 折返青岚长街',
        next: '__RETURN__',
      },
    ],
  },

  rand_act1_rain_merchant: {
    id: 'rand_act1_rain_merchant',
    act: 'act1',
    isRandomEvent: true,
    title: '雨棚药商',
    subtitle: '青岚偶遇',
    location: '城南茶亭 · 骤雨',
    paragraphs: [
      '午后骤雨倾盆，一名浑身湿透的南来药商躲进同一座凉亭，叹气连连：“青州北边听说起了怪热，官道卡得紧，我这批清心草运不过去，眼看要受潮发霉，真是晦气透顶！”',
    ],
    choices: [
      {
        id: 'r1_rain_buy_cheap',
        label: '趁机以二十五灵石低价吃下他手头一捆清心草',
        requirement: { minSpiritStones: 25, lockReason: '需灵石 25' },
        insightTags: ['低价囤货', '青州疫讯'],
        effect: {
          spiritStones: -25,
          renown: 3,
          grantMarketGoods: [{ goodId: 'qingxin_herb', qty: 1, unitCost: 25 }],
          setFlags: {
            act1_rumor_plague: true,
            bought_rain_herb: true,
          },
        },
        outcome: [
          '药商见有人肯接手，千恩万谢地把油纸裹得严严实实的一捆上好清心草递给你。你摸了摸草叶干爽依旧。青州真要起疫，这二十五灵石转手就是一笔好赚头。',
          '雨势渐收，你背着这捆清心草大步折返青岚长街，盘算着稍后进南市看看行情。',
        ],
        outcomeContinueLabel: '携药入城 · 折返青岚长街',
        next: '__RETURN__',
      },
      {
        id: 'r1_rain_chat',
        label: '分他半壶热茶，只细细打听青州怪热的来龙去脉',
        insightTags: ['青州疫讯', '声望与心境'],
        effect: {
          mind: 4,
          renown: 3,
          setFlags: { act1_rumor_plague: true },
        },
        outcome: [
          '半壶热茶下肚，药商打开话匣子，绘声绘色地讲起青州北麓那桩专缠有灵根之人的邪门怪热。雨停之后两人抱拳作别，你带着这手新鲜风声折返青岚长街。',
        ],
        outcomeContinueLabel: '雨歇起身 · 折返青岚长街',
        next: '__RETURN__',
      },
    ],
  },

  rand_act1_old_grave: {
    id: 'rand_act1_old_grave',
    act: 'act1',
    isRandomEvent: true,
    title: '无名剑冢',
    subtitle: '青岚偶遇',
    location: '青岚西郊 · 荒丘',
    paragraphs: [
      '行过城西荒丘，杂草丛里斜插着半截锈成红褐色的残剑，剑旁青石刻着模糊的八字：“长明二千载，剑折人老。”',
      '你驻足凝望良久，只觉数百年光阴扑面而来。风吹荒草，那截断铁竟隐约残留着一缕斩不断的凛冽锋意。',
    ],
    choices: [
      {
        id: 'r1_grave_comprehend',
        label: '以袖拂净碑尘，静立半日体悟那一缕不屈剑意',
        insightTags: (s) => [
          '修为与心境',
          s.tags.includes('sword_intent_seed') ? '剑意精纯' : '得命格【剑意雏形】',
        ],
        effect: {
          might: 5,
          mind: 5,
          addTags: ['sword_intent_seed'],
        },
        outcome: [
          '你垂手静立荒丘半日，闭目感受风过残铁时那声清越剑鸣。胸口忽然一亮，千年前无名剑客未尽的半口气化作一缕锋锐剑意落入心田。对着孤冢一揖后，你折返青岚长街。',
        ],
        outcomeContinueLabel: '拜别孤冢 · 折返青岚长街',
        next: '__RETURN__',
      },
      {
        id: 'r1_grave_salvage',
        label: '默礼过后搜检荒碑石缝，带走前人遗落的旧剑穗与三十灵石',
        insightTags: ['务实得30灵石', '入世'],
        effect: {
          spiritStones: 30,
          worldly: 4,
          mind: 2,
        },
        outcome: [
          '剑客已化黄土，残铁难换米粮。你对着青石碑拱手告罪，从碑座石缝里摸出一只封蜡早已龟裂的旧布囊，里头竟还余下三十块品相尚可的灵石。收好布囊，你拍去袖尘折返青岚长街。',
        ],
        outcomeContinueLabel: '收囊返城 · 折返青岚长街',
        next: '__RETURN__',
      },
    ],
  },

  // ==================== 卷二随机事件（高沧桑感 + 强互动 + 跨线线索） ====================
  rand_act2_bandit_ambush: {
    id: 'rand_act2_bandit_ambush',
    act: 'act2',
    isRandomEvent: true,
    title: '荒道劫修',
    subtitle: '青岚游历 · 凶险',
    location: '青岚官道 · 黑风峡',
    paragraphs: [
      '暮色沉了。黑风峡口三道黑影自崖壁扑落，毒刃寒光映着为首刀疤散修的横肉：“灵气越发稀薄，丹药贵得似明抢，道友借点灵石用用！”',
    ],
    choices: [
      {
        id: 'r2_bandit_fight_sword',
        label: '催动胸中剑意先发制人，一剑荡开毒刃震退劫修',
        visible: (s) => s.tags.includes('sword_intent_seed') || s.might >= 32,
        insightTags: ['实力/剑意压制', '反获灵石与声望'],
        effect: {
          might: 6,
          renown: 6,
          spiritStones: 75,
        },
        outcome: [
          '寒芒乍起！你的剑锋比毒刃更快三分，一式荡剑震飞为首劫修的短刀，剑气余波在崖石上削出半尺深痕。三名劫修见踢到铁板，骇得丢下储物袋狼狈窜进黑林。',
          '你清点战利品竟得了七十五块灵石，抹净剑身血渍，从容穿过黑风峡归去。',
        ],
        outcomeContinueLabel: '收剑入鞘 · 归返问途云海',
        bridgeNote: '黑风峡一剑击退三名劫修并反获灵石，你的锋芒已非昔日可比。',
        next: '__RETURN__',
      },
      {
        id: 'r2_bandit_pay',
        label: '孤身在外不欲死拼，丢出五十灵石买路脱身',
        requirement: { minSpiritStones: 50, lockReason: '需灵石 50' },
        insightTags: ['破财免灾', '稳妥'],
        effect: {
          spiritStones: -50,
          mind: 3,
        },
        outcome: [
          '你面不改色地将五十灵石抛向半空，趁三名劫修伸手抢接的瞬间御风后撤数十丈。对方掂了掂灵石倒也识趣，并未追杀。留得青山在总比意气用事强。',
        ],
        outcomeContinueLabel: '全身而退 · 归返问途云海',
        bridgeNote: '黑风峡破财五十灵石避开死斗，你愈发觉得实力才是仙途硬道理。',
        next: '__RETURN__',
      },
      {
        id: 'r2_bandit_cangming',
        label: '借识海苍溟一缕古剑威压外放，吓破对方胆魄',
        visible: (s) =>
          s.companions.cang_ming.met &&
          s.companions.cang_ming.stance !== 'rival' &&
          s.companions.cang_ming.stance !== 'estranged' &&
          !s.flags.cangming_sealed,
        insightTags: ['苍溟威压', '零损反杀', '灵石与声望'],
        effect: {
          spiritStones: 80,
          might: 6,
          renown: 4,
        },
        outcome: [
          '你微垂眼眸，识海中苍溟嗤笑一声，放出一丝三千年前剑尊的残余威压！轰然间峡谷飞沙走石，三名劫修如遭雷击般双膝一软，惊呼“前辈饶命”，丢下八十块灵石连滚带爬逃得没了影。',
          '“一群见利忘义的鼠辈，倒也省了本座活动筋骨。”苍溟懒洋洋缩回断玉，你笑着拾起灵石继续上路。',
        ],
        outcomeContinueLabel: '借威退敌 · 归返问途云海',
        bridgeNote: '苍溟一缕剑威便惊散黑风峡群匪，让你白赚了八十灵石。',
        next: '__RETURN__',
      },
      {
        id: 'r2_bandit_hard_escape',
        label: '拼着受些轻伤硬撼破围，绝不低头交石',
        insightTags: ['以伤换勇', '修为微升'],
        effect: {
          timeMonths: 4,
          might: 5,
          mind: 4,
        },
        outcome: [
          '一番殊死搏杀，你肩头虽被毒刃划开一道深口，却也一拳震伤刀疤劫修胸口，杀出一条血路遁出峡谷。此后静养四月方愈，伤疤之下，你的临阵杀气与胆魄倒更凝实了。',
        ],
        outcomeContinueLabel: '养伤初愈 · 归返问途云海',
        bridgeNote: '黑风峡浴血脱身休养四月，伤愈之后气海反倒凝练了几分。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_old_acquaintance: {
    id: 'rand_act2_old_acquaintance',
    act: 'act2',
    isRandomEvent: true,
    title: '故人白头',
    subtitle: '青岚游历 · 岁月沧桑',
    location: '青州官道 · 老渡口',
    paragraphs: [
      (s) => {
        const bondText = s.tags.includes('origin_fallen_clan')
          ? '昔年常伴你跑马放纸鸢的家仆之子'
          : s.tags.includes('origin_orphan')
          ? '昔年在青岚水巷一块抢热饼的旧友'
          : s.tags.includes('origin_scout')
          ? '早年在北境营外替军马割草的同乡'
          : '年少时与你同龄、曾一起在村口爬树掏鸟的旧友';
        return `你在老渡口等船时，撑篙的船夫反复偷瞄了你好几眼，忽然颤巍巍地试探着喊出你的小名。你定睛细看，竟是${bondText}。`;
      },
      (s) => {
        const ageYears = getAgeYears(s.ageMonths);
        const spanText =
          ageYears >= 46
            ? '数十载光阴。'
            : ageYears >= 26
            ? '十余载光阴。'
            : '不过数载光阴。';
        const agedDesc =
          ageYears >= 26
            ? '他早已弯了脊梁、两鬓生霜'
            : '他终日顶风冒雨撑船谋生，已弯了脊梁、眼角爬满风霜';
        const faceText = s.tags.includes('origin_orphan')
          ? '当年水巷分别时的年轻模样'
          : '当年离乡时的年轻模样';
        return `${spanText}${agedDesc}，而你立在船头衣袂生风，面容竟还停在${faceText}，他局促搓着手连声改口唤你“仙师”。那只手终究没敢拍上你的肩。`;
      },
    ],
    choices: [
      {
        id: 'r2_old_gift',
        label: '像当年一样坐到船尾陪他喝半壶浊酒，临岸悄悄塞下三十灵石银钱',
        requirement: { minSpiritStones: 30, lockReason: '需灵石 30' },
        insightTags: ['耗 30 灵石', '红尘长情', '心境大进'],
        effect: {
          spiritStones: -30,
          mind: 10,
          worldly: 10,
          righteous: 6,
          logSummary: '于老渡口偶遇早衰的年少旧友，方知“仙凡殊途”四字之沉重。',
        },
        outcome: [
          (s) => {
            const placeText = s.tags.includes('origin_orphan')
              ? '水巷里'
              : s.tags.includes('origin_fallen_clan')
              ? '旧宅坊里'
              : s.tags.includes('origin_scout')
              ? '北境乡里'
              : '村里';
            return `你笑着拉他坐下，自己拔开酒塞先灌了一口。几盏浊酒下去，老友拘谨的眉眼渐渐舒展，絮絮说起${placeText}谁家娶了亲、谁家老爹走了。靠岸时你悄悄把三十灵石折成的银票压在船舱蓑衣下，站在芦苇荡边目送乌篷船摇远。`;
          },
          '江风吹过，芦苇伏了一片。你立在渡口，衣袂不染霜尘，看着那条乌篷船摇进暮色。',
        ],
        outcomeContinueLabel: '目送孤舟 · 归返问途云海',
        bridgeNote: '老渡口与早衰旧友共饮半壶浊酒，江风沧桑，让你道心沉淀良多。',
        next: '__RETURN__',
      },
      {
        id: 'r2_old_sigh',
        label: '轻叹一声放下船资离去，长生路上本就注定不断告别',
        insightTags: ['出世定力', '心境'],
        effect: {
          mind: 8,
          worldly: -8,
        },
        outcome: [
          '你温和地摇了摇头，未再勾起他太多尘缘旧绪，只在船头多留了几倍船资便踏岸离去。回头时，他正佝偻着腰向你的方向深深作揖。仙凡之间，终究隔了一道越走越宽的河。',
        ],
        outcomeContinueLabel: '踏岸远行 · 归返问途云海',
        bridgeNote: '老渡口匆匆一瞥故人白头，令你愈发看清求道一途的孤寂。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_sky_omen: {
    id: 'rand_act2_sky_omen',
    act: 'act2',
    isRandomEvent: true,
    title: '白日抽灵',
    subtitle: '青岚游历 · 天象异变',
    location: '青岚荒原',
    paragraphs: [
      '正午艳阳高照，整片青岚荒原忽然静得听不见风声。林间飞鸟齐齐坠地哀鸣，你体内灵气陡然停滞了整整十息。抬头望去，高空云层像被无形巨手撕开一道细长金灰裂隙，山川间肉眼难辨的清气如惊群游鱼，疯狂倒卷入天。',
      '半刻钟后异象平息。路过散修只当是寻常“灵潮枯汐”，唯你掌心已被冷汗浸湿。',
    ],
    choices: [
      {
        id: 'r2_omen_eye',
        label: '以天生异瞳死死凝视那道天裂缝隙，记下灵气倒流的星位',
        visible: (s) => s.tags.includes('spirit_eyes'),
        insightTags: (s) => [
          '天生异瞳专属',
          '心境大进',
          s.completedThreads.includes('thread_ancient_vein') ||
          isMajorArcMissed(s, 'act2', 'thread_ancient_vein')
            ? '印证北麓地脉异象'
            : '引出古脉线索',
        ],
        effect: (s) => ({
          mind: 12,
          setFlags: {
            ancient_vein_disturbed: true,
            r2_omen_vein_done: s.completedThreads.includes('thread_ancient_vein'),
            r2_omen_vein_missed: isMajorArcMissed(s, 'act2', 'thread_ancient_vein'),
          },
          activateThreads:
            s.completedThreads.includes('thread_ancient_vein') ||
            isMajorArcMissed(s, 'act2', 'thread_ancient_vein')
              ? []
              : ['thread_ancient_vein'],
        }),
        outcome: [
          '双目刺痛欲泪，你却借着天生异瞳看清了骇人的去向。漫天倒卷的灵息全顺着大地之下某处巨大支眼被强行抽升，未曾散入虚空半分，而那支眼的落点，赫然正是青州北麓深山！',
          (s) =>
            s.flags.r2_omen_vein_done
              ? '天裂闭合，你抹去眼角温热泪痕。方才所见再度印证了青州北麓地底那座逆抽大阵的恐怖，留给九州的时间比想象中更少。'
              : s.flags.r2_omen_vein_missed
              ? '天裂闭合，你抹去眼角温热泪痕。北麓枯脉虽已塌陷埋死、无从再入，方才那一瞥却让你彻底记住了高天倒抽灵息的骇人方位。'
              : '天裂闭合，你抹去眼角溢出的微热泪痕，心中已多了一条必须亲自去探的古脉暗线。',
        ],
        outcomeContinueLabel: '记下星位 · 归返问途云海',
        bridgeNote: '白日天裂抽灵的异象下，你的异瞳锁定了青州北麓地底古脉的方位。',
        next: '__RETURN__',
      },
      {
        id: 'r2_omen_steady',
        label: '稳住翻涌的气海，默默记下这一日天象异变',
        insightTags: ['心境', '修为'],
        effect: {
          mind: 7,
          might: 4,
          setFlags: { ancient_vein_disturbed: true },
        },
        outcome: [
          '你盘膝调息半柱香方才平复滞涩的经脉。旁人笑谈灵潮枯汐不过天命，你却愈发笃定，九霄之上那扇三千年未曾回音的天门，绝没有史书上写得那么慈悲。',
        ],
        outcomeContinueLabel: '平复气海 · 归返问途云海',
        bridgeNote: '荒原亲历“白日抽灵”异象后，你对灵潮渐退的疑虑愈发沉重。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_jade_gamble: {
    id: 'rand_act2_jade_gamble',
    act: 'act2',
    isRandomEvent: true,
    title: '暗市赌石',
    subtitle: '青岚游历 · 商机',
    location: '青岚暗市 · 碎玉摊',
    paragraphs: [
      '暗市角落围了一圈修士，一名矿奴出身的老汉正叫卖三块沾满灰泥的古脉原石，声称是从塌陷老矿深处挖出来的，每块一口价六十灵石，切开全凭眼力与运气。',
    ],
    choices: [
      {
        id: 'r2_jade_see_through',
        label: (s) => {
          const sources: string[] = [];
          if (s.tags.includes('spirit_eyes')) sources.push('天生异瞳');
          if (s.tags.includes('merchant_manual')) sources.push('货殖商经');
          if (
            s.companions.cang_ming.met &&
            s.companions.cang_ming.stance !== 'rival' &&
            s.companions.cang_ming.stance !== 'estranged' &&
            !s.flags.cangming_sealed
          ) {
            sources.push('苍溟眼力');
          }
          return `借${sources.join('与') || '敏锐眼力'}挑中最不起眼的那块灰石买下切开`;
        },
        visible: (s) =>
          s.tags.includes('spirit_eyes') ||
          s.tags.includes('merchant_manual') ||
          (s.companions.cang_ming.met &&
            s.companions.cang_ming.stance !== 'rival' &&
            s.companions.cang_ming.stance !== 'estranged' &&
            !s.flags.cangming_sealed),
        requirement: { minSpiritStones: 60, lockReason: '需灵石 60' },
        insightTags: ['必赚暴利', '高额灵石回报'],
        effect: {
          spiritStones: 130,
          renown: 6,
        },
        outcome: [
          '你指尖点中角落那块布满铁锈纹的灰皮原石，干脆付了六十灵石。石刀落下不过三寸，满棚顿时亮起澄澈碧光，石心竟裹着一拳大小的上品地心灵晶！',
          '旁观玉商当场高价收走，除去本钱净赚一百三十块灵石。满场惊叹声里，你拱手致意，从容隐入长街。',
        ],
        outcomeContinueLabel: '满载而归 · 归返问途云海',
        bridgeNote: '暗市赌石一刀切出地心灵晶净赚百余灵石，手头顿时宽裕不少。',
        next: '__RETURN__',
      },
      {
        id: 'r2_jade_try_luck',
        label: '花六十灵石凭直觉挑一块赌运气',
        requirement: { minSpiritStones: 60, lockReason: '需灵石 60' },
        insightTags: ['盈亏自负', '可能切垮'],
        effect: (s) => {
          const won = (s.totalActions + s.seasonIndex) % 2 === 0;
          return {
            spiritStones: won ? 35 : -30,
            mind: won ? 2 : 5,
            setFlags: { r2_jade_won: won },
          };
        },
        outcome: [
          (s) =>
            s.flags.r2_jade_won
              ? '石屑纷飞，好在运气不差，里头切出一块成色温润的中品灵玉，转手扣掉本钱倒也净赚三十五灵石。你见好就收，笑着离开了碎玉摊。'
              : '石刀一路剖到石心，里头只嵌着一指宽的杂色废玉，连本钱都只折回了一半，净亏三十灵石。你暗笑自己贪心，拍去衣尘离开摊位，反倒长了几分定力。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.r2_jade_won ? '见好就收 · 归返问途云海' : '引以为戒 · 归返问途云海',
        bridgeNote: (s) =>
          s.flags.r2_jade_won
            ? '暗市赌石小赚一笔，倒也算旅途中的一桩乐事。'
            : '暗市赌石切垮小亏一笔，更觉还是真本事靠得住。',
        next: '__RETURN__',
      },
      {
        id: 'r2_jade_pass',
        label: '十赌九输，微笑离开',
        insightTags: ['心境稳健'],
        effect: { mind: 4 },
        outcome: [
          '你负手看了两场旁人切垮叹气的热闹，更觉稳扎稳打方是正途，微笑着转身离去。',
        ],
        outcomeContinueLabel: '转身离去 · 归返问途云海',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_engagement_echo: {
    id: 'rand_act2_engagement_echo',
    act: 'act2',
    isRandomEvent: true,
    title: '旧帖重逢',
    subtitle: '昔年宿缘 · 沧海桑田',
    location: '青岚城 · 望月酒楼',
    paragraphs: [
      (s) => {
        const realmText =
          s.realm === 'qi_peak'
            ? '炼气圆满'
            : s.realm === 'qi_late'
            ? '炼气后期'
            : s.realm === 'qi_mid'
            ? '炼气中期'
            : '炼气初期';
        const sealText = s.flags.kept_clan_seal
          ? '他瞥见你腰间悬着那枚未曾变卖的祖传赤铜家印，神色更是窘迫了几分，'
          : '';
        const agePhrase =
          getAgeYears(s.ageMonths) <= 35 ? '年纪轻轻已踏入' : '如今已踏入';
        return `你在望月酒楼独饮，楼梯口忽然传来一阵局促的请安声。你抬眼望去，认出那人正是当年甩给你一纸退婚庚帖的小族家主。他打听到你近来常在此歇脚，特地寻上门来满脸谄笑，见你${agePhrase}${realmText}、在青岚声名鹊起，${sealText}竟想托词赔礼、重提旧好。`;
      },
      '那张泛黄的旧庚帖，其实还压在你行囊最底层。',
    ],
    choices: [
      {
        id: 'r2_eng_burn',
        label: '指尖弹出一缕灵火将旧庚帖烧成飞灰：“前尘已清，不必再提。”',
        insightTags: ['心境圆满', '声望大增', '潇洒了结宿缘'],
        effect: (s) => ({
          mind: 12,
          renown: s.flags.kept_clan_seal ? 16 : 10,
          removeTags: ['broken_engagement'],
          setFlags: { engagement_echo_done: true },
          logSummary: '于望月酒楼焚毁旧日退婚庚帖，前尘意气尽消，道心豁然开朗。',
        }),
        outcome: [
          '幽青灵火在指尖一闪而灭，泛黄庚帖化作细灰飘出雕花木窗。那家主面色青白交加，连半句辩解也吐不出，只得灰溜溜拱手退下楼去。',
          (s) =>
            s.flags.kept_clan_seal
              ? '你独饮完最后半盏清茶，顺手按了按腰间完好无损的赤铜家印，昔年郁结在胸口的那点意气也随之散尽。如今连报复的心思都懒得再起，你早已走得比他们仰望的高度还要远。'
              : '你独饮完最后半盏清茶，昔年郁结在胸口的那点意气也随之散尽。如今连报复的心思都懒得再起，你早已走得比他们仰望的高度还要远。',
        ],
        outcomeContinueLabel: '了却前尘 · 归返问途云海',
        bridgeNote: '望月酒楼一火焚尽旧日退婚庚帖，胸中意气尽消，道心格外通透。',
        next: '__RETURN__',
      },
      {
        id: 'r2_eng_demand_pay',
        label: '冷笑收下他们奉上的八十灵石赔罪礼，从此两不相欠',
        insightTags: ['务实得灵石', '了结宿缘'],
        effect: (s) => ({
          spiritStones: s.flags.kept_clan_seal ? 105 : 80,
          mind: 6,
          removeTags: ['broken_engagement'],
          setFlags: { engagement_echo_done: true },
          logSummary: '受领昔日退婚小族奉上的赔罪礼，一笑泯去旧日尘怨。',
        }),
        outcome: [
          (s) =>
            s.flags.kept_clan_seal
              ? '“旧好就不必提了，但这赔罪礼我倒可以收下。”你指节轻叩腰间赤铜家印，将旧庚帖轻飘飘掷回托盘。对方见旧族骨气未折，生怕惹恼你，又额外添了二十五灵石凑足一百零五块奉上，这才如蒙大赦般作揖退去。'
              : '“旧好就不必提了，但这赔罪礼我倒可以收下。”你将旧庚帖轻飘飘掷回托盘，顺手拿走了那袋沉甸甸的八十灵石。对方如蒙大赦般连连作揖退去，你也省下口舌，揣着这笔实实在在的破境灵石回了居所。',
        ],
        outcomeContinueLabel: '收礼了账 · 归返问途云海',
        bridgeNote: '昔日退婚小族奉上赔礼后两清，昔年旧事就此翻篇。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_fallen_alchemist: {
    id: 'rand_act2_fallen_alchemist',
    act: 'act2',
    isRandomEvent: true,
    title: '穷途丹师',
    subtitle: '青岚游历 · 奇遇',
    location: '青岚旧巷 · 破丹坊',
    paragraphs: [
      '丹炉熄了。门口须发焦黑的老丹师守着裂口铜炉发怔，见你经过苦笑开口：“灵药疯涨，血丹又断了正经丹铺活路，老夫开不起炉，小友若肯出七十灵石救急，这两瓶温脉灵膏连同半篇筑基凝液心得一并相送。”',
    ],
    choices: [
      {
        id: 'r2_alch_help',
        label: '掏出七十灵石助他渡过难关，收下灵膏与凝液心得',
        requirement: { minSpiritStones: 70, lockReason: '需灵石 70' },
        insightTags: ['耗灵石换实力与心境', '正道'],
        effect: {
          spiritStones: -70,
          might: 9,
          mind: 7,
          righteous: 6,
        },
        outcome: [
          '老丹师接过七十灵石时，枯瘦的双手微微发颤。他郑重取出温脉灵膏与一本写满朱批的旧笔记塞进你怀里，反复叮嘱了三处气海液化时最易走岔的关窍。这些浸着一辈子心血的经验，远非七十灵石可买。',
        ],
        outcomeContinueLabel: '珍藏凝液心得 · 归返问途云海',
        bridgeNote: '得落魄老丹师赠予的温脉灵膏与筑基心得，你对破境关口多了几分笃定。',
        next: '__RETURN__',
      },
      {
        id: 'r2_alch_pass',
        label: '拱手致意，婉拒离去',
        insightTags: ['保留灵石'],
        effect: { mind: 2 },
        outcome: [
          '你心知自己也正值攒灵石筑基的紧要关头，只得叹息一声拱手告别。回望巷口，那座熄了火的铜炉在夕阳里显得格外萧索。',
        ],
        outcomeContinueLabel: '轻叹离开 · 归返问途云海',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_mortal_funeral: {
    id: 'rand_act2_mortal_funeral',
    act: 'act2',
    isRandomEvent: true,
    title: '青州白幡',
    subtitle: '青岚游历 · 世局线索',
    location: '青州南郊 · 荒村道旁',
    paragraphs: [
      '白纸钱漫天飞舞，一队沉默的送葬农人抬着薄棺经过。路边村妇哽咽着说，棺里躺着的是村里唯一测出一点下品灵根的少年，本盼着今年能送去仙门出人头地，却一夜染上青州怪疫枯瘦而亡，反倒家里全无灵根的弟妹个个活蹦乱跳。',
    ],
    choices: [
      {
        id: 'r2_funeral_investigate',
        label: '记下这违背常理的怪事，动念前往青州杏林一探究竟',
        insightTags: ['心境', '开启青州怪疫之局'],
        effect: (s) => ({
          mind: 6,
          righteous: 5,
          setFlags: { arc_plague_active: true },
          activateThreads:
            s.completedThreads.includes('thread_qingzhou_plague') ||
            isMajorArcMissed(s, 'act2', 'thread_qingzhou_plague')
              ? []
              : ['thread_qingzhou_plague'],
        }),
        outcome: [
          '你在道旁驻足目送那具薄棺远去。专杀微灵根、独放无灵者，这哪里像寻常天灾？寒意顺着脊背爬起，你暗暗决定，若有余暇务必往青州杏林查明真相。',
        ],
        outcomeContinueLabel: '记下异象 · 归返问途云海',
        bridgeNote: '荒村白幡下听闻的青州怪疫异象挥之不去，也许该去杏林看看究竟。',
        next: '__RETURN__',
      },
      {
        id: 'r2_funeral_donate',
        label: '赠农人二十灵石帮补丧葬，顺道详询发病前后细情',
        requirement: { minSpiritStones: 20, lockReason: '需灵石 20' },
        insightTags: ['耗20灵石', '心境与正道声望', '开启青州怪疫之局'],
        effect: (s) => ({
          spiritStones: -20,
          mind: 8,
          righteous: 10,
          renown: 5,
          worldly: 6,
          setFlags: { arc_plague_active: true },
          activateThreads:
            s.completedThreads.includes('thread_qingzhou_plague') ||
            isMajorArcMissed(s, 'act2', 'thread_qingzhou_plague')
              ? []
              : ['thread_qingzhou_plague'],
        }),
        outcome: [
          '老农捧着那袋够全村过冬的灵石哭跪在地，断断续续告诉你：病发那夜北麓云层发红，村里凡测过灵根的孩子同时起了高热。你扶起老农，记下这桩怪异线索后折返青岚。',
        ],
        outcomeContinueLabel: '辞别荒村 · 归返问途云海',
        bridgeNote: '荒村助葬听得怪疫发端细节，你对青州杏林之行愈发挂心。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_heart_whisper: {
    id: 'rand_act2_heart_whisper',
    act: 'act2',
    isRandomEvent: true,
    title: '静夜微尘',
    subtitle: '青岚游历 · 道心微澜',
    location: '深夜静室',
    paragraphs: [
      '子夜吐纳时，你忽然听见识海深处响起一阵极其温柔、却毫无情绪的呢喃，像在劝你不必苦修，只要吞下捷径丹药、尽快修至巅峰推开天门，便能永享极乐。',
      {
        when: (s) => s.tags.includes('old_daoist_talisman'),
        text: '刹那间，怀中当年雨夜荒庙疯道人赠你的暗红旧符骤然一亮，将那缕冰冷呢喃震得粉碎！你背后惊出一身冷汗，陡然想起疯道人那句狂笑：“天门开了也莫要上去！”',
      },
    ],
    choices: [
      {
        id: 'r2_whisper_talisman',
        label: '借荒庙旧符余韵斩断惑音，细细体悟方才那股熟悉的上界气息',
        visible: (s) => s.tags.includes('old_daoist_talisman'),
        insightTags: ['荒庙旧符应劫', '心境大进'],
        effect: {
          mind: 12,
          might: 5,
          removeTags: ['old_daoist_talisman'],
          setFlags: { old_talisman_echo_done: true },
          logSummary: '子夜静室遇诡异惑音，昔年荒庙旧符燃尽护心，令灵台愈发空明。',
        },
        outcome: [
          '暗红旧符在震碎惑音后彻底化作一缕青烟散去，完成了当年雨夜疯道人留给你的最后一次护道。你长舒一口气，灵台竟因这场交锋而愈发空明坚固，再不惧寻常魔音扰心。',
        ],
        outcomeContinueLabel: '敛息静坐 · 归返问途云海',
        bridgeNote: '昔年荒庙旧符护你斩断深夜诡异惑音，你对上界威压已有了几分抵抗之力。',
        next: '__RETURN__',
      },
      {
        id: 'r2_whisper_resist',
        label: '咬破舌尖守住灵台清明，将那诡异低语强行驱散',
        insightTags: ['心境磨砺'],
        effect: {
          mind: 8,
        },
        outcome: [
          '舌尖血腥味瞬间拉回神智，你怒喝一声将那股无孔不入的温柔低语逐出识海！满身冷汗浸透中衣，你也借此提前见识了筑基心魔的冰山一角。',
        ],
        outcomeContinueLabel: '收摄心神 · 归返问途云海',
        bridgeNote: '深夜吐纳驱散识海诡异低语，道心经此一炼愈发沉稳。',
        next: '__RETURN__',
      },
    ],
  },

  rand_act2_black_auction_tip: {
    id: 'rand_act2_black_auction_tip',
    act: 'act2',
    isRandomEvent: true,
    title: '酒楼密语',
    subtitle: '青岚游历 · 商机风声',
    location: '青岚城 · 醉仙楼',
    paragraphs: [
      '隔座两名商会管事酒过三巡，压低声音议论，说大坊市近期因各路风波震荡，正统丹药与古碑拓片的价差越来越大，懂得在风波爆发前后倒手的客卿，短短两载便攒出了一枚上品筑基丹的本钱。',
    ],
    choices: [
      {
        id: 'r2_tip_note',
        label: '替隔壁结了半壶酒钱，换来坊市货单并顺手赚一笔短差',
        insightTags: ['坊市行情提示', '声望与30灵石'],
        effect: {
          renown: 5,
          spiritStones: 30,
          setFlags: { tavern_market_tip: true },
        },
        outcome: [
          '两名管事见你谈吐得体，醉醺醺地塞来一份坊市紧俏货单，还顺口介绍了一笔转手即赚三十灵石的短差。你拱手谢过，心里已盘算起聚宝阁的行情。',
        ],
        outcomeContinueLabel: '收好货单 · 归返问途云海',
        bridgeNote: '醉仙楼里摸清了青岚大坊行情脉络，手头又添一笔活钱。',
        next: '__RETURN__',
      },
      {
        id: 'r2_tip_buy_talisman',
        label: '趁两人酒酣，出四十灵石顺手吃下他们急抛的一张【破障符】',
        requirement: { minSpiritStones: 40, lockReason: '需灵石 40' },
        insightTags: ['四十灵石趁贱购入破障符', '待涨出货'],
        effect: {
          spiritStones: -40,
          renown: 3,
          grantMarketGoods: [{ goodId: 'po_zhang_talisman', qty: 1, unitCost: 40 }],
          setFlags: { tavern_market_tip: true },
        },
        outcome: [
          '管事正愁手头一张余货懒得回库入账，见你痛快掏出四十灵石便当场画押脱手。这张二阶破障符待大坊动荡时转卖，至少能翻出一截差价。',
        ],
        outcomeContinueLabel: '收符离楼 · 归返问途云海',
        bridgeNote: '醉仙楼里以低价吃进一张【破障符】，静待大坊涨价出货。',
        next: '__RETURN__',
      },
    ],
  },
};

export const RANDOM_EVENTS: RandomEventDefinition[] = [
  { sceneId: 'rand_act1_teahouse_rumor', act: 'act1', weight: 10, once: true },
  { sceneId: 'rand_act1_fake_pill', act: 'act1', weight: 10, once: true },
  { sceneId: 'rand_act1_injured_fox', act: 'act1', weight: 9, once: true },
  { sceneId: 'rand_act1_rain_merchant', act: 'act1', weight: 11, once: true },
  { sceneId: 'rand_act1_old_grave', act: 'act1', weight: 8, once: true },
  { sceneId: 'rand_act2_bandit_ambush', act: 'act2', weight: 10, once: true },
  {
    sceneId: 'rand_act2_old_acquaintance',
    act: 'act2',
    weight: 12,
    once: true,
    when: (s) => getAgeYears(s.ageMonths) >= 24,
  },
  { sceneId: 'rand_act2_sky_omen', act: 'act2', weight: 12, once: true },
  { sceneId: 'rand_act2_jade_gamble', act: 'act2', weight: 10, once: true },
  { sceneId: 'rand_act2_fallen_alchemist', act: 'act2', weight: 10, once: true },
  {
    sceneId: 'rand_act2_mortal_funeral',
    act: 'act2',
    weight: 11,
    once: true,
    when: (s) =>
      !s.completedThreads.includes('thread_qingzhou_plague') &&
      !s.truthClues.includes('clue_mortal_blindspot') &&
      !isMajorArcMissed(s, 'act2', 'thread_qingzhou_plague'),
  },
  { sceneId: 'rand_act2_black_auction_tip', act: 'act2', weight: 10, once: true },
];
