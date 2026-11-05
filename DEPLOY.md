# 上传到 GitHub Pages（从零到上线）

本项目是**纯前端**应用：没有后端、没有数据库、没有服务器。构建产物是一堆静态文件，
扔到 GitHub Pages 上就能用，访问者打开的是他自己浏览器里的应用。

本文按「照着做就能上线」的顺序写，每一步都给了**怎么确认这步成了**。

> 本仓库已经上线：<https://chingjh.github.io/Tpaotuan/>
> 以后更新只要 `git push`，CI 会自动构建发布（约 2-4 分钟）。

---

## 0. 先看一眼仓库现状

| 项目 | 值 |
| --- | --- |
| 跟踪文件 | 156 个，合计约 4.7 MB |
| 远端 | `https://github.com/ChingJH/Tpaotuan.git`（main 分支） |
| 站点 | `https://chingjh.github.io/Tpaotuan/` |
| 发布方式 | `.github/workflows/main.yml`，push 到 main 自动触发 |

---

## 1. 准备

1. **GitHub 账号**（免费账号的 Pages 要求仓库是 **public**）
2. **Node.js 18+**（CI 用 Node 20；本地用 18/20/24 都行）
3. **腾讯云 IM 应用的 SDKAppID / SecretKey**（这是登录用的，不是部署用的，见第 9 节）

---

## 2. 本地自检（强烈建议，30 秒）

```powershell
cd C:\Users\Admin\Downloads\T-paotuan
$env:PATH="C:\Program Files\nodejs;" + $env:PATH        # 若 node 不在 PATH
$env:NODE_OPTIONS="--openssl-legacy-provider"           # webpack 4 在 Node 17+ 必须

node node_modules\@vue\cli-service\bin\vue-cli-service.js build
node scripts\verify-rules.js
```

期望输出：

```
 DONE  Build complete. The dist directory is ready to be deployed.
 WARNING  Compiled with 1 warning          ← 只是「体积超过 244KB」，正常
✓ 全部通过                                   ← 人物卡解析 + 骰娘结算 + 规则选择断言
```

有 `npm` 的话直接用脚本也行：`npm run build`、`npm run test:rules`。

> 报 `ERR_OSSL_EVP_UNSUPPORTED` 就是少了 `NODE_OPTIONS` 那一行，CI 里已经设好了。

---

## 3. 建仓库并推上去

### 3.1 在网页上建仓库

打开 <https://github.com/new>：

- **Repository name**：随便取，例如 `paotuan`（会出现在网址里）
- **Public**（私有仓库的 Pages 需要付费账号）
- **不要**勾 "Add a README file"、".gitignore"、"license" —— 会让本地 push 冲突

### 3.2 推

```powershell
cd C:\Users\Admin\Downloads\T-paotuan
git remote add origin https://github.com/<你的用户名>/<仓库名>.git   # 只需一次
git push -u origin main
```

**确认这步成了**：刷新仓库页面，能看到 `src/`、`public/`、`.github/workflows/main.yml` 都在。

> 本网络直连 github.com 的 TLS 会被重置（git 报 `Recv failure: Connection was reset`），
> 但 Clash 代理在 7897 端口。已经给 git 配置了只对 github.com 走代理：
> `git config --global http.https://github.com.proxy http://127.0.0.1:7897`

---

## 4. 打开 Pages（只需一次）

**什么都不用选。** Settings → Pages 里的 "GitHub Pages Jekyll / Static HTML" 两张卡片是给
「仓库里没有任何 workflow」的人用的起步模板，点了反而会往仓库里塞一个多余的 `static.yml`，
把源码目录原样发到 Pages 上（首页 404 的元凶之一）。误加了的直接删掉那个文件即可。

本项目仓库自带发布流程 `.github/workflows/main.yml`，只要：

1. 仓库 → **Settings** → 左侧 **Pages**
2. **Build and deployment** → **Source** 选 **GitHub Actions**
3. push 之后 Actions 里会出现 `deploy-pages` 工作流，首次约 2-4 分钟
4. 跑完后站点地址：

```
https://<你的用户名>.github.io/<仓库名>/
```

> workflow 里 `configure-pages` 已配 `enablement: true`，Pages 忘了开时会自动开。
> 但**首次**如果它报 `Resource not accessible by integration`（Actions 的临时 token 无权创建站点），
> 就去 Settings → Pages 手动把 Source 选成 **GitHub Actions**，然后 Actions 里重跑。

---

## 5. 上线后逐项验收

