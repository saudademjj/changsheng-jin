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
    <section className="market-box" aria-label="坊市行市">
      <div className="market-head">
        <h2 className="market-title">{config.venueName}</h2>
        <span className="status-stones">手头灵石：{state.spiritStones}</span>
      </div>
      <div style={{ fontSize: '0.84375rem', color: 'var(--text-soft)' }}>
        {config.venueDesc}
      </div>

      <div className="market-rumor">
        <strong>当前风声：</strong>
        {state.market.rumorText}
      </div>

      <div className="market-indices">
        <span className="index-badge">
          丹药药材：
          <span className={`trend-${elixirTrend.tone}`}>{elixirTrend.label}</span>
        </span>
        <span className="index-badge">
          符箓法器：
          <span className={`trend-${artifactTrend.tone}`}>{artifactTrend.label}</span>
        </span>
        <span className="index-badge">
          古籍奇物：
          <span className={`trend-${curioTrend.tone}`}>{curioTrend.label}</span>
        </span>
      </div>

      <div className="market-subheading">
        {isLiquidationOnly
          ? '末法清仓变现（行至终章，仅可卖出存货换取灵石购置重宝）'
          : '行市货品（可趁大势起伏低买高卖）'}
      </div>
      {isLiquidationOnly ? (
        heldGoodsForLiquidation.length === 0 ? (
          <div className="market-empty-note">
            行囊已无余货待沽，可径直选购下方稀缺奇物。
          </div>
        ) : (
          <div>
            {heldGoodsForLiquidation.map((id) => {
              const good = registry.marketGoods[id];
              const holding = state.market.holdings[id];
              if (!good || !holding) return null;
              const price = getGoodPrice(good, state.market);
              const avgCostDisplay = Math.round(holding.avgCost);
              const unitDelta = Math.round(price - holding.avgCost);
              return (
                <div className="market-row" key={id}>
                  <div>
                    <div className="market-item-name">
                      {good.name}
                      <span
                        style={{
                          marginLeft: 10,
                          fontWeight: 400,
                          color: 'var(--gold)',
                        }}
                      >
                        收购 {price} 灵石
                      </span>
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: '0.78125rem',
                          color: 'var(--jade)',
                        }}
                      >
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
                            ? ` +${unitDelta}/件`
                            : unitDelta < 0
                            ? ` ${unitDelta}/件`
                            : ' 持平'}
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
                      className="mini-btn"
                      aria-label={`全部卖出${good.name}`}
                      onClick={() => handleSellGood(id, holding.qty)}
                    >
                      全卖
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div>
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
                <div>
                  <div className="market-item-name">
                    {good.name}
                    <span style={{ marginLeft: 10, fontWeight: 400, color: 'var(--gold)' }}>
                      {price} 灵石
                    </span>
                    {heldQty > 0 && holding && (
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: '0.78125rem',
                          color: 'var(--jade)',
                        }}
                      >
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
                            ? ` +${unitDelta}/件`
                            : unitDelta < 0
                            ? ` ${unitDelta}/件`
                            : ' 持平'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="market-item-desc">{good.desc}</div>
                </div>
                <div className="market-row-controls">
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
                    className="mini-btn"
                    aria-label={`买入 5 件${good.name}`}
                    disabled={state.spiritStones < price * 5}
                    onClick={() => handleBuyGood(id, 5)}
                  >
                    买 5
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    aria-label={`买满${good.name}`}
                    disabled={state.spiritStones < price * 2}
                    onClick={() =>
                      handleBuyGood(id, Math.floor(state.spiritStones / price))
                    }
                  >
                    买满
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
                    className="mini-btn"
                    aria-label={`全部卖出${good.name}`}
                    disabled={heldQty <= 0}
                    onClick={() => handleSellGood(id, heldQty)}
                  >
                    全卖
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {legacyHoldingIds.length > 0 && (
        <>
          <div className="market-subheading">
            随身旧货清仓（本坊不新进此货，仍可按当前行市变现）
          </div>
          <div>
            {legacyHoldingIds.map((id) => {
              const good = registry.marketGoods[id];
              const holding = state.market.holdings[id];
              if (!good || !holding) return null;
              const price = getGoodPrice(good, state.market);
              const avgCostDisplay = Math.round(holding.avgCost);
              const unitDelta = Math.round(price - holding.avgCost);
              return (
                <div className="market-row" key={id}>
                  <div>
                    <div className="market-item-name">
                      {good.name}
                      <span
                        style={{
                          marginLeft: 10,
                          fontWeight: 400,
                          color: 'var(--gold)',
                        }}
                      >
                        收购 {price} 灵石
                      </span>
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: '0.78125rem',
                          color: 'var(--jade)',
                        }}
                      >
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
                            ? ` +${unitDelta}/件`
                            : unitDelta < 0
                            ? ` ${unitDelta}/件`
                            : ' 持平'}
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
                      className="mini-btn"
                      aria-label={`全部卖出${good.name}`}
                      onClick={() => handleSellGood(id, holding.qty)}
                    >
                      全卖
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
          <div className="market-subheading">
            稀缺奇物（购得可于关键风波与破境中改命）
          </div>
          {visibleRelics.length === 0 ? (
            <div className="market-empty-note">
              本坊压箱奇物皆已归你囊中，坊主再无余货可售。
            </div>
          ) : (
            <div>
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
                    <div>
                      <div className="market-item-name">
                        【{relic.name}】
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: '0.75rem',
                            color: 'var(--accent)',
                            fontWeight: 400,
                          }}
                        >
                          {relic.rarity}
                        </span>
                        <span
                          style={{
                            marginLeft: 10,
                            fontWeight: 400,
                            color: 'var(--gold)',
                          }}
                        >
                          {price} 灵石
                        </span>
                        {reasons.map((r) => (
                          <span className="market-tag-soft" key={r}>
                            {r}
                          </span>
                        ))}
                      </div>
                      <div className="market-item-desc">
                        {relic.desc} {relic.storyUseHint}
                      </div>
                    </div>
                    <div className="market-row-controls">
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
          ✦ {feedback}
        </div>
      )}
    </section>
  );
};
