import { GameState, ParagraphBlock } from './types';
import {
  formatCalendarDate,
  getAgeYears,
  getSeason,
  toChineseYearNumber,
} from './time';

export function interpolateText(raw: string, state: GameState): string {
  const { profile } = state;
  const robe =
    profile.gender === 'female' ? '素衣' : profile.gender === 'male' ? '青衫' : '青衣';
  const dormMate =
    profile.gender === 'female'
      ? '同舍师姐'
      : profile.gender === 'male'
      ? '同舍师兄'
      : '邻舍同门';

  return raw
    .replace(/\{\{name\}\}/g, profile.name)
    .replace(/\{\{honorific\}\}/g, profile.honorific)
    .replace(/\{\{robe\}\}/g, robe)
    .replace(/\{\{dormMate\}\}/g, dormMate)
    .replace(/\{\{year\}\}/g, formatCalendarDate(state.year, state.seasonIndex))
    .replace(/\{\{season\}\}/g, getSeason(state.seasonIndex))
    .replace(/\{\{age\}\}/g, toChineseYearNumber(getAgeYears(state.ageMonths)));
}

export function resolveParagraphs(
  blocks: ParagraphBlock[],
  state: GameState
): string[] {
  const output: string[] = [];

  for (const block of blocks) {
    if (typeof block === 'string') {
      const text = interpolateText(block, state).trim();
      if (text) output.push(text);
    } else if (typeof block === 'function') {
      const res = block(state);
      if (typeof res === 'string') {
        const text = interpolateText(res, state).trim();
        if (text) output.push(text);
      } else if (Array.isArray(res)) {
        for (const line of res) {
          const text = interpolateText(line, state).trim();
          if (text) output.push(text);
        }
      }
    } else if (block.when(state)) {
      const val = typeof block.text === 'function' ? block.text(state) : block.text;
      if (typeof val === 'string') {
        const text = interpolateText(val, state).trim();
        if (text) output.push(text);
      } else if (Array.isArray(val)) {
        for (const line of val) {
          const text = interpolateText(line, state).trim();
          if (text) output.push(text);
        }
      }
    }
  }

  return output;
}

export function resolveTextValue(
  value: string | ((state: GameState) => string) | undefined,
  state: GameState
): string | undefined {
  if (value === undefined) return undefined;
  const raw = typeof value === 'function' ? value(state) : value;
  return interpolateText(raw, state);
}
