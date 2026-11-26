import {
  ContentRegistry,
  GameState,
  MarketCategory,
  MarketGoodDefinition,
  MarketState,
} from './types';
import { isMajorArcMissed } from './systems';

function clampIndex(v: number): number {
  return Math.round(Math.max(0.55, Math.min(2.25, v)) * 100) / 100;
}

export function recalculateMarketPulse(state: GameState): MarketState {
  let elixir = 1.0;
  let artifact = 1.0;
  let curio = 1.0;
  const rumors: string[] = [];

  // 卷一基础风声
  if (state.act === 'act1') {
    if (state.flags.act1_rumor_plague && state.flags.act1_heard_blood_pill) {
      elixir += 0.18;
      artifact += 0.08;
      curio += 0.22;
      rumors.push(
        '青州城外怪热流言渐起，清心草稳步看涨，而暗市廉价血丹暗流涌动，反令涉上界古物与护身符箓渐俏'
      );
    } else {
      if (state.flags.act1_rumor_plague) {
        elixir += 0.28;
        artifact += 0.14;
        rumors.push('青州城外似有怪热流言，清心草与护身符箓隐隐看涨');
      }
      if (state.flags.act1_heard_blood_pill) {
        elixir -= 0.25;
        artifact -= 0.14;
        curio += 0.22;
        rumors.push('暗市悄然流出低价血丹与走私符器，寻常灵草走俏不及往年');
      }
    }
  }

  // 卷二动态大势显著撬动三类行市
  const xieHostile =
    state.companions.xie_wujiu.stance === 'rival' ||
    state.companions.xie_wujiu.stance === 'estranged';
  if (state.act === 'act2') {
    if (
      state.flags.arc_plague_active &&
      !state.completedThreads.includes('thread_qingzhou_plague')
    ) {
      elixir += 0.65;
      rumors.push('青州怪疫蔓延，丹药与草药已被炒至高价，一药难求');
    }
    if (state.flags.arc_blood_pill_active && !state.flags.blood_pill_exposed) {
      elixir -= 0.3;
      curio += 0.4;
      rumors.push('黑市血丹暗流涌动，真丹反被冷落，涉上界古物身价渐涨');
    }
    if (state.flags.blood_pill_exposed) {
      elixir += 0.55;
      artifact += 0.35;
      rumors.push('仙盟查封血丹暗坊，正统灵丹顿时紧俏，护身符箓随之走高');
    }
    if (
      state.flags.arc_sword_trial_active &&
      !state.completedThreads.includes('thread_sword_trial') &&
      !isMajorArcMissed(state, 'act2', 'thread_sword_trial')
    ) {
      artifact += 0.55;
      rumors.push('青云试剑在即，外门散修争抢破障符与护身法器');
    }
    if (state.flags.ancient_vein_disturbed) {
      curio += 0.6;
      artifact += 0.25;
      rumors.push('青州古脉异动传开，古碑拓片与上界遗物遭隐世大户暗中扫货');
    }
    if (state.flags.xie_market_tip && state.companions.xie_wujiu.met && !xieHostile) {
      rumors.push('百宝斋私信提示：筑基期临近的散修都在囤积破境丹药，趁贱囤货稳赚不赔');
    } else if (state.flags.qinglan_market_report) {
      rumors.push('听风暗桩与牙行密报：临近筑基的散修都在囤积破境丹药与古碑拓片，贱买贵卖正当时');
    } else if (state.flags.tavern_market_tip) {
      rumors.push('醉仙楼商客风声：临近筑基的散修都在囤积破境丹药与古碑拓片，贱买贵卖正当时');
    }
  }

  // 卷三至卷五：九州动荡与末法潮汐行情
  if (state.act === 'act3') {
    elixir += 0.25;
    artifact += 0.2;
    curio += 0.1;
    if (state.flags.tianji_chamber_hostile || state.flags.blood_pill_exposed) {
      elixir += 0.45;
      rumors.push('天机商行抽紧青州药路，凝丹灵材与丹药一路看涨');
    }
    if (state.flags.qingyun_elders_hostile || state.flags.act3_sect_conflict) {
      artifact += 0.45;
      rumors.push('仙盟各宗剑拔弩张，金脉灵砂与护道法器一物难求');
    }
    if (state.flags.act3_battlefield_open) {
      curio += 0.55;
      rumors.push('长明古战场雾散一角，前朝遗物与养魂奇材身价陡升');
    }
  }

  if (state.act === 'act4') {
    elixir += 0.35;
    artifact += 0.4;
    curio += 0.35;
    if (state.flags.act4_chamber_collapsed) {
      elixir -= 0.35;
      curio += 0.65;
      artifact -= 0.25;
      rumors.push('天机商行分号连环倾覆，囤积灵药与矿砂涌入散市回落，古阵秘宝反而水涨船高');
    } else {
      artifact += 0.3;
      curio += 0.25;
      rumors.push('九州灵脉大乱，各大宗门封山锁矿，高阶灵砂与琥珀有价无市');
    }
  }

  if (state.act === 'act5' || state.act === 'act6') {
    elixir += 0.55;
    artifact += 0.7;
    curio += 0.9;
    rumors.push('裂穹压顶、灵脉尽枯，灵石已难买命，唯护道重宝与上古阵印备受疯抢');
  }

  // 季节微调
  if (state.seasonIndex === 3) {
    // 冬季采药难
    elixir += 0.12;
  } else if (state.seasonIndex === 1) {
    // 夏季药材丰收
    elixir -= 0.08;
  }

  const defaultRumor =
    state.act === 'act3'
      ? '青州周边残矿渐涸，奇珍楼丹材与灵砂普遍走高，九纹凝丹丸与养魂奇材依旧有价无市。'
      : '青岚坊市眼下风平浪静，三行货价平稳，唯有上品筑基丹依旧有价无市。';

  const rumorText =
    rumors.length > 0 ? rumors.join('。') + '。' : defaultRumor;

  return {
    ...state.market,
    elixirIndex: clampIndex(elixir),
    artifactIndex: clampIndex(artifact),
    curioIndex: clampIndex(curio),
    rumorText,
  };
}

