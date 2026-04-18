# Komari Nexus

Komari Nexus 是一个基于 KomariNext 二次开发的 Komari 主题。
它基于 **Next.js**、**TypeScript**、**Tailwind CSS** 和 **Shadcn UI** 构建，并被打包为静态站点，可作为 Komari 的主题使用。

[演示站点](https://probes.top)

[仓库地址](https://github.com/strayplace/komari-next)

> 该仓库仅包含前端。你需要一个正在运行的 Komari 后端实例供 UI 进行通信。或者你也可以下载主题文件并通过 Komari 的管理后台上传（推荐这种方式）。

![dark-theme](https://github.com/strayplace/komari-next/blob/main/images/dark-theme.png?raw=true)
![colour-theme](https://github.com/strayplace/komari-next/blob/main/images/show-theme.png?raw=true)
![layout-theme](https://github.com/strayplace/komari-next/blob/main/images/layout-theme.png?raw=true)

## 功能特性

* 服务器与节点状态的实时仪表盘
* 实例详情页，包含负载与延迟图表
* 节点列表与管理视图
* 基于 `react-i18next` 的国际化（i18n）
* 使用 Shadcn + Tailwind CSS 的响应式布局与深色模式
* 适配 Komari 主题系统的主题打包方案
* **丰富的自定义选项：**

  * **6 种配色主题：** Default、Ocean、Sunset、Forest、Midnight、Rose
  * **4 种卡片布局：** Classic、Modern、Minimal、Detailed —— 每种都有独特的视觉设计与元素布局
  * **4 种图表样式：** Circle、Progress Bar、Bar Chart、Minimal —— 均会跟随所选配色主题
  * **可自定义状态卡片：** 可在仪表盘中显示/隐藏单项指标
  * **自带背景图！** 使用图片 URL 将其设置为背景。
  * **Ping 统计显示** 在首页即可直接展示数据包信息！
  * 所有设置会在本地持久化保存，并可在主题切换时同步
