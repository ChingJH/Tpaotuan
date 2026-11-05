// .gm 命令族解析（移植自 Dice! 版 guimi_rule.lua 的 gm_handle_gm_family / parse_manual_modifier）
//
// 支持：
//   .gm 格斗              检定
//   .gm格斗+2             手动加值（可 .gm格斗+2+3+4 累加）
//   .gm格斗5              绝对指定技能等级（0~6）；属性则是绝对指定属性值
//   .gm驯兽/教育          改判关联属性
//   .gm 格斗 15           带难度（空格后面跟数字 = 难度，粘连 = 绝对指定）
//   .gmb 侦查 / .gm 优势 侦查   奖励投（2d20 取高）
//   .gmp 侦查 / .gm 劣势 侦查   惩罚投（2d20 取低）
//   .gmsc [成功骰/失败骰] 理智检定
//   .gmsn                 角色卡摘要
//   .gmri                 先攻检定
//   .gm 3 / .诡秘 3       生成 3 组属性
//
// 本模块只做纯文本解析，不碰骰子与 store，方便 scripts/verify-rules.js 直接测。

// 技能别名：打错字也能读到等级（规则书社区里「侦察/侦查」两种写法都有人用）
export const SKILL_ALIASES = {
  侦察: '侦查',
  侦查: '侦察'
}

export const GM_HELP = [
  '【诡秘之主 D20】骰娘指令',
  '.gm 格斗                D20 检定（自动加属性 + 技能等级补正）',
  '.gm 格斗 15             带难度：总数值 ≥ 15 成功',
  '.gm格斗+2               手动加值，可写 +2+3+4 累加',
  '.gm格斗5                绝对指定技能等级（0 未受训 ~ 6 大师）',
  '.gm驯兽/教育            改判关联属性为教育',
  '.gm 优势 侦查 / .gmb 侦查   奖励投（2d20 取高）',
  '.gm 劣势 侦查 / .gmp 侦查   惩罚投（2d20 取低）',
  '.gmsc [成功骰/失败骰]   理智检定（默认 1 / 1d2）',
  '.gmsn                   角色卡摘要（生命/灵性/敏捷/理智）',
  '.gmri                   先攻检定（d20 + 敏捷）',
  '.gm 3 / .诡秘 3         生成 3 组属性（每项 2d3，一次最多 10 组）',
  '.rd20 侦查 15           规则书原写法（等价于 .gm）',
  '.rd20+6+2 侦查 15       手写加值，不叠加人物卡',
  '骰子规则、加值文案、SC 阈值等由主持人（群主或主持人）在「骰娘设置」里改。'
].join('\n')

export const MAX_ATTR_GEN = 10

// 属性生成组数：夹到 1~10，超了要明确告诉玩家，别静默截断
export function attrGenCount(value) {
  const n = Math.floor(Number(value) || 1)
  if (n < 1) return { count: 1, error: `组数至少 1 组（你写了 ${value}）` }
  if (n > MAX_ATTR_GEN) return { count: MAX_ATTR_GEN, error: `一次最多生成 ${MAX_ATTR_GEN} 组（你写了 ${n} 组）` }
  return { count: n, error: '' }
}

