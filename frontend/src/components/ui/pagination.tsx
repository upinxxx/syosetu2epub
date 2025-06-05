import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showItemsPerPage?: boolean;
  showTotalItems?: boolean;
  className?: string;
  disabled?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showTotalItems = true,
  className,
  disabled = false,
}: PaginationProps) {
  // 計算顯示的頁碼範圍
  const getVisiblePages = () => {
    const delta = 2; // 當前頁面前後顯示的頁數
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    if (disabled || !onItemsPerPageChange) return;
    const newItemsPerPage = parseInt(value, 10);
    onItemsPerPageChange(newItemsPerPage);
  };

  if (totalPages <= 1 && !showTotalItems && !showItemsPerPage) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 px-2 py-4",
        className
      )}
    >
      {/* 左側：每頁顯示數量控制 */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>每頁顯示</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>項</span>
        </div>
      )}

      {/* 中央：分頁控制 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 第一頁 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={disabled || currentPage === 1}
            className="h-8 w-8 p-0"
            title="第一頁"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* 上一頁 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            className="h-8 w-8 p-0"
            title="上一頁"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* 頁碼 */}
          {visiblePages.map((page, index) => {
            if (page === "...") {
              return (
                <span key={`dots-${index}`} className="px-2 py-1 text-gray-500">
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isCurrentPage = pageNumber === currentPage;

            return (
              <Button
                key={pageNumber}
                variant={isCurrentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNumber)}
                disabled={disabled}
                className={cn(
                  "h-8 w-8 p-0",
                  isCurrentPage && "bg-primary text-primary-foreground"
                )}
              >
                {pageNumber}
              </Button>
            );
          })}

          {/* 下一頁 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            className="h-8 w-8 p-0"
            title="下一頁"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* 最後一頁 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled || currentPage === totalPages}
            className="h-8 w-8 p-0"
            title="最後一頁"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 右側：總項目數顯示 */}
      {showTotalItems && (
        <div className="text-sm text-gray-600">共 {totalItems} 項</div>
      )}
    </div>
  );
}

export default Pagination;
