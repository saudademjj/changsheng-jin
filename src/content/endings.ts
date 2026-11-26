import {
  CompanionId,
  EndingDefinition,
  GameState,
  SceneDefinition,
} from '../engine/types';
import { formatCalendarDate, getAgeYears, toChineseYearNumber } from '../engine/time';
import { isSuZhiweiAlive } from './companions';
import { hasDeepBond, isDaoPartner } from '../engine/systems';

const EARLY_ENDING_IDS = new Set([
  'ending_lifespan',
  'ending_blood_demon',
  'ending_fallen_path',
  'ending_silenced',
  'ending_qingzhou_hearth',
  'ending_merchant_lord',
]);

function isCangMingSealed(state: GameState): boolean {
  return Boolean(state.flags.cangming_sealed || state.flags.act4_cangming_sealed);
}

function isXieHostile(state: GameState): boolean {
  const c = state.companions.xie_wujiu;
  return c.met && (c.stance === 'estranged' || c.stance === 'rival');
}

function isBonded(state: GameState, id: CompanionId): boolean {
  if (id === 'cang_ming' && isCangMingSealed(state)) return false;
  return hasDeepBond(state, id);
}

function isFriendly(state: GameState, id: CompanionId): boolean {
  if (id === 'cang_ming' && isCangMingSealed(state)) return false;
  const c = state.companions[id];
  return c.met && c.stance !== 'estranged' && c.stance !== 'rival' && c.affection >= 30;
}

function formatNames(names: string[]): string {
  return names.join('、');
}

function robeOf(state: GameState): string {
  if (state.profile.gender === 'female') return '素衣';
  if (state.profile.gender === 'male') return '青衫';
  return '青衣';
}

function daoHeartClosingLine(
  s: GameState,
  context:
    | 'sky_broken'
    | 'sky_broken_solo'
    | 'mortal_era'
    | 'gilded'
    | 'demonic'
    | 'hidden'
    | 'ascended'
): string {
  const dh = s.flags.dao_heart;
  if (dh === 'seek_truth') {
    if (context === 'ascended') return '求了一辈子真相，到头来你还是主动合上了眼。';
    if (context === 'mortal_era') return '十六岁那句“我偏要看个明白”，落在今日，化作人间再无虚妄。';
    if (context === 'demonic') return '当年只想把高天的底细看个明白，既已看穿，不如由你来坐那张主位。';
    if (context === 'hidden') return '当年那句“我偏要看个明白”既已有解，往后山高水长，便不必再陪高天演戏。';
    if (context === 'gilded') return '看穿了三千载的账目虚实，你干脆把九霄也一并写进了商盟总账。';
    if (context === 'sky_broken_solo') return '求了百年真相，你用一剑把答案刻在了崩塌的天幕上。';
    return '十六岁那句“我偏要看个明白”，今日算有了回音。';
  }
  if (dh === 'seek_longevity') {
    if (context === 'mortal_era') return '当年立誓唯求己身久存，到头来你亲手把长生连根烧尽，反倒睡得最安稳。';
    if (context === 'ascended') return '你一辈子怕死在岁月里，到头来还是把百年身家交进了云上炉火。';
    return '当年求的是己身久存，走过百年，才算真正把性命握回自己手里。';
  }
  if (dh === 'seek_fortune') {
    if (context === 'gilded') return '昔年想掌财借势、快意人间，这一局连高天都进了你的算盘。';
    if (context === 'mortal_era') return '满囊灵石成了顽石，人间早市的新米与新茶反倒比丹药更实在。';
    if (context === 'ascended') return '算了一世盈亏，最后一笔账还是赔给了漫天金光。';
    return '昔年想着快意人间，兜转百年，好歹没替旁人白做嫁衣。';
  }
  if (dh === 'protect_one') {
    if (context === 'demonic') return '早年只想替人间留一盏灯，如今灯火仍在，只是换了你的魔焰照彻四方。';
    if (context === 'ascended') return '早年说好要替人间留一盏灯，那盏灯到底熄在了云海之下。';
    return '当年立誓“人间总该留一盏灯”，百年风霜过后，那盏灯没灭。';
  }
  return '';
}

