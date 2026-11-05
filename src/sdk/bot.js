import TIM from './index'
import Vue from 'vue'
import { _loadScript } from '../utils'
import { getRule, resolveRuleId } from '../rules'
import { splitCommand } from '../rules/command'
import { resolveCheck, formatBonus } from '../rules/guimi-d20/resolver'
import { parseGmCommand, parseGmTarget, matchTarget, attrGenCount, GM_HELP } from '../rules/guimi-d20/commands'
import { normalizeDiceSettings, renderTemplate } from '../rules/guimi-d20/settings'

// region 加载 骰子 相关库
let DiceRoll = null

const loadRandomJs = new Promise(resolve => {
  if (window.Random) {
    resolve()
    return
  }

  _loadScript('./random-js.umd.min.js', resolve)
})

const loadMathJs = new Promise(resolve => {
  if (window.math) {
    resolve()
    return
  }

  _loadScript('./vendor/math.min.js', resolve)
})

const loadDiceRoller = Promise.all([loadRandomJs, loadMathJs]).then(() => {
  // rpg-dice-roller 依赖 RandomJs 和 MathJs，所以必须前两个加载好了以后再加载这个
  return import('@dice-roller/rpg-dice-roller').then(({ DiceRoll: lib }) => DiceRoll = lib)
})

export function loadLibs() {
  return loadDiceRoller
}

// endregion

export function handleMessage(bot, msg) {
  if (msg.conversationType !== TIM.TYPES.CONV_GROUP) {
    // 只处理群消息
    return
  }
  // 去掉开头的「.」/「。」，并兼容 .r / .r 1d10 / .rd20 这类带 r 前缀的写法
  const parsed = splitCommand(msg.payload.text)
  if (!parsed) return

  try {
    const text = buildReply({ msg, body: parsed.body, exp: parsed.exp, desc: parsed.desc })
    if (text) sendGroupMessage(bot, msg.to, text)
  } catch (e) {
    // 表达式不合法 / 设置异常，无视之
  }
}

function buildReply({ msg, body, exp, desc }) {
  const card = currentCard(msg)
  const settings = currentDiceSettings(msg)
  const ruleId = resolveRuleId({ groupRule: currentRuleSetting(msg), cardRule: card && card.rule })

  // .gm 命令族（Dice! 移植版的习惯写法，只在诡秘 D20 下有意义）
  const gm = parseGmCommand(body)
  if (gm) {
    if (ruleId !== 'guimi-d20') {
      return `${senderName(msg)} 本团按 ${getRule(ruleId).shortName} 结算，.gm 是诡秘 D20 的指令；主持人可在「群资料 → 启用机器人 → 骰子规则」切换`
    }
    return handleGmCommand({ msg, gm, card, settings })
  }

  // .诡秘 N —— 生成属性
  if (/^诡秘/.test(body)) {
    if (ruleId !== 'guimi-d20') return null
    const count = Number(/^诡秘\s*(\d+)?/.exec(body)[1]) || 1
    if (!settings.allowAttrGen) return `${senderName(msg)} 主持人关闭了属性生成功能`
    return handleAttrGen(count, senderName(msg))
  }

  if (ruleId === 'guimi-d20') {
    const text = handleGuimiD20({ msg, exp, desc, card, settings })
    if (text) return text
  } else {
    const text = handleCoC7({ msg, exp, desc, card })
    if (text) return text
  }

  // 兜底：纯骰子表达式，不做任何规则结算
  const roll = new DiceRoll(exp)
  return `${senderName(msg)} 🎲 ${desc} ${roll.output}`.replace(/\s+/g, ' ').trim()
}

function currentCard(msg) {
  const store = Vue.prototype.$store
  if (!store) return null
  const game = store.state.game.list[msg.to]
  if (!game || !game.cards) return null
  return game.cards['o' + msg.from] || null
}

// 群级规则设置（auto / coc7 / guimi-d20），没有人物卡的玩家也按它结算
function currentRuleSetting(msg) {
  const store = Vue.prototype.$store
  if (!store) return 'auto'
  const game = store.state.game.list[msg.to]
  return (game && game.rule) || 'auto'
}

