import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { CONTENT_REGISTRY } from '../../content';
import { CompanionSanctuary } from '../../ui/CompanionSanctuary';
import { DrawerPanels, FOG_ENDING_HINTS, RELIC_ORIGIN_HINTS } from '../../ui/DrawerPanels';
import { EndingView } from '../../ui/EndingView';
import { MarketPanel } from '../../ui/MarketPanel';
import { ReaderView } from '../../ui/ReaderView';
import { TopStatusBar } from '../../ui/TopStatusBar';
import { WorldStatusPanel } from '../../ui/WorldStatusPanel';
import {
  advanceChoice,
  applyEffect,
  commitTransition,
  createInitialState,
  getResolvedChoices,
} from '../scheduler';
import { recalculateMarketPulse } from '../economy';
import { resolveParagraphs, resolveTextValue } from '../template';
import {
  canCommitBond,
  canTriggerMilestone1,
  commitCompanionBond,
  getSanctuaryActivities,
  giveSanctuaryGift,
  isSuAct4FarewellStage,
  isSuAct5SeniorStage,
  performSanctuaryActivity,
  triggerMilestone1,
} from '../sanctuary';
import {
  getCompanionStatusBadge,
  getInvestigationProgress,
  isCompanionDeceased,
  isCompanionSealed,
} from '../systems';
import {
  getActProgressSnapshot,
  getActTransitionEcho,
  getFactionStandings,
  getRealmLadder,
  getWorldClimateSnapshot,
  getWorldRegions,
} from '../worldview';
import {
  ActId,
  CompanionId,
  GameState,
  Gender,
  PlayerProfile,
} from '../types';

const SRC_ROOT = `${ts.sys.getCurrentDirectory().replace(/\\/g, '/')}/src`;
const ALLOWED_PLACEHOLDERS = new Set([
  'name',
  'honorific',
  'robe',
  'dormMate',
  'year',
  'season',
  'age',
]);

// ==================== 定稿名句保护锁（Golden Lines Lock） ====================
const GOLDEN_LINES: Array<{ id: string; relPath: string; text: string }> = [
  { id: 'G1', relPath: 'ui/TitleScreen.tsx', text: '天门无归人' },
  { id: 'G2', relPath: 'content/act3.ts', text: '人活一世，还能求什么' },
  { id: 'G3', relPath: 'content/act4.ts', text: '人间这一卷公账，我自替你守之' },
  { id: 'G4', relPath: 'content/act4.ts', text: '别忘了这山脚下，还有千万盏亮着的灯' },
  { id: 'G5', relPath: 'content/endings.ts', text: '你可算能陪我一起慢慢老了' },
];

// ==================== Layer 1：双区词法红线配置 ====================
type CopyZone = 'A' | 'B';

interface ExtractedLiteral {
  relPath: string;
  line: number;
  zone: CopyZone;
  propName: string;
  isCompleteLiteral: boolean;
  text: string;
}

const ZONE_B_FILE_PREFIXES = ['ui/', 'engine/storage.ts', 'engine/time.ts'];

const ZONE_B_PROP_NAMES = new Set([
  'subtext',
  'insightTags',
  'notice',
  'notices',
  'lockReason',
  'reason',
  'reasons',
  'summary',
  'checkpointLabel',
  'logSummary',
  'tag',
  'storyUseHint',
  'encounterHint',
  'breakthroughProgressText',
  'statusText',
  'standingLabel',
  'powerStatus',
  'powerSources',
  'deadmanSwitches',
  'realmGoal',
  'shortLabel',
  'veinLabel',
  'trendLabel',
  'lifespanText',
  'warningText',
  'leverageSummary',
  'message',
  'error',
  'hint',
]);

const ZONE_B_VAR_NAMES = new Set([
  'notice',
  'breakthroughProgressText',
  'warningText',
  'leverageSummary',
]);

const SKIP_PROP_NAMES = new Set([
  'id',
  'key',
  'className',
  'aria-label',
  'ariaLabel',
  'role',
  'type',
  'href',
  'src',
  'd',
  'viewBox',
  'fill',
  'stroke',
  'next',
  'nextSceneId',
  'sceneId',
  'startSceneId',
  'isEndingTrigger',
  'trackActionKey',
  'setReturnSceneId',
  'hasRelic',
  'hasTag',
  'category',
  'tier',
  'tone',
]);

// 全站绝对禁词（Zone A + Zone B 均拦截）
const GLOBAL_FORBIDDEN_TERMS: Array<{ term: string; reason: string }> = [
  // 现代网词 / 粗鄙出戏词
  { term: '不讲武德', reason: '现代网络热词' },
  { term: '怂货', reason: '现代粗鄙口语' },
  { term: '算盘精', reason: '现代谐谑词' },
  { term: '辩经', reason: '现代网络用语' },
  { term: '搬砖', reason: '现代网络用语' },
  { term: '画大饼', reason: '现代职场黑话' },
  { term: '工具人', reason: '现代二次元/网络词' },
  { term: '剧情杀', reason: '元游戏黑话' },
  { term: '发便当', reason: '元游戏黑话' },
  { term: '割韭菜', reason: '现代网络金融词' },
  { term: '内卷', reason: '现代网络热词' },
  { term: '躺平', reason: '现代网络热词' },
  { term: '绷不住', reason: '现代网络热词' },
  { term: '拉胯', reason: '现代网络热词' },
  { term: '打工人', reason: '现代网络热词' },
  { term: '社畜', reason: '现代网络热词' },
  { term: '氪金', reason: '元游戏黑话' },
  { term: '降维打击', reason: '现代科幻热词' },
  { term: '底层逻辑', reason: '现代互联网黑话' },
  { term: '颗粒度', reason: '现代互联网黑话' },
  { term: '金字塔尖', reason: '现代西式隐喻' },
  { term: '平仓放药', reason: '现代金融黑话' },
  { term: '撤单止损', reason: '现代金融黑话' },
  { term: '真元微操', reason: '现代游戏黑话' },
  { term: '先富起来', reason: '现代政治经济口号' },
  { term: '金丹大忙人', reason: '现代出戏调侃' },
  { term: '买个教训', reason: '现代出戏提示语' },
  { term: '拜把子', reason: '违和江湖俗词' },
  { term: '平辈兄弟', reason: '单性别硬编码称谓' },
  { term: '算你小子懂孝敬', reason: '单性别出戏口语' },
  { term: '从天庭嘴里', reason: '异世界观串台（应为高天/伪天门）' },
  { term: '够本', reason: '出戏现代口语' },
  { term: '实打实', reason: '现代口语' },
  { term: '零耗时', reason: '现代游戏术语' },
  { term: '低吸高抛', reason: '现代股市术语' },
  { term: '八五折', reason: '现代商业折扣表述' },
  { term: '灵石本位崩盘', reason: '现代金融术语' },
  { term: '金融霸权', reason: '现代金融术语' },
  { term: '隐藏结局', reason: '第四面墙词（统一用终局/隐世归宿）' },
  { term: '宿缘回收', reason: '第四面墙词' },
  { term: '伏笔回收', reason: '第四面墙词' },
  // 世界观终审已清零的地理/物价/法则/断代穿帮词
  { term: '江南茶楼', reason: '域外现实地名穿帮（九州南境统一用「南岭水镇茶楼」）' },
  { term: '山下青州城', reason: '空间地理穿帮（中州天柱峰山下不得出现青州城）' },
  { term: '半张破障符', reason: '灵石购买力穿帮（破障符市价逾六十灵石，一石远不足买半张）' },
  { term: '一文钱能买三捆', reason: '清心草百万倍物价穿帮' },
  { term: '中州七十二城', reason: '州域城数穿帮（统一为中州三十六大城 / 九州七十二重镇）' },
  { term: '斩天会四代遗录', reason: '旧断代称谓穿帮（已统一为「斩天会四纪遗录」）' },
  { term: '一网收尽', reason: '天门收割边界穿帮（伪天门主炉严格唯锁化神）' },
  { term: '长明之前三万年的古篆', reason: '古碑预知长明纪年穿帮' },
  // 专名与境界错别字
  { term: '沈青霜', reason: '人物名错字（应为「沈清霜」）' },
  { term: '谢无救', reason: '人物名错字（应为「谢无咎」）' },
  { term: '苏之微', reason: '人物名错字（应为「苏知微」）' },
  { term: '苍冥', reason: '易与人物「苍溟」混淆（天穹宜用「苍穹」）' },
  { term: '青兰', reason: '地名错字（应为「青岚」）' },
  { term: '练气', reason: '境界名不统一（全作统一用「炼气」）' },
  { term: '元英', reason: '境界名错字（应为「元婴」）' },
  { term: '飞昇', reason: '异体字不统一（全作统一用「飞升」）' },
  // 高频成语/常见错别字
  { term: '双剑合壁', reason: '错别字（应为「双剑合璧」）' },
  { term: '出手果绝', reason: '错别字（应为「出手果决」）' },
  { term: '决别', reason: '错别字（应为「诀别」）' },
  { term: '震憾', reason: '错别字（应为「震撼」）' },
  { term: '布署', reason: '错别字（应为「部署」）' },
  { term: '脉博', reason: '错别字（应为「脉搏」）' },
  { term: '坐阵', reason: '错别字（应为「坐镇」）' },
  { term: '重倒覆辙', reason: '错别字（应为「重蹈覆辙」）' },
  { term: '再接再励', reason: '错别字（应为「再接再厉」）' },
  { term: '迫不急待', reason: '错别字（应为「迫不及待」）' },
  { term: '迫不及代', reason: '错别字（应为「迫不及待」）' },
  { term: '一愁莫展', reason: '错别字（应为「一筹莫展」）' },
  { term: '走头无路', reason: '错别字（应为「走投无路」）' },
  { term: '穿流不息', reason: '错别字（应为「川流不息」）' },
  { term: '变本加利', reason: '错别字（应为「变本加厉」）' },
  { term: '甘败下风', reason: '错别字（应为「甘拜下风」）' },
  { term: '世外桃园', reason: '错别字（应为「世外桃源」）' },
  { term: '谈笑风声', reason: '错别字（应为「谈笑风生」）' },
  { term: '莫明其妙', reason: '错别字（应为「莫名其妙」）' },
  { term: '按步就班', reason: '错别字（应为「按部就班」）' },
  { term: '金碧辉皇', reason: '错别字（应为「金碧辉煌」）' },
  { term: '呕心历血', reason: '错别字（应为「呕心沥血」）' },
  { term: '不寒而粟', reason: '错别字（应为「不寒而栗」）' },
  { term: '挺而走险', reason: '错别字（应为「铤而走险」）' },
  { term: '声嘶力歇', reason: '错别字（应为「声嘶力竭」）' },
  { term: '如火如茶', reason: '错别字（应为「如火如荼」）' },
  { term: '魂飞破散', reason: '错别字（应为「魂飞魄散」）' },
  { term: '大相径廷', reason: '错别字（应为「大相径庭」）' },
  { term: '不径而走', reason: '错别字（应为「不胫而走」）' },
  { term: '心浮气燥', reason: '错别字（应为「心浮气躁」）' },
  { term: '功亏一匮', reason: '错别字（应为「功亏一篑」）' },
  { term: '按耐不住', reason: '错别字（应为「按捺不住」）' },
  { term: '水泻不通', reason: '错别字（应为「水泄不通」）' },
  { term: '一诺千斤', reason: '错别字（应为「一诺千金」）' },
  { term: '趋之若骛', reason: '错别字（应为「趋之若鹜」）' },
  { term: '原形必露', reason: '错别字（应为「原形毕露」）' },
  { term: '草管人命', reason: '错别字（应为「草菅人命」）' },
  { term: '如愿以尝', reason: '错别字（应为「如愿以偿」）' },
  { term: '满目苍夷', reason: '错别字（应为「满目疮痍」）' },
  { term: '声名狼籍', reason: '错别字（应为「声名狼藉」）' },
  { term: '消声匿迹', reason: '错别字（应为「销声匿迹」）' },
  { term: '相形见拙', reason: '错别字（应为「相形见绌」）' },
  { term: '换然一新', reason: '错别字（应为「焕然一新」）' },
  { term: '无动于中', reason: '错别字（应为「无动于衷」）' },
  { term: '鞠躬尽粹', reason: '错别字（应为「鞠躬尽瘁」）' },
  { term: '万劫不覆', reason: '错别字（应为「万劫不复」）' },
  { term: '惨绝人环', reason: '错别字（应为「惨绝人寰」）' },
  { term: '越演越烈', reason: '错别字（应为「愈演愈烈」）' },
  { term: '算你小辈倒还算', reason: '双「算」语病' },
];

// 全站精准正则禁词（避免误杀「狂暴雷火」「越阶破防」等正常修仙词）
const GLOBAL_FORBIDDEN_REGEXES: Array<{ re: RegExp; reason: string }> = [
  { re: /(?<!狂)暴雷/, reason: '现代金融热词「暴雷」' },
  { re: /(?:心态|心理|直接|瞬间|彻底)破防/, reason: '现代网络热词「破防」' },
];

