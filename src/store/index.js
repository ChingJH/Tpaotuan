import Vue from 'vue'
import Vuex from 'vuex'
import conversation from './modules/conversation'
import group from './modules/group'
import user from './modules/user'
import friend from './modules/friend'
import blacklist from './modules/blacklist'
import game from './modules/game'
import {Message} from 'element-ui'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    current: Date.now(), // 当前时间
    intervalID: 0,
    message: undefined
  },
  getters: {
    hidden(state) {
      // eslint-disable-next-line no-unused-vars
      const temp = state.current 
      if (typeof document.hasFocus !== 'function') {
        return document.hidden
      }
      return !document.hasFocus()
    }
  },
  mutations: {
    startComputeCurrent(state) {
      state.intervalID = setInterval(() => {
        state.current = Date.now()
      }, 500)
    },
    stopComputeCurrent(state) {
      clearInterval(state.intervalID)
      state.intervalID = 0
    },
    showMessage(state, options) {
      if (state.message) {
        state.message.close()
      }
      state.message = Message({
        message: options.message,
        type: options.type || 'success',
        duration: options.duration || 2000,
        offset: 40
      })
    }
  },
  modules: {
    conversation,
    group,
    friend,
    blacklist,
    user,
    game,
  }
})

// 自己发出的消息不会走「收到消息」那条路，日志里会缺自己说的话，
// 所以在消息进入会话列表的统一入口上补一刀（收到的消息由 index.vue 负责，靠 id 去重）
store.subscribe((mutation) => {
  if (mutation.type !== 'pushCurrentMessageList') return
  const list = Array.isArray(mutation.payload) ? mutation.payload : [mutation.payload]
  const mine = list.filter(msg => msg && msg.flow === 'out')
  if (!mine.length) return
  store.dispatch('insertGameLogs', mine)
})

export default store

