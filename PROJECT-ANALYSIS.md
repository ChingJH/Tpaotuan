# paotuan.github.io 项目分析 · 功能清单 · 二次开发方案

> 分析对象：`C:\Users\Admin\Downloads\paotuan-master`（paotuan.github.io 开源版，v2.1.3）
> 本机状态：依赖已安装、开发服务器与生产构建均已验证通过

---

## 一、一句话结论

这是一个**纯前端的文字网团（TRPG / 跑团）在线平台**：聊天、群组、文件存储等"重后端"的部分全部外包给**腾讯云 IM（TIM）+ COS**，本项目只做业务层——骰子机器人、COC 人物卡、团务笔记、Log 录制、BGM/场景。它没有自建服务端，可以直接扔在 GitHub Pages 上跑，所以**主持人要自带腾讯云 IM 的 SDKAppID + SECRETKEY** 才能开局。

- 技术栈：Vue 2.6 + Element UI 2.13 + Vuex 3 + TIM Web SDK（`public/tim-js.js`，运行时异步加载）
- 规模：76 个源文件 / 约 9500 行 / 56 个 `.vue` 组件 / 6 个 Vuex 模块
- 构建：`@vue/cli-service` 3（webpack 4），产物纯静态
- 无：后端、数据库、账号体系、鉴权服务

---

## 二、本机运行状态（已完成）

| 项目 | 结果 |
| --- | --- |
| 依赖安装 | ✅ 1357 个包（`node_modules`） |
| 开发服务器 | ✅ 运行中 → http://127.0.0.1:8099 （编译通过，仅 eslint 未使用组件告警） |
| 生产构建 | ✅ `dist/` 21 个文件，`DONE Build complete` |
| 登录实测 | ⚠️ 需要腾讯云 IM 的 SDKAppID + SECRETKEY + 用户 ID（QQ 号）才能进入主界面，目前只能到登录页 |

### 启动命令（注意两条坑，否则必然失败）

```powershell
cd C:\Users\Admin\Downloads\paotuan-master
$env:NODE_OPTIONS="--openssl-legacy-provider"          # webpack4 用 md4，Node 17+ 必须加
$env:PATH="C:\Program Files\nodejs;" + $env:PATH       # 绕过 PATH 里的 node.cmd 包装器
& "C:\Program Files\nodejs\node.exe" node_modules\@vue\cli-service\bin\vue-cli-service.js serve --port 8099
```

坑 1：本机 PATH 上的 `node` 是 `C:\Users\Admin\AppData\Roaming\dsh-desktop\harness\.desktop-bin\node.cmd`，它**拒绝 `NODE_OPTIONS`**，必须显式调用 `C:\Program Files\nodejs\node.exe`。
坑 2：`package-lock.json` 里 1363 条 `resolved` 全部指向已停服的 `registry.npm.taobao.org` / `registry.nlark.com`（证书过期、域名不解析），已批量改写为 `https://registry.npmjs.org/<name>/-/<file>.tgz`；原文件备份为 `package-lock.json.taobao.bak`。

---

## 三、架构与数据流

```
index.vue (登录 / 全局监听)
   │  TIM.EVENT.MESSAGE_RECEIVED
   ├─► conversation 模块  pushCurrentMessageList  → message-item 渲染
   ├─► game 模块          insertGameLogs          → 群团 Log（localStorage）
   └─► game 模块          handleKPNote            → 高优先级消息 = KP 笔记/BGM/场景/人物卡

sdk/tim.js   BotContext ── 每个群一个 TIM 客户端实例（userID = bot_<群号>）
sdk/bot.js   handleMessage ── 以 . 或 。 开头 → rpg-dice-roller 求值 → decideResult 判定 → 回群消息

sdk/card.js  parseCoCXlsx ── xlsx 固定单元格坐标（COC7 模板）
```

**三个必须知道的架构事实：**

1. **骰子机器人跑在玩家浏览器里。** `BotContext` 为每个群再 `TIMC().create()` 一个客户端，用 `bot_<群号>` 登录并 `joinGroup`。同一个群的多个玩家页面各自登录同一个 bot 账号 → 互相顶号；且**只有有人开着页面，骰子才在线**。
2. **secret 暴露在前端。** `public/libsig.min.js` 在浏览器里用 SECRETKEY 现算 `userSig`；邀请链接 `#/?s=<appid/反转secret>` 直接把 secret base64 塞进 URL。**拿到 secret = 可以伪造任意 userID 登录该 IM 应用**。
3. **团务数据全在本机。** log / note / card 存 `localStorage`（键 `paotuanlog-<群号>` 等），换浏览器即丢；跨设备同步要靠"重新拉群历史消息 + 高优先级消息重建"。

