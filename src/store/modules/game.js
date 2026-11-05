import Vue from 'vue'
import { enableBot, disableBot } from 'tim'
import TIM from '@/sdk'
import { isRuleSetting, RULE_AUTO } from '@/rules'

const gamePrototype = {
  // 本团的骰子规则：auto（按每个人的人物卡） / coc7 / guimi-d20，群设置里可切换
  rule: RULE_AUTO,
  currentTab: 'group', // 当前打开的 tab，默认是群信息 tab
  botEnabled: false, // 是否打开骰子开关
  logEnabled: false, // 是否打开日志记录开关
  logs: [], // id\from\nick\time\content 不记录全部的 tim msg 属性
  bgm: {}, // platform\type\id 平台、类型（单曲、专辑）、歌曲 id
  notes: [], // id\type\payload 主持人笔记
  diceSettings: {}, // 骰娘自定义设置（文案/开关/SC 阈值），空表示用默认值
  myNotes: {}, // userID => [{ id, text, time }] 玩家自己的笔记，只存本机
  kps: {}, // userID => true，被 root 主持人加进来、权限等同 KP 的管理员
  noteUnread: false, // 是否有未读的笔记
  cards: {}, // 人物卡。 userID => 人物卡信息
  openedCards: ['group', 'note', 'log'], // 当前打开的所有 tab ['group', 'note', 'log', 群员ID]
  scene: '' // 当前游戏场景图片
}

const _ = (groupId) => {
  if (!game.state.list[groupId]) {
    Vue.set(game.state.list, groupId, JSON.parse(JSON.stringify(gamePrototype)))
  }
  return game.state.list[groupId]
}

const save = (key, groupId, content) => {
  localStorage.setItem(`paotuan${key}-${groupId}`, JSON.stringify(content))
}

// 单个值（字符串/数字/布尔）的持久化读取
const getInitialSavedValue = (key, groupId, fallback) => {
  const saved = localStorage.getItem(`paotuan${key}-${groupId}`)
  if (saved === null) return fallback
  try {
    const parsed = JSON.parse(saved)
    return parsed === null || parsed === undefined ? fallback : parsed
  } catch (e) {
    return fallback
  }
}

const getInitialSavedContent = (key, groupId) => {
  const saved = localStorage.getItem(`paotuan${key}-${groupId}`)
  return saved ? JSON.parse(saved) : []
}

// 人物卡是对象（键为 'o' + userId），不能用数组兜底
const getInitialSavedObject = (key, groupId) => {
  const saved = localStorage.getItem(`paotuan${key}-${groupId}`)
  if (!saved) return {}
  try {
    const parsed = JSON.parse(saved)
    return parsed && !Array.isArray(parsed) ? parsed : {}
  } catch (e) {
    return {}
  }
}

