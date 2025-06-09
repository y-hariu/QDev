// デバッグ用のログ関数
function log(message) {
  console.log(`[Gemini拡張] ${message}`);
}

// 拡張機能がインストールされたときにコンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  log("拡張機能がインストールされました");
  
  // 最上位メニューとして作成
  chrome.contextMenus.create({
    id: "searchWithGemini",
    title: "調べる",
    contexts: ["selection"]  // テキスト選択時のみ表示
  });
  chrome.contextMenus.create({
    id: "translateWithGemini",
    title: "翻訳",
    contexts: ["selection"]  // テキスト選択時のみ表示
  });
  chrome.contextMenus.create({
    id: "openGemini",
    title: "Geminiを開く",
    contexts: ["page"]  // ページ上で右クリック時に表示
  });
  
  log("コンテキストメニューを作成しました");
});

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  log("コンテキストメニューがクリックされました");
  if (info.menuItemId === "searchWithGemini" || info.menuItemId === "translateWithGemini") {
    const selectedText = info.selectionText;
    log(`選択されたテキスト: ${selectedText}`);
    
    // 選択されたテキストとモードをストレージに保存
    const mode = info.menuItemId === "translateWithGemini" ? "translate" : "search";
    chrome.storage.local.set({
      geminiText: selectedText,
      geminiMode: mode
    }, function() {
      log(`テキストをストレージに保存しました (モード: ${mode})`);
      
      // Geminiのウェブアプリを開く
      const geminiUrl = "https://gemini.google.com/app";
      log(`Geminiを開きます: ${geminiUrl}`);
      
      chrome.tabs.create({ url: geminiUrl }, (newTab) => {
        log(`新しいタブが作成されました: ${newTab.id}`);
        
        // タブの読み込み完了を監視
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
          log(`タブ更新: tabId=${tabId}, status=${changeInfo.status}`);
          
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            log("ページの読み込みが完了しました");
            // リスナーを削除
            chrome.tabs.onUpdated.removeListener(listener);
            
            // content.jsを実行
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              files: ['content.js']
            }, (results) => {
              if (chrome.runtime.lastError) {
                log(`エラー: ${chrome.runtime.lastError.message}`);
              } else {
                log("content.jsが正常に実行されました");
              }
            });
          }
        });
      });
    });
  } else if (info.menuItemId === "openGemini") {
    // Geminiを開くだけの処理
    const geminiUrl = "https://gemini.google.com/app";
    log(`Geminiを開きます: ${geminiUrl}`);
    
    chrome.tabs.create({ url: geminiUrl }, (newTab) => {
      log(`新しいタブが作成されました: ${newTab.id}`);
    });
  }
});