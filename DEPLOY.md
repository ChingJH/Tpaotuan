# 涓婁紶鍒?GitHub Pages锛堜粠闆跺埌涓婄嚎锛?
鏈」鐩槸**绾墠绔?*搴旂敤锛氭病鏈夊悗绔€佹病鏈夋暟鎹簱銆佹病鏈夋湇鍔″櫒銆傛瀯寤轰骇鐗╂槸涓€鍫嗛潤鎬佹枃浠讹紝
鎵斿埌 GitHub Pages 涓婂氨鑳界敤锛岃闂€呮墦寮€鐨勬槸浠栬嚜宸辨祻瑙堝櫒閲岀殑搴旂敤銆?
鏈枃鎸夈€岀収鐫€鍋氬氨鑳戒笂绾裤€嶇殑椤哄簭鍐欙紝姣忎竴姝ラ兘缁欎簡**鎬庝箞纭杩欐鎴愪簡**銆?
---

## 0. 鍏堢湅涓€鐪间粨搴撶幇鐘?
| 椤圭洰 | 鍊?|
| --- | --- |
| 璺熻釜鏂囦欢 | 156 涓紝鍚堣绾?4.7 MB |
| 鏈湴鎻愪氦 | 4 涓紙`main` 鍒嗘敮锛屽伐浣滃尯骞插噣锛?|
| 鏈€澶ф枃浠?| `public/BenzAMRRecorder.js` 1.05 MB锛圔GM 褰曞埗锛?|
| 杩滅 | **杩樻病鏈?*锛岀涓€娆?push 鏃惰 `git remote add` |

涓嶉渶瑕佸啀 `git init`銆佷笉闇€瑕佸啀寤洪娆℃彁浜わ紝浠撳簱宸茬粡鍑嗗濂戒簡銆?
---

## 1. 鍑嗗

1. **GitHub 璐﹀彿**锛堝厤璐硅处鍙风殑 Pages 瑕佹眰浠撳簱鏄?**public**锛?2. **Node.js 18+**锛圕I 鐢?Node 20锛涙湰鍦扮敤 18/20/24 閮借锛?3. **鑵捐浜?IM 搴旂敤鐨?SDKAppID / SecretKey**锛堣繖鏄櫥褰曠敤鐨勶紝涓嶆槸閮ㄧ讲鐢ㄧ殑锛岃绗?9 鑺傦級

---

## 2. 鏈湴鑷锛堝己鐑堝缓璁紝30 绉掞級

```powershell
cd C:\Users\Admin\Downloads\paotuan-master
$env:PATH="C:\Program Files\nodejs;" + $env:PATH        # 鑻?node 涓嶅湪 PATH
$env:NODE_OPTIONS="--openssl-legacy-provider"           # webpack 4 鍦?Node 17+ 蹇呴』

node node_modules\@vue\cli-service\bin\vue-cli-service.js build
node scripts\verify-rules.js
```

鏈熸湜杈撳嚭锛?
```
 DONE  Build complete. The dist directory is ready to be deployed.
 WARNING  Compiled with 1 warning          鈫?鍙槸銆屼綋绉秴杩?244KB銆嶏紝姝ｅ父
鉁?鍏ㄩ儴閫氳繃                                   鈫?浜虹墿鍗¤В鏋?+ 楠板缁撶畻 + 瑙勫垯閫夋嫨鏂█
```

