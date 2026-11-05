// 骰娘指令文本解析（纯函数，方便 scripts/verify-rules.js 直接测）
//
// 支持这几种写法（都等价）：
//   .rd20 侦查 15      ← 角色卡里点技能/文档推荐的写法
//   .r d20 侦查 15
//   .d20 侦查 15
//   。rd20 侦查 15     ← 中文句号
// 其余第一个词当作骰子表达式（.d% / .d100 / .r 2d6 ...）

const PREFIX = /^[.。]/
// r 后面跟空格、结尾、数字或 d 都视作前缀（.rd20 / .r 2d6 / .r / .rd）
const R_PREFIX = /^r(\s|$|\d|d)/i

export function splitCommand(raw) {
  const text = String(raw === null || raw === undefined ? '' : raw).trim()
  if (!PREFIX.test(text)) return null

  let body = text.substr(1).trim()
  if (R_PREFIX.test(body)) {
    body = body.replace(/^r/i, '').trim()
  }
  if (!body) return null

  const tokens = body.split(/\s+/)
  const exp = tokens.shift()
  return { exp, desc: tokens.join(' '), body }
}
