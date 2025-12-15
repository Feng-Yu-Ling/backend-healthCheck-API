// 用來在 Node.js 裡建立 HTTP 伺服器、接收請求（req）並回傳回應（res）
const http = require("http");
// 用來解析網址字串，把路徑、查詢參數（query string）、hash 等拆成好用的結構
const url = require("url");

/*
多數雲端託管平台在啟動容器或服務時，
會透過環境變數 PORT 指定一個可用的 port。
若程式固定只監聽 3000，雲端平台的反向代理或健康檢查可能無法連上，
進而導致部署失敗或反覆重啟。

因此：
- 雲端：平台通常會注入 process.env.PORT，程式應優先使用它
- 本機：若未設定 PORT，則回退使用 3000，方便在 localhost 測試
*/
const PORT = process.env.PORT || 3000;

// 建立一個 http 伺服器的實例
/*
http.createServer()
針對每個請求， callback 函式會執行並帶有兩個參數
req - 請求物件，也就是傳進來的資料
res - 回應物件，也就是要回傳的資料
*/
const server = http.createServer((req, res) => {
  // 設定 CORS 和 JSON 回應標頭
  /*
  1. res.setHeader(name, value)
  - 預先設定「單一」Header，不會立刻送出。
  - 可呼叫多次，設定值會先暫存在 Response 物件內部。
  - 只要回應頭尚未送出（尚未呼叫 writeHead，也尚未開始 write / end），通常都能反覆修改。
  - 常見用途：在回傳內容之前，逐步把 header 組裝完成。
  
  範例：
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Powered-By", "YuLing");
  
  2. res.writeHead(statusCode[, statusMessage][, headers])
  - 一次設定「狀態碼」＋「多個 Header」，並準備送出回應頭（等同把 header 鎖定）。
  - 呼叫後再嘗試修改 header 通常會出現錯誤或無效。
  - 常見用途：想用一行完成「狀態碼 + 一次性 header 設定」，流程更集中。
  
  範例：
  res.writeHead(201, "Created", {
    "Content-Type": "application/json; charset=utf-8",
    "Location": "/api/products/123",
  });
  */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // 首頁：列出簡單的 API 介紹
  /*
  單純的路徑，不包含 query string，不需要拆解參數。
  這時候可採用「字串完全相等」進行判斷。
  */
  if (req.url === "/" && req.method === "GET") {
    res.statusCode = 200;
    /*
    res.end()
    發送回應物件並結束連線
    */
    res.end(
      JSON.stringify({
        message: "歡迎使用 API 服務",
        endpoints: {
          health: "/api/health",
          products: "/api/products?min=5000&max=20000",
        },
      })
    );
    // 避免執行後續的程式碼
    return;
  }

  // Health API
  /*
  單純的路徑，不包含 query string，不需要拆解參數。
  這時候可採用「字串完全相等」進行判斷。
  */
  if (req.url === "/api/health" && req.method === "GET") {
    res.statusCode = 200;
    /*
    res.end()
    發送回應物件並結束連線
    */
    res.end(
      JSON.stringify({
        status: "OK",
        timestamp: new Date().toISOString(),
      })
    );
    // 避免執行後續的程式碼
    return;
  }

  // 商品查詢 API - 支援價格區間篩選
  if (req.url.startsWith("/api/products") && req.method === "GET") {
    // 準備 5 個 3C 產品
    const products = [
      { id: 1, name: "手機", price: 12900 },
      { id: 2, name: "筆電", price: 32900 },
      { id: 3, name: "平板", price: 15900 },
      { id: 4, name: "耳機", price: 2990 },
      { id: 5, name: "螢幕", price: 6990 },
       { id: 6, name: "Dell大螢幕", price: 12990 },
    ];

    // 其他路徑用 url.parse 來處理（例如 /api/products?min=...&max=...）
    /*
    因為這個網址會帶有 query string，
    必須先「解析」網址，把「路徑」跟「參數」拆開。
    透過 url 模組進行網址解析。
    */
    const parsedUrl = url.parse(req.url, true);
    /*
    url.parse(req.url, true)
    true 代表將 querystring 直接解析成「物件」放到 parsedUrl.query。
    預設是 false，true 必須明確指定。
    說明

    const parsedUrl = url.parse("/api/products?min=5000&max=20000", true);

    parsedUrl.pathname; // "/api/products"
    parsedUrl.query;    // { min: "5000", max: "20000" }  ← 已經是物件
    */

    // 取得 query 參數：?min=5000&max=20000
    const min = Number(parsedUrl.query.min) || 0;
    const max = Number(parsedUrl.query.max) || Infinity;

    // 篩選出在區間內的產品
    const matched = products.filter(function (p) {
      return p.price >= min && p.price <= max;
    });

    // 準備要回傳的 JSON
    const result = {
      min,
      max,
      totalProducts: products.length,
      matchedCount: matched.length,
      matchedProducts: matched,
    };

    res.statusCode = 200;
    /*
    res.end()
    發送回應物件並結束連線
    */
    res.end(JSON.stringify(result));
    // 避免執行後續的程式碼
    return;
  }

  // 其他沒對到的路徑以 404 處理
  res.statusCode = 404;
  /*
  res.end()
  發送回應物件並結束連線
  */
  res.end(
    JSON.stringify({
      error: "找不到此路徑",
    })
  );
});

// 啟動伺服器並監聽特定 port
/*
本機：通常用 http://localhost:PORT 連，這案例是 http://localhost:3000
雲端：外部真正的網址通常不是 localhost，而是平台給的 domain
透過將 PORT 印出，可以確認有沒有用到平台指定的 PORT
*/
server.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動，正在監聽 PORT: ${PORT}`);
  console.log(`📍 環境: ${process.env.NODE_ENV || "development"}`);
});