鏈?`npm` 鐨勮瘽鐩存帴鐢ㄨ剼鏈篃琛岋細`npm run build`銆乣npm run test:rules`銆?
> 鎶?`ERR_OSSL_EVP_UNSUPPORTED` 灏辨槸灏戜簡 `NODE_OPTIONS` 閭ｄ竴琛岋紝CI 閲屽凡缁忚濂戒簡銆?
---

## 3. 寤轰粨搴撳苟鎺ㄤ笂鍘?
### 3.1 鍦ㄧ綉椤典笂寤轰粨搴?
鎵撳紑 <https://github.com/new>锛?
- **Repository name**锛氶殢渚垮彇锛屼緥濡?`paotuan`锛堜細鍑虹幇鍦ㄧ綉鍧€閲岋級
- **Public**锛堢鏈変粨搴撶殑 Pages 闇€瑕佷粯璐硅处鍙凤級
- **涓嶈**鍕?"Add a README file"銆?.gitignore"銆?license" 鈥斺€?浼氳鏈湴 push 鍐茬獊

### 3.2 鎺?
```powershell
cd C:\Users\Admin\Downloads\paotuan-master
git remote add origin https://github.com/<浣犵殑鐢ㄦ埛鍚?/<浠撳簱鍚?.git
git push -u origin main
```

> 鐢?SSH 鐨勮瘽鍦板潃鎹㈡垚 `git@github.com:<鐢ㄦ埛鍚?/<浠撳簱鍚?.git`銆?> 濡傛灉鎻愮ず `remote origin already exists`锛屽厛鐢?`git remote set-url origin <鏂板湴鍧€>`銆?
**纭杩欐鎴愪簡**锛氬埛鏂颁粨搴撻〉闈紝鑳界湅鍒?156 涓枃浠躲€乣src/`銆乣public/`銆乣.github/workflows/main.yml` 閮藉湪銆?
---

## 4. 鎵撳紑 Pages锛堝彧闇€涓€娆★級

1. 浠撳簱 鈫?**Settings** 鈫?宸︿晶 **Pages**
2. **Build and deployment** 鈫?**Source** 閫?**GitHub Actions**
   锛堚殸锔?涓嶈閫?"Deploy from a branch"锛屾湰椤圭洰璧扮殑鏄?Actions 鏋勫缓锛?3. 鎵撳紑 **Actions** 鏍囩锛屼細鐪嬪埌 `deploy-pages` 鍦ㄨ窇锛岄娆＄害 1鈥? 鍒嗛挓
4. 璺戝畬鍚?Pages 椤甸潰椤堕儴浼氭樉绀虹珯鐐瑰湴鍧€锛?
```
https://<浣犵殑鐢ㄦ埛鍚?.github.io/<浠撳簱鍚?/
```

**纭杩欐鎴愪簡**锛欰ctions 閲?`build` 鍜?`deploy` 涓や釜 job 閮芥槸缁胯壊 鉁擄紱
Pages 椤甸潰鏄剧ず "Your site is live at ..."銆?
> 鍒氶儴缃插畬鍙兘鏈変竴涓ゅ垎閽?404锛岀瓑涓€浼氬効鍐嶅埛鏂般€?> 浠撳簱鍚嶅彨 `<鐢ㄦ埛鍚?.github.io` 鏃讹紝绔欑偣鐩存帴鏄?`https://<鐢ㄦ埛鍚?.github.io/`锛屽悓鏍疯兘work锛堣祫婧愰兘鏄浉瀵硅矾寰勶級銆?
---

## 5. 涓婄嚎鍚庨€愰」楠屾敹

鎵撳紑绔欑偣锛屾寜椤哄簭鐐逛竴閬嶏細

