import React, { useEffect, useRef, useState } from 'react';
import { ContentRegistry, Gender, PlayerProfile } from '../engine/types';

interface OpeningWizardProps {
  registry: ContentRegistry;
  hasActiveRun?: boolean;
  onCancel: () => void;
  onComplete: (profile: PlayerProfile) => void;
}

const DEFAULT_HONORIFICS: Record<Gender, string[]> = {
  male: ['公子', '道友', '少侠'],
  female: ['姑娘', '道友', '仙子'],
  other: ['道友', '先生', '阁下'],
};

export const OpeningWizard: React.FC<OpeningWizardProps> = ({
  registry,
  hasActiveRun = false,
  onCancel,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('陆云归');
  const [gender, setGender] = useState<Gender>('male');
  const [honorific, setHonorific] = useState('公子');
  const [originId, setOriginId] = useState(registry.origins[0].id);
  const [openingEventIds, setOpeningEventIds] = useState<string[]>([
    'ev_charred_jade',
    'ev_qingzhou_vow',
  ]);
  const [daoHeartId, setDaoHeartId] = useState(registry.daoHearts[0].id);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const stepTitleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    const timer = window.setTimeout(() => {
      if (step === 1 && nameInputRef.current) {
        nameInputRef.current.focus({ preventScroll: true });
      } else {
        stepTitleRef.current?.focus({ preventScroll: true });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [step]);

  const handleGenderChange = (nextGender: Gender) => {
    setGender(nextGender);
    if (!DEFAULT_HONORIFICS[nextGender].includes(honorific)) {
      setHonorific(DEFAULT_HONORIFICS[nextGender][0]);
    }
  };

  const toggleEvent = (id: string) => {
    setOpeningEventIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const canFinish = name.trim().length > 0 && openingEventIds.length === 2;

  return (
    <main className="wizard-container">
      <div className="wizard-header">
        <div className="wizard-step-label">
          立命定途 · 第 {step} / 3 步
        </div>
        <h1 className="wizard-title" ref={stepTitleRef} tabIndex={-1}>
          {step === 1
            ? '初定姓名与出身'
            : step === 2
            ? '择二桩开局宿缘'
            : '立下最初道心'}
        </h1>
        <p className="wizard-desc">
          {step === 1
            ? '长明三千零一十二年春，十六岁的你正立于青岚界域的风浪之前。尘世漫漫，此去所逢四位故人，缘法皆由心而定。'
            : step === 2
            ? '从八桩旧事中任选两项，既定开局机缘，也埋下半生伏笔与故人缘法。'
            : '这颗最初的道心将在未来数十年的岁月与心魔中，反复叩问你是否仍记得来路。'}
        </p>
      </div>

      {step === 1 && (
        <div>
          <div className="wizard-form-row">
            <label className="wizard-label" htmlFor="player-name-input">
              道号 / 姓名（{name.trim().length} / 12）
            </label>
            <input
              ref={nameInputRef}
              id="player-name-input"
              className="ink-input"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim().length > 0) {
                  setStep(2);
                }
              }}
              placeholder="请输入姓名"
            />
          </div>

          <div className="wizard-form-row">
            <span className="wizard-label">身世性别</span>
            <div className="pill-group">
              {(
                [
                  ['male', '男'],
                  ['female', '女'],
                  ['other', '不拘'],
                ] as const
              ).map(([g, label]) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gender === g}
                  className={`select-pill ${gender === g ? 'selected' : ''}`}
                  onClick={() => handleGenderChange(g)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="wizard-form-row">
            <span className="wizard-label">世人称谓</span>
            <div className="pill-group">
              {DEFAULT_HONORIFICS[gender].map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={honorific === h}
                  className={`select-pill ${honorific === h ? 'selected' : ''}`}
                  onClick={() => setHonorific(h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="wizard-form-row">
            <span className="wizard-label">择一身份出身</span>
            <div className="option-grid">
              {registry.origins.map((origin) => (
                <button
                  key={origin.id}
                  type="button"
                  aria-pressed={originId === origin.id}
                  className={`option-card ${originId === origin.id ? 'selected' : ''}`}
                  onClick={() => setOriginId(origin.id)}
                >
                  <div className="option-card-head">
                    <span className="option-card-title">{origin.name}</span>
                    <span className="option-card-epithet">{origin.epithet}</span>
                  </div>
                  <div className="option-card-body">{origin.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ marginBottom: 14, fontSize: '0.875rem', color: 'var(--text-soft)' }}>
            已选：{openingEventIds.length} / 2 桩开局宿缘
            {openingEventIds.length === 2 ? '（再点新项将替换较早一项）' : ''}
          </div>
          <div className="option-grid">
            {registry.openingEvents.map((ev) => {
              const selected = openingEventIds.includes(ev.id);
              return (
                <button
                  key={ev.id}
                  type="button"
                  aria-pressed={selected}
                  className={`option-card ${selected ? 'selected' : ''}`}
                  onClick={() => toggleEvent(ev.id)}
                >
                  <div className="option-card-head">
                    <span className="option-card-title">
                      {selected ? '✦ ' : ''}
                      {ev.name}
                    </span>
                  </div>
                  <div className="option-card-epithet">{ev.tagline}</div>
                  <div className="option-card-body">{ev.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="option-grid">
          {registry.daoHearts.map((heart) => (
            <button
              key={heart.id}
              type="button"
              aria-pressed={daoHeartId === heart.id}
              className={`option-card ${daoHeartId === heart.id ? 'selected' : ''}`}
              onClick={() => setDaoHeartId(heart.id)}
            >
              <div className="option-card-head">
                <span className="option-card-title">{heart.name}</span>
              </div>
              <div className="option-card-epithet">「{heart.motto}」</div>
              <div className="option-card-body">{heart.desc}</div>
            </button>
          ))}
        </div>
      )}

      <div className="wizard-footer">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => (step === 1 ? onCancel() : setStep((s) => (s - 1) as 1 | 2))}
        >
          {step === 1 ? '返回封面' : '上一步'}
        </button>

        {step < 3 ? (
          <button
            type="button"
            className="primary-btn"
            disabled={
              (step === 1 && name.trim().length === 0) ||
              (step === 2 && openingEventIds.length !== 2)
            }
            onClick={() => setStep((s) => (s + 1) as 2 | 3)}
          >
            下一步
          </button>
        ) : (
          <button
            type="button"
            className="primary-btn"
            disabled={!canFinish}
            onClick={() =>
              onComplete({
                name: name.trim(),
                gender,
                honorific,
                originId,
                openingEventIds,
                daoHeartId,
              })
            }
          >
            {hasActiveRun
              ? '再启新世（前尘可于命盘回溯）'
              : '步入长明三千零一十二年'}
          </button>
        )}
      </div>
    </main>
  );
};
