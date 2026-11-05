<template>
  <div class="group-member-list-wrapper">
    <div class="header">
      <span class="member-count text-ellipsis">群成员：{{members.length}}</span>
      <i class="el-icon-link" title="复制邀请链接" @click="inviteDialogShow = true" />
      <i class="el-icon-refresh" title="刷新群成员信息" @click="refreshGroupMember" />
      <!-- sdk 限制公开群不能邀请入群，只能申请加群 -->
<!--      <popover v-model="addGroupMemberVisible">-->
<!--        <add-group-member></add-group-member>-->
<!--        <div slot="reference" class="btn-add-member" title="添加群成员">-->
<!--          <span class="tim-icon-friend-add"></span>-->
<!--        </div>-->
<!--      </popover>-->
    </div>
    <div class="scroll-content">
      <div class="group-member-list">
        <div v-for="member in members" :key="member.userID">
<!--          <popover placement="right" :key="member.userID">-->
<!--            <group-member-info :member="member" />-->
            <div slot="reference" class="group-member">
              <div class="info">
                <avatar :title=getGroupMemberAvatarText(member.role) :src="member.avatar" />
                <div class="names">
                  <div class="member-name text-ellipsis">
                    {{ getShowUserNick(member) }}
                    <el-tag
                        v-if="isAdminKp(member)"
                        size="mini"
                        type="warning"
                        effect="plain"
                        class="kp-tag"
                    >主持人</el-tag>
                  </div>
                  <div class="member-id">{{ getShowUserId(member) }}</div>
                </div>
              </div>
              <div class="actions">
                <el-button
                    v-if="!member.userID.startsWith('bot')"
                    class="action-btn"
                    title="查看人物卡"
                    icon="el-icon-tickets"
                    size="mini"
                    circle
                    @click="openUserCard(member.userID)"
                />
                <el-dropdown v-if="canKp" trigger="click" @command="handleDropdownCommand">
                  <el-button class="action-btn" title="更多操作" icon="el-icon-more" size="mini" circle/>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item
                        v-if="!member.userID.startsWith('bot')"
                        icon="el-icon-circle-plus-outline"
                        :command="`ImportCard:${member.userID}`"
                    >
                      导入人物卡
                    </el-dropdown-item>
                    <el-dropdown-item
                        v-if="isBotOfThisGroup(member)"
                        icon="el-icon-picture-outline"
                        :command="`SetAvatar:${member.userID}`"
                    >
                      修改头像
                    </el-dropdown-item>
                    <el-dropdown-item
                        icon="el-icon-edit"
                        :command="`SetNick:${member.userID}`"
                    >
                      修改群名片
                    </el-dropdown-item>
                    <el-dropdown-item
                        v-if="isOwner && member.role !== 'Owner' && !member.userID.startsWith('bot')"
                        icon="el-icon-star-off"
                        :command="`${isAdminKp(member) ? 'UnsetKp' : 'SetKp'}:${member.userID}`"
                    >
                      {{ isAdminKp(member) ? '取消主持人' : '设为主持人' }}
                    </el-dropdown-item>
                    <el-dropdown-item
                        v-if="isOwner && member.role !== 'Owner'"
                        icon="el-icon-delete"
                        style="color: #F56C6C"
                        :command="`Kick:${member.userID}`"
                    >
                      踢出群聊
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>
            </div>
<!--          </popover>-->
        </div>
      </div>
    </div>
    <!-- 人物卡导入 -->
    <card-import
        v-if="canKp"
        :visible="!!importCardMemberID"
        :group-id="groupProfile.groupID"
        :member-id="importCardMemberID"
        @update:visible="importCardMemberID = null"
    />

    <el-dialog title="邀请入群" :visible.sync="inviteDialogShow" width="40%" append-to-body>
      <div class="invite-dialog">
        <div>
          <h3>分享给网页</h3>
          <el-button type="primary" @click="copyInviteLink">复制邀请链接</el-button>
          <div class="desc">复制后发给小伙伴，小伙伴点击链接在新窗口中打开，登录后即可自动进群</div>
        </div>
        <div>
          <h3>分享给小程序</h3>
          <img :src="minacode" />
          <img v-if="groupQRCode" :src="groupQRCode" />
          <div class="desc">①微信扫描左边二维码打开【跑团IO】小程序<br />②在小程序登录页面扫描右边二维码，自动填充信息<br />③输入自己的QQ后登录即可自动进群</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import QRCode from 'qrcode'
import { generateShareSig, setBotAvatar } from 'tim'
import CardImport from '../right-panels/widgets/card-import'
import minacode from '../../../assets/image/minacode.jpg'

