# 简易记账系统

网页版个人记账工具，前后端分离架构，数据持久化到 SQLite 数据库。

## 功能

- 添加、查看、编辑、删除收支记录
- 按类型、月份筛选记录
- 顶部汇总：总收入、总支出、结余
- REST API 后端，数据存入 SQLite

## 快速启动

### 1. 安装依赖

```powershell
cd D:\accounting-system
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 启动服务

```powershell
python server.py
```

### 3. 打开浏览器

访问 http://127.0.0.1:5000

> 请通过 Flask 服务访问页面，不要直接双击 `index.html`，否则无法调用后端 API。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/records` | 获取记录列表，支持 `?type=income\|expense&month=2026-06` |
| GET | `/api/records/:id` | 获取单条记录 |
| POST | `/api/records` | 新增记录 |
| PUT | `/api/records/:id` | 更新记录 |
| DELETE | `/api/records/:id` | 删除记录 |
| GET | `/api/summary` | 获取汇总数据 |

### 请求体示例（POST / PUT）

```json
{
  "date": "2026-06-29",
  "type": "expense",
  "category": "餐饮",
  "amount": 35.5,
  "note": "午餐"
}
```

## 项目结构

```
accounting-system/
├── server.py          # Flask 后端入口
├── database.py        # SQLite 数据库
├── requirements.txt   # Python 依赖
├── index.html         # 前端页面
├── styles.css         # 样式
├── app.js             # 前端逻辑（调用 API）
└── data/              # 数据库文件（自动生成）
```

## 技术栈

- 前端：HTML + CSS + JavaScript
- 后端：Python Flask
- 数据库：SQLite
