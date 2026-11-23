# 課程 API

公開審核根網址 `https://hexschool-course-shop-backend.vercel.app/api/v1`。本機根網址 `http://127.0.0.1:4411/api/v1`。以下路徑均接在根網址之後。JSON 寫入需給 `Content-Type: application/json` 及 `X-Requested-With: XMLHttpRequest`，登出與 DELETE 無請求內容時只需後一個標頭。錯誤格式為 `{"error":{"code":"代碼","message":"說明"}}`。

## Postman 使用方式

匯入同資料夾的集合。集合已填公開課程 API。若改用本機，將 `baseUrl` 和 `reviewWriteBaseUrl` 都改成本機根網址。兩個值相同時，集合才會送出寫入請求。填自己的課程會員和管理員變數，依編號跑各區，保留 Cookie Jar。

## 公開商品

| 方法與路徑 | 用法 | 成功 |
|---|---|---|
| GET /health | 檢查 API 與課程資料庫 | 200 |
| GET /categories | 取得分類 ID | 200 |
| GET /products | `page` 從 1 起，`limit` 1～20，`q` 搜尋，`category` 分類 UUID | 200 |
| GET /products/{id} | 以商品 ID 讀取明細，從 `data.variants` 選款式 | 200 |

列表回傳 `data` 與 `meta`。`meta` 包含 page、limit、total、totalPages。分頁順序固定。查不到商品的明細回 404，無搜尋結果的列表回空陣列。

## 註冊與登入

| 方法與路徑 | JSON 或條件 | 成功 |
|---|---|---|
| POST /auth/register | `name`、`email`、`password`，密碼 8～72 字元 | 201 |
| POST /auth/login | `email`、`password` | 200，設定 HttpOnly Cookie |
| GET /auth/session | 保留登入 Cookie。訪客的 `data.user` 為 null | 200 |
| POST /auth/logout | 撤銷 Cookie 對應的工作階段 | 200 |

註冊時角色固定為 Member。使用課程測試帳號，依 Postman Cookie Jar 或瀏覽器保留 Cookie。

## 會員購物車

| 方法與路徑 | JSON 或條件 | 成功 |
|---|---|---|
| GET /cart | 取得自己的品項與總件數和金額 | 200 |
| POST /cart/items | `variantId`、`quantity` 和 `Idempotency-Key` | 200 |
| PATCH /cart/items/{id} | `quantity`，其中 ID 為購物車品項 ID | 200 |
| DELETE /cart/items/{id} | 移除該品項 | 200 |

數量為 1～99 的整數且須有足夠示範庫存。新操作使用新識別碼，網路中斷重送原操作時沿用識別碼。重用識別碼送不同內容回 409。

## 管理員商品

| 方法與路徑 | JSON 或條件 | 成功 |
|---|---|---|
| GET /admin/products | 與公開列表相同的篩選與分頁 | 200 |
| POST /admin/products | name、slug、description、categoryId、variants | 201 |
| GET /admin/products/{id} | 查建立的商品 | 200 |
| PATCH /admin/products/{id} | name、slug、description、categoryId 中選擇要更新的欄位 | 200 |
| DELETE /admin/products/{id} | 刪除本次建立的課程商品 | 204 |

```json
{
  "name": "課程操作示範盒",
  "slug": "course-demo-box",
  "description": "課程測試資料。",
  "categoryId": "<從分類 API 取得適用的 UUID>",
  "variants": [{ "label": "標準款", "price": 75, "stock": 5 }]
}
```

管理員操作使用 Admin Cookie。訪客回 401，一般會員回 403。商品刪除時清理關聯的示範款式與購物車品項。
