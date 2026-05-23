let books = [];
let searchTimeout = null;
const MAX_RESULTS = 100; // 最多显示100条结果

async function loadBooks() {
  try {
    // 加载去重索引（~14MB，原 all-books.json 去重版）
    const res = await fetch("search-index.json");

    if (res.ok) {
      const data = await res.json();
      books = data;
      const searchBox = document.querySelector('input[type="text"]');
      if (searchBox) {
        const orig = searchBox.placeholder;
        searchBox.placeholder = `已加载 ${books.length.toLocaleString()} 本书，开始搜索...`;
        setTimeout(() => { searchBox.placeholder = orig; }, 3000);
      }
      return;
    }
  } catch (e) {
    console.warn("search-index.json 加载失败:", e);
  }

  console.error("无法加载书籍数据，请刷新页面重试");
  const box = document.getElementById("search-results");
  if (box) box.innerHTML = "<p style='padding:20px;color:#dc322f;'>⚠️ 书籍数据加载失败，请刷新页面重试</p>";
}

function searchBooks(keyword) {
  if (!keyword || keyword.trim() === "") {
    return [];
  }
  
  const k = keyword.toLowerCase().trim();
  const keywords = k.split(/\s+/); // 支持多关键词搜索

  return books.filter(b => {
    const title = (b.title || "").toLowerCase();
    const author = (b.author || "").toLowerCase();
    const category = (b.category || "").toLowerCase();
    
    // 多关键词匹配：所有关键词都要匹配
    return keywords.every(keyword => 
      title.includes(keyword) ||
      author.includes(keyword) ||
      category.includes(keyword)
    );
  }).slice(0, MAX_RESULTS); // 限制结果数量
}

// HTML 转义函数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 正则表达式特殊字符转义
function escapeRegex(str) {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, keyword) {
  if (!keyword || !text) return escapeHtml(text);
  
  // 转义正则表达式特殊字符，防止正则表达式注入
  const escapedKeyword = escapeRegex(keyword);
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  
  // 先转义 HTML，再添加高亮标记
  const escapedText = escapeHtml(text);
  return escapedText.replace(regex, '<mark>$1</mark>');
}

function renderResults(results, keyword) {
  const box = document.getElementById("search-results");
  box.innerHTML = "";

  if (results.length === 0) {
    box.innerHTML = "<p style='padding: 20px; text-align: center; color: #93a1a1; background: #073642; border-radius: 6px; border: 1px solid #586e75;'>❌ 没有找到相关书籍</p>";
    return;
  }

  const keywordLower = keyword.toLowerCase();
  
  // 显示结果数量
  const countDiv = document.createElement("div");
  countDiv.style.cssText = "padding: 12px 16px; background: #073642; border-radius: 6px; margin-bottom: 16px; border: 1px solid #586e75; color: #2aa198; font-family: 'SF Mono', 'Monaco', monospace;";
  countDiv.innerHTML = `<strong>找到 ${results.length}${results.length === MAX_RESULTS ? '+' : ''} 条结果</strong>`;
  box.appendChild(countDiv);

  results.forEach(b => {
    const div = document.createElement("div");
    div.style.cssText = "padding: 16px; margin: 12px 0; background: #073642; border: 1px solid #586e75; border-left: 4px solid #268bd2; border-radius: 6px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);";
    
    // 添加 hover 效果
    div.addEventListener('mouseenter', function() {
      this.style.borderLeftColor = '#2aa198';
      this.style.background = '#002b36';
      this.style.transform = 'translateX(4px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    div.addEventListener('mouseleave', function() {
      this.style.borderLeftColor = '#268bd2';
      this.style.background = '#073642';
      this.style.transform = 'translateX(0)';
      this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    });
    
    const highlightedTitle = highlightText(b.title || "未知", keywordLower);
    const highlightedAuthor = highlightText(b.author || "未知", keywordLower);
    const highlightedCategory = highlightText(b.category || "", keywordLower);
    
    // 验证和转义链接 URL，防止 javascript: 协议等 XSS 攻击
    let safeLink = "#";
    if (b.link) {
      try {
        const url = new URL(b.link, window.location.origin);
        // 只允许 http、https 协议
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          safeLink = url.href;
        }
      } catch (e) {
        // 如果 URL 解析失败，使用原始链接（可能是相对路径）
        // 但需要转义 HTML 特殊字符
        safeLink = escapeHtml(b.link);
      }
    }
    
    div.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong style="font-size: 16px; color: #93a1a1; font-weight: 600;">${highlightedTitle}</strong>
      </div>
      <div style="color: #657b83; font-size: 14px; margin-bottom: 10px; font-family: 'SF Mono', 'Monaco', monospace;">
        <span>👤 ${highlightedAuthor}</span>
        <span style="margin: 0 10px; color: #586e75;">|</span>
        <span>📂 ${highlightedCategory}</span>
      </div>
      <div>
        <a href="${safeLink}" target="_blank" rel="noopener" style="
          display: inline-block;
          padding: 6px 14px;
          background: #268bd2;
          color: #002b36;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', monospace;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        " onmouseover="this.style.background='#2aa198'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(42, 161, 152, 0.4)';" 
           onmouseout="this.style.background='#268bd2'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.2)';"
        >📥 下载</a>
      </div>
    `;
    box.appendChild(div);
  });
  
  // 添加样式
  if (!document.getElementById('search-results-style')) {
    const style = document.createElement('style');
    style.id = 'search-results-style';
    style.textContent = `
      #search-results mark {
        background: #b58900;
        color: #002b36;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }
}

function onSearch(e) {
  const keyword = e.target.value.trim();
  
  // 检查数据是否已加载
  if (books.length === 0) {
    const box = document.getElementById("search-results");
    box.innerHTML = "<p style='padding: 20px; text-align: center; color: #d73a49;'>⏳ 正在加载书籍数据，请稍候...</p>";
    return;
  }
  
  // 清除之前的定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // 如果输入为空，清空结果
  if (!keyword) {
    document.getElementById("search-results").innerHTML = "";
    return;
  }
  
  // 防抖：300ms 后执行搜索
  searchTimeout = setTimeout(() => {
    const results = searchBooks(keyword);
    console.log(`🔍 搜索 "${keyword}" 找到 ${results.length} 条结果`);
    renderResults(results, keyword);
  }, 300);
}

// 页面加载完成后加载数据
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBooks);
  } else {
    loadBooks();
  }
})();