| # | 鎿嶄綔 | 鏈熸湜 |
| --- | --- | --- |
| 1 | 鐩存帴鎵撳紑绔欑偣 | 鍑虹幇鐧诲綍椤碉紝**涓嶆槸鐧藉睆** |
| 2 | F12 鈫?Console | 娌℃湁绾㈣壊 404 鎶ラ敊 |
| 3 | F12 鈫?Network 杩囨护 `vendor` | `vue.runtime.min.js`銆乣element-ui.index.js/css`銆乣vendor/fonts/element-icons.woff` 鍏ㄦ槸 200 |
| 4 | 鐪嬬櫥褰曢〉鐨勫浘鏍?| 榻胯疆銆佹悳绱€佸叧闂繖绫诲浘鏍囨槸**姝ｅ父鍥惧舰**锛屼笉鏄┖鏂规 |
| 5 | 鐧诲綍锛堝～ SDKAppID / SecretKey锛?| 杩涘叆浼氳瘽鍒楄〃 |
| 6 | 寤虹兢 鈫?缇よ祫鏂?鈫掋€屽惎鐢ㄦ満鍣ㄤ汉銆?| 寮€鍏宠兘寮€锛涗笅闈㈠嚭鐜?**楠板瓙瑙勫垯**锛氳嚜鍔?/ COC 7鐗?/ 璇＄ D20 |
| 7 | 鐐广€岃绉?D20銆?| **鍙湁瀹冮珮浜?*锛屾彁绀哄彉鎴愩€屽凡鍥哄畾涓?璇＄ D20锛氭墍鏈変汉鎸?d20 缁撶畻銆?|
| 8 | 缇ら噷鍙?`.瑙勫垯` | 楠板鍥炪€屾湰鍥㈣鍒欙細鍥哄畾 璇＄ D20锛涗綘鐨勪汉鐗╁崱锛氣€︼紱瀹為檯鎸?璇＄ D20锛坉20锛夌粨绠椼€?|
| 9 | 缇よ祫鏂?鈫?鎴戠殑鍗?鈫?瀵煎叆浜虹墿鍗?| 寮圭獥椤堕儴鑳介€夎鍒欙紝銆岀偣鍑讳笅杞芥ā鏉裤€嶈兘涓嬪埌 xlsx |
| 10 | 瀵煎叆璇＄鍗?| 棰勮鏄剧ず 閫斿緞/搴忓垪/鐢熷懡/鐞嗘櫤/鐏垫€?骞歌繍/涓夐槻/46 椤规妧鑳?|
| 11 | 浜虹墿鍗″唴椤电偣鎶€鑳芥暟鍊?| 鍙戝嚭 `.rd20 鎶€鑳?闅惧害`锛岄濞樺洖 `d20[15] + 6(鍔涢噺) + 5(杩涢樁) = 26 鈮?18 鎴愬姛` |
| 12 | 瀵煎叆涓€寮?COC 鍗?| 棰勮鏄剧ず 浣撳姏/鐞嗘櫤/骞歌繍/榄旀硶锛岀偣鏁板€煎彂 `.d% 鑱嗗惉` |

绗?9鈥?2 姝ラ渶瑕佽吘璁簯 IM 鐨勫瘑閽ワ紝鍙湁浣犺嚜宸辫兘楠屻€?
---

## 6. 浠ュ悗鎬庝箞鏇存柊

```powershell
# 鏀瑰畬浠ｇ爜
npm run test:rules          # 鍏堣窇鑷
git add -A
git commit -m "fix: 璇存槑鏀逛簡浠€涔?
git push                    # 鎺ㄥ埌 main 灏辫嚜鍔ㄩ噸鏂伴儴缃?```

- 閮ㄧ讲鐘舵€佸湪浠撳簱 **Actions** 鈫?`deploy-pages`
- 鎯宠烦杩囨煇娆¤嚜鍔ㄩ儴缃诧紝鐢?`[skip ci]` 鎻愪氦淇℃伅锛涙兂鎵嬪姩閲嶅彂锛孉ctions 閲?`Run workflow`
- 鏇存柊鍚庢祻瑙堝櫒鍙兘杩樻槸鏃ч〉闈細**Ctrl+F5** 寮哄埗鍒锋柊锛圥ages 鍓嶉潰鏈?CDN 缂撳瓨锛岄€氬父鍑犲垎閽熷唴鐢熸晥锛?
---

## 7. 鍝簺鏂囦欢蹇呴』鍏ュ簱

