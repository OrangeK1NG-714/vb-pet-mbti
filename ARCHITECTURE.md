# pet-mbti 架构

## 产品与边界

`pet-mbti` 是零运行时依赖的中文宠物性格测试静态站，提供 16 道题、人格/隐藏人设结果、
分享卡和匿名转化事件；它是免费引流产品，不在本站内完成购买或真实支付。

- 保持原生 HTML/CSS/JavaScript、浏览器全局模块和静态构建，不引入框架或服务端运行时。
- `core.js` 的问卷、评分和结果是领域真值；DOM、Canvas、网络、storage、Web Share 是 adapters。
- analytics 失败必须静默降级，不能阻断答题、分享或意向登记；只允许白名单事件和属性。
- 正式 URL、站点阶段、联系方式和 analytics 配置只以 `site-config.js` 为运行时真值，
  HTML metadata 与构建清单需由测试防漂移。

## 目录职责

| 层 | 当前入口与职责 | 新代码落位 |
| --- | --- | --- |
| composition | `index.html` 按 `site-config.js` → `core.js` → `quiz-controller.js` → `analytics.js` → `share-card.js` → `app.js` 的顺序加载；`app.js` 负责把浏览器 timer、DOM 和各全局模块接到一起。 | 组合仍由最后加载的 `app.js` 完成；新增脚本必须同步登记 `index.html`、`scripts/build.mjs` 与静态测试，不引入隐式加载。 |
| delivery | `index.html`/`styles.css` 定义文档与视觉，`app.js` 的 render/modal/focus/event binding 负责交互展示。 | DOM renderer 与可访问性辅助函数继续放原生脚本；从 `app.js` 拆出时使用根目录小文件并保持明确 script 顺序。 |
| application | `quiz-controller.js` 管理 pet/breed、答案、当前题、完成/返回/重测状态和延时推进 epoch；它不依赖 DOM，timer 通过端口注入并可在 Node 中独立测试。 | 后续只把与问卷流程有关的状态迁入 controller；分享和意向展示仍由 delivery 发起，避免把 DOM 数据塞进 application 层。 |
| domain / ports | `core.js` 保存题目、类型、彩蛋、品种预判和纯评分函数。 | 纯规则继续在 `core.js`；若规模继续增长，再按数据与计算拆分，但保持 CommonJS/浏览器双环境包装。controller 所需 analytics/share/timer 接口作为轻量约定，不引入框架。 |
| adapters | `analytics.js` 适配 localStorage、Beacon/fetch，`share-card.js` 适配 Canvas，`site-config.js` 提供环境配置；`scripts/` 只服务构建、检查、本地预览和 QA。 | 浏览器能力保持在这些 adapter；Node 脚本不得进入 `dist/` 运行时，也不得被产品代码依赖。 |

## 依赖方向

```text
DOM delivery → quiz application → core domain
                    ↓ ports
       analytics / share / timer browser adapters

index.html/app.js composition 负责连接以上对象
```

- `core.js` 不依赖 DOM、Canvas、网络、storage、站点配置或 Node。
- controller 不写 `innerHTML`、不查询焦点、不直接 fetch；DOM delivery 不自行重算人格。
- analytics/share adapters 可以依赖浏览器 API，但不得反向修改答题状态。
- 测试可通过 CommonJS 加载 core/adapters；生产仍使用浏览器全局，不增加运行时依赖。

## 禁止事项

- 禁止引入框架、包管理运行时、远端字体或必须联网才能答题的依赖。
- 禁止在多个文件复制题目、评分、canonical URL 或生产脚本清单。
- 禁止统计上传姓名、联系方式、原始答案或其他识别信息；不得因 analytics 异常产生未处理
  Promise。
- 禁止把 `metrics` 旧服务重新发展为第二套权威后端。若使用 Go 能力，浏览器必须经
  Pet 自己的同源 BFF/入口代理，不能新增直接 Go 地址。
- 禁止把娱乐性品种比例描述成科学结论，也不得在未开放时伪造购买、联系方式或支付能力。
- 公开部署和真实购买链路仍需 Human 确认。

## 当前迁移热点

2026-07-29 首批已增加配置一致性门禁，固定 canonical/OG/JSON-LD 正式地址、脚本顺序及
构建 `SOURCE_FILES`；随后抽出无 DOM 的 `quiz-controller.js`，现有焦点、analytics、分享
与浏览器 QA 行为保持不变。

`app.js` 约 355 行，保留 DOM 模板、焦点管理、modal、分享和意向行为；约 135 行的
`quiz-controller.js` 独立承载答题状态机、推进 timer port 与迟到 callback 防护；
`core.js` 约 248 行，数据量与纯计算放在同一文件；`share-card.js` 约 182 行集中 Canvas
绘制。`scripts/browser-qa.mjs` 较长但属于测试基础设施，不应为了行数机械拆分。

`site-config.js` 的 analytics endpoint 仍直指跨域 `https://api.richardq.tech/api/collect`；
这是与“浏览器只经同源 BFF”目标不一致的现存债务，不是可复制的新模式。

渐进顺序：

1. site config、metadata、脚本顺序和构建 manifest 门禁已完成；旧 metrics fixture 已冻结。
2. 无 DOM 的 `quiz-controller.js` 已接线并覆盖答题、返回首页、重新测试和迟到 timer
   取消；timer 已作为 adapter 注入，现有键盘和焦点行为由浏览器 QA 固定。
3. 后续按独立用例继续收窄 `app.js` 的 DOM/composition 职责；analytics 与分享保持 adapter，
   不为了层数增加运行时依赖。
4. 部署侧提供本项目同源采集路径后，把 analytics 配置切到同源 BFF/入口代理；切换前不再
   新增任何浏览器直连 Go 的端点。
5. 只有领域数据继续显著增长时才拆 `core.js`，外部 `PetMbtiCore` 契约保持兼容。

## 验证

```bash
npm run check
npm run qa
```

`check` 覆盖 Node 单元测试和静态一致性检查；`qa` 构建 `dist/` 并运行响应式浏览器回归。
仅需验证产物清单时可单独运行 `npm run build`。本地/fixture analytics 结果不能表述为
生产采集成功，公开部署另需 Human 确认。
