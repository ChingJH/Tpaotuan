<template>
  <el-dialog title="🎲 骰娘设置" :visible="visible" width="56%" append-to-body @close="close">
    <div class="dice-settings">
      <el-alert
          type="info"
          :closable="false"
          show-icon
          title="这些设置按群保存，改完会同步给全群。群主和主持人都能改。"
      />

      <div class="section-title">功能开关</div>
      <div class="switch-row">
        <div class="switch-item">
          <el-switch v-model="form.allowManualBonus"/>
          <span>手动加值</span>
          <span class="tip">.gm格斗+2 / .gm格斗+2+3+4</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.allowAdvantage"/>
          <span>奖励投 / 惩罚投</span>
          <span class="tip">.gmb / .gmp / .gm 优势 / .gm 劣势</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.showBonusDetail"/>
          <span>显示加值明细</span>
          <span class="tip">关掉只显示总加值</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.critFlavor"/>
          <span>大成功 / 大失败文案</span>
          <span class="tip">20 / 1 时额外一句话</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.fuzzyMatch"/>
          <span>技能名模糊匹配</span>
          <span class="tip">输入「侦」也能命中「侦查」</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.allowAttrGen"/>
          <span>属性生成</span>
          <span class="tip">.诡秘 3 / .gm 3</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.scAutoApply"/>
          <span>理智自动扣卡</span>
          <span class="tip">.gmsc 结果写回人物卡</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="form.scWarn"/>
          <span>疯狂阈值警告</span>
          <span class="tip">半疯 / 真疯 / 失控</span>
        </div>
      </div>

      <div class="section-title">理智检定（.gmsc）</div>
      <div class="form-row">
        <div class="form-item">
          <div class="label">成功时扣</div>
          <el-input v-model="form.scSuccessLoss" size="small" placeholder="1"/>
        </div>
        <div class="form-item">
          <div class="label">失败时扣</div>
          <el-input v-model="form.scFailLoss" size="small" placeholder="1d2"/>
        </div>
        <div class="form-item">
          <div class="label">半疯阈值 ≤</div>
          <el-input-number v-model="form.halfMad" :min="0" :max="99" size="small" controls-position="right"/>
        </div>
        <div class="form-item">
          <div class="label">真疯阈值 ≤</div>
          <el-input-number v-model="form.trueMad" :min="0" :max="99" size="small" controls-position="right"/>
        </div>
      </div>

      <div class="section-title">回复文案</div>
      <div class="tip-block">
        可用占位符：<code>{nick}</code> 昵称、<code>{target}</code> 技能/属性、<code>{tag}</code> 手动/奖励投标签、
        <code>{nat}</code> d20 点数、<code>{bonus}</code> 加值明细、<code>{total}</code> 总数值、
        <code>{result}</code> 成功/失败、<code>{difficulty}</code> 难度
      </div>
      <div class="form-item wide">
        <div class="label">检定标题</div>
        <el-input v-model="form.tmplTitle" size="small" placeholder="<{nick}>对【{target}】进行检定：{tag}"/>
      </div>
      <div class="form-item wide">
        <div class="label">结果行</div>
        <el-input v-model="form.tmplLine" size="small" placeholder="d20({nat}) + {bonus} = {total}{result}"/>
      </div>
      <div class="form-item wide">
        <div class="label">大成功文案</div>
        <el-input v-model="form.tmplCritSuccess" size="small" placeholder="『大成功！』命运的眷顾降临于你。"/>
      </div>
      <div class="form-item wide">
        <div class="label">大失败文案</div>
        <el-input v-model="form.tmplCritFail" size="small" placeholder="『大失败！』命运对你露出了恶意的微笑。"/>
      </div>
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button size="small" @click="resetDefault">恢复默认</el-button>
      <el-button size="small" @click="close">取 消</el-button>
      <el-button size="small" type="primary" @click="save">保存并同步给全群</el-button>
    </span>
  </el-dialog>
</template>
<script>
import { mapState } from 'vuex'
import { normalizeDiceSettings, DEFAULT_DICE_SETTINGS } from '../../../../rules/guimi-d20/settings'

export default {
  props: ['visible'],
  data() {
    const groupID = this.$store.state.conversation.currentConversation.groupProfile.groupID
    const game = this.$store.state.game.list[groupID] || {}
    return {
      form: normalizeDiceSettings(game.diceSettings)
    }
  },
  computed: {
    ...mapState({
      groupProfile: state => state.conversation.currentConversation.groupProfile,
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile.groupID],
    })
  },
  watch: {
    visible(open) {
      // 每次打开都回读当前群里的设置，避免显示过期数据
      if (open) {
        this.form = normalizeDiceSettings(this.currentGame && this.currentGame.diceSettings)
      }
    }
  },
  methods: {
    save() {
      const settings = normalizeDiceSettings(this.form)
      this.$store.commit('setDiceSettings', { groupId: this.groupProfile.groupID, settings })
      this.broadcast(settings)
      this.$store.commit('showMessage', { type: 'success', message: '骰娘设置已保存，并同步给群成员' })
      this.close()
    },
    resetDefault() {
      this.form = { ...DEFAULT_DICE_SETTINGS }
    },
    close() {
      this.$emit('update:visible', false)
    },
    // 设置本身就靠这条高优先级消息同步（和骰子规则一个套路）
    broadcast(settings) {
      if (!this.tim || !this.TIM) return
      const message = this.tim.createCustomMessage({
        to: this.groupProfile.groupID,
        conversationType: this.TIM.TYPES.CONV_GROUP,
        priority: this.TIM.TYPES.MSG_PRIORITY_HIGH,
        payload: {
          data: JSON.stringify({ mtype: 'dice', mdata: { settings } }),
          description: '主持人更新了骰娘设置（文案/开关/理智阈值）'
        }
      })
      this.$store.commit('pushCurrentMessageList', message)
      this.tim.sendMessage(message).catch(e => {
        console.log('同步骰娘设置失败', e)
      })
    }
  }
}
</script>
<style lang="stylus" scoped>
.dice-settings
  max-height 60vh
  overflow-y auto
  padding-right 6px

.section-title
  margin 16px 0 8px
  font-weight 600
  font-size 14px
  color #303133

.switch-row
  display flex
  flex-wrap wrap

.switch-item
  width 50%
  display flex
  align-items center
  margin-bottom 10px
  font-size 13px

.switch-item span
  margin-left 8px

.tip
  color #909399
  font-size 12px

.form-row
  display flex
  flex-wrap wrap

.form-item
  width 25%
  margin-bottom 8px

.form-item.wide
  width 100%

.label
  font-size 12px
  color #606266
  margin-bottom 4px

.tip-block
  font-size 12px
  color #909399
  line-height 1.8
  margin-bottom 8px

.tip-block code
  background #f4f4f5
  padding 1px 4px
  border-radius 3px
</style>
