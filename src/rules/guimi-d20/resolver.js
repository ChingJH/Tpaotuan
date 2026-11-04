// 《诡秘之主》D20 检定结算
// 规则书依据（第二章 判定）：
//   检定结果 = d20 + 关联属性 + 技能等级补正（+ 额外补正 + 神性补正），结果 ≥ 难度即成功
//   d20 = 20 → 大成功（与总数值无关）；d20 = 1 → 大失败（与总数值无关）
//   难度检定由 KP 给定目标值；对抗检定比总数值，同值时加值高者胜
// 本文件只做「给定难度」的难度检定；对抗检定无法自动结算，交给 KP 比较

import { ATTRS } from './data'

// name 可以是技能名，也可以是 8 项属性之一（属性检定 rd20+属性）
export function resolveCheck({ card, name, nat, difficulty }) {
  if (!card || !name) return null
  const isAttr = ATTRS.includes(name)
  let base = null
  let label = name

  if (isAttr) {
    if (card.props[name] === undefined) return null
    const value = card.props[name] + (card.basic.deityBonus || 0)
    base = { attr: name, level: '属性检定', levelBonus: 0, customBonus: 0, value }
  } else {
    const skill = card.skills && card.skills[name]
    // COC 的人物卡技能是纯数字，不能拿来算 D20 加值（规则没切对时会走到这里）
    if (!skill || typeof skill !== 'object' || skill.value === undefined) return null
    base = skill
  }

  const total = nat + base.value
  const minTotal = 1 + base.value
  const hasDifficulty = difficulty !== null && difficulty !== undefined && difficulty !== ''

  let text = ''
  if (nat === 20) {
    text = '大成功'
  } else if (nat === 1) {
    text = '大失败'
  } else if (hasDifficulty) {
    const target = Number(difficulty)
    text = total >= target ? `≥ ${target} 成功` : `< ${target} 失败`
    if (total < target && minTotal >= target) {
      text += '（若大失败被无视则默认成功）'
    }
  } else {
    text = `总数值 ${total}（对抗检定请与对方比较）`
  }

  return {
    kind: isAttr ? 'attr' : 'skill',
    label,
    nat,
    total,
    minTotal,
    attr: base.attr,
    attrValue: base.attrValue !== undefined ? base.attrValue : (card.props[base.attr] || 0),
    level: base.level,
    levelBonus: base.levelBonus,
    customBonus: base.customBonus,
    deityBonus: card.basic.deityBonus || 0,
    value: base.value,
    text
  }
}

// 生成便于阅读的加值明细，例如：6(力量) + 4(熟练) + 2(神性)
export function formatBonus(detail) {
  if (!detail) return ''
  const parts = []
  if (detail.kind === 'attr') {
    parts.push(`${detail.attrValue}(${detail.attr})`)
  } else {
    if (detail.attrValue) parts.push(`${detail.attrValue}(${detail.attr})`)
    if (detail.levelBonus) parts.push(`${detail.levelBonus}(${detail.level})`)
    if (detail.customBonus) parts.push(`${detail.customBonus}(补正)`)
  }
  if (detail.deityBonus) parts.push(`${detail.deityBonus}(神性)`)
  return parts.join(' + ')
}