// 群级骰娘设置（主持人改的那份，空则用默认值）
function currentDiceSettings(msg) {
  const store = Vue.prototype.$store
  if (!store) return normalizeDiceSettings(null)
  const game = store.state.game.list[msg.to]
  return normalizeDiceSettings(game && game.diceSettings)
}

// 昵称优先级：群名片 > 昵称 > userId
function senderName(msg) {
  return msg.nameCard || msg.nick || msg.from
}

// ---------------------------- COC 7 版 ----------------------------
// 只有百分骰才做 COC 判定；其它表达式（伤害骰等）只报结果
const isPercentile = (exp) => /d(%|100)(?![0-9])/i.test(exp)

function handleCoC7({ msg, exp, desc, card }) {
  const roll = new DiceRoll(exp)
  let resultText = ''
  if (card && isPercentile(exp)) {
    const rule = getRule('coc7')
    resultText = rule.resolve({ card, skill: desc.split(/\s+/)[0], roll: roll.total }) || ''
  }
  return `${senderName(msg)} 🎲 ${desc || ''} ${roll.output} ${resultText}`.replace(/\s+/g, ' ').trim()
}

// ------------------------- 诡秘之主 D20 -------------------------
// 规则书写法：.rd20 技能 [难度] / .rd20+6+2 技能 难度
function handleGuimiD20({ msg, exp, desc, card, settings }) {
  const expr = String(exp || '').toLowerCase()
  const m = /^(?:1?d20)((?:[+-]\d+)+)?$/.exec(expr)
  if (!m) {
    // 伤害骰等普通表达式：照常投掷
    const roll = new DiceRoll(exp)
    const hint = /d(%|100)(?![0-9])/i.test(exp) ? '（本团是诡秘 D20，检定请用 .rd20 技能 难度 或 .gm 技能）' : ''
    return `${senderName(msg)} 🎲 ${desc} ${roll.output}${hint}`.replace(/\s+/g, ' ').trim()
  }
  const explicitBonus = m[1] ? m[1].match(/[+-]\d+/g).reduce((sum, s) => sum + Number(s), 0) : null
  // .rd20 后面的描述可以只是叙事，找不到技能名就不报错，只投点数
  return handleGuimiCheck({ msg, rawTarget: desc, card, settings, explicitBonus, strict: false })
}

// .gm 命令族分发
function handleGmCommand({ msg, gm, card, settings }) {
  switch (gm.kind) {
    case 'help':
      return GM_HELP
    case 'error':
      return gm.text
    case 'attr-gen':
      return settings.allowAttrGen ? handleAttrGen(gm.count, senderName(msg)) : `${senderName(msg)} 主持人关闭了属性生成功能`
    case 'init-list':
      return `${senderName(msg)} 本平台没有先攻列表，先攻请用 .gmri 投，结果自己记一下`
    case 'init-roll':
      return handleInitRoll({ msg, card })
    case 'summary':
      return handleSummary({ msg, card })
    case 'sc':
      return handleSc({ msg, card, settings, args: gm })
    case 'check':
      return handleGuimiCheck({ msg, rawTarget: gm.rawTarget, mode: gm.mode, card, settings, strict: true })
    default:
      return null
  }
}