const game = {
  state: {
    list: {} // groupId => game
  },
  mutations: {
    initGame(state, groupId) {
      Vue.set(state.list, groupId, JSON.parse(JSON.stringify(gamePrototype)))
      state.list[groupId].notes = getInitialSavedContent('note', groupId)
      state.list[groupId].logs = getInitialSavedContent('log', groupId)
      state.list[groupId].cards = getInitialSavedObject('card', groupId)
      state.list[groupId].myNotes = getInitialSavedObject('mynote', groupId)
      state.list[groupId].kps = getInitialSavedObject('kps', groupId)
      state.list[groupId].diceSettings = getInitialSavedObject('dice', groupId)
      // 骰子规则是本团的长期设置，刷新后要还在
      const savedRule = getInitialSavedValue('rule', groupId, RULE_AUTO)
      state.list[groupId].rule = isRuleSetting(savedRule) ? savedRule : RULE_AUTO
    },
    toggleBotEnabled(state, { groupId, enabled }) {
      _(groupId).botEnabled = enabled
    },
    setGameRule(state, { groupId, rule }) {
      const next = isRuleSetting(rule) ? rule : RULE_AUTO
      _(groupId).rule = next
      save('rule', groupId, next)
    },
    toggleLogEnabled(state, { groupId, enabled }) {
      _(groupId).logEnabled = enabled
    },
    insertLog(state, { groupId, log }) {
      _(groupId).logs.push(log)
      save('log', groupId, _(groupId).logs)
    },
    updateLogs(state, { groupId, logs }) {
      _(groupId).logs = logs
      save('log', groupId, logs)
    },
    setGameBgm(state, { groupId, bgm }) {
      _(groupId).bgm = bgm
    },
    addNote(state, { groupId, note }) {
      _(groupId).notes.push(note)
      save('note', groupId, _(groupId).notes)
    },
    updateNotes(state, { groupId, notes }) {
      _(groupId).notes = notes
      save('note', groupId, notes)
    },
    setNoteUnread(state, { groupId, unread }) {
      _(groupId).noteUnread = unread
    },
    // 玩家自己的笔记：只写本机，不同步给别人
    saveMyNotes(state, { groupId, userId, notes }) {
      Vue.set(_(groupId).myNotes, userId, notes)
      save('mynote', groupId, _(groupId).myNotes)
    },
    // 额外主持人列表（被 root 指定的管理员）
    setGameKps(state, { groupId, kps }) {
      _(groupId).kps = kps && typeof kps === 'object' ? kps : {}
      save('kps', groupId, _(groupId).kps)
    },
    // 骰娘自定义设置（主持人改的那份）
    setDiceSettings(state, { groupId, settings }) {
      _(groupId).diceSettings = settings && typeof settings === 'object' ? settings : {}
      save('dice', groupId, _(groupId).diceSettings)
    },
    setCurrentTab(state, { groupId, tab }) {
      _(groupId).currentTab = tab
    },
    setUserCard(state, { groupId, userId, card }) {
      Vue.set(_(groupId).cards, 'o' + userId, card) // 注意这里加一个字符串，不然纯数字被vue处理后序列化会爆炸
      save('card', groupId, { ..._(groupId).cards, [`o${userId}`]: card }) // 好像不是立刻生效的，先这么写
    },
    setOpenedUserCards(state, { groupId, list }) {
      _(groupId).openedCards = list
    },
    setScene(state, { groupId, sceneUrl }) {
      _(groupId).scene = sceneUrl
    },
    reset(state) {
      Object.assign(state, {
        list: {},
      })
    }
  },
  actions: {
    initGame(context, groupId) {
      if (!context.state.list[groupId]) {
        context.commit('initGame', groupId)
      }
    },
    toggleBotEnabled(context, { groupId, enabled }) {
      return new Promise(((resolve, reject) => {
        (enabled ? enableBot : disableBot)(groupId)
            .then(() => {
              context.commit('toggleBotEnabled', { groupId, enabled })
              resolve()
            })
            .catch(e => {
              // 按照文档说明，重复加群也是成功，但仍会偶现失败
              // 这里同时匹配错误码与文案，SDK 改文案时不至于直接失效
              const message = String((e && (e.message || e.msg)) || e)
              const alreadyInGroup = (e && e.code === 10013) || /已经?是群成员|already/i.test(message)
              if (alreadyInGroup) {
                console.log('[bot.switch]already in group')
                context.commit('toggleBotEnabled', { groupId, enabled })
                resolve() // 也是成功
              } else {
                reject(e)
              }
            })
      }))
    },
    insertGameLogs(context, msglist) {
      msglist.filter(msg =>
          msg.conversationType === TIM.TYPES.CONV_GROUP
          && msg.type === TIM.TYPES.MSG_TEXT
          && context.state.list[msg.to]
          && context.state.list[msg.to].logEnabled
      ).forEach(msg => {
        const log = {
          id: msg.ID,
          from: msg.from,
          nick: msg.nameCard || msg.nick,
          time: msg.time,
          content: msg.payload.text,
        }
        if (log.content.startsWith('.') || log.content.startsWith('。')) {
          return // 这里默认过滤了骰子指令，后续可以考虑做成配置项
        }
        context.commit('insertLog', { groupId: msg.to, log })
      })
    },
    handleKPNote(context, msglist) {
      msglist.filter(msg =>
          msg.conversationType === TIM.TYPES.CONV_GROUP
          && msg.priority === TIM.TYPES.MSG_PRIORITY_HIGH
      ).forEach(msg => {
        if (msg.type === TIM.TYPES.MSG_CUSTOM) {
          const data = JSON.parse(msg.payload.data)
          if (data.mtype === 'bgm') {
            context.commit('setGameBgm', { groupId: msg.to, bgm: data.mdata })
            context.dispatch('handleNoteUnread', msg.to)
          } else if (data.mtype === 'card') {
            context.commit('setUserCard', { groupId: msg.to, userId: data.mdata.userId, card: data.mdata.card })
          } else if (data.mtype === 'rule') {
            // 主持人切换骰子规则后广播给群成员，收到就本地生效
            context.commit('setGameRule', { groupId: msg.to, rule: data.mdata && data.mdata.rule })
          } else if (data.mtype === 'kps') {
            // root 主持人在增减额外主持人，收到的客户端同步权限
            context.commit('setGameKps', { groupId: msg.to, kps: data.mdata && data.mdata.kps })
          } else if (data.mtype === 'dice') {
            // 主持人改了骰娘设置（文案/开关/阈值），收到就本地生效
            context.commit('setDiceSettings', { groupId: msg.to, settings: data.mdata && data.mdata.settings })
          } else if (data.mtype === 'scene') {
            context.commit('setScene', { groupId: msg.to, sceneUrl: data.mdata })
          }
        } else if (msg.type === TIM.TYPES.MSG_TEXT) {
          context.commit('addNote', {
            groupId: msg.to,
            note: { id: msg.ID, type: msg.type, payload: msg.payload.text }
          })
          context.dispatch('handleNoteUnread', msg.to)
        } else if (msg.type === TIM.TYPES.MSG_IMAGE) {
          context.commit('addNote', {
            groupId: msg.to,
            note: { id: msg.ID, type: msg.type, payload: msg.payload.imageInfoArray[0].imageUrl }
          })
          context.dispatch('handleNoteUnread', msg.to)
        }
      })
    },
    handleNoteUnread(context, groupId) {
      // 为 note 增加红点，如果用户当前停留在 note tab 则不增加
      if (_(groupId).currentTab !== 'note') {
        context.commit('setNoteUnread', { groupId, unread: true })
      }
    },
    openUserCard(context, { groupId, userId }) {
      // 如果没有导入过人物卡
      const game = _(groupId)
      if (!game.cards['o' + userId]) {
        return new Promise((_, reject) => reject())
      }
      // 如果当前没有打开这个人，就打开
      if (!game.openedCards.includes(userId)) {
        context.commit('setOpenedUserCards', { groupId, list: [...game.openedCards, userId] })
      }
      // 把当前tab 切换到他的人物卡
      context.commit('setCurrentTab', { groupId, tab: userId })
      return new Promise(resolve => resolve())
    },
    closeUserCard(context, { groupId, userId }) {
      const game = _(groupId)
      // 删除自己
      context.commit('setOpenedUserCards', { groupId, list: game.openedCards.filter(id => id !== userId) })
      // 如果删除的正好是当前的tab，就切换到第一个吧
      if (game.currentTab === userId) {
        context.commit('setCurrentTab', { groupId, tab: 'group' })
      }
    },
  }
}

export default game
