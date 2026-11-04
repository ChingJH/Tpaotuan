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

// 群的骰子规则除了具体规则 id，还有「自动」：按每个人自己的人物卡结算
export const RULE_AUTO = 'auto'

export function getRule(ruleId) {
  return RULES[ruleId] || RULES[DEFAULT_RULE_ID]
}

export function isRuleId(ruleId) {
  return !!RULES[ruleId]
}

// 「自动」或某条具体规则，都算合法设置
export function isRuleSetting(value) {
  return value === RULE_AUTO || isRuleId(value)
}

// 最终用哪套规则结算：群设置优先（自动则看人物卡），都没有就 COC7
export function resolveRuleId({ groupRule, cardRule } = {}) {
  if (groupRule && groupRule !== RULE_AUTO && isRuleId(groupRule)) return groupRule
  if (cardRule && isRuleId(cardRule)) return cardRule
  return DEFAULT_RULE_ID
}

// 统一解析入口：sheet + 规则 id → 人物卡对象
export function parseCard(sheet, ruleId) {
  return getRule(ruleId).parse(sheet)
}
