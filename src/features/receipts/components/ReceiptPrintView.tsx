"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";

import { UI_TEXT } from "@/constants/messages";
import { dayKey } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { type ReceiptData } from "@/features/receipts/types";

interface ReceiptPrintViewProps {
  receipt: ReceiptData;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
}

export function ReceiptPrintView({ receipt, customerName, customerPhone, onClose }: ReceiptPrintViewProps) {
  const { order, items, payments, bakeryName, generatedAt } = receipt;

  const handlePrint = () => window.print();

  // Prevent background scrolling while receipt is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Receipt Container - The only thing visible during print */}
      <div className="relative w-full max-w-md bg-white rounded-none sm:rounded-2xl shadow-elevated flex flex-col max-h-[95dvh] print:max-h-none print:shadow-none print:rounded-none print:absolute print:inset-0 print:bg-white overflow-hidden">
        
        {/* Actions Bar (Hidden on print) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 print:hidden shrink-0">
          <button 
            onClick={onClose}
            aria-label={UI_TEXT.actions.close}
            className="p-2 text-gray-500 hover:text-black hover:bg-gray-200 rounded-full transition-all duration-200 active:scale-95"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={handlePrint}
            aria-label="Print receipt"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <Printer size={16} strokeWidth={2.5} /> Print Receipt
          </button>
        </div>

        {/* Printable Area */}
        <div id="receipt-print-area" className="p-8 overflow-y-auto print:overflow-visible bg-white text-black font-mono border-t border-gray-100 print:border-none">
          
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-dashed border-gray-200 print:border-black pb-6">
            <h1 className="text-3xl font-bold font-heading mb-1">{bakeryName}</h1>
            <p className="text-sm text-gray-500 uppercase tracking-widest">Receipt</p>
          </div>

          {/* Meta Info */}
          <div className="flex justify-between items-start text-xs sm:text-sm mb-6">
            <div>
              <p className="text-gray-500 uppercase tracking-wider mb-1 text-[10px]">Order Number</p>
              <p className="font-bold">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 uppercase tracking-wider mb-1 text-[10px]">Date</p>
              <p className="font-bold">{formatDate(dayKey(order.createdAt))}</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-gray-500 uppercase tracking-wider mb-1 text-[10px]">Billed To</p>
            <p className="font-bold">{customerName || "Walk-in Customer"}</p>
            {customerPhone && <p className="text-sm">{customerPhone}</p>}
          </div>

          {/* Line Items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200 print:border-black">
                <th className="py-2 text-left font-bold w-3/5">Item</th>
                <th className="py-2 text-right font-bold w-1/5">Qty</th>
                <th className="py-2 text-right font-bold w-1/5">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className={index !== items.length - 1 ? 'border-b border-dashed border-gray-200' : ''}>
                  <td className="py-3 font-medium text-gray-800">{item.productName}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right font-bold">{formatPaise(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Box */}
          <div className="bg-gray-50/50 print:bg-gray-50 p-4 border border-gray-200 print:border-black mb-8 rounded-xl print:rounded-none">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal</span>
                <span>{formatPaise(order.pricing.subtotal)}</span>
              </div>

              {order.adjustments.map(adj => (
                <div key={adj.id} className="flex justify-between items-center">
                  <span>{adj.name}</span>
                  <span className={adj.type === 'DISCOUNT' ? 'text-gray-500' : ''}>
                    {adj.type === 'DISCOUNT' ? '-' : '+'}{formatPaise(adj.amount)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center text-gray-600">
                <span>Tax</span>
                <span>{formatPaise(order.pricing.tax)}</span>
              </div>
              
              <div className="pt-2 mt-2 border-t border-gray-200 print:border-black flex justify-between items-center text-lg font-bold">
                <span>TOTAL</span>
                <span>{formatPaise(order.pricing.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p className="uppercase tracking-widest font-bold text-black mb-2">Thank you!</p>
            {payments.length > 0 && payments.map(p => (
              <p key={p.id}>Payment: {p.payment_method} ({formatPaise(p.amount)})</p>
            ))}
            {order.payment.reference && <p>Ref: {order.payment.reference}</p>}
            <p className="mt-4 pt-4 border-t border-dashed border-gray-300 text-[10px]">Generated at {formatDateTime(generatedAt)}</p>
          </div>

        </div>
      </div>
      
      {/* Global styles for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
