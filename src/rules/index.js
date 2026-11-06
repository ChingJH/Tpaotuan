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

// 规则声明的那张 sheet（诡秘模板的第一个 sheet 是「附表」，卡在「角色卡」里，
// 所以不能盲取 SheetNames[0]）
const declaredSheet = (workbook, rule) => {
  const names = (workbook && workbook.SheetNames) || []
  for (const want of rule.sheetNames || []) {
    const hit = names.find(name => String(name).trim() === want)
    if (hit) return { name: hit, sheet: workbook.Sheets[hit] }
  }
  return null
}

// 从工作簿里挑出人物卡所在的 sheet
// 1) 规则声明的工作表名
// 2) 别的规则的工作表在、本规则的没在 → 大概率选错了规则，返回 null 交给界面提示
// 3) 全都对不上（模板被整体改名）→ 挨个 sheet 试解析，谁能解析出姓名就用谁
export function pickCardSheet(workbook, ruleId) {
  const rule = getRule(ruleId)
  const declared = declaredSheet(workbook, rule)
  if (declared) return declared

  const names = (workbook && workbook.SheetNames) || []
  if (!names.length) return null
  if (anyDeclaredSheet(workbook)) return null

  for (const name of names) {
    const card = safeParse(workbook.Sheets[name], ruleId)
    if (card && card.basic && card.basic.name) return { name, sheet: workbook.Sheets[name] }
  }
  return { name: names[0], sheet: workbook.Sheets[names[0]] }
}

// 工作簿里有没有「某套规则声明过的工作表」
function anyDeclaredSheet(workbook) {
  const names = (workbook && workbook.SheetNames) || []
  return RULE_LIST.some(rule =>
    (rule.sheetNames || []).some(want => names.some(name => String(name).trim() === want)))
}

function safeParse(sheet, ruleId) {
  try {
    return parseCard(sheet, ruleId)
  } catch (e) {
    return null
  }
}

// 用户可能选错了规则：拿每套规则声明的 sheet 试一遍，
// 能解析出姓名的就是这张卡真正的格式
export function detectCardRule(workbook) {
  for (const rule of RULE_LIST) {
    const declared = declaredSheet(workbook, rule)
    if (!declared) continue
    const card = safeParse(declared.sheet, rule.id)
    if (card && card.basic && card.basic.name) return { ruleId: rule.id, sheetName: declared.name }
  }
  return null
}
