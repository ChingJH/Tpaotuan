// COC 第七版技能检定结算（100 面骰）
// 成功等级：大成功 / 1/5 极难 / 1/2 困难 / 普通成功 / 大失败
// 与原 bot.js 中的 decideResult 行为保持一致，仅做了入参收敛

export function resolveCoC7({ card, skill, roll }) {
  // 0. 判断有没有描述
  if (!skill) return null
  // 1. 判断有没有人物卡
  if (!card) return null
  // 2. 判断有没有对应的技能
  //   2.1 先判断几个特殊的
  if (skill === '理智' || skill === 'sc' || skill === 'SC') {
    return roll <= card.basic.san ? `≤ ${card.basic.san} 成功` : `> ${card.basic.san} 失败`
  } else if (skill === '幸运') {
    return roll <= card.basic.luck ? `≤ ${card.basic.luck} 成功` : `> ${card.basic.luck} 失败`
  } else if (skill === '灵感') {
    return roll <= card.props['智力'] ? `≤ ${card.props['智力']} 成功` : `> ${card.props['智力']} 失败`
  }
  //   2.2 判断难度等级
  const isHard = skill.indexOf('困难') >= 0
  const isEx = skill.indexOf('极难') >= 0 || skill.indexOf('极限') >= 0
  const plainSkill = skill.replace(/(困难|极难|极限)/g, '')
  const alias = plainSkill === '侦查' ? '侦察' : plainSkill // 人物卡模版里的是后者
  let target = (card.props && card.props[alias]) || (card.skills && card.skills[alias])
  if (!target) return null // 没有技能。技能值为 0 应该也不可能
  // 3. 判断大成功大失败
  if (roll === 1) return '大成功'
  if (roll > 95) return '大失败'
  // 4. 真实比较
  target = isEx ? Math.floor(target / 5) : (isHard ? Math.floor(target / 2) : target)
  return roll <= target ? `≤ ${target} 成功` : `> ${target} 失败`
}
