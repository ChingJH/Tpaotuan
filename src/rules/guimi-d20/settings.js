// 骰娘自定义设置
// 对应 Dice! 版 guimi_rule.lua 顶部的「自定义回复模板 / 数值配置」，
// 由主持人（root 或额外主持人）在「骰娘设置」面板里改，按群保存并广播给群成员。

export const DEFAULT_DICE_SETTINGS = {
  // ---------- 开关 ----------
  allowManualBonus: true, // .gm格斗+2 这类手动加值
  allowAdvantage: true, // .gmb / .gm 优势（奖励投）、.gmp / .gm 劣势（惩罚投）
  showBonusDetail: true, // 输出里显示「6(力量) + 5(进阶)」这样的加值明细
  critFlavor: true, // 大成功 / 大失败带一句文案
  fuzzyMatch: true, // 技能名支持前缀模糊匹配（输入「侦」也能命中「侦查」）
  allowAttrGen: true, // .诡秘 / .gm 3 生成属性
  scAutoApply: true, // 理智检定结果自动扣回人物卡
  scWarn: true, // 半疯 / 真疯 / 失控 阈值警告
  // ---------- 数值 ----------
  scSuccessLoss: '1', // 理智检定成功时扣多少（骰子表达式）
  scFailLoss: '1d2', // 理智检定失败时扣多少
  halfMad: 8, // 理智 ≤ 该值提示半疯
  trueMad: 2, // 理智 ≤ 该值提示真疯
  // ---------- 文案 ----------
  // 可用占位符：{nick} {target} {tag} {nat} {bonus} {total} {result} {difficulty}
  tmplTitle: '<{nick}>对【{target}】进行检定：{tag}',
  tmplLine: 'd20({nat}) + {bonus} = {total}{result}',
  tmplCritSuccess: '『大成功！』命运的眷顾降临于你。',
  tmplCritFail: '『大失败！』命运对你露出了恶意的微笑。'
}

const BOOL_KEYS = [
  'allowManualBonus', 'allowAdvantage', 'showBonusDetail', 'critFlavor',
  'fuzzyMatch', 'allowAttrGen', 'scAutoApply', 'scWarn'
]
const NUM_KEYS = ['halfMad', 'trueMad']
const STR_KEYS = ['scSuccessLoss', 'scFailLoss', 'tmplTitle', 'tmplLine', 'tmplCritSuccess', 'tmplCritFail']

// 把存档/广播里收到的设置合到默认值上：非法值一律丢弃，保证骰娘永远能跑
export function normalizeDiceSettings(input) {
  const out = { ...DEFAULT_DICE_SETTINGS }
  if (!input || typeof input !== 'object') return out
  BOOL_KEYS.forEach(key => {
    if (typeof input[key] === 'boolean') out[key] = input[key]
  })
  NUM_KEYS.forEach(key => {
    const n = Number(input[key])
    if (Number.isFinite(n) && n >= 0) out[key] = Math.floor(n)
  })
  STR_KEYS.forEach(key => {
    const v = input[key]
    if (typeof v === 'string' && v.trim()) out[key] = v.slice(0, 400)
  })
  return out
}

// 模板渲染：{xxx} 换成对应值，找不到的占位符原样保留（方便自诊断）
export function renderTemplate(tmpl, vars) {
  if (typeof tmpl !== 'string' || !tmpl) return ''
  return tmpl.replace(/\{(\w+)\}/g, (m, key) => {
    const v = vars && vars[key]
    return v === undefined || v === null ? m : String(v)
  })
}
