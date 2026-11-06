// 把 TIM 消息翻译成「跑团日志」条目
// 纯函数 + 类型常量由调用方传入，方便在 node 里跑单测
//
// 日志要收的东西：玩家发言、主持人笔记/图片、骰子指令与骰娘回复、
// 主持人改规则/改 BGM/改场景/改骰娘设置这类系统动作

export const KIND = {
  PLAYER: 'player', // 玩家发言
  BOT: 'bot', // 骰娘回复
  KP: 'kp', // 主持人笔记 / 系统动作
  IMAGE: 'image', // 图片
  FILE: 'file' // 文件
}

// 自定义消息（mtype）在日志里怎么显示
const CUSTOM_LABELS = {
  bgm: '【BGM】主持人更换了游戏 BGM',
  scene: '【场景】主持人更换了游戏场景',
  note: '【笔记】主持人更新了重要笔记',
  kps: '【权限】主持人更新了主持人名单',
  dice: '【骰娘】主持人更新了骰娘设置',
  card: '【人物卡】主持人更新了人物卡'
}

const RULE_NAMES = {
  'coc7': 'COC 7 版',
  'guimi-d20': '诡秘 D20',
  'auto': '跟随人物卡（auto）'
}

export function isBotSender(from) {
  return typeof from === 'string' && from.startsWith('bot')
}

const parseCustom = (msg) => {
  const data = msg && msg.payload && msg.payload.data
  if (!data) return null
  if (typeof data === 'object') return data
  try {
    return JSON.parse(data)
  } catch (e) {
    return null
  }
}

const describeCustom = (data) => {
  const mtype = data && data.mtype
  if (!mtype) return null
  // 灰条提示（"xxx 加入了群聊"这种）没有记录价值
  if (mtype === 'tip') return null
  if (mtype === 'rule') {
    const rule = data.mdata && data.mdata.rule
    return `【规则】骰子规则改为 ${RULE_NAMES[rule] || rule || '默认'}`
  }
  if (CUSTOM_LABELS[mtype]) return CUSTOM_LABELS[mtype]
  // 其它自定义消息：尽量用描述文字兜底
  return `【消息】${(data.mdata && data.mdata.text) || '自定义消息'}`
}

// 返回 null 表示这条不该进日志
// options: { selfFrom, selfNick } 用于补全「自己发的」消息（本地创建的消息 from 常为空）
export function buildLogEntry(msg, types, options = {}) {
  if (!msg) return null
  if (msg.conversationType !== types.group) return null
  if (msg.isRevoked) return null

  const id = msg.ID || msg.id
  if (!id) return null
  const from = msg.from || options.selfFrom || ''
  const self = msg.flow === 'out'
  const base = {
    id: String(id),
    from,
    nick: msg.nameCard || msg.nick || (self ? options.selfNick : '') || from,
    time: msg.time || Math.floor(Date.now() / 1000)
  }

  // 1. 自定义消息：主持人笔记 / 系统动作
  if (msg.type === types.custom) {
    const data = parseCustom(msg)
    const content = describeCustom(data)
    if (!content) return null
    return { ...base, content, kind: KIND.KP }
  }

  // 2. 文本：玩家、主持人笔记、骰娘回复都算
  if (msg.type === types.text) {
    const text = (msg.payload && msg.payload.text) || ''
    if (!text.trim()) return null
    let kind = KIND.PLAYER
    if (isBotSender(from)) kind = KIND.BOT
    else if (msg.priority === types.high) kind = KIND.KP
    const content = kind === KIND.KP ? `【笔记】${text}` : text
    return { ...base, content, kind }
  }

  // 3. 图片
  if (msg.type === types.image) {
    const isNote = msg.priority === types.high || self
    return { ...base, content: isNote ? '【笔记】[图片]' : '[图片]', kind: KIND.IMAGE }
  }

  // 4. 文件
  if (msg.type === types.file) {
    const name = (msg.payload && msg.payload.fileName) || '文件'
    return { ...base, content: `[文件] ${name}`, kind: KIND.FILE }
  }

  return null
}

// 同一条消息会被多条路喂进来（收到消息 / 发送成功 / 进会话列表），
// 它们拿的是同一个 message 对象，记下来，第二次直接跳过
const loggedMessages = new WeakSet()

// 从一批消息里挑出真正要写进日志的条目，按群分组
// gamesById：groupId => game 对象（需要 logs / logEnabled）
// 返回 { groupId: [entry, ...] }
export function collectNewLogEntries(msglist, gamesById, types, options = {}) {
  const byGroup = {}
  if (!msglist || !msglist.length) return byGroup
  msglist.forEach(msg => {
    if (!msg) return
    const game = gamesById[msg.to]
    if (!game || !game.logEnabled) return
    if (loggedMessages.has(msg)) return
    const entry = buildLogEntry(msg, types, options)
    if (!entry) return
    // 翻历史消息会重新拿到新对象，但 ID 一样，按 ID 再去一次
    if ((game.logs || []).some(log => log.id === entry.id)) return
    const pending = byGroup[msg.to] || []
    if (pending.some(log => log.id === entry.id)) return
    byGroup[msg.to] = pending.concat(entry)
    loggedMessages.add(msg)
  })
  return byGroup
}
