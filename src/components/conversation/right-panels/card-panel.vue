<template>
  <div style="padding: 20px">
    <div class="simple-info">
      <div>{{ currentCard.basic.name }}</div>
      <div>{{ currentCard.basic.gender }}</div>
      <div>{{ `${currentCard.basic.age}岁` }}</div>
      <div>{{ currentCard.basic.job }}</div>
      <div v-if="isD20" class="rule-tag">{{ ruleName }}</div>
    </div>

    <!-- ==================== COC 第七版 ==================== -->
    <template v-if="!isD20">
      <div class="tips">点击下方对应的数值格子可以快速投骰；
        <br>点击属性名称可以复制；
        <br>点击表头可以将属性和技能按成功率排序；
        <br>可按中文或拼音首字母搜索。
      </div>
      <el-table :data="[currentCard.basic]" row-class-name="row" header-row-class-name="row" @cell-click="onBasicClick">
        <el-table-column prop="hp" label="体力"/>
        <el-table-column prop="san" label="理智"/>
        <el-table-column prop="luck" label="幸运"/>
        <el-table-column prop="mp" label="魔法"/>
      </el-table>
      <div class="section">
        <h4 class="section-title">基础属性</h4>
        <el-input v-model="searchProp" clearable prefix-icon="el-icon-search" size="mini" style="width: 150px" />
      </div>
      <el-table :data="filterProps()" stripe
                row-class-name="row" header-row-class-name="row" @cell-click="onCellClick">
        <el-table-column prop="name" label="属性"/>
        <el-table-column prop="value" sortable label="%"/>
        <el-table-column label="半值">
          <template slot-scope="scope">{{ Math.floor(scope.row.value / 2) }}</template>
        </el-table-column>
        <el-table-column label="1/5值">
          <template slot-scope="scope">{{ Math.floor(scope.row.value / 5) }}</template>
        </el-table-column>
      </el-table>
      <div class="section">
        <h4 class="section-title">技能表</h4>
        <el-input v-model="searchSkill" clearable prefix-icon="el-icon-search" size="mini" style="width: 150px" />
      </div>
      <el-table :data="filterSkills()" stripe
                row-class-name="row" header-row-class-name="row" @cell-click="onCellClick">
        <el-table-column type="selection" width="30" class-name="select-col"/>
        <el-table-column prop="name" label="属性" width="105"/>
        <el-table-column prop="value" sortable label="%"/>
        <el-table-column label="半值">
          <template slot-scope="scope">{{ Math.floor(scope.row.value / 2) }}</template>
        </el-table-column>
        <el-table-column label="1/5值">
          <template slot-scope="scope">{{ Math.floor(scope.row.value / 5) }}</template>
        </el-table-column>
      </el-table>
    </template>

    <!-- ==================== 诡秘之主 D20 ==================== -->
    <template v-else>
      <div class="guimi-meta">
        <span class="meta-item">{{ currentCard.basic.path || '无途径' }}</span>
        <span class="meta-item">序列 {{ currentCard.basic.sequence || '无' }}</span>
        <span class="meta-item">{{ currentCard.basic.rank || '普通人' }}</span>
        <span v-if="currentCard.basic.deityBonus" class="meta-item">神性补正 {{ currentCard.basic.deityBonus }}</span>
      </div>
      <div class="tips">检定 = d20 + 关联属性 + 技能等级补正，≥ 难度即成功；
        <br>点数值格子按当前难度投骰，难度留空则只报总数值；
        <br>点名称可以复制，点表头可以排序，支持中文与拼音首字母搜索。
      </div>
      <div class="section difficulty-row">
        <h4 class="section-title">检定难度</h4>
        <el-input-number v-model="difficulty" :min="1" :max="99" size="mini" controls-position="right" placeholder="KP给定" />
      </div>

      <el-table :data="currentCard.pools" row-class-name="row" header-row-class-name="row">
        <el-table-column prop="label" label="资源"/>
        <el-table-column label="当前 / 上限">
          <template slot-scope="scope">{{ `${formatNum(scope.row.cur)} / ${formatNum(scope.row.max)}` }}</template>
        </el-table-column>
      </el-table>
      <el-table :data="defenseRows" row-class-name="row" header-row-class-name="row">
        <el-table-column prop="label" label="防御"/>
        <el-table-column prop="value" label="数值"/>
      </el-table>

      <div class="section">
        <h4 class="section-title">属性</h4>
        <el-input v-model="searchProp" clearable prefix-icon="el-icon-search" size="mini" style="width: 150px" />
      </div>
      <el-table :data="filterProps()" stripe
                row-class-name="row" header-row-class-name="row" @cell-click="onD20Click">
        <el-table-column prop="name" label="属性"/>
        <el-table-column prop="value" sortable label="数值"/>
      </el-table>

      <div class="section">
        <h4 class="section-title">技能表</h4>
        <el-input v-model="searchSkill" clearable prefix-icon="el-icon-search" size="mini" style="width: 150px" />
      </div>
      <el-table :data="filterSkills()" stripe
                row-class-name="row" header-row-class-name="row" @cell-click="onD20Click">
        <el-table-column prop="attr" label="属性" width="80"/>
        <el-table-column prop="name" label="技能" width="120"/>
        <el-table-column prop="level" label="等级" width="80"/>
        <el-table-column prop="levelBonus" sortable label="补正" width="70"/>
        <el-table-column prop="value" sortable label="检定加值"/>
      </el-table>
    </template>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { getRule } from '@/sdk/card'

