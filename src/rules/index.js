// 规则注册表：新增规则只要在这里登记即可被导入弹窗、人物卡面板、骰娘同时识别
import coc7 from './coc7'
import guimiD20 from './guimi-d20'

export const RULE_LIST = [coc7, guimiD20]

export const RULES = RULE_LIST.reduce((map, rule) => {
  map[rule.id] = rule
  return map
}, {})

// 没有标注规则的老人物卡一律按 COC7 处理
export const DEFAULT_RULE_ID = 'coc7'

export function getRule(ruleId) {
  return RULES[ruleId] || RULES[DEFAULT_RULE_ID]
}

export function isRuleId(ruleId) {
  return !!RULES[ruleId]
}

// 统一解析入口：sheet + 规则 id → 人物卡对象
export function parseCard(sheet, ruleId) {
  return getRule(ruleId).parse(sheet)
}
