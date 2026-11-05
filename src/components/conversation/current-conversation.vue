<template>
  <div class="current-conversation-wrapper scene-bg" :style="`background-image: url(${backgroundUrl})`">
    <div class="current-conversation" :class="{ 'full-width': !showConversationProfile }" @scroll="onScroll">
      <div class="header background-blur">
        <!-- 收起/展开左侧会话列表 -->
        <div
            :class="['panel-toggle', 'left', { collapsed: leftCollapsed }]"
            :title="leftCollapsed ? '展开左侧列表' : '收起左侧列表'"
            @click="$emit('toggle-left')">
          <i :class="leftCollapsed ? 'el-icon-s-unfold' : 'el-icon-s-fold'"/>
        </div>
        <div class="name">{{ name }}</div>
        <!-- 骰娘 / 日志 状态指示（主持人可点） -->
        <div class="status-chips" v-if="currentConversation.type === 'GROUP' && currentGame">
          <span
              :class="['chip', botOn ? 'on' : 'off']"
              :title="botTitle"
              @click="onClickBotChip">🤖 骰娘{{ botOn ? '开' : '关' }}</span>
          <span
              :class="['chip', logOn ? 'on' : 'off']"
              :title="logTitle"
              @click="onClickLogChip">📝 日志{{ logOn ? '开' : '关' }}</span>
        </div>
        <!-- 收起/展开右侧面板 -->
        <div
            :class="['panel-toggle', 'right', { collapsed: !showConversationProfile }]"
            :title="showConversationProfile ? '收起右侧面板' : '展开右侧面板'"
            @click="showConversationProfile = !showConversationProfile">
          <i :class="showConversationProfile ? 'el-icon-s-unfold' : 'el-icon-s-fold'"/>
        </div>
      </div>
      <div class="content scene-bg">
        <div class="message-list" ref="message-list" @scroll="this.onScroll">
          <div class="more" v-if="!isCompleted">
            <el-button
              type="text"
              @click="$store.dispatch('getMessageList', currentConversation.conversationID)"
            >查看更多</el-button>
          </div>
          <div class="no-more" v-else>没有更多了</div>
          <message-item v-for="message in currentMessageList" :key="message.ID" :message="message"/>
        </div>
        <div v-show="isShowScrollButtomTips" class="newMessageTips" @click="scrollMessageListToButtom">回到最新位置</div>
      </div>
      <div class="footer" v-if="showMessageSendBox" >
        <message-send-box/>
      </div>
    </div>
    <div class="profile" v-if="showConversationProfile" >
      <right-panel v-if="currentConversation.type === TIM.TYPES.CONV_GROUP" />
      <conversation-profile v-else />
    </div>
    <!-- 群成员资料组件 -->
    <member-profile-card />
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import MessageSendBox from '../message/message-send-box'
import MessageItem from '../message/message-item'
import ConversationProfile from './conversation-profile.vue'
import MemberProfileCard from '../group/member-profile-card'
import RightPanel from './right-panels'

