import { GameState, Season } from './types';

export const START_YEAR = 3012;
export const START_AGE_MONTHS = 16 * 12; // 16岁
export const SEASONS: Season[] = ['春', '夏', '秋', '冬'];

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function toChineseYearNumber(num: number): string {
  const n = Math.floor(num);
  if (!Number.isFinite(n) || n <= 0) return '零';
  if (n >= 10000) return String(n);
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  let result = '';
  if (thousands > 0) result += `${DIGITS[thousands]}千`;
  if (hundreds > 0) {
    result += `${DIGITS[hundreds]}百`;
  } else if (thousands > 0 && (tens > 0 || ones > 0)) {
    result += '零';
  }
  if (tens > 0) {
    if (tens === 1 && thousands === 0 && hundreds === 0) {
      result += '十';
    } else {
      result += `${DIGITS[tens]}十`;
    }
  } else if (hundreds > 0 && ones > 0) {
    result += '零';
  }
  if (ones > 0) result += DIGITS[ones];
  return result;
}

export function getSeason(seasonIndex: number): Season {
  const idx = Math.floor(seasonIndex);
  return SEASONS[Number.isFinite(idx) ? ((idx % 4) + 4) % 4 : 0];
}

export function getAgeYears(ageMonths: number): number {
  return Math.floor(ageMonths / 12);
}

export function formatCalendarDate(year: number, seasonIndex: number): string {
  return `长明${toChineseYearNumber(year)}年 · ${getSeason(seasonIndex)}`;
}

export function formatTimeSpan(months: number): string {
  if (months <= 0) return '须臾';
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths}个月`;
  if (remMonths === 0) return `${years}载`;
  return `${years}载零${remMonths}月`;
}

export function yearsSinceAgeMonths(
  currentAgeMonths: number,
  pastAgeMonths?: number
): number {
  if (pastAgeMonths === undefined) return 0;
  return Math.max(0, Math.floor((currentAgeMonths - pastAgeMonths) / 12));
}

export interface TimeAdvanceResult {
  year: number;
  seasonIndex: number;
  ageMonths: number;
  lifespanExceeded: boolean;
  notice?: string;
}

export function computeTimeAdvance(
  state: GameState,
  deltaMonths: number
): TimeAdvanceResult {
  if (deltaMonths <= 0) {
    return {
      year: state.year,
      seasonIndex: state.seasonIndex,
      ageMonths: state.ageMonths,
      lifespanExceeded: getAgeYears(state.ageMonths) >= state.lifespanYears,
    };
  }

  const newAgeMonths = state.ageMonths + deltaMonths;
  const elapsedMonths = newAgeMonths - START_AGE_MONTHS;
  const nextYear = START_YEAR + Math.floor(elapsedMonths / 12);
  const nextSeasonIndex = Math.floor((((elapsedMonths % 12) + 12) % 12) / 3);

  const lifespanExceeded = getAgeYears(newAgeMonths) >= state.lifespanYears;
  const notice =
    deltaMonths >= 3
      ? `光阴流转：${formatTimeSpan(deltaMonths)}（${formatCalendarDate(nextYear, nextSeasonIndex)}）`
      : undefined;

  return {
    year: nextYear,
    seasonIndex: nextSeasonIndex,
    ageMonths: newAgeMonths,
    lifespanExceeded,
    notice,
  };
}
