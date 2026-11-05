<template>
  <div>
    <div class="log-switch">
      <div class="label">启用 Log</div>
      <el-switch
          :value="currentGame.logEnabled"
          @input="$store.commit('toggleLogEnabled', { groupId: groupProfile.groupID, enabled: $event })"
      />
    </div>
    <div class="btn-container">
      <el-button-group>
        <el-button size="small" @click="exportText">导出为文本</el-button>
        <el-button size="small" @click="exportHTML">导出为HTML</el-button>
        <el-button size="small" @click="exportJson">导出为JSON</el-button>
        <el-button type="danger" size="small" @click="clearAllLogs">清空</el-button>
      </el-button-group>
    </div>
    <div ref="draggable" class="log-container">
      <div v-for="log in currentGame.logs" :key="log.id" class="log-item">
        <div>
          <i class="el-icon-rank handle"/>
          <span v-if="log.kind" :class="['kind', log.kind]" :title="kindTitle(log.kind)">{{ kindLabel(log.kind) }}</span>
          <div :title="log.from" class="nick">{{ log.nick || log.from }}</div>
          <div :title="formatTime(log.time)" class="content">{{ log.content }}</div>
        </div>
        <i class="el-icon-close delete" @click="onDeleteLog(log.id)"/>
      </div>
    </div>
  </div>
</template>
<script>
import { Switch } from 'element-ui'
import { mapState } from 'vuex'
import { getFullDate } from '@/utils/date'
import Sortable from 'sortablejs'

// 提供默认 css TODO 进一步优化
const INITIAL_CSS = `
.chat-item {
    padding: 4px;
}

.chat-item-name {
    font-weight: bold;
}

.chat-user-bot {
    background-color: #ffffe0;
}
/* xxx 替换成实际的 userid */
.chat-user-xxx {
    background-color: #e0ffff;
}`

export default {
  props: ['groupProfile'],
  components: {
    ElSwitch: Switch,
  },
  computed: {
    ...mapState({
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile.groupID]
    }),
  },
  mounted() {
    Sortable.create(this.$refs.draggable, {
      handle: '.handle',
      ghostClass: 'moving',
      onEnd: ({ newIndex, oldIndex }) => {
        // splice 会改变原数组，是否不好？不过无所谓，不管了
        const tab = this.currentGame.logs.splice(oldIndex, 1)[0]
        this.currentGame.logs.splice(newIndex, 0, tab)
        this.$store.commit('updateLogs', { groupId: this.groupProfile.groupID, logs: this.currentGame.logs })
      }
    })
  },
  methods: {
    // 日志类型标签：玩家 / 骰娘 / 主持 / 图片 / 文件
    kindLabel(kind) {
      const map = { player: '玩家', bot: '骰娘', kp: 'KP', image: '图片', file: '文件' }
      return map[kind] || ''
    },
    kindTitle(kind) {
      const map = {
        player: '玩家发言',
        bot: '骰娘回复（含骰子指令结果）',
        kp: '主持人笔记 / 主持人操作',
        image: '图片',
        file: '文件'
      }
      return map[kind] || ''
    },
    formatTime(time) {
      return getFullDate(new Date(time * 1000))
    },
    onDeleteLog(id) {
      this.$store.commit('updateLogs', {
        groupId: this.groupProfile.groupID,
        logs: this.currentGame.logs.filter(log => log.id !== id)
      })
    },
    clearAllLogs() {
      this.$store.commit('updateLogs', { groupId: this.groupProfile.groupID, logs: [] })
    },
    exportText() {
      let lastUser = ''      // 上一个说话人，用于合并会话
      let result = ''   // 最终结果
      this.currentGame.logs.forEach(log => {
        let user = log.nick || log.from
        if (user !== lastUser) {
          result += `${user} ${this.formatTime(log.time)}\n`
        }
        result += log.content + '\n'
        lastUser = user
      })
      this.download('text', result)
    },
    exportHTML() {
      let lastUser = ''      // 上一个说话人，用于合并会话
      let result = ''   // 最终结果
      this.currentGame.logs.forEach(log => {
        let user = log.nick || log.from
        if (user !== lastUser) {
          if (result !== '') result += '</div>'
          result += `<div class='chat-item chat-user-${log.from}'>`
            + `<div class='meta'><span class='chat-item-name'>${user}</span>`
            + `<span class='chat-item-time'>${this.formatTime(log.time)}</span>`
            + `</div><div class='content'>${log.content}</div>`
        } else {
          result += `<div class='content'>${log.content}</div>`
        }
        lastUser = user
      })
      if (result !== '') result += '</div>'
      // add css
      result += `<style>${INITIAL_CSS}</style>`
      this.download('html', result)
    },
    exportJson() {
      this.download('json', JSON.stringify(this.currentGame.logs))
    },
    // 将字符串作为文件下载
    // type: text/html/json
    download(type, text) {
      const element = document.createElement('a')
      element.setAttribute('href', `data:${type}/plain;charset=utf-8,` + encodeURIComponent(text))
      element.setAttribute('download', `log.${type === 'text' ? 'txt' : type}`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }
}
</script>
<style lang="stylus" scoped>
::v-deep .moving {
  background-color: rgb(238, 238, 238);
}

.log-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 20px;
  padding: 15px 0;
  border-bottom: 1px solid #DCDFE6
}

.label {
  font-size: 14px;
  color: $base;
}

.btn-container {
  width: max-content;
  margin: 20px auto;
}

.log-container {
  margin: 0 10px;
}

.log-item {
  display: flex;
  justify-content: space-between;
  margin 10px 0

  & > div {
    display: flex;
  }

  &:hover {
    .handle, .delete {
      visibility visible
    }
  }
}

.nick {
  word-break break-all
  font-weight bold
  margin 0 5px
  font-size 14px
  flex-shrink 0
}

.kind {
  flex-shrink: 0;
  align-self: center;
  font-size: 11px;
  line-height: 16px;
  padding: 0 4px;
  border-radius: 3px;
  border: 1px solid transparent;

  &.player { color: #606266; background: #f2f3f5; border-color: #e4e7ed; }
  &.bot { color: #8a5a00; background: #fdf6ec; border-color: #f5dab1; }
  &.kp { color: #7b3fa0; background: #f5eefa; border-color: #e0cdf0; }
  &.image { color: #1f6f8b; background: #eaf6fa; border-color: #c6e6f0; }
  &.file { color: #1f6f8b; background: #eaf6fa; border-color: #c6e6f0; }
}

.content {
  word-break break-all
  margin 0 5px
  font-size 14px
}

.handle {
  cursor move
  visibility hidden
  color $secondary
  font-weight bold
}

.delete {
  cursor pointer
  visibility hidden
  color $danger
  font-weight bold
}
</style>
