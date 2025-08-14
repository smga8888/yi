import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 防止页面刷新时出现循环加载问题
let hasRendered = false;

// React 18+ 渲染方法
const renderApp = () => {
  if (hasRendered) return;
  hasRendered = true;

  const container = document.getElementById('root');
  // 确保DOM元素存在
  if (!container) {
    console.error('Root element not found');
    return;
  }

  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// 确保DOM完全加载后再渲染
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

// 处理错误
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // 可以在这里添加错误上报逻辑
});