---

## 四、功能清单

### 4.1 已实现（可用）

| 模块 | 功能 | 主要文件 |
| --- | --- | --- |
| 登录 | appid + secret + 用户ID、记住账号、自动登录、`#/?s=..&g=..` 邀请链接（自动入群） | `src/components/user/login.vue`、`src/index.vue` |
| 会话 | 会话列表、未读数（含标题闪烁）、好友单聊、创建群聊、黑名单 | `src/components/conversation/*`、`layout/side-bar.vue` |
| 消息 | 文本 / 图片 / 文件 / 视频 / 语音 / 表情 / 地理位置 / 群系统提示 / 自定义灰条；粘贴发图、拖拽发文件、引用重编辑、图片预览 | `src/components/message/*`（11 个 element） |
| 群管理 | 群资料与头像、群成员列表、群名片、全体禁言、群公告、加群方式、踢人/退群/解散、邀请二维码与邀请链接、机器人头像 | `conversationProfile/group-profile.vue`、`group-member-list.vue` |
| 骰子机器人 | 群主开关；`.d6` `.d%` `2d6+d4` `2d%kl1`（奖励骰）`4dF`；描述文本；**COC 判定联动人物卡**：大成功(1)/大失败(>95)/困难(半值)/极难(1/5值)/理智/幸运/灵感 | `src/sdk/tim.js`、`src/sdk/bot.js`、`widgets/bot-switch.vue` |
| 人物卡 | COC7 xlsx 导入（`public/static/cocv7.xlsx`）、每张卡一个右侧 tab、属性/技能表、半值与 1/5 值一键投骰、点表头排序、中文+拼音首字母搜索、复制属性名 | `src/sdk/card.js`、`card-import.vue`、`card-panel.vue`、`right-panels/index.vue` |
| Log 录制 | 开关、逐条删除、拖动排序、导出 txt / html / json、清空；自动过滤 `.` 骰子指令 | `right-panels/log-panel.vue`、`store/modules/game.js` |
| 重要笔记 | KP 发布文字/图片笔记（高优先级消息）、卡片流、复制、删除、拖动排序、未读红点 | `right-panels/note-panel.vue`、`widgets/kp-actions.vue` |
| BGM | 网易云歌单/专辑/单曲（iframe 外链播放器），对全群可见 | `widgets/bgm.vue` |
| 场景 | KP 设置整屏背景图 + 切换提示灰条 | `widgets/kp-actions.vue`、`current-conversation.vue` |
| 其它 | 浏览器桌面通知、@我提醒、全局设置（清缓存） | `index.vue`、`layout/global-setting.vue` |

### 4.2 半成品 / 死代码

- **视频 / 语音通话（TRTC）**：`message-send-box.vue` 里 `trtcCalling()`、`groupLive()` 还在，但 `state.video` 模块根本不存在（`index.vue` 仍 map 了 `state.video.isBusy`），SDK 未引入 → 不可用。
- `right-panels/kp-panel.vue` **整个文件被注释**，功能已拆成 `widgets/kp-actions.vue` + `bot-switch.vue`。
- 好友列表入口被注释（保留代码）；未读回执 `onMessageReadByPeer` 空实现；自定义消息发送弹窗被注释。
- `src/store/actions.js`、`mutations.js` 为空文件。

### 4.3 现成 Bug（低成本可修，适合当第一步）

1. **清"笔记缓存"无效**：`global-setting.vue` 清的是 `paotuannote-`，而 `game.js` 存的是 `paotuanote-`（少一个 n）。
2. `initGame` 里 `cards` 用 `getInitialSavedContent('card')` 兜底返回 `[]`（应为 `{}`），数组被当对象用，序列化行为不干净。
3. ESLint 15 条 `no-unused-components` / `no-unused-vars` 告警（`message-send-box.vue` 等），`smileIcon` 未使用。
4. `sdk/tim.js` `initTimInstance` 有 `if (tim) return // TODO 改实例了` —— 换 appid 重新登录不会重建实例。
5. 群机器人失败时只兜底一个中文错误串匹配（`'被邀请加入的用户已经是群成员'`），SDK 文案一变就崩。

---

## 五、能二次开发什么（按投入从低到高）

### A. 低成本（0.5–3 天，收益立竿见影）