export default {
  data() {
    return {
      addGroupMemberVisible: false,
      count: 30, // 显示的群成员数量

      inviteDialogShow: false, // 邀请面板
      minacode: minacode,
      groupQRCode: '', // 本地生成的进群二维码（含密钥，不能发给第三方生成）
      importCardMemberID: null, // 当前正在导入人物卡的成员
    }
  },
  props: ['groupProfile'],
  components: {
    CardImport,
  },
  computed: {
    ...mapState({
      currentConversation: state => state.conversation.currentConversation,
      currentMemberList: state => state.group.currentMemberList
    }),
    showLoadMore() {
      return this.members.length < this.groupProfile.memberCount
    },
    members() {
      return this.currentMemberList//.slice(0, this.count)
    },
    isOwner() {
      return this.groupProfile.selfInfo.role === this.TIM.TYPES.GRP_MBR_ROLE_OWNER
    },
    // 本团的额外主持人（root 指定的管理员）：userID => true
    currentGame() {
      return this.$store.state.game.list[this.groupProfile.groupID] || {}
    },
    adminKps() {
      return (this.currentGame && this.currentGame.kps) || {}
    },
    canKp() {
      return this.isOwner || !!this.adminKps[this.$store.state.user.userID]
    },
  },
  watch: {
    // 打开邀请面板时再生成二维码（异步）
    inviteDialogShow(visible) {
      if (visible) this.buildInviteQRCode()
    },
  },
  methods: {
    getGroupMemberAvatarText(role) {
      switch (role) {
        case 'Owner':
          return '群主'
        case 'Admin':
          return '管理员'
        default:
          return '群成员'
      }
    },
    getShowUserNick(member) {
      // 优先级：群名片、昵称、id
      return member.nameCard || member.nick || member.userID
    },
    getShowUserId(member) {
      if (member.userID.startsWith('bot')) {
        return '机器人'
      } else if (member.nameCard || member.nick) {
        return member.userID
      } else {
        return '' // 如果没有设置用户名和昵称，也不显示
      }
    },
    isBotOfThisGroup(member) {
      // if (!this.groupProfile) return false
      // 精确判断是自己群的机器人，以防万一其他机器人乱入
      return this.groupProfile.groupID.replace('@TGS#', 'bot_') === member.userID
    },
    // 小程序扫码用的 payload（与原来格式一致），二维码改为浏览器本地生成，
    // 不再把含密钥的 sig 发给第三方二维码服务
    buildInviteQRCode() {
      const data = `${generateShareSig()}/${this.groupProfile.groupID.replace('@TGS#', '')}`
      QRCode.toDataURL(data, { width: 220, margin: 1 })
        .then((url) => {
          this.groupQRCode = url
        })
        .catch((e) => {
          console.log('create qrcode error', e)
        })
    },
    // 邀请链接要带上部署子路径（如 GitHub Pages 的 /Tpaotuan/）：
    // 取当前地址去掉 # 之后的部分，再去掉末尾文件名，得到应用所在目录
    getInviteLink() {
      const base = location.href.split('#')[0].replace(/[^/]*$/, '')
      return `${base}#/?s=${generateShareSig()}&g=${this.groupProfile.groupID.replace('@TGS#', '')}&d=`
    },
    copyInviteLink() {
      this.$copyText(`${this.getInviteLink()}\n点击链接加入群聊一起玩~`)
        .then(() => {
          this.$store.commit('showMessage', {
            type: 'success',
            message: '邀请链接复制成功！快发给小伙伴们一起玩吧~'
          })
        })
        .catch((e) => {
          console.log('copy link error', e)
          this.$store.commit('showMessage', {
            type: 'error',
            message: '邀请链接复制失败'
          })
        })
    },
    refreshGroupMember() {
      // 群成员更新资料后不会自动同步，这里给个功能让玩家可以手动刷新
      this.$store.dispatch('getGroupMemberList', this.currentConversation.groupProfile.groupID)
        .then(() => {
          this.$store.commit('showMessage', {
            type: 'success',
            message: '刷新成功'
          })
        })
    },
    setBotAvatar(url) {
       setBotAvatar(this.currentConversation.groupProfile.groupID, url)
        .then(() => {
          this.$store.commit('showMessage', {
            message: '修改成功'
          })
        })
        .catch(error => {
          console.log(error)
          this.$store.commit('showMessage', {
            type: 'error',
            message: '修改头像失败，请检查是否启用机器人，未启用状态不能修改'
          })
        })
    },
    setGroupMemberNameCard(userID, value) {
      this.tim
        .setGroupMemberNameCard({
          groupID: this.currentConversation.groupProfile.groupID,
          userID: userID,
          nameCard: value
        })
        .then(() => {
          this.$store.commit('showMessage', {
            message: '修改成功'
          })
        })
        .catch(error => {
          this.$store.commit('showMessage', {
            type: 'error',
            message: error.message
          })
        })
    },
    kickoutGroupMember(userID) {
      this.tim
        .deleteGroupMember({
          groupID: this.currentConversation.groupProfile.groupID,
          reason: '被群主踢出',
          userIDList: [userID]
        })
        .then(() => {
          this.$store.commit('deleteGroupMemeber', userID)
        })
        .catch(error => {
          this.$store.commit('showMessage', {
            type: 'error',
            message: error.message
          })
        })
    },
    openUserCard(userId) {
      this.$store.dispatch('openUserCard', { groupId: this.currentConversation.groupProfile.groupID, userId })
          .catch(() => {
            this.$store.commit('showMessage', {
              type: 'warning',
              message: '该成员尚未导入人物卡'
            })
          })
    },
    // 该成员是不是被 root 加进来的主持人
    isAdminKp(member) {
      return !!(member && this.adminKps[member.userID])
    },
    // root 增删额外主持人：本地生效 + 广播给全群
    setKp(userID, enabled) {
      const kps = { ...this.adminKps }
      if (enabled) {
        kps[userID] = true
      } else {
        delete kps[userID]
      }
      this.$store.commit('setGameKps', { groupId: this.groupProfile.groupID, kps })
      this.broadcastKps(kps)
      const member = this.members.find(m => m.userID === userID)
      const name = member ? this.getShowUserNick(member) : userID
      this.$store.commit('showMessage', {
        type: 'success',
        message: enabled ? `${name} 已设为主持人（可发笔记/图片，不能踢人）` : `${name} 的主持人权限已取消`
      })
    },
    broadcastKps(kps) {
      if (!this.tim || !this.TIM) return
      const admins = Object.keys(kps)
      const message = this.tim.createCustomMessage({
        to: this.groupProfile.groupID,
        conversationType: this.TIM.TYPES.CONV_GROUP,
        priority: this.TIM.TYPES.MSG_PRIORITY_HIGH,
        payload: {
          data: JSON.stringify({ mtype: 'kps', mdata: { kps } }),
          description: admins.length
            ? `主持人调整了主持人名单：新增 ${admins.length} 位额外主持人`
            : '主持人清空了额外主持人名单'
        }
      })
      this.$store.commit('pushCurrentMessageList', message)
      this.tim.sendMessage(message).catch(e => {
        console.log('同步主持人名单失败', e)
      })
    },
    handleDropdownCommand(command) {
      const [action, userID] = command.split(':')
      switch (action) {
        case 'ImportCard':
          this.importCardMemberID = userID
          break
        case 'SetAvatar':
          this.$prompt('请输入头像 URL', '修改机器人头像', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPlaceholder: '头像 URL'
          }).then(({ value }) => {
            this.setBotAvatar(value)
          }).catch(() => {
            /* cancel */
          })
          break
        case 'SetNick':
          this.$prompt('请输入群名片', '修改群名片', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPlaceholder: '群名片'
          }).then(({ value }) => {
            this.setGroupMemberNameCard(userID, value)
          }).catch(() => {
            /* cancel */
          })
          break
        case 'SetKp':
          this.setKp(userID, true)
          break
        case 'UnsetKp':
          this.setKp(userID, false)
          break
        case 'Kick': {
          const member = this.members.find(member => member.userID === userID)
          this.$confirm(`将${this.getShowUserNick(member)}踢出群组？`, '踢出群聊', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            this.kickoutGroupMember(userID)
          }).catch(() => {
            /* cancel */
          })
          break
        }
      }
    }
  }
}
</script>

