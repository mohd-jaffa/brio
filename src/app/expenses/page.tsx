"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { AppShell } from "@/shared/components/AppShell";
import { Plus, CircleDollarSign, Edit2, Calendar } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Expense } from "@/features/expenses/types";
import { ExpenseFormSheet } from "@/features/expenses/components/ExpenseFormSheet";

export default function ExpensesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const { data: expenses, error, isLoading, mutate } = useSWR<Expense[]>("/api/expenses", fetcher);

  const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingExpense(undefined);
    setIsFormOpen(true);
  };

  // Group expenses by Month (e.g. "Sep 2026")
  const groupedExpenses = useMemo(() => {
    if (!expenses) return {};
    
    return expenses.reduce((groups, expense) => {
      const date = new Date(expense.expenseDate);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(expense);
      return groups;
    }, {} as Record<string, Expense[]>);
  }, [expenses]);

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        
        {/* Header & Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2">
              <CircleDollarSign size={28} className="text-danger" strokeWidth={2.5} />
              Expenses
            </h2>
            <p className="text-sm text-text-muted mt-1 font-medium">
              Track your outgoing costs
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="touch-target flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-danger text-white font-bold text-sm hover:bg-danger/90 active:scale-[0.98] transition-all shadow-md shrink-0"
          >
            <Plus size={18} strokeWidth={3} /> Add Expense
          </button>
        </section>

        {/* State Handling & List */}
        <section>
          {error && (
            <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
              Failed to load expenses. Please try again.
            </div>
          )}

          {isLoading && !expenses && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && expenses?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                <CircleDollarSign size={32} className="text-text-muted/40" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold font-heading text-text mb-1">No expenses recorded</h3>
              <p className="text-sm text-text-muted max-w-sm mb-6">
                Start tracking your ingredient and packaging costs here.
              </p>
              <button
                onClick={handleAddNew}
                className="touch-target flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-danger/10 text-danger font-bold text-sm hover:bg-danger/20 active:scale-[0.98] transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Record First Expense
              </button>
            </div>
          )}

          {expenses && expenses.length > 0 && (
            <div className="space-y-8">
              {Object.entries(groupedExpenses).map(([month, monthExpenses]) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider pl-1">
                    {month}
                  </h3>
                  <ul className="space-y-3" role="list">
                    {monthExpenses.map(expense => (
                      <li key={expense.id}>
                        <article className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm hover:bg-surface-hover hover:shadow-md active:scale-[0.99] transition-all group">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Category Initial */}
                            <div className="w-10 h-10 rounded-full bg-danger/10 text-danger font-bold text-sm flex items-center justify-center border border-danger/20 shrink-0">
                              {expense.category.charAt(0)}
                            </div>
                            
                            <div className="min-w-0 pr-2">
                              <h3 className="font-bold text-sm text-text leading-tight mb-0.5 truncate">
                                {expense.description}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} strokeWidth={3} />
                                  {new Date(expense.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                <span>•</span>
                                <span>{expense.category}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="font-bold font-heading text-base text-danger leading-none">
                              {formatCurrency(expense.amount)}
                            </span>
                            
                            <button 
                              onClick={() => handleEdit(expense)}
                              className="touch-target text-text-muted hover:text-text p-1 active:scale-95 transition-transform"
                            >
                              <Edit2 size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ExpenseFormSheet 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => mutate()} 
        initialData={editingExpense}
      />
    </AppShell>
  );
}
