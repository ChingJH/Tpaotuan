import { parseGuimiD20 } from './parser'
import { resolveCheck, formatBonus } from './resolver'
import { ATTR_PINYIN, SKILL_PINYIN, LEVEL_BONUS, LEVEL_ORDER } from './data'

// 规则元信息：界面、导入、骰娘共用
export default {
  id: 'guimi-d20',
  name: '诡秘之主 D20（3.5 共创版）',
  shortName: '诡秘 D20',
  dice: 'd20',
  template: './static/guimi-d20.xlsx',
  templateFileName: 'guimi-d20.xlsx',
  templateNote: '琉璃版诡秘规则角色卡 YM_v3.5.9.24',
  // 人物卡在哪个 sheet：这张模板的第一个 sheet 是「附表」，卡在「角色卡」里
  sheetNames: ['角色卡'],
  props: ATTR_PINYIN,
  skills: SKILL_PINYIN,
  levelBonus: LEVEL_BONUS,
  levelOrder: LEVEL_ORDER,
  parse: parseGuimiD20,
  resolve: resolveCheck,
  formatBonus,
  tips: [
    '基础骰子：.rd20 → 投掷一个二十面骰（1-20）',
    '带技能：.rd20 侦查 → 自动加算「关联属性 + 技能等级补正 + 神性补正」',
    '带难度：.rd20 侦查 15 → 总数值 ≥15 判定成功',
    '属性检定：.rd20 敏捷 → 只加属性值',
    '手写加值：.rd20+6+2 攀爬 18 → 规则书原写法，加值以你写的为准（不再叠加人物卡）',
    '伤害检定：.r 1d10 → 普通骰子表达式照常可用',
    '大成功 / 大失败只看 d20 本身：20 为大成功，1 为大失败'
  ]
}