| 璺緞 | 蹇呴』锛?| 鍘熷洜 |
| --- | --- | --- |
| `src/`銆乣vue.config.js`銆乣package*.json` | 鉁?| 婧愮爜涓庝緷璧栭攣瀹?|
| `public/vendor/`锛堝惈 `fonts/`锛?| 鉁?| 杩愯鏃朵緷璧栦粠鏈湴鍔犺浇锛岀己涓€涓氨鐧藉睆 / 鍥炬爣鍙樻柟妗?|
| `public/static/*.xlsx` | 鉁?| 浜虹墿鍗℃ā鏉夸笅杞戒笌瑙ｆ瀽閮界敤瀹?|
| `public/tim-js.js`銆乣libsig.min.js`銆乣BenzAMRRecorder.js` | 鉁?| IM SDK / 绛惧悕 / BGM 褰曞埗 |
| `.github/workflows/main.yml` | 鉁?| 鑷姩閮ㄧ讲 |
| `node_modules/` | 鉂?宸插拷鐣?| `npm ci` 閲嶅缓 |
| `dist/` | 鉂?宸插拷鐣?| Actions 閲屾瀯寤?|
| 瑙勫垯涔?PDF銆佸師濮嬪崱琛?`26骞?鏈?.xlsx` | 鉂?宸插拷鐣?| 鐗堟潈 + 浣撶Н锛屾湰鍦扮暀鐢ㄥ嵆鍙?|

---

## 8. 瀛愯矾寰勩€佹敼浠撳簱鍚嶃€佽嚜瀹氫箟鍩熷悕

