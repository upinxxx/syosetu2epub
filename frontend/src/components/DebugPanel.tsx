import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Trash2,
  RefreshCw,
  Bug,
  Search,
  Copy,
  X,
  Filter,
} from "lucide-react";
import { debug, DebugLevel, type LogEntry } from "@/lib/debug.js";

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<DebugLevel>(
    DebugLevel.DEBUG
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // 刷新日誌數據
  const refreshLogs = () => {
    const allLogs = debug.getLogs();
    setLogs(allLogs);
  };

  // 自動刷新日誌
  useEffect(() => {
    if (!isOpen) return;

    refreshLogs();

    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh]);

  // 過濾日誌
  useEffect(() => {
    let filtered = logs;

    // 按級別過濾
    filtered = filtered.filter((log) => log.level <= selectedLevel);

    // 按分類過濾
    if (selectedCategory) {
      filtered = filtered.filter(
        (log) =>
          log.category === selectedCategory ||
          log.category.includes(selectedCategory)
      );
    }

    // 按搜索詞過濾
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(term) ||
          log.category.toLowerCase().includes(term) ||
          JSON.stringify(log.data || {})
            .toLowerCase()
            .includes(term)
      );
    }

    setFilteredLogs(filtered.slice(-100)); // 限制顯示數量
  }, [logs, selectedLevel, selectedCategory, searchTerm]);

  // 獲取所有分類
  const categories = Array.from(
    new Set(logs.map((log) => log.category))
  ).sort();

  // 獲取級別名稱
  const getLevelName = (level: DebugLevel): string => {
    switch (level) {
      case DebugLevel.ERROR:
        return "ERROR";
      case DebugLevel.WARN:
        return "WARN";
      case DebugLevel.INFO:
        return "INFO";
      case DebugLevel.DEBUG:
        return "DEBUG";
      case DebugLevel.VERBOSE:
        return "VERBOSE";
      default:
        return "NONE";
    }
  };

  // 獲取級別顏色
  const getLevelColor = (level: DebugLevel): string => {
    switch (level) {
      case DebugLevel.ERROR:
        return "bg-red-500";
      case DebugLevel.WARN:
        return "bg-yellow-500";
      case DebugLevel.INFO:
        return "bg-blue-500";
      case DebugLevel.DEBUG:
        return "bg-green-500";
      case DebugLevel.VERBOSE:
        return "bg-gray-500";
      default:
        return "bg-gray-300";
    }
  };

  // 導出日誌
  const exportLogs = () => {
    const data = debug.exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `syosetu2epub-debug-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 清除日誌
  const clearLogs = () => {
    debug.clearLogs();
    refreshLogs();
  };

  // 複製日誌條目
  const copyLogEntry = (log: LogEntry) => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // 可以添加提示信息
      })
      .catch((err) => {
        console.error("複製失敗:", err);
      });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bug className="w-5 h-5" />
            調試面板 ({filteredLogs.length} 條日誌)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 控制面板 */}
          <div className="flex flex-wrap gap-3 items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">級別:</Label>
              <select
                value={selectedLevel.toString()}
                onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={DebugLevel.ERROR.toString()}>ERROR</option>
                <option value={DebugLevel.WARN.toString()}>WARN</option>
                <option value={DebugLevel.INFO.toString()}>INFO</option>
                <option value={DebugLevel.DEBUG.toString()}>DEBUG</option>
                <option value={DebugLevel.VERBOSE.toString()}>VERBOSE</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">分類:</Label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">全部分類</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="搜索日誌..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                id="auto-refresh"
                className="w-4 h-4"
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                自動刷新
              </Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshLogs}
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              title="導出"
            >
              <Download className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              title="清除"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* 統計信息 */}
          <div className="flex gap-4">
            <div className="text-sm">
              <span className="font-medium">總數:</span> {logs.length}
            </div>
            <div className="text-sm">
              <span className="font-medium">錯誤:</span>
              <span className="text-red-600 font-bold ml-1">
                {logs.filter((log) => log.level === DebugLevel.ERROR).length}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">警告:</span>
              <span className="text-yellow-600 font-bold ml-1">
                {logs.filter((log) => log.level === DebugLevel.WARN).length}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">信息:</span>
              <span className="text-blue-600 font-bold ml-1">
                {logs.filter((log) => log.level === DebugLevel.INFO).length}
              </span>
            </div>
          </div>

          {/* 日誌列表 */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <div className="space-y-1 p-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="border rounded p-3 text-sm hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-white text-xs ${getLevelColor(
                          log.level
                        )}`}
                      >
                        {getLevelName(log.level)}
                      </Badge>
                      <Badge variant="outline">{log.category}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLogEntry(log)}
                      className="h-6 w-6 p-0"
                      title="複製日誌"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="font-medium mb-2 text-gray-800">
                    {log.message}
                  </div>
                  {log.data && (
                    <div className="bg-gray-100 rounded p-2 overflow-auto max-h-40">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Filter className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <div>沒有符合條件的日誌記錄</div>
                  <div className="text-xs mt-1">
                    嘗試調整篩選條件或清除搜索詞
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
