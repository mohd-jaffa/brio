"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { AppShell } from "@/shared/components/AppShell";
import { BarChart3, CircleDollarSign, ArrowDownRight, ArrowUpRight, Award } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Order } from "@/modules/orders/orders.types";
import { type Expense } from "@/modules/expenses/expenses.types";

export default function AnalyticsPage() {
  const { data: orders, isLoading: isLoadingOrders } = useSWR<Order[]>("/api/orders", fetcher);
  const { data: expenses, isLoading: isLoadingExpenses } = useSWR<Expense[]>("/api/expenses", fetcher);

  const isLoading = isLoadingOrders || isLoadingExpenses;

  const metrics = useMemo(() => {
    if (!orders || !expenses) return { revenue: 0, cost: 0, profit: 0, topProducts: [] };

    let revenue = 0;
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};

    orders.forEach(o => {
      if (o.status !== 'CANCELLED') {
        revenue += o.pricing.total;
        
        o.items.forEach(item => {
          if (!productSales[item.productId || 'unknown']) {
            productSales[item.productId || 'unknown'] = { name: item.productName, quantity: 0, revenue: 0 };
          }
          productSales[item.productId || 'unknown'].quantity += item.quantity;
          productSales[item.productId || 'unknown'].revenue += item.subtotal;
        });
      }
    });

    let cost = 0;
    expenses.forEach(e => {
      cost += e.amount;
    });

    const profit = revenue - cost;

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { revenue, cost, profit, topProducts };
  }, [orders, expenses]);

  const formatCurrency = (paise: number) => `₹${(Math.abs(paise) / 100).toLocaleString('en-IN')}`;

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8 max-w-4xl mx-auto">
        
        {/* Header */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2 mb-1">
            <BarChart3 size={28} className="text-primary" strokeWidth={2.5} />
            Analytics
          </h2>
          <p className="text-sm text-text-muted font-medium">
            Financial overview and performance metrics
          </p>
        </section>

        {isLoading ? (
          <div className="space-y-6">
            <div className="h-32 bg-surface rounded-2xl animate-pulse" />
            <div className="h-64 bg-surface rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Top Level Financials */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Revenue</span>
                  <div className="p-1.5 rounded-lg bg-success/10 text-success">
                    <ArrowUpRight size={16} strokeWidth={3} />
                  </div>
                </div>
                <span className="text-3xl font-bold font-heading text-text">
                  {formatCurrency(metrics.revenue)}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Expenses</span>
                  <div className="p-1.5 rounded-lg bg-danger/10 text-danger">
                    <ArrowDownRight size={16} strokeWidth={3} />
                  </div>
                </div>
                <span className="text-3xl font-bold font-heading text-text">
                  {formatCurrency(metrics.cost)}
                </span>
              </div>

              <div className={`p-5 rounded-2xl border shadow-card flex flex-col justify-between ${
                metrics.profit >= 0 
                  ? 'bg-gradient-to-br from-success/10 to-success/5 border-success/20' 
                  : 'bg-gradient-to-br from-danger/10 to-danger/5 border-danger/20'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${metrics.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    Net Profit
                  </span>
                  <div className={`p-1.5 rounded-lg ${metrics.profit >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    <CircleDollarSign size={16} strokeWidth={3} />
                  </div>
                </div>
                <span className={`text-3xl font-bold font-heading ${metrics.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {metrics.profit < 0 ? '-' : ''}{formatCurrency(metrics.profit)}
                </span>
              </div>
            </section>

            {/* Top Products */}
            <section className="p-6 rounded-3xl bg-surface border border-border shadow-card">
              <div className="flex items-center gap-2 mb-6">
                <Award size={20} className="text-warning" strokeWidth={2.5} />
                <h3 className="text-sm font-bold font-heading text-text uppercase tracking-wider">
                  Top Selling Products
                </h3>
              </div>
              
              {metrics.topProducts.length === 0 ? (
                <div className="text-center py-8 text-sm text-text-muted font-medium">
                  No sales data available yet.
                </div>
              ) : (
                <ul className="space-y-4">
                  {metrics.topProducts.map((product, index) => {
                    const maxRevenue = metrics.topProducts[0].revenue;
                    const percentage = (product.revenue / maxRevenue) * 100;
                    
                    return (
                      <li key={index} className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-end mb-1">
                            <span className="font-bold text-sm text-text truncate">{product.name}</span>
                            <span className="font-bold font-heading text-sm text-primary shrink-0">{formatCurrency(product.revenue)}</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-background border border-border overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-text-muted font-bold tracking-wider mt-1 block">
                            {product.quantity} units sold
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