<style lang="stylus" scoped>
.group-member-list-wrapper
  .header
    height 50px
    padding 10px 16px 10px 20px
    border-bottom 1px solid $border-base
    .member-count
      display inline-block
      max-width 130px
      line-height 30px
      font-size 14px
      vertical-align bottom
    .btn-add-member
      width 30px
      height 30px
      font-size 28px
      text-align center
      line-height 32px
      cursor pointer
      float right
      &:hover
        color $light-primary
  .scroll-content
    /*max-height: 250px;*/
    /*overflow-y: scroll;*/
    padding 10px 15px 10px 15px
    width 100%
    .group-member-list
      /*display flex*/
      /*justify-content flex-start*/
      /*flex-wrap wrap*/
      width 100%
    .group-member
      height 70px
      display: flex;
      align-items center
      justify-content space-between
      color: $base;
      margin: 0 10px;
      .avatar
        width 40px
        height 40px
        border-radius 50%
        margin-right 20px
      .info
        display flex
      .names
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      .member-name
        font-size 14px
        width: 100px
        /*text-align center*/
      .member-id
        font-size 12px
        color $secondary
      .actions
        display flex
        align-items center
      .action-btn
        margin-left 10px
  .more
    padding 0 20px
    border-bottom 1px solid $border-base

.el-icon-link, .el-icon-refresh
  width 30px
  height 30px
  font-size 24px
  text-align center
  line-height 32px
  cursor pointer
  float right
  &:hover
    color $light-primary

// 一些视觉效果调整
.el-icon-refresh
  margin-right 10px
  font-size 22px
  margin-top -1px

.tim-icon-friend-add
  font-size 24px
  margin-right 20px

.invite-dialog
  display flex
  & > div
    width 50%
  h3
    margin-top 0
    margin-bottom 2em
  img
    width 50%
  .el-button
    width 80%
  .desc
    width 80%
    margin-top 1em

</style>