打开站点，按顺序点一遍：

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | 直接打开站点 | 出现登录页，**不是白屏** |
| 2 | F12 → Console | 没有红色 404 报错 |
| 3 | F12 → Network 过滤 `vendor` | `vue.runtime.min.js`、`element-ui.index.js/css`、`vendor/fonts/element-icons.woff` 全是 200 |
| 4 | 看登录页的图标 | 齿轮、搜索、关闭这类图标是**正常图形**，不是空方框 |
| 5 | 登录（填 SDKAppID / SecretKey） | 进入会话列表 |
| 6 | 建群 → 群资料 →「启用机器人」 | 开关能开；下面出现 **骰子规则**：自动 / COC 7版 / 诡秘 D20 |
| 7 | 点「诡秘 D20」 | **只有它高亮**，提示变成「已固定为 诡秘 D20：所有人按 d20 结算」 |
| 8 | 群里发 `.规则` | 骰娘回「本团规则：固定 诡秘 D20；你的人物卡：…；实际按 诡秘 D20（d20）结算」 |
| 9 | 群里发 `.rd20 侦查 15`、`.rd20+6+2 侦查 15` | 前者按人物卡自动加值、后者用手写加值，都输出 `d20[n] + 加值 = 总值` 与成功/失败 |
| 10 | 打开右侧「重要笔记」 | 顶部有「我的笔记」输入框，加一条能存住，刷新后还在；下方才是主持人笔记 |
| 11 | 群主在群成员里点某人「…」→ 设为主持人 | 该成员名字旁出现「主持人」标签，并且他能看到「发布文字/图片笔记」，但看不到「踢出群聊」 |
| 12 | 群资料 → 我的卡 → 导入人物卡 | 弹窗顶部能选规则，「点击下载模板」能下到 xlsx |
| 13 | 导入诡秘卡 | 预览显示 途径/序列/生命/理智/灵性/幸运/三防/46 项技能 |
| 14 | 人物卡内页点技能数值 | 发出 `.rd20 技能 难度`，骰娘回 `d20[15] + 6(力量) + 5(进阶) = 26 ≥ 18 成功` |
| 15 | 导入一张 COC 卡 | 预览显示 体力/理智/幸运/魔法，点数值发 `.d% 聆听` |
| 16 | 用额外主持人账号试踢人 | 群里没有「踢出群聊」和「解散群组」入口（只有群主有） |
| 17 | 群里发 `.gm 格斗`、`.gm格斗+2`、`.gm格斗5`、`.gm驯兽/教育` | 都能出结果，`+2` 计入技能侧、`5` 当等级、`/教育` 改判属性并标注「改判」 |
| 18 | 群里发 `.gmb 侦查`、`.gmp 侦查` | 显示「奖励投 d1/d2→取高」「惩罚投 d1/d2→取低」 |
| 19 | 群里发 `.gmsc` | 出理智检定结果，理智值被写回人物卡（再发 `.gmsn` 能看到变小） |
| 20 | 群资料 → 主持人操作 →「骰娘设置」 | 能打开、能保存；把「显示加值明细」关掉后保存，再发 `.gm 格斗` 只剩总加值 |
| 21 | 用额外主持人账号打开「骰娘设置」并保存 | 同样能改，群里出现「主持人更新了骰娘设置」并生效 |
| 22 | 群里发 `.gm 20`、`.诡秘 2` | `20` 会回「一次最多生成 10 组（你写了 20 组）」，不再静默截断；输出首行标明「属性生成 ×N」 |

第 5 步之后需要腾讯云 IM 的密钥，只有你自己能验。

---

## 6. 以后怎么更新

```powershell
# 改完代码
npm run test:rules          # 先跑自检
git add -A
git commit -m "fix: 说明改了什么"
git push                    # 推到 main 就自动重新部署
```

- 部署状态在仓库 **Actions** → `deploy-pages`
- 想手动重发，Actions 里 `Run workflow`；想跳过某次自动部署，提交信息里带 `[skip ci]`
- 更新后浏览器可能还是旧页面：**Ctrl+F5** 强制刷新（Pages 前面有 CDN 缓存，通常几分钟内生效）

---

## 7. 哪些文件必须入库

| 路径 | 必须？ | 原因 |
| --- | --- | --- |
| `src/`、`vue.config.js`、`package*.json` | ✅ | 源码与依赖锁定 |
| `public/vendor/`（含 `fonts/`） | ✅ | 运行时依赖从本地加载，缺一个就白屏 / 图标变方框 |
| `public/static/*.xlsx` | ✅ | 人物卡模板下载与解析都用它 |
| `public/tim-js.js`、`libsig.min.js`、`BenzAMRRecorder.js` | ✅ | IM SDK / 签名 / BGM 录制 |
| `.github/workflows/main.yml` | ✅ | 自动部署 |
| `node_modules/` | ❌ 已忽略 | 只是本地编译用的，`npm ci` 重建；**访客访问站点用不到它** |
| `dist/` | ❌ 已忽略 | CI 里构建 |
| 规则书 PDF、原始卡表 `26年9月*.xlsx` | ❌ 已忽略 | 版权 + 体积，本地留用即可 |