- **瀛愯矾寰勬病闂**锛歚vue.config.js` 閲屾槸 `publicPath: './'`锛屾墍鏈夎祫婧愯蛋鐩稿璺緞锛?  閮ㄧ讲鍦?`/<浠撳簱鍚?/` 涓嬩篃鑳芥甯稿姞杞斤紝**涓嶉渶瑕佹敼閰嶇疆**銆?- **鏀逛粨搴撳悕**锛歋ettings 鈫?Rename 鍚庯紝Pages 鍦板潃璺熺潃鍙橈紝鏃у湴鍧€浼氳烦杞紙GitHub 浼氫繚鐣欓噸瀹氬悜涓€娈垫椂闂达級銆?  浠ｇ爜閲屾病鏈夌‖缂栫爜璺緞锛屼笉鐢ㄦ敼浠讳綍涓滆タ銆?- **鑷畾涔夊煙鍚?*锛歋ettings 鈫?Pages 鈫?Custom domain 濉煙鍚嶏紝浼氱敓鎴?`CNAME` 鏂囦欢锛?  鍒板煙鍚嶅晢鍔?CNAME 鎸囧悜 `<鐢ㄦ埛鍚?.github.io`锛屽啀鍕?**Enforce HTTPS**锛堣瘉涔﹁绛夊嚑鍒嗛挓锛夈€?
---

## 9. 鍏充簬鐧诲綍涓庡瘑閽ワ紙閲嶈锛?
鐧诲綍淇℃伅鍏ㄩ儴鐢变娇鐢ㄨ€呰嚜宸辨彁渚涳紝椤圭洰閲?*涓嶅惈浠讳綍瀵嗛挜**锛?
- **鏂瑰紡涓€**锛氱櫥褰曢〉濉吘璁簯 IM 鐨?`骞冲彴 ID`锛圫DKAppID锛夊拰 `Secret`
- **鏂瑰紡浜?*锛氶個璇烽摼鎺ラ噷甯?`sig` 鍙傛暟锛坅ppid/secret 鐨?base64锛夎嚜鍔ㄥ～鍏?
鍥犳锛?
- **缁濆涓嶈鎶?SecretKey 鍐欒繘浠撳簱**锛屼篃涓嶈鎶婂甫 `sig` 鐨勯個璇烽摼鎺ュ叕寮€璐村嚭鍘伙紙绛夊悓浜庡叕寮€瀵嗛挜锛?- 姣忎釜鍥㈢敤**鑷繁鐨?*鑵捐浜?IM 搴旂敤锛屼簰涓嶅奖鍝?- 鍒汉鎵撳紑浣犵殑绔欑偣鍙細鐪嬪埌鐧诲綍椤碉紝娌℃湁瀵嗛挜 / 閭€璇烽摼鎺ヨ繘涓嶆潵
- 瀵嗛挜鍙湪娴忚鍣ㄩ噷鐢熸垚 userSig 鐢紝涓嶄細涓婁紶鍒颁换浣曟湇鍔″櫒锛堟湰椤圭洰娌℃湁鍚庣锛?
---

## 10. 鎺掗敊琛?
| 鐜拌薄 | 鍘熷洜 / 澶勭悊 |
| --- | --- |
| Pages 椤甸潰 404 | Pages 鐨?Source 娌￠€?**GitHub Actions**锛涙垨 workflow 澶辫触浜嗭紝鍘?Actions 鐪嬫棩蹇?|
| 鐧藉睆锛孋onsole 鎶?`vendor/xxx.js 404` | `public/vendor/` 娌℃彁浜よ繘浠撳簱锛坄.gitignore` 閲屼笉鑳芥湁瀹冿級 |
| 鍥炬爣鍏ㄦ槸绌烘柟妗?| `public/vendor/fonts/element-icons.*` 缂哄け锛涙崲 element-ui 鐗堟湰鏃?`index.js` / `index.css` / `fonts/` 蹇呴』鍚岀増鏈?|
| 楠板瓙瑙勫垯鍗曢€夌偣浜嗗叏浜?/ 涓€鐩存槸 d100 | 鏃х増鏈?bug锛坄el-radio-button` 蹇呴』鐢?`v-model`锛夛紝宸插湪 `e8b1112` 淇锛岀‘璁ら儴缃茬殑鏄渶鏂版彁浜?|
| 鏋勫缓鎶?`ERR_OSSL_EVP_UNSUPPORTED` | workflow 宸茶 `NODE_OPTIONS=--openssl-legacy-provider`锛涙湰鍦版墜鍔ㄦ瀯寤轰篃瑕佽 |
| Actions 閲?`npm ci` 澶辫触 | `package-lock.json` 娌℃彁浜わ紝鎴栦笌 `package.json` 涓嶅悓姝?鈫?鏈湴 `npm install` 鍚庝竴璧锋彁浜?|
| 閮ㄧ讲鎴愬姛浣嗛〉闈㈣繕鏄棫鐨?| 娴忚鍣ㄧ紦瀛橈細Ctrl+F5锛汸ages 鐨?CDN 涔熸湁涓€涓ゅ垎閽熷欢杩?|
| 绉佹湁浠撳簱寮€涓嶄簡 Pages | 鍏嶈垂璐﹀彿鍙敮鎸?public 浠撳簱鐨?Pages |
| 浠撳簱瓒呰繃 1 GB / 鍗曟枃浠惰秴杩?100 MB | 褰撳墠涓嶄細锛氬叏浠?4.7 MB锛屾渶澶ф枃浠?1.05 MB |
| 浜虹墿鍗″鍏ュ悗鏁板€兼槸 0 | 璇＄妯℃澘鐨勭敓鍛?闃插尽鏄?Excel 鍏紡锛岃鐢?Excel/WPS **淇濆瓨涓€娆?*鍐嶅鍏ワ紙瀵煎叆鏃朵細鎻愮ず锛?|
| 楠板涓嶅洖璇?| 瑕佸厛鍦ㄧ兢璧勬枡閲屽紑銆屽惎鐢ㄦ満鍣ㄤ汉銆嶏紱楠板鏄窇鍦?*鏈満娴忚鍣?*閲岀殑 bot 璐﹀彿锛岄〉闈㈠叧鎺夊氨娌′簡 |

---

## 11. 闄勶細鍛戒护閫熸煡

```powershell
# 鏈湴寮€鍙?npm run serve                                          # http://localhost:8080
node node_modules\@vue\cli-service\bin\vue-cli-service.js serve --port 8099

# 鑷 + 鏋勫缓
npm run test:rules
npm run build

# 鍙戝竷
git remote add origin https://github.com/<鐢ㄦ埛鍚?/<浠撳簱鍚?.git   # 鍙渶涓€娆?git push -u origin main
```

鐢?GitHub CLI 鐨勮瘽锛屽缓浠撳簱 + 鎺ㄤ竴娆℃悶瀹氾細

```powershell
gh repo create <浠撳簱鍚? --public --source=. --remote=origin --push
```
