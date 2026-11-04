<template>
  <div>
    <el-dialog v-if="member" title="导入人物卡" :visible="visible" width="46%" append-to-body @close="onClose" @update:visible="$emit('update:visible', $event)">
      <!-- 规则选择：同一张卡槽可以放 COC7，也可以放诡秘 D20 -->
      <div class="rule-picker">
        <span class="rule-label">人物卡规则</span>
        <el-radio-group v-model="ruleId" size="small" @change="onRuleChange">
          <el-radio-button v-for="rule in rules" :key="rule.id" :label="rule.id">{{ rule.shortName }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="rule-tip">
        当前规则支持的模板：{{ rule.templateNote }}
        <el-link type="primary" :underline="false" :href="rule.template" :download="rule.templateFileName">点击下载模板</el-link>
      </div>

      <input ref="chooser" type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
             value="选择文件" @change="handleFile" />
      <h3>{{ `为玩家 ${member.nameCard || member.nick || member.userID} 导入人物卡` }}</h3>
      <el-alert v-if="existedCard" :title="`该玩家已有人物卡（${existedRuleName}），再次导入将覆盖之前的人物卡`" type="warning" show-icon :closable="false"/>
      <el-alert v-if="needRecalc" title="这张卡的公式结果为空：请用 Excel / WPS 打开并保存一次，让公式重新计算后再导入，否则资源池与防御值会显示为 0"
                type="warning" show-icon :closable="false" style="margin-top: 8px"/>

      <!-- 预览：不同规则展示不同区块 -->
      <div v-if="user" class="card-data">
        <h3>基本信息</h3>
        <div v-if="ruleId === 'coc7'">
          {{ `${user.basic.name} ${user.basic.gender} ${user.basic.age}岁 ${user.basic.job}` }}
        </div>
        <div v-else>
          {{ `${user.basic.name} ${user.basic.gender} ${user.basic.age}岁 ${user.basic.job}` }}
        </div>
        <div v-if="ruleId === 'coc7'">
          {{ `体力 ${user.basic.hp} | 理智 ${user.basic.san} | 幸运 ${user.basic.luck} | 魔法 ${user.basic.mp}` }}
        </div>
        <div v-else class="guimi-basic">
          <div>{{ `${user.basic.path || '无途径'} · 序列 ${user.basic.sequence || '无'} · ${user.basic.rank || '普通人'}` }}</div>
          <div>
            <span v-for="pool in user.pools" :key="pool.key" class="pool">{{ `${pool.label} ${formatNum(pool.cur)}/${formatNum(pool.max)}` }}</span>
          </div>
          <div>
            <span class="pool">{{ `物理防御 ${formatNum(user.defense.物理)}` }}</span>
            <span class="pool">{{ `意志防御 ${formatNum(user.defense.意志)}` }}</span>
            <span class="pool">{{ `体质防御 ${formatNum(user.defense.体质)}` }}</span>
            <span class="pool">{{ `神性补正 ${formatNum(user.basic.deityBonus)}` }}</span>
          </div>
        </div>

        <h3>属性</h3>
        <div class="user-prop">
          <div v-for="(val, name) in user.props" :key="name">
            {{ `${name}: ${formatNum(val)}` }}
          </div>
        </div>

        <h3>技能</h3>
        <div class="user-skill">
          <div v-for="(skill, name) in skillList" :key="name">
            {{ skill }}
          </div>
        </div>
      </div>
      <span slot="footer" v-if="user">
        <el-button type="primary" @click="onConfirm">确定导入</el-button>
      </span>
    </el-dialog>
  </div>
</template>
<script>
import { loadXlsx, parseCard, RULE_LIST, getRule } from '@/sdk/card'
import { mapState } from 'vuex'

export default {
  props: ['groupId', 'memberId', 'visible'],
  data() {
    const game = this.$store.state.game.list[this.groupId]
    const existed = game && game.cards ? game.cards['o' + this.memberId] : null
    return {
      user: null,
      // 默认跟随本团已选的骰子规则；没有就用该玩家旧卡的规则
      ruleId: (game && game.rule) || (existed && existed.rule) || 'coc7',
      rules: RULE_LIST
    }
  },
  computed: {
    ...mapState({
      existedCard: function(state) {
        return state.game.list[this.groupId] ? state.game.list[this.groupId].cards['o' + this.memberId] : null
      },
      currentMemberList: state => state.group.currentMemberList
    }),
    rule() {
      return getRule(this.ruleId)
    },
    existedRuleName() {
      return this.existedCard ? getRule(this.existedCard.rule).shortName : ''
    },
    // 诡秘卡的生命值/灵性值等都是公式算出来的：若缓存值为空（非 Excel 保存的文件），提示重存
    needRecalc() {
      if (!this.user || this.ruleId !== 'guimi-d20') return false
      const pools = this.user.pools || []
      const hasProp = Object.keys(this.user.props || {}).some(k => Number(this.user.props[k]) > 0)
      return hasProp && pools.every(pool => !pool.max)
    },
    member() {
      return this.memberId ? this.currentMemberList.find(member => member.userID === this.memberId) : null
    },
    skillList() {
      if (!this.user || !this.user.skills) return {}
      const list = {}
      if (this.ruleId === 'coc7') {
        Object.keys(this.user.skills).forEach(name => {
          list[name] = `${name}: ${this.formatNum(this.user.skills[name])}`
        })
        return list
      }
      // 诡秘 D20：技能值是「属性 + 等级补正」，用等级与总加值表达更直观
      Object.keys(this.user.skills).forEach(name => {
        const skill = this.user.skills[name]
        list[name] = `${name}: ${skill.level}(${skill.levelBonus}) → 检定加值 ${skill.value}`
      })
      return list
    }
  },
  methods: {
    formatNum(value) {
      const n = Number(value)
      if (isNaN(n)) return value
      return Math.round(n * 100) / 100
    },
    onRuleChange() {
      // 换规则后旧的预览结果作废，避免「以为换了规则其实还是旧卡」
      this.user = null
      if (this.$refs.chooser) this.$refs.chooser.value = ''
    },
    handleFile(e) {
      const files = e.target.files, f = files[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = (evt) => {
        // 异步加载 xlsx 库。其实都通过本地 vendor 了这里不异步加载问题也不大
        loadXlsx.then(() => {
          try {
            const data = new Uint8Array(evt.target.result)
            const workbook = window.XLSX.read(data, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const card = parseCard(sheet, this.ruleId)
            if (!card || !card.basic || !card.basic.name) {
              throw new Error('empty card')
            }
            this.user = card
          } catch (e) {
            console.log(e)
            this.user = null
            this.$store.commit('showMessage', {
              type: 'error',
              message: `导入失败，可能是格式不正确或选错了规则（当前为${this.rule.shortName}）`
            })
          }
        })
      }
      reader.readAsArrayBuffer(f)
    },
    onConfirm() {
      this.$store.commit('setUserCard', { groupId: this.groupId, userId: this.member.userID, card: this.user })
      // 记录本团使用的规则，骰娘与快捷投骰都按它来（COC 用 d100，诡秘 D20 用 d20）
      const cardRule = this.user.rule || 'coc7'
      const game = this.$store.state.game.list[this.groupId]
      const prevRule = game && game.rule
      this.$store.commit('setGameRule', { groupId: this.groupId, rule: cardRule })
      if (prevRule !== cardRule) {
        this.$store.commit('showMessage', {
          type: 'success',
          message: `已把本团骰子规则设为${this.rule.shortName}（${this.rule.dice}），可在群设置里修改`
        })
      }
      const message = this.tim.createCustomMessage({
        to: this.groupId,
        conversationType: this.TIM.TYPES.CONV_GROUP,
        priority: this.TIM.TYPES.MSG_PRIORITY_HIGH,
        payload: {
          data: JSON.stringify({ mtype: 'card', mdata: { userId: this.member.userID, card: this.user } }),
          description: `主持人为玩家“${this.member.nameCard || this.member.nick || this.member.userID}”导入了一张${this.rule.shortName}人物卡`,
        }
      })
      this.$store.commit('pushCurrentMessageList', message)
      this.tim.sendMessage(message).then(() => {
        this.$store.commit('showMessage', {
          type: 'success',
          message: '导入成功'
        })
      }).catch(() => {
        this.$store.commit('showMessage', {
          type: 'error',
          message: '导入成功，但同步给其他群成员失败，可以重试'
        })
      })
      this.$emit('update:visible', false)
    },
    onClose() {
      if (this.$refs.chooser) this.$refs.chooser.value = ''
      this.user = null
    }
  }
}
</script>
<style scoped>
.user-skill, .user-prop {
  display: grid;
  grid-template-columns: repeat(auto-fill, 190px);
}

.rule-picker {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.rule-label {
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
}

.rule-tip {
  font-size: 13px;
  color: #909399;
  margin-bottom: 14px;
}

.guimi-basic .pool {
  display: inline-block;
  margin-right: 16px;
}

::v-deep .el-link {
  vertical-align: unset;
}

.card-data {
  height: 34vh;
  overflow: auto;
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #e7e7e7;
  border-radius: 10px;
}
</style>
