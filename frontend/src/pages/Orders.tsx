import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";

// 訂單介面
interface Order {
  id: string;
  type: "subscription" | "upgrade";
  amount: number;
  status: "success" | "pending" | "failed";
  createdAt: string;
  paymentMethod: string;
}

export default function Orders() {
  // TODO: 實作 API 呼叫獲取訂單列表
  const orders: Order[] = [
    {
      id: "ord_001",
      type: "subscription",
      amount: 299,
      status: "success",
      createdAt: "2024-01-15T08:30:00Z",
      paymentMethod: "信用卡",
    },
    {
      id: "ord_002",
      type: "upgrade",
      amount: 199,
      status: "success",
      createdAt: "2024-01-10T15:45:00Z",
      paymentMethod: "LINE Pay",
    },
  ];

  const getStatusBadgeClass = (status: Order["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "success":
        return "付款成功";
      case "pending":
        return "處理中";
      case "failed":
        return "付款失敗";
    }
  };

  const getTypeText = (type: Order["type"]) => {
    switch (type) {
      case "subscription":
        return "月費訂閱";
      case "upgrade":
        return "升級會員";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="text-blue-600 hover:underline text-sm">
              首頁
            </Link>
            <span className="text-gray-400">/</span>
            <Link to="/me" className="text-blue-600 hover:underline text-sm">
              會員中心
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">訂單記錄</span>
          </div>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">訂單記錄</h1>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              匯出記錄
            </Button>
          </div>
        </div>

        {/* 訂閱狀態卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-800">目前方案</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-gray-800">進階會員</p>
              <p className="text-sm text-gray-500 mt-1">每月 NT$299</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-800">下次扣款</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-gray-800">2024/02/15</p>
              <p className="text-sm text-gray-500 mt-1">將自動扣款 NT$299</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-800">付款方式</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-gray-800">信用卡</p>
              <p className="text-sm text-gray-500 mt-1">**** **** **** 1234</p>
            </CardContent>
          </Card>
        </div>

        {/* 訂單列表 */}
        <Card className="bg-white border border-gray-200 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-800">交易紀錄</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-700 font-medium">
                      訂單編號
                    </TableHead>
                    <TableHead className="text-gray-700 font-medium">
                      類型
                    </TableHead>
                    <TableHead className="text-gray-700 font-medium">
                      金額
                    </TableHead>
                    <TableHead className="text-gray-700 font-medium">
                      付款方式
                    </TableHead>
                    <TableHead className="text-gray-700 font-medium">
                      狀態
                    </TableHead>
                    <TableHead className="text-gray-700 font-medium">
                      日期
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-800">
                        {order.id}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {getTypeText(order.type)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        NT${order.amount}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {order.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          詳情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 取消訂閱按鈕 */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            取消訂閱
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            取消訂閱後，您仍可使用到期前的所有功能
          </p>
        </div>
      </div>
    </Layout>
  );
}