// Zone A（沉浸正文区）专属严格禁词
const ZONE_A_FORBIDDEN_TERMS: Array<{ term: string; reason: string }> = [
  { term: '折现', reason: '现代财务词（沉浸正文宜用易得/暗兑/换作）' },
  { term: '倒计时', reason: '现代计时词（沉浸正文宜用大期将至/时日无多）' },
  { term: '证伪', reason: '现代学术词' },
  { term: '证据链', reason: '现代司法词（沉浸正文宜用铁证/勘验脉络）' },
  { term: '时间节点', reason: '现代公文/工程词（沉浸正文宜用时辰/枯竭年月）' },
  { term: '转包', reason: '现代工程/商贸词（沉浸正文宜用转托/假手他人）' },
  { term: '金融', reason: '现代经济学词' },
  { term: '平仓', reason: '现代期货术语' },
  { term: '止损', reason: '现代交易术语' },
  { term: '杠杆', reason: '现代金融术语' },
  { term: '通胀', reason: '现代经济术语' },
  { term: '做空', reason: '现代股市术语' },
  { term: '抄底', reason: '现代股市术语' },
  { term: '套现', reason: '现代金融术语' },
  { term: '性价比', reason: '现代消费术语' },
  { term: '坏账', reason: '现代财务黑话（沉浸正文宜用死账/烂账）' },
  { term: '沉没成本', reason: '现代经济学词' },
  { term: '挤兑', reason: '现代金融术语' },
  { term: '船票', reason: '现代交通隐喻' },
  { term: '豁免券', reason: '现代票券词' },
  { term: '积分', reason: '现代网游/消费词' },
  { term: '成色分级', reason: '第四面墙设计词' },
  { term: '触发', reason: '第四面墙系统词' },
  { term: '好感度', reason: '第四面墙系统词' },
  { term: '进度条', reason: '第四面墙系统词' },
  { term: '存档', reason: '第四面墙系统词' },
  { term: '读档', reason: '第四面墙系统词' },
  { term: '周目', reason: '第四面墙系统词' },
  { term: '攻略', reason: '第四面墙系统词' },
  { term: '冷却', reason: '第四面墙游戏机制词' },
  { term: '面板', reason: '第四面墙界面词' },
  { term: '系统提示', reason: '第四面墙词' },
  { term: '数值', reason: '第四面墙词' },
  { term: '玩家', reason: '第四面墙词' },
  { term: '人设', reason: '现代二次元词' },
  { term: '吐槽', reason: '现代网络词' },
  { term: '靠谱', reason: '现代口语' },
  { term: '搞定', reason: '现代口语' },
  { term: 'NPC', reason: '英文游戏黑话' },
  { term: 'KPI', reason: '英文职场黑话' },
  { term: 'Buff', reason: '英文游戏黑话' },
  { term: 'buff', reason: '英文游戏黑话' },
];

// Zone A 额外正则规则
const ZONE_A_FORBIDDEN_REGEXES: Array<{ re: RegExp; reason: string }> = [
  { re: /\d+\s*%/, reason: '沉浸正文禁用阿拉伯百分号（宜改用中文成数）' },
  { re: /[+-]\d+\s*(载|年|岁|灵石|战力|心境|声望|好感)/, reason: '沉浸正文禁用游戏加减数值格式' },
  { re: /[\u4e00-\u9fff][,;:!?]|[,;:!?][\u4e00-\u9fff]/, reason: '沉浸正文混用英文半角标点' },
  { re: /与[^，。！？；：“”\n]{1,12}与/, reason: '短距双「与」语病（宜改为顿号或「及」）' },
  { re: /的的/, reason: '疑似连续重复叠字「的的」' },
  { re: /，，/, reason: '疑似重复中文逗号「，，」' },
  { re: /。。/, reason: '疑似重复中文句号「。。」' },
];

function collectSourceFiles(dir: string): string[] {
  return ts.sys
    .readDirectory(dir, ['.ts', '.tsx'], ['__tests__', 'styles'])
    .map((p) => p.replace(/\\/g, '/'))
    .filter((p) => !p.endsWith('.test.ts') && !p.endsWith('.d.ts'))
    .sort();
}

function getEnclosingContext(node: ts.Node): {
  propName: string;
  skip: boolean;
  isZoneBExpr: boolean;
} {
  let cur: ts.Node | undefined = node.parent;
  let propName = '';
  let isZoneBExpr = false;

  while (cur) {
    if (ts.isCallExpression(cur)) {
      const exprText = cur.expression.getText();
      if (
        exprText.startsWith('console.') ||
        exprText === 'Error' ||
        exprText.endsWith('.warn') ||
        exprText.endsWith('.error')
      ) {
        return { propName, skip: true, isZoneBExpr: false };
      }
      if (
        exprText === 'notices.push' ||
        exprText === 'reasons.push' ||
        exprText === 'powerSources.push' ||
        exprText === 'deadmanSwitches.push' ||
        exprText === 'missing.push'
      ) {
        isZoneBExpr = true;
      }
    }
    if (ts.isThrowStatement(cur)) {
      return { propName, skip: true, isZoneBExpr: false };
    }
    if (ts.isVariableDeclaration(cur) && ts.isIdentifier(cur.name)) {
      if (ZONE_B_VAR_NAMES.has(cur.name.text)) {
        isZoneBExpr = true;
        if (!propName) propName = cur.name.text;
      }
    }
    if (
      ts.isBinaryExpression(cur) &&
      cur.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(cur.left) &&
      ZONE_B_VAR_NAMES.has(cur.left.text)
    ) {
      isZoneBExpr = true;
      if (!propName) propName = cur.left.text;
    }
    if (ts.isJsxAttribute(cur)) {
      const attrName = cur.name.getText();
      if (
        SKIP_PROP_NAMES.has(attrName) ||
        attrName.startsWith('data-') ||
        attrName.startsWith('aria-')
      ) {
        return { propName: attrName, skip: true, isZoneBExpr: false };
      }
      if (!propName) propName = attrName;
    }
    if (ts.isPropertyAssignment(cur) && !propName) {
      const rawName =
        ts.isIdentifier(cur.name) || ts.isStringLiteral(cur.name)
          ? cur.name.text
          : cur.name.getText();
      if (cur.name === node) {
        return { propName: rawName, skip: true, isZoneBExpr: false };
      }
      propName = rawName;
      if (SKIP_PROP_NAMES.has(rawName)) {
        return { propName: rawName, skip: true, isZoneBExpr: false };
      }
    }
    cur = cur.parent;
  }

  return { propName, skip: false, isZoneBExpr };
}