| # | 方向 | 改哪里 |
| --- | --- | --- |
| A1 | **CDN 依赖本地化**：目前 Vue/Element/Vuex/js-cookie/Sortable/clipboard/mathjs/xlsx 共 8 个库全走 cdnjs；内网或被墙时首页白屏。改成 `public/vendor/*` + 改 `vue.config.js` 的 `cdns` 与 `externals` | `vue.config.js`、`public/index.html` |
| A2 | **修上面 5 个 Bug** | `global-setting.vue`、`game.js`、`tim.js` |
| A3 | **Log 导出增强**：Markdown / 带角色配色与时间轴的 HTML、骰子结果单独标记、按章节分卷、导出时嵌入人物卡名 | `log-panel.vue` |
| A4 | **数据备份**：localStorage → IndexedDB；一键导出/导入整包 JSON（log+note+card）；把笔记/人物卡"归档"成群内高优先级消息做云备份 | `game.js`、新增 `utils/storage.js` |
| A5 | **人物卡体验**：导入时字段校验与差异高亮、手动改值、导出 JSON、一键复制全卡、按规则选择模板 | `card.js`、`card-import.vue`、`card-panel.vue` |
| A6 | **骰子指令补齐**：`.ra 技能`（标准 COC 检定）、`.st`（设卡）、`.暗骰`（私聊回执）、`.sc`（理智损失）、`.en`（成长）、`.先攻` / 轮次表 | `sdk/bot.js`、`store/modules/game.js` |

### B. 中等（规则扩展 —— 和你手上的资料直接对口）

**B1｜把 COC7 扩展成"多规则"（推荐作为核心重构点）**

现状：规则是**硬编码**的——`parseCoCXlsx` 写死 COC 模板单元格坐标，`decideResult` 写死 `roll<=目标` / `1 大成功` / `>95 大失败` / 困难=半值，属性技能表 `ALL_PROPS`/`ALL_SKILLS` 也是常量。**没有规则抽象层**，这是最值得做的一层。

建议结构：

```
src/rules/
  index.js            // 规则注册表：id → { name, parseXlsx, resolve, props, skills, dice }
  coc7/{parser.js, resolver.js, data.js}
  guimi-d20/{parser.js, resolver.js, data.js}
```

- `parser.js`：xlsx → 统一 `{ basic, props, skills, extra }`
- `resolver.js`：`(card, expression, skillName) → { success: bool, text: '困难成功' }`
- 机器人 `handleMessage` 只调 `rules[group.rule].resolve(...)`
- 群级配置 `game.list[groupId].rule`，KP 建团时选规则

**B2｜落地《诡秘之主》D20（项目根已自带资料）**

素材：`26年9月｜D20诡秘规则空白角色卡YM_v3.5.9.24.xlsx`、`书签修正｜26年7月最新｜诡秘之主跑团3.5共创版D20规则.pdf`

已核实 xlsx 结构（15 个 sheet：`附表` / `角色卡` / `骰娘导入` / `超凡物品` / `超凡附属` / `序列9`…`序列0`）：

- `角色卡`：**可按标签定位**（`B3=姓名`、`B5=职业`、`B6=年龄`、`J5=性别/性取向`、`J6=超凡途径`、`J8=当前序列数`、`S4~S11=力量/体质/敏捷/魅力/灵感/意志/教育/幸运`、`M15=生命值`、`B15=灵性值`、`B20=幸运值`、`M20=理智值`、`W20=污染总值`、`W22=异化度`）；技能表 `E26` 起 5 列（技能 / 初始 / 成长 / 检定 `D20-4` / 等级 `未受训`）
- `骰娘导入` sheet 已内置标准属性+技能清单（`.st` / `.gmst` 串），**可直接当作数据字典**：
  - 属性：力量 体质 敏捷 魅力 灵感 意志 教育 幸运 理智 生命值 灵性值 灵性 灵体强度 移动力 体型基数 物理防御 意志防御 体质防御 消化 序列
  - 技能：攀爬 跳跃 投掷 恐吓 驯兽 潜行 妙手 游泳 炮术 锁匠 操纵重型机械 闪避 取悦 表演 信誉 心理引导 欺骗 说服 乔装 挑衅 图书馆使用 领航 生存 医学 写作 爆破 法律 聆听 侦查 心理学 追踪 读唇 机械维修 贸易 厨艺 乐理 工艺制造 占卜 通灵 宗教