function buildCompanionAftermath(
  s: GameState,
  context:
    | 'sky_broken'
    | 'sky_broken_solo'
    | 'mortal_era'
    | 'gilded'
    | 'demonic'
    | 'hidden'
    | 'ascended',
  options?: { skipJadeCangMingNote?: boolean }
): string | null {
  const notes: string[] = [];
  const isFakeDeath = s.realm === 'deity_transform';

  if (s.companions.shen_qingshuang.met) {
    const alreadyLeftSect = Boolean(
      s.flags.shen_left_sect || s.flags.shen_freed_from_sect
    );
    if (
      s.companions.shen_qingshuang.stance === 'estranged' ||
      s.companions.shen_qingshuang.stance === 'rival'
    ) {
      notes.push(
        alreadyLeftSect
          ? '沈清霜至死未原谅旧年决裂，独隐北麓荒崖枯守霜剑，再未与你相见。'
          : '沈清霜至死未原谅旧年决裂，只在青云剑冢枯坐终老，再未下山一步。'
      );
    } else if (context === 'sky_broken' && isBonded(s, 'shen_qingshuang')) {
      notes.push(
        alreadyLeftSect
          ? '早已斩去青云旧名的沈清霜与你同游劫后青山。她剑匣里那半张飞升碑拓片，成了寻常旧纸。'
          : '沈清霜散去青云首座虚名，与你同游劫后青山。剑匣里那半张飞升碑拓片，成了寻常旧纸。'
      );
    } else if (context === 'sky_broken_solo' && isBonded(s, 'shen_qingshuang')) {
      notes.push('沈清霜提剑踏遍北溟与青岚旧地，寻你半生未果，只在断剑亭檐下常年多留一盏风灯。');
    } else if (context === 'mortal_era') {
      if (isDaoPartner(s, 'shen_qingshuang')) {
        notes.push(
          '灵根散尽那日，沈清霜将霜剑挂上青州竹舍的檐梁，执手与你同看山间暮色。昔年最怕孤寒的剑修，终究在人间烟火里找到了长夜归处。'
        );
      } else if (
        s.companions.shen_qingshuang.bondType === 'sworn' ||
        isBonded(s, 'shen_qingshuang')
      ) {
        notes.push(
          alreadyLeftSect
            ? '灵根散尽那日，沈清霜收剑立在松风里，笑说这一回总算能当个寻常剑客了；每逢冬雪初霁，她仍常提一壶梅子酒来你竹舍对坐半日。'
            : '灵根散尽那日，沈清霜解下霜剑挂在青云山门，笑说这一回总算能当个寻常剑客了；每逢冬雪初霁，她仍常提一壶梅子酒来你竹舍对坐半日。'
        );
      } else {
        notes.push(
          alreadyLeftSect
            ? '灵根散尽那日，沈清霜收剑立在松风里，笑说这一回总算能当个寻常剑客了。'
            : '灵根散尽那日，沈清霜解下霜剑挂在青云山门，笑说这一回总算能当个寻常剑客了。'
        );
      }
    } else if (context === 'demonic') {
      notes.push('沈清霜望着换了主人的九霄，长叹一声封剑避世，不降，也不再拔剑。');
    } else if (context === 'ascended' && isFriendly(s, 'shen_qingshuang')) {
      notes.push('沈清霜独望你消失的那道金光许久。次年她提剑孤身北上，再无人听闻消息。');
    } else if (context === 'hidden' && isFriendly(s, 'shen_qingshuang')) {
      notes.push(
        isFakeDeath
          ? alreadyLeftSect
            ? '沈清霜在荒崖客栈听闻仙盟榜上你的陨落死讯沉默良久。次春她在南岭墙头瞥见一道熟悉剑痕，唇角微扬。'
            : '沈清霜盯着仙盟递来的陨落玉牌沉默良久。次春她在南岭客栈墙头瞥见一道熟悉剑痕，唇角微扬。'
          : '沈清霜望着空荡荡的观星石台沉默良久。次春她在南岭客栈墙头瞥见一道熟悉剑痕，唇角微扬。'
      );
    } else if (
      isFriendly(s, 'shen_qingshuang') &&
      context !== 'ascended' &&
      context !== 'hidden'
    ) {
      notes.push(
        alreadyLeftSect
          ? '早已斩去青云旧名的沈清霜另立松崖剑庐，传下“只问道心，不叩伪天”的新剑规。'
          : '沈清霜重整青云旧山门，立下“只问道心，不叩伪天”的新祖训。'
      );
    }
  }

  if (s.companions.xie_wujiu.met) {
    if (isXieHostile(s)) {
      notes.push('谢无咎合上玄铁扇彻底断了往来，独自在南疆商道销声匿迹。');
    } else if (context === 'demonic') {
      notes.push('谢无咎合扇离了中州，临行将旧账封入铁匣，只在南疆冷眼看你这位新主坐江山。');
    } else if (context === 'gilded' && isFriendly(s, 'xie_wujiu')) {
      notes.push('谢无咎执掌九州商盟总账房，逢人便笑谈当年拿灵石逼退上界的荒唐豪举。兄长旧玉佩也安稳躺回祠堂。');
    } else if (context === 'sky_broken' && isBonded(s, 'xie_wujiu')) {
      notes.push('谢无咎把兄长旧玉佩埋入天门焦土，临行拎着两坛老酒笑道，往后太平生意还欠他一半暗股红利。');
    } else if (context === 'sky_broken_solo' && isBonded(s, 'xie_wujiu')) {
      notes.push('谢无咎将兄长旧玉佩与你生前印信一并封入青岚老宅。酒肆小酌时，案头总多摆一只空盏。');
    } else if (context === 'mortal_era') {
      if (isDaoPartner(s, 'xie_wujiu')) {
        notes.push(
          '世间再无灵石可卖，谢无咎笑着合上旧账本改做茶盐丝绸，却把大半光阴都留在了你的青州竹舍里。每逢秋雨，他总温一壶老酒拨弄那枚玄铁算珠，笑说这一世最赚的买卖，便是陪你做一对寻常白首人。'
        );
      } else if (
        s.companions.xie_wujiu.bondType === 'sworn' ||
        isBonded(s, 'xie_wujiu')
      ) {
        notes.push(
          '世间再无灵石可卖，谢无咎摇着折扇改做茶盐丝绸，不过十年又成了九州大商贾。每年春茶新焙，他总亲自赶着马车来你青州竹舍蹭两碗桂花酒，笑骂你散了修为倒比从前更难算计。'
        );
      } else {
        notes.push(
          '世间再无灵石可卖，谢无咎摇着折扇改做茶盐丝绸，不过十年又成了九州大商贾。'
        );
      }
    } else if (context === 'ascended' && isFriendly(s, 'xie_wujiu')) {
      notes.push('谢无咎在百宝斋账簿末页划去你的名姓，把你生前旧印信沉进了青岚湖底。');
    } else if (context === 'hidden' && isFriendly(s, 'xie_wujiu')) {
      notes.push(
        isFakeDeath
          ? '谢无咎合上你已坐化的死讯，摇扇一笑“这笔假死账做得漂亮”，自此再未对外提过你的去向。'
          : '谢无咎合上中州传来的销声匿迹密报，摇扇一笑“这手抽身退场的账算得漂亮”，自此再未对外提过你的去向。'
      );
    } else if (
      isFriendly(s, 'xie_wujiu') &&
      context !== 'gilded' &&
      context !== 'ascended' &&
      context !== 'hidden'
    ) {
      notes.push('谢无咎重开九州商路，把当年与你共查的灵脉旧账刻碑立在青岚街口。');
    }
  }

  if (s.companions.su_zhiwei.met) {
    const suAlive =
      Boolean(s.flags.su_zhiwei_saved_longlife) &&
      !s.flags.su_zhiwei_passed &&
      !s.companions.su_zhiwei.deceased &&
      getAgeYears(s.ageMonths) <= 95;
    const suDistant =
      s.companions.su_zhiwei.stance === 'estranged' ||
      s.companions.su_zhiwei.stance === 'rival' ||
      (Boolean(s.flags.left_qingzhou_coldly) &&
        s.companions.su_zhiwei.affection < 10);
    const suPartner = isDaoPartner(s, 'su_zhiwei') && !suDistant;
    const ayunKeeper =
      getAgeYears(s.ageMonths) >= 120 ? '阿芸一脉传人' : '阿芸';
    if (suDistant) {
      notes.push(
        suAlive
          ? '青州城外药庐灯火如旧。白发苏知微偶闻九州风云，只淡淡合上医卷，昔年仙凡殊途之后，她再未问过你的行踪。'
          : `青州老杏树下药庐仍由${ayunKeeper}续燃灯火。昔年那段冷淡断绝的旧缘，早已随岁华一并沉入青州尘烟。`
      );
    } else if (context === 'mortal_era') {
      if (suPartner && suAlive) {
        notes.push(
          '青州杏林新苗成荫，苏知微靠在竹椅上听你替阿芸念完最后几页《无灵医典》，嘴角含笑。余生虽短，灯火相伴，凡人再不必活在长生阴影之下。'
        );
      } else if (suPartner && !suAlive) {
        notes.push(
          '青州杏林新苗成荫，阿芸一脉承续着《无灵医典》传遍九州；而你每逢桂花时节，总在故去道侣碑前温一盏清茶，静坐至日暮。'
        );
      } else {
        notes.push(
          suAlive
            ? '青州城外杏林新苗成荫，苏知微与阿芸抄录的无灵医典传遍九州。凡人再不必活在长生阴影之下。'
            : getAgeYears(s.ageMonths) >= 120
            ? '青州城外杏林新苗成荫，苏知微留下的无灵医典由杏林后人阿芸一脉续抄传遍九州。凡人再不必活在长生阴影之下。'
            : '青州城外杏林新苗成荫，苏知微留下的无灵医典由阿芸续抄传遍九州。凡人再不必活在长生阴影之下。'
        );
      }
    } else if (suAlive && context === 'demonic') {
      notes.push('青州药庐的灯还亮着。白发苍苍的苏知微听说九霄换了新主，只轻叹一声，把窗闩插紧了半寸。');
    } else if (!suAlive && context === 'demonic') {
      const dustOrSnow = s.seasonIndex === 3 ? '灰雪' : '尘灰';
      notes.push(`青州老杏树下，${ayunKeeper}扫净石碑上的${dustOrSnow}，把药庐旧门掩紧了半扇。`);
    } else if (suAlive && context === 'ascended') {
      notes.push('青州城外白发苍苍的苏知微望见天际金光合拢，在药炉旁沏了一盏再无人来喝的桂花茶。');
    } else if (suAlive && context === 'hidden') {
      notes.push('青州城外，白发苏知微偶有收到南岭捎来的新焙春茶。她猜你瞒过了高天冷眼，在药炉旁笑出了声。');
    } else if (suAlive && suPartner && (context === 'sky_broken' || context === 'gilded')) {
      notes.push(
        '高天压迫尽散那日，你第一时间御剑折返青州杏林。白发苍苍的苏知微正守在药炉旁，听见柴扉轻响，笑着把早已温好的桂花茶递到你手心。'
      );
    } else if (suAlive && suPartner && context === 'sky_broken_solo') {
      notes.push(
        '高天裂穹熄灭那日，青州药庐的灯彻夜未熄。白发苍苍的苏知微将温好的桂花茶摆在案头，静静望着城外官道尽头——纵然九州皆传那道孤锋已归云海，她仍笃信结发之人终有一日会踏月归来。'
      );
    } else if (!suAlive && suPartner && (context === 'sky_broken' || context === 'gilded')) {
      notes.push(
        '高天压迫尽散那日，你独自回到青州老杏树下，替故去道侣拂去碑前落花。她留下的药庐灯火正由阿芸一脉续燃，人间从此安稳。'
      );
    } else if (!suAlive && suPartner && context === 'sky_broken_solo') {
      notes.push(
        `青州老杏树下，${ayunKeeper}替故去师父添满碑前清茶。人间从此再无高天悬炉，唯余山风拂过碑侧新绿。`
      );
    } else if (suAlive) {
      notes.push('青州城外白发苏知微听说高天压迫已散，在药炉旁松了口气，往茶碗里多添了两勺桂花糖。');
    } else if (context === 'ascended') {
      notes.push(`青州药庐灯火由${ayunKeeper}续燃。只是老杏树下的石碑前，再没等来那名容颜不老的故人。`);
    } else {
      notes.push(`青州药庐灯火由${ayunKeeper}续燃。偶尔有路过新绿杏林的旅人，仍会替故人扫净石碑落花。`);
    }
  }

  if (s.companions.cang_ming.met) {
    if (isCangMingSealed(s)) {
      notes.push(
        context === 'ascended' || context === 'hidden'
          ? '那枚被你亲手深封的焦黑断玉彻底归寂，沉入荒泽深泥。高天启闭的轰鸣也未惊动它半分。'
          : '那枚被你亲手深封的焦黑断玉彻底归寂，随天门熄灭沉入荒泽深泥，再无一声剑鸣。'
      );
    } else if (s.companions.cang_ming.stance === 'estranged') {
      notes.push('苍溟留下一声冷嗤彻底沉寂，再未回应过尘世风雨。');
    } else if (s.companions.cang_ming.stance === 'rival' && s.tags.includes('cangming_reborn')) {
      notes.push(
        context === 'ascended' || context === 'hidden'
          ? '重塑真身的苍溟冷冷望了合拢的云裂一眼，提剑独入北疆荒雪，此生再不相见。'
          : '重塑真身的苍溟冷冷望了熄灭的苍穹一眼，提剑独入北疆荒雪，此生再不相见。'
      );
    } else if (s.companions.cang_ming.stance === 'rival') {
      notes.push('焦黑断玉中只余一声冷嗤，昔年古魂再未通声半字。');
    } else if (context === 'demonic' && s.tags.includes('cangming_reborn')) {
      notes.push('苍溟提剑立在崩裂的云海边，偏头丢下一句“斩了旧天，倒自己坐上了旧天的椅子”，转身没入北疆荒雪。');
    } else if (context === 'demonic') {
      notes.push('断玉里的古魂只哼出一句“换汤不换药”，自此彻底沉寂。');
    } else if (context === 'sky_broken' && s.tags.includes('cangming_reborn')) {
      notes.push('重塑真身的苍溟对着熄灭的裂穹大笑三声，替长明元年八位故友斟满烈酒，自此提剑云游新世。');
    } else if (context === 'sky_broken_solo' && s.tags.includes('cangming_reborn')) {
      notes.push('重塑真身的苍溟对着熄灭的苍穹大笑三声，提剑独入北溟寻你踪迹，说你欠他的那顿酒还没算清。');
    } else if (context === 'sky_broken' || context === 'sky_broken_solo') {
      if (!options?.skipJadeCangMingNote) {
        notes.push('天门崩碎那夜，焦黑断玉化作一缕青光散入晨风。三千年孤魂，终于安眠。');
      }
    } else if (context === 'mortal_era') {
      notes.push('灵气散尽前，苍溟洒脱一笑。他说自己本就是长明旧灰，能亲眼看见人间挣脱那座笼子，三千年孤魂也算值了。');
    } else if (context === 'ascended' && s.tags.includes('cangming_reborn')) {
      notes.push('步入金光最后一瞬，孤峰外传来苍溟一声冷叹：“三千载死路，你终究还是走了一遍。”');
    } else if (context === 'ascended') {
      notes.push('步入金光最后一瞬，焦黑断玉发出一声极轻的叹息。旧日悲剧，又重演了一遍。');
    } else if (s.tags.includes('cangming_reborn')) {
      notes.push('苍溟拎着旧剑隐居古战场边缘，替过往散修指点剑道，偶尔还会提起你们并肩走过的岁月。');
    } else if (isFriendly(s, 'cang_ming')) {
      if (context === 'hidden') {
        notes.push('袖中焦黑断玉随你隐入山河烟雨。三千年孤魂偶在醉夜里嗤笑两声，倒也陪你安稳度过漫长春秋。');
      } else if (context === 'gilded') {
        notes.push('袖中焦黑断玉哼出一声“满身铜臭，倒比给高天当柴烧强”，此后偶在夜半作一声清越剑鸣。');
      }
    }
  }

  return notes.length > 0 ? `【故人归宿】${notes.join('')}` : null;
}

