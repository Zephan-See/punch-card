import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-2">😵 出错了</h2>
            <p className="text-sm text-gray-600 mb-4">页面意外崩溃。试试下面的操作：</p>
            <pre className="text-[10px] bg-gray-100 rounded p-2 overflow-auto max-h-40 mb-4 text-red-600">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={() => { location.reload(); }}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
              >
                刷新页面
              </button>
              <button
                onClick={() => { localStorage.clear(); location.href = '/login'; }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm"
              >
                清缓存重登
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