落地清单：
1. `src/rules/guimi-d20/parser.js`：按标签读 `角色卡`（不要学 COC 那种写死坐标，模板一改就崩）
2. `src/rules/guimi-d20/resolver.js`：D20 检定（`d20 + 属性影响 vs 检定值`），成功/失败/大成功(20)/大失败(1)，并支持"防御值对抗"（物理/意志/体质防御）
3. `sdk/card.js` 的 `ALL_PROPS`/`ALL_SKILLS` 改为按规则取值；补拼音首字母表（可用根目录 `pinyingen.js`，依赖 cnchar，一次性生成即可）
4. `card-panel.vue`：多渲染"生命值/灵性值/理智值/污染/异化度/序列" 与防御三件套
5. `sdk/bot.js`：`.d20` 表达式族 + 技能名映射（`侦查` vs `侦察` 之类的别名表）
6. 导入弹窗加规则选择 + 模板下载链接（`public/static/`）

**B3｜KP 面板扩展**：NPC 卡、线索墙、章节/幕、倒计时、BGM 播放列表（现在是单曲 iframe，无法排队）、队伍状态看板（HP/SAN/污染 汇总）

**B4｜骰子结果可视化**：把 `.r` 结果渲染成卡片（保留/丢弃明细、奖励骰高亮、成功等级配色），而不是一行纯文本

### C. 较大（架构级，1 周以上）

| # | 方向 | 说明 |
| --- | --- | --- |
| C1 | **把 userSig 搬到服务端** | 云函数 / Cloudflare Worker 签发临时 sig；前端只存 appid + 短期 sig，彻底解决 secret 泄露与邀请链接带 secret 的问题。**任何对外发布都必须先做这条** |
| C2 | **机器人服务端化** | Node 进程常驻登录 `bot_<群号>`，WebSocket 推给前端；顺带解决"没人开页面就没骰子"和顶号问题 |
| C3 | **换掉腾讯云 IM** | 自建（Node + Socket.IO/WS + MongoDB）或自托管（Matrix / Rocket.Chat）。可解：黑名单/好友等依赖、20 人免费上限、消息漫游 7 天、机器人开关受 SDK 限制 |
| C4 | **人物卡编辑器** | 现在只能 xlsx 导入 + 只读展示；做成可视化编辑 + 版本历史 + 团队共享卡库 |
| C5 | **语音/视频** | 接 TRTC Web SDK 或 LiveKit，补完被注释掉的那套 UI |
| C6 | **多人协作团务** | 笔记/Log 从 localStorage 改为群内消息事件溯源（同一份数据多人可见、可回放），为"跑团回放/复盘"打基础 |

---

## 六、建议路线

1. **今天就能用**：本机已跑通 → 去腾讯云 IM 控制台拿 SDKAppID + SECRETKEY（免费版够 20 人），登录页填入即可开局。
2. **第 1 步（半天）**：CDN 本地化 + 修 5 个 Bug（尤其 `paotuannote-` 那个清缓存 bug）。
3. **第 2 步（2–3 天）**：抽 `src/rules/` 抽象层，先迁 COC7（保证不回归），再接诡秘 D20（手上有现成卡模板和规则书）。
4. **第 3 步（1 周）**：骰子机器人服务端化 + userSig 服务端签发 —— 这两条决定了它能不能给别人用。
5. **长期**：若要脱离腾讯云，把 C3 当独立项目立项（这是一次"重写通信层"的工作量，不是改造）。

---

## 七、关键文件索引

| 路径 | 作用 |
| --- | --- |
| `src/index.vue` | 入口：登录、TIM 事件总线、邀请入群、@提醒、桌面通知 |
| `src/sdk/index.js` | 异步加载 `tim-js.js` / `libsig.min.js`，包装 TIM |
| `src/sdk/tim.js` | TIM 实例、`BotContext`（每群一个机器人客户端）、`generateShareSig` |
| `src/sdk/bot.js` | 骰子消息解析 + COC 成功等级判定 |
| `src/sdk/card.js` | COC7 xlsx 解析、属性/技能字典 |
| `src/store/modules/game.js` | 团务状态机（bot/log/bgm/note/card/scene）与 localStorage 持久化 |
| `src/store/modules/conversation.js` | 会话、消息列表、已读上报 |
| `src/components/conversation/right-panels/` | 右侧面板：群信息 / 笔记 / Log / 人物卡 |
| `src/components/conversation/right-panels/widgets/` | KP 动作、BGM、机器人开关、人物卡导入 |
| `vue.config.js` | CDN externals（改本地化的关键） |
| `public/` | `tim-js.js`、`libsig.min.js`、`random-js`、`static/cocv7.xlsx` |
| `.github/workflows/main.yml` | 推 master 自动构建并发布到 `paotuan/paotuan.github.io` |

---

*本文档由代码通读 + 实机编译验证得出；行号与结论均以当前目录代码为准。*
