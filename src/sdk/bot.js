import TIM from './index'
import Vue from 'vue'
import { _loadScript } from '../utils'
import { getRule, resolveRuleId, RULE_AUTO } from '../rules'
import { splitCommand } from '../rules/command'
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
  // 去掉开头的「.」/「。」，并兼容 .r / .r 1d10 / .rd20 这类带 r 前缀的写法
  const parsed = splitCommand(msg.payload.text)
  if (!parsed) return
  const { exp, desc } = parsed
  const body = parsed.body

  // .规则 / .rule：查当前用的是哪套骰子规则，方便排查「切换了却没生效」
  if (/^(规则|rule)$/i.test(body)) {
    const card = currentCard(msg)
    const setting = currentRuleSetting(msg)
    const ruleId = resolveRuleId({ groupRule: setting, cardRule: card && card.rule })
    const rule = getRule(ruleId)
    const settingText = setting === RULE_AUTO ? '自动（按人物卡）' : `固定 ${getRule(setting).shortName}`
    const cardText = card ? '你的人物卡：' + getRule(card.rule).shortName : '你还没有人物卡'
    sendGroupMessage(bot, msg.to, `${senderName(msg)} 本团规则：${settingText}；${cardText}；实际按 ${rule.shortName}（${rule.dice}）结算`)
    return
  }

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

// 群级规则设置（auto / coc7 / guimi-d20），没有人物卡的玩家也按它结算
function currentRuleSetting(msg) {
  const store = Vue.prototype.$store
  if (!store) return 'auto'
  const game = store.state.game.list[msg.to]
  return (game && game.rule) || 'auto'
}

// 昵称优先级：群名片 > 昵称 > userId
function senderName(msg) {
  return msg.nameCard || msg.nick || msg.from
}

function rollAndBuildText({ msg, exp, desc }) {
  const card = currentCard(msg)
  // 群设置优先（自动时看说话人的人物卡），都没有就 COC7
  const rule = getRule(resolveRuleId({ groupRule: currentRuleSetting(msg), cardRule: card && card.rule }))

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
  // 支持规则书的写法：d20 / 1d20 / d20+6 / d20+6+2（手写加值）
  const m = /^(?:1?d20)((?:[+-]\d+)+)?$/.exec(expr)
  const isSingleD20 = !!m
  const explicitBonus = m && m[1] ? m[1].match(/[+-]\d+/g).reduce((sum, s) => sum + Number(s), 0) : null

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

  // 有手写加值时按手写结算，没写才按人物卡算
  const detail = rule.resolve({ card, name, nat, difficulty, explicitBonus })

  if (!detail) {
    // 没有人物卡、也没写技能名、也没手写加值：只报 d20 结果；给了难度还是判一下
    const extra = nat === 20 ? '大成功' : (nat === 1 ? '大失败' : '')
    let tail = extra
    if (!extra && difficulty !== null) {
      tail = nat >= Number(difficulty) ? `≥ ${difficulty} 成功` : `< ${difficulty} 失败`
    }
    const shown = difficulty !== null ? `${desc}` : desc
    return `${senderName(msg)} 🎲 ${shown} d20[${nat}] ${tail}`.replace(/\s+/g, ' ').trim()
  }

  const bonus = formatBonus(detail)
  const nameText = detail.label || name || ''
  const label = `${nameText}${difficulty !== null ? ` 难度${difficulty}` : ''}${rest ? ` ${rest}` : ''}`.trim()
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
