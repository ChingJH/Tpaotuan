<template>
  <div>
    <el-alert
        title="主持人发布的重要笔记将会显示在这里"
        type="info"
        description="下面的「我的笔记」是你自己的收藏，任何玩家都能加，只保存在本机浏览器，别人看不到"
        show-icon
    />
    <bgm :bgm="currentGame.bgm"/>

    <!-- 我的笔记：任何角色都能写，只存本机 -->
    <div class="my-note">
      <div class="my-note-title">
        <i class="el-icon-edit-outline"/> 我的笔记（仅自己可见）
      </div>
      <el-input
          v-model="draft"
          type="textarea"
          :rows="2"
          maxlength="1000"
          show-word-limit
          placeholder="记线索、NPC、骰点结果…… Ctrl+Enter 快速添加"
          @keydown.ctrl.enter.native.prevent="addMyNote"
      />
      <div class="my-note-bar">
        <el-button type="primary" size="mini" :disabled="!draft.trim()" @click="addMyNote">添加</el-button>
        <span class="my-note-tip">只存在这台电脑的浏览器里，换设备看不到</span>
      </div>
      <div v-if="myNotes.length" class="card-list my-note-list">
        <el-card v-for="note in myNotes" :key="note.id" class="card" shadow="hover">
          <div class="note-text">{{ note.text }}</div>
          <div class="tools">
            <el-button icon="el-icon-copy-document" size="mini" circle @click="handleCopyCard(note.text)"/>
            <el-button icon="el-icon-close" size="mini" circle @click="deleteMyNote(note.id)"/>
          </div>
        </el-card>
      </div>
    </div>

    <el-divider v-if="myNotes.length || currentGame.notes.length" content-position="left">主持人笔记</el-divider>
    <div ref="draggable" class="card-list">
      <el-card v-for="note in currentGame.notes" :key="note.id" class="card" shadow="hover">
        <div v-if="note.type === TIM.TYPES.MSG_TEXT" class="note-text">{{ note.payload }}</div>
        <img v-else-if="note.type === TIM.TYPES.MSG_IMAGE" class="note-img" :src="formatUrl(note.payload)"
             @click="handlePreview(note.payload)"/>
        <div class="tools">
          <el-button icon="el-icon-copy-document" size="mini" circle @click="handleCopyCard(note.payload)"/>
          <el-button icon="el-icon-close" size="mini" circle @click="handleDelete(note.id)"/>
        </div>
      </el-card>
    </div>
  </div>
</template>
<script>
import bgm from './widgets/bgm'
import { mapState } from 'vuex'
import Sortable from 'sortablejs'

export default {
  props: ['groupProfile'],
  components: {
    bgm,
  },
  data() {
    return {
      draft: '',
    }
  },
  computed: {
    ...mapState({
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile.groupID],
      userID: state => state.user.userID,
    }),
    myNotes() {
      const game = this.currentGame
      if (!game || !game.myNotes) return []
      return game.myNotes[this.userID] || []
    },
  },
  mounted() {
    Sortable.create(this.$refs.draggable, {
      ghostClass: 'moving',
      onEnd: ({ newIndex, oldIndex }) => {
        // splice 会改变原数组，是否不好？不过无所谓，不管了
        const tab = this.currentGame.notes.splice(oldIndex, 1)[0]
        this.currentGame.notes.splice(newIndex, 0, tab)
        this.$store.commit('updateNotes', { groupId: this.groupProfile.groupID, notes: this.currentGame.notes })
      }
    })
  },
  methods: {
    formatUrl(url) {
      return url.slice(0, 2) === '//' ? `https:${url}` : url
    },
    handlePreview(url) {
      this.$bus.$emit('image-preview', { url })
    },
    handleCopyCard(content) {
      this.$copyText(content)
          .then(() => {
            this.$store.commit('showMessage', {
              type: 'success',
              message: '复制成功'
            })
          })
    },
    handleDelete(id) {
      const notes = this.currentGame.notes.filter(note => note.id !== id)
      this.$store.commit('updateNotes', { groupId: this.groupProfile.groupID, notes })
    },
    addMyNote() {
      const text = (this.draft || '').trim()
      if (!text) return
      const notes = this.myNotes.concat({
        id: `my${Date.now()}${Math.floor(Math.random() * 1000)}`,
        text,
        time: Date.now(),
      })
      this.$store.commit('saveMyNotes', {
        groupId: this.groupProfile.groupID,
        userId: this.userID,
        notes,
      })
      this.draft = ''
    },
    deleteMyNote(id) {
      this.$store.commit('saveMyNotes', {
        groupId: this.groupProfile.groupID,
        userId: this.userID,
        notes: this.myNotes.filter(note => note.id !== id),
      })
    },
  }
}
</script>
<style scoped>
.card-list {
  margin: 10px;
}

.my-note {
  margin: 10px;
}

.my-note-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.my-note-bar {
  margin-top: 6px;
  display: flex;
  align-items: center;
}

.my-note-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.my-note-list {
  margin: 8px 0 0 0;
}

.card {
  position: relative;
}

.card + .card {
  margin-top: 10px;
}

.tools {
  display: none;
  position: absolute;
  right: 10px;
  top: 10px;
}

.card:hover .tools {
  display: block;
}

.note-text {
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
}

.note-img {
  max-width: 250px;
  cursor: zoom-in;
}

::v-deep .moving {
  background-color: rgb(238, 238, 238);
}
</style>
