import { GameState, SceneDefinition } from '../engine/types';
import { toChineseYearNumber, yearsSinceAgeMonths } from '../engine/time';
import { isSuZhiweiAlive } from './companions';
import {
  canCommitMajorArc,
  getRemainingMajorArcSlots,
  isMajorArcMissed,
} from '../engine/systems';

function qiRealmLabel(realm: GameState['realm']): string {
  if (realm === 'qi_mid') return '炼气中期';
  if (realm === 'qi_late') return '炼气后期';
  if (realm === 'qi_peak') return '炼气圆满';
  return '炼气初期';
}

function returnHubFor(state: GameState): string {
  if (state.act === 'act1') return 'act1_qinglan_arrival';
  if (state.act === 'act2') return 'act2_hub';
  if (state.act === 'act3') return 'act3_hub';
  if (state.act === 'act4') return 'act4_hub';
  if (state.act === 'act5') return 'act5_hub';
  return 'act6_sky_gate';
}

function nextAct2Realm(state: GameState) {
  if (state.realm === 'qi_early') return 'qi_mid' as const;
  if (state.realm === 'qi_mid') return 'qi_late' as const;
  if (state.realm === 'qi_late') return 'qi_peak' as const;
  return state.realm;
}

export const AGENCY_SCENES: Record<string, SceneDefinition> = {
  // ==================== 自主修炼（炼气前 / 炼气期） ====================
  act1_action_cultivate: {
    id: 'act1_action_cultivate',
    act: 'act1',
    title: '静室打磨',
    subtitle: '自主谋划 · 潜修',
    location: '青岚城西 · 租来的石室',
    paragraphs: [
      '城外风声再乱，终究要靠自身底蕴压阵。你合上木栓，在蒲团上盘膝坐定，打算用这一季光阴先把气脉理顺。',
      '凡胎开窍前，你可以省下灵石水磨硬熬，也可以花灵石焚香催窍；若身具剑意或沙场底子，亦可往城西荒坡以剑砺气。',
    ],
    choices: [
      {
        id: 'a1_cult_steady',
        label: '闭门水磨吐纳四个月，省下灵石打牢根基',
        subtext: '零花费，稳步提升修为与心境。',
        insightTags: ['零花费', '耗时四月', '修为与心境'],
        effect: {
          timeMonths: 4,
          might: 5,
          mind: 5,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '四个月里你足不出户，晨起听雨，夜半行气。稀薄的灵息一点点渗进经脉，呼吸渐长，原本躁动的心气也沉了下来。',
          '推开石门时院角已换了季候，你的体魄与神思都比先前沉稳不少。',
        ],
        outcomeContinueLabel: '收功出室，重回青岚街市',
        bridgeNote: '静室苦修四月归来，气脉通畅，距离引气入体又近了一步。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_cult_stones',
        label: '花三十五灵石买两炉聚气香，借药气催动灵窍',
        requirement: { minSpiritStones: 35, lockReason: '需灵石 35' },
        insightTags: ['以灵石换速度', '修为大进'],
        effect: {
          timeMonths: 2,
          spiritStones: -35,
          might: 9,
          mind: 2,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '青烟袅袅绕满石室，聚气香里裹着的灵息顺着口鼻直沉丹田。短短两月工夫，便抵得上寻常穷散修大半年苦坐。',
          '香炉见底时，你指尖已隐隐能感应到窗外微弱的风灵流向。',
        ],
        outcomeContinueLabel: '熄炉起身，返回青岚',
        bridgeNote: '焚香速修两月，修为大进，手头灵石也轻了一截。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_cult_sword',
        label: '趁清晨往城西荒坡练剑，把胸中剑意磨利三分',
        visible: (s) =>
          s.tags.includes('sword_intent_seed') || s.tags.includes('origin_scout'),
        insightTags: ['剑意/斥候专属', '修为与锋芒'],
        effect: {
          timeMonths: 3,
          might: 8,
          renown: 2,
          beatDelta: 1,
          trackActionKey: 'cultivate',
        },
        outcome: [
          '每日五更你都在荒坡对着枯松出剑千次。三个月下来，掌心磨出硬茧，收剑时风声却比先前干净利落得多。',
          '几名路过的巡山弟子远远驻足看了半晌，眼神里多了几分审视。',
        ],
        outcomeContinueLabel: '擦剑归城',
        bridgeNote: '荒坡练剑三月，出招愈发沉稳凌厉。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_cult_back',
        label: '暂不闭关，起身另作打算',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  act2_action_cultivate: {
    id: 'act2_action_cultivate',
    act: 'act2',
    title: '洞府潜修',
    subtitle: '自主谋划 · 打磨炼气气海',
    location: '静室蒲团',
    paragraphs: [
      '筑基之前，炼气期的每一重小阶都决定着破关时的底气。你点起一盏青油灯，盘算这半年该如何打磨气海。',
    ],
    choices: [
      {
        id: 'a2_cult_meditate',
        label: (s) =>
          s.realm === 'qi_peak'
            ? '闭门苦修半载，水磨工夫夯实炼气圆满气海'
            : '闭门苦修半载，水磨工夫稳步推升小境界',
        insightTags: (s) => [
          '零花费',
          '耗时半载',
          s.realm === 'qi_peak' ? '夯实炼气圆满' : '推升炼气小阶',
        ],
        effect: (s) => {
          const nextR = nextAct2Realm(s);
          const advanced = nextR !== s.realm;
          return {
            timeMonths: 6,
            might: 7,
            mind: 6,
            beatDelta: 1,
            trackActionKey: 'cultivate',
            setRealm: nextR,
            setFlags: { a2_cult_advanced_realm: advanced },
            logSummary: advanced
              ? `闭门潜修半载打磨气海，水到渠成踏入【${qiRealmLabel(nextR)}】。`
              : undefined,
          };
        },
        outcome: [
          (s) =>
            s.flags.a2_cult_advanced_realm
              ? '半年静坐如弹指而过。丹田内的气旋一圈圈收紧，灵力运转再无滞涩，境界水到渠成迈进一阶。'
              : '半年静坐如弹指而过。丹田内圆满气旋越炼越沉，经脉间灵息已蓄到极致，只待叩响筑基大关。',
          '出关推门，屋外世局已又往前滑了半载，是时候看看各处风声了。',
        ],
        outcomeContinueLabel: '出关归位',
        bridgeNote: '闭门潜修半载出关，炼气气海较半年前厚实了一圈。',
        next: 'act2_hub',
      },
      {
        id: 'a2_cult_burn_stones',
        label: '掷八十灵石租用青岚灵眼洞府，速成精进修为',
        requirement: { minSpiritStones: 80, lockReason: '需灵石 80' },
        insightTags: (s) => [
          '消耗灵石',
          '修为暴涨',
          s.realm === 'qi_peak' ? '气海圆满打磨' : '推升小阶',
        ],
        effect: (s) => {
          const nextR = nextAct2Realm(s);
          return {
            timeMonths: 3,
            spiritStones: -80,
            might: 12,
            mind: 4,
            beatDelta: 1,
            trackActionKey: 'cultivate',
            setRealm: nextR,
            logSummary:
              nextR !== s.realm
                ? `重金租用青岚灵眼速修一季，气海精进踏入【${qiRealmLabel(nextR)}】。`
                : undefined,
          };
        },
        outcome: [
          '灵眼洞府里的灵气比城外浓稠三倍。短短一季，你便吸干了石室里所有游离清气，气海涨得发沉，距离筑基关口又逼近了一步。',
        ],
        outcomeContinueLabel: '退还洞府令牌，回到局中',
        bridgeNote: '重金租灵眼速修一季，气海充盈鼓荡。',
        next: 'act2_hub',
      },
      {
        id: 'a2_cult_array',
        label: '开启【残缺聚灵阵盘】静修四月，耗十五灵石稳固气海',
        visible: (s) => s.relics.includes('broken_gathering_array'),
        requirement: { minSpiritStones: 15, lockReason: '需灵石 15 驱动阵盘' },
        insightTags: ['奇物专属', '耗15灵石', '高收益'],
        effect: (s) => {
          const nextR = nextAct2Realm(s);
          return {
            timeMonths: 4,
            spiritStones: -15,
            might: 11,
            mind: 7,
            beatDelta: 1,
            trackActionKey: 'cultivate',
            setRealm: nextR,
            logSummary:
              nextR !== s.realm
                ? `以【残缺聚灵阵盘】静修四月，气海浑厚踏入【${qiRealmLabel(nextR)}】。`
                : undefined,
          };
        },
        outcome: [
          '阵盘嵌上十五块灵石便缓缓旋转起来，清气顺着裂纹溢入石室。四个月间气海如深潭蓄水，修为与心境双双精进。',
        ],
        outcomeContinueLabel: '收起阵盘，起身视事',
        bridgeNote: '借残缺聚灵阵盘静修四月，省下大笔灵石且气海大进。',
        next: 'act2_hub',
      },
      {
        id: 'a2_cult_back',
        label: '暂不闭关，先去处理别的事',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 自主营生与坊市悬赏（主动赚灵石） ====================
  act1_action_commission: {
    id: 'act1_action_commission',
    act: 'act1',
    title: '青岚悬赏榜',
    subtitle: '自主谋划 · 坊市营生',
    location: '青岚城 · 散修互市木牌前',
    paragraphs: [
      '老槐树下悬着油黑木牌。牌面贴满丹铺商行放出的零活，凡胎未入炼气接不得斩妖大单，可挣第一桶灵石的门路全钉在这块木板上。挑哪一桩？',
    ],
    choices: [
      {
        id: 'a1_job_herb',
        label: '接下城南回春堂的采药单，进北山采一篓青霜叶',
        subtext: '风餐露宿两月，稳赚一笔灵石，采药出身收益更高。',
        insightTags: ['稳赚灵石', '耗时两月'],
        effect: (s) => {
          const bonus = s.tags.includes('origin_herbalist') ? 25 : 0;
          return {
            timeMonths: 2,
            spiritStones: 45 + bonus,
            might: 2,
            beatDelta: 1,
            trackActionKey: 'commission',
          };
        },
        outcome: [
          (s) =>
            s.tags.includes('origin_herbalist')
              ? '山里的背阴崖你闭着眼都能摸着。回春堂掌柜验过你背回来的青霜叶，成色齐整得挑不出毛病，痛快加赏，一共点给你七十块灵石。'
              : '你在北山绝壁间摸爬滚打近两月，磨破了两双草鞋，总算凑齐一整篓品相过关的青霜叶，从回春堂掌柜手里换来四十五块灵石。',
          '攥着沉甸甸的酬石走出药铺，腰杆硬气了不少。',
        ],
        outcomeContinueLabel: '揣好灵石，回到青岚街市',
        bridgeNote: '替回春堂采药交差，赚得一笔实惠灵石。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_job_escort',
        label: '替灵材商队充当随行护卫，押一趟货去临近镇集',
        subtext: '路上偶有山匪窥伺，拼胆气换厚酬与声望。',
        insightTags: ['灵石与声望', '修为微涨'],
        effect: (s) => {
          const strong = s.might >= 15 || s.tags.includes('origin_scout');
          return {
            timeMonths: 3,
            spiritStones: strong ? 75 : 50,
            might: 4,
            renown: 4,
            beatDelta: 1,
            trackActionKey: 'commission',
            setFlags: { a1_escort_bonus: strong },
          };
        },
        outcome: [
          (s) =>
            s.flags.a1_escort_bonus
              ? '途经荒岭时果真撞上几名持械山匪，你抢先一步卡住路口逼退贼首，保住了整车灵木。商队东家佩服你的胆识，落地便结了七十五块灵石。'
              : '一路风尘仆仆走了三个月，夜里轮流守夜不敢合眼。好在商队平安抵镇，东家照契约付了五十块灵石，还夸你做事稳妥。',
        ],
        outcomeContinueLabel: '辞别商队，返回青岚',
        bridgeNote: '押货平安归来，囊中多了几十块灵石，也攒下些许商队人情。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_job_dark_runner',
        label: '接一桩暗巷无主跑腿活，替匿名雇主送一只封蜡木匣',
        subtext: '报酬丰厚，但可能沾上暗市浑水。',
        insightTags: ['高额灵石', '暗市风声', '微偏入世'],
        effect: {
          timeMonths: 2,
          spiritStones: 80,
          righteous: -5,
          worldly: 5,
          beatDelta: 1,
          trackActionKey: 'commission',
          setFlags: { act1_heard_blood_pill: true },
        },
        outcome: [
          '三更天，雨停。你避开巡城耳目将飘着甜腥气的蜡匣塞进破井石缝，次日天未亮，门缝下便滑进装着八十灵石的灰布袋。银货两讫。',
          '匣里装的多半脱不开近来疯传的暗市血丹。灵石到手了，心里的警惕也提了起来。',
        ],
        outcomeContinueLabel: '收起灰布袋，返回青岚',
        bridgeNote: '暗巷跑腿赚进八十灵石，匣中甜腥气让你对暗市生出几分防备。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_job_back',
        label: '今日牌上无合心意的活计，转身离开',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  act2_action_commission: {
    id: 'act2_action_commission',
    act: 'act2',
    title: '炼气悬赏',
    subtitle: '自主谋划 · 高阶营生',
    location: '青岚城 · 仙盟执事堂与暗市牙行',
    paragraphs: [
      '成了炼气修士，门路顿时宽了一大截。执事堂墙上挂着仙盟派发的清剿与护运单子，街尾暗市牙行里也有人高价请人鉴宝押货。',
    ],
    choices: [
      {
        id: 'a2_job_beast',
        label: '揭下清剿黑松岭妖狼的悬赏，凭实力换赏金与妖丹',
        requirement: { minMight: 38, lockReason: '需修为实力 38' },
        insightTags: ['实力换厚石', '声望与修为'],
        effect: {
          timeMonths: 4,
          spiritStones: 115,
          might: 5,
          renown: 6,
          beatDelta: 1,
          trackActionKey: 'commission',
        },
        outcome: [
          (s) =>
            s.tags.includes('qingyun_outer') && !s.flags.qingyun_elders_hostile
              ? '黑松岭雾深林密，你布下暗桩连追三夜，终将那头祸害药农的铁背妖狼斩于涧底。执事堂验过狼首与妖丹，当场拨付一百一十五块灵石，并在外门簿上记了你一笔功劳。'
              : '黑松岭雾深林密，你布下暗桩连追三夜，终将那头祸害药农的铁背妖狼斩于涧底。执事堂验过狼首与妖丹，当场按青岚悬赏榜结清一百一十五块灵石赏银。',
        ],
        outcomeContinueLabel: '领赏归返',
        bridgeNote: '斩杀黑松岭妖狼换来百余灵石，青岚散修间已常有人提你的名号。',
        next: 'act2_hub',
      },
      {
        id: 'a2_job_appraise',
        label: '受暗市牙行聘请，替大户掌眼鉴定一批古脉出土奇物',
        requirement: { minMind: 42, lockReason: '需心境定力 42' },
        insightTags: ['眼力换厚石', '坊市行情动向'],
        effect: (s) => ({
          timeMonths: 3,
          spiritStones: s.tags.includes('merchant_manual') ? 135 : 95,
          mind: 4,
          renown: 5,
          beatDelta: 1,
          trackActionKey: 'commission',
          setFlags: { qinglan_market_report: true },
        }),
        outcome: [
          '烛火微摇。你逐一摩挲十几件沾泥铜器与残简，干脆利落剔出三件做旧赝品替雇主保住数百灵石本钱，对方大喜付过重酬，席间还漏出大坊调价的口风。好眼力，便是立身之本。',
        ],
        outcomeContinueLabel: '收好润笔归返',
        bridgeNote: '替牙行掌眼识破赝品，不仅赚得丰厚灵石，也摸清了近期坊市风向。',
        next: 'act2_hub',
      },
      {
        id: 'a2_job_escort_medicine',
        label: (s) =>
          s.completedThreads.includes('thread_qingzhou_plague')
            ? '护送一批善后温补药草南下青州边界，顺道赚取运费与善名'
            : '护送一批解疫药草南下青州边界，顺道赚取运费与善名',
        insightTags: ['稳健灵石', '正道声望', '青州消息'],
        effect: (s) => {
          const plagueDone = s.completedThreads.includes('thread_qingzhou_plague');
          const setFlags: Record<string, boolean> = plagueDone
            ? { a2_escort_after_plague: true }
            : { arc_plague_active: true, a2_escort_after_plague: false };
          return {
            timeMonths: 4,
            spiritStones: 90,
            righteous: 8,
            renown: 5,
            beatDelta: 1,
            trackActionKey: 'commission',
            setFlags,
          };
        },
        outcome: [
          (s) =>
            s.flags.a2_escort_after_plague
              ? '药车碾过青州新修的官道，沿途村镇渐复烟火。交付善后温补药草领完九十灵石运费后，看着昔日疫棚拆去的空地，你心头略松了半分。'
              : '药车碾过青州干裂的官道，沿途难民见了药旗纷纷让路。交付药草领完九十灵石运费后，你亲眼看见城外疫棚比上季又多搭了两排，心头沉甸甸的。',
        ],
        outcomeContinueLabel: '交割完毕，归返枢纽',
        bridgeNote: (s) =>
          s.flags.a2_escort_after_plague
            ? '护送善后温补药草抵青州边界换得九十灵石，沿途村镇已渐复安宁。'
            : '护送药草抵青州边界换得九十灵石，沿途所见疫棚景象令人揪心。',
        next: 'act2_hub',
      },
      {
        id: 'a2_job_back',
        label: '暂不接单，另行筹谋',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 主动打探情报（花钱撬动风声与隐藏暗线） ====================
  act1_action_intel: {
    id: 'act1_action_intel',
    act: 'act1',
    title: '茶楼听风',
    subtitle: '自主谋划 · 打探消息',
    location: '青岚城 · 听雨茶楼雅座',
    paragraphs: [
      '青岚城最不缺的便是消息贩子。只要舍得请两壶好茶、塞十几块灵石，无论是坊市涨跌与宗门招考，还是青州的最新疫讯，都能提前钻进你的耳朵。',
    ],
    choices: [
      {
        id: 'a1_intel_market',
        label: '花二十灵石请药行老伙计吃酒，摸清近季坊市涨跌门道',
        visible: (s) => !s.flags.a1_intel_market_bought,
        requirement: { minSpiritStones: 20, lockReason: '需灵石 20' },
        insightTags: ['消耗灵石', '探得行情风声', '心境'],
        effect: {
          timeMonths: 1,
          spiritStones: -20,
          mind: 4,
          renown: 3,
          trackActionKey: 'intel',
          setFlags: {
            act1_rumor_plague: true,
            act1_heard_blood_pill: true,
            a1_intel_market_bought: true,
          },
        },
        outcome: [
          '三杯酒下肚，老伙计凑近压声：“清心草必涨！青州怪热压不住，暗市那批廉价血丹眼下把正丹行情死死压着，等仙盟动真格一查，真丹立时翻倍。”话点即止。',
          '这几句话值回十倍酒钱。你记在心里，起身离开茶楼。',
        ],
        outcomeContinueLabel: '记下风声，返回青岚',
        bridgeNote: '听雨茶楼里买通药行伙计，摸清了青州怪热与血丹对坊市的影响。',
        next: 'act1_qinglan_arrival',
      },
      {
        id: 'a1_intel_wander',
        label: '不花冤枉钱，自己去长街与城郊转转撞碰机缘',
        insightTags: ['偶遇长街奇缘', '耗时两月'],
        effect: {
          timeMonths: 2,
          beatDelta: 1,
          trackActionKey: 'intel',
          setReturnSceneId: 'act1_qinglan_arrival',
        },
        next: '__RANDOM_ACT1__',
      },
      {
        id: 'a1_intel_back',
        label: '喝完清茶起身离开',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  act2_action_intel: {
    id: 'act2_action_intel',
    act: 'act2',
    title: '暗桩买讯',
    subtitle: '自主谋划 · 撬动暗流',
    location: '青岚暗巷 · 听风酒肆',
    paragraphs: [
      '青岚暗流交错，等风上门必慢半拍。听风酒肆掌柜只认灵石不认人，只要筹码砸得够响，连宗门禁地与地脉异动都能指条明路。一分灵石，一分活路。',
      (s) =>
        getRemainingMajorArcSlots(s, 'act2') === 0
          ? '掌柜拨着算盘提醒你：“你筑基前已将心力押在两件大风波上，天时不等人，其余城外大势纵买了风声也分身乏术了。眼下倒还能买一份坊市行价密报。”'
          : `掌柜压低嗓音：“筑基前光阴紧促，你眼下至多还能兼顾${getRemainingMajorArcSlots(s, 'act2') === 1 ? '一' : '两'}桩城外大风波，想撬哪股暗流可得挑准了。”`,
    ],
    choices: [
      {
        id: 'a2_intel_unlock_sword',
        label: (s) =>
          s.relics.includes('qingyun_sword_tally')
            ? '亮出【青云外门剑令】半价花二十五灵石打听外门失踪内幕，切入试剑暗线'
            : '花五十灵石打听青云宗外门弟子失踪内幕，主动切入试剑暗线',
        visible: (s) =>
          !s.activeThreads.includes('thread_sword_trial') &&
          !s.completedThreads.includes('thread_sword_trial') &&
          canCommitMajorArc(s, 'act2', 'thread_sword_trial'),
        requirement: {
          custom: (s) => {
            const cost = s.relics.includes('qingyun_sword_tally') ? 25 : 50;
            return s.spiritStones >= cost
              ? { ok: true }
              : { ok: false, reason: `需灵石 ${cost}` };
          },
        },
        insightTags: ['开启【青云试剑案】', '沈清霜线索'],
        effect: (s) => {
          const hasTally = s.relics.includes('qingyun_sword_tally');
          return {
            timeMonths: 2,
            spiritStones: hasTally ? -25 : -50,
            trackActionKey: 'intel',
            setFlags: {
              arc_sword_trial_active: true,
              a2_intel_used_tally: hasTally,
            },
            activateThreads: ['thread_sword_trial'],
          };
        },
        outcome: [
          (s) =>
            s.flags.a2_intel_used_tally
              ? '掌柜瞥见你袖口那枚【青云外门剑令】，立马减了半价，压低嗓音递来半截焦黄名册抄件：“既都是山门里出来的，二十五灵石交个朋友。外门前三的弟子全没了踪影，内门沈清霜正在松林暗查，直接去试剑台后山蹲她便是。”'
              : '掌柜递来半截焦黄名册抄件：“青云外门前三的弟子全没了踪影，内门那位沈清霜正在松林暗查。你要插手，直接去试剑台后山蹲她便是。”',
        ],
        outcomeContinueLabel: '收好抄件，归返统筹',
        bridgeNote: '买来青云失踪案抄件，【青云试剑案】暗线已向你敞开。',
        next: 'act2_hub',
      },
      {
        id: 'a2_intel_unlock_blood',
        label: '花五十灵石买通暗市眼线，摸清血丹工坊与百宝斋的对峙内情',
        visible: (s) =>
          !s.activeThreads.includes('thread_blood_pill') &&
          !s.completedThreads.includes('thread_blood_pill') &&
          canCommitMajorArc(s, 'act2', 'thread_blood_pill'),
        requirement: { minSpiritStones: 50, lockReason: '需灵石 50' },
        insightTags: ['开启【青岚血丹局】', '谢无咎线索'],
        effect: {
          timeMonths: 2,
          spiritStones: -50,
          trackActionKey: 'intel',
          setFlags: { arc_blood_pill_active: true, qinglan_market_report: true },
          activateThreads: ['thread_blood_pill'],
        },
        outcome: [
          '眼线在桌面画出一条通往地下秘库的暗道：“百宝斋谢少东家正在查天机商行的血丹账本。拿着这个暗记去敲门，他多半愿意拉你入伙。”',
        ],
        outcomeContinueLabel: '记熟暗道，归返统筹',
        bridgeNote: '买通暗市眼线后，【青岚血丹局】与百宝斋秘库入口已清晰在握。',
        next: 'act2_hub',
      },
      {
        id: 'hub_cross_open_plague',
        label: (s) =>
          isSuZhiweiAlive(s)
            ? '听闻青州怪疫日重，动身南下杏林一探虚实'
            : '动身南下青州杏林旧址，查探当年怪疫尘封医案',
        subtext: (s) =>
          !isSuZhiweiAlive(s)
            ? '主动查探【青州怪疫】旧案（须占本卷一席大势），寻访老杏树下遗留医录。'
            : s.companions.su_zhiwei.met
            ? '主动介入【青州怪疫】（须占本卷一席大势），亦可见故人苏知微。'
            : '主动介入【青州怪疫】（须占本卷一席大势），探查青州城外避疫药棚异象。',
        visible: (s) =>
          !s.activeThreads.includes('thread_qingzhou_plague') &&
          !s.completedThreads.includes('thread_qingzhou_plague') &&
          canCommitMajorArc(s, 'act2', 'thread_qingzhou_plague'),
        insightTags: (s) =>
          isSuZhiweiAlive(s)
            ? ['开启【青州怪疫】', '苏知微缘分']
            : ['开启【青州怪疫】', '旧碑遗案'],
        effect: {
          timeMonths: 4,
          setFlags: { arc_plague_active: true },
          activateThreads: ['thread_qingzhou_plague'],
          commitMajorArc: { act: 'act2', threadId: 'thread_qingzhou_plague' },
        },
        next: 'act2_arc_plague_1',
      },
      {
        id: 'hub_cross_open_vein',
        label: (s) =>
          s.relics.includes('charred_jade_relic') && s.companions.cang_ming.met
            ? '循焦黑断玉与灵气异动指引，前往青州北麓古脉裂隙'
            : '循青州北麓夜半地鸣与灵气异动，前往探查干涸古脉裂隙',
        subtext: (s) =>
          s.companions.cang_ming.met
            ? '主动探寻【地底古脉】（须占本卷一席大势）与苍溟过往。'
            : '主动探寻青州北麓【地底古脉】（须占本卷一席大势），查明灵潮枯竭之异。',
        visible: (s) =>
          !s.activeThreads.includes('thread_ancient_vein') &&
          !s.completedThreads.includes('thread_ancient_vein') &&
          canCommitMajorArc(s, 'act2', 'thread_ancient_vein'),
        insightTags: ['开启【青州古脉】', '地脉异动'],
        effect: {
          timeMonths: 4,
          setFlags: { ancient_vein_disturbed: true },
          activateThreads: ['thread_ancient_vein'],
          commitMajorArc: { act: 'act2', threadId: 'thread_ancient_vein' },
        },
        next: 'act2_arc_vein_1',
      },
      {
        id: 'a2_intel_market_read',
        label: '花二十五灵石购阅最新《青岚三行市价密报》，摸清大坊涨跌脉络',
        requirement: {
          minSpiritStones: 25,
          maxUsesInAct: {
            key: 'intel_market',
            max: 1,
            reason: '本季《青岚三行市价密报》你已购阅在手，不必重复破费',
          },
          lockReason: '需灵石 25',
        },
        insightTags: ['行情洞察', '心境与声望', '此间限1回'],
        effect: {
          timeMonths: 1,
          spiritStones: -25,
          mind: 4,
          renown: 4,
          trackActionKey: 'intel_market',
          setFlags: { qinglan_market_report: true },
        },
        outcome: [
          '密报详列了各宗采购单与暗市余货，你对照时局一算，对接下来聚宝阁哪种货品该吃进、哪种该抛出心里已有了底。',
        ],
        outcomeContinueLabel: '合上密报，归返枢纽',
        bridgeNote: '读罢《青岚三行市价密报》，你对近季大坊涨跌已胸有成竹。',
        next: 'act2_hub',
      },
      {
        id: 'a2_intel_back',
        label: '收拢消息，返回居所',
        next: 'act2_hub',
      },
    ],
  },

  act1_companion_visit: {
    id: 'act1_companion_visit',
    act: 'act1',
    title: '青岚访友',
    subtitle: '自主谋划 · 故人往来',
    location: '青岚城 · 访友动身前',
    paragraphs: [
      '城内外几位相识或递过口讯之人各自守着一处清静去处。你整理衣袖，思量今日先去拜会哪一位。',
    ],
    choices: [
      {
        id: 'visit_qingzhou_rain',
        category: 'companion',
        label: (s) =>
          s.companions.su_zhiwei.met
            ? '出城南下青州城外，再访杏林看望苏知微'
            : '循城中“青州怪热”风声，南下青州城外杏林医馆向那位善治怪热的凡医讨教',
        visible: (s) =>
          s.companions.su_zhiwei.met || Boolean(s.flags.act1_rumor_plague),
        requirement: {
          maxUsesInAct: {
            key: 'visit_su',
            max: 2,
            reason: '近来已常往杏林走动，医馆病务繁忙，且待风云再起时再访',
          },
          cooldownTurns: {
            key: 'visit_su',
            turns: 1,
            reason: '方才别过苏知微不久，过些时日再去看她',
          },
        },
        insightTags: ['寻访苏知微', '此间限2次'],
        next: 'visit_su_zhiwei',
      },
      {
        id: 'hub1_visit_xie',
        category: 'companion',
        label: (s) =>
          s.companions.xie_wujiu.met
            ? '赴百宝斋二楼拜访谢无咎'
            : '持暗市拜帖敲开百宝斋后门，应约见少东家谢无咎',
        visible: (s) =>
          s.companions.xie_wujiu.met || Boolean(s.flags.xie_invited_player),
        requirement: {
          maxUsesInAct: {
            key: 'visit_xie',
            max: 2,
            reason: '谢少东家近日忙着盘点暗市账目，且待入炼气后再约',
          },
          cooldownTurns: {
            key: 'visit_xie',
            turns: 1,
            reason: '方才自百宝斋喝完茶出来，稍隔几月再访',
          },
        },
        insightTags: ['寻访谢无咎', '此间限2次'],
        next: 'visit_xie_wujiu',
      },
      {
        id: 'hub1_visit_shen',
        category: 'companion',
        label: (s) =>
          s.companions.shen_qingshuang.met
            ? '登断剑亭松林再会沈清霜'
            : '携巡查司引荐口讯，登断剑亭拜会青云首座沈清霜',
        visible: (s) =>
          s.companions.shen_qingshuang.met || Boolean(s.flags.shen_invited_player),
        requirement: {
          maxUsesInAct: {
            key: 'visit_shen',
            max: 2,
            reason: '沈清霜已回青云主峰闭关，须待踏入炼气后再会',
          },
          cooldownTurns: {
            key: 'visit_shen',
            turns: 1,
            reason: '方才自断剑亭别过不久，过几月再登门',
          },
        },
        insightTags: ['寻访沈清霜', '此间限2次'],
        next: 'visit_shen_qingshuang',
      },
      {
        id: 'hub1_visit_cangming',
        category: 'companion',
        label: '夜叩怀中【焦黑断玉】，主动唤出苍溟问计',
        visible: (s) => s.companions.cang_ming.met,
        requirement: {
          maxUsesInAct: {
            key: 'visit_cm',
            max: 2,
            reason: '苍溟残魂耗神颇多，已沉入玉中静养，待破境后再唤',
          },
          cooldownTurns: {
            key: 'visit_cm',
            turns: 1,
            reason: '苍溟方才斥你叨扰太多，过几月再叩断玉',
          },
        },
        insightTags: ['主动唤出苍溟', '此间限2次'],
        next: 'visit_cang_ming',
      },
      {
        id: 'v1_visit_back',
        label: '暂不登门，返回青岚街市',
        next: 'act1_qinglan_arrival',
      },
    ],
  },

  act2_action_errands: {
    id: 'act2_action_errands',
    act: 'act2',
    title: '青岚行迹',
    subtitle: '自主谋划 · 悬赏、听风与游历',
    location: '青岚城 · 长街茶坊与悬赏木牌',
    paragraphs: [
      '城中风声日紧，执事堂悬赏榜、听风酒肆暗桩与城外荒野山道都在眼前铺开。此番出城落子，你打算先去哪一处？',
    ],
    choices: [
      {
        id: 'hub2_commission',
        category: 'plan',
        label: '承接炼气高阶委托（斩妖狼 / 暗市鉴宝 / 护药赴青州）',
        subtext: '筑基前至多接单两回，赚取大笔破境灵石与四方声望。',
        requirement: {
          maxUsesInAct: {
            key: 'commission',
            max: 2,
            reason: '执事堂与暗市牙行本季已无合适高阶单子，待踏入筑基再接大单',
          },
        },
        insightTags: ['高额灵石回报', '此间限2次'],
        next: 'act2_action_commission',
      },
      {
        id: 'hub2_intel',
        category: 'plan',
        label: '去听风酒肆暗桩买讯，撬开其余暗线或购阅行情密报',
        subtext: '可介入未启风波（试剑 / 血丹 / 怪疫 / 古脉）或花灵石买三行市价密报。',
        insightTags: ['暗桩探听跨线风波', '行情密报'],
        next: 'act2_action_intel',
      },
      {
        id: 'hub_wander_random',
        category: 'plan',
        label: '御风游历青岚山野与茶楼，打磨气海、撞碰沿途机缘',
        subtext: '筑基前至多游历四回，边历练边推升炼气小阶。',
        visible: (s) =>
          s.seenRandomEvents.filter((id) => id.startsWith('rand_act2_')).length < 7,
        requirement: {
          maxUsesInAct: {
            key: 'wander',
            max: 4,
            reason: '青岚山野已踏遍数回，眼下大势紧迫，宜先了结正事或闭关筑基',
          },
        },
        insightTags: ['山野行游奇遇', '本卷限四回'],
        effect: (s) => {
          const nextR = nextAct2Realm(s);
          return {
            timeMonths: 6,
            might: 4,
            beatDelta: 1,
            trackActionKey: 'wander',
            setRealm: nextR,
            setReturnSceneId: 'act2_hub',
            logSummary:
              nextR !== s.realm
                ? `游历青岚山野历练半载，气海自然精进踏入【${qiRealmLabel(nextR)}】。`
                : undefined,
          };
        },
        next: '__RANDOM_ACT2__',
      },
      {
        id: 'errand2_engagement_echo',
        category: 'story',
        label: '望月酒楼独饮，忽见昔日退婚小族家主登门请安',
        visible: (s) =>
          s.tags.includes('broken_engagement') &&
          !s.flags.engagement_echo_done &&
          s.actBeat >= 1,
        insightTags: ['退婚旧缘应劫', '心境与灵石'],
        effect: {
          timeMonths: 2,
          setFlags: { engagement_echo_done: true },
          setReturnSceneId: 'act2_hub',
        },
        next: 'rand_act2_engagement_echo',
      },
      {
        id: 'errand2_talisman_echo',
        category: 'story',
        label: '子夜静室吐纳，怀中【荒庙旧符】发烫示警',
        visible: (s) =>
          s.tags.includes('old_daoist_talisman') &&
          !s.flags.old_talisman_echo_done &&
          s.actBeat >= 1,
        insightTags: ['荒庙旧符应劫', '心境大进'],
        effect: {
          timeMonths: 2,
          setFlags: { old_talisman_echo_done: true },
          setReturnSceneId: 'act2_hub',
        },
        next: 'rand_act2_heart_whisper',
      },
      {
        id: 'errand2_back',
        label: '暂不出门，折返居所',
        next: 'act2_hub',
      },
    ],
  },

  act2_companion_visit: {
    id: 'act2_companion_visit',
    act: 'act2',
    title: '寻访旧识',
    subtitle: '自主谋划 · 故人往来',
    location: '青岚界域 · 访友动身前',
    paragraphs: [
      '修行之外，几位相识或递过门路之人各自守着一角风云。你清点手头门路与行囊，思量今日该往何处拜访。',
    ],
    choices: [
      {
        id: 'hub2_visit_shen',
        label: (s) =>
          s.flags.shen_saved_from_sect
            ? '赴山外僻静松崖约见沈清霜'
            : s.companions.shen_qingshuang.met
            ? '赴松林约见沈清霜'
            : '凭青云身份或引荐口讯，登断剑亭拜会沈清霜',
        visible: (s) =>
          (s.companions.shen_qingshuang.met ||
            s.tags.includes('qingyun_outer') ||
            Boolean(s.flags.shen_invited_player)) &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          s.companions.shen_qingshuang.stance !== 'rival' &&
          !s.flags.betrayed_shen_at_stele &&
          !s.flags.shen_rival_tension &&
          !isMajorArcMissed(s, 'act2', 'thread_sword_trial'),
        requirement: {
          maxUsesInAct: {
            key: 'visit_shen',
            max: 2,
            reason: '沈清霜近日被执法堂盯得紧，不宜再频频私会，待筑基后再见',
          },
          cooldownTurns: {
            key: 'visit_shen',
            turns: 1,
            reason: '方才别过松林不久，暂避山中耳目',
          },
        },
        insightTags: ['主动拜访沈清霜', '此间限2次'],
        next: 'visit_shen_qingshuang',
      },
      {
        id: 'hub2_visit_xie',
        label: (s) =>
          s.companions.xie_wujiu.met
            ? '登百宝斋再会谢无咎'
            : '持暗市门路或拜帖登百宝斋，拜会少东家谢无咎',
        visible: (s) =>
          (s.companions.xie_wujiu.met ||
            s.tags.includes('dark_market_broker') ||
            Boolean(s.flags.xie_invited_player) ||
            s.relics.includes('baibao_token')) &&
          s.companions.xie_wujiu.stance !== 'estranged' &&
          s.companions.xie_wujiu.stance !== 'rival',
        requirement: {
          maxUsesInAct: {
            key: 'visit_xie',
            max: 2,
            reason: '谢无咎近日远行盘账，暂不便再扰，待筑基后九州重逢',
          },
          cooldownTurns: {
            key: 'visit_xie',
            turns: 1,
            reason: '前脚刚从百宝斋出来，过一季再登门',
          },
        },
        insightTags: ['主动拜访谢无咎', '此间限2次'],
        next: 'visit_xie_wujiu',
      },
      {
        id: 'hub2_visit_su',
        label: (s) =>
          s.companions.su_zhiwei.met
            ? '赴青州杏林探望苏知微'
            : '趁青州疫讯南下杏林医馆，拜访那位善治怪热的凡医',
        visible: (s) =>
          isSuZhiweiAlive(s) &&
          !s.flags.su_zhiwei_fading &&
          !(
            Boolean(s.flags.plague_arc_step1) &&
            s.activeThreads.includes('thread_qingzhou_plague')
          ) &&
          (s.companions.su_zhiwei.met ||
            Boolean(s.flags.arc_plague_active) ||
            Boolean(s.flags.act1_rumor_plague)),
        requirement: {
          maxUsesInAct: {
            key: 'visit_su',
            max: 2,
            reason: '青州城外往返不易，近来已探望数次，待破境后再赴杏林',
          },
          cooldownTurns: {
            key: 'visit_su',
            turns: 1,
            reason: '方才离开杏林不久，过些时日再去看她',
          },
        },
        insightTags: ['主动拜访苏知微', '此间限2次'],
        next: 'visit_su_zhiwei',
      },
      {
        id: 'hub2_visit_cangming',
        label: '静室叩玉唤出苍溟问计',
        visible: (s) =>
          s.companions.cang_ming.met &&
          s.companions.cang_ming.stance !== 'estranged' &&
          s.companions.cang_ming.stance !== 'rival' &&
          !s.flags.cangming_sealed,
        requirement: {
          maxUsesInAct: {
            key: 'visit_cm',
            max: 2,
            reason: '苍溟残魂须蓄力助你筑基，暂封玉休眠',
          },
          cooldownTurns: {
            key: 'visit_cm',
            turns: 1,
            reason: '刚与苍溟问计完毕，过一季再叩断玉',
          },
        },
        insightTags: ['主动唤出苍溟', '此间限2次'],
        next: 'visit_cang_ming',
      },
      {
        id: 'v2_visit_back',
        label: '暂不登门，退回筹谋',
        next: 'act2_hub',
      },
    ],
  },

  // ==================== 主动寻访四位固定伴侣（全跨幕动态演进） ====================
  visit_su_zhiwei: {
    id: 'visit_su_zhiwei',
    act: 'act1',
    title: '杏林寻访',
    subtitle: '故人相会 · 苏知微',
    location: (s) =>
      s.act === 'act4' && Boolean(s.flags.act4_mortal_truth_found)
        ? '青州槐阴村 · 药香茅舍'
        : '青州城外 · 杏林医馆',
    paragraphs: [
      (s) => {
        if (!s.companions.su_zhiwei.met) {
          return '你循着坊间传闻出城南下，赶到青州城外竹篱环绕的杏林医馆。素衣医女苏知微正在檐下分拣药材，闻声抬头微笑：“这位{{honorific}}气色安稳，可是来讨茶喝，还是打听青州药事？”';
        }
        if (
          Boolean(s.flags.left_qingzhou_coldly) &&
          s.companions.su_zhiwei.affection < 10
        ) {
          return '素衣医女听见脚步声微怔片刻，很快垂下眉眼，礼数周全地递来一只粗瓷茶盏：“仙师今日怎么又绕回这小小医馆来了？”';
        }
        const repeatVisit = (s.actionUses[`${s.act}:visit_su`] ?? 0) > 0;
        const yrs = yearsSinceAgeMonths(s.ageMonths, s.companions.su_zhiwei.lastSeenAgeMonths);
        if (s.act === 'act4' && Boolean(s.flags.act4_mortal_truth_found)) {
          return repeatVisit
            ? '再入槐阴茅舍，院檐下已新晒出两竹匾陈皮。两鬓斑白的苏知微递来一只补过口的青瓷碗，笑着招呼：“又抽空绕回来了？阿芸刚熬好小米山药粥，快趁热喝一碗。”'
            : '穿过山坳推开竹扉，檐下晒满新采的甘草与橘皮。两鬓斑白的苏知微正领着徒弟阿芸整理手抄医册，听见脚步声便笑着招呼：“贵为金丹真人，倒还抽得出空来喝碗粗茶？坐罢，刚温好的。”';
        }
        if (s.act === 'act4') {
          return repeatVisit
            ? '杏林竹扉未闩，药碾声在院里笃笃作响。两鬓霜白的苏知微见你又来，顺手添了半勺陈皮入壶：“前日刚配好的润肺汤，正好替你散散路途风尘。”'
            : '再回青州城外杏林，老杏树已荫蔽半院。两鬓霜白的苏知微正低头核对各地捎来的凡人脉案，见你推门便眉眼舒展：“贵为金丹真人，倒还记得这座旧院？快进屋暖暖手。”';
        }
        if (s.act === 'act3') {
          return repeatVisit
            ? '青州杏林的篱笆墙边新晒着一排姜片。苏知微见你折返，放下药杵浅笑：“怎么又绕路过来了？灶上正煨着红枣粥，坐下歇歇脚罢。”'
            : '多年风雨过去，青州杏林的竹篱修补过几回，苏知微鬓边也添了几缕银丝。听见熟悉脚步，她笑着放下药碾：“{{name}}来了？九州风声这样紧，难得你还记得城外这炉热茶。”';
        }
        if (
          s.act === 'act2' &&
          (Boolean(s.flags.su_zhiwei_fading) ||
            (Boolean(s.flags.plague_arc_step1) &&
              s.activeThreads.includes('thread_qingzhou_plague')))
        ) {
          return '竹门半掩，屋内药炉小火微温。苏知微披着厚棉袄靠在榻边调息，见你来时唇边只牵起一丝倦意浅笑：“身子尚虚，招待不周，坐下喝杯温水罢。”';
        }
        if (repeatVisit) {
          return '推开竹门时药碾刚停，苏知微抬头见又是你，眼角弯起一分：“才隔几月便又登门，可是近日吐纳太急了？坐下罢，我刚煮了一壶陈皮姜汤。”';
        }
        return yrs >= 1
          ? `距上次来杏林转眼又过了${toChineseYearNumber(yrs)}年。推开竹门时药炉正冒着轻烟，苏知微认出你的脚步声，笑着放下药碾：“{{name}}回来了？桂花茶刚温好。”`
          : '竹篱小院里弥漫着熟悉的当归与陈皮香。苏知微见你又来坐坐，眉眼弯起，顺手替你添了一盏热茶。';
      },
    ],
    choices: [
      // === 卷一 / 卷二（凡胎、炼气期） ===
      {
        id: 'v_su_gift_herb',
        label: '把行囊里囤的一份【清心草】送给医馆救治病患',
        visible: (s) =>
          (s.act === 'act1' || s.act === 'act2') &&
          (s.market.holdings.qingxin_herb?.qty ?? 0) > 0,
        insightTags: ['赠清心草', '苏知微好感', '正道与心境'],
        effect: (s) => {
          const prev = s.market.holdings.qingxin_herb;
          return {
            timeMonths: 2,
            mind: 6,
            righteous: 6,
            worldly: 5,
            trackActionKey: 'visit_su',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'qingxin_herb', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            setFlags: {
              act1_rumor_plague: true,
              v_su_gift_cold:
                Boolean(s.flags.left_qingzhou_coldly) &&
                s.companions.su_zhiwei.affection < 10,
              v_su_gift_first_meet: !s.companions.su_zhiwei.met,
            },
            companionUpdates: {
              su_zhiwei: {
                meet: true,
                markSeen: true,
                affectionDelta: 9,
                chronicle:
                  s.act === 'act1'
                    ? '青岚初年你专程送来清心草济助医馆，她珍而重之地记在药簿扉页。'
                    : '炼气初年你专程送来清心草济助医馆，她珍而重之地记在药簿扉页。',
              },
            },
          };
        },
        outcome: [
          (s) =>
            s.flags.v_su_gift_cold
              ? '苏知微愣了一下，接过那捆品相极佳的清心草轻声道谢：“外头药价涨得厉害，医馆正愁断药。多谢仙师还肯念着城里百姓。”'
              : s.flags.v_su_gift_first_meet
              ? '苏知微愣了愣，郑重接过那捆品相极佳的清心草温声道谢：“外头药价涨得厉害，医馆正愁断药呢。初次相见便劳{{honorific}}如此慷慨相助，知微替城里病患谢过了。”'
              : '苏知微接过那捆品相极佳的清心草，指尖轻颤：“外头药价涨得厉害，医馆正愁断药呢。你总把最紧要的东西留给我。”',
          '傍晚两人在树荫下分食了一碟桂花糕，你连日奔波攒下的戾气散去大半。',
        ],
        outcomeContinueLabel: '告别杏林，回到尘途',
        bridgeNote: '专程给药庐送去清心草，苏知微的笑意令你道心温润许多。',
        next: returnHubFor,
      },
      {
        id: 'v_su_help_tea',
        label: '留下来帮她晒药熬汤，闲话青岚城中见闻',
        visible: (s) => s.act === 'act1' || s.act === 'act2',
        insightTags: ['零花费', '苏知微好感', '心境与红尘'],
        effect: {
          timeMonths: 2,
          mind: 5,
          worldly: 5,
          trackActionKey: 'visit_su',
          setFlags: { act1_rumor_plague: true },
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '早年闲暇时赴杏林帮她晾药烹茶，度过一段远离修仙纷争的安宁光阴。',
            },
          },
        },
        outcome: [
          '你不谈境界也不谈灵石，只卷起袖子帮她把院里几竹匾药材翻晒均匀。苏知微话不多，讲起街坊琐事却格外动听。',
          '在药庐小住旬日，待几茬新药尽数晒透，你才趁着暮色起身辞行，衣袖间沾满淡淡的草木苦香。',
        ],
        outcomeContinueLabel: '披着暮色离开杏林',
        bridgeNote: '在杏林药庐小住旬日帮苏知微晒药煎汤，往返两月，心神难得清静。',
        next: returnHubFor,
      },
      {
        id: 'v_su_donate_stones',
        label: '留三十灵石贴补穷苦病患的药钱，并请她替你把脉调息',
        visible: (s) => s.act === 'act1' || s.act === 'act2',
        requirement: { minSpiritStones: 30, lockReason: '需灵石 30' },
        insightTags: ['耗30灵石', '苏知微好感', '稳固心境'],
        effect: {
          timeMonths: 2,
          spiritStones: -30,
          mind: 8,
          righteous: 5,
          trackActionKey: 'visit_su',
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '资助医馆药钱，她细心以银针替你疏通修炼滞涩的郁气。',
            },
          },
        },
        outcome: [
          '苏知微拗不过你，只得收下灵石记作义诊公账，反过来坚持替你号脉施针，将你近期修炼积在胸口的一股燥气疏导得干干净净。',
        ],
        outcomeContinueLabel: '谢过医女，启程归去',
        bridgeNote: '苏知微以银针替你化去胸中郁气，神台清明如洗。',
        next: returnHubFor,
      },

      // === 卷三（筑基期 · 二十载杏林脉案与真元温脉） ===
      {
        id: 'v_su_act3_pulse_notes',
        label: (s) =>
          s.flags.act3_hearth_step1
            ? '与她共校二十载《无灵脉案》，核验凡人缘何独避灵潮异象'
            : '与她共校近载青州凡人脉案，核验凡人缘何独避灵潮异象',
        visible: (s) => s.act === 'act3',
        insightTags: ['筑基专属', '勘验无灵盲区', '心境大增'],
        effect: (s) => ({
          timeMonths: 2,
          mind: 10,
          worldly: 6,
          trackActionKey: 'visit_su',
          addTruthClues: s.truthClues.includes('clue_mortal_blindspot')
            ? undefined
            : ['clue_mortal_blindspot'],
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: s.flags.act3_hearth_step1
                ? '筑基归来与她并灯核校二十载凡人脉案，从烟火医录里辨出天机盲区。'
                : '筑基归来与她并灯核校近载青州凡人脉案，从烟火医录里辨出天机盲区。',
            },
          },
        }),
        outcome: [
          (s) =>
            s.flags.act3_hearth_step1
              ? '灯花轻爆。你替她把二十年来青州百余户脉案按有灵根与无灵根拆作两叠——凡沾灵窍者多受地脉枯衰拖累，而彻彻底底无灵根的凡俗老幼竟无一例灵息被蚀。'
              : '灯花轻爆。你替她把近载青州百余户脉案按有灵根与无灵根拆作两叠——凡沾灵窍者多受地脉枯衰拖累，而彻彻底底无灵根的凡俗老幼竟无一例灵息被蚀。',
          '苏知微搁下朱笔轻声道：“我瞧不懂你们天上的大道，可脉象不会骗人。无灵之人，好像天然躲在那张大网的眼睛外头。”',
        ],
        outcomeContinueLabel: '收拢脉案笔记，辞别杏林',
        bridgeNote: (s) =>
          s.flags.act3_hearth_step1
            ? '并灯核校二十载脉案，你对“无灵盲区”的认识愈发笃实。'
            : '并灯核校青州凡人脉案，你对“无灵盲区”的认识愈发笃实。',
        next: returnHubFor,
      },
      {
        id: 'v_su_act3_warm_qi',
        label: '置办温补药材并以筑基柔和灵液替她驱散积年药寒',
        visible: (s) => s.act === 'act3',
        requirement: { minSpiritStones: 60, lockReason: '需灵石 60' },
        insightTags: ['筑基专属', '耗60灵石', '苏知微好感与心境'],
        effect: (s) => ({
          timeMonths: 2,
          spiritStones: -60,
          mind: 12,
          righteous: 6,
          worldly: 6,
          trackActionKey: 'visit_su',
          setFlags: {
            v_su_act3_was_cold:
              Boolean(s.flags.left_qingzhou_coldly) &&
              s.companions.su_zhiwei.affection < 10,
          },
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 8,
              chronicle: '你敛去筑基威压，以极温和灵液替她逐去经年操劳积下的肺腑寒气。',
            },
          },
        }),
        outcome: [
          '筑基真元化气为液，本极霸道，你却将其拆作游丝般细软的一缕，顺着她腕脉一点点化开常年守夜煎药攒下的寒郁。',
          (s) =>
            s.flags.v_su_act3_was_cold
              ? '苏知微觉出指尖回暖，垂眸静了片刻，终究替你盛了一盏温好的红枣汤，语气松动半分：“多谢仙师挂念。这许多年过去，你倒还记得城外这间破医馆。”'
              : '苏知微觉出指尖回暖，轻笑着递来一盏温好的红枣汤：“外头筑基真人个个拿灵压吓人，倒只有你肯把真元拿来当暖炉使。”',
        ],
        outcomeContinueLabel: '饮罢热汤，起身告辞',
        bridgeNote: '以柔和灵液替苏知微驱寒后，你对真元的细微驾驭也更纯熟了一层。',
        next: returnHubFor,
      },
      {
        id: 'v_su_act3_gift_oil',
        label: '赠一份【地脉灵膏】供医馆配制保元温脉膏药',
        visible: (s) =>
          s.act === 'act3' && (s.market.holdings.spirit_marrow_oil?.qty ?? 0) > 0,
        insightTags: ['赠地脉灵膏', '苏知微大幅好感', '正道声望'],
        effect: (s) => {
          const prev = s.market.holdings.spirit_marrow_oil;
          return {
            timeMonths: 2,
            mind: 10,
            righteous: 7,
            renown: 4,
            trackActionKey: 'visit_su',
            setFlags: {
              v_su_act3_was_cold:
                Boolean(s.flags.left_qingzhou_coldly) &&
                s.companions.su_zhiwei.affection < 10,
            },
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'spirit_marrow_oil', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              su_zhiwei: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你将珍贵的地脉灵膏留给杏林医馆调膏救重症，令她满心欢喜。',
              },
            },
          };
        },
        outcome: [
          (s) =>
            s.flags.v_su_act3_was_cold
              ? '苏知微揭开青瓷盒盖闻见醇厚药息，微微一怔，眼底冷雾散去半分：“地脉灵膏兑上甘草露，一小盒便能救回十几个肺枯的重病老农……多谢仙师，这份心意我替青州百姓领了。”'
              : '苏知微揭开青瓷盒盖闻见醇厚药息，眼中亮光一闪：“地脉灵膏兑上甘草露，一小盒便能救回十几个肺枯的重病老农！你总是雪中送炭。”',
        ],
        outcomeContinueLabel: '告别药庐，重入风云',
        bridgeNote: '送出地脉灵膏济世，青州城外百姓与苏知微皆念你的温厚。',
        next: returnHubFor,
      },

      // === 卷四（金丹期 · 杏林/槐阴茅舍、阿芸传灯与《无灵医典》） ===
      {
        id: 'v_su_act4_teach_ayun',
        label: (s) =>
          s.flags.act4_mortal_truth_found
            ? '敛去金丹威压，陪她与徒弟阿芸于槐阴茅舍辨草煮桂花粥'
            : '敛去金丹威压，陪她与药庐小徒在青州杏林辨草煮桂花粥',
        visible: (s) => s.act === 'act4',
        insightTags: ['金丹专属', '零花费', '心境大增'],
        effect: (s) => ({
          timeMonths: 2,
          mind: 13,
          worldly: 8,
          trackActionKey: 'visit_su',
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: s.flags.act4_mortal_truth_found
                ? '金丹之尊隐去锋芒，与她及徒弟阿芸在槐阴茅舍共煮桂花粥、享半日凡尘清欢。'
                : '金丹之尊隐去锋芒，在青州城外杏林药庐与她共煮桂花粥、享半日凡尘清欢。',
            },
          },
        }),
        outcome: [
          (s) =>
            s.flags.act4_mortal_truth_found
              ? '外头九州灵矿打得血雨腥风，槐阴村里却只听见阿芸背诵《草木歌》的清脆嗓音。你蹲在檐下替她们剥完两筐新莲子，苏知微端出一锅飘香的桂花小米粥。'
              : '外头九州灵矿打得血雨腥风，青州城外杏林药庐里却只听见药炉轻沸与小徒背诵《草木歌》的清脆嗓音。你蹲在檐下替她们剥完两筐新莲子，苏知微端出一锅飘香的桂花小米粥。',
          '一碗热粥落腹，金丹久修攒下的高寒孤寂被这人间灶火暖得融化开来。',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.act4_mortal_truth_found ? '披着夕阳别过茅舍' : '披着夕阳别过杏林',
        bridgeNote: (s) =>
          s.flags.act4_mortal_truth_found
            ? '在槐阴茅舍吃了一碗桂花粥，你愈发懂得此世所护为何物。'
            : '在青州杏林吃了一碗桂花粥，你愈发懂得此世所护为何物。',
        next: returnHubFor,
      },
      {
        id: 'v_su_act4_engrave_book',
        label: (s) =>
          s.flags.act4_mortal_truth_found
            ? '出资八十灵石刊刻《无灵医典》百册传世，并借古碑清气涤荡丹煞'
            : '出资八十灵石刊刻《无灵医典》百册传世，在杏林清风中涤荡丹煞',
        visible: (s) => s.act === 'act4',
        requirement: { minSpiritStones: 80, lockReason: '需灵石 80' },
        insightTags: ['金丹专属', '耗80灵石', '涤血煞与心境'],
        effect: {
          timeMonths: 2,
          spiritStones: -80,
          mind: 15,
          righteous: 8,
          renown: 6,
          removeTags: ['blood_pill_tainted'],
          trackActionKey: 'visit_su',
          companionUpdates: {
            su_zhiwei: {
              meet: true,
              markSeen: true,
              affectionDelta: 8,
              chronicle: '你出资替她刊印《无灵医典》散赠九州乡邻，让凡尘医道得以薪火相传。',
            },
          },
        },
        outcome: [
          '木版雕成那日，墨香漫了整条村道。苏知微摩挲着首印青皮医典，鬓边银丝在日光下温润发亮：“纵使将来我不在了，青州大夫和后生们也能照着这套方子救活千万人。”',
          (s) =>
            s.flags.act4_mortal_truth_found
              ? '两人并肩立在无灵古碑槐荫下静坐半日，你丹田内残留的躁厉之气尽数澄净。'
              : '两人并肩立在青州老杏树下静坐半日，药香拂面，你丹田内残留的躁厉之气尽数澄净。',
        ],
        outcomeContinueLabel: '带走一册初印医典，启程离去',
        bridgeNote: '助苏知微刊刻《无灵医典》传世，你神台澄明如镜。',
        next: returnHubFor,
      },
      {
        id: 'v_su_act4_gift_rubbing',
        label: '赠一份【前朝残简】与她共参上古草木医方',
        visible: (s) =>
          s.act === 'act4' && (s.market.holdings.ancient_rubbing?.qty ?? 0) > 0,
        insightTags: ['赠前朝残简', '苏知微大幅好感', '心境大增'],
        effect: (s) => {
          const prev = s.market.holdings.ancient_rubbing;
          return {
            timeMonths: 2,
            mind: 12,
            worldly: 7,
            trackActionKey: 'visit_su',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'ancient_rubbing', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              su_zhiwei: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你将前朝残简赠她考订上古草木古方，补全了医典末卷空白。',
              },
            },
          };
        },
        outcome: [
          '苏知微就着窗光辨认出残简角落几味失传的凡俗养气古方，惊喜得连连抄录。末了她将一包新焙干桂花塞进你袖中：“下回再忙，也要抽空回来喝茶。”',
        ],
        outcomeContinueLabel: '收好干桂花，告别药庐',
        bridgeNote: '赠前朝残简助她补全古方，药庐情谊历久弥温。',
        next: returnHubFor,
      },
      {
        id: 'v_su_back',
        label: '只在篱外遥望一眼，改日再访',
        next: returnHubFor,
      },
    ],
  },

  visit_xie_wujiu: {
    id: 'visit_xie_wujiu',
    act: 'act1',
    title: '百宝品茗',
    subtitle: '故人相会 · 谢无咎',
    location: (s) =>
      s.act === 'act4' && Boolean(s.flags.act4_chamber_collapsed)
        ? '中州 · 九州百宝总号暗楼'
        : s.act === 'act3' || s.act === 'act4'
        ? '青州府 · 百宝分号暗楼'
        : '青岚暗市 · 百宝斋二楼雅间',
    paragraphs: [
      (s) => {
        if (!s.companions.xie_wujiu.met) {
          return '你按着暗市打听来的门路敲开了百宝斋后门。二楼玄衣少东家谢无咎上下打量你一番，摇扇含笑：“面生得很，胆子倒不小。坐罢，既然敢进我百宝斋的门，说说想谈什么买卖？”';
        }
        const repeatVisit = (s.actionUses[`${s.act}:visit_xie`] ?? 0) > 0;
        if (s.act === 'act4' && Boolean(s.flags.act4_chamber_collapsed)) {
          return repeatVisit
            ? '再进百宝总号暗楼，谢无咎连茶杯都已替你倒好，指着墙上新换的九州行价图笑道：“才隔一阵便又登门，看来{{name}}手头又攒下新筹码了？”'
            : '总号暗楼里堆满九州各路矿报与新换的契印。谢无咎合上玄铁算盘，替你推过一盏浓茶笑道：“天机商行这颗毒瘤一拔，九州矿账总算清爽了大半，兄长旧账也算有了交代。金丹真人驾临，今日不谈蝇头小利，说说哪条商路合你胃口？”';
        }
        if (s.act === 'act4') {
          return repeatVisit
            ? '再进暗楼，谢无咎连茶杯都已替你倒好，指着墙上新换的九州行价图笑道：“才隔一阵便又登门，看来{{name}}手头又攒下新筹码了？”'
            : '暗楼里堆满九州各路矿报与银票存根。谢无咎合上玄铁算盘，替你推过一盏浓茶笑道：“金丹真人驾临，今日咱们不谈蝇头小利，说说看，哪条灵矿与商路合你胃口？”';
        }
        if (s.act === 'act3') {
          return repeatVisit
            ? '伙计尚未通传，谢无咎已笑着推开雕花木窗招手：“我就猜你近期还得来一趟青州分号。快进来，刚截下一批外郡急货。”'
            : '分号管事熟门熟路引你进了暗楼。谢无咎正对着九州舆图拨弄算珠，见你推门便扬扇一笑：“筑基真人赏光，正巧我手里压着两笔青州急单，坐下喝茶慢慢拆。”';
        }
        if (repeatVisit) {
          return '谢无咎瞥见你再次登楼，合拢鎏金算盘失笑：“这才几天工夫又来敲我茶壶？也罢，跟熟客谈买卖从来最痛快。”';
        }
        return '伙计熟门熟路引你上了二楼。谢无咎正拨弄着一只鎏金小算盘，见你推门便合上账本笑起来：“稀客稀客，{{honorific}}今日登门，是来买消息、拉生意，还是单纯蹭我一壶好茶？”';
      },
    ],
    choices: [
      // === 卷一 / 卷二（凡胎、炼气期） ===
      {
        id: 'v_xie_market_tip',
        label: '请教青岚三行货价虚实，顺手与他做一笔短途转货差价',
        visible: (s) => s.act === 'act1' || s.act === 'act2',
        insightTags: ['灵石短差', '谢无咎好感', '坊市风声'],
        effect: (s) => {
          const profit = s.companions.xie_wujiu.affection >= 25 ? 50 : 35;
          const setFlags: Record<string, boolean> =
            s.act === 'act1'
              ? { xie_market_tip: true, act1_heard_blood_pill: true }
              : { xie_market_tip: true };
          return {
            timeMonths: 2,
            spiritStones: profit,
            renown: 3,
            trackActionKey: 'visit_xie',
            setFlags,
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 6,
                chronicle: '早年登门百宝斋共论青岚行情，你敏捷的算账眼光颇合他胃口。',
              },
            },
          };
        },
        outcome: [
          '谢无咎随手点出两家急于周转灵石的小铺，借百宝斋的名头让你转手吃了趟短差，顺带把近来青岚暗市的风向拆解得清清楚楚。',
          '送出门时他笑道：“跟聪明人打交道就是痛快，下回有大风浪记得先来找我。”',
        ],
        outcomeContinueLabel: '记熟行市，离开百宝斋',
        bridgeNote: '赴百宝斋与谢无咎论商，既赚进一笔短差，也摸清了坊市底细。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_gift_curio',
        label: '将手头一份【前朝残简】赠他鉴藏，探听他收购古物的缘由',
        visible: (s) =>
          (s.act === 'act1' || s.act === 'act2') &&
          (s.market.holdings.ancient_rubbing?.qty ?? 0) > 0,
        insightTags: ['赠前朝残简', '谢无咎大幅好感', '心境与声望'],
        effect: (s) => {
          const prev = s.market.holdings.ancient_rubbing;
          return {
            timeMonths: 2,
            mind: 5,
            renown: 4,
            trackActionKey: 'visit_xie',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'ancient_rubbing', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你送来一份前朝残简，他摩挲卷角沉默许久，神色比平日多了几分郑重。',
              },
            },
          };
        },
        outcome: [
          '谢无咎接过残简细看半晌，嘴角惯常挂着的懒散笑意顿时收了起来：“你在哪儿收的？纸背落款与昔年我哥应召入光前留下的手记同出一脉。”',
          '他郑重收好残简，替你斟满一盏陈年灵茶，话里少了七分试探，多了几分真交情。',
        ],
        outcomeContinueLabel: '饮尽灵茶，辞别百宝斋',
        bridgeNote: '赠出前朝残简后，谢无咎与你之间更添几分默契。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_buy_token',
        label: '奉上六十灵石求一块【百宝斋玄铁令】，交好时奇物折让一成半',
        visible: (s) =>
          (s.act === 'act1' || s.act === 'act2') && !s.relics.includes('baibao_token'),
        requirement: { minSpiritStones: 60, lockReason: '需灵石 60' },
        insightTags: ['得百宝斋玄铁令', '交好时奇物折让一成半'],
        effect: {
          timeMonths: 1,
          spiritStones: -60,
          addRelics: ['baibao_token'],
          renown: 4,
          trackActionKey: 'visit_xie',
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '你爽快出资购入百宝斋玄铁令，成了暗市雅间的座上宾。',
            },
          },
          logSummary: '于百宝斋购入【百宝斋玄铁令】，得九州坊市奇物折让一成半礼遇。',
        },
        outcome: [
          '谢无咎爽快收下六十灵石，反手抛来一块乌沉沉的【百宝斋玄铁令】：“以后九州大小坊市买奇物亮这块牌子，一律予你折让一成半。只要多买两件重宝，这本钱立马就赚回来了。”',
        ],
        outcomeContinueLabel: '收好玄铁令离去',
        bridgeNote: '玄铁令贴身微凉，百宝斋的暗门从此对你敞开。',
        next: returnHubFor,
      },

      // === 卷三（筑基期 · 青州断脉商局与暗桩死手网） ===
      {
        id: 'v_xie_act3_deadman',
        label: '出资五十灵石托他在青州七十二暗桩寄存「死手密信」，为日后对峙留底牌',
        visible: (s) => s.act === 'act3' && !s.flags.xie_deadman_switch,
        requirement: { minSpiritStones: 50, lockReason: '需灵石 50' },
        insightTags: ['筑基专属', '暗网死手底牌', '防高阶灭口'],
        effect: {
          timeMonths: 2,
          spiritStones: -50,
          mind: 5,
          renown: 5,
          trackActionKey: 'visit_xie',
          setFlags: { xie_deadman_switch: true },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '你在青州分号预置七十二暗桩死手密渠，彼此互为后背退路。',
            },
          },
          logSummary: '于谢无咎青州暗桩布下【死手密信】，此后面对高阶强敌多了一重投鼠忌器的威慑底牌。',
        },
        outcome: [
          '谢无咎听完你的盘算，折扇一拍掌心大笑：“总算开窍了！靠一张孤本账页去吓唬金丹老鬼那是找死；把副本提前封蜡埋进七十二城茶楼暗桩，真到了翻脸时他们才不敢轻易杀人灭口。”',
          '他当场替你签下三枚死手暗符，此后只要你亮出暗记，百宝暗桩便会成为悬在强敌头顶的一柄利剑。',
        ],
        outcomeContinueLabel: '收妥暗符，退出暗楼',
        bridgeNote: '百宝七十二城死手暗渠已成，面对高阶强敌再非任人宰割之身。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_act3_medicine_ledger',
        label: '共析青州断脉药荒与分号局势，联手吃下一笔跨郡调拨差价',
        visible: (s) => s.act === 'act3',
        insightTags: ['筑基专属', '高额灵石差价', '谢无咎好感'],
        effect: {
          timeMonths: 2,
          spiritStones: 105,
          renown: 5,
          trackActionKey: 'visit_xie',
          setFlags: { xie_market_tip: true },
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '青州断脉之际与他共拆跨郡药材、矿砂行价，默契渐成。',
            },
          },
        },
        outcome: [
          '谢无咎摊开青州各驿路水陆运费账单，顺势把几批急于出货的商队转托给你押运调拨。短短两月净落一百零五块灵石，你也借机摸清了分号内外各派掌柜的暗流。',
        ],
        outcomeContinueLabel: '收好分红，离开分号',
        bridgeNote: '助百宝青州分号周转急单，净赚百余灵石并摸清商路动向。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_act3_gift_sand',
        label: '以一份【金脉灵砂】入股青州器坊急单，换取分红与情谊',
        visible: (s) =>
          s.act === 'act3' && (s.market.holdings.golden_vein_sand?.qty ?? 0) > 0,
        insightTags: ['赠金脉灵砂', '返还90灵石', '谢无咎大幅好感'],
        effect: (s) => {
          const prev = s.market.holdings.golden_vein_sand;
          return {
            timeMonths: 2,
            spiritStones: 90,
            renown: 6,
            trackActionKey: 'visit_xie',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'golden_vein_sand', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '青州分号紧缺高阶矿砂时你慷慨相助，他回赠厚利并铭记人情。',
              },
            },
          };
        },
        outcome: [
          '谢无咎捻起一撮赤金灵砂对着烛火细看，眉毛一扬：“正愁被天机商行卡了矿口交不出货呢！你这份砂救了分号半条命，这九十块灵石算头一笔红利，剩下的情分我记在心里。”',
        ],
        outcomeContinueLabel: '饮罢庆功酒离去',
        bridgeNote: '雪中送炭补齐器坊灵砂缺口，谢无咎对你愈发倚重。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_act3_buy_token',
        label: '趁分号盘账奉六十灵石补办一块【百宝斋玄铁令】',
        visible: (s) => s.act === 'act3' && !s.relics.includes('baibao_token'),
        requirement: { minSpiritStones: 60, lockReason: '需灵石 60' },
        insightTags: ['得百宝斋玄铁令', '奇物折让一成半'],
        effect: {
          timeMonths: 1,
          spiritStones: -60,
          addRelics: ['baibao_token'],
          renown: 4,
          trackActionKey: 'visit_xie',
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '于青州分号补领百宝斋玄铁令，九州商路互通有无。',
            },
          },
        },
        outcome: [
          '谢无咎将玄铁令抛进你掌心：“筑基往后重宝动辄数百上千灵石，早该把这块折让一成半的牌子揣身上了。”',
        ],
        outcomeContinueLabel: '收好玄铁令离去',
        bridgeNote: '补办玄铁令在手，此后九州坊市购宝省心不少。',
        next: returnHubFor,
      },

      // === 卷四（金丹期 · 九州公契/灵票动荡之辩与元婴筹备） ===
      {
        id: 'v_xie_act4_charter_debate',
        label: (s) =>
          Boolean(s.flags.xie_new_order_founded)
            ? '暗楼夜辩「九州公契」与乱世平抑粮药之策，共筹新商序'
            : '暗楼夜议中州灵票动荡与乱世平抑粮药之策，研判七十二城变局',
        visible: (s) => s.act === 'act4',
        insightTags: ['金丹专属', '心境与声望大进', '谢无咎好感'],
        effect: (s) => ({
          timeMonths: 2,
          mind: 10,
          renown: 8,
          righteous: 5,
          trackActionKey: 'visit_xie',
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: Boolean(s.flags.xie_new_order_founded)
                ? '金丹之境与他于中州暗楼通宵推演九州通兑公契，立商以安苍生。'
                : '金丹之境与他于暗楼通宵推演中州灵票变局与平抑粮药之策。',
            },
          },
        }),
        outcome: [
          (s) =>
            Boolean(s.flags.xie_new_order_founded)
              ? '窗外灵脉枯警频传，各地票号兑付成潮。你与谢无咎对着满墙九州舆图推演至五更，逐条定下散修平价灵粮规矩与跨州公契兑付章程。'
              : '窗外灵脉枯警频传，各地票号兑付成潮。你与谢无咎对着满墙九州舆图推演至五更，逐条拆解中州灵矿缺口与稳住散修灵粮市价的暗策。',
          '天明时谢无咎揉着眉心失笑：“从前我只想着赚够灵石保命，如今被你带得，竟也开始盘算起怎么给天下散修留条活路了。”',
        ],
        outcomeContinueLabel: '收起舆图，辞别暗楼',
        bridgeNote: '与谢无咎共议乱世商策，九州商号间渐传你二人仁商之名。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_act4_nascent_supply',
        label: '动用百宝总号脉络代筹元婴护阵灵石，并巩固全域暗网退路',
        visible: (s) => s.act === 'act4',
        insightTags: ['金丹专属', '140灵石筹码', '暗网退路'],
        effect: {
          timeMonths: 2,
          spiritStones: 140,
          renown: 6,
          setFlags: { xie_deadman_switch: true },
          trackActionKey: 'visit_xie',
          companionUpdates: {
            xie_wujiu: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '金丹筹备成婴之际，他倾百宝商网之力替你腾挪出一笔破境厚资。',
            },
          },
        },
        outcome: [
          '谢无咎拨完最后三颗玄铁算珠，直接推过来一只沉甸甸的乾坤钱匣：“折合一百四十块下品灵石的赤金灵晶，外加九州七十二重镇暗桩随时听候调遣。你若顺利成婴，我百宝斋在九州便真正站稳了脊梁。”',
        ],
        outcomeContinueLabel: '收起钱匣，拱手辞行',
        bridgeNote: '得谢无咎暗中筹措百四十灵石，碎丹成婴的底气厚实了许多。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_act4_gift_amber',
        label: '赠一份【凝神琥珀】助他稳固神识，顺道换阅仙盟高层秘报',
        visible: (s) =>
          s.act === 'act4' && (s.market.holdings.soul_amber?.qty ?? 0) > 0,
        insightTags: ['赠凝神琥珀', '谢无咎大幅好感', '心境与声望'],
        effect: (s) => {
          const prev = s.market.holdings.soul_amber;
          return {
            timeMonths: 2,
            mind: 11,
            renown: 8,
            trackActionKey: 'visit_xie',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'soul_amber', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              xie_wujiu: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '乱世奔波神耗之际，你送来稀世凝神琥珀并共阅仙盟高层暗档。',
              },
            },
          };
        },
        outcome: [
          '连月奔走商战令谢无咎眼底积满倦色，接过温润的【凝神琥珀】时他难得没开玩笑，沉默片刻后从夹层摸出一叠仙盟长老私账递给你：“拿去，里面记着不少大宗老鬼的软肋。”',
        ],
        outcomeContinueLabel: (s) =>
          s.flags.act4_chamber_collapsed ? '收好密报，告别总号' : '收好密报，告别暗楼',
        bridgeNote: '赠凝神琥珀得阅仙盟私账，彼此已是过命交情。',
        next: returnHubFor,
      },
      {
        id: 'v_xie_back',
        label: '拱手寒暄两句便告辞离开',
        next: returnHubFor,
      },
    ],
  },

  visit_shen_qingshuang: {
    id: 'visit_shen_qingshuang',
    act: 'act1',
    title: '寒松论剑',
    subtitle: '故人相会 · 沈清霜',
    location: (s) => {
      const leftSect = Boolean(
        s.flags.shen_left_sect ||
          s.flags.shen_freed_from_sect ||
          s.flags.shen_saved_from_sect
      );
      if (s.act === 'act4') return leftSect ? '北麓松崖 · 隐蔽剑庐' : '中州松岭 · 寒泉石亭';
      if (s.act === 'act3') return leftSect ? '云岭松崖 · 隐蔽剑庐' : '云岭偏亭 · 松风石阶';
      return leftSect ? '青岚外麓 · 僻静松崖' : '青岚山麓 · 断剑亭外松林';
    },
    paragraphs: [
      (s) => {
        if (s.companions.shen_qingshuang.stance === 'estranged') {
          return '松林间剑气森冷。沈清霜远远望见你身影，霜剑未出鞘已透出一股逼人寒意：“飞升崖旧事已断，你我无话可说。”';
        }
        if (!s.companions.shen_qingshuang.met) {
          return '听闻青云剑宗首座沈清霜常在山麓断剑亭独自试剑。你沿着石阶拾级而上，果然见白衣女修立于松影清寒间收剑调息，眉眼清冽如秋水。';
        }
        const repeatVisit = (s.actionUses[`${s.act}:visit_shen`] ?? 0) > 0;
        const leftSect = Boolean(
          s.flags.shen_left_sect ||
            s.flags.shen_freed_from_sect ||
            s.flags.shen_saved_from_sect
        );
        if (s.act === 'act4') {
          if (repeatVisit) {
            return '寒风拂过石案，沈清霜见你再度御剑登崖，反手将半壶清泉推至桌沿：“上回拆的剑路可消化透了？正好再印证一二。”';
          }
          return leftSect
            ? '山风卷落松针，褪去青云旧袍的沈清霜正于崖边石案擦拭霜剑。见你御剑落定，她抬眸微颔：“{{name}}，九州灵脉将枯，近日可曾探得新消息？”'
            : '{{season}}风掠过松岭石亭，沈清霜收剑入鞘，眼底比昔年更添沉静：“{{name}}，如今踏入金丹，这一剑的去处你我心里都更明晰了。”';
        }
        if (s.act === 'act3') {
          if (repeatVisit) {
            return '松影斑驳，沈清霜见你复登云岭，霜剑轻振三寸：“步法比前阵稳了。今日仍旧拆招，还是议一议九州局势？”';
          }
          return leftSect
            ? '云岭僻静松崖间，早已斩去青云旧名的沈清霜收剑望来，眉目清冽却无半分生分：“{{name}}，眼下仙盟耳目四布，你还能抽空上山坐坐，倒真沉得住气。”'
            : '{{season}}风拂过云岭偏亭，沈清霜正以枯枝演练筑基剑势。见你踏阶而来，她收势微颔：“{{name}}，云岭局势日紧，今日正好与你拆两招静静心。”';
        }
        if (leftSect) {
          return repeatVisit
            ? '山外松崖松针满地，避开青云耳目的沈清霜望见你复来，随手折下两段青枝：“看来上回的剑路未白练。来，再试十招。”'
            : '{{season}}风拂过山外僻静松崖，避开青云耳目的沈清霜正以枯枝演练新悟剑势。见你踏阶而来，她收势微颔：“{{name}}，近日风声紧，修行可有滞涩之处？”';
        }
        if (repeatVisit) {
          return '断剑亭外松针满地，沈清霜望见你复来，随手折下两段青枝：“看来上回的剑路未白练。来，再试十招。”';
        }
        return '{{season}}风拂过断剑亭外松林，沈清霜正以枯枝演练青云剑式。见你踏阶而来，她收势微颔：“{{name}}，近日修行可有滞涩之处？”';
      },
    ],
    choices: [
      // === 卷一 / 卷二（凡胎、炼气期） ===
      {
        id: 'v_shen_spar',
        label: '请她折松枝拆解三招剑意，在交锋中打磨自身实战锋芒',
        visible: (s) =>
          (s.act === 'act1' || s.act === 'act2') &&
          s.companions.shen_qingshuang.stance !== 'estranged',
        insightTags: (s) => [
          '修为精进',
          '沈清霜好感',
          s.tags.includes('sword_intent_seed') ? '剑意精纯' : '可得剑意雏形',
        ],
        effect: (s) => ({
          timeMonths: 2,
          might: 7,
          mind: 3,
          righteous: 4,
          trackActionKey: 'visit_shen',
          addTags: ['sword_intent_seed'],
          setFlags: { v_shen_spar_was_met: s.companions.shen_qingshuang.met },
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '青岚松林下与你折枝拆招，赞你悟性凌厉、进境甚快。',
            },
          },
        }),
        outcome: [
          '她折下两段松枝抛给你一支。十余回合间剑影如霜，你被她震得腕骨发麻，却也硬生生逼出了胸中一股凝练剑气。',
          (s) =>
            s.flags.v_shen_spar_was_met
              ? '收势时沈清霜吐出一口白气，眼底多了几分认可：“出招比上回沉稳得多。守住这份锋芒，莫被世局乱了步子。”'
              : '收势时沈清霜吐出一口白气，眼底露出几分认可：“根骨与悟性皆不俗。守住这份锋芒，莫被世局乱了步子。”',
        ],
        outcomeContinueLabel: '谢过指点，下山归去',
        bridgeNote: '与沈清霜在松林切磋剑意，胸中锋芒又利了三分。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_gift_talisman',
        label: '赠她一张坊市备下的【破障符】，提醒她提防暗处冷箭',
        visible: (s) =>
          (s.act === 'act1' || s.act === 'act2') &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          (s.market.holdings.po_zhang_talisman?.qty ?? 0) > 0,
        insightTags: ['赠破障符', '沈清霜大幅好感', '正道声望'],
        effect: (s) => {
          const prev = s.market.holdings.po_zhang_talisman;
          return {
            timeMonths: 1,
            renown: 4,
            righteous: 5,
            trackActionKey: 'visit_shen',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'po_zhang_talisman', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              shen_qingshuang: {
                meet: true,
                markSeen: true,
                affectionDelta: 9,
                chronicle: '你专程送来破障符叮嘱她提防暗算，清冷如她亦露出一丝浅笑。',
              },
            },
          };
        },
        outcome: [
          '沈清霜愣了一下才伸手接过符箓。以她剑道修为原不缺一张二阶符，可听出你话里关切，眉梢冰霜竟化开半分：“多谢。我会贴身收好。”',
        ],
        outcomeContinueLabel: '目送白衣入林，转身下山',
        bridgeNote: '赠予沈清霜破障符后，两人之间那层疏离感又薄了几分。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_debate_dao',
        label: (s) =>
          s.truthClues.includes('clue_stele_gap')
            ? '坐于松崖对饮清泉，与她细推飞升碑背反文背后的真正图谋'
            : '坐于石亭对饮清泉，直问她三千年飞升无回音究竟是何缘故',
        visible: (s) =>
          (s.act === 'act1' || s.act === 'act2') &&
          s.companions.shen_qingshuang.stance !== 'estranged',
        insightTags: (s) => [
          '心境提升',
          s.truthClues.includes('clue_stele_gap') ? '共析碑背反文' : '飞升旧疑交流',
          '沈清霜好感',
        ],
        effect: (s) => ({
          timeMonths: 2,
          mind: 7,
          trackActionKey: 'visit_shen',
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: s.truthClues.includes('clue_stele_gap')
                ? '山外松风间与你细析飞升碑背血色反文，彼此对筑基后追查真相之心愈笃。'
                : '断剑亭中与你夜话三千年飞升疑云，她第一次发现同辈之中竟有人抱持同样疑虑。',
            },
          },
        }),
        outcome: [
          (s) =>
            s.truthClues.includes('clue_stele_gap')
              ? '提及飞升崖碑背那句“七度光落，无一音回”，沈清霜指节轻叩石案，眉目沉静如铁：“反文既被后人削去大半，便说明宗门里早有人察觉端倪却被迫噤声。眼下你我唯有先破筑基，才有资格去九州查个水落石出。”'
              : '听见你的发问，沈清霜握杯的手指微微一顿。沉默良久，她望向青云主峰云海轻声道：“宗门典籍只说天门接引乃无上荣光，可连师尊都不愿细谈历代飞升者的下落。这个问题，我也在找答案。”',
        ],
        outcomeContinueLabel: (s) =>
          Boolean(
            s.flags.shen_left_sect ||
              s.flags.shen_freed_from_sect ||
              s.flags.shen_saved_from_sect
          )
            ? '辞别松崖，下山思索'
            : '辞别石亭，下山思索',
        bridgeNote: (s) =>
          s.truthClues.includes('clue_stele_gap')
            ? '松崖深谈碑背反文后，你与沈清霜对破境追查真相愈发笃定。'
            : '松亭一番深谈，你与沈清霜对三千年飞升疑云皆生出警惕。',
        next: returnHubFor,
      },

      // === 卷三（筑基期 · 真剑越阶演锋、仙盟派系密议、金脉灵砂淬剑） ===
      {
        id: 'v_shen_act3_overmatch',
        label: '云岭松崖以真剑对拆筑基破防剑势，苦练以弱抗强的越阶锋芒',
        visible: (s) =>
          s.act === 'act3' && s.companions.shen_qingshuang.stance !== 'estranged',
        insightTags: ['筑基专属', '淬炼越阶战力底蕴', '修为大进'],
        effect: {
          timeMonths: 2,
          might: 10,
          mind: 5,
          righteous: 4,
          addTags: ['sword_intent_seed'],
          setFlags: { overmatch_drill_act2: true },
          trackActionKey: 'visit_shen',
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '云岭松崖以真剑印证破防关窍，助你凝成足以越阶抗衡的剑势。',
            },
          },
        },
        outcome: [
          '两道真剑剑气在松崖间交错三十余合，剑风削落满地松针！沈清霜以筑基巅峰凌厉剑势摹拟金丹压迫之威逼你出手，直拆到你指节渗血方才收剑。',
          '她递来一枚清创丹，眼底映着寒光：“记住方才那一剑的换气间隙——日后若撞上金丹强敌围杀，靠这一式至少能逼退半息、保住性命。”',
        ],
        outcomeContinueLabel: '收剑调息，离开松崖',
        bridgeNote: '经沈清霜真剑喂招，你身法中已多出一股越阶抗衡的凌厉锋芒。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_act3_sect_intel',
        label: (s) =>
          s.truthClues.includes('clue_alliance_pact')
            ? '密议仙盟「百年贡约」风声与三宗主战、主和两派的真实底细'
            : '密议云岭三宗灵矿分派与「飞升候补」背后的派系暗流',
        visible: (s) =>
          s.act === 'act3' && s.companions.shen_qingshuang.stance !== 'estranged',
        insightTags: ['筑基专属', '仙盟局势研判', '心境与声望'],
        effect: {
          timeMonths: 2,
          mind: 10,
          renown: 5,
          trackActionKey: 'visit_shen',
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '云岭偏亭与你密析三大宗门派系暗流，为后续涉险早作筹谋。',
            },
          },
        },
        outcome: [
          (s) =>
            s.truthClues.includes('clue_alliance_pact')
              ? '沈清霜以剑尖在石案蘸水画出三宗格局：“玄霄长老一派坚称‘纳贡保界壁’是无奈之举，可太乙丹谷里早有年轻执事察觉灵脉不对。真要撼动仙盟，绝不能单凭意气，必须拿出让中立派闭嘴的硬证据。”'
              : '沈清霜以剑尖在石案蘸水画出三宗格局：“青云、太乙与天星三宗看似铁板一块，实则对灵矿分派与近来催逼‘飞升候补’各怀心思。真要查清云岭底细，绝不能单凭意气，须先摸清哪几派心生嫌隙。”',
        ],
        outcomeContinueLabel: '抹去水痕，下山筹谋',
        bridgeNote: '摸清仙盟内部派系分歧后，你看待正道大局不再非黑即白。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_act3_gift_sand',
        label: '赠她一份【金脉灵砂】重淬霜剑剑脊，以备九州恶战',
        visible: (s) =>
          s.act === 'act3' &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          (s.market.holdings.golden_vein_sand?.qty ?? 0) > 0,
        insightTags: ['赠金脉灵砂', '沈清霜大幅好感', '修为与正道'],
        effect: (s) => {
          const prev = s.market.holdings.golden_vein_sand;
          return {
            timeMonths: 2,
            might: 8,
            righteous: 6,
            trackActionKey: 'visit_shen',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'golden_vein_sand', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              shen_qingshuang: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你将稀缺金脉灵砂赠她淬炼本命霜剑，剑鸣清越如应君心。',
              },
            },
          };
        },
        outcome: [
          '赤金灵砂撒入寒泉淬火，本命霜剑发出一声清越龙吟，剑脊细微旧裂瞬间弥合。沈清霜收剑回鞘，眸光罕见地柔和许多：“此剑日后所斩，皆有你一半锋芒。”',
        ],
        outcomeContinueLabel: (s) =>
          Boolean(
            s.flags.shen_left_sect ||
              s.flags.shen_freed_from_sect ||
              s.flags.shen_saved_from_sect
          )
            ? '辞别剑庐，重入尘途'
            : '辞别偏亭，重入尘途',
        bridgeNote: '助沈清霜以金脉灵砂重淬霜剑，两人默契又深一层。',
        next: returnHubFor,
      },

      // === 卷四（金丹期 · 绝壁碎天剑阵、核查斩天旧档、凝神琥珀） ===
      {
        id: 'v_shen_act4_sky_sword',
        label: '绝壁罡风中共演金丹碎天剑阵，推升越阶破阵杀伐之威',
        visible: (s) =>
          s.act === 'act4' && s.companions.shen_qingshuang.stance !== 'estranged',
        insightTags: ['金丹专属', '高阶越阶杀招', '修为与心境大进'],
        effect: {
          timeMonths: 2,
          might: 14,
          mind: 7,
          setFlags: { overmatch_drill_act3: true },
          trackActionKey: 'visit_shen',
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '金丹之境于松崖绝壁共演碎天剑阵，剑气贯云、所向披靡。',
            },
          },
        },
        outcome: [
          '百丈绝壁之上云海翻腾。你与沈清霜双剑齐鸣，以金丹真元合力斩出一道十丈霜虹，将铅灰劫云硬生生劈出一角晴空！',
          '收剑立于崖畔，她发丝拂过冷冽侧脸：“这一剑已有撼动元婴法身之力。天门再高，总有剑锋够得着的那一天。”',
        ],
        outcomeContinueLabel: '收剑御风，辞别松崖',
        bridgeNote: '松崖共演碎天剑阵，你的越阶搏杀底气已臻金丹绝巅。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_act4_zhantian_review',
        label: (s) =>
          s.truthClues.length >= 2
            ? '石案并卷核查历年搜集的天机线索，推演九州枯脉真凶'
            : '石案并卷推演九州灵脉剧枯与各大宗门封山异象',
        visible: (s) =>
          s.act === 'act4' && s.companions.shen_qingshuang.stance !== 'estranged',
        insightTags: ['金丹专属', '并案复核', '心境与声望大进'],
        effect: {
          timeMonths: 2,
          mind: 12,
          renown: 6,
          trackActionKey: 'visit_shen',
          companionUpdates: {
            shen_qingshuang: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '松崖石案前与你逐卷比对九州异象线索，理清大劫来龙去脉。',
            },
          },
        },
        outcome: [
          (s) => {
            const items: string[] = [];
            if (s.truthClues.includes('clue_stele_gap')) items.push('飞升碑反文');
            if (s.truthClues.includes('clue_vein_drain')) items.push('灵脉倒流账');
            if (s.truthClues.includes('clue_alliance_pact')) items.push('仙盟百年贡约');
            if (s.truthClues.includes('clue_zhantian_remnant')) items.push('斩天会四纪遗录');
            if (s.truthClues.includes('clue_tianji_portal')) items.push('转运井灵灰证词');
            if (items.length >= 2) {
              return `石案上摊开你二人历年拼凑的${items.join('、')}与沿途见闻。你们一条条勾连起表象、物证与口供，将天象剧变背后的每一处破绽标得清清楚楚。`;
            }
            return '石案上摊满九州近三年七条灵脉干涸的勘图与各宗动向。你们逐一比对枯竭年月与星象异动，越看越觉背后藏着一只看不见的巨手。';
          },
          '沈清霜合卷轻声道：“实据越密，将来真到天下群雄对峙之时，能醒过来的人便越多。我们不是孤军。”',
        ],
        outcomeContinueLabel: '收齐密卷，下山布势',
        bridgeNote: '与沈清霜并案梳理天机线索，你对未来变局已胸有成竹。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_act4_gift_amber',
        label: '赠一份【凝神琥珀】助她镇压破婴前夕的剑心寒煞',
        visible: (s) =>
          s.act === 'act4' &&
          s.companions.shen_qingshuang.stance !== 'estranged' &&
          (s.market.holdings.soul_amber?.qty ?? 0) > 0,
        insightTags: ['赠凝神琥珀', '沈清霜大幅好感', '心境大进'],
        effect: (s) => {
          const prev = s.market.holdings.soul_amber;
          return {
            timeMonths: 2,
            mind: 12,
            righteous: 6,
            trackActionKey: 'visit_shen',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'soul_amber', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              shen_qingshuang: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你送来罕见凝神琥珀替她抚平破婴前夕剑心寒煞，彼此心照不宣。',
              },
            },
          };
        },
        outcome: [
          '沈清霜将那块暖金色琥珀握入掌心，眉宇间常年挥之不去的寒疲散去大半。她抬眸望你良久，低声说了句“等破婴之后，我陪你去看一场不下雪的春山”。',
        ],
        outcomeContinueLabel: (s) =>
          Boolean(
            s.flags.shen_left_sect ||
              s.flags.shen_freed_from_sect ||
              s.flags.shen_saved_from_sect
          )
            ? '辞别剑庐，心怀暖意'
            : '辞别石亭，心怀暖意',
        bridgeNote: '赠凝神琥珀护她剑心，冰雪剑修对你已彻底敞开心扉。',
        next: returnHubFor,
      },
      {
        id: 'v_shen_back',
        label: '拱手退离松林',
        next: returnHubFor,
      },
    ],
  },

  visit_cang_ming: {
    id: 'visit_cang_ming',
    act: 'act1',
    title: '古剑问计',
    subtitle: '故人相会 · 苍溟',
    location: (s) =>
      s.tags.includes('cangming_reborn') ? '别院石栏 · 夜风对坐' : '静室 · 识海微光',
    paragraphs: [
      (s) => {
        const repeatVisit = (s.actionUses[`${s.act}:visit_cm`] ?? 0) > 0;
        if (s.tags.includes('cangming_reborn')) {
          return repeatVisit
            ? '石栏外寒星冷冽，苍溟见你又提剑推门，哼笑一声把剑抛向空中稳稳接住：“上回那几式吃透了？来罢，再喂你三十招。”'
            : '夜深人静，重塑真身的苍溟正倚在院外石栏边拭剑。见你推门而出，他略抬眼皮，语气仍带着老牌剑尊的倨傲：“怎么，外头又撞见什么解不开的烂摊子了？”';
        }
        return '夜深人静，你盘膝托起怀中微温的【焦黑断玉】，以一缕神识轻轻叩响玉壁。';
      },
      (s) => {
        if (s.tags.includes('cangming_reborn')) return null;
        const repeatVisit = (s.actionUses[`${s.act}:visit_cm`] ?? 0) > 0;
        if (repeatVisit) {
          return '断玉青影才刚浮现，苍溟残魂便冷冷嗤笑：“刚敲过一回又来扰本座清梦。说罢，是带了灵石，还是又想听老家伙扯陈年旧账？”';
        }
        return s.companions.cang_ming.affection >= 25
          ? '识海很快泛起淡淡青影。苍溟虚影在玉光中沉浮不定，语气虽仍带着几分老牌剑尊的倨傲，却少了初见时的防备：“怎么，外头又撞见什么解不开的烂摊子了？”'
          : '玉身震动片刻，苍溟懒洋洋的声音才响起来：“无事不登三宝殿，小辈，拿什么来换本座开口？”';
      },
    ],
    choices: [
      // === 卷一 / 卷二（凡胎、炼气期） ===
      {
        id: 'v_cm_feed_stones',
        label: '以三十五灵石温养断玉，请苍溟传授一式上古行气秘诀',
        visible: (s) => s.act === 'act1' || s.act === 'act2',
        requirement: { minSpiritStones: 35, lockReason: '需灵石 35' },
        insightTags: ['耗35灵石', '修为大进', '苍溟好感'],
        effect: {
          timeMonths: 2,
          spiritStones: -35,
          might: 10,
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '早年你以灵石助他温养剑元，他嘴上嫌少，却大方传了你一式上古行气窍门。',
            },
          },
        },
        outcome: [
          '三十五块灵石瞬间化作清流被断玉吸了个精光。苍溟长出一口气，反手将一道精妙无比的周天行气图打进你脑海：“还算懂事。照着这个练，斗法时灵力回转能快上三成。”',
        ],
        outcomeContinueLabel: '收功起身，重返尘世',
        bridgeNote: (s) =>
          s.act === 'act1'
            ? '得苍溟亲授古剑行气秘诀，凡胎气脉精进颇丰。'
            : '得苍溟亲授古剑行气秘诀，炼气修为精进颇丰。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_ask_history',
        label: '不求功法，只静心听他讲三千年前长明历之前的修仙旧事',
        visible: (s) => s.act === 'act1' || s.act === 'act2',
        insightTags: ['零花费', '心境大增', '苍溟好感'],
        effect: {
          timeMonths: 2,
          mind: 8,
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '深夜静听他追忆三千年前灵气充盈的旧世山河，三千年孤魂话匣子难得打开。',
            },
          },
        },
        outcome: [
          '苍溟沉默了片刻，终究慢慢讲起三千年前山川灵脉纵横、炼气修士亦可御风百里的旧世光景。说到故友与山河俱焚时，他身畔剑气忽然低沉如呜咽。',
          '听完这夜旧事，你再看如今灵气凋敝的九州山河，心境豁然拔高了一层。',
        ],
        outcomeContinueLabel: '辞别静夜，起身离去',
        bridgeNote: '听苍溟追忆三千年前灵脉未枯的旧世，你心中愈发清楚今世之怪。',
        next: returnHubFor,
      },

      // === 卷三（筑基期 · 上古越阶杀招、同源灰尘勘验、金脉灵砂） ===
      {
        id: 'v_cm_act3_overmatch',
        label: '耗七十灵石温养断玉，请教以筑基硬撼金丹的上古越阶杀伐剑理',
        visible: (s) => s.act === 'act3',
        requirement: { minSpiritStones: 70, lockReason: '需灵石 70' },
        insightTags: ['筑基专属', '淬炼越阶战力底蕴', '修为大进'],
        effect: {
          timeMonths: 2,
          spiritStones: -70,
          might: 13,
          setFlags: { overmatch_drill_act2: true },
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '筑基境以灵石温玉求教，他将一式专破高阶护体罡气的上古截脉剑诀授你。',
            },
          },
        },
        outcome: [
          '七十块灵石化作青雾没入焦玉。苍溟双指并剑凌空划出一道诡谲刁钻的截脉弧光：“今世金丹老贼最爱拿境界灵压欺人，你就专打他丹元吞吐的半息空档！练熟这一式，筑基境亦能斩掉他们一只袖子。”',
        ],
        outcomeContinueLabel: '铭记截脉剑理，收功起身',
        bridgeNote: '习得苍溟亲授的上古截脉剑诀，越阶搏杀的筹码实实在在厚了一层。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_act3_dust_audit',
        label: (s) =>
          s.truthClues.some((c) =>
            ['clue_blood_pill_dust', 'clue_ancient_vein_sigil', 'clue_tianji_portal'].includes(c)
          )
            ? '请他以古剑灵觉勘验已得灰尘物证与地脉异象的同源破绽'
            : '请他以古剑灵觉剖析九州灵脉骤枯与上古阵法的异样端倪',
        visible: (s) => s.act === 'act3',
        insightTags: ['筑基专属', '零花费', '心境与证据洞察'],
        effect: (s) => ({
          timeMonths: 2,
          mind: 10,
          renown: 4,
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: s.truthClues.includes('clue_alliance_pact')
                ? '夜半请他勘验下界异象与贡约阵理，拆穿了所谓护界之说的荒谬。'
                : '夜半请他以上古剑觉剖析九州枯脉异象，洞见灵流倒抽之弊。',
            },
          },
        }),
        outcome: [
          (s) => {
            const hasDust = s.truthClues.some((c) =>
              ['clue_blood_pill_dust', 'clue_ancient_vein_sigil', 'clue_tianji_portal'].includes(c)
            );
            const knowsPact = s.truthClues.includes('clue_alliance_pact');
            if (hasDust && knowsPact) {
              return '苍溟嗤笑一声，指尖青焰将你搜集的几粒灰白微尘托起：“护界？真要稳固界壁，阵纹该往外撑，怎会全是往九霄倒抽的漏斗纹？今世仙盟那帮软骨辈，不过是替屠夫递刀还要编套好听话罢了。”';
            }
            if (hasDust) {
              return '苍溟嗤笑一声，指尖青焰将你搜集的几粒灰白微尘托起：“这等阴冷死灰，三千年前本座见得多了——阵纹全是往九霄倒抽的漏斗势，哪是什么自然枯竭？下界被人当成了汲灵之井罢了。”';
            }
            if (knowsPact) {
              return '苍溟冷笑一声，抬指在虚空勾出一道残缺上古灵流图：“什么狗屁护界贡约！真要稳固界壁，灵气该往外补，怎会只剩大宗高坛有气、外域一夕成灰？仙盟那帮软骨辈不过是自欺欺人罢了。”';
            }
            return '苍溟冷笑一声，抬指在虚空勾出一道残缺上古灵流图：“今世修士个个把断脉当成天灾劫数，真是瞎了眼。灵潮若是自然退去，岂会只剩大宗高坛有气、外域一夕成灰？细查地底与账册罢。”';
          },
        ],
        outcomeContinueLabel: '收好勘验札记，退出静室',
        bridgeNote: (s) =>
          s.truthClues.includes('clue_alliance_pact')
            ? '经苍溟从上古阵理逐一勘破，你更看穿了“护界进贡论”的破绽。'
            : '经苍溟从上古阵理剖析枯脉异象，你的眼界又利了几分。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_act3_gift_sand',
        label: '献上一份【金脉灵砂】，供断玉残魂淬炼剑意虚影',
        visible: (s) =>
          s.act === 'act3' && (s.market.holdings.golden_vein_sand?.qty ?? 0) > 0,
        insightTags: ['赠金脉灵砂', '苍溟大幅好感', '修为精进'],
        effect: (s) => {
          const prev = s.market.holdings.golden_vein_sand;
          return {
            timeMonths: 2,
            might: 10,
            trackActionKey: 'visit_cm',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'golden_vein_sand', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              cang_ming: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你以金脉灵砂供养焦黑断玉，连古剑尊都难得夸你出手痛快。',
              },
            },
          };
        },
        outcome: [
          '断玉发出一声痛快剑鸣，将赤金砂砾尽数吞纳。苍溟虚影凝实了三分，难得收起毒舌顺手替你打通了两处隐脉：“算你这小辈识趣。往后遇着棘手强敌，本座多借你两成剑意。”',
        ],
        outcomeContinueLabel: '收起断玉离去',
        bridgeNote: '以金脉灵砂滋养断玉，苍溟的剑魂较先前稳固不少。',
        next: returnHubFor,
      },

      // === 卷四（金丹期 · 真剑实拆/固玉破阶、天门九枢夜谈、凝神琥珀） ===
      {
        id: 'v_cm_act4_real_spar',
        label: '掷八十灵石布下隔绝灵阵，与复生剑尊提真剑实拆三十合碎天剑',
        visible: (s) => s.act === 'act4' && s.tags.includes('cangming_reborn'),
        requirement: { minSpiritStones: 80, lockReason: '需灵石 80' },
        insightTags: ['金丹复生专属', '越阶绝学', '修为暴涨'],
        effect: (s) => ({
          timeMonths: 2,
          spiritStones: -80,
          might: 16,
          mind: 6,
          setFlags: {
            overmatch_drill_act3: true,
            v_cm_reborn_repeat: (s.actionUses[`${s.act}:visit_cm`] ?? 0) > 0,
          },
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 8,
              chronicle: '金丹境夜院布阵与复生的他以真剑实拆三十合，剑意磨砺得愈发悍厉。',
            },
          },
        }),
        outcome: [
          (s) =>
            s.flags.v_cm_reborn_repeat
              ? '八十块灵石撑起院中隔绝灵阵，苍溟拔剑出鞘，三千年前的古剑煞气扑面而来！三十合硬碰硬拆罢，石阶裂纹纵横，他收剑甩去腕间微麻，冷哼一声：“总算没白练，这一手变招比上回快了半息。”'
              : '八十块灵石撑起院中隔绝灵阵，苍溟拔剑出鞘，三千年前的古剑煞气扑面而来！三十合硬碰硬拆罢，石阶裂纹纵横，他收剑甩去腕间微麻，冷哼一声：“久未提真剑，倒没生疏。你这一手变招也算有几分看头。”',
        ],
        outcomeContinueLabel: '收剑饮酒，重返尘世',
        bridgeNote: '与复生苍溟真剑硬撼三十合，你金丹剑锋已具逆伐元婴之势。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_act4_jade_refine',
        label: '以金丹真元合八十灵石固玉，参悟三千年前破阶斩天古诀',
        visible: (s) => s.act === 'act4' && !s.tags.includes('cangming_reborn'),
        requirement: { minSpiritStones: 80, lockReason: '需灵石 80' },
        insightTags: ['金丹断玉专属', '越阶绝学', '修为大进'],
        effect: {
          timeMonths: 2,
          spiritStones: -80,
          might: 14,
          mind: 6,
          setFlags: { overmatch_drill_act3: true },
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 7,
              chronicle: '金丹境以灵元固玉求道，他将长明旧世的破阶剑诀尽数传予识海。',
            },
          },
        },
        outcome: [
          (s) =>
            s.truthClues.includes('clue_changming_night')
              ? '八十块灵石融作金丹清辉灌入焦黑断玉。苍溟低喝一声，将长明元年九剑尊合力撕开金光的半式残锋烙进你丹海：“元婴以前能吃透三成，九州之内便无人能单凭境界压死你！”'
              : '八十块灵石融作金丹清辉灌入焦黑断玉。苍溟低喝一声，将三千年前旧世破阶断阵的半式残锋烙进你丹海：“元婴以前能吃透三成，九州之内便无人能单凭境界压死你！”',
        ],
        outcomeContinueLabel: '敛息收玉，起身视事',
        bridgeNote: '以金丹真元固玉参悟破阶古诀，修为与越阶战力俱进。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_act4_betrayal_talk',
        label: (s) =>
          s.truthClues.includes('clue_changming_night')
            ? '深夜对谈长明元年血战教训，细问当年九剑尊败北之由'
            : '深夜对谈上古剑修迎劫之道，探问他三千年前的旧憾',
        visible: (s) => s.act === 'act4',
        insightTags: ['金丹专属', '零花费', '心境大增'],
        effect: {
          timeMonths: 2,
          mind: 13,
          trackActionKey: 'visit_cm',
          companionUpdates: {
            cang_ming: {
              meet: true,
              markSeen: true,
              affectionDelta: 6,
              chronicle: '深夜追问三千年前旧事，他首次坦陈当年剑阵功败垂成的惨痛教训。',
            },
          },
        },
        outcome: [
          (s) => {
            const lead = s.tags.includes('cangming_reborn')
              ? s.truthClues.includes('clue_changming_night')
                ? '苍溟望向裂纹隐现的铅灰夜空，声音低沉得像生锈铁剑：'
                : '苍溟望向铅灰夜空，声音低沉得像生锈铁剑：'
              : '断玉青光在静室里沉浮微颤，苍溟的声音低沉得像生锈铁剑：';
            return s.truthClues.includes('clue_changming_night')
              ? `${lead}“三千年前我们不是输在剑不够快，是输在孤军冒进、错估了头顶那股威压的底细。真到了开天那一日，绝不可傻乎乎拿肉身硬接——先摸清下界阵眼与后手，才配谈劈开它。”`
              : `${lead}“今世修士以为修到高境便能与天平坐，当年我那帮同袍也是这么想的。记住本座一句话：高天之上从来只论生杀、不讲道义，真到渡劫破关那日，留足后手、莫拿肉身硬接。”`;
          },
        ],
        outcomeContinueLabel: (s) =>
          s.tags.includes('cangming_reborn') ? '牢记旧训，辞别静夜' : '牢记旧训，敛息收玉',
        bridgeNote: '听完太古剑尊的惨痛旧训，你对前路大劫多了一重冷静警惕。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_act4_gift_amber',
        label: '奉上一块【凝神琥珀】，替太古剑尊稳固三千年损耗的魂本',
        visible: (s) =>
          s.act === 'act4' && (s.market.holdings.soul_amber?.qty ?? 0) > 0,
        insightTags: ['赠凝神琥珀', '苍溟大幅好感', '修为与心境'],
        effect: (s) => {
          const prev = s.market.holdings.soul_amber;
          return {
            timeMonths: 2,
            might: 12,
            mind: 8,
            trackActionKey: 'visit_cm',
            grantMarketGoods:
              prev && prev.qty > 0
                ? [{ goodId: 'soul_amber', qty: -1, unitCost: prev.avgCost }]
                : undefined,
            companionUpdates: {
              cang_ming: {
                meet: true,
                markSeen: true,
                affectionDelta: 10,
                chronicle: '你送来稀世凝神琥珀替他温养三千年残损神魂，古剑尊难得动容。',
              },
            },
          };
        },
        outcome: [
          (s) =>
            s.tags.includes('cangming_reborn')
              ? '暖金琥珀一触剑气便化作绵长古息渗入眉心。苍溟闭目静受良久，睁眼时那双冷厉眸子柔和了半分：“三千年了，你是头一个肯花这么大血本给老家伙养魂的。记下了，将来必百倍还你。”'
              : '暖金琥珀一触断玉便化作绵长古息被焦黑玉纹尽数吞纳。识海中的残魂虚影凝实了数分，静默良久方传出柔和半分的低语：“三千年了，你是头一个肯花这么大血本给老家伙养魂的。记下了，将来必百倍还你。”',
        ],
        outcomeContinueLabel: (s) =>
          s.tags.includes('cangming_reborn') ? '拱手辞别，步出静院' : '敛息收玉，起身视事',
        bridgeNote: '以凝神琥珀温养苍溟魂本，你与古剑尊早已生死相托。',
        next: returnHubFor,
      },
      {
        id: 'v_cm_back',
        label: '暂不多扰，起身离去',
        next: returnHubFor,
      },
    ],
  },
};