export default {
  props: ['member'],
  data() {
    return {
      searchProp: '',
      searchSkill: '',
      difficulty: undefined
    }
  },
  computed: {
    ...mapState({
      currentGame: state => state.game.list[state.conversation.currentConversation.groupProfile.groupID],
      currentCard: function () { return this.currentGame.cards['o' + this.member] }
    }),
    ruleId() {
      return (this.currentCard && this.currentCard.rule) || 'coc7'
    },
    isD20() {
      return this.ruleId === 'guimi-d20'
    },
    ruleName() {
      return getRule(this.ruleId).shortName
    },
    rule() {
      return getRule(this.ruleId)
    },
    defenseRows() {
      const defense = this.currentCard.defense || {}
      return Object.keys(defense).map(label => ({ label, value: defense[label] }))
    },
    props: function () {
      const dict = this.rule.props || {}
      return Object.keys(this.currentCard.props).map(name =>
          ({ name, value: this.currentCard.props[name], pinyin: dict[name] || '' }))
    },
    skills: function () {
      const dict = this.rule.skills || {}
      const list = Object.keys(this.currentCard.skills).map(name => {
        const skill = this.currentCard.skills[name]
        // COC 的技能值是数字；诡秘 D20 是对象（含等级、补正）
        if (typeof skill === 'number') {
          return { name, value: skill, pinyin: dict[name] || '' }
        }
        return {
          name,
          attr: skill.attr,
          level: skill.level,
          levelBonus: skill.levelBonus,
          value: skill.value,
          pinyin: dict[name] || ''
        }
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
    filterProps() {
      return this.searchProp === '' ? this.props :
          this.props.filter(prop => prop.name.includes(this.searchProp) || prop.pinyin.includes(this.searchProp.toLowerCase()))
    },
    filterSkills() {
      return this.searchSkill === '' ? this.skills :
          this.skills.filter(skill => skill.name.includes(this.searchSkill) || skill.pinyin.includes(this.searchSkill.toLowerCase()))
    },
    sendRoll(command) {
      // 复用隐藏的发送框，保证消息走同一套发送与 log 逻辑
      const ghost = document.getElementById('ghost-message-send-box')
      if (!ghost) return
      ghost.innerText = command
      ghost.click()
    },
    copy(text) {
      this.$copyText(text).then(() => {
        this.$store.commit('showMessage', { type: 'success', message: '复制成功' })
      })
    },
    // COC：点名称复制，点数值投骰（半值 / 1/5 值换算成困难 / 极难）
    onCellClick(row, col) {
      if (col.label === '属性') {
        this.copy(row.name)
        return
      }
      const hard = col.label === '半值' ? '困难' : (col.label === '1/5值' ? '极难' : '')
      this.sendRoll('.d% ' + hard + row.name)
    },
    onBasicClick(_, col) {
      if (col.label === '理智' || col.label === '幸运') {
        this.sendRoll('.d% ' + col.label)
      }
    },
    // 诡秘 D20：点名称/等级复制，点补正/加值按当前难度投骰
    onD20Click(row, col) {
      if (['属性', '技能', '等级'].indexOf(col.label) >= 0) {
        this.copy(row.name)
        return
      }
      const difficulty = this.difficulty ? ` ${this.difficulty}` : ''
      this.sendRoll(`.rd20 ${row.name}${difficulty}`)
    }
  }
}
</script>
<style lang="stylus" scoped>
.simple-info
  display flex
  //justify-content space-between
  margin-left 10px

  & > div
    font-size 14px
    color $base
    margin-right 20px

.rule-tag
  color $secondary
  font-size 12px

.guimi-meta
  margin 5px 0 0 10px
  font-size 13px
  color $secondary

  .meta-item
    margin-right 14px

.tips {
  margin 5px 0 10px 10px
  font-size 14px
  color $secondary
}

.difficulty-row
  display flex
  align-items flex-end
  justify-content space-between
  margin-bottom 8px

::v-deep .row {
  td, th {
    padding: 6px 0;
  }
}

.section
  display flex
  justify-content space-between
  align-items flex-end

.section-title
  margin-bottom 0

::v-deep .select-col .cell
  text-overflow unset
</style>