export function getCategoryMultiplier(
  market: MarketState,
  category: MarketCategory
): number {
  if (category === 'elixir') return market.elixirIndex;
  if (category === 'artifact') return market.artifactIndex;
  return market.curioIndex;
}

export function getMarketTrendLabel(multiplier: number): {
  label: string;
  tone: 'up' | 'down' | 'flat';
} {
  if (multiplier >= 1.3) return { label: '暴涨 ↑', tone: 'up' };
  if (multiplier >= 1.1) return { label: '微涨 ↗', tone: 'up' };
  if (multiplier <= 0.8) return { label: '骤跌 ↓', tone: 'down' };
  if (multiplier <= 0.92) return { label: '走低 ↘', tone: 'down' };
  return { label: '平稳 —', tone: 'flat' };
}

export function getGoodPrice(
  good: MarketGoodDefinition,
  market: MarketState
): number {
  const mult = getCategoryMultiplier(market, good.category);
  return Math.max(5, Math.round(good.basePrice * mult));
}

export function getRelicPriceReasons(
  state: GameState,
  relicId?: string
): string[] {
  const reasons: string[] = [];
  if (relicId === 'longevity_dew') {
    if (
      state.tags.includes('origin_herbalist') ||
      state.tags.includes('qingzhou_guardian') ||
      state.companions.su_zhiwei.affection >= 20
    ) {
      reasons.push('杏林平价');
    } else if (state.market.elixirIndex > 1.0) {
      reasons.push('义诊限价');
    }
  }
  const xieHostile =
    state.companions.xie_wujiu.stance === 'rival' ||
    state.companions.xie_wujiu.stance === 'estranged';
  if (state.relics.includes('baibao_token') && !xieHostile) {
    reasons.push('玄铁令折');
  } else if (!xieHostile && state.companions.xie_wujiu.affection >= 25) {
    reasons.push('百宝旧交折');
  }
  return reasons;
}

export function getRelicOfferPrice(
  basePrice: number,
  category: MarketCategory,
  state: GameState,
  relicId?: string
): number {
  let mult = getCategoryMultiplier(state.market, category);
  // 九转延寿露豁免怪疫与末法暴涨乘区，杏林旧识另享平价折扣
  if (relicId === 'longevity_dew') {
    mult = Math.min(1.0, mult);
    if (
      state.tags.includes('origin_herbalist') ||
      state.tags.includes('qingzhou_guardian') ||
      state.companions.su_zhiwei.affection >= 20
    ) {
      mult *= 0.78;
    }
  }
  // 持有百宝斋玄铁令或与谢无咎交好享受折扣（与谢无咎反目后折令作废）
  const xieHostile =
    state.companions.xie_wujiu.stance === 'rival' ||
    state.companions.xie_wujiu.stance === 'estranged';
  if (state.relics.includes('baibao_token') && !xieHostile) {
    mult *= 0.85;
  } else if (!xieHostile && state.companions.xie_wujiu.affection >= 25) {
    mult *= 0.9;
  }
  return Math.max(20, Math.round(basePrice * mult));
}

