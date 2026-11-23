# 辦公室小物電商｜課程後端

Express + TypeORM + PostgreSQL。提供商品、會員、購物車和管理商品 API。資料是課程環境的三個分類、十二件示範商品與兩種測試帳號。請先啟動這個 Repo，再啟動前端 Repo。

[課程前端 Repo](https://github.com/sun901019/hexschool-course-shop-frontend)

## 線上審核

- 公開 API Base URL 是 `https://hexschool-course-shop-backend.vercel.app/api/v1`。[健康檢查](https://hexschool-course-shop-backend.vercel.app/api/v1/health)
- [課程前端](https://hexschool-course-shop-frontend.vercel.app/) 使用同來源轉送。課程資料來自獨立 Neon PostgreSQL。
- Vercel 環境用 `COURSE_DATABASE_URL` 連接課程庫，搭配 `COURSE_JWT_SECRET`、`COURSE_FRONTEND_ORIGIN` 及 `COURSE_COOKIE_SECURE=true`。用以測試的會員與管理員登入資料由交件人另交給助教。

## 本機啟動

使用 Node.js 24 及 Docker Compose。資料庫由本 Repo 的 Compose 啟動，只綁本機 55442。

```sh
npm ci
npm run setup:local
docker compose --project-name hexschool-course-shop up -d --wait
npm run db:migrate
npm run db:seed
npm start
```

- API Base URL 是 `http://127.0.0.1:4411/api/v1`，健康檢查用 `GET /health`。
- `setup:local` 依 `.env.example` 建立本機 `.env`，產生隨機的資料庫密碼、JWT 金鑰和兩組測試密碼。如果已有 `.env`，沿用現有值。
- `db:migrate` 建立課程資料表。`db:seed` 加入三個分類、示範商品與會員／管理員測試帳號。本機的 `.runtime/demo-accounts.txt` 是僅供本機持有人查看的登入資料。
- 環境變數分成 `COURSE_DB_*`、`COURSE_JWT_SECRET`、`COURSE_DEMO_*`、`COURSE_FRONTEND_ORIGIN` 及 API 監聽位置。公開審核環境提供它自己的 PostgreSQL 與測試帳號。審核者的測試密碼用私下管道提供。
- `npm test` 用現有的課程種子資料和暫存測試資料，從 HTTP 驗分類、認證、購物車及管理商品。測試在本機課程資料庫跑，並清掉該次測試新增的會員與商品。

## 怎麼測試

API 欄位、角色與狀態碼在 [核心 API](docs/API.md)。匯入 [Postman 集合](docs/course-shop.postman_collection.json)，在課程環境填入會員和管理員變數。Postman Cookie Jar 會保留同一個登入工作階段。

公開讀取 `GET /products` 查第一頁和第二頁，再用分類、關鍵字與商品明細。會員登入後驗證購物車；登出後換管理員，新增、修改、刪除一件新測試商品。一般會員呼叫商品管理 API 會回 403。

## 設計與一條資料流

```text
Vue 送出 variantId、quantity 與操作識別碼
→ Express 路由
→ Middleware 讀取登入 Cookie，查工作階段與角色
→ Controller 把輸入和會員 ID 傳給 Cart Service
→ Repository 在 PostgreSQL 查款式庫存並更新購物車
→ 回傳實際品項與合計，前端更新 Pinia
```

會員密碼以 Argon2 雜湊。JWT 放在 HttpOnly Cookie，登入工作階段存於資料庫，登出撤銷工作階段。公開註冊只建立 Member，Admin 由 seed 建立。

`users` 對應 `carts`，`cart_items` 關聯購物車與 `variants`。商品屬於分類並有一或兩款示範款式。外鍵與唯一約束確保一個購物車同一款式只有一列。新增購物車以交易鎖定該會員的購物車，操作識別碼讓同一請求重送時只加一次。

## 審核環境部署

以此 Repo 當獨立 Express 服務，先設定課程資料庫、課程前端來源、金鑰和兩種角色的測試帳號。準備新資料庫時依序跑 migration 與 seed。正式供審核的 API 用 HTTPS，設定 `COURSE_COOKIE_SECURE=true`。雲端服務依需要設定 `COURSE_API_HOST=0.0.0.0`、`COURSE_API_PORT` 及經驗證的資料庫 TLS。

前端可將同源的 `/api/v1` 轉送至這個 API 的公開位址。若直接從前端連不同來源，核對精確的 CORS 來源與瀏覽器 Cookie 同站條件。部署後從獨立工作階段確認登入、重新整理與登出。