---

## 8. 子路径、改仓库名、自定义域名

- **子路径没问题**：`vue.config.js` 里是 `publicPath: './'`，所有资源走相对路径，
  部署在 `/<仓库名>/` 下也能正常加载，**不需要改配置**。
- **改仓库名**：Settings → Rename 后，Pages 地址跟着变，旧地址会跳转（GitHub 会保留重定向一段时间）。
  代码里没有硬编码路径，不用改任何东西。
- **自定义域名**：Settings → Pages → Custom domain 填域名，会生成 `CNAME` 文件；
  到域名商加 CNAME 指向 `<用户名>.github.io`，再勾 **Enforce HTTPS**（证书要等几分钟）。

---

## 9. 关于登录与密钥（重要）

登录信息全部由使用者自己提供，项目里**不含任何密钥**：

- **方式一**：登录页填腾讯云 IM 的 `平台 ID`（SDKAppID）和 `Secret`
- **方式二**：邀请链接里带 `sig` 参数（appid/secret 的 base64）自动填充

因此：

- **绝对不要把 SecretKey 写进仓库**，也不要把带 `sig` 的邀请链接公开贴出去（等同于公开密钥）
- 每个团用**自己的**腾讯云 IM 应用，互不影响
- 别人打开你的站点只会看到登录页，没有密钥 / 邀请链接进不来
- 密钥只在浏览器里生成 userSig 用，不会上传到任何服务器（本项目没有后端）

---

## 10. 排错表

| 现象 | 原因 / 处理 |
| --- | --- |
| Pages 页面 404 | Pages 的 Source 没选 **GitHub Actions**；或 workflow 失败了，去 Actions 看日志；或误用了 Static HTML 模板（它发的是源码目录，没有 index.html） |
| 白屏，Console 报 `vendor/xxx.js 404` | `public/vendor/` 没提交进仓库（`.gitignore` 里不能有它） |
| 图标全是空方框 | `public/vendor/fonts/element-icons.*` 缺失；换 element-ui 版本时 `index.js` / `index.css` / `fonts/` 必须同版本 |
| 骰子规则单选点了全亮 / 一直是 d100 | 旧版本 bug（`el-radio-button` 必须用 `v-model`），已在 `e8b1112` 修复，确认部署的是最新提交 |
| 构建报 `ERR_OSSL_EVP_UNSUPPORTED` | workflow 已设 `NODE_OPTIONS=--openssl-legacy-provider`；本地手动构建也要设 |
| Actions 里 `npm ci` 失败，报 `404 Not Found - GET registry.npmjs.org/@xxx/...` | 锁文件里 scoped 包的 tarball 路径错了：从国内镜像迁到 npmjs 时文件名里的 scope 没去掉（正确格式 `…/@scope/name/-/name-x.y.z.tgz`）。`npm install` 会兜底所以本地没事，`npm ci` 是严格模式会 404 |
| 构建过了但 `configure-pages` 失败 | Pages 未开启且 Actions 的 token 无权创建（`Resource not accessible by integration`）：先去 Settings → Pages 把 Source 选成 **GitHub Actions**，再在 Actions 里重跑；workflow 里已加 `enablement: true` 兜底 |
| `git push` 报 `Connection was reset` | 本网络直连 github.com 的 TLS 被重置；给 git 配代理（本机 Clash：`git config --global http.https://github.com.proxy http://127.0.0.1:7897`） |
| push 要求密码 | 用 **Personal Access Token**（github.com/settings/tokens，勾 `repo`），不是账号密码 |
| 部署成功但页面还是旧的 | 浏览器缓存：Ctrl+F5；Pages 的 CDN 也有一两分钟延迟 |
| 私有仓库开不了 Pages | 免费账号只支持 public 仓库的 Pages |
| 仓库超过 1 GB / 单文件超过 100 MB | 当前不会：全仓 4.7 MB，最大文件 1.05 MB |
| 人物卡导入后数值是 0 | 诡秘模板的生命/防御是 Excel 公式，要用 Excel/WPS **保存一次**再导入（导入时会提示） |
| 骰娘不回话 | 要先在群资料里开「启用机器人」；骰娘是跑在**本机浏览器**里的 bot 账号，页面关掉就没了 |

---

## 11. 附：命令速查

```powershell
# 本地开发
npm run serve                                          # http://localhost:8080
node node_modules\@vue\cli-service\bin\vue-cli-service.js serve --port 8099

# 自检 + 构建
npm run test:rules
npm run build

# 发布
git push                                               # push 到 main 即自动部署
```

用 GitHub CLI 的话，建仓库 + 推一次搞定：

```powershell
gh repo create <仓库名> --public --source=. --remote=origin --push
```
