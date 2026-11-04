# 跑团平台 · 诡秘 D20 定制版

基于开源项目 [paotuan](https://paotuan.github.io/) 二次开发的个人部署版，
构建产物可直接托管在 **GitHub Pages**。

---

## 这个版本加了什么

| 能力 | 说明 |
| --- | --- |
| **诡秘之主 D20 角色卡** | 8 属性（基础/序列增幅/最终值）、生命·理智·灵性·幸运池、三防、途径/序列/位格、46 项技能，等级补正自动换算 |
| **双规则并存** | COC 7 版与诡秘 D20 同时支持，导入人物卡时可选规则，两种卡可以混在同一个团里 |
| **骰娘按规则分流** | COC 走 `d100 ≤ 技能值`，诡秘走 `d20 + 属性 + 等级补正 ≥ 难度`；大成功/大失败看 d20 本身 |
| **群级规则开关** | 群资料 →「启用机器人」→ 骰子规则：`自动 / COC 7版 / 诡秘 D20`，切换后广播给群成员 |
| **依赖本地化** | vue / element-ui / vuex / xlsx / mathjs 等全部搬进 `public/vendor/`，不再依赖 cdnjs（国内不再白屏） |
| **自动部署** | `.github/workflows/main.yml` 用官方 Pages Actions，push 即发布 |

完整改动见 **[CHANGES.md](CHANGES.md)**，最初的代码分析见 [PROJECT-ANALYSIS.md](PROJECT-ANALYSIS.md)。

---

## 快速开始

```bash
npm ci                     # 首次
npm run serve              # http://localhost:8080
npm run test:rules         # 人物卡解析 + 骰娘结算 + 规则选择自检
npm run build              # 产物在 dist/
```

> Node 17+ 上构建需要 `NODE_OPTIONS=--openssl-legacy-provider`（webpack 4 的 md4 被 OpenSSL 3 禁了）。
> PowerShell：`$env:NODE_OPTIONS="--openssl-legacy-provider"`。

---

## 骰娘怎么用

群里发**小数点开头**的消息（也兼容 `.r` 前缀）：

| 规则 | 指令 | 例子 |
| --- | --- | --- |
| COC 7 版 | `.d% [困难/极难] 技能名` | `.d% 困难 侦查` → `≤ 35 成功` |
| 诡秘 D20 | `.rd20 技能名 [难度]` | `.rd20 攀爬 18` → `d20[15] + 6(力量) + 5(进阶) = 26 ≥ 18 成功` |
| 查规则 | `.规则` | 回报本团规则、你自己的人物卡、实际使用的结算规则 |

规则优先级：**群设置（固定时）> 说话人的人物卡 > 默认 COC 7 版**。
具体数值都在人物卡里算好，玩家不用记加值。

---

## 目录结构

```
src/
├── rules/                 规则抽象层（新增规则只需在这里登记）
│   ├── index.js           注册表 + 规则选择优先级
│   ├── sheet.js           xlsx 标签/合并区读取工具
│   ├── coc7/              COC 第七版：data / parser / resolver
│   └── guimi-d20/         诡秘之主 D20：data / parser / resolver
├── sdk/
│   ├── bot.js             骰娘（按规则分流结算）
│   └── card.js            人物卡兼容门面
├── components/            界面（导入弹窗、人物卡面板、规则开关…）
public/
├── vendor/                本地化的第三方库（含 element-ui 图标字体）
└── static/                人物卡模板 xlsx
scripts/verify-rules.js    解析 / 结算自检脚本
```

---

## 部署到 GitHub Pages

完整步骤（含验收清单、排错表）见 **[DEPLOY.md](DEPLOY.md)**，核心三步：

```bash
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

然后在仓库 **Settings → Pages → Source** 选 **GitHub Actions**，等 1–3 分钟即可访问
`https://<用户名>.github.io/<仓库名>/`。

---

## 已知限制

- **没有后端**：登录要用你自己的腾讯云 IM `SDKAppID / SecretKey`；骰娘是跑在每个玩家浏览器里的 bot 账号，页面关掉就没了
- **诡秘卡的池子是 Excel 公式**：必须用 Excel/WPS 保存过一次再导入，否则生命/防御会读成 0（导入时会提示）
- **对抗检定不自动结算**：按规则书比总值，交给 KP 判
- 规则书 PDF 不入库（版权归原作者），仓库里只有空白角色卡模板
- 原项目版权归 [paotuan](https://github.com/paotuan) 作者所有，本仓库仅作个人二次开发与部署

---

## 原项目说明

> [paotuan.github.io](https://paotuan.github.io/) 是一个文字网团平台，囊括多种实用功能，以优化你的跑团体验。
>
> 与其他跑团平台相比，本平台借助大厂的服务资源，实现零成本的运行部署，避免了用爱发电的不可持续性，
> 并使平台核心功能的稳定性有充分保障。
>
> 理念与技术架构决定了它不会做成社交平台、不会无谓扩大功能边界，而是专注于跑团过程本身，用完即走。
>
> - 高速稳定的即时通信系统
> - 支持多种规则的骰子机器人
> - 跑团 log 的记录、编辑与导出
> - 人物卡导入、查看与快速投骰
> - 设置 BGM、发布笔记等各类实用功能
>
> 使用手册与常见问题：<https://docs.qq.com/doc/DSW1TdXhhSmdpamRX>