function extractAllLiterals(): ExtractedLiteral[] {
  const files = collectSourceFiles(SRC_ROOT);
  const extracted: ExtractedLiteral[] = [];

  for (const absPath of files) {
    const relPath = absPath.startsWith(`${SRC_ROOT}/`)
      ? absPath.slice(SRC_ROOT.length + 1)
      : absPath;
    const code = ts.sys.readFile(absPath) ?? '';
    const kind = absPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(absPath, code, ts.ScriptTarget.Latest, true, kind);

    const isFileZoneB = ZONE_B_FILE_PREFIXES.some((prefix) => relPath.startsWith(prefix));

    const visit = (node: ts.Node) => {
      const isCompleteLiteral =
        ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
      const isTemplatePart =
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node);

      if (isCompleteLiteral || isTemplatePart) {
        const text = node.text;
        const hasChinese = /[\u4e00-\u9fff]/.test(text);
        const hasBraces = text.includes('{{') || text.includes('}}');
        if (hasChinese || hasBraces) {
          const ctx = getEnclosingContext(node);
          if (!ctx.skip) {
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            const zone: CopyZone =
              isFileZoneB || ctx.isZoneBExpr || ZONE_B_PROP_NAMES.has(ctx.propName)
                ? 'B'
                : 'A';
            extracted.push({
              relPath,
              line,
              zone,
              propName: ctx.propName || (ctx.isZoneBExpr ? 'zoneB' : 'inline'),
              isCompleteLiteral,
              text,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sf);
  }

  return extracted;
}

// ==================== Layer 2 辅助：确定性 PRNG 与状态工厂 ====================
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function makeProfile(overrides?: Partial<PlayerProfile>): PlayerProfile {
  const gender: Gender = overrides?.gender ?? 'male';
  const defaultHonorific =
    gender === 'female' ? '姑娘' : gender === 'male' ? '公子' : '道友';
  return {
    name: '沈长青',
    gender,
    honorific: overrides?.honorific ?? defaultHonorific,
    originId: overrides?.originId ?? 'herbalist',
    openingEventIds: overrides?.openingEventIds ?? ['ev_charred_jade', 'ev_qingzhou_vow'],
    daoHeartId: overrides?.daoHeartId ?? 'seek_truth',
    ...overrides,
  };
}

function actRealm(act: ActId): GameState['realm'] {
  switch (act) {
    case 'act1':
      return 'mortal';
    case 'act2':
      return 'qi_mid';
    case 'act3':
      return 'foundation_mid';
    case 'act4':
      return 'golden_core';
    case 'act5':
      return 'nascent_soul';
    case 'act6':
      return 'deity_transform';
  }
}

function actAgeYears(act: ActId): number {
  switch (act) {
    case 'act1':
      return 16;
    case 'act2':
      return 22;
    case 'act3':
      return 48;
    case 'act4':
      return 78;
    case 'act5':
      return 112;
    case 'act6':
      return 136;
  }
}

function stateForScene(base: GameState, act: ActId, sceneId: string): GameState {
  const ageYears = actAgeYears(act);
  const realm = actRealm(act);
  const lifespanYears = CONTENT_REGISTRY.realms[realm].lifespanYears;
  return {
    ...base,
    act,
    realm,
    lifespanYears,
    ageMonths: ageYears * 12,
    year: 2996 + ageYears,
    currentSceneId: sceneId,
  };
}

function collectRuntimeTextIssues(label: string, text: string): string[] {
  const issues: string[] = [];
  if (/\{\{|\}\}/.test(text)) {
    issues.push(`${label}: 残留未替换模板占位符 -> ${text.slice(0, 80)}`);
  }
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) {
    issues.push(`${label}: 出现非法渲染值(undefined/NaN/Object) -> ${text.slice(0, 80)}`);
  }
  if (text.includes('寿元增延 -')) {
    issues.push(`${label}: 负寿元提示拼接异常 -> ${text.slice(0, 80)}`);
  }
  return issues;
}

// 恒雪地理或剧本设定明确发生在雪夜/寒冬的场景白名单（春夏秋不受“夏雪”拦截）
const PERMAFROST_OR_WINTER_SCENE_WHITELIST = new Set([
  'act2_arc_sword_1',
  'act2_arc_sword_2',
  'act3_arc_sect_1',
  'act3_arc_sect_2',
  'act4_arc_zhantian_1',
  'act4_arc_zhantian_2',
  'act4_nascent_gate',
  'act5_opening',
  'act5_hub',
  'act5_arc_summit',
  'act5_arc_final_eve',
  'act5_deity_breakthrough',
  'act6_sky_gate',
  'act6_final_choice',
  'visit_shen_qingshuang',
  'rand_act2_sword_duel',
  'rand_act3_cold_spring',
]);

describe('《长生烬》三层防线 · Layer 1 全源静态双区词法扫描与名句锁', () => {
  const allLiterals = extractAllLiterals();

  it('L1-0 扫描器应覆盖 content / engine / ui 三大源码目录', () => {
    const dirs = new Set(allLiterals.map((item) => item.relPath.split('/')[0]));
    expect(dirs.has('content')).toBe(true);
    expect(dirs.has('engine')).toBe(true);
    expect(dirs.has('ui')).toBe(true);
    expect(allLiterals.length).toBeGreaterThan(1500);
  });

  it('L1-1 定稿名句保护锁（Golden Lines Lock）：已锁名句完好无损', () => {
    const violations: string[] = [];
    for (const item of GOLDEN_LINES) {
      const abs = `${SRC_ROOT}/${item.relPath}`;
      const raw = ts.sys.readFile(abs) ?? '';
      if (!raw.includes(item.text)) {
        violations.push(`[${item.id}] ${item.relPath} 丢失定稿名句：「${item.text}」`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('L1-2 模板占位符语法完整性：全库所有 {{...}} 均闭合且属于白名单键', () => {
    const violations: string[] = [];
    for (const lit of allLiterals) {
      const stripped = lit.text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key: string) => {
        if (!ALLOWED_PLACEHOLDERS.has(key)) {
          violations.push(
            `${lit.relPath}:${lit.line} [${lit.propName}] 非法占位符 {{${key}}}`
          );
        }
        return '';
      });
      if (stripped.includes('{{') || stripped.includes('}}')) {
        violations.push(
          `${lit.relPath}:${lit.line} [${lit.propName}] 未闭合或残损占位符 -> ${lit.text.slice(0, 60)}`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('L1-3 全站绝对禁词扫描（Zone A + Zone B）：零现代网梗、零专名/成语错别字、流程内零「真结局」', () => {
    const violations: string[] = [];
    for (const lit of allLiterals) {
      for (const rule of GLOBAL_FORBIDDEN_TERMS) {
        if (lit.text.includes(rule.term)) {
          violations.push(
            `[Zone ${lit.zone}] ${lit.relPath}:${lit.line} (${lit.propName}) 命中「${rule.term}」(${rule.reason}) -> ${lit.text.slice(0, 72)}`
          );
        }
      }
      for (const rule of GLOBAL_FORBIDDEN_REGEXES) {
        if (rule.re.test(lit.text)) {
          violations.push(
            `[Zone ${lit.zone}] ${lit.relPath}:${lit.line} (${lit.propName}) 命中正则(${rule.reason}) -> ${lit.text.slice(0, 72)}`
          );
        }
      }
      // 流程场景、选项与系统中禁止出现「真结局」，仅允许 endings.ts 万象志徽章分级与 types.ts 类型定义使用
      if (
        lit.text.includes('真结局') &&
        lit.relPath !== 'content/endings.ts' &&
        lit.relPath !== 'engine/types.ts'
      ) {
        violations.push(
          `[Zone ${lit.zone}] ${lit.relPath}:${lit.line} (${lit.propName}) 流程内泄露第四面墙词「真结局」 -> ${lit.text.slice(0, 72)}`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('L1-4 Zone A 沉浸正文区专属红线：零金融/系统黑话、零英文/阿拉伯数字污染、零双「与」语病', () => {
    const violations: string[] = [];
    const zoneALiterals = allLiterals.filter((l) => l.zone === 'A');
    for (const lit of zoneALiterals) {
      const cleaned = lit.text.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '某');
      for (const rule of ZONE_A_FORBIDDEN_TERMS) {
        if (cleaned.includes(rule.term)) {
          violations.push(
            `[Zone A] ${lit.relPath}:${lit.line} (${lit.propName}) 命中「${rule.term}」(${rule.reason}) -> ${lit.text.slice(0, 72)}`
          );
        }
      }
      for (const rule of ZONE_A_FORBIDDEN_REGEXES) {
        if (rule.re.test(cleaned)) {
          violations.push(
            `[Zone A] ${lit.relPath}:${lit.line} (${lit.propName}) 命中正则(${rule.reason}) -> ${lit.text.slice(0, 72)}`
          );
        }
      }
      const strayEng = cleaned.match(/[A-Za-z]{2,}/g);
      if (strayEng) {
        violations.push(
          `[Zone A] ${lit.relPath}:${lit.line} (${lit.propName}) 沉浸正文混入英文(${strayEng.join(',')}) -> ${lit.text.slice(0, 72)}`
        );
      }
      // src/content/ 下的 Zone A 纯沉浸叙事严格禁止阿拉伯数字
      if (lit.relPath.startsWith('content/') && /\d/.test(cleaned)) {
        violations.push(
          `[Zone A] ${lit.relPath}:${lit.line} (${lit.propName}) 剧本沉浸正文混入阿拉伯数字 -> ${lit.text.slice(0, 72)}`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('L1-5 全库标点与引号配对完整性：零未闭合引号与括号', () => {
    const violations: string[] = [];
    const bracketPairs: Array<[string, string]> = [
      ['“', '”'],
      ['【', '】'],
      ['「', '」'],
      ['（', '）'],
      ['《', '》'],
    ];
    for (const lit of allLiterals) {
      if (!lit.isCompleteLiteral) continue;
      for (const [open, close] of bracketPairs) {
        const openCount = lit.text.split(open).length - 1;
        const closeCount = lit.text.split(close).length - 1;
        if (openCount !== closeCount) {
          violations.push(
            `${lit.relPath}:${lit.line} (${lit.propName}) ${open}${close} 不配对(${openCount}/${closeCount}) -> ${lit.text.slice(0, 72)}`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('《长生烬》三层防线 · Layer 2A 高危正交状态矩阵不变量测试', () => {
  it('L2A-1 全场景+全选项演绎+全雅阁 × 三性别全量渲染：零占位符残余、零非法值、女性/中性路径零单性别称谓错位', () => {
    const genders: Gender[] = ['male', 'female', 'other'];
    const issues: string[] = [];
    const genderedAddressRe = /(?:平辈兄弟|好兄弟|臭小子|你小子|这小子)/;

    for (const gender of genders) {
      const base = createInitialState(makeProfile({ gender }), CONTENT_REGISTRY);
      for (const [sceneId, scene] of Object.entries(CONTENT_REGISTRY.scenes)) {
        const s = stateForScene(base, scene.act, sceneId);
        const title = resolveTextValue(scene.title, s) ?? '';
        const subtitle = resolveTextValue(scene.subtitle, s) ?? '';
        const location = resolveTextValue(scene.location, s) ?? '';
        const paras = resolveParagraphs(scene.paragraphs, s);

        if (paras.length === 0) {
          issues.push(`${sceneId}[${gender}]: 场景正文渲染为空`);
        }

        const sceneAll = [title, subtitle, location, ...paras].join('\n');
        issues.push(...collectRuntimeTextIssues(`${sceneId}[${gender}]`, sceneAll));
        if (gender !== 'male' && genderedAddressRe.test(sceneAll)) {
          issues.push(
            `${sceneId}[${gender}]: 非男性主角命中单性别称谓 -> ${sceneAll.match(genderedAddressRe)?.[0]}`
          );
        }

        const resolvedChoices = getResolvedChoices(s, scene, CONTENT_REGISTRY);
        for (const ch of resolvedChoices) {
          const chText = [
            ch.label,
            ch.subtext ?? '',
            ...(ch.insightTags ?? []),
            ch.lockReason ?? '',
          ].join(' ');
          issues.push(...collectRuntimeTextIssues(`${sceneId}/${ch.id}[${gender}]`, chText));
          if (gender !== 'male' && genderedAddressRe.test(chText)) {
            issues.push(
              `${sceneId}/${ch.id}[${gender}]: 选项文案命中单性别称谓 -> ${chText.match(genderedAddressRe)?.[0]}`
            );
          }
        }

        // 同步遍历该场景所有选项的 outcome / bridgeNote / outcomeContinueLabel
        for (const chDef of scene.choices) {
          const outParas = chDef.outcome ? resolveParagraphs(chDef.outcome, s) : [];
          const bridge = resolveTextValue(chDef.bridgeNote, s) ?? '';
          const cont = resolveTextValue(chDef.outcomeContinueLabel, s) ?? '';
          const combined = [...outParas, bridge, cont].join('\n');
          if (!combined) continue;
          issues.push(
            ...collectRuntimeTextIssues(`${sceneId}/${chDef.id}:outcome[${gender}]`, combined)
          );
          if (gender !== 'male' && genderedAddressRe.test(combined)) {
            issues.push(
              `${sceneId}/${chDef.id}:outcome[${gender}]: 演绎文案命中单性别称谓 -> ${combined.match(genderedAddressRe)?.[0]}`
            );
          }
        }
      }

      // 仙缘雅阁 × 四故人 × 三性别全检
      const sanctState: GameState = {
        ...base,
        act: 'act4',
        realm: 'golden_core',
        ageMonths: 62 * 12,
        year: 2996 + 62,
        flags: { ...base.flags, su_zhiwei_saved_longlife: true },
        tags: [...base.tags, 'cangming_reborn'],
        companions: {
          shen_qingshuang: { met: true, affection: 82, stance: 'bonded', milestoneStage: 1, stage: 4, chronicle: [], letters: [] },
          xie_wujiu: { met: true, affection: 82, stance: 'bonded', milestoneStage: 1, stage: 4, chronicle: [], letters: [] },
          su_zhiwei: { met: true, affection: 82, stance: 'bonded', milestoneStage: 1, stage: 4, chronicle: [], letters: [] },
          cang_ming: { met: true, affection: 82, stance: 'bonded', milestoneStage: 1, stage: 4, chronicle: [], letters: [] },
        },
      };
      for (const cid of ['shen_qingshuang', 'xie_wujiu', 'su_zhiwei', 'cang_ming'] as CompanionId[]) {
        for (const actDef of getSanctuaryActivities(sanctState, cid)) {
          const res = performSanctuaryActivity(sanctState, cid, actDef.id);
          const txt = `${res.title}\n${res.paragraphs.join('\n')}\n${res.notice}`;
          issues.push(...collectRuntimeTextIssues(`sanctuary/${cid}/${actDef.id}[${gender}]`, txt));
          if (gender !== 'male' && genderedAddressRe.test(txt)) {
            issues.push(
              `sanctuary/${cid}/${actDef.id}[${gender}]: 雅阁命中单性别称谓 -> ${txt.match(genderedAddressRe)?.[0]}`
            );
          }
        }
        const m1 = triggerMilestone1(
          {
            ...sanctState,
            companions: {
              ...sanctState.companions,
              [cid]: { ...sanctState.companions[cid], milestoneStage: 0 },
            },
          },
          cid
        );
        if (m1.ok) {
          const txt = `${m1.title}\n${m1.paragraphs.join('\n')}\n${m1.notice}`;
          issues.push(...collectRuntimeTextIssues(`sanctuary-m1/${cid}[${gender}]`, txt));
          if (gender !== 'male' && genderedAddressRe.test(txt)) {
            issues.push(`sanctuary-m1/${cid}[${gender}]: 命中单性别称谓`);
          }
        }
        for (const bondType of ['dao_partner', 'sworn'] as const) {
          const b = commitCompanionBond(sanctState, cid, bondType);
          if (b.ok) {
            const txt = `${b.title}\n${b.paragraphs.join('\n')}\n${b.notice}`;
            issues.push(...collectRuntimeTextIssues(`sanctuary-${bondType}/${cid}[${gender}]`, txt));
            if (gender !== 'male' && genderedAddressRe.test(txt)) {
              issues.push(`sanctuary-${bondType}/${cid}[${gender}]: 命中单性别称谓`);
            }
          }
        }
      }
    }

    expect(issues).toEqual([]);
  });

  it('L2A-2 苏知微辞世铁律：卷三至卷六全关键场景、雅阁、前尘余波与十二终局绝不复活或弹出亲近', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const deadSuBase: GameState = {
      ...base,
      flags: { ...base.flags, su_zhiwei_passed: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 80,
          stance: 'bonded',
          bondType: 'dao_partner',
          milestoneStage: 2,
          stage: 4,
          deceased: true,
          deceasedYear: 3058,
          chronicle: ['青州杏林安然辞世。'],
          letters: [],
        },
      },
      daoPartnerId: 'su_zhiwei',
    };

    const issues: string[] = [];
    const resurrectPatterns = [
      /苏知微[^，。！？\n]{0,12}(?:并肩|赶来|笑道|递来|端来|执手|护法|围炉|轻声道|笑着说)/,
      /并肩迎向天门/,
    ];

    for (const act of ['act3', 'act4', 'act5'] as ActId[]) {
      const s = stateForScene(deadSuBase, act, `${act}_hub`);
      expect(isCompanionDeceased(s, 'su_zhiwei')).toBe(true);
      expect(canTriggerMilestone1(s, 'su_zhiwei')).toBe(false);
      expect(canCommitBond(s, 'su_zhiwei', 'dao_partner').ok).toBe(false);
      expect(canCommitBond(s, 'su_zhiwei', 'sworn').ok).toBe(false);
      const acts = getSanctuaryActivities(s, 'su_zhiwei');
      expect(acts.map((a) => a.id)).toEqual(['mourn_lantern']);
      const mourn = performSanctuaryActivity(s, 'su_zhiwei', 'mourn_lantern');
      expect(mourn.state.companions.su_zhiwei.affection).toBe(s.companions.su_zhiwei.affection);
      const gift = giveSanctuaryGift(
        {
          ...s,
          market: { ...s.market, holdings: { qingxin_herb: { qty: 1, avgCost: 20 } } },
        },
        'su_zhiwei',
        'qingxin_herb',
        CONTENT_REGISTRY
      );
      expect(gift.ok).toBe(false);
    }

    const lateScenes: Array<[ActId, string]> = [
      ['act5', 'act5_opening'],
      ['act5', 'act5_hub'],
      ['act5', 'act5_arc_summit'],
      ['act5', 'act5_arc_final_eve'],
      ['act5', 'act5_deity_breakthrough'],
      ['act6', 'act6_sky_gate'],
      ['act6', 'act6_final_choice'],
    ];
    for (const [act, sceneId] of lateScenes) {
      const s = stateForScene(deadSuBase, act, sceneId);
      const scene = CONTENT_REGISTRY.scenes[sceneId];
      const text = resolveParagraphs(scene.paragraphs, s).join('\n');
      for (const re of resurrectPatterns) {
        if (re.test(text)) {
          issues.push(`${sceneId}: 苏知微辞世后疑似复活 -> ${text.match(re)?.[0]}`);
        }
      }
      const echo = getActTransitionEcho(s, sceneId, CONTENT_REGISTRY);
      if (echo) {
        const echoText = echo.bullets.join('\n');
        for (const re of resurrectPatterns) {
          if (re.test(echoText)) {
            issues.push(`echo(${sceneId}): 苏知微辞世后前尘余波异常 -> ${echoText.match(re)?.[0]}`);
          }
        }
      }
    }

    for (const [endingId, ending] of Object.entries(CONTENT_REGISTRY.endings)) {
      const s = stateForScene(deadSuBase, 'act6', 'act6_final_choice');
      const ep = ending.epilogue(s).join('\n');
      issues.push(...collectRuntimeTextIssues(`ending:${endingId}[deadSu]`, ep));
      for (const re of resurrectPatterns) {
        if (re.test(ep)) {
          issues.push(`ending:${endingId}: 苏知微辞世后终局疑似复活 -> ${ep.match(re)?.[0]}`);
        }
      }
    }

    // 仅设 deceased: true（未置 flags.su_zhiwei_passed 且挂有 su_zhiwei_saved_longlife）亦须全卷防复活
    const deceasedOnlySu: GameState = {
      ...base,
      flags: { ...base.flags, su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 85,
          stance: 'bonded',
          bondType: 'dao_partner',
          milestoneStage: 2,
          stage: 3,
          deceased: true,
          deceasedYear: 3042,
          chronicle: [],
          letters: [],
        },
      },
      daoPartnerId: 'su_zhiwei',
    };
    const deceasedOnlyChecks: Array<[ActId, string]> = [
      ['act2', 'act2_hub'],
      ['act3', 'act3_opening'],
      ['act3', 'act3_arc_hearth_1'],
      ['act3', 'act3_arc_hearth_2'],
      ['act4', 'act4_hub'],
      ['act4', 'act4_arc_mortal_truth'],
      ['act5', 'act5_opening'],
      ['act5', 'act5_arc_final_eve'],
    ];
    for (const [act, sceneId] of deceasedOnlyChecks) {
      const s = { ...stateForScene(deceasedOnlySu, act, sceneId), ageMonths: 50 * 12 };
      const text = resolveParagraphs(CONTENT_REGISTRY.scenes[sceneId].paragraphs, s).join('\n');
      for (const re of resurrectPatterns) {
        if (re.test(text)) {
          issues.push(`${sceneId}[deceasedOnly]: 未置 su_zhiwei_passed 时苏知微复活 -> ${text.match(re)?.[0]}`);
        }
      }
      if (sceneId === 'act4_arc_mortal_truth' && text.includes('两鬓斑白的苏知微')) {
        issues.push('act4_arc_mortal_truth[deceasedOnly]: 未置 su_zhiwei_passed 时苏知微复活');
      }
    }
    const act3DeadEcho = getActTransitionEcho(
      { ...stateForScene(deceasedOnlySu, 'act3', 'act3_opening'), ageMonths: 98 * 12, year: 2996 + 98 },
      'act3_opening',
      CONTENT_REGISTRY
    );
    if (act3DeadEcho && act3DeadEcho.bullets.join('\n').includes('灯火安康')) {
      issues.push('echo(act3_opening)[deceasedOnly/aged>95]: 苏知微辞世后前尘余波仍称灯火安康');
    }
    for (const endingId of ['ending_mortal_new_era', 'ending_sever_sky_solo']) {
      const s = { ...stateForScene(deceasedOnlySu, 'act6', 'act6_final_choice'), ageMonths: 50 * 12 };
      const ep = CONTENT_REGISTRY.endings[endingId].epilogue(s).join('\n');
      for (const re of resurrectPatterns) {
        if (re.test(ep)) {
          issues.push(`ending:${endingId}[deceasedOnly]: 未置 su_zhiwei_passed 时终局苏知微复活 -> ${ep.match(re)?.[0]}`);
        }
      }
    }

    expect(issues).toEqual([]);
  });

  it('L2A-3 苍溟永封与未重塑真身铁律：永封绝不越狱，残魂绝不实体饮酒抱臂', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const issues: string[] = [];

    const sealedState: GameState = {
      ...base,
      act: 'act5',
      realm: 'nascent_soul',
      flags: { ...base.flags, cangming_sealed: true, act4_cangming_sealed: true },
      companions: {
        ...base.companions,
        cang_ming: {
          met: true,
          affection: 80,
          stance: 'bonded',
          stage: 3,
          chronicle: [],
        },
      },
    };
    expect(isCompanionSealed(sealedState, 'cang_ming')).toBe(true);
    expect(getSanctuaryActivities(sealedState, 'cang_ming')).toHaveLength(0);
    expect(canTriggerMilestone1(sealedState, 'cang_ming')).toBe(false);
    expect(canCommitBond(sealedState, 'cang_ming', 'sworn').ok).toBe(false);

    const sealedSpeakRe = /苍溟[^，。！？\n]{0,14}(?:冷笑|笑道|护法|并肩|围炉|拔剑|长剑出鞘|踏雪|举杯)/;
    for (const [act, sceneId] of [
      ['act5', 'act5_arc_summit'],
      ['act5', 'act5_arc_final_eve'],
      ['act5', 'act5_deity_breakthrough'],
      ['act6', 'act6_sky_gate'],
      ['act6', 'act6_final_choice'],
    ] as Array<[ActId, string]>) {
      const s = stateForScene(sealedState, act, sceneId);
      const text = resolveParagraphs(CONTENT_REGISTRY.scenes[sceneId].paragraphs, s).join('\n');
      if (sealedSpeakRe.test(text)) {
        issues.push(`${sceneId}: 永封苍溟疑似越狱 -> ${text.match(sealedSpeakRe)?.[0]}`);
      }
    }
    for (const [endingId, ending] of Object.entries(CONTENT_REGISTRY.endings)) {
      const ep = ending.epilogue(stateForScene(sealedState, 'act6', 'act6_final_choice')).join('\n');
      if (sealedSpeakRe.test(ep)) {
        issues.push(`ending:${endingId}: 永封苍溟终局疑似越狱 -> ${ep.match(sealedSpeakRe)?.[0]}`);
      }
    }

    const ghostCmState: GameState = {
      ...base,
      act: 'act3',
      realm: 'foundation_mid',
      relics: ['charred_jade_relic'],
      tags: base.tags.filter((t) => t !== 'cangming_reborn'),
      companions: {
        ...base.companions,
        cang_ming: {
          met: true,
          affection: 82,
          stance: 'bonded',
          milestoneStage: 1,
          bondType: 'dao_partner',
          stage: 3,
          chronicle: [],
        },
      },
      daoPartnerId: 'cang_ming',
    };
    const embodiedRe = /(?:抱臂|两坛烈酒|举杯共饮|拍了拍你的肩|与你并肩踏雪)/;
    for (const act of ['act2', 'act3', 'act4'] as ActId[]) {
      const s = stateForScene(ghostCmState, act, `${act}_hub`);
      for (const actDef of getSanctuaryActivities(s, 'cang_ming')) {
        const res = performSanctuaryActivity(s, 'cang_ming', actDef.id);
        const text = `${res.title}\n${res.paragraphs.join('\n')}`;
        if (embodiedRe.test(text)) {
          issues.push(
            `sanctuary(${act}/${actDef.id}): 未重塑苍溟出现实体动作 -> ${text.match(embodiedRe)?.[0]}`
          );
        }
      }
      const m1 = triggerMilestone1(
        {
          ...s,
          companions: {
            ...s.companions,
            cang_ming: { ...s.companions.cang_ming, milestoneStage: 0 },
          },
        },
        'cang_ming'
      );
      if (m1.ok && embodiedRe.test(m1.paragraphs.join('\n'))) {
        issues.push(`sanctuary-m1(${act}): 未重塑苍溟出现实体动作`);
      }
      const bond = commitCompanionBond(
        {
          ...s,
          daoPartnerId: undefined,
          companions: {
            ...s.companions,
            cang_ming: { ...s.companions.cang_ming, bondType: 'none', milestoneStage: 1 },
          },
        },
        'cang_ming',
        'sworn'
      );
      if (bond.ok && embodiedRe.test(bond.paragraphs.join('\n'))) {
        issues.push(`sanctuary-bond(${act}): 未重塑苍溟结义出现实体动作`);
      }
      const partnerBond = commitCompanionBond(
        {
          ...s,
          daoPartnerId: undefined,
          companions: {
            ...s.companions,
            cang_ming: { ...s.companions.cang_ming, bondType: 'none', milestoneStage: 1 },
          },
        },
        'cang_ming',
        'dao_partner'
      );
      if (partnerBond.ok) {
        if (partnerBond.notice.includes('并肩醉剑')) {
          issues.push(`sanctuary-partner(${act}): 未重塑苍溟道侣通知误写「并肩醉剑」`);
        }
        if (embodiedRe.test(partnerBond.paragraphs.join('\n'))) {
          issues.push(`sanctuary-partner(${act}): 未重塑苍溟道侣出现实体动作`);
        }
      }
      for (const gid of ['soul_amber', 'ancient_rubbing', 'po_zhang_talisman', 'qingxin_herb']) {
        const giftState: GameState = {
          ...s,
          actionUses: {},
          market: { ...s.market, holdings: { [gid]: { qty: 1, avgCost: 20 } } },
        };
        const giftRes = giveSanctuaryGift(giftState, 'cang_ming', gid, CONTENT_REGISTRY);
        const giftTxt = giftRes.paragraphs.join('\n');
        if (giftRes.ok && /(?:接过|抱臂|微微颔首)/.test(giftTxt)) {
          issues.push(`sanctuary-gift(${act}/${gid}): 未重塑苍溟受礼出现实体动作 -> ${giftTxt}`);
        }
      }
      // 拜访苍溟场景（visit_cang_ming）及其全部可见选项不得对残魂写抱臂/渗入眉心
      const visitState: GameState = {
        ...s,
        currentSceneId: 'visit_cang_ming',
        market: { ...s.market, holdings: { soul_amber: { qty: 1, avgCost: 60 } } },
      };
      const visitScene = CONTENT_REGISTRY.scenes.visit_cang_ming;
      const visitPara = resolveParagraphs(visitScene.paragraphs, visitState).join('\n');
      if (/(?:抱臂|渗入眉心)/.test(visitPara)) {
        issues.push(`visit_cang_ming(${act}): 未重塑苍溟正文出现实体动作`);
      }
      for (const ch of visitScene.choices) {
        if (ch.visible && !ch.visible(visitState)) continue;
        const chText = [
          resolveTextValue(ch.label, visitState) ?? '',
          resolveTextValue(ch.subtext, visitState) ?? '',
          ...(ch.outcome ? resolveParagraphs(ch.outcome, visitState) : []),
        ].join('\n');
        if (/(?:抱臂|渗入眉心|并肩醉剑)/.test(chText)) {
          issues.push(`visit_cang_ming(${act}/${ch.id}): 未重塑苍溟选项出现实体动作`);
        }
      }
    }

    expect(issues).toEqual([]);
  });

  it('L2A-4 孤狼零故人与全员敌对铁律：终战与十二终局绝无幽灵故人或敌对围炉', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const issues: string[] = [];

    const loneWolf: GameState = {
      ...base,
      act: 'act6',
      realm: 'deity_transform',
      lifespanYears: 2000,
      spiritStones: 1500,
      might: 280,
      mind: 320,
      tags: ['origin_herbalist', 'merchant_fame'],
      companions: {
        shen_qingshuang: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
        xie_wujiu: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
        su_zhiwei: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
        cang_ming: { met: false, affection: 0, stance: 'unmet', stage: 0, chronicle: [] },
      },
    };

    const ghostNames = ['沈清霜', '谢无咎', '苏知微', '苍溟'];
    for (const [act, sceneId] of [
      ['act5', 'act5_arc_summit'],
      ['act5', 'act5_arc_final_eve'],
      ['act5', 'act5_deity_breakthrough'],
      ['act6', 'act6_sky_gate'],
    ] as Array<[ActId, string]>) {
      const s = stateForScene(loneWolf, act, sceneId);
      const text = resolveParagraphs(CONTENT_REGISTRY.scenes[sceneId].paragraphs, s).join('\n');
      for (const name of ghostNames) {
        if (text.includes(name)) {
          issues.push(`${sceneId}[loneWolf]: 全员未遇状态凭空提及「${name}」`);
        }
      }
    }

    for (const endingId of [
      'ending_sever_sky_solo',
      'ending_gilded_realm',
      'ending_earth_immortal',
      'ending_demonic_devour',
      'ending_mortal_new_era',
      'ending_false_ascension',
    ]) {
      const ep = CONTENT_REGISTRY.endings[endingId].epilogue(loneWolf).join('\n');
      for (const name of ghostNames) {
        if (ep.includes(name)) {
          issues.push(`ending:${endingId}[loneWolf]: 全员未遇状态终局凭空提及「${name}」`);
        }
      }
    }

    const allEstranged: GameState = {
      ...loneWolf,
      companions: {
        shen_qingshuang: { met: true, affection: -50, stance: 'estranged', stage: 3, chronicle: [] },
        xie_wujiu: { met: true, affection: -50, stance: 'estranged', stage: 3, chronicle: [] },
        su_zhiwei: { met: true, affection: -50, stance: 'estranged', stage: 3, chronicle: [] },
        cang_ming: { met: true, affection: -50, stance: 'estranged', stage: 3, chronicle: [] },
      },
    };
    const warmRe = /(?:围炉夜话|替你护法|与你并肩破门|笑问你)/;
    for (const [act, sceneId] of [
      ['act5', 'act5_arc_final_eve'],
      ['act5', 'act5_deity_breakthrough'],
    ] as Array<[ActId, string]>) {
      const s = stateForScene(allEstranged, act, sceneId);
      const text = resolveParagraphs(CONTENT_REGISTRY.scenes[sceneId].paragraphs, s).join('\n');
      if (warmRe.test(text)) {
        issues.push(`${sceneId}[allEstranged]: 全员反目态仍出现温情护法/围炉 -> ${text.match(warmRe)?.[0]}`);
      }
    }

    expect(issues).toEqual([]);
  });

  it('L2A-5 剧透迷雾与闭关隐藏铁律：卷一零线索全界面零剧透，闭关模式零原始数字泄露', () => {
    const spoilers = [
      '牧灵骗局',
      '收割大期',
      '伪天门',
      '天门九枢',
      '灵根牧种',
      '九剑尊血战',
      '斩天四代',
      '斩天四纪',
      '兄长失踪',
      '转运井',
      '长明大劫',
      '三千年收割',
      '长生烬',
      '太古无灵纪',
      '上古牧灵初纪',
      '避劫灰符',
    ];
    const issues: string[] = [];

    for (const origin of CONTENT_REGISTRY.origins) {
      const s = createInitialState(
        makeProfile({
          originId: origin.id,
          openingEventIds: ['ev_merchant_manual', 'ev_broken_engagement'],
        }),
        CONTENT_REGISTRY
      );

      const surfaces: Array<[string, string]> = [
        [
          'investigation',
          getInvestigationProgress(s, CONTENT_REGISTRY)
            .stages.map((st) => `${st.title} ${st.desc}`)
            .join('\n'),
        ],
        [
          'factions',
          getFactionStandings(s)
            .map((f) => `${f.name} ${f.category} ${f.region} ${f.powerStatus} ${f.summary}`)
            .join('\n'),
        ],
        [
          'regions',
          getWorldRegions(s)
            .map((r) => `${r.name} ${r.desc}`)
            .join('\n'),
        ],
        [
          'realmLadder',
          getRealmLadder(s, CONTENT_REGISTRY)
            .map((t) => `${t.name} ${t.desc}`)
            .join('\n'),
        ],
        [
          'climate',
          (() => {
            const c = getWorldClimateSnapshot(s);
            return `${c.veinLabel} ${c.skyStatus} ${c.societyStatus}`;
          })(),
        ],
        [
          'companions',
          (Object.keys(CONTENT_REGISTRY.companions) as CompanionId[])
            .map((cid) => {
              const def = CONTENT_REGISTRY.companions[cid];
              const title = typeof def.title === 'function' ? def.title(s) : def.title;
              const bio = typeof def.bio === 'function' ? def.bio(s) : def.bio;
              return `${title} ${bio}`;
            })
            .join('\n'),
        ],
        [
          `startScene:${s.currentSceneId}`,
          resolveParagraphs(CONTENT_REGISTRY.scenes[s.currentSceneId].paragraphs, s).join('\n'),
        ],
      ];

      for (const [surfaceName, text] of surfaces) {
        for (const sp of spoilers) {
          if (text.includes(sp)) {
            issues.push(`origin=${origin.id} ${surfaceName}: 卷一提前剧透「${sp}」`);
          }
        }
      }
    }

    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    for (const act of ['act1', 'act2', 'act3', 'act4', 'act5', 'act6'] as ActId[]) {
      const snap = getActProgressSnapshot(stateForScene(base, act, `${act}_hub`), false);
      if (/\d+\/\d+|当前\s*\d+/.test(snap.breakthroughProgressText)) {
        issues.push(`blindMode(${act}): 闭关模式泄露原始进度数字 -> ${snap.breakthroughProgressText}`);
      }
    }

    // 开局拾玉（0 线索）不得在焦黑断玉描述或苍溟小传剧透「苍溟/长明大劫/长明元年」
    const jadeInit = createInitialState(
      makeProfile({ openingEventIds: ['ev_charred_jade', 'ev_merchant_manual'] }),
      CONTENT_REGISTRY
    );
    const cmDef = CONTENT_REGISTRY.companions.cang_ming;
    const cmZeroText = [
      CONTENT_REGISTRY.relics.charred_jade_relic.desc,
      typeof cmDef.title === 'function' ? cmDef.title(jadeInit) : cmDef.title,
      typeof cmDef.bio === 'function' ? cmDef.bio(jadeInit) : cmDef.bio,
    ].join('\n');
    for (const sp of ['长明大劫', '长明元年']) {
      if (cmZeroText.includes(sp)) {
        issues.push(`act1-charred-jade: 0 线索断玉/小传剧透「${sp}」`);
      }
    }
    if (CONTENT_REGISTRY.relics.charred_jade_relic.desc.includes('苍溟')) {
      issues.push('charred_jade_relic.desc 不得直接剧透「苍溟」名讳');
    }

    // 卷三/卷四 0 线索世局、疆域与勘验严禁提前剧透中后期谜底
    const midSpoilers = [
      '护界进贡',
      '转运井',
      '兄长失踪',
      '九剑尊血战',
      '斩天四代',
      '斩天四纪',
      '牧灵骗局',
      '收割大期',
      '天门九枢',
      '地底枯脉逆阵',
      '长生烬',
      '避劫灰符',
    ];
    for (const act of ['act3', 'act4'] as ActId[]) {
      const zeroState = { ...stateForScene(base, act, `${act}_hub`), truthClues: [] };
      const text = [
        ...getFactionStandings(zeroState).map((f) => `${f.powerStatus} ${f.summary}`),
        ...getWorldRegions(zeroState).map((r) => `${r.name} ${r.desc}`),
        ...getInvestigationProgress(zeroState, CONTENT_REGISTRY).stages.map(
          (st) => `${st.title} ${st.desc}`
        ),
      ].join('\n');
      for (const sp of midSpoilers) {
        if (text.includes(sp)) {
          issues.push(`${act}(0 clues): 世局/勘验提前剧透「${sp}」`);
        }
      }
    }

    // 卷二 1 线索 / 卷四 1 条四阶线索时，勘验阶段说明不得剧透未获线索
    const act2OneClue = getInvestigationProgress(
      { ...stateForScene(base, 'act2', 'act2_hub'), truthClues: ['clue_mortal_blindspot'] },
      CONTENT_REGISTRY
    )
      .stages.map((st) => `${st.title} ${st.desc}`)
      .join('\n');
    for (const sp of ['转运灵灰', '牧灵骗局', '收割大期', '天门九枢']) {
      if (act2OneClue.includes(sp)) {
        issues.push(`act2(1 clue): 天机勘验提前剧透「${sp}」`);
      }
    }
    const act4OneStage4 = getInvestigationProgress(
      { ...stateForScene(base, 'act4', 'act4_hub'), truthClues: ['clue_mortal_bloodline'] },
      CONTENT_REGISTRY
    )
      .stages.map((st) => `${st.title} ${st.desc}`)
      .join('\n');
    for (const sp of ['收割铁证', '三千年收割大期', '天门九枢']) {
      if (act4OneStage4.includes(sp)) {
        issues.push(`act4(1 stage4 clue): 天机勘验提前剧透「${sp}」`);
      }
    }

    // 卷五开篇 0 线索（且无赤阳密录）不得直泄「收割大期」或无条件派发 clue_furnace_cycle
    const act5Zero = { ...stateForScene(base, 'act5', 'act5_opening'), truthClues: [], relics: [] };
    const act5Scene = CONTENT_REGISTRY.scenes.act5_opening;
    const act5Sub = resolveTextValue(act5Scene.subtitle, act5Zero) ?? '';
    const act5Choice = act5Scene.choices[0];
    const act5Effect =
      typeof act5Choice.effect === 'function' ? act5Choice.effect(act5Zero) : act5Choice.effect;
    const act5Climate = getWorldClimateSnapshot(act5Zero);
    if (act5Sub.includes('收割大期') || act5Climate.skyStatus.includes('收割大期')) {
      issues.push(`act5_opening(0 clues): 副标或世局天象提前剧透「收割大期」`);
    }
    if (act5Effect?.addTruthClues?.includes('clue_furnace_cycle')) {
      issues.push('act5_opening(0 clues): 低线索无密录不应无条件派发 clue_furnace_cycle');
    }

    // 卷三 0 线索进入古战场 step1 后，疆域志亦不得提前泄「九剑尊血战旧址」；实际卷三完成线程应正确揭雾
    const act3SoulStep1Zero = {
      ...stateForScene(base, 'act3', 'act3_hub'),
      truthClues: [],
      flags: { ...base.flags, act3_soul_step1: true },
    };
    const act3SoulRegText = getWorldRegions(act3SoulStep1Zero)
      .map((r) => `${r.name} ${r.desc}`)
      .join('\n');
    if (act3SoulRegText.includes('九剑尊血战')) {
      issues.push('act3(0 clues + act3_soul_step1): 疆域志提前剧透「九剑尊血战」');
    }
    const act3SectDone = {
      ...stateForScene(base, 'act3', 'act3_hub'),
      completedThreads: ['thread_act3_sect', 'thread_act3_chamber'],
    };
    const act3FacDone = getFactionStandings(act3SectDone);
    const alDone = act3FacDone.find((f) => f.id === 'alliance');
    const tjDone = act3FacDone.find((f) => f.id === 'tianji');
    if (!alDone?.powerStatus.includes('护界进贡') || !tjDone?.powerStatus.includes('转运暗港')) {
      issues.push('act3(completed thread_act3_sect/chamber): 势力态势未识别真实卷三线程 ID');
    }

    // UI 源码闭关防线：CompanionSanctuary 闭关不得吐 ${progressPct}%，WorldStatusPanel 不得在 aria-label 吐 %
    const sanctUiSource = ts.sys.readFile(`${SRC_ROOT}/ui/CompanionSanctuary.tsx`) ?? '';
    if (sanctUiSource.includes('${progressPct}%') && sanctUiSource.includes('tianjiInsight ?')) {
      const blindPercentRe = /tianjiInsight\s*\?[^}]*:\s*`\$\{progressPct\}%`/;
      if (blindPercentRe.test(sanctUiSource)) {
        issues.push('CompanionSanctuary.tsx: 闭关模式不得以 ${progressPct}% 泄露好感原值');
      }
    }
    const worldUiSource = ts.sys.readFile(`${SRC_ROOT}/ui/WorldStatusPanel.tsx`) ?? '';
    if (/aria-label=\{`[^`]*veinPercent\}%`/.test(worldUiSource)) {
      issues.push('WorldStatusPanel.tsx: 灵脉进度条 aria-label 不得残留 %');
    }

    expect(issues).toEqual([]);
  });

  it('L2A-6 季节守卫（防夏雪）：夏季渲染非恒雪白名单场景与全结局不得凭空出现残雪/大雪', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const summerBase: GameState = { ...base, seasonIndex: 1 }; // 夏
    const snowRe = /(?:残雪|积雪|大雪纷飞|漫天风雪)/;
    const issues: string[] = [];

    for (const [sceneId, scene] of Object.entries(CONTENT_REGISTRY.scenes)) {
      if (PERMAFROST_OR_WINTER_SCENE_WHITELIST.has(sceneId)) continue;
      const s = stateForScene(summerBase, scene.act, sceneId);
      const text = resolveParagraphs(scene.paragraphs, s).join('\n');
      if (snowRe.test(text)) {
        issues.push(`${sceneId}[夏]: 非恒雪场景出现季节错位词 -> ${text.match(snowRe)?.[0]}`);
      }
    }

    for (const [endingId, ending] of Object.entries(CONTENT_REGISTRY.endings)) {
      const s = stateForScene(summerBase, 'act6', 'act6_final_choice');
      const ep = ending.epilogue(s).join('\n');
      if (snowRe.test(ep)) {
        issues.push(`ending:${endingId}[夏]: 夏季终局出现季节错位词 -> ${ep.match(snowRe)?.[0]}`);
      }
    }

    expect(issues).toEqual([]);
  });

  it('L2A-7 全跨卷「前尘余波」极限状态全检：零占位符残余、零凡人并肩天门、零未遇幽灵', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const openingScenes: Array<[ActId, string]> = [
      ['act2', 'act2_opening_qingyun'],
      ['act2', 'act2_opening_darkmarket'],
      ['act2', 'act2_opening_wanderer'],
      ['act3', 'act3_opening'],
      ['act4', 'act4_opening'],
      ['act5', 'act5_opening'],
      ['act6', 'act6_sky_gate'],
    ];

    const profiles: Array<[string, GameState]> = [
      ['loneWolf', base],
      [
        'suPartnerAlive',
        {
          ...base,
          daoPartnerId: 'su_zhiwei',
          flags: { su_zhiwei_saved_longlife: true },
          companions: {
            ...base.companions,
            su_zhiwei: {
              met: true,
              affection: 95,
              stance: 'bonded',
              bondType: 'dao_partner',
              stage: 4,
              chronicle: [],
            },
          },
        },
      ],
      [
        'suDeadCmSealed',
        {
          ...base,
          flags: { su_zhiwei_passed: true, cangming_sealed: true, act4_cangming_sealed: true },
          companions: {
            ...base.companions,
            su_zhiwei: {
              met: true,
              affection: 80,
              stance: 'bonded',
              deceased: true,
              deceasedYear: 3058,
              stage: 4,
              chronicle: [],
            },
            cang_ming: { met: true, affection: 60, stance: 'confidant', stage: 3, chronicle: [] },
          },
        },
      ],
    ];

    const issues: string[] = [];
    for (const [label, templateState] of profiles) {
      for (const [act, sceneId] of openingScenes) {
        const s = stateForScene(templateState, act, sceneId);
        const echo = getActTransitionEcho(s, sceneId, CONTENT_REGISTRY);
        if (!echo) continue;
        const txt = `${echo.actBanner}\n${echo.bullets.join('\n')}`;
        issues.push(...collectRuntimeTextIssues(`echo:${label}@${sceneId}`, txt));
        if (label === 'suPartnerAlive' && txt.includes('并肩迎向天门')) {
          issues.push(`echo:${label}@${sceneId}: 凡人道侣苏知微误写「并肩迎向天门」`);
        }
        if (label === 'loneWolf' && /(?:沈清霜|谢无咎|苏知微|苍溟)/.test(txt)) {
          issues.push(`echo:${label}@${sceneId}: 孤狼零故人前尘余波凭空提及故人 -> ${txt}`);
        }
      }
    }

    expect(issues).toEqual([]);
  });

  it('L2A-8 枢纽/关口/终局门槛对齐与雅阁调度状态闭环', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. 卷二/三/四 枢纽破境提示与真实关口灵石门槛严格对齐（220 / 420 / 520）
    const act2GateChoice = CONTENT_REGISTRY.scenes.act2_hub.choices.find(
      (c) => c.id === 'hub_foundation_gate'
    )!;
    const act2Short = {
      ...stateForScene(base, 'act2', 'act2_hub'),
      spiritStones: 200,
      mind: 55,
      tags: ['merchant_fame'],
      relics: [],
    };
    expect(resolveTextValue(act2GateChoice.subtext, act2Short) ?? '').not.toContain('当前筹备：');
    const act2Ready = { ...act2Short, spiritStones: 220 };
    expect(resolveTextValue(act2GateChoice.subtext, act2Ready) ?? '').toContain('220灵石齐备');

    const act3GateChoice = CONTENT_REGISTRY.scenes.act3_hub.choices.find(
      (c) => c.id === 'hub3_golden_core_gate'
    )!;
    const act3Short = {
      ...stateForScene(base, 'act3', 'act3_hub'),
      spiritStones: 380,
      tags: ['merchant_fame'],
      relics: [],
    };
    expect(resolveTextValue(act3GateChoice.subtext, act3Short) ?? '').not.toContain('四百二十灵石齐备');
    const act3Ready = { ...act3Short, spiritStones: 420 };
    expect(resolveTextValue(act3GateChoice.subtext, act3Ready) ?? '').toContain('四百二十灵石齐备');

    const act4GateChoice = CONTENT_REGISTRY.scenes.act4_hub.choices.find(
      (c) => c.id === 'hub4_nascent_gate'
    )!;
    const act4Short = {
      ...stateForScene(base, 'act4', 'act4_hub'),
      spiritStones: 500,
      tags: ['merchant_fame'],
      relics: [],
    };
    expect(resolveTextValue(act4GateChoice.subtext, act4Short) ?? '').not.toContain('财力阵势充裕');
    const act4Ready = { ...act4Short, spiritStones: 520 };
    expect(resolveTextValue(act4GateChoice.subtext, act4Ready) ?? '').toContain('财力阵势充裕');

    // 2. 【万金镇山河】百宝商网门槛与 act5_6.ts 统一为谢无咎好感 >= 30
    const gildedLowXie: GameState = {
      ...stateForScene(base, 'act6', 'act6_final_choice'),
      spiritStones: 200,
      relics: [],
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: 25, stance: 'stranger', stage: 2, chronicle: [] },
      },
    };
    expect(
      CONTENT_REGISTRY.endings.ending_gilded_realm.epilogue(gildedLowXie).join('\n')
    ).not.toContain('百宝商盟暗网');
    const gildedHighXie: GameState = {
      ...gildedLowXie,
      companions: {
        ...gildedLowXie.companions,
        xie_wujiu: { ...gildedLowXie.companions.xie_wujiu, affection: 30, stance: 'confidant' },
      },
    };
    expect(
      CONTENT_REGISTRY.endings.ending_gilded_realm.epilogue(gildedHighXie).join('\n')
    ).toContain('百宝商盟暗网');

    // 3. 调度器在卷一/卷六/同step决裂/未过M1/苏垂暮时不弹假「仙缘契机/结契契机」
    const act1Cross = applyEffect(
      {
        ...base,
        act: 'act1',
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: 25, stance: 'stranger', stage: 1, chronicle: [] },
        },
      },
      { companionUpdates: { shen_qingshuang: { affectionDelta: 10 } } },
      CONTENT_REGISTRY
    ).state;
    expect(act1Cross.recentNotices.join('\n')).not.toContain('仙缘契机');

    const breakSameStep = applyEffect(
      {
        ...base,
        act: 'act2',
        companions: {
          ...base.companions,
          shen_qingshuang: { met: true, affection: 25, stance: 'stranger', stage: 1, chronicle: [] },
        },
      },
      { companionUpdates: { shen_qingshuang: { affectionDelta: 10, setStance: 'estranged' } } },
      CONTENT_REGISTRY
    ).state;
    expect(breakSameStep.recentNotices.join('\n')).not.toContain('仙缘契机');

    const skipM1Cross75 = applyEffect(
      {
        ...base,
        act: 'act2',
        companions: {
          ...base.companions,
          xie_wujiu: {
            met: true,
            affection: 70,
            stance: 'confidant',
            milestoneStage: 0,
            stage: 2,
            chronicle: [],
          },
        },
      },
      { companionUpdates: { xie_wujiu: { affectionDelta: 10 } } },
      CONTENT_REGISTRY
    ).state;
    expect(skipM1Cross75.recentNotices.join('\n')).not.toContain('结契契机');

    // 4. 非道侣 su_hearth_pulse 不静默涤血煞且通知精确为 +11
    const swornSuTainted: GameState = {
      ...base,
      act: 'act3',
      tags: ['blood_pill_tainted'],
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 82,
          stance: 'bonded',
          bondType: 'sworn',
          milestoneStage: 2,
          stage: 3,
          chronicle: [],
        },
      },
    };
    const pulseRes = performSanctuaryActivity(swornSuTainted, 'su_zhiwei', 'su_hearth_pulse');
    expect(pulseRes.ok).toBe(true);
    expect(pulseRes.state.tags).toContain('blood_pill_tainted');
    expect(pulseRes.notice).toContain('心境 +11');
    expect(pulseRes.notice).not.toContain('+15');

    // 5. 终局状态关闭雅阁；卷五高龄苏知微禁新结契但可寄驿札与远信赠礼
    const endedState: GameState = { ...swornSuTainted, endingId: 'ending_qingzhou_hearth' };
    expect(getSanctuaryActivities(endedState, 'su_zhiwei')).toHaveLength(0);
    expect(canTriggerMilestone1(endedState, 'su_zhiwei')).toBe(false);

    const act5SeniorSu: GameState = {
      ...base,
      act: 'act5',
      ageMonths: 86 * 12,
      year: 3078,
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 82,
          stance: 'confidant',
          milestoneStage: 1,
          stage: 4,
          chronicle: [],
        },
      },
    };
    expect(canCommitBond(act5SeniorSu, 'su_zhiwei', 'dao_partner').ok).toBe(false);
    expect(getSanctuaryActivities(act5SeniorSu, 'su_zhiwei').length).toBeGreaterThan(0);

    // 6. 卷四高龄苏知微：未赴槐阴时为 farewell 态，已结案或错过槐阴后切为 senior 态（不引导不可达场景）
    const act4SuFarewell: GameState = {
      ...base,
      act: 'act4',
      ageMonths: 76 * 12,
      year: 2996 + 76,
      flags: { su_zhiwei_saved_longlife: true },
      activeThreads: ['thread_act4_mortal'],
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 82, stance: 'bonded', milestoneStage: 1, stage: 4, chronicle: [], letters: [] },
      },
    };
    expect(isSuAct4FarewellStage(act4SuFarewell, 'su_zhiwei')).toBe(true);
    expect(isSuAct5SeniorStage(act4SuFarewell, 'su_zhiwei')).toBe(false);

    const act4SuAfterMortalDone: GameState = {
      ...act4SuFarewell,
      activeThreads: [],
      completedThreads: ['thread_act4_mortal'],
    };
    expect(isSuAct4FarewellStage(act4SuAfterMortalDone, 'su_zhiwei')).toBe(false);
    expect(isSuAct5SeniorStage(act4SuAfterMortalDone, 'su_zhiwei')).toBe(true);
    expect(getSanctuaryActivities(act4SuAfterMortalDone, 'su_zhiwei').length).toBeGreaterThan(0);

    // 7. 跨卷连续游玩临界态实测：苍溟 35~50 塑骨 / 沈清霜 rival 翻越 -5 / 卷三 65→66 临终 / 终局不弹契机 / 坐化场景区分 / 死手来源对齐
    const cmRebirthState: GameState = {
      ...stateForScene(base, 'act4', 'act4_arc_cangming_rebirth'),
      relics: ['soul_nourishing_wood', 'charred_jade_relic'],
      companions: {
        ...base.companions,
        cang_ming: { met: true, affection: 40, stance: 'confidant', stage: 4, chronicle: [] },
      },
    };
    const cmStep = advanceChoice(cmRebirthState, 'cm_rebirth_wood', CONTENT_REGISTRY).state;
    expect(cmStep.flags.cm_rebirth_mode).toBe('trusted');
    expect(cmStep.pendingTransition?.paragraphs.join('\n') ?? '').toContain('命归我自持');
    expect(cmStep.pendingTransition?.paragraphs.join('\n') ?? '').not.toContain('反客为主');

    const shenRivalState: GameState = {
      ...stateForScene(base, 'act4', 'act4_arc_zhantian_2'),
      alignment: { righteous: 10, worldly: 0 },
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: -8, stance: 'rival', stage: 3, chronicle: [] },
      },
    };
    const ztStep = advanceChoice(shenRivalState, 'zt2_rebuild_alliance', CONTENT_REGISTRY).state;
    expect(ztStep.flags.zt2_shen_was_ally).toBe(false);
    expect(ztStep.pendingTransition?.paragraphs.join('\n') ?? '').toContain('仍必取你首级');
    expect(ztStep.pendingTransition?.paragraphs.join('\n') ?? '').not.toContain('并肩立于坛侧');

    const su65State: GameState = {
      ...stateForScene(base, 'act3', 'act3_arc_hearth_1'),
      ageMonths: 65 * 12,
      year: 2996 + 65,
      flags: { su_zhiwei_saved_longlife: false },
      companions: {
        ...base.companions,
        su_zhiwei: { met: true, affection: 60, stance: 'confidant', stage: 3, chronicle: [] },
      },
    };
    const hearthStep1 = advanceChoice(su65State, 'hearth1_stay_companion', CONTENT_REGISTRY).state;
    const hearthScene2State = commitTransition(hearthStep1, CONTENT_REGISTRY).state;
    expect(hearthScene2State.currentSceneId).toBe('act3_arc_hearth_2');
    const hearth2Paras = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act3_arc_hearth_2.paragraphs,
      hearthScene2State
    ).join('\n');
    expect(hearth2Paras).toContain('人活一世，还能求什么');
    expect(hearth2Paras).not.toContain('绝笔');

    // 终局步不弹出假「仙缘契机 / 结契契机」
    const hearthEndingPre: GameState = {
      ...stateForScene(base, 'act3', 'act3_arc_hearth_2'),
      ageMonths: 45 * 12,
      year: 2996 + 45,
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 26,
          stance: 'stranger',
          milestoneStage: 0,
          stage: 3,
          chronicle: [],
        },
      },
    };
    const hearthEndRes = advanceChoice(hearthEndingPre, 'hearth2_stay_ending', CONTENT_REGISTRY).state;
    const hearthEndNotices = [
      ...hearthEndRes.recentNotices,
      ...(hearthEndRes.pendingTransition?.notices ?? []),
    ].join('\n');
    expect(hearthEndNotices).not.toContain('仙缘契机');
    expect(hearthEndNotices).not.toContain('结契契机');

    // 闭死关枯坐坐化 → 坐化于闭关静室；非闭关游历坐化 → 气绝于问道途中
    const grindDeathPre: GameState = {
      ...stateForScene(base, 'act2', 'act2_foundation_gate'),
      realm: 'qi_peak',
      lifespanYears: 130,
      ageMonths: 120 * 12,
      year: 2996 + 120,
      relics: [],
    };
    const grindDeathRes = advanceChoice(grindDeathPre, 'found_slow_grind', CONTENT_REGISTRY).state;
    expect(grindDeathRes.historyLog[grindDeathRes.historyLog.length - 1]?.summary).toContain(
      '坐化于闭关静室'
    );

    const errandDeathPre: GameState = {
      ...stateForScene(base, 'act2', 'act2_action_commission'),
      realm: 'qi_peak',
      lifespanYears: 130,
      ageMonths: 129 * 12 + 10,
      year: 2996 + 129,
      might: 50,
      relics: [],
    };
    const errandDeathRes = advanceChoice(errandDeathPre, 'a2_job_beast', CONTENT_REGISTRY).state;
    expect(errandDeathRes.historyLog[errandDeathRes.historyLog.length - 1]?.summary).toContain(
      '气绝于问道途中'
    );

    // 卷三总账堂纯越阶战力胁迫（无死手）不幻觉「暗桩先手 / 死手暗网」
    const purePowerChamber: GameState = {
      ...stateForScene(base, 'act3', 'act3_arc_chamber_2'),
      might: 140,
      tags: ['sword_intent_seed', 'demonic_sovereign'],
      relics: ['severing_sword_embryo', 'broken_sky_seal'],
      flags: { act3_chamber_mode: 'solo', foundation_grade: 'sword_ancient', overmatch_drill_act3: true },
    };
    const chamberStep = advanceChoice(
      purePowerChamber,
      'chamber2_seize_ledger_deal',
      CONTENT_REGISTRY
    ).state;
    const chamberText = [
      ...(chamberStep.pendingTransition?.paragraphs ?? []),
      chamberStep.lastBridgeNote ?? '',
      chamberStep.historyLog[chamberStep.historyLog.length - 1]?.summary ?? '',
    ].join('\n');
    expect(chamberStep.flags.chamber2_coercion_result).toBe('success');
    expect(chamberStep.flags.chamber2_used_switch).toBe(false);
    expect(chamberText).not.toContain('暗桩先手');
    expect(chamberText).not.toContain('死手暗网');
    expect(chamberText).not.toContain('凭死手');
  });

  it('L2A-9 Slice 10 七大 React UI 组件实渲染守卫：闭关零百分比、闭阁零结契徽章、零周目万象志去剧透与边界交互一致性', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);
    const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const emptyMeta = {
      schemaVersion: 2,
      totalRuns: 0,
      unlockedEndings: [],
      unlockedTruthClues: [],
      seenTags: [],
      seenRelics: [],
      metCompanions: [],
      companionBestStance: {},
    };
    const noop = () => {};

    // 1. CompanionSanctuary 闭关模式（tianjiInsight = false）：纯文本零 %、零 30/75 刻度、负好感标心存芥蒂
    const blindSanctState: GameState = {
      ...stateForScene(base, 'act3', 'act3_hub'),
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 48, stance: 'confidant', milestoneStage: 0, stage: 2, chronicle: [], letters: [] },
        xie_wujiu: { met: true, affection: -8, stance: 'stranger', milestoneStage: 0, stage: 1, chronicle: [], letters: [] },
      },
    };
    const blindShenHtml = renderToStaticMarkup(
      React.createElement(CompanionSanctuary, {
        state: blindSanctState,
        registry: CONTENT_REGISTRY,
        tianjiInsight: false,
        initialCompanionId: 'shen_qingshuang',
        onUpdateState: noop,
      })
    );
    const blindShenText = stripTags(blindShenHtml);
    expect(blindShenText).not.toMatch(/\d+\s*%/);
    expect(blindShenText).not.toContain('30 ·');
    expect(blindShenText).not.toContain('75 ·');
    expect(blindShenText).not.toContain('48 / 100');

    const negXieHtml = renderToStaticMarkup(
      React.createElement(CompanionSanctuary, {
        state: blindSanctState,
        registry: CONTENT_REGISTRY,
        tianjiInsight: false,
        initialCompanionId: 'xie_wujiu',
        onUpdateState: noop,
      })
    );
    expect(stripTags(negXieHtml)).toContain('心存芥蒂');
    expect(stripTags(negXieHtml)).not.toContain('渐生默契');

    // 2. 凡人道侣苏知微（卷三在世）显示通用表述、零「双修共鸣已启」
    const suPartnerAct3: GameState = {
      ...stateForScene(base, 'act3', 'act3_hub'),
      ageMonths: 40 * 12,
      year: 2996 + 40,
      daoPartnerId: 'su_zhiwei',
      flags: { su_zhiwei_saved_longlife: true },
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 90,
          stance: 'bonded',
          bondType: 'dao_partner',
          milestoneStage: 2,
          stage: 3,
          chronicle: [],
          letters: [],
        },
      },
    };
    const suPartnerHtml = renderToStaticMarkup(
      React.createElement(CompanionSanctuary, {
        state: suPartnerAct3,
        registry: CONTENT_REGISTRY,
        tianjiInsight: true,
        initialCompanionId: 'su_zhiwei',
        onUpdateState: noop,
      })
    );
    expect(stripTags(suPartnerHtml)).toContain('此生唯一 · 专属雅叙已启');
    expect(stripTags(suPartnerHtml)).not.toContain('双修共鸣已启');

    // 3. 卷六 / 早期终局：CompanionSanctuary、DrawerPanels(故人志)、TopStatusBar 全面闭阁且零「可定结契」与红点
    const act6ClosedState: GameState = {
      ...stateForScene(base, 'act6', 'act6_sky_gate'),
      daoPartnerId: 'shen_qingshuang',
      companions: {
        ...base.companions,
        shen_qingshuang: {
          met: true,
          affection: 92,
          stance: 'bonded',
          bondType: 'dao_partner',
          milestoneStage: 2,
          stage: 4,
          chronicle: [],
          letters: [],
        },
        xie_wujiu: {
          met: true,
          affection: 85,
          stance: 'bonded',
          bondType: 'none',
          milestoneStage: 1,
          stage: 4,
          chronicle: [],
          letters: [],
        },
        su_zhiwei: {
          met: true,
          affection: 80,
          stance: 'bonded',
          deceased: true,
          deceasedYear: 3060,
          stage: 4,
          chronicle: [],
          letters: [],
        },
      },
    };
    expect(getCompanionStatusBadge(act6ClosedState, 'xie_wujiu').subLabel).toBeUndefined();
    const act6SanctHtml = renderToStaticMarkup(
      React.createElement(CompanionSanctuary, {
        state: act6ClosedState,
        registry: CONTENT_REGISTRY,
        tianjiInsight: true,
        initialCompanionId: 'xie_wujiu',
        onUpdateState: noop,
      })
    );
    const act6SanctText = stripTags(act6SanctHtml);
    expect(act6SanctText).toContain('雅阁暂闭');
    expect(act6SanctText).toContain('沈清霜');
    expect(act6SanctText).not.toContain('可定结契');
    expect(act6SanctText).not.toContain('择定此生名分');

    const act6DeadSuSanctHtml = renderToStaticMarkup(
      React.createElement(CompanionSanctuary, {
        state: act6ClosedState,
        registry: CONTENT_REGISTRY,
        tianjiInsight: true,
        initialCompanionId: 'su_zhiwei',
        onUpdateState: noop,
      })
    );
    expect(stripTags(act6DeadSuSanctHtml)).not.toContain('仍可于此焚香追思');

    const act6DrawerCompHtml = renderToStaticMarkup(
      React.createElement(DrawerPanels, {
        activeTab: 'companions',
        state: act6ClosedState,
        registry: CONTENT_REGISTRY,
        meta: emptyMeta,
        checkpoints: [],
        manualSlots: [],
        tianjiInsight: true,
        instantText: true,
        onOpenSanctuary: noop,
        onUpdateState: noop,
        onToggleInstantText: noop,
        onClose: noop,
        onCreateManualSave: noop,
        onDeleteManualSave: noop,
        onLoadSave: noop,
        onImportState: noop,
      })
    );
    const act6DrawerCompText = stripTags(act6DrawerCompHtml);
    expect(act6DrawerCompText).not.toContain('可定结契');
    expect(act6DrawerCompText).not.toContain('可赴仙缘雅阁定契');
    expect(act6DrawerCompText).toContain('览旧信 / 编年');

    const act6TopBarHtml = renderToStaticMarkup(
      React.createElement(TopStatusBar, {
        state: act6ClosedState,
        registry: CONTENT_REGISTRY,
        prefs: { tianjiInsight: true, theme: 'parchment', instantText: true },
        activeDrawer: null,
        onOpenDrawer: noop,
        onToggleTianji: noop,
        onToggleTheme: noop,
        onGoTitle: noop,
      })
    );
    expect(act6TopBarHtml).not.toContain('nav-dot');

    // 4. 卷四苏垂暮（道侣）：顶部横幅不写「专属雅叙已启」，不出现「可定结契」
    const act4SuPartnerFarewell: GameState = {
      ...stateForScene(base, 'act4', 'act4_hub'),
      ageMonths: 78 * 12,
      year: 2996 + 78,
      daoPartnerId: 'su_zhiwei',
      flags: { su_zhiwei_saved_longlife: true },
      activeThreads: ['thread_act4_mortal'],
      companions: {
        ...base.companions,
        su_zhiwei: {
          met: true,
          affection: 95,
          stance: 'bonded',
          bondType: 'dao_partner',
          milestoneStage: 2,
          stage: 4,
          chronicle: [],
          letters: [],
        },
      },
    };
    const act4SuFarewellHtml = renderToStaticMarkup(
      React.createElement(CompanionSanctuary, {
        state: act4SuPartnerFarewell,
        registry: CONTENT_REGISTRY,
        tianjiInsight: true,
        initialCompanionId: 'su_zhiwei',
        onUpdateState: noop,
      })
    );
    expect(stripTags(act4SuFarewellHtml)).toContain('已入暮年 · 请赴青州槐阴');
    expect(stripTags(act4SuFarewellHtml)).not.toContain('专属雅叙已启');

    // 5. 零周目万象志：终局录启用迷雾提示，奇物来源表全量零剧透词
    const metaDrawerHtml = renderToStaticMarkup(
      React.createElement(DrawerPanels, {
        activeTab: 'meta',
        state: base,
        registry: CONTENT_REGISTRY,
        meta: emptyMeta,
        checkpoints: [],
        manualSlots: [],
        tianjiInsight: false,
        instantText: true,
        onToggleInstantText: noop,
        onClose: noop,
        onCreateManualSave: noop,
        onDeleteManualSave: noop,
        onLoadSave: noop,
        onImportState: noop,
      })
    );
    const metaDrawerText = stripTags(metaDrawerHtml);
    expect(metaDrawerText).toContain('初通任一终局后显线索');
    for (const sp of ['逆吞天门', '假死隐世', '谢无咎', '古脉逆阵', '飞升碑背']) {
      expect(metaDrawerText).not.toContain(sp);
    }
    const allRelicHints = Object.values(RELIC_ORIGIN_HINTS).join('\n');
    for (const sp of ['谢无咎', '古脉逆阵', '飞升碑背', '牧灵', '收割']) {
      expect(allRelicHints).not.toContain(sp);
    }
    const allFogHints = Object.values(FOG_ENDING_HINTS).join('\n');
    for (const sp of ['逆吞天门', '假死', '收割', '牧灵', '铁证']) {
      expect(allFogHints).not.toContain(sp);
    }

    // 5b. 卷一故人志不误标「结契」；早期终局（endingId）同步关闭 TopStatusBar 红点与雅阁
    const act1CompDrawerHtml = renderToStaticMarkup(
      React.createElement(DrawerPanels, {
        activeTab: 'companions',
        state: {
          ...base,
          act: 'act1',
          companions: {
            ...base.companions,
            shen_qingshuang: { met: true, affection: 80, stance: 'bonded', milestoneStage: 0, stage: 1, chronicle: [], letters: [] },
          },
        },
        registry: CONTENT_REGISTRY,
        meta: emptyMeta,
        checkpoints: [],
        manualSlots: [],
        tianjiInsight: true,
        instantText: true,
        onOpenSanctuary: noop,
        onUpdateState: noop,
        onToggleInstantText: noop,
        onClose: noop,
        onCreateManualSave: noop,
        onDeleteManualSave: noop,
        onLoadSave: noop,
        onImportState: noop,
      })
    );
    const act1CompDrawerText = stripTags(act1CompDrawerHtml);
    expect(act1CompDrawerText).toContain('入仙缘雅阁 · 雅叙 / 赠礼');
    expect(act1CompDrawerText).not.toContain('雅叙 / 赠礼 / 结契');
    expect(act1CompDrawerText).not.toContain('可定结契');

    const earlyEndingState: GameState = {
      ...stateForScene(base, 'act3', 'act3_hub'),
      endingId: 'ending_qingzhou_hearth',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 85, stance: 'bonded', milestoneStage: 1, stage: 3, chronicle: [], letters: [] },
      },
    };
    const earlyEndTopBarHtml = renderToStaticMarkup(
      React.createElement(TopStatusBar, {
        state: earlyEndingState,
        registry: CONTENT_REGISTRY,
        prefs: { tianjiInsight: true, theme: 'parchment', instantText: true },
        activeDrawer: null,
        onOpenDrawer: noop,
        onToggleTianji: noop,
        onToggleTheme: noop,
        onGoTitle: noop,
      })
    );
    expect(earlyEndTopBarHtml).not.toContain('nav-dot');

    // 6. EndingView 至交故人包含仅经雅阁升至 affection >= 30 的故人
    const endingState: GameState = {
      ...stateForScene(base, 'act6', 'act6_final_choice'),
      endingId: 'ending_sever_sky_solo',
      companions: {
        ...base.companions,
        xie_wujiu: { met: true, affection: 36, stance: 'stranger', stage: 2, chronicle: [] },
      },
    };
    const endingHtml = renderToStaticMarkup(
      React.createElement(EndingView, {
        state: endingState,
        registry: CONTENT_REGISTRY,
        onRewindSaves: noop,
        onStartNewRun: noop,
        onOpenMeta: noop,
        onGoTitle: noop,
      })
    );
    expect(stripTags(endingHtml)).toContain('谢无咎');

    // 7. WorldStatusPanel 灵脉 aria-label 零 %
    const worldHtml = renderToStaticMarkup(
      React.createElement(WorldStatusPanel, {
        state: base,
        registry: CONTENT_REGISTRY,
        tianjiInsight: false,
      })
    );
    expect(worldHtml).toContain('aria-label="九州灵脉：灵潮缓退（约余五成）"');
    expect(worldHtml).not.toMatch(/aria-label="[^"]*%/);

    // 8. ReaderView 卷一枢纽去双括号 & 单选项显单键 1（非 1-1）
    const act1HubHtml = renderToStaticMarkup(
      React.createElement(ReaderView, {
        state: { ...base, currentSceneId: 'act1_qinglan_arrival' },
        scene: CONTENT_REGISTRY.scenes.act1_qinglan_arrival,
        registry: CONTENT_REGISTRY,
        tianjiInsight: false,
        instantText: true,
        drawerOpen: false,
        loadNonce: 0,
        onSelectChoice: noop,
        onCommitTransition: noop,
        onUpdateState: noop,
      })
    );
    expect(stripTags(act1HubHtml)).toContain('破境机缘 · 引气入体（炼气）：');
    expect(stripTags(act1HubHtml)).not.toContain('破境机缘（引气入体（炼气））');

    const singleChoiceHtml = renderToStaticMarkup(
      React.createElement(ReaderView, {
        state: stateForScene(base, 'act6', 'act6_sky_gate'),
        scene: CONTENT_REGISTRY.scenes.act6_sky_gate,
        registry: CONTENT_REGISTRY,
        tianjiInsight: false,
        instantText: true,
        drawerOpen: false,
        loadNonce: 0,
        onSelectChoice: noop,
        onCommitTransition: noop,
        onUpdateState: noop,
      })
    );
    expect(stripTags(singleChoiceHtml)).toContain('可按数字键 1 快速抉择');
    expect(stripTags(singleChoiceHtml)).not.toContain('1-1');

    // 9. MarketPanel 卷五清仓无货且奇物皆已持有时准确提示已悉数易主
    const emptyAct5MarketState: GameState = {
      ...stateForScene(base, 'act5', 'act5_market'),
      relics: ['broken_sky_seal', 'severing_sword_embryo', 'nascent_lotus'],
      market: { ...base.market, holdings: {} },
    };
    const marketHtml = renderToStaticMarkup(
      React.createElement(MarketPanel, {
        config: CONTENT_REGISTRY.scenes.act5_market.market!,
        state: emptyAct5MarketState,
        registry: CONTENT_REGISTRY,
        onUpdateState: noop,
      })
    );
    expect(stripTags(marketHtml)).toContain('本坊奇物亦已悉数易主');
    expect(stripTags(marketHtml)).not.toContain('可径直选购下方稀缺奇物');
  });

  it('L2A-10 世界观终审跨卷因果守卫：九枢与无灵知识封漏、苏/沈/苍状态机及终局善后闭环', () => {
    const base = createInitialState(makeProfile(), CONTENT_REGISTRY);

    // 1. 未获 clue_gate_weakness 时，卷五风雪夜、枢纽收尾与卷六全程严禁凭空预知「九枢 / 东侧三座阵眼」
    const noPivotState: GameState = {
      ...stateForScene(base, 'act5', 'act5_arc_final_eve'),
      tags: ['cangming_reborn'],
      truthClues: [
        'clue_stele_gap',
        'clue_vein_drain',
        'clue_blood_pill_dust',
        'clue_mortal_blindspot',
        'clue_changming_night',
        'clue_furnace_cycle',
      ],
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 80, stance: 'bonded', stage: 4, chronicle: [] },
        xie_wujiu: { met: true, affection: 80, stance: 'bonded', stage: 4, chronicle: [] },
        cang_ming: { met: true, affection: 80, stance: 'bonded', stage: 4, chronicle: [] },
      },
    };
    const eveNoPivotText = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_arc_final_eve.paragraphs,
      noPivotState
    ).join('\n');
    expect(eveNoPivotText).not.toContain('九枢');
    expect(eveNoPivotText).not.toContain('东侧三座阵眼');

    const gateNoPivot: GameState = {
      ...noPivotState,
      act: 'act6',
      realm: 'deity_transform',
      currentSceneId: 'act6_sky_gate',
    };
    const skyGateNoPivotText = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act6_sky_gate.paragraphs,
      gateNoPivot
    ).join('\n');
    expect(skyGateNoPivotText).not.toContain('九枢');
    expect(skyGateNoPivotText).not.toContain('外围阵眼');

    const finalNoPivot: GameState = { ...gateNoPivot, currentSceneId: 'act6_final_choice' };
    const finalNoPivotParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act6_final_choice.paragraphs,
      finalNoPivot
    ).join('\n');
    expect(finalNoPivotParas).not.toContain('九道逆枢');
    const finalNoPivotChoices = getResolvedChoices(
      finalNoPivot,
      CONTENT_REGISTRY.scenes.act6_final_choice,
      CONTENT_REGISTRY
    );
    expect(finalNoPivotChoices.some((c) => c.id === 'final_sever_sky_bonded')).toBe(false);
    expect(finalNoPivotChoices.some((c) => c.id === 'final_sever_sky_solo')).toBe(false);

    // 2. 无无灵线索且无【无灵归尘印】时，卷五半步自封改用「枯石龟息秘术」，绝不凭空施展「无灵盲区」
    const noBlindspotBreakthrough: GameState = {
      ...stateForScene(base, 'act5', 'act5_deity_breakthrough'),
      mind: 320,
      relics: [],
      truthClues: [
        'clue_stele_gap',
        'clue_vein_drain',
        'clue_blood_pill_dust',
        'clue_tianji_portal',
      ],
    };
    const btParas = resolveParagraphs(
      CONTENT_REGISTRY.scenes.act5_deity_breakthrough.paragraphs,
      noBlindspotBreakthrough
    ).join('\n');
    expect(btParas).toContain('枯石龟息秘术');
    expect(btParas).not.toContain('无灵盲区');
    const sealChoice = getResolvedChoices(
      noBlindspotBreakthrough,
      CONTENT_REGISTRY.scenes.act5_deity_breakthrough,
      CONTENT_REGISTRY
    ).find((c) => c.id === 'deity_seal_earth_immortal');
    expect(sealChoice?.label).toContain('枯石龟息秘术');
    expect(sealChoice?.label).not.toContain('无灵盲区');

    // 3. 复生苍溟在【红尘散仙】走专属挑衅斩剑遁入北溟分支；断玉道侣伴其他挚友破天门时有专属悼词
    const hiddenRebornCm: GameState = {
      ...stateForScene(base, 'act6', 'act6_final_choice'),
      tags: ['cangming_reborn'],
      companions: {
        ...base.companions,
        cang_ming: { met: true, affection: 80, stance: 'bonded', stage: 4, chronicle: [] },
      },
    };
    const hiddenEp = CONTENT_REGISTRY.endings.ending_earth_immortal
      .epilogue(hiddenRebornCm)
      .join('\n');
    expect(hiddenEp).toContain('挑衅剑虹');
    expect(hiddenEp).toContain('北溟绝域');
    expect(hiddenEp).not.toContain('替过往散修指点剑道');

    const jadePartnerWithShen: GameState = {
      ...stateForScene(base, 'act6', 'act6_final_choice'),
      daoPartnerId: 'cang_ming',
      companions: {
        ...base.companions,
        shen_qingshuang: { met: true, affection: 85, stance: 'bonded', stage: 4, chronicle: [] },
        cang_ming: {
          met: true,
          affection: 95,
          stance: 'bonded',
          bondType: 'dao_partner',
          stage: 4,
          chronicle: [],
        },
      },
    };
    const bondedMournEp = CONTENT_REGISTRY.endings.ending_sever_sky_bonded
      .epilogue(jadePartnerWithShen)
      .join('\n');
    expect(bondedMournEp).toContain('断玉道侣却已在最后一剑里碎作青萤');
    expect(bondedMournEp).not.toContain('始终不曾松开彼此的手');
  });
});

describe('《长生烬》三层防线 · Layer 2B 固定种子多路径六幕蒙特卡洛通关跑图', () => {
  it('L2B-1 40 条确定性随机游玩轨迹：历法恒等式、数值合法、零异常渲染且可达多元结局', () => {
    const origins = CONTENT_REGISTRY.origins.map((o) => o.id);
    const daoHearts = CONTENT_REGISTRY.daoHearts.map((d) => d.id);
    const genders: Gender[] = ['male', 'female', 'other'];
    const openEvents = CONTENT_REGISTRY.openingEvents.map((e) => e.id);

    const issues: string[] = [];
    const reachedActs = new Set<ActId>();
    const reachedEndings = new Set<string>();
    let totalStepsExecuted = 0;

    for (let runIdx = 0; runIdx < 40; runIdx++) {
      const rng = mulberry32(20261126 + runIdx * 997);
      const originId = origins[runIdx % origins.length];
      const daoHeartId = daoHearts[Math.floor(runIdx / origins.length) % daoHearts.length];
      const gender = genders[runIdx % genders.length];
      const ev1 = openEvents[runIdx % openEvents.length];
      const ev2 = openEvents[(runIdx * 3 + 1) % openEvents.length];
      const openingEventIds = ev1 === ev2 ? [ev1] : [ev1, ev2];

      let state = createInitialState(
        makeProfile({ originId, daoHeartId, gender, openingEventIds }),
        CONTENT_REGISTRY
      );

      for (let step = 0; step < 180; step++) {
        reachedActs.add(state.act);

        const ageYears = Math.floor(state.ageMonths / 12);
        if (state.year - ageYears !== 2996) {
          issues.push(
            `run#${runIdx}@step${step}: 历法漂移 year=${state.year}, ageYears=${ageYears}`
          );
          break;
        }
        if (
          Number.isNaN(state.might) ||
          Number.isNaN(state.mind) ||
          Number.isNaN(state.renown) ||
          Number.isNaN(state.spiritStones) ||
          state.spiritStones < 0
        ) {
          issues.push(`run#${runIdx}@step${step}: 数值异常 stones=${state.spiritStones}`);
          break;
        }
        if (isCompanionSealed(state, 'cang_ming') && state.daoPartnerId === 'cang_ming') {
          issues.push(`run#${runIdx}@step${step}: 苍溟永封后仍保留 daoPartnerId`);
          break;
        }

        if (state.endingId) {
          reachedEndings.add(state.endingId);
          const ending = CONTENT_REGISTRY.endings[state.endingId];
          if (!ending) {
            issues.push(`run#${runIdx}: 未知结局 ID ${state.endingId}`);
          } else {
            const ep = ending.epilogue(state).join('\n');
            if (!ep.trim()) issues.push(`run#${runIdx}: 结局 ${state.endingId} 正文为空`);
            issues.push(...collectRuntimeTextIssues(`run#${runIdx}:ending:${state.endingId}`, ep));
          }
          break;
        }

        const scene = CONTENT_REGISTRY.scenes[state.currentSceneId];
        if (!scene) {
          issues.push(`run#${runIdx}@step${step}: 悬空场景 ${state.currentSceneId}`);
          break;
        }

        const paras = resolveParagraphs(scene.paragraphs, state);
        if (paras.length === 0) {
          issues.push(`run#${runIdx}@step${step}(${scene.id}): 正文为空`);
        }
        issues.push(...collectRuntimeTextIssues(`run#${runIdx}@${scene.id}`, paras.join('\n')));
        const pulse = recalculateMarketPulse(state);
        issues.push(...collectRuntimeTextIssues(`run#${runIdx}@rumor`, pulse.rumorText));

        const resolved = getResolvedChoices(state, scene, CONTENT_REGISTRY);
        const unlocked = resolved.filter((c) => !c.locked);
        if (unlocked.length === 0) {
          issues.push(`run#${runIdx}@step${step}(${scene.id}): 所有选项均被锁定，发生死锁`);
          break;
        }

        const weightedPool: string[] = [];
        for (const ch of unlocked) {
          const w =
            ch.category === 'breakthrough'
              ? 6
              : ch.category === 'story'
              ? 4
              : ch.category === 'market'
              ? 1
              : 2;
          for (let k = 0; k < w; k++) weightedPool.push(ch.id);
        }
        const pickedId = weightedPool[Math.floor(rng() * weightedPool.length)];
        const suWasDead = isCompanionDeceased(state, 'su_zhiwei');

        const stepRes = advanceChoice(state, pickedId, CONTENT_REGISTRY);
        totalStepsExecuted += 1;

        if (stepRes.state.pendingTransition) {
          const outText = stepRes.state.pendingTransition.paragraphs.join('\n');
          issues.push(
            ...collectRuntimeTextIssues(`run#${runIdx}@${scene.id}/${pickedId}:out`, outText)
          );
        }

        const allNotices = [
          ...stepRes.state.recentNotices,
          ...(stepRes.state.pendingTransition?.notices ?? []),
        ].join('\n');
        if (suWasDead && /苏知微[^\n]*(?:心生亲近|默契渐深)/.test(allNotices)) {
          issues.push(`run#${runIdx}@${scene.id}/${pickedId}: 已故苏知微弹出亲近通知`);
        }
        issues.push(
          ...collectRuntimeTextIssues(`run#${runIdx}@${scene.id}/${pickedId}:notice`, allNotices)
        );

        state = stepRes.state.pendingTransition
          ? commitTransition(stepRes.state, CONTENT_REGISTRY).state
          : stepRes.state;
      }
    }

    expect(issues).toEqual([]);
    expect(totalStepsExecuted).toBeGreaterThan(500);
    expect(reachedActs.size).toBeGreaterThanOrEqual(4);
    expect(reachedEndings.size).toBeGreaterThanOrEqual(2);
  });
});
