# 66 DAYS — 習慣打卡 PWA

這是一個不需要 App Store、可直接加到 iPhone 主畫面的 PWA。

## 功能

- 66 天挑戰
- 11 個固定每日習慣
- 11/11 完成後才可成功打卡
- 累積完成天數、連續天數、完成率
- 66 天挑戰日曆與近 14 天紀錄
- 每 5 個成功日解鎖小禮物，第 66 天解鎖最終徽章
- 每日一句話
- 本機離線儲存
- JSON 匯出 / 匯入備份
- PWA / iPhone 加入主畫面

## 11 個每日項目

1. 每天跑步
2. 每天伏地挺身
3. 每天讀 10 頁
4. 喝 3.5 公升水
5. 冥想 20 分鐘
6. 7 點前起床
7. 冷水澡一次
8. 不用社群媒體
9. 運動 1 小時
10. 每天寫日記
11. 心存感激

## 最簡單部署方式：Vercel

1. 把整個資料夾上傳到 GitHub repository。
2. 在 Vercel 選 `Add New Project`，連接該 GitHub repository。
3. Framework Preset 選 `Other`。
4. 不需要 Build Command，也不需要環境變數。
5. Deploy。
6. 用 iPhone Safari 打開 Vercel 網址。
7. Safari 分享按鈕 →「加入主畫面」。

## 資料儲存

目前使用 `localStorage`，資料只保存在使用者的瀏覽器 / 裝置中，不會上傳到伺服器。
請使用 App 內「設定 → 匯出備份」定期保存 JSON。

若之後需要多 iPhone 同步、帳號登入或雲端備份，可再接 Supabase。
