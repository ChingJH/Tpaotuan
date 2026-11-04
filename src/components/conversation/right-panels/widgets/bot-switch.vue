<template>
  <div class="bot-switch">
    <el-switch :value="currentGame.botEnabled" :disabled="botSwitchLoading" @change="onBotSwitch"/>

    <!-- 骰子规则：决定骰娘用 d100 还是 d20 结算。切换后会广播给群成员，并记在本机 -->
    <div class="rule-row">
      <span class="rule-label">骰子规则</span>
      <el-radio-group :value="currentGame.rule" size="mini" :disabled="botSwitchLoading" @change="onRuleChange">
        <el-radio-button v-for="option in ruleOptions" :key="option.id" :label="option.id">{{ option.shortName }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="rule-tip">
      <div>{{ ruleTip }}</div>
      <el-link type="primary" :underline="false" @click="syncRule">把规则同步给群成员</el-link>
    </div>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { loadLibs } from '@/sdk/bot'
import { RULE_LIST, RULE_AUTO, getRule, resolveRuleId } from '@/rules'

export default {
  data() {
    return {
      botSwitchLoading: false, // 这个作为一个局部状态理论上是不严谨的，但是考虑到是瞬间状态所以无所谓了
      ruleOptions: [{ id: RULE_AUTO, shortName: '自动' }].concat(
        RULE_LIST.map(rule => ({ id: rule.id, shortName: rule.shortName }))
      )
    }
  },
  computed: {
    ...mapState({
      groupID: state => state.conversation.currentConversation.groupProfile.groupID,
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile.groupID],
      myUserId: state => state.user.userID
    }),
    myCardRule() {
      const cards = (this.currentGame && this.currentGame.cards) || {}
      const card = cards['o' + this.myUserId]
      return card && card.rule
    },
    // 自动模式下，本机这个用户实际会用哪套规则
    effectiveRule() {
      return getRule(resolveRuleId({ groupRule: this.currentGame && this.currentGame.rule, cardRule: this.myCardRule }))
    },
    ruleTip() {
      if (this.currentGame && this.currentGame.rule === RULE_AUTO) {
        return `自动：按每个人自己的人物卡结算，你现在是 ${this.effectiveRule.shortName}（没有卡时按 COC 7 版）`
      }
      const rule = this.effectiveRule
      const command = rule.id === 'guimi-d20' ? '.rd20 侦查 15' : '.d% 聆听'
      return `已固定为 ${rule.shortName}：所有人按 ${rule.dice} 结算，指令形如 ${command}`
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
      this.broadcastRule(ruleId)
      this.$store.commit('showMessage', {
        type: 'success',
        message: `骰子规则已设为${this.ruleName(ruleId)}，并同步给群成员`
      })
    },
    // 切换后广播给群成员，否则每个人的浏览器里规则都不一样
    syncRule() {
      this.broadcastRule(this.currentGame && this.currentGame.rule)
      this.$store.commit('showMessage', { type: 'success', message: '已把当前骰子规则同步给群成员' })
    },
    broadcastRule(rule) {
      if (!this.tim || !this.TIM) return
      const message = this.tim.createCustomMessage({
        to: this.groupID,
        conversationType: this.TIM.TYPES.CONV_GROUP,
        priority: this.TIM.TYPES.MSG_PRIORITY_HIGH,
        payload: {
          data: JSON.stringify({ mtype: 'rule', mdata: { rule } }),
          description: `主持人把本团骰子规则设为「${this.ruleName(rule)}」`
        }
      })
      this.$store.commit('pushCurrentMessageList', message)
      this.tim.sendMessage(message).catch(e => {
        console.log('同步骰子规则失败', e)
      })
    },
    ruleName(ruleId) {
      return ruleId === RULE_AUTO ? '自动' : getRule(ruleId).shortName
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
  flex-wrap wrap

.rule-label
  font-size 12px
  color $secondary
  margin-right 8px

.rule-tip
  font-size 12px
  color $secondary
  margin-top 6px
  max-width 330px
  line-height 1.5
</style>
