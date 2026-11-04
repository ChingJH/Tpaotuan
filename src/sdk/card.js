import { _loadScript } from '../utils'
import { parseCard, getRule, RULE_LIST, isRuleId } from '../rules'
import { ALL_PROPS, ALL_SKILLS } from '../rules/coc7/data'
import { parseCoC7 } from '../rules/coc7/parser'

// 这一层保持向后兼容：老的调用方仍然从 '@/sdk/card' 取字典与解析函数
export { parseCard, getRule, RULE_LIST, isRuleId, ALL_PROPS, ALL_SKILLS }

// 兼容旧命名
export const parseCoCXlsx = parseCoC7

// 加载 xlsx（改为本地 vendor，避免被 CDN 拖慢/拖挂）
export const loadXlsx = new Promise(resolve => {
  if (window.XLSX) {
    resolve()
    return
  }

  _loadScript('./vendor/xlsx.mini.min.js', resolve)
})
