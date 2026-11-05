<template>
  <el-row>
    <el-col v-show="!leftCollapsed" :span="5">
      <profile-bar/>
      <side-bar/>
    </el-col>
    <el-col :span="leftCollapsed ? 24 : 19">
      <current-conversation
          v-if="showCurrentConversation"
          :left-collapsed="leftCollapsed"
          @toggle-left="toggleLeft"/>
      <div v-else class="conversation-empty">
        <el-button type="primary" @click="$store.commit('updateCreateGroupModelVisible', true)">&gt;&gt; 发起跑团 &lt;&lt;</el-button>
        <div class="expand-hint" v-if="leftCollapsed">
          <el-button type="text" @click="toggleLeft">展开左侧列表</el-button>
        </div>
      </div>
    </el-col>
    <image-previewer/>
  </el-row>
</template>
<script>
import CurrentConversation from '@/components/conversation/current-conversation'
import SideBar from '@/components/layout/side-bar'
import ProfileBar from '@/components/layout/profile-bar'
import ImagePreviewer from '@/components/message/image-previewer.vue'
import {mapState} from 'vuex'

const LEFT_COLLAPSED_KEY = 'paotuanui-left'

export default {
  name: 'Main',
  components: {
    SideBar,
    CurrentConversation,
    ImagePreviewer,
    ProfileBar,
  },
  data() {
    return {
      // 左侧列表是否收起，记在本机，刷新后保持
      leftCollapsed: localStorage.getItem(LEFT_COLLAPSED_KEY) === '1',
    }
  },
  computed: {
    ...mapState({
      currentConversation: state => state.conversation.currentConversation,
    }),
    // 是否显示当前会话组件
    showCurrentConversation() {
      return !!this.currentConversation.conversationID
    },
  },
  methods: {
    toggleLeft() {
      this.leftCollapsed = !this.leftCollapsed
      localStorage.setItem(LEFT_COLLAPSED_KEY, this.leftCollapsed ? '1' : '0')
    },
  }
}
</script>
<style scoped>
.conversation-empty {
  height: 100vh;
  line-height: 100vh;
  text-align: center;
  background-color: white;
}
.expand-hint {
  position: fixed;
  left: 12px;
  top: 12px;
}
</style>