export default {
  name: 'CurrentConversation',
  props: ['leftCollapsed'],
  components: {
    MessageSendBox,
    MessageItem,
    ConversationProfile,
    MemberProfileCard,
    RightPanel,
  },
  data() {
    return {
      isShowScrollButtomTips: false,
      preScrollHeight: 0,
      showConversationProfile: true,
      timeout: '',
      botAutoTried: {}, // 本机本次会话已经尝试过自动拉起骰娘的群
    }
  },
  computed: {
    ...mapState({
      currentConversation: state => state.conversation.currentConversation,
      currentUnreadCount: state => state.conversation.currentConversation.unreadCount,
      currentMessageList: state => state.conversation.currentMessageList,
      isCompleted: state => state.conversation.isCompleted,
      groupProfile: state => state.conversation.currentConversation.groupProfile,
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile?.groupID],
    }),
    ...mapGetters(['toAccount', 'hidden']),
    name() {
      if (this.currentConversation.type === 'C2C') {
        return this.currentConversation.userProfile.nick || this.toAccount
      } else if (this.currentConversation.type === 'GROUP') {
        return this.currentConversation.groupProfile.name || this.toAccount
      } else if (this.currentConversation.conversationID === '@TIM#SYSTEM') {
        return '系统通知'
      }
      return this.toAccount
    },
    showMessageSendBox() {
      return this.currentConversation.type !== this.TIM.TYPES.CONV_SYSTEM
    },
    backgroundUrl() {
      return this.currentGame?.scene
    },
    isOwner() {
      const selfInfo = this.groupProfile && this.groupProfile.selfInfo
      return !!selfInfo && selfInfo.role === this.TIM.TYPES.GRP_MBR_ROLE_OWNER
    },
    isExtraKp() {
      const kps = (this.currentGame && this.currentGame.kps) || {}
      return !!kps[this.$store.state.user.userID]
    },
    // root 主持人 或 被加进来的主持人，都能控制骰娘与日志
    canKp() {
      return this.isOwner || this.isExtraKp
    },
    botOn() {
      return !!(this.currentGame && this.currentGame.botEnabled)
    },
    logOn() {
      return !!(this.currentGame && this.currentGame.logEnabled)
    },
    botTitle() {
      if (!this.canKp) return '主持人控制：本机骰娘' + (this.botOn ? '已开启' : '未开启，需要主持人开启')
      return this.botOn ? '骰娘已开启，点击关闭' : '骰娘未开启，点击开启'
    },
    logTitle() {
      if (!this.canKp) return '主持人控制：日志记录' + (this.logOn ? '进行中' : '未开启')
      return this.logOn
          ? '正在记录日志（玩家发言 / 主持人笔记 / 骰子记录），点击关闭'
          : '日志未开启，点击开始记录'
    }
  },
  mounted() {
    this.$bus.$on('image-loaded', this.onImageLoaded)
    this.$bus.$on('scroll-bottom', this.scrollMessageListToButtom)
    window.addEventListener('paotuan-bot-kicked', this.onBotKicked)
    if (this.currentConversation.conversationID === '@TIM#SYSTEM') {
      return false
    }
  },
  beforeDestroy() {
    window.removeEventListener('paotuan-bot-kicked', this.onBotKicked)
  },
  updated() {
    this.keepMessageListOnButtom()
    // 1. 系统会话隐藏右侧资料组件
    // 2. 没有当前会话时，隐藏右侧资料组件。
    //    背景：退出群组/删除会话时，会出现一处空白区域
    // if (this.currentConversation.conversationID === '@TIM#SYSTEM' ||
    //     typeof this.currentConversation.conversationID === 'undefined') {
    //   this.showConversationProfile = false
    // }
  },
  watch: {
    currentUnreadCount(next) {
      if (!this.hidden && next > 0) {
        this.tim.setMessageRead({ conversationID: this.currentConversation.conversationID })
      }
    },
    hidden(next) {
      if (!next && this.currentUnreadCount > 0) {
        this.tim.setMessageRead({ conversationID: this.currentConversation.conversationID })
      }
    },
    // 切群时把上次开着的骰娘自动拉起来（刷新页面后骰娘不会「自己没了」）
    'currentConversation.groupProfile.groupID': {
      immediate: true,
      handler(groupId) {
        if (!groupId) return
        this.$store.dispatch('initGame', groupId).then(() => this.autoEnableBot(groupId))
      }
    }
  },
  methods: {
    // 骰娘账号在别处登录了，本机这份就被踢了：状态同步成「关」
    onBotKicked(event) {
      const groupId = event && event.detail && event.detail.groupId
      if (!groupId || groupId !== (this.groupProfile && this.groupProfile.groupID)) return
      this.$store.commit('toggleBotEnabled', { groupId, enabled: false })
      this.$store.commit('showMessage', {
        message: '骰娘已被另一个页面接管，本机这份已退出',
        type: 'warning'
      })
    },
    // 骰娘跑在本机：上次开着、这次进群就自动重连一次，失败了就把开关关回去
    autoEnableBot(groupId) {
      const game = this.$store.state.game.list[groupId]
      if (!game || !game.botEnabled) return
      if (this.botAutoTried[groupId]) return
      this.botAutoTried[groupId] = true
      if (!this.canKp) return // 非主持人不开，避免和主持人的骰娘抢同一个账号
      this.$store.dispatch('toggleBotEnabled', { groupId, enabled: true }).catch(error => {
        this.$store.commit('toggleBotEnabled', { groupId, enabled: false })
        this.$store.commit('showMessage', {
          message: '骰娘自动重连失败：' + ((error && error.message) || '网络异常'),
          type: 'error'
        })
      })
    },
    onClickBotChip() {
      if (!this.canKp) {
        this.$store.commit('showMessage', { message: '只有主持人可以开关骰娘', type: 'warning' })
        return
      }
      const groupId = this.currentConversation.groupProfile.groupID
      const enabled = !this.botOn
      this.$store.dispatch('toggleBotEnabled', { groupId, enabled }).then(() => {
        this.$store.commit('showMessage', {
          message: enabled ? '骰娘已开启，群里发 .gm 试试' : '骰娘已关闭',
          type: 'success'
        })
      }).catch(error => {
        this.$store.commit('showMessage', {
          message: '骰娘开关失败：' + ((error && error.message) || '网络异常'),
          type: 'error'
        })
      })
    },
    onClickLogChip() {
      if (!this.canKp) {
        this.$store.commit('showMessage', { message: '只有主持人可以开关日志记录', type: 'warning' })
        return
      }
      const groupId = this.currentConversation.groupProfile.groupID
      const enabled = !this.logOn
      this.$store.commit('toggleLogEnabled', { groupId, enabled })
      this.$store.commit('showMessage', {
        message: enabled ? '开始记录日志（玩家 / 笔记 / 骰子）' : '已停止记录日志',
        type: 'success'
      })
    },
    onScroll({ target: { scrollTop } }) {
      let messageListNode = this.$refs['message-list']
      if (!messageListNode) {
        return
      }
      if (this.preScrollHeight - messageListNode.clientHeight - scrollTop < 20) {
        this.isShowScrollButtomTips = false
      }
    },
    // 如果滚到底部就保持在底部，否则提示是否要滚到底部
    keepMessageListOnButtom() {
      let messageListNode = this.$refs['message-list']
      if (!messageListNode) {
        return
      }
      // 距离底部20px内强制滚到底部,否则提示有新消息
      if (this.preScrollHeight - messageListNode.clientHeight - messageListNode.scrollTop < 20) {
        this.$nextTick(() => {
          messageListNode.scrollTop = messageListNode.scrollHeight
        })
        this.isShowScrollButtomTips = false
      } else {
        this.isShowScrollButtomTips = true
      }
      this.preScrollHeight = messageListNode.scrollHeight
    },
    // 直接滚到底部
    scrollMessageListToButtom() {
      this.$nextTick(() => {
        let messageListNode = this.$refs['message-list']
        if (!messageListNode) {
          return
        }
        messageListNode.scrollTop = messageListNode.scrollHeight
        this.preScrollHeight = messageListNode.scrollHeight
        this.isShowScrollButtomTips = false
      })
    },
    showMore() {
      this.showConversationProfile = !this.showConversationProfile
    },
    onImageLoaded() {
      this.keepMessageListOnButtom()
    }
  }
}
</script>