// 解析 .gm 命令族；body 是去掉开头「.」之后的整串（例如 "gm格斗+2"）
export function parseGmCommand(body) {
  const text = String(body || '').trim()
  const lower = text.toLowerCase()
  if (!lower.startsWith('gm')) return null

  if (/^gm\s*(help|帮助)$/.test(lower)) return { kind: 'help' }
  if (/^gmsn(?=$|\s)/.test(lower)) return { kind: 'summary' }
  if (/^gmsc(?=$|\s)/.test(lower)) {
    const args = text.slice(4).trim()
    const parts = args.split(/[/\s]+/).filter(Boolean)
    return { kind: 'sc', success: parts[0] || '', fail: parts[1] || '' }
  }
  if (/^gminit(?=$|\s)/.test(lower)) return { kind: 'init-list', arg: text.slice(6).trim() }
  if (/^gmri(?=$|\s)/.test(lower)) return { kind: 'init-roll' }

  if (lower.startsWith('gmb') || lower.startsWith('gmp')) {
    const mode = lower.startsWith('gmb') ? 'adv' : 'dis'
    const tail = text.slice(3).trim()
    if (!tail) return { kind: 'error', text: `请指定技能或属性名称，如 .${mode === 'adv' ? 'gmb' : 'gmp'} 力量` }
    if (/^\d+$/.test(tail)) return { kind: 'attr-gen', count: Number(tail) }
    return { kind: 'check', mode, rawTarget: tail }
  }

  const tail = text.slice(2).trim()
  if (!tail) return { kind: 'error', text: '请指定技能或属性名称，如 .gm 力量 或 .gm 格斗' }
  if (/^\d+$/.test(tail)) return { kind: 'attr-gen', count: Number(tail) }

  const adv = /^(优势|劣势)\s*(\S[\s\S]*)$/.exec(tail)
  if (adv) return { kind: 'check', mode: adv[1] === '优势' ? 'adv' : 'dis', rawTarget: adv[2].trim() }

  return { kind: 'check', mode: 'normal', rawTarget: tail }
}

// 解析检定目标：技能名 + 手动加值 / 绝对指定 / 改判属性 / 优势劣势后缀 / 难度
// 返回 { name, mode, add, absolute, overrideAttr, difficulty }
export function parseGmTarget(raw) {
  const out = { name: '', mode: null, add: null, absolute: null, overrideAttr: null, difficulty: null }
  let s = String(raw || '').trim()
  if (!s) return out

  // 末尾的 adv / dis / 优势 / 劣势
  const modeHit = /(?:^|\s)(adv|dis|优势|劣势)$/i.exec(s)
  if (modeHit) {
    out.mode = /^(adv|优势)$/i.test(modeHit[1]) ? 'adv' : 'dis'
    s = s.slice(0, modeHit.index).trim()
  }

  // 改判关联属性：技能/属性
  const slash = s.indexOf('/')
  if (slash > 0) {
    out.overrideAttr = s.slice(slash + 1).trim()
    s = s.slice(0, slash).trim()
  }

  // 全是数字（.rd20 15）→ 当成难度
  if (/^\d+$/.test(s)) {
    out.difficulty = Number(s)
    return out
  }

  // 空间隔开的数字 = 难度（写成「难度15」「dc15」「15」都认）
  const diffHit = /(?:\s+|^)(?:难度|dc|DC)?\s*(\d+)$/.exec(s)
  if (diffHit && (diffHit[0].length > diffHit[1].length || /^\s/.test(diffHit[0]))) {
    out.difficulty = Number(diffHit[1])
    s = s.slice(0, diffHit.index).trim()
  }

  // 手动加值 +2-3+4（可连写）
  const addHit = /(?:[+-]\d+)+$/.exec(s)
  if (addHit) {
    out.add = (addHit[0].match(/[+-]\d+/g) || []).reduce((sum, x) => sum + Number(x), 0)
    s = s.slice(0, addHit.index).trim()
  } else {
    // 粘连的数字 = 绝对指定（.gm格斗5 / .gm力量6）
    const absHit = /(\d+)$/.exec(s)
    if (absHit) {
      out.absolute = Number(absHit[1])
      s = s.slice(0, absHit.index).trim()
    }
  }

  out.name = s
  return out
}

// 在人物卡里找目标：属性优先，其次技能，再按别名 / 前缀模糊匹配
export function matchTarget(card, name, options) {
  if (!card || !name) return null
  const fuzzy = !options || options.fuzzy !== false
  const props = card.props || {}
  const skills = card.skills || {}

  if (props[name] !== undefined) return { name, kind: 'attr' }
  if (skills[name]) return { name, kind: 'skill' }

  const alias = SKILL_ALIASES[name]
  if (alias && skills[alias]) return { name: alias, kind: 'skill' }

  if (!fuzzy) return null
  const skillHit = Object.keys(skills).find(s => s.startsWith(name))
  if (skillHit) return { name: skillHit, kind: 'skill' }
  const attrHit = Object.keys(props).find(a => a.startsWith(name))
  if (attrHit) return { name: attrHit, kind: 'attr' }
  return null
}
