// デバッグ用のログ関数
function log(message) {
  console.log(`[Gemini拡張] ${message}`);
}

// パスワード生成関数
function generatePassword(length = 12, includeUppercase = true, includeLowercase = true, 
                         includeNumbers = true, includeSymbols = true) {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';
  
  let availableChars = '';
  if (includeUppercase) availableChars += uppercaseChars;
  if (includeLowercase) availableChars += lowercaseChars;
  if (includeNumbers) availableChars += numberChars;
  if (includeSymbols) availableChars += symbolChars;
  
  if (availableChars.length === 0) {
    // デフォルトで小文字と数字を含める
    availableChars = lowercaseChars + numberChars;
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * availableChars.length);
    password += availableChars[randomIndex];
  }
  
  return password;
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
    id: "generatePassword",
    title: "パスワードを生成",
    contexts: ["page", "editable"]  // ページ上とテキスト入力欄で表示
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
  } else if (info.menuItemId === "generatePassword") {
    // パスワード生成処理
    log("パスワード生成を実行します");
    
    // デフォルト設定でパスワードを生成
    const password = generatePassword();
    log("パスワードを生成しました");
    
    // アクティブなタブにパスワードを挿入し、クリップボードにコピーするスクリプトを実行
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (generatedPassword) => {
        // クリップボードにコピー（コンテンツスクリプト内で実行）
        navigator.clipboard.writeText(generatedPassword).then(() => {
          console.log("[Gemini拡張] パスワードをクリップボードにコピーしました");
          
          // フォーカスされている要素にパスワードを挿入
          const activeElement = document.activeElement;
          if (activeElement.tagName === 'INPUT' || 
              activeElement.tagName === 'TEXTAREA' || 
              activeElement.isContentEditable) {
            
            // input/textareaの場合
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
              const start = activeElement.selectionStart || 0;
              const end = activeElement.selectionEnd || 0;
              const value = activeElement.value;
              
              activeElement.value = value.substring(0, start) + generatedPassword + value.substring(end);
              activeElement.selectionStart = activeElement.selectionEnd = start + generatedPassword.length;
              
              // イベントの発火
              activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              activeElement.dispatchEvent(new Event('change', { bubbles: true }));
            } 
            // contentEditableの場合
            else if (activeElement.isContentEditable) {
              const selection = window.getSelection();
              if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(generatedPassword));
                
                // 選択範囲をパスワードの後ろに設定
                range.setStartAfter(range.endContainer);
                range.setEndAfter(range.endContainer);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
            
            // パスワードが挿入された通知
            const notifyDiv = document.createElement('div');
            notifyDiv.textContent = 'パスワードが挿入されました';
            notifyDiv.style.position = 'fixed';
            notifyDiv.style.top = '10px';
            notifyDiv.style.right = '10px';
            notifyDiv.style.background = 'rgba(0, 0, 0, 0.7)';
            notifyDiv.style.color = 'white';
            notifyDiv.style.padding = '10px 15px';
            notifyDiv.style.borderRadius = '5px';
            notifyDiv.style.zIndex = '9999';
            notifyDiv.style.fontSize = '14px';
            
            document.body.appendChild(notifyDiv);
            
            // 3秒後に通知を削除
            setTimeout(() => {
              if (notifyDiv.parentNode) {
                notifyDiv.parentNode.removeChild(notifyDiv);
              }
            }, 3000);
          } else {
            // 入力フィールドがフォーカスされていない場合は通知だけ表示
            const notifyDiv = document.createElement('div');
            notifyDiv.textContent = 'パスワードがクリップボードにコピーされました';
            notifyDiv.style.position = 'fixed';
            notifyDiv.style.top = '10px';
            notifyDiv.style.right = '10px';
            notifyDiv.style.background = 'rgba(0, 0, 0, 0.7)';
            notifyDiv.style.color = 'white';
            notifyDiv.style.padding = '10px 15px';
            notifyDiv.style.borderRadius = '5px';
            notifyDiv.style.zIndex = '9999';
            notifyDiv.style.fontSize = '14px';
            
            document.body.appendChild(notifyDiv);
            
            // 3秒後に通知を削除
            setTimeout(() => {
              if (notifyDiv.parentNode) {
                notifyDiv.parentNode.removeChild(notifyDiv);
              }
            }, 3000);
          }
        }).catch(err => {
          console.log(`[Gemini拡張] クリップボードコピーエラー: ${err}`);
          
          // エラー通知
          const errorDiv = document.createElement('div');
          errorDiv.textContent = 'クリップボードへのコピーに失敗しました';
          errorDiv.style.position = 'fixed';
          errorDiv.style.top = '10px';
          errorDiv.style.right = '10px';
          errorDiv.style.background = 'rgba(255, 0, 0, 0.7)';
          errorDiv.style.color = 'white';
          errorDiv.style.padding = '10px 15px';
          errorDiv.style.borderRadius = '5px';
          errorDiv.style.zIndex = '9999';
          errorDiv.style.fontSize = '14px';
          
          document.body.appendChild(errorDiv);
          
          // 3秒後に通知を削除
          setTimeout(() => {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 3000);
        });
      },
      args: [password]
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