<style lang="stylus" scoped>
/* 当前会话的骨架屏 */
.current-conversation-wrapper
  height $height
  background-color $white
  color $base
  display flex
  .current-conversation
    display: flex;
    flex-direction: column;
    width: 65%;
    height: $height;
    transition width .2s
    &.full-width
      width 100%
  .profile
    height: $height;
    overflow hidden
    width 35%
    border-left 1px solid $border-base
    flex-shrink 0
  .more
    display: flex;
    justify-content: center;
    font-size: 12px;
  .no-more
    display: flex;
    justify-content: center;
    color: $secondary;
    font-size: 12px;
    padding: 10px 10px;

.header
  border-bottom 1px solid $border-base
  height 50px
  position relative
  display flex
  align-items center
  .name
    flex 1
    overflow hidden
    white-space nowrap
    text-overflow ellipsis
    padding 0 12px
    color $base
    font-size 18px
    font-weight bold
    line-height 50px
    text-shadow $font-dark 0 0 0.1em
  /* 两侧面板的收起/展开按钮 */
  .panel-toggle
    width 30px
    height 50px
    line-height 50px
    text-align center
    flex-shrink 0
    cursor pointer
    color $secondary
    transition color .15s
    &:hover
      color $primary
    i
      font-size 18px
    &.left
      padding-left 4px
    &.right
      padding-right 4px
  .status-chips
    display flex
    align-items center
    flex-shrink 0
    .chip
      font-size 12px
      line-height 20px
      padding 0 8px
      margin-left 6px
      border-radius 10px
      border 1px solid transparent
      white-space nowrap
      user-select none
      cursor default
      &.on
        color #1f8f4a
        background #e8f7ee
        border-color #b7e4c7
      &.off
        color #909399
        background #f2f3f5
        border-color #e4e7ed
  .btn-more-info
    position absolute
    top 10px
    right -15px
    border-radius 50%
    width 30px
    height 30px
    cursor pointer
    &::before
      position absolute
      right 0
      z-index 0
      content ""
      width: 15px
      height: 30px
      border: 1px solid $border-base
      border-radius: 0 100% 100% 0/50%
      border-left: none
      background-color $background-light
    &::after
      content ""
      width: 8px;
      height: 8px;
      transition: transform 0.8s;
      border-top: 2px solid $secondary;
      border-right: 2px solid $secondary;
      float:right;
      position:relative;
      top: 11px;
      right: 8px;
      transform:rotate(45deg)
    &.left-arrow
      transform rotate(180deg)
      &::before
        background-color $white
    &:hover
      &::after
        border-color $light-primary
.content
  display: flex;
  flex 1
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
  .message-list
    width: 100%;
    box-sizing: border-box;
    overflow-y: scroll;
    padding: 0 20px;
  .newMessageTips
    position: absolute
    cursor: pointer;
    padding: 5px;
    width: 120px;
    margin: auto;
    left: 0;
    right: 0;
    bottom: 5px;
    font-size: 12px;
    text-align: center;
    border-radius: 10px;
    border: $border-light 1px solid;
    background-color: $white;
    color: $primary;
.footer
  border-top: 1px solid $border-base;
.show-more {
  text-align: right;
  padding: 10px 20px 0 0;
}
.scene-bg {
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
}
</style>
