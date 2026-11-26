import React, { useEffect, useState } from 'react';
import { ContentRegistry, GameState, MarketSceneConfig } from '../engine/types';
import {
  buyMarketGood,
  buyRelicOffer,
  getGoodPrice,
  getMarketTrendLabel,
  getRelicOfferPrice,
  getRelicPriceReasons,
  sellMarketGood,
} from '../engine/economy';
import { AppIcon } from './Icon';

interface MarketPanelProps {
  config: MarketSceneConfig;
  state: GameState;
  registry: ContentRegistry;
  onUpdateState: (next: GameState) => void;
}

export const MarketPanel: React.FC<MarketPanelProps> = ({
  config,
  state,
  registry,
  onUpdateState,
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const [sessionBoughtIds, setSessionBoughtIds] = useState<string[]>([]);

  useEffect(() => {
    setFeedback('');
    setSessionBoughtIds([]);
  }, [config.venueName, state.runId]);

  const elixirTrend = getMarketTrendLabel(state.market.elixirIndex);
  const artifactTrend = getMarketTrendLabel(state.market.artifactIndex);
  const curioTrend = getMarketTrendLabel(state.market.curioIndex);

  const visibleRelics = config.relicOffers.filter(
    (offer) =>
      sessionBoughtIds.includes(offer.relicId) ||
      !offer.when ||
      offer.when(state)
  );
  const hasBuyableRelics = visibleRelics.some(
    (offer) => !state.relics.includes(offer.relicId)
  );

  const isLiquidationOnly = state.act === 'act5' || state.act === 'act6';

  const heldGoodsForLiquidation = isLiquidationOnly
    ? Object.keys(state.market.holdings).filter(
        (gid) =>
          (state.market.holdings[gid]?.qty ?? 0) > 0 &&
          Boolean(registry.marketGoods[gid])
      )
    : [];

  const legacyHoldingIds = isLiquidationOnly
    ? []
    : Object.keys(state.market.holdings).filter(
        (gid) =>
          !config.goodsIds.includes(gid) &&
          (state.market.holdings[gid]?.qty ?? 0) > 0 &&
          Boolean(registry.marketGoods[gid])
      );

  const handleBuyGood = (goodId: string, qty: number) => {
    const good = registry.marketGoods[goodId];
    if (!good) return;
    const res = buyMarketGood(state, good, qty);
    setFeedback(res.message);
    if (res.ok) onUpdateState(res.state);
  };

  const handleSellGood = (goodId: string, qty: number) => {
    const good = registry.marketGoods[goodId];
    if (!good) return;
    const res = sellMarketGood(state, good, qty);
    setFeedback(res.message);
    if (res.ok) onUpdateState(res.state);
  };

  const handleBuyRelic = (offer: MarketSceneConfig['relicOffers'][number]) => {
    const res = buyRelicOffer(
      state,
      registry,
      offer.relicId,
      offer.basePrice,
      offer.category
    );
    setFeedback(res.message);
    if (res.ok) {
      setSessionBoughtIds((prev) =>
        prev.includes(offer.relicId) ? prev : [...prev, offer.relicId]
      );
      onUpdateState(res.state);
    }
  };

  return (
    <section className="market-section" aria-label="坊市行市">
      <div className="market-head">
        <h2 className="market-title">{config.venueName}</h2>
        <span className="status-stones">灵石 {state.spiritStones}</span>
      </div>

      <div className="market-rumor">
        <strong>风声：</strong>
        {state.market.rumorText}
      </div>

      <div className="market-indices">
        <span>
          丹药：
          <span className={`trend-${elixirTrend.tone}`}>{elixirTrend.label}</span>
        </span>
        <span>
          法器：
          <span className={`trend-${artifactTrend.tone}`}>{artifactTrend.label}</span>
        </span>
        <span>
          奇物：
          <span className={`trend-${curioTrend.tone}`}>{curioTrend.label}</span>
        </span>
      </div>

      <h3 className="market-subheading">
        {isLiquidationOnly ? '末法出清' : '行市货品'}
      </h3>
      {isLiquidationOnly ? (
        heldGoodsForLiquidation.length === 0 ? (
          <div className="market-empty-note">
            {hasBuyableRelics
              ? '行囊已无余货待沽，可径直选购下方稀缺奇物。'
              : '行囊已无余货待沽，本坊奇物亦已悉数易主。'}
          </div>
        ) : (
          <div className="market-list">
            {heldGoodsForLiquidation.map((id) => {
              const good = registry.marketGoods[id];
              const holding = state.market.holdings[id];
              if (!good || !holding) return null;
              const price = getGoodPrice(good, state.market);
              const avgCostDisplay = Math.round(holding.avgCost);
              const unitDelta = Math.round(price - holding.avgCost);
              return (
                <div className="market-row" key={id}>
                  <div className="market-item-main">
                    <div className="market-item-name">
                      <span>{good.name}</span>
                      <span className="market-item-meta">收购 {price} 灵石</span>
                      <span className="market-item-meta">
                        已持 {holding.qty}（均价 {avgCostDisplay}）
                        <span
                          className={
                            unitDelta > 0
                              ? 'pnl-up'
                              : unitDelta < 0
                              ? 'pnl-down'
                              : 'pnl-flat'
                          }
                        >
                          {unitDelta > 0
                            ? ` · 盈 ${unitDelta}`
                            : unitDelta < 0
                            ? ` · 折 ${Math.abs(unitDelta)}`
                            : ' · 持平'}
                        </span>
                      </span>
                    </div>
                    <div className="market-item-desc">{good.desc}</div>
                  </div>
                  <div className="market-row-controls">
                    <button
                      type="button"
                      className="mini-btn"
                      aria-label={`卖出 1 件${good.name}`}
                      onClick={() => handleSellGood(id, 1)}
                    >
                      卖 1
                    </button>
                    <button
                      type="button"
                      className="mini-btn intent-secondary"
                      aria-label={`全部卖出${good.name}`}
                      onClick={() => handleSellGood(id, holding.qty)}
                    >
                      悉数脱手
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="market-list">
          {config.goodsIds.map((id) => {
            const good = registry.marketGoods[id];
            if (!good) return null;
            const price = getGoodPrice(good, state.market);
            const holding = state.market.holdings[id];
            const heldQty = holding?.qty ?? 0;
            const avgCostDisplay = holding ? Math.round(holding.avgCost) : 0;
            const unitDelta = holding ? Math.round(price - holding.avgCost) : 0;
            return (
              <div className="market-row" key={id}>
                <div className="market-item-main">
                  <div className="market-item-name">
                    <span>{good.name}</span>
                    <span className="market-item-meta">{price} 灵石</span>
                    {heldQty > 0 && holding && (
                      <span className="market-item-meta">
                        已持 {heldQty}（均价 {avgCostDisplay}）
                        <span
                          className={
                            unitDelta > 0
                              ? 'pnl-up'
                              : unitDelta < 0
                              ? 'pnl-down'
                              : 'pnl-flat'
                          }
                        >
                          {unitDelta > 0
                            ? ` · 盈 ${unitDelta}`
                            : unitDelta < 0
                            ? ` · 折 ${Math.abs(unitDelta)}`
                            : ' · 持平'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="market-item-desc">{good.desc}</div>
                </div>
                <div className="market-row-controls market-row-controls-trade">
                  <button
                    type="button"
                    className="mini-btn"
                    aria-label={`买入 1 件${good.name}`}
                    disabled={state.spiritStones < price}
                    onClick={() => handleBuyGood(id, 1)}
                  >
                    买 1
                  </button>
                  <button
                    type="button"
                    className="mini-btn intent-secondary"
                    aria-label={`买入 5 件${good.name}`}
                    disabled={state.spiritStones < price * 5}
                    onClick={() => handleBuyGood(id, 5)}
                  >
                    买 5
                  </button>
                  <button
                    type="button"
                    className="mini-btn intent-secondary"
                    aria-label={`买满${good.name}`}
                    disabled={state.spiritStones < price * 2}
                    onClick={() =>
                      handleBuyGood(id, Math.floor(state.spiritStones / price))
                    }
                  >
                    尽数购入
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    aria-label={`卖出 1 件${good.name}`}
                    disabled={heldQty <= 0}
                    onClick={() => handleSellGood(id, 1)}
                  >
                    卖 1
                  </button>
                  <button
                    type="button"
                    className="mini-btn intent-secondary"
                    aria-label={`全部卖出${good.name}`}
                    disabled={heldQty <= 0}
                    onClick={() => handleSellGood(id, heldQty)}
                  >
                    悉数脱手
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {legacyHoldingIds.length > 0 && (
        <>
          <h3 className="market-subheading">随身旧货</h3>
          <div className="market-list">
            {legacyHoldingIds.map((id) => {
              const good = registry.marketGoods[id];
              const holding = state.market.holdings[id];
              if (!good || !holding) return null;
              const price = getGoodPrice(good, state.market);
              const avgCostDisplay = Math.round(holding.avgCost);
              const unitDelta = Math.round(price - holding.avgCost);
              return (
                <div className="market-row" key={id}>
                  <div className="market-item-main">
                    <div className="market-item-name">
                      <span>{good.name}</span>
                      <span className="market-item-meta">收购 {price} 灵石</span>
                      <span className="market-item-meta">
                        已持 {holding.qty}（均价 {avgCostDisplay}）
                        <span
                          className={
                            unitDelta > 0
                              ? 'pnl-up'
                              : unitDelta < 0
                              ? 'pnl-down'
                              : 'pnl-flat'
                          }
                        >
                          {unitDelta > 0
                            ? ` · 盈 ${unitDelta}`
                            : unitDelta < 0
                            ? ` · 折 ${Math.abs(unitDelta)}`
                            : ' · 持平'}
                        </span>
                      </span>
                    </div>
                    <div className="market-item-desc">{good.desc}</div>
                  </div>
                  <div className="market-row-controls">
                    <button
                      type="button"
                      className="mini-btn"
                      aria-label={`卖出 1 件${good.name}`}
                      onClick={() => handleSellGood(id, 1)}
                    >
                      卖 1
                    </button>
                    <button
                      type="button"
                      className="mini-btn intent-secondary"
                      aria-label={`全部卖出${good.name}`}
                      onClick={() => handleSellGood(id, holding.qty)}
                    >
                      悉数脱手
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {config.relicOffers.length > 0 && (
        <>
          <h3 className="market-subheading">稀缺奇物</h3>
          {visibleRelics.length === 0 ? (
            <div className="market-empty-note">
              本坊镇阁奇物皆已归你囊中，坊主再无余货可售。
            </div>
          ) : (
            <div className="market-list">
              {visibleRelics.map((offer) => {
                const relic = registry.relics[offer.relicId];
                if (!relic) return null;
                const owned = state.relics.includes(offer.relicId);
                const price = getRelicOfferPrice(
                  offer.basePrice,
                  offer.category,
                  state,
                  offer.relicId
                );
                const reasons = getRelicPriceReasons(state, offer.relicId);
                return (
                  <div className="market-row" key={offer.relicId}>
                    <div className="market-item-main">
                      <div className="market-item-name">
                        <span>【{relic.name}】</span>
                        <span className="market-item-accent">{relic.rarity}</span>
                        <span className="market-item-meta">{price} 灵石</span>
                        {reasons.length > 0 && (
                          <span className="market-item-accent">
                            {reasons.join(' · ')}
                          </span>
                        )}
                      </div>
                      <div className="market-item-desc">
                        {relic.desc} {relic.storyUseHint}
                      </div>
                    </div>
                    <div className="market-row-controls market-row-controls-relic">
                      <button
                        type="button"
                        className="mini-btn"
                        aria-label={owned ? `已拥有奇物${relic.name}` : `买下奇物${relic.name}`}
                        disabled={owned || state.spiritStones < price}
                        onClick={() => handleBuyRelic(offer)}
                      >
                        {owned ? '已入囊中' : '买下'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {feedback && (
        <div className="market-feedback" role="status" aria-live="polite">
          <AppIcon name="sparkle" />
          <span>{feedback}</span>
        </div>
      )}
    </section>
  );
};