export function buyMarketGood(
  state: GameState,
  good: MarketGoodDefinition,
  qty: number
): { ok: boolean; state: GameState; message: string } {
  if (state.act === 'act5' || state.act === 'act6') {
    return {
      ok: false,
      state,
      message: '行至末法终局，易物会仅收存货不再新售行市货品',
    };
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, state, message: '数量须为正整数' };
  }
  const unitPrice = getGoodPrice(good, state.market);
  const totalCost = unitPrice * qty;
  if (state.spiritStones < totalCost) {
    return { ok: false, state, message: `灵石不足，需 ${totalCost} 灵石` };
  }

  const prev = state.market.holdings[good.id] ?? { qty: 0, avgCost: 0 };
  const newQty = prev.qty + qty;
  // 保留精确浮点均价以维持总成本守恒，杜绝原地买一卖一舍入刷取累计贸易盈利
  const newAvgCost = (prev.qty * prev.avgCost + totalCost) / newQty;

  const nextState: GameState = {
    ...state,
    spiritStones: state.spiritStones - totalCost,
    market: {
      ...state.market,
      holdings: {
        ...state.market.holdings,
        [good.id]: { qty: newQty, avgCost: newAvgCost },
      },
    },
    recentNotices: [
      `购入【${good.name}】×${qty}，花费 ${totalCost} 灵石`,
      ...state.recentNotices.slice(0, 3),
    ],
  };

  return {
    ok: true,
    state: nextState,
    message: `已购入【${good.name}】×${qty}`,
  };
}

export function sellMarketGood(
  state: GameState,
  good: MarketGoodDefinition,
  qty: number
): { ok: boolean; state: GameState; message: string } {
  const prev = state.market.holdings[good.id];
  if (!prev || !Number.isInteger(qty) || prev.qty < qty || qty <= 0) {
    return { ok: false, state, message: '所持货品不足' };
  }

  const unitPrice = getGoodPrice(good, state.market);
  const revenue = unitPrice * qty;
  const exactProfit = (unitPrice - prev.avgCost) * qty;
  const displayProfit = Math.round(exactProfit);
  const remaining = prev.qty - qty;

  const nextHoldings = { ...state.market.holdings };
  if (remaining === 0) {
    delete nextHoldings[good.id];
  } else {
    nextHoldings[good.id] = { qty: remaining, avgCost: prev.avgCost };
  }

  const profitText =
    displayProfit > 0
      ? `（净赚 ${displayProfit} 灵石）`
      : displayProfit < 0
      ? `（折损 ${Math.abs(displayProfit)} 灵石）`
      : '';

  const nextFlags = { ...state.flags };
  if (exactProfit !== 0) {
    const rawPrevProfit = Number(nextFlags.total_trade_profit ?? 0);
    const prevProfit = Number.isFinite(rawPrevProfit) ? rawPrevProfit : 0;
    const updated = Math.round((prevProfit + exactProfit) * 10000) / 10000;
    nextFlags.total_trade_profit = Math.max(0, updated);
  }

  const nextState: GameState = {
    ...state,
    spiritStones: state.spiritStones + revenue,
    flags: nextFlags,
    market: {
      ...state.market,
      holdings: nextHoldings,
    },
    recentNotices: [
      `售出【${good.name}】×${qty}，得 ${revenue} 灵石${profitText}`,
      ...state.recentNotices.slice(0, 3),
    ],
  };

  return {
    ok: true,
    state: nextState,
    message: `已售出【${good.name}】×${qty}，收入 ${revenue} 灵石`,
  };
}

export function buyRelicOffer(
  state: GameState,
  registry: ContentRegistry,
  relicId: string,
  basePrice: number,
  category: MarketCategory
): { ok: boolean; state: GameState; message: string } {
  const relic = registry.relics[relicId];
  if (!relic) return { ok: false, state, message: '未见此物' };
  if (state.relics.includes(relicId)) {
    return { ok: false, state, message: '你已身怀此奇物' };
  }

  const price = getRelicOfferPrice(basePrice, category, state, relicId);
  if (state.spiritStones < price) {
    return { ok: false, state, message: `灵石不足，需 ${price} 灵石` };
  }

  const nextState: GameState = {
    ...state,
    spiritStones: state.spiritStones - price,
    relics: [...state.relics, relicId],
    recentNotices: [
      `耗费 ${price} 灵石收入奇物【${relic.name}】`,
      ...state.recentNotices.slice(0, 3),
    ],
  };

  return {
    ok: true,
    state: nextState,
    message: `已收入奇物【${relic.name}】`,
  };
}
