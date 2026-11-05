// 《诡秘之主》D20 检定结算
// 规则书依据（第二章 判定）：
//   检定结果 = d20 + 关联属性 + 技能等级补正（+ 额外补正 + 神性补正），结果 ≥ 难度即成功
//   d20 = 20 → 大成功（与总数值无关）；d20 = 1 → 大失败（与总数值无关）
//   难度检定由 KP 给定目标值；对抗检定比总数值，同值时加值高者胜，加值也相同则重投
//
// 另外支持 Dice! 版规则的几种手动写法（.gm 命令族）：
//   explicitBonus —— 规则书手写加值 .rd20+6+2
//   add           —— .gm格斗+2（技能加到技能侧，属性加到属性侧）
//   absolute      —— .gm格斗5（技能＝绝对等级 lv，属性＝绝对属性值）
//   overrideAttr  —— .gm驯兽/教育（改判关联属性）

import { LEVEL_BONUS, LEVEL_ORDER } from './data'

export function resolveCheck({ card, name, nat, difficulty, explicitBonus, add, absolute, overrideAttr }) {
  const hasExplicit = explicitBonus !== null && explicitBonus !== undefined && explicitBonus !== ''
  if (!hasExplicit && !card) return null

  const props = (card && card.props) || {}
  const skills = (card && card.skills) || {}
  const basic = (card && card.basic) || {}
  const deityBonus = basic.deityBonus || 0

  const isAttr = !!name && props[name] !== undefined
  const skill = !isAttr && name ? skills[name] : null
  if (!hasExplicit && !isAttr && !skill) return null

  const hasDifficulty = difficulty !== null && difficulty !== undefined && difficulty !== ''
  const detail = {
    kind: isAttr ? 'attr' : 'skill',
    label: name || '',
    nat,
    total: 0,
    attr: '',
    attrValue: 0,
    level: '',
    levelBonus: 0,
    customBonus: 0,
    deityBonus: 0,
    value: 0,
    manual: !!(add || absolute || hasExplicit),
    override: false,
    text: ''
  }

  if (hasExplicit) {
    // 规则书手写加值：以玩家写的为准，不再叠加人物卡（避免重复加值）
    const value = Number(explicitBonus) || 0
    detail.kind = 'manual'
    detail.attr = '手写加值'
    detail.customBonus = value
    detail.value = value
  } else if (isAttr) {
    const base = props[name] || 0
    const attrValue = absolute !== null && absolute !== undefined ? absolute : base + (add || 0)
    detail.attr = name
    detail.attrValue = attrValue
    detail.level = '属性检定'
    detail.deityBonus = deityBonus
    detail.value = attrValue + deityBonus
  } else {
    const useOverride = overrideAttr && props[overrideAttr] !== undefined
    const attrName = useOverride ? overrideAttr : skill.attr
    const attrValue = props[attrName] !== undefined ? props[attrName] : (skill.attrValue || 0)
    let level = skill.level
    let levelBonus = skill.levelBonus
    if (absolute !== null && absolute !== undefined) {
      // 技能侧的绝对指定是「等级」，0 未受训 ~ 6 大师
      const idx = Math.max(0, Math.min(LEVEL_ORDER.length - 1, Math.floor(absolute)))
      level = LEVEL_ORDER[idx]
      levelBonus = LEVEL_BONUS[level] !== undefined ? LEVEL_BONUS[level] : -4
    }
    detail.attr = attrName
    detail.attrValue = attrValue
    detail.level = level
    detail.levelBonus = levelBonus
    detail.customBonus = (skill.customBonus || 0) + (add || 0)
    detail.override = !!useOverride
    detail.deityBonus = deityBonus
    detail.value = attrValue + levelBonus + detail.customBonus + deityBonus
  }

  detail.total = nat + detail.value

  if (nat === 20) {
    detail.text = '大成功'
  } else if (nat === 1) {
    detail.text = '大失败'
  } else if (hasDifficulty) {
    const target = Number(difficulty)
    detail.text = detail.total >= target ? `≥ ${target} 成功` : `< ${target} 失败`
  } else {
    detail.text = `总数值 ${detail.total}（对抗检定请与对方比较：同值时加值高者胜）`
  }
  return detail
}

// 生成便于阅读的加值明细，例如：6(力量) + 5(进阶) + 2(神性)
export function formatBonus(detail) {
  if (!detail) return ''
  const parts = []
  if (detail.kind === 'manual') {
    parts.push(`${detail.customBonus}(加值)`)
  } else if (detail.kind === 'attr') {
    parts.push(`${detail.attrValue}(${detail.attr})`)
  } else {
    const attrLabel = detail.override ? `${detail.attr}·改判` : detail.attr
    if (detail.attrValue) parts.push(`${detail.attrValue}(${attrLabel})`)
    if (detail.levelBonus) parts.push(`${detail.levelBonus}(${detail.level})`)
    if (detail.customBonus) parts.push(`${detail.customBonus}(补正)`)
  }
  if (detail.deityBonus) parts.push(`${detail.deityBonus}(神性)`)
  return parts.join(' + ')
}