// 检定核心：.gm 与 .rd20 共用
function handleGuimiCheck({ msg, rawTarget, mode, card, settings, explicitBonus, strict }) {
  const nick = senderName(msg)
  const target = parseGmTarget(rawTarget || '')
  const rollMode = mode || target.mode || 'normal'
  const useAdv = rollMode !== 'normal' && settings.allowAdvantage
  const advOff = rollMode !== 'normal' && !settings.allowAdvantage
  const manualOff = !!((target.add || target.absolute !== null) && !settings.allowManualBonus)
  const add = manualOff ? null : target.add
  const absolute = manualOff ? null : target.absolute

  let matched = null
  if (target.name) {
    matched = matchTarget(card, target.name, { fuzzy: settings.fuzzyMatch })
  }

  if (strict && target.name && !matched) {
    const skills = card && card.skills ? Object.keys(card.skills).slice(0, 8).join('、') : ''
    return [
      `${nick} 没在人物卡里找到「${target.name}」。`,
      skills ? `常用技能：${skills} …` : '（你还没导入人物卡，先在「群资料 → 我的卡」导入）',
      '用 .gm help 看完整用法。'
    ].join('\n')
  }

  // 什么都没有：只报 d20（规则书：纯 rd20 也好用）
  if (!matched && !explicitBonus && !target.add && !target.absolute) {
    let nat = rollD20()
    let advText = ''
    if (useAdv) {
      const d1 = rollD20()
      const d2 = rollD20()
      nat = rollMode === 'adv' ? Math.max(d1, d2) : Math.min(d1, d2)
      advText = rollMode === 'adv' ? `【奖励投 ${d1}/${d2}→取高】` : `【惩罚投 ${d1}/${d2}→取低】`
    }
    const diff = target.difficulty
    let verdict = ''
    if (diff !== null && diff !== undefined && nat !== 20 && nat !== 1) {
      verdict = nat >= diff ? `≥ ${diff} 成功` : `< ${diff} 失败`
    }
    if (nat === 20) verdict = '大成功'
    if (nat === 1) verdict = '大失败'
    const descText = target.name || ''
    return `${nick} 🎲 ${descText}${advText} d20[${nat}] ${verdict}`.replace(/\s+/g, ' ').trim()
  }

  // 投骰
  let nat = rollD20()
  let advText = ''
  if (useAdv) {
    const d1 = rollD20()
    const d2 = rollD20()
    nat = rollMode === 'adv' ? Math.max(d1, d2) : Math.min(d1, d2)
    advText = rollMode === 'adv' ? `奖励投 ${d1}/${d2}→取高` : `惩罚投 ${d1}/${d2}→取低`
  }

  const detail = resolveCheck({
    card,
    name: matched ? matched.name : '',
    nat,
    difficulty: target.difficulty,
    explicitBonus,
    add,
    absolute,
    overrideAttr: target.overrideAttr
  })
  if (!detail) {
    return `${nick} 🎲 d20[${nat}]${nat === 20 ? ' 大成功' : nat === 1 ? ' 大失败' : ''}`
  }

  const label = (detail.label || target.name || '检定') + (target.difficulty !== null ? ` 难度${target.difficulty}` : '')
  const tagParts = []
  if (detail.manual) tagParts.push('手动')
  if (advText) tagParts.push(advText)
  const tag = tagParts.join(' ')

  let title = renderTemplate(settings.tmplTitle, { nick, target: label, tag, difficulty: target.difficulty })
  if (!tag) title = title.replace(/[：:]\s*$/, '')

  const isCrit = nat === 20 || nat === 1
  const bonus = settings.showBonusDetail ? formatBonus(detail) : String(detail.value)
  const line = renderTemplate(settings.tmplLine, {
    nick,
    target: label,
    tag,
    nat,
    bonus: bonus || '0',
    total: detail.total,
    result: isCrit ? '' : ` ${detail.text}`,
    difficulty: target.difficulty
  })

  const crit = isCrit
    ? (settings.critFlavor
      ? (nat === 20 ? settings.tmplCritSuccess : settings.tmplCritFail)
      : (nat === 20 ? '大成功' : '大失败'))
    : ''

  const lines = [title, line, crit]
  if (advOff) lines.push('（主持人关闭了奖励投 / 惩罚投，本次按普通检定）')
  if (manualOff) lines.push('（主持人关闭了手动加值 / 绝对指定，本次已忽略）')
  return lines.filter(v => v && String(v).trim()).join('\n')
}

