import { parseCoC7 } from './parser'
import { resolveCoC7 } from './resolver'
import { ALL_PROPS, ALL_SKILLS } from './data'

// 规则元信息：界面、导入、骰娘共用
export default {
  id: 'coc7',
  name: '克苏鲁的呼唤 第七版',
  shortName: 'COC 7版',
  dice: 'd100',
  // 人物卡模板（public/static 下的文件，用相对路径以便部署在仓库子路径）
  template: './static/cocv7.xlsx',
  templateFileName: 'cocv7.xlsx',
  templateNote: 'COC七版人物卡v1.6.0',
  // 搜索用的拼音字典
  props: ALL_PROPS,
  skills: ALL_SKILLS,
  parse: parseCoC7,
  resolve: resolveCoC7,
  // 骰子指令说明（显示在「如何使用骰子」弹窗里）
  tips: [
    '基础骰子：.d6 → 投掷一个六面骰（面数可替换为任意数字）',
    '百分骰：.d% → 投掷一个百分骰，等同于 .d100',
    '骰子组合：.2d6+d4 → 掷两个六面骰和一个四面骰',
    'COC 奖励骰：.2d%kl1 → 掷两个百分骰取较低者',
    'Fate 骰子：.4dF → 投掷四个 Fate 骰',
    '接动作描述可与人物卡联动：.d% 聆听 → 自动按人物卡技能值判定成功等级'
  ]
}