export const ENDINGS: Record<string, EndingDefinition> = {
  // ==================== 早期五结局 ====================
  ending_lifespan: {
    id: 'ending_lifespan',
    title: '枯骨问天',
    subtitle: '结局 · 寿尽坐化',
    tier: '陨落',
    poem: '百载浮生如梦过，空山鹤唳旧灯残。长明未照尘间骨，一抔黄土掩孤襟。',
    epilogue: (s) => {
      const age = getAgeYears(s.ageMonths);
      const originMemory = s.tags.includes('origin_orphan')
        ? '十六岁青岚南市檐下的旧雨与丹香'
        : s.tags.includes('origin_scout')
        ? '十六岁北境界碑下的风沙与同袍铁牌'
        : s.tags.includes('origin_fallen_clan')
        ? '十六岁破败旧祠里的春雨与赤铜家印'
        : '十六岁翠微崖上的湿冷松雾与半卷引气诀';
      const realmPhrase =
        s.realm === 'mortal'
          ? '连引气那道凡仙之隔都未曾跨过'
          : s.realm.startsWith('qi_')
          ? '止步炼气，没能叩开筑基天堑'
          : s.realm.startsWith('foundation_')
          ? '修成筑基，仍差半步没能凝出金丹'
          : s.realm === 'golden_core'
          ? `贵为金丹真人，到底熬不过${toChineseYearNumber(s.lifespanYears)}载寿限，没能破壳成婴`
          : `空负${toChineseYearNumber(s.lifespanYears)}载元婴法身，仍没赶在寿尽之前踏破化神关口`;
      const friends = (['shen_qingshuang', 'xie_wujiu', 'su_zhiwei', 'cang_ming'] as CompanionId[])
        .filter((id) => {
          if (!isFriendly(s, id)) return false;
          if (id === 'su_zhiwei') return isSuZhiweiAlive(s);
          if (id === 'cang_ming') return s.tags.includes('cangming_reborn');
          return true;
        })
        .map((id) =>
          id === 'shen_qingshuang'
            ? '沈清霜'
            : id === 'xie_wujiu'
            ? '谢无咎'
            : id === 'su_zhiwei'
            ? '苏知微'
            : '苍溟'
        );
      const jadeCangMingLeft =
        s.companions.cang_ming.met &&
        !s.tags.includes('cangming_reborn') &&
        !isCangMingSealed(s) &&
        isFriendly(s, 'cang_ming');
      const lines = [
        `${formatCalendarDate(s.year, s.seasonIndex)}，${s.profile.name}年届${toChineseYearNumber(age)}岁。${realmPhrase}。`,
        `最后那个静夜，凉风掠过庭阶。你靠在青石榻上合上眼，想起${originMemory}，近得仿佛就在昨日。长生之道向来如此。万千逐仙者，十之八九皆化作这般寂静尘土。`,
      ];
      if (friends.length > 0 && jadeCangMingLeft) {
        lines.push(`尘烟散后，昔日并肩过的${formatNames(friends)}只在故地替你多斟了一盏冷酒。案头那枚焦黑断玉也自此沉寂无声。`);
      } else if (friends.length > 0) {
        lines.push(`尘烟散后，昔日并肩过的${formatNames(friends)}只在故地替你多斟了一盏冷酒。`);
      } else if (jadeCangMingLeft) {
        lines.push('尘烟散后，案头那枚焦黑断玉轻轻一震，自此沉寂无声。');
      }
      lines.push('若有来世，你或许会在岁月催老之前，更早拔剑。');
      return lines;
    },
  },

  ending_blood_demon: {
    id: 'ending_blood_demon',
    title: '血煞焚心',
    subtitle: '结局 · 魔煞反噬',
    tier: '陨落',
    poem: '贪借霜刃斩蓬莱，反惹灰尘锁灵台。莫道捷径无代价，半生道果作劫灰。',
    epilogue: (s) => {
      if (s.act === 'act4' || s.realm === 'golden_core') {
        return [
          '绝巅雷台之上，赤紫天雷引爆体内积郁多年的煞气。猩红裂纹爬满识海。你的心境防线碎了。神智与金丹在劫火里烧成飞灰。',
          `${formatCalendarDate(s.year, s.seasonIndex)}，金丹修士${s.profile.name}吞雷反噬，陨落绝巅。一缕焦灰扶摇入云，被九霄无声吞净。捷径尽头，原是丹炉。`,
        ];
      }
      if (
        s.act === 'act3' ||
        s.realm === 'foundation_early' ||
        s.realm === 'foundation_mid' ||
        s.realm === 'foundation_late'
      ) {
        return [
          '青州枯脉秘窟里，阴煞地气顺脉逆冲。藏在煞气深处的冷语钻进灵台，心境失守，狂暴魔流吞没了最后一缕清明。',
          `${formatCalendarDate(s.year, s.seasonIndex)}，石窟地火骤起。筑基真人${s.profile.name}结丹入魔，化作焦骨残灰。灰尘顺着地缝飘向高天，被无形之手收尽。`,
        ];
      }
      return [
        '血煞筑基丹入腹那夜，猩红药力轰开气海。藏在丹核里的灰白微尘趁势钻入识海，无数冰冷呢喃淹没了神智。',
        `${formatCalendarDate(s.year, s.seasonIndex)}，青岚城西静室火起。炼气修士${s.profile.name}走火入魔，化作一捧灰烬。唯余微尘随风飘向九霄。`,
      ];
    },
  },

  ending_fallen_path: {
    id: 'ending_fallen_path',
    title: '道途折戟',
    subtitle: '结局 · 破境身陨',
    tier: '陨落',
    poem: '强叩仙关霜满剑，气海倾颓意难平。他年若有重来日，先养寒锋再听风。',
    epilogue: (s) => {
      if (
        s.act === 'act4' ||
        s.act === 'act5' ||
        s.realm === 'golden_core' ||
        s.realm === 'nascent_soul'
      ) {
        return [
          '九霄紫雷斩落时，从不听半句不甘。无丹无阵强行逆雷，紫金劫火劈碎护体灵光。尚未成形的道果连同经脉，一并烧作劫灰。',
          `${formatCalendarDate(s.year, s.seasonIndex)}，${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的${s.profile.name}折戟绝巅青石台。孤剑指向长空，只是雷火先至了一步。`,
        ];
      }
      if (
        s.act === 'act3' ||
        s.realm === 'foundation_early' ||
        s.realm === 'foundation_mid' ||
        s.realm === 'foundation_late'
      ) {
        return [
          '灵液强压成丹，最忌底气未足。无丹无阵强催真元坍缩，狂暴灵流在青州秘窟倒冲经脉。两百载道基顷刻倾颓。',
          `${formatCalendarDate(s.year, s.seasonIndex)}，${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的${s.profile.name}坐化于石窟孤灯下。两百载道基，终归败给急切。`,
        ];
      }
      return [
        '破境天堑从不怜悯仓促叩关之人。无丹无阵、底蕴尚浅之下硬冲关口，灵流反噬经脉，气海轰然崩裂。',
        `${formatCalendarDate(s.year, s.seasonIndex)}，${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的${s.profile.name}静坐于青岚孤灯之下，气息渐绝。这一世，差了半寸火候。`,
      ];
    },
  },

  ending_silenced: {
    id: 'ending_silenced',
    title: '怀璧灭口',
    subtitle: '结局 · 越阶遭诛',
    tier: '陨落',
    poem: '孤纸何堪叩虎前，无锋空作掌中烟。长生路上多霜刃，先淬寒芒再问天。',
    epilogue: (s) => {
      const killer = String(s.flags.silencing_killer ?? '高阶大能');
      return [
        `${formatCalendarDate(s.year, s.seasonIndex)}，${s.profile.name}年届${toChineseYearNumber(getAgeYears(s.ageMonths))}岁。身怀秘账，然既无暗网死手牵制，亦乏越阶抗衡之锋，孤身直叩${killer}之门。`,
        '仙途从来不循凡尘公堂律法。高境修士翻手灭口，远比俯首谢罪易如反掌。一掌压落，密账成灰，尸骨无存；次日城中依旧车马喧阗，无人知晓昨夜曾有一名微末修士，欲以一纸薄墨撼动山岳。',
        '若有来世，须先于暗处结成玉石俱焚之死手，或自淬足以跨阶断金的寒锋，再推强敌之扉。',
      ];
    },
  },

  ending_qingzhou_hearth: {
    id: 'ending_qingzhou_hearth',
    title: '青州烟火',
    subtitle: '红尘结局 · 停步杏林',
    tier: '红尘',
    poem: '漫天仙门三千载，不如杏林一盏灯。莫问长生何处去，人间白首亦成真。',
    epilogue: (s) => [
      `${formatCalendarDate(s.year, s.seasonIndex)}，青州细雨不断。${s.profile.name}解下多年佩剑，散去一身锋芒，留在了城外飘着当归与桂花香的小院里。`,
      '没有宗门算计。没有血丹暗市。也没有悬在苍穹上的冷眼。往后岁月，你替苏知微劈柴煎药，看杏花开了又落，时光公平地染白了两人的鬓角。',
      s.realm.startsWith('foundation_')
        ? '多年后，青州老人仍记得城外那对极恩爱的医馆伴侣。谁也不知，院里那位爱在雪夜温酒的人，曾亲手散去两百载筑基大道。'
        : '多年后，青州老人仍记得城外那对极恩爱的医馆伴侣。谁也不知，院里那位爱在雪夜温酒的人，曾距筑基仙门只差半步。',
    ],
  },

  ending_merchant_lord: {
    id: 'ending_merchant_lord',
    title: '灵石通神',
    subtitle: '商道结局 · 青岚巨贾',
    tier: '商道',
    poem: '世人空逐云间鹤，唯我袖藏万里金。算尽灵潮兴替事，一城灯火系吾心。',
    epilogue: (s) => [
      `手握${toChineseYearNumber(s.spiritStones)}枚灵石与纵横青岚的商脉，你看透了飞升传说的虚妄。天门既无归人，何不把实实在在的人间富贵攥在掌心？`,
      `${formatCalendarDate(s.year, s.seasonIndex)}，${s.profile.name}盘下青岚城三座核心灵阁，与百宝斋分庭抗礼又暗通声气。此后余生，宗门买丹看你脸色，散修求宝拜你门庭。你止步炼气，却把整座仙城的命脉拴在了一串算珠里。`,
    ],
  },

  // ==================== 卷五 / 卷六七大终局 ====================
  ending_sever_sky_bonded: {
    id: 'ending_sever_sky_bonded',
    title: '双剑破长明',
    subtitle: '真结局 · 携手断天',
    tier: '真结局',
    poem: '三千劫烬落霜锋，并剑排云斩九重。自此长空无伪诏，人间共看一山松。',
    epilogue: (s) => {
      const displayName = (id: CompanionId) => {
        const base =
          id === 'shen_qingshuang' ? '沈清霜' : id === 'xie_wujiu' ? '谢无咎' : '苍溟';
        return isDaoPartner(s, id) ? `道侣${base}` : base;
      };
      const allBonded = (['shen_qingshuang', 'xie_wujiu', 'cang_ming'] as CompanionId[]).filter(
        (id) => isBonded(s, id)
      );
      const partnerText =
        allBonded.length > 0 ? formatNames(allBonded.map(displayName)) : '生死同道';
      const physicalBonded = allBonded
        .filter((id) => id !== 'cang_ming' || s.tags.includes('cangming_reborn'))
        .map(displayName);
      const jadeBondedOnly =
        physicalBonded.length === 0 &&
        allBonded.includes('cang_ming') &&
        !s.tags.includes('cangming_reborn');
      const clueLine =
        s.truthClues.length >= 9
          ? `百载问道，你遍稽${toChineseYearNumber(s.truthClues.length)}卷天机残录，将长明三千载伪史彻查无遗。`
          : '百载问道，你凭手中旧录刺破了长明三千载伪史。';
      const dhLine = daoHeartClosingLine(s, 'sky_broken');
      const thirdPara = jadeBondedOnly
        ? `漫天金雨渐歇。你摊开掌心，那枚焦黑断玉于山风中碎作漫天青萤，随风散入长空。三千载孤魂借你一剑雪尽旧恨，终得安眠。大劫之后，你辞去新世盟主印信，独步走下天柱残峰。${dhLine}此后岁暮雪夜，案头温酒，总多摆一盏。`
        : `漫天坍塌的金雨里，最难得的是你与故人始终不曾松开彼此的手。劫后九州群修共推你为新世盟主，你一笑辞谢，将印信留予后来之人，唯与${
            physicalBonded.length > 0 ? formatNames(physicalBonded) : partnerText
          }一道离开天柱峰。${dhLine}长生路再漫长，雪夜灯前，终有人同席对酌。`;
      const lines = [
        `${formatCalendarDate(s.year, s.seasonIndex)}，化神修士${s.profile.name}年届${toChineseYearNumber(getAgeYears(s.ageMonths))}岁，与${partnerText}联袂逆冲九大阵眼。万丈白玉天门应锋崩摧，化作漫天金灰坠入云海。`,
        `${clueLine}天门既倾，九州地底倒抽数千年的灵脉终于止竭。次岁春风过青州、拂青岚，枯裂古泉复涌清雾。后世乃废“长明”伪历，改记是年为断天元年。`,
        thirdPara,
      ];
      const comp = buildCompanionAftermath(s, 'sky_broken', {
        skipJadeCangMingNote: jadeBondedOnly,
      });
      if (comp) lines.push(comp);
      return lines;
    },
  },

  ending_sever_sky_solo: {
    id: 'ending_sever_sky_solo',
    title: '孤剑斩天门',
    subtitle: '真结局 · 孤锋破炉',
    tier: '真结局',
    poem: '孤身直上九重烟，一剑掀翻三千年。莫问天门何处去，长空从此任霜寒。',
    epilogue: (s) => {
      const clueLine =
        s.truthClues.length >= 9
          ? `从青岚微末走到此处，你亲手查明${toChineseYearNumber(s.truthClues.length)}卷尘封天机。`
          : '从青岚微末走到此处，你一步步撕开了旧天的伪装。';
      const dhLine = daoHeartClosingLine(s, 'sky_broken_solo');
      const lines = [
        `九霄云海炸开万丈金灰那日，正是${formatCalendarDate(s.year, s.seasonIndex)}。${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的${s.profile.name}孤身逆上接引金柱，一剑劈断第九阵眼。长明旧纪的牧灵大阵彻底成了过往。`,
        `${clueLine}那一剑几乎燃尽化神道果。坠回尘世时你${robeOf(s)}焦黑、满头霜发，却替九州换来一片再无窥视的自由苍穹。${dhLine}`,
        '百年后，各大山门皆在山巅立起无名持剑石像。酒肆散修常争论那位斩天老祖是坐化了还是隐在北溟。唯独谁也不再信白日飞升的空话。',
      ];
      const comp = buildCompanionAftermath(s, 'sky_broken_solo');
      if (comp) lines.push(comp);
      return lines;
    },
  },

  ending_mortal_new_era: {
    id: 'ending_mortal_new_era',
    title: '无灵新世',
    subtitle: '真结局 · 凡尘永安',
    tier: '真结局',
    poem: '焚尽灵根牧草烟，九霄冷眼闭长天。人间从此无仙劫，岁岁杏花照麦田。',
    epilogue: (s) => {
      const clueLine =
        s.truthClues.length >= 9
          ? `百年稽考所得${toChineseYearNumber(s.truthClues.length)}卷秘辛，自此尽作仙纪墓志。`
          : '百年寻得的旧世真相，自此尽作仙纪墓志。';
      const dhLine = daoHeartClosingLine(s, 'mortal_era');
      const suAlivePartner =
        isDaoPartner(s, 'su_zhiwei') &&
        Boolean(s.flags.su_zhiwei_saved_longlife) &&
        !s.flags.su_zhiwei_passed &&
        !s.companions.su_zhiwei.deceased &&
        getAgeYears(s.ageMonths) <= 95;
      const suDeceasedPartner = isDaoPartner(s, 'su_zhiwei') && !suAlivePartner;
      const closingPara = suAlivePartner
        ? `一身修为散入山河，容颜重归岁月雕琢。你回到青州城外，推开那扇积了数十年风露的竹篱。药炉的火没灭，老杏树下坐着满头银丝的苏知微。听见你的脚步声，她慢慢抬起头，看清你鬓边新生的几缕白发，忽然笑着红了眼眶：“这回……你可算能陪我一起慢慢老了。”你在杏林旁筑起三间竹舍，晨看炊烟，暮煎药茶。${dhLine}此后千秋万代，人间生老病死皆循四时自然，头顶之上，再无悬炉。`
        : suDeceasedPartner
        ? `一身修为散入山河，容颜重归岁月雕琢。你回到青州城外，老杏树下那方青石碑前落满白瓣。你拂去碑上尘土，将那枚贴身藏了半生的桂花结发锦囊轻轻放在碑前，又在杏林旁筑起三间竹舍，替她守住这炉永远不灭的药火。${dhLine}此后千秋万代，人间生老病死皆循四时自然，头顶之上，再无悬炉。`
        : `一身修为散入山河，容颜重归岁月雕琢。你回到青州城外，在杏林旁筑起三间竹舍，晨观农人耕麦，暮看稚子放鸢。${dhLine}此后千秋万代，人间生老病死皆循四时自然，头顶之上，再无悬炉。`;
      const lines = [
        `一道素白清光掠过九州山河，凡人血脉深处被上界播下的灵根牧种，随之化作青烟散尽。${formatCalendarDate(s.year, s.seasonIndex)}，${s.profile.name}年届${toChineseYearNumber(getAgeYears(s.ageMonths))}岁，于绝巅逆转无灵归尘大阵；既失灵机牵引，九霄白玉天门于死寂之中永闭不启。`,
        `${clueLine}灵潮退尽，行囊中累年积攒的灵石悉成顽石。九州仙宗次第散去，御剑凌霄之旧事，不出数代便只留作茶楼旧话与古籍残篇。`,
        closingPara,
      ];
      const comp = buildCompanionAftermath(s, 'mortal_era');
      if (comp) lines.push(comp);
      return lines;
    },
  },

  ending_gilded_realm: {
    id: 'ending_gilded_realm',
    title: '万金镇山河',
    subtitle: '商道终局 · 九州商盟',
    tier: '商道',
    poem: '仙炉亦算盈亏账，万城金网锁苍穹。莫道商贾无侠骨，一纸契书镇九重。',
    epilogue: (s) => {
      const hasDeed = s.relics.includes('spirit_vein_deed');
      const useBaibaoNet =
        s.companions.xie_wujiu.met &&
        !isXieHostile(s) &&
        s.companions.xie_wujiu.affection >= 30;
      const netName = useBaibaoNet ? '百宝商盟暗网' : '七十二城散修金网';
      const ageCn = toChineseYearNumber(getAgeYears(s.ageMonths));
      const deedLine = hasDeed
        ? `${formatCalendarDate(s.year, s.seasonIndex)}，${s.profile.name}以${ageCn}岁化神之身挥动九州灵脉契。上界接引使算清破阵代价，冷然闭门而退。`
        : `${formatCalendarDate(s.year, s.seasonIndex)}，${s.profile.name}以${ageCn}岁化神之身调动${netName}与千金商契重分地气。上界接引使算清破阵代价，冷然闭门而退。`;
      const secondPara = hasDeed
        ? '手握中州至青州三大主矿地权，你在废墟上立起总商盟，反哺枯脉、重定灵石通兑之法。昔日高高在上的正道大宗开脉采石，也要向你递帖缴税。'
        : `手中虽无半座正宗灵矿，你凭七十二城散修兑票与${useBaibaoNet ? '百宝暗网' : '自建地下金网'}织成无矿金网，以银票流通反制大宗独霸。化神老祖置办丹材，亦须走你的总号过账。`;
      const dhLine = daoHeartClosingLine(s, 'gilded');
      const lines = [
        `三十六座大城同时燃起灵石烽火。百万灵石与商契结成的赤金天网横亘云端。${deedLine}`,
        secondPara,
        `世人笑称你连上界仙人都算进了账本。你倚在悬空总楼栏杆边轻拨算珠，俯瞰九州通衢灯火初上。${dhLine}账本翻过新页，万城星火不夜。九霄冷眼，终究算不过人间烟火。`,
      ];
      const comp = buildCompanionAftermath(s, 'gilded');
      if (comp) lines.push(comp);
      return lines;
    },
  },

  ending_demonic_devour: {
    id: 'ending_demonic_devour',
    title: '以魔吞界',
    subtitle: '魔道终局 · 逆吞九霄',
    tier: '魔道',
    poem: '既以苍生作大药，何妨反噬九霄炉。黑焰卷尽金光色，从此青冥换新主。',
    epilogue: (s) => {
      const dhLine = daoHeartClosingLine(s, 'demonic');
      const lines = [
        `黑焰逆卷金柱。半扇天门的纯阳仙元被生生撕进吞煞魔炉。${formatCalendarDate(s.year, s.seasonIndex)}，${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的${s.profile.name}立于崩闭的裂穹下，逼退上界使者，换了九州头顶的天。`,
        '凶威压境，万宗俯首。你以玄渊绝壁为都自立九州共主，昔日仙盟残部尽递降表，万里库藏与残存灵脉悉归号令。无人敢抬头。',
        `后世史书毁誉参半。有人骂你铁腕残酷，也有人暗自庆幸在你执掌山河的两千载里，高天再没降下过一缕收割金光。${dhLine}玄渊殿上黑焰未熄。旧猎人退场了，新天还睁着眼。`,
      ];
      const comp = buildCompanionAftermath(s, 'demonic');
      if (comp) lines.push(comp);
      return lines;
    },
  },

  ending_earth_immortal: {
    id: 'ending_earth_immortal',
    title: '红尘散仙',
    subtitle: '隐世终局 · 瞒天逍遥',
    tier: '隐世',
    poem: '巧借蝉衣瞒冷眼，一蓑烟雨下孤峰。布衣不入长明录，醉看沧桑万里风。',
    epilogue: (s) => {
      const isFakeDeath = s.realm === 'deity_transform';
      const lifespanText = isFakeDeath ? '两千载' : '千载';
      const dhLine = daoHeartClosingLine(s, 'hidden');
      const firstSentence = isFakeDeath
        ? `天门收割名录合拢那日，高天多了一笔“已陨”的朱批，南岭松道上却多出一名戴竹笠的${robeOf(s)}旅人。`
        : `绝巅金裂冷漠移去那日，九州少了一位即将化神的元婴大能，南岭松道上却多出一名戴竹笠的${robeOf(s)}旅人。`;
      const lines = [
        `${firstSentence}${formatCalendarDate(s.year, s.seasonIndex)}，${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的${s.profile.name}巧瞒高天冷眼，从此销声匿迹。`,
        `行囊揣着半生盘缠，胸中藏着旧世秘辛。你走过新旧交替的城郭，时而在小镇酒肆替人写几副春联，时而在荒野古庙独酌赏月。${lifespanText}寿元在握。不必替宗门卖命，也不必替苍生扛天。${dhLine}`,
        `数百年后，江南茶楼偶有传闻。靠窗那位容颜不老的${robeOf(s)}酒客，听书人讲起天门旧事时，总端着粗瓷茶碗笑而不语。`,
      ];
      const comp = buildCompanionAftermath(s, 'hidden');
      if (comp) lines.push(comp);
      return lines;
    },
  },

  ending_false_ascension: {
    id: 'ending_false_ascension',
    title: '金光大药',
    subtitle: '飞升终局 · 仙炉余烬',
    tier: '飞升',
    poem: '白日霓裳迎鹤去，人间犹颂羽化名。谁知九霄青玉鼎，一缕灵灰万载轻。',
    epilogue: (s) => {
      const isOutcast =
        s.tags.includes('demonic_sovereign') ||
        s.tags.includes('sect_rebel') ||
        s.alignment.righteous <= -20;
      const dhLine = daoHeartClosingLine(s, 'ascended');
      const isQingyun =
        s.tags.includes('qingyun_outer') || s.flags.act2_primary_route === 'qingyun';
      const thirdPara = isOutcast
        ? '百年后，坊间野史仍在争论那位桀骜强人缘何临门自投金光。残破山门不敢替你立碑，唯余飞升崖碑背那道血色反文，在山风里一天天风化。'
        : isQingyun
        ? '百年后，青云宗立起白石碑。碑面赞你“白日飞升，万代楷模”，山风掠过光洁冰冷的碑背，再无人记得那道曾被剑气削残的血色反文。碑白如骨。'
        : '百年后，九州仙盟立起白石碑。碑面赞你“白日飞升，万代楷模”，山风掠过光洁冰冷的碑背，再无人记得那道曾被剑气削残的血色反文。碑白如骨。';
      const lines = [
        `万众跪拜的目光里，${toChineseYearNumber(getAgeYears(s.ageMonths))}岁的化神修士${s.profile.name}于${formatCalendarDate(s.year, s.seasonIndex)}步入接引金光。百年修为与记忆在云海融成灵液，无声汇入上界青玉仙炉。`,
        `此生纵然几度触及旧秘、攒下厚重修为，临门一刻你仍踏上了无数先辈走过的旧路。${dhLine}白玉巨门合拢。九州灵脉陷入漫长枯寂，只等下一纪重新蓄满药材。`,
        thirdPara,
      ];
      const comp = buildCompanionAftermath(s, 'ascended');
      if (comp) lines.push(comp);
      return lines;
    },
  },
};

// 结局承载场景（确保引擎路由图100%闭环）
export const ENDING_SCENES: Record<string, SceneDefinition> = Object.fromEntries(
  Object.values(ENDINGS).map((ending) => [
    ending.id,
    {
      id: ending.id,
      act: EARLY_ENDING_IDS.has(ending.id) ? 'act2' : 'act6',
      title: ending.title,
      subtitle: ending.subtitle,
      location: '长生烬 · 命盘收束',
      isEndingTrigger: ending.id,
      paragraphs: [ending.poem],
      choices: [],
    } satisfies SceneDefinition,
  ])
);