// .gmsc —— 理智检定（d20 vs 理智，成功扣 1 / 失败扣 1d2，可自定义）
function handleSc({ msg, card, settings, args }) {
  const nick = senderName(msg)
  if (!card) return `${nick} 还没有导入人物卡，无法做理智检定`
  const pool = (card.pools || []).find(p => p.key === 'san')
  if (!pool) return `${nick} 的人物卡里没有理智值字段`

  const san = Number(pool.cur) || 0
  const nat = rollD20()
  const success = nat <= san
  const expr = (success ? args.success : args.fail) || (success ? settings.scSuccessLoss : settings.scFailLoss)
  const loss = rollExpression(expr)
  const next = Math.max(0, san - loss)

  const lines = [
    `<${nick}>进行理智检定：`,
    `rd20(${nat}) vs 理智(${san})`,
    success ? `${nat} ≤ ${san}，【理智检定成功】` : `${nat} > ${san}，【理智检定失败】`,
    `损失理智: ${expr} = ${loss}`,
    `理智变化: ${san} → ${next}`
  ]
  if (settings.scWarn) {
    if (next <= 0 && san > 0) lines.push('☠ 理智归零，你已【失控】！')
    if (next <= settings.trueMad && san > settings.trueMad) lines.push('⚠⚠ 你已陷入【真疯】状态，难以沟通。')
    if (next <= settings.halfMad && san > settings.halfMad) lines.push('⚠ 你已陷入【半疯】状态，获得随机疯狂倾向。')
  }
  if (settings.scAutoApply) applySan(msg, card, next)
  return lines.join('\n')
}

// 把新的理智值写回人物卡（本机缓存，供下次检定直接读）
function applySan(msg, card, san) {
  const store = Vue.prototype.$store
  if (!store) return
  const next = JSON.parse(JSON.stringify(card))
  const pool = (next.pools || []).find(p => p.key === 'san')
  if (!pool) return
  pool.cur = san
  store.commit('setUserCard', { groupId: msg.to, userId: msg.from, card: next })
}

// .gmsn —— 角色卡摘要
function handleSummary({ msg, card }) {
  const nick = senderName(msg)
  if (!card) return `${nick} 还没有导入人物卡`
  const poolText = key => {
    const pool = (card.pools || []).find(p => p.key === key)
    if (!pool) return '?'
    return pool.max ? `${pool.cur}/${pool.max}` : String(pool.cur)
  }
  const dex = (card.props && card.props['敏捷']) || '?'
  const name = (card.basic && card.basic.name) || nick
  return `${name} 生命${poolText('hp')} 灵性${poolText('mp')} 敏捷${dex} 理智${poolText('san')}`
}

// .gmri —— 先攻检定
function handleInitRoll({ msg, card }) {
  const nat = rollD20()
  const dex = (card && card.props && card.props['敏捷']) || 0
  return `<${senderName(msg)}> 先攻检定：rd20(${nat}) + 敏捷(${dex}) = ${nat + dex}`
}

// .诡秘 N / .gm N —— 生成属性（每项 2d3，2~6）
const ATTR_NAMES = ['力量', '体质', '敏捷', '魅力', '灵感', '意志', '教育', '幸运']

function handleAttrGen(count, nick) {
  const result = attrGenCount(count)
  if (result.error) return `${nick} ${result.error}`
  return genAttrs(result.count, nick)
}

function genAttrs(n, nick) {
  const out = [`<${nick}>命运的馈赠在暗处已标注好了价码：（属性生成 ×${n}，每项 2d3，2~6）`]
  for (let i = 0; i < n; i++) {
    const vals = ATTR_NAMES.map(() => rollDie(3) + rollDie(3))
    const block = []
    for (let j = 0; j < vals.length; j += 3) {
      block.push(ATTR_NAMES.slice(j, j + 3).map((attr, k) => `${attr}:${vals[j + k]}`).join(' '))
    }
    const totalAll = vals.reduce((a, b) => a + b, 0)
    block.push(`［${totalAll - vals[7]}/${totalAll}］`)
    out.push('', ...block)
  }
  return out.join('\n')
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

function rollD20() {
  return rollDie(20)
}

// 骰子表达式求值（用于理智损失 1d2 / 1d3 等），非法表达式退回 1
function rollExpression(expr) {
  try {
    return new DiceRoll(expr).total
  } catch (e) {
    return 1
  }
}

function sendGroupMessage(bot, groupId, string) {
  const msg = bot.createTextMessage({
    to: groupId,
    conversationType: TIM.TYPES.CONV_GROUP,
    payload: {
      text: string
    }
  })
  bot.sendMessage(msg)
}
