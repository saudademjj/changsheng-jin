import { CompanionDefinition, CompanionId, CompanionStance, GameState } from '../engine/types';
import { getAgeYears } from '../engine/time';
import { isSuZhiweiDeceased } from '../engine/systems';

function shenLeftSect(s: GameState): boolean {
  return Boolean(
    s.flags.shen_left_sect ||
      s.flags.shen_freed_from_sect ||
      s.flags.shen_saved_from_sect
  );
}

export function isSuZhiweiAlive(s: GameState): boolean {
  return !isSuZhiweiDeceased(s);
}

function isSuPassed(s: GameState): boolean {
  return isSuZhiweiDeceased(s);
}

export const COMPANIONS: Record<CompanionId, CompanionDefinition> = {
  shen_qingshuang: {
    id: 'shen_qingshuang',
    name: '沈清霜',
    title: (s) => {
      if (s.companions.shen_qingshuang.stance === 'estranged') {
        const foughtTogetherOnce =
          shenLeftSect(s) &&
          !s.flags.betrayed_shen_at_stele &&
          (Boolean(s.flags.shen_saved_from_sect) || s.flags.act3_sect_plan === 'heist');
        if (foughtTogetherOnce) return '独行剑客 · 昔年故交';
        if (shenLeftSect(s)) return '独行剑客 · 宿怨故敌';
        return '青云执剑者 · 陌路旧人';
      }
      if (s.companions.shen_qingshuang.stance === 'rival') {
        return shenLeftSect(s) ? '独行剑客 · 锋芒相向' : '青云执剑者 · 锋芒相向';
      }
      if (shenLeftSect(s)) return '斩枷剑客 · 叛宗逆行者';
      return '青云剑宗内门首座';
    },
    genderLabel: '女',
    faction: '青云剑宗 · 正道',
    encounterHint: '倾向正道、投考宗门或携【断剑残帖】时有缘相逢。',
    bio: (s) => {
      if (s.companions.shen_qingshuang.stance === 'estranged') {
        const foughtTogetherOnce =
          shenLeftSect(s) &&
          !s.flags.betrayed_shen_at_stele &&
          (Boolean(s.flags.shen_saved_from_sect) || s.flags.act3_sect_plan === 'heist');
        if (foughtTogetherOnce) {
          return '曾与你共斩宗门旧枷，终因道途分歧割袍断义。她独自仗剑隐于北麓风雪，再不肯与你同路。';
        }
        if (shenLeftSect(s)) {
          return '早已远离青云，旧年血仇未曾淡去。她独自仗剑隐于北麓风雪，如今相逢只余冷锋与杀意。';
        }
        return '白衣霜剑依旧凛冽，旧年裂痕再难弥合。如今相逢，她眼底只余冷锋与戒备。';
      }
      if (s.companions.shen_qingshuang.stance === 'rival') {
        return shenLeftSect(s)
          ? '虽已褪去青云旧名，却与你道途相左。相逢之际霜剑半出，彼此皆留着三分警醒与锋芒。'
          : '白衣霜剑凛冽如昔，因旧事分歧与你锋芒相向。道途未明前，她始终对你存着戒备与审视。';
      }
      if (shenLeftSect(s)) {
        return '亲手斩碎「飞升候补」玉牌、褪去青云旧名的独行剑客。多年风霜磨去首座拘泥，掌中霜剑始终直指九霄伪门。';
      }
      if (s.truthClues.includes('clue_stele_gap')) {
        return '白衣佩寒剑，性情清冷克己。自从飞升崖夜见碑背血色反文后，她不再迷信宗门古训，暗中追查三千年飞升无归音背后的隐情。';
      }
      return '白衣佩寒剑，性情清冷克己，被视作青云宗百年来最有望叩开天门的剑道奇才。外人只敬她无垢剑心，少有人看懂她眉间深藏的疑虑。';
    },
    truthPieceTitle: '飞升碑断代',
  },
  xie_wujiu: {
    id: 'xie_wujiu',
    name: '谢无咎',
    title: (s) => {
      if (
        s.companions.xie_wujiu.stance === 'estranged' ||
        s.companions.xie_wujiu.stance === 'rival'
      ) {
        return '百宝斋旧主 · 合扇故敌';
      }
      if (s.flags.act4_chamber_collapsed) return '九州百宝总号执事';
      return '暗市「百宝斋」少东家';
    },
    genderLabel: '男',
    faction: '青岚暗市 · 商道奇才',
    encounterHint: '踏入青岚暗市、投身坊市商机或携【染血密信】时有缘相逢。',
    bio: (s) => {
      if (
        s.companions.xie_wujiu.stance === 'estranged' ||
        s.companions.xie_wujiu.stance === 'rival'
      ) {
        return '玄铁折扇彻底对你合拢。这位最讲究信义与账本的商道奇才，将你划入了此生最沉的一笔死账。';
      }
      if (s.flags.act4_chamber_collapsed) {
        return s.flags.xie_new_order_founded
          ? '撕毁独霸总章、颁行九州通兑公契的仁商魁首。兄长旧恨已见天日，他仍摇着那柄玄铁扇，笑看九州七十二重镇民心归向。'
          : '以百年家底击溃天机商行、执掌九州暗网总账的商道魁首。兄长旧恨已见天日，他仍摇着那柄玄铁扇，笑看世间灵石起落。';
      }
      if (s.truthClues.includes('clue_tianji_portal')) {
        return '常摇一柄玄铁折扇，笑意温和，话锋总落回筹码与盈亏。暗港深井残佩揭穿了当年城头白日入光的傀儡幻影，得知兄长真身早化炉灰后，他执算盘的手愈发冷定。';
      }
      if (
        s.truthClues.includes('clue_blood_pill_dust') ||
        Boolean(s.flags.blood_arc_step1)
      ) {
        return '常摇一柄玄铁折扇，笑意温和，话锋总落回筹码与盈亏。他暗中散尽万金追查上界古物与天机商行黑账，只因昔年修至金丹巅峰的兄长在一场「飞升接引」后音讯全无。';
      }
      return '常摇一柄玄铁折扇，笑意温和，话锋总落回筹码与盈亏。世人骂他唯利是图、正魔皆通，无人看透他高价收购前朝残简与上界古物的真正缘由。';
    },
    truthPieceTitle: '灵脉倒流账',
  },
  su_zhiwei: {
    id: 'su_zhiwei',
    name: '苏知微',
    title: (s) => {
      if (isSuPassed(s)) {
        return s.daoPartnerId === 'su_zhiwei' || s.companions.su_zhiwei.bondType === 'dao_partner'
          ? '已辞世 · 故去红尘道侣'
          : '已辞世 · 青州杏林传灯人';
      }
      if (s.daoPartnerId === 'su_zhiwei' || s.companions.su_zhiwei.bondType === 'dao_partner') {
        return '红尘结发道侣 · 杏林医者';
      }
      if (
        (s.flags.su_zhiwei_saved_longlife || getAgeYears(s.ageMonths) >= 52) &&
        (s.act === 'act4' || s.act === 'act5' || s.act === 'act6')
      ) {
        return '青州银发凡医';
      }
      return '青州杏林医者';
    },
    genderLabel: '女',
    faction: '青州城外 · 凡尘杏林',
    encounterHint: '心系红尘、游历青州疫区或怀【青州旧约】时有缘相逢。',
    bio: (s) => {
      if (isSuPassed(s)) {
        const exploredBlindspot =
          s.truthClues.includes('clue_mortal_blindspot') ||
          s.truthClues.includes('clue_mortal_bloodline') ||
          s.completedThreads.includes('thread_qingzhou_plague') ||
          s.completedThreads.includes('thread_act3_hearth');
        if (exploredBlindspot) {
          return '天生无灵根的青州凡尘女医，穷尽一生记录无灵病案与上古盲区之理，已于岁月尽头安然长眠。她留下的医典与药炉灯火，如今由徒弟阿芸代为续燃。';
        }
        return '天生无灵根的青州凡尘女医，一生守着城外杏林与药炉行医济世，已于岁月尽头安然长眠。如今药庐灯火，由徒弟阿芸代为续燃。';
      }
      if (s.flags.su_zhiwei_saved_longlife) {
        if (s.act === 'act2') {
          return '曾以凡躯独撑青州怪疫的医女。得【九转延寿露】洗去沉疴后，气色渐复，仍守着青州杏林药炉静候你安稳筑基。';
        }
        return '曾以凡躯独撑青州怪疫的医女。得【九转延寿露】洗去沉疴后，两鬓虽添霜雪，仍守着药炉与《无灵医典》，替茫茫仙途留下一盏凡尘暖灯。';
      }
      if (s.act === 'act1' || s.act === 'act2') {
        return '天生无灵根的青州凡尘医女，有一双稳住濒死魂魄的手。世人逐长生、争机缘，唯她独守城外三亩杏林与一炉药火，淡然护着一方凡俗百姓。';
      }
      return '天生无灵根的凡尘医女，有一双稳住濒死魂魄的手。世人逐长生，忘寒暑。唯她独守城外三亩杏林与一炉药火。你容颜长驻，白发却已悄悄爬上她眉梢。';
    },
    truthPieceTitle: '无灵之盲区',
  },
  cang_ming: {
    id: 'cang_ming',
    name: '苍溟',
    title: (s) => {
      if (s.flags.cangming_sealed || s.flags.act4_cangming_sealed) {
        return '永封断玉 · 归寂古魂';
      }
      if (s.tags.includes('cangming_reborn')) return '重塑真身 · 太古剑尊';
      if (s.truthClues.includes('clue_changming_night')) {
        return '长明元年断玉残魂';
      }
      return '焦黑断玉 · 古旧残魂';
    },
    genderLabel: '男',
    faction: '神秘古息 · 断玉渊源',
    encounterHint: '携【焦黑断玉】或于古脉绝境中濒死共鸣时苏醒相见。',
    bio: (s) => {
      if (!s.companions.cang_ming.met) {
        return '素未谋面，仅余一缕若隐若现的古旧剑意沉眠于焦玉深处。';
      }
      if (s.flags.cangming_sealed || s.flags.act4_cangming_sealed) {
        return '寒渊雷夜遭你以金丹剑印彻底封死于断玉深处。三千年孤魂归于沉寂，再未吐露半字剑鸣。';
      }
      if (s.tags.includes('cangming_reborn')) {
        return s.companions.cang_ming.stance === 'rival' ||
          s.companions.cang_ming.stance === 'estranged'
          ? '借雷火重凝真身的太古剑尊。因昔年积怨与你拔剑反目，誓要在天门大开前再分剑锋高下。'
          : '寒渊雷夜重凝真身的长明元年剑尊。嘴硬毒舌的老怪脾性一点没改，玄青剑锋愿意与你平肩共指九霄。';
      }
      if (
        s.companions.cang_ming.stance === 'rival' ||
        s.companions.cang_ming.stance === 'estranged'
      ) {
        return s.truthClues.includes('clue_changming_night')
          ? '断玉里蛰伏着长明大劫的古剑残魂。因道途分歧与你彼此猜忌，虽仍寄身玉中，言辞间却满是冷锋与提防。'
          : '断玉里蛰伏着一缕来历成谜的古老剑魂。因屡生芥蒂而与你彼此猜忌，虽暂寄玉中，却始终对你留着三分冷锋与提防。';
      }
      if (s.truthClues.includes('clue_changming_night')) {
        return '断玉里蛰伏着一缕古老剑魂，言辞孤傲毒舌，动辄嗤笑今世功法粗陋。他是长明大劫的余烬。愿替你破局，旧剑却未曾入鞘。';
      }
      return '断玉里蛰伏着一缕来历未明的古老剑魂，言辞孤傲毒舌，动辄嗤笑今世功法粗陋。虽偶有指点破局之意，旧剑锋芒却始终未曾入鞘。';
    },
    truthPieceTitle: '长明元年之夜',
  },
};

export const STANCE_LABELS: Record<CompanionStance, { label: string; tone: string }> = {
  unmet: { label: '素未谋面', tone: 'muted' },
  stranger: { label: '一面之缘', tone: 'neutral' },
  rival: { label: '道途相左', tone: 'danger' },
  confidant: { label: '推心知己', tone: 'warm' },
  bonded: { label: '心意相许', tone: 'accent' },
  estranged: { label: '陌路决裂', tone: 'danger' },
};
