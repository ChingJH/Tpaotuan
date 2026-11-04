import TIM from './index'
import Vue from 'vue'
import { _loadScript } from '../utils'
import { getRule } from '../rules'
import { formatBonus } from '../rules/guimi-d20/resolver'

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
  const msgstr = (msg.payload.text || '').trim()
  if (!msgstr.startsWith('.') && !msgstr.startsWith('。')) return

  // 去掉开头的「.」，并兼容 .r / .rd20 这类带 r 前缀的写法
  let body = msgstr.substr(1).trim()
  if (/^r(\s|$)/i.test(body)) {
    body = body.replace(/^r/i, '').trim()
  }
  if (!body) return

  // 第一个词是骰子表达式，其余是描述（可能包含技能名与难度）
  const tokens = body.split(/\s+/)
  const exp = tokens.shift()
  const desc = tokens.join(' ')

  try {
    const text = rollAndBuildText({ bot, msg, exp, desc })
    if (text) sendGroupMessage(bot, msg.to, text)
  } catch (e) {
    // 表达式不合法，无视之
  }
}

function currentCard(msg) {
  const store = Vue.prototype.$store
  if (!store) return null
  const game = store.state.game.list[msg.to]
  if (!game || !game.cards) return null
  return game.cards['o' + msg.from] || null
}

// 群级规则（导入人物卡时记录），没有人物卡的玩家也按本团规则结算
function currentRuleId(msg) {
  const store = Vue.prototype.$store
  if (!store) return 'coc7'
  const game = store.state.game.list[msg.to]
  return (game && game.rule) || 'coc7'
}

// 昵称优先级：群名片 > 昵称 > userId
function senderName(msg) {
  return msg.nameCard || msg.nick || msg.from
}

function rollAndBuildText({ msg, exp, desc }) {
  const card = currentCard(msg)
  const rule = getRule((card && card.rule) || currentRuleId(msg))

  if (rule.id === 'guimi-d20') {
    const text = handleGuimiD20({ msg, exp, desc, card })
    if (text) return text
  } else {
    const text = handleCoC7({ msg, exp, desc, card })
    if (text) return text
  }

  // 兜底：纯骰子表达式，不做任何规则结算
  const roll = new DiceRoll(exp)
  return `${senderName(msg)} 🎲 ${desc} ${roll.output}`.replace(/\s+/g, ' ').trim()
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
// 规则：检定结果 = d20 + 关联属性 + 技能等级补正 + 神性补正，≥ 难度即成功
// 大成功 / 大失败只看 d20 本身
function handleGuimiD20({ msg, exp, desc, card }) {
  const expr = exp.toLowerCase()
  const isSingleD20 = /^1?d20$/.test(expr)

  if (!isSingleD20) {
    // 伤害骰等普通表达式：照常投掷
    const roll = new DiceRoll(exp)
    // 老玩家习惯用 .d% ，在 D20 团里给个提示，免得以为骰娘坏了
    const hint = /d(%|100)(?![0-9])/i.test(exp) ? '（本团是诡秘 D20，检定请用 .rd20 技能 难度）' : ''
    return `${senderName(msg)} 🎲 ${desc} ${roll.output}${hint}`.replace(/\s+/g, ' ').trim()
  }

  const rule = getRule('guimi-d20')
  const nat = new DiceRoll('d20').total
  const { name, difficulty, rest } = parseCheckName(card, desc)

  if (!card || !name) {
    // 没有人物卡或没写技能名：只报 d20 结果
    const extra = nat === 20 ? '大成功' : (nat === 1 ? '大失败' : '')
    return `${senderName(msg)} 🎲 ${desc} d20[${nat}] ${extra}`.replace(/\s+/g, ' ').trim()
  }

  const detail = rule.resolve({ card, name, nat, difficulty })
  if (!detail) {
    const extra = nat === 20 ? '大成功' : (nat === 1 ? '大失败' : '')
    return `${senderName(msg)} 🎲 ${desc} d20[${nat}] ${extra}`.replace(/\s+/g, ' ').trim()
  }

  const bonus = formatBonus(detail)
  const label = `${name}${difficulty !== null ? ` 难度${difficulty}` : ''}${rest ? ` ${rest}` : ''}`
  const calc = `d20[${nat}]${bonus ? ` + ${bonus}` : ''} = ${detail.total}`
  return `${senderName(msg)} 🎲 ${label} ${calc} ${detail.text}`.replace(/\s+/g, ' ').trim()
}

// 从描述里解析出「技能名 / 属性名」与「难度值」
function parseCheckName(card, desc) {
  const tokens = (desc || '').split(/\s+/).filter(t => t.length > 0)
  let name = ''
  if (card) {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if ((card.skills && card.skills[t]) || (card.props && card.props[t] !== undefined)) {
        name = t
        tokens.splice(i, 1)
        break
      }
    }
  }
  let difficulty = null
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(tokens[i])) {
      difficulty = Number(tokens[i])
      tokens.splice(i, 1)
      break
    }
  }
  return { name, difficulty, rest: tokens.join(' ') }
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
