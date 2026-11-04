<template>
  <div class="bot-switch">
    <el-switch :value="currentGame.botEnabled" :disabled="botSwitchLoading" @change="onBotSwitch"/>

    <!-- 骰子规则：决定骰娘用 d100 还是 d20 结算，切换后本团所有人生效且会记住 -->
    <div class="rule-row">
      <span class="rule-label">骰子规则</span>
      <el-radio-group :value="currentGame.rule" size="mini" :disabled="botSwitchLoading" @change="onRuleChange">
        <el-radio-button v-for="rule in rules" :key="rule.id" :label="rule.id">{{ rule.shortName }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="rule-tip">{{ ruleTip }}</div>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { loadLibs } from '@/sdk/bot'
import { RULE_LIST, getRule } from '@/rules'

export default {
  data() {
    return {
      botSwitchLoading: false, // 这个作为一个局部状态理论上是不严谨的，但是考虑到是瞬间状态所以无所谓了
      rules: RULE_LIST
    }
  },
  computed: {
    ...mapState({
      groupID: state => state.conversation.currentConversation.groupProfile.groupID,
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile.groupID]
    }),
    rule() {
      return getRule(this.currentGame ? this.currentGame.rule : undefined)
    },
    ruleTip() {
      const tip = this.rule.tips && this.rule.tips[this.rule.tips.length - 1]
      const command = this.rule.id === 'guimi-d20' ? '.rd20 侦查 15' : '.d% 聆听'
      return `当前 ${this.rule.shortName}：指令形如 ${command}${tip ? '（' + tip + '）' : ''}`
    }
  },
  methods: {
    async onBotSwitch(enabled) {
      this.botSwitchLoading = true
      try {
        // 加载骰子所需的库
        await loadLibs()
        await this.$store.dispatch('toggleBotEnabled', { groupId: this.groupID, enabled })
      } catch(e) {
        this.$store.commit('showMessage', {
          type: 'error',
          message: '切换机器人失败，请联系管理员',
        })
        console.log('切换 bot 失败', e)
      } finally {
        this.botSwitchLoading = false
      }
    },
    onRuleChange(ruleId) {
      this.$store.commit('setGameRule', { groupId: this.groupID, rule: ruleId })
      const rule = getRule(ruleId)
      this.$store.commit('showMessage', {
        type: 'success',
        message: `骰子规则已切换为${rule.shortName}（${rule.dice}），本团所有玩家生效`
      })
    }
  }
}
</script>
<style lang="stylus" scoped>
.bot-switch
  display flex
  flex-direction column
  align-items flex-start

.rule-row
  display flex
  align-items center
  margin-top 8px

.rule-label
  font-size 12px
  color $secondary
  margin-right 8px

.rule-tip
  font-size 12px
  color $secondary
  margin-top 6px
  max-width 330px
  line-height 1.4
</style>
