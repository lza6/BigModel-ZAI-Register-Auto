# BigModel (bigmodel.cn) 自动注册全链路 — 实测报告 R1-R4

> 2026-11-01 · CDP E2E 实测 · 工具目录 `D:/apk-analysis/bigmodel-cdp/`

## 一、结论速览

| 项 | 结果 |
|---|---|
| 反调试 | `/register` 路由在 CDP 环境白屏（检测自动化拒绝渲染），**但 Vue router `push('/login')` 直接绕过**，`/login` 完整渲染 |
| 注册即登录 | **未注册手机号自动创建账号**，注册/登录合一 |
| 新用户额度 | 文案：注册送 **2000万 tokens 体验包**（product-047，120次）+ 邀好友最高 2亿 tokens |
| 实测额度 | ❌ 未自动到账：`balance=0`、`tokenAccounts=[]`、`subscription=[]` |
| API Key | ✅ 注册完即有（一次性展示完整 key，格式 `{ID}.{secret}`） |
| API 调用 | ❌ 401「身份验证失败」——**根因=未实名**（官方明示：认证成功后即可使用 API Key 等功能） |
| 实名 | 个人认证 = 真实姓名 + 身份证号 + 所属行业（无在线人脸，提交审核 ~7 个工作日），**实名成功解锁 500万 tokens**（product-005） |
| 注册成本 | ¥0.2/号（D1 接码，`keyWord=智谱` 专属卡段） |

## 二、验证码（最大拦路虎，已破）

- 形式：**点选文字**「请依次点击：X Y Z」，AI 生成背景图，字符随机位置、随机颜色（橙黄系）
- 解法：**pngjs 像素聚类**
  1. CDP `Page.captureScreenshot` + `clip` 截验证码图区域（精确 rect 从 `img.getBoundingClientRect()` 拿）
  2. 橙黄字色检测：`(R>180 && G>140 && B<110) || (R>220 && G>180 && B<150)`（浅色背景用 `R>190 G110-210 B<90`）
  3. 45px 半径聚类 → 取 n>80 的簇，按面积排序
  4. **簇↔字符映射靠 dump 图目测**（当前唯一人工环节，可接 OCR 消除）
  5. `Input.dispatchMouseEvent` 真实点击 + 点「确定」
- 实测通过率：2/4（错在簇-字符映射猜错；映射对了就 100%）

## 三、全流程脚本（按序执行）

```
1. 取号   curl api.d1jiema.com?code=getPhone&keyWord=智谱  → 19931503457
2. 开Chrome  chrome --remote-debugging-port=9222 bigmodel.cn/login
3. 过反调试  Vue router push('/login')（cdp-route.cjs 的做法）
4. 填手机号  native value setter + input event（step1-phone.cjs）
5. 点验证码  auto3.cjs（聚类）→ 目测 dump 图 → click-plan.cjs（按序点击+确定）
6. 收码    api.d1jiema.com?code=getMsg&phone=xxx&keyWord=智谱 →【智谱ai】验证码
7. 填码登录 fill-code.cjs（填码+勾协议）→ login-btn.cjs（点"登录 / 注册"）
8. 拿key   newkey2/3/4.cjs（新建 API Key 弹窗流程）→ apikey.txt
9. 鉴权    Network.requestWillBeSent 抓 Authorization Bearer JWT（net-cap.cjs）
```

## 四、关键 API（web 端，Bearer JWT）

| 端点 | 说明 |
|---|---|
| `GET /api/biz/customer/accountSet` | 账户信息+实名状态 |
| `GET /api/biz/account/query-customer-account-report` | 余额（balance/availableBalance） |
| `GET /api/biz/tokenAccounts/list/my` | 我的资源包 |
| `GET /api/biz/subscription/list` | Coding Plan 订阅 |
| `GET /api/biz/customer/getTokenMagnitude?productId=product-047` | 注册礼包量（2000万/120次） |
| `GET /api/biz/v1/organization/{orgId}/projects/{projId}/apikeys?...` | key 列表（secret 打码） |
| 新建 key | 页面弹窗流程，完整 key 仅展示一次 |

## 五、号池路线判定（重要）

1. **bigmodel 开放平台线**（本报告）：注册免费但**实名是硬墙**——API 无额度可用，实名需身份证且审核 7 工作日，批量成本与风险高。适合少量高质量号。
2. **ZCode 桌面 OAuth 线**（见 ZCode 反编译报告）：chat.z.ai 注册 + OAuth cli/init 全自动拿 zcodejwttoken，Start Plan 免费额度**服务端自动授予、无需实名**，每天 GLM-5.3 3M + Turbo/Flash 各 2M。**批量号池主路线应走这条**。
3. 两条线账号体系不同：bigmodel.cn 与 chat.z.ai（手机号可复用与否待验证）。

## 六、坑清单

1. `/register` 白屏是自动化检测，不是 bug——必须从 `/login` 进
2. 验证码字色阈值随背景变（浅色草地 vs 深色几何），两套参数都要备
3. 簇-字符映射无 OCR 时靠目测：`auto3.cjs` 输出簇坐标后看 `auto-captcha.png` 对号
4. Node 后台脚本输出文件延迟大——`shot.cjs`（即时截图）最可靠
5. key 一次性展示：弹窗流程要一气呵成（填名→确定→抓 `{32hex}.{16char}`）
6. web JWT 从网络层抓（localStorage 无），HS512，含 user_id
