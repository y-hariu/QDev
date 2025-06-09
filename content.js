// Geminiページが読み込まれたときに実行される
console.log("[Gemini拡張] content.jsが読み込まれました");

// ストレージからテキストとモードを取得
chrome.storage.local.get(['geminiText', 'geminiMode'], function(result) {
  if (result.geminiText) {
    console.log("[Gemini拡張] テキストを取得しました: " + result.geminiText);
    const mode = result.geminiMode || "search";
    
    // 入力欄を探す関数
    function findAndFillTextbox() {
      console.log("[Gemini拡張] テキストエリアを探しています");
      // Geminiの入力欄を探す (role="textbox"属性を持つ要素)
      const textArea = document.querySelector('[role="textbox"]');
      
      if (textArea) {
        console.log("[Gemini拡張] テキストエリアが見つかりました");
        // テキストエリアにフォーカスを当てる
        textArea.focus();
        // テキストを入力 (contentEditableの場合はinnerTextを使用)
        // モードに応じてテキストを加工
        if (mode === "translate") {
          textArea.innerText = `「${result.geminiText}」を日本語に翻訳してください`;
        } else {
          textArea.innerText = result.geminiText + " とは？";
        }
        // 入力イベントを発火させて、Geminiに認識させる
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
        textArea.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("[Gemini拡張] テキストを入力しました");
        
        // エンターキーを送信
        setTimeout(() => {
          textArea.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
          console.log("[Gemini拡張] Enterキーを送信しました");
        }, 1000);
        
        // 使用後にテキストとモードをクリア
        chrome.storage.local.remove(['geminiText', 'geminiMode'], function() {
          console.log("[Gemini拡張] ストレージをクリアしました");
        });
        
        return true;
      } else {
        console.log("[Gemini拡張] テキストエリアが見つかりませんでした");
        return false;
      }
    }
    
    // 最初の試行
    setTimeout(() => {
      if (!findAndFillTextbox()) {
        console.log("[Gemini拡張] 再試行します...");
        // 見つからなかった場合は、さらに待ってから再試行
        setTimeout(() => {
          if (!findAndFillTextbox()) {
            console.log("[Gemini拡張] 最終試行...");
            // 最後の試行
            setTimeout(findAndFillTextbox, 1500);
          }
        }, 1500);
      }
    }, 1000);
    
  } else {
    console.log("[Gemini拡張] テキストが見つかりませんでした");
  }
});