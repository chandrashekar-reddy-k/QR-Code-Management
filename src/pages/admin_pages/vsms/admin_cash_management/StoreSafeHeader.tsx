// @ts-nocheck

import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { 
  Coins, AlertTriangle, User, CheckCircle2, Plus, Vault, Building2, Moon, 
  Pencil, ShoppingCart, Clock, Smartphone, Zap, ArrowRight, AlertCircle,
  FileText, Download, Printer, Loader2, Calendar, ArrowLeft, Wallet,
  CreditCard, TrendingUp, ArrowDownLeft, Filter, RotateCcw, ChevronDown,
  Info, ShieldCheck, Check
} from 'lucide-react';

const StoreSafeHeader = ({ 
  storeRegisterData, summaries, user, storeLoading, posHistory = [],
  handleExportPDF,
  setShowOpenStoreModal, setShowDepositModal, setShowSafeMovementModal, 
  setShowBankModal, setShowCloseStoreModal, setShowEditStoreModal,
  setSafeMovementData, setBankData, setStoreDenomData,
  isShiftDeposited, setActiveTab,
  setEditingDeposit, setDepositData, setShowEditDepositModal,
  handleDeleteDeposit, toast, can, canViewCashSection,
  headerTab, setHeaderTab, availableHeaderTabs,
  date, setDate, searchTerm, setSearchTerm
}) => {
  const [showFullReport, setShowFullReport] = useState(false);
  const dateInputRef = useRef(null);

  if (storeLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-36 bg-gray-100 rounded-lg" />
            <div className="h-10 w-36 bg-gray-100 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const reg = storeRegisterData?.storeRegister;
  const isStoreOpen = reg?.status === 'OPEN';
  const openedByName = reg?.openedBy?.name || user?.name || 'Admin User';
  const openingCashAmount = reg?.openingCash || 0;
  const counterCashAvailable = storeRegisterData?.liveMetrics?.availableCash || 0;
  const bankTransferredAmount = storeRegisterData?.liveMetrics?.bankTransferred || 0;
  const expensesAmount = storeRegisterData?.liveMetrics?.totalStoreExpensesCash || 0;

  // Safekeeping shift amounts
  const depositS1 = storeRegisterData?.storeDeposits?.find(d => d.shift === 1);
  const depositS2 = storeRegisterData?.storeDeposits?.find(d => d.shift === 2);
  const expectedS1 = storeRegisterData?.shiftCollections?.find(c => c.shift === 1)?._sum?.actualCash || 0;
  const expectedS2 = storeRegisterData?.shiftCollections?.find(c => c.shift === 2)?._sum?.actualCash || 0;

  const amountS1 = depositS1 ? depositS1.amount : expectedS1;
  const amountS2 = depositS2 ? depositS2.amount : expectedS2;

  // Agent inflow / outflow
  const agentInflow = storeRegisterData?.liveMetrics?.receivedIn || 0;
  const agentOutflow = storeRegisterData?.liveMetrics?.assignedOut || 0;

  // Safe metrics
  const safeBalance = storeRegisterData?.liveMetrics?.safeBalance || 0;
  const totalSafeCash = safeBalance + counterCashAvailable;

  // POS metrics
  const posUpi = storeRegisterData?.liveMetrics?.totalStoreSalesUPI || 0;
  const posCash = storeRegisterData?.liveMetrics?.totalStoreSalesCash || 0;
  const posCard = storeRegisterData?.liveMetrics?.totalStoreSalesCard || 0;
  const posCredit = storeRegisterData?.liveMetrics?.totalStoreSalesCredit || 0;
  const posGrandTotal = storeRegisterData?.liveMetrics?.totalStoreSalesGrandTotal ?? (posUpi + posCash + posCard + posCredit);

  // Online Orders metrics
  const onlineUpi = storeRegisterData?.liveMetrics?.totalOnlineSalesUPI || 0;
  const onlineCash = storeRegisterData?.liveMetrics?.totalOnlineSalesCash || 0;
  const onlineCard = storeRegisterData?.liveMetrics?.totalOnlineSalesCard || 0;
  const onlineCredit = storeRegisterData?.liveMetrics?.totalOnlineSalesCredit || 0;
  const onlineGrandTotal = storeRegisterData?.liveMetrics?.totalOnlineGrandTotal ?? (onlineUpi + onlineCash + onlineCard + onlineCredit);

  const handleResetFilters = () => {
    if (setDate) setDate(format(new Date(), 'yyyy-MM-dd'));
    if (setSearchTerm) setSearchTerm('');
    if (setHeaderTab) setHeaderTab('Agent');
    if (toast) toast.success('Filters reset to default');
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if (dateInputRef.current.showPicker) {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Store Cash Container Card ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {/* Top title and action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Store Cash</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1">
              <span className={`inline-flex items-center gap-1 ${isStoreOpen ? 'text-emerald-700' : 'text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                {isStoreOpen ? 'Active' : 'Closed'}
              </span>
              <span>·</span>
              <span>Opened By {openedByName}</span>
              <span>·</span>
              <span>Opening: ₹{openingCashAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStoreOpen ? (
              <>
                {canViewCashSection('SHIFT_DEPOSITS') && (
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="bg-[#0e8345] hover:bg-[#0c6f3a] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center"
                  >
                    Deposit Shift Cash
                  </button>
                )}
                {canViewCashSection('STORE_CLOSURE') && (
                  <button
                    onClick={() => setShowCloseStoreModal(true)}
                    className="bg-[#e02424] hover:bg-[#c81e1e] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center"
                  >
                    Closing Store
                  </button>
                )}
              </>
            ) : (
              canViewCashSection('CASH_OPENING') && (
                <button
                  onClick={() => setShowOpenStoreModal(true)}
                  className="bg-[#0e8345] hover:bg-[#0c6f3a] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center"
                >
                  Initialize Store Safe
                </button>
              )
            )}
          </div>
        </div>

        {/* Cash Register Opening Mismatch Alert (if applicable) */}
        {(() => {
          if (!isStoreOpen) return null;
          const todayOpening = reg?.openingCash || 0;
          let priorClosingAmount;
          let priorLabel;

          if (reg?.lastClosingCash !== null && reg?.lastClosingCash !== undefined) {
            priorClosingAmount = reg.lastClosingCash;
            priorLabel = "today's previous closing balance";
          } else {
            const prior = storeRegisterData?.previousRegister;
            if (!prior) return null;
            priorClosingAmount = (prior.actualClosingCash !== null && prior.actualClosingCash !== undefined)
              ? prior.actualClosingCash
              : (prior.openingCash || 0);
            priorLabel = "yesterday's closing balance";
          }

          const diff = Math.abs(todayOpening - priorClosingAmount);
          if (diff <= 0.01) return null;

          return (
            <div className={`mt-5 p-4 border rounded-xl flex items-center gap-3 shadow-xs ${reg?.openingRemarks ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <AlertTriangle size={20} className={`shrink-0 ${reg?.openingRemarks ? 'text-amber-600' : 'text-rose-600'}`} />
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-bold uppercase tracking-wide">
                  {reg?.openingRemarks ? 'Opening Mismatch Acknowledged' : 'Cash Register Opening Mismatch'}
                </span>
                <span>
                  You opened the storecash with <span className="font-bold">₹{todayOpening.toLocaleString()}</span>; {priorLabel} was <span className="font-bold">₹{priorClosingAmount.toLocaleString()}</span> (Difference: <span className="font-bold">₹{diff.toLocaleString()}</span>).
                </span>
                {reg?.openingRemarks && (
                  <span className="italic text-amber-700 mt-0.5">
                    &ldquo;{reg.openingRemarks}&rdquo;
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── 4 Primary Metric Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Opening Cash */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs font-medium text-gray-500">Opening Cash</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  ₹{openingCashAmount.toLocaleString()}
                </span>
                {(canViewCashSection('CASH_OPENING') || can('CASH', 'UPDATE', 'STORE_SAFE')) && isStoreOpen && (
                  <button
                    onClick={() => {
                      setStoreDenomData({
                        amount: openingCashAmount,
                        remarks: reg?.openingRemarks || '',
                        denominations: reg?.openingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                      });
                      setShowEditStoreModal(true);
                    }}
                    title="Edit Opening Cash"
                    className="text-emerald-600 hover:text-emerald-700 p-0.5 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
              <Wallet size={20} strokeWidth={2} />
            </div>
          </div>

          {/* Card 2: Counter Cash Available */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs font-medium text-gray-500">Counter Cash Available</span>
              <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                ₹{counterCashAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#fef3e7] flex items-center justify-center text-[#f2994a]">
              <CreditCard size={20} strokeWidth={2} />
            </div>
          </div>

          {/* Card 3: Bank Transfer */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs font-medium text-gray-500">Bank Transfer</span>
              <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                ₹{bankTransferredAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#edf2fe] flex items-center justify-center text-[#5873e8]">
              <Building2 size={20} strokeWidth={2} />
            </div>
          </div>

          {/* Card 4: Expenses */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs font-medium text-gray-500">Expenses</span>
              <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                ₹{expensesAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* ── Today's Shift Safekeeping ────────────────────────────── */}
        {canViewCashSection('SHIFT_SAFEKEEPING') && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3.5 tracking-tight">Today's Shift Safekeeping</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shift 1 Card */}
              <div 
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  depositS1
                    ? 'border-emerald-500 bg-white ring-1 ring-emerald-500/20 shadow-xs'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#0e8345] text-white font-bold flex items-center justify-center text-base shadow-xs">
                    S1
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 tracking-tight">
                      ₹{amountS1.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      {depositS1 ? (depositS1.description || 'Consolidated deposit S1') : (expectedS1 > 0 ? 'Pending Deposit' : 'No collection report')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {depositS1 ? (
                    <>
                      <span className="px-3 py-1 bg-[#fff7e6] text-[#b7791f] border border-[#fde68a] rounded-full text-xs font-semibold">
                        Deposited
                      </span>
                      {can('CASH', 'UPDATE', 'SHIFT_DEPOSITS') && (
                        <button
                          onClick={() => {
                            setEditingDeposit(depositS1);
                            setDepositData({
                              shift: depositS1.shift,
                              description: depositS1.description,
                              amount: depositS1.amount,
                              denominations: depositS1.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                            });
                            setShowEditDepositModal(true);
                          }}
                          className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Edit S1 Deposit"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <span className="p-1 text-emerald-600" title="Deposit details">
                        <AlertCircle size={15} />
                      </span>
                    </>
                  ) : (
                    <span className="px-3 py-1 bg-[#fee2e2] text-[#ef4444] border border-[#fca5a5] rounded-full text-xs font-semibold">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Shift 2 Card */}
              <div 
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  depositS2
                    ? 'border-emerald-500 bg-white ring-1 ring-emerald-500/20 shadow-xs'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl font-bold flex items-center justify-center text-base shadow-xs ${
                    depositS2 ? 'bg-[#0e8345] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    S2
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 tracking-tight">
                      ₹{amountS2.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      {depositS2 ? (depositS2.description || 'Consolidated deposit S2') : (expectedS2 > 0 ? 'Pending Deposit' : 'No collection report')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {depositS2 ? (
                    <>
                      <span className="px-3 py-1 bg-[#fff7e6] text-[#b7791f] border border-[#fde68a] rounded-full text-xs font-semibold">
                        Deposited
                      </span>
                      {can('CASH', 'UPDATE', 'SHIFT_DEPOSITS') && (
                        <button
                          onClick={() => {
                            setEditingDeposit(depositS2);
                            setDepositData({
                              shift: depositS2.shift,
                              description: depositS2.description,
                              amount: depositS2.amount,
                              denominations: depositS2.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                            });
                            setShowEditDepositModal(true);
                          }}
                          className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Edit S2 Deposit"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <span className="p-1 text-emerald-600" title="Deposit details">
                        <AlertCircle size={15} />
                      </span>
                    </>
                  ) : (
                    <span className="px-3 py-1 bg-[#fee2e2] text-[#ef4444] border border-[#fca5a5] rounded-full text-xs font-semibold">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Sub-Modules Tabs & Filter Bar ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Segmented Tabs */}
        <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
          {availableHeaderTabs.map((tab) => {
            const isActive = headerTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setHeaderTab(tab.key)}
                className={`px-5 py-2.5 text-xs font-semibold relative transition-colors border-r border-gray-200 last:border-r-0 ${
                  isActive 
                    ? 'text-[#0e8345] font-bold bg-white' 
                    : 'text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50/80'
                }`}
              >
                {tab.label || tab.key}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e8345] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Filter Controls */}
        <div className="flex items-center gap-2.5">
          {/* Filter icon button */}
          <button 
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-xs transition-colors"
            title="Filters"
          >
            <Filter size={16} />
          </button>

          {/* Reset Filter button */}
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-[#f2994a] hover:bg-amber-50/50 shadow-xs transition-colors"
          >
            <RotateCcw size={14} className="text-[#f2994a]" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>

      {/* ── 3. Sub-Module Content Panels ────────────────────────────── */}

      {/* TAB 1: Agent Cash (Screenshot 1) */}
      {headerTab === 'Agent' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs animate-in fade-in duration-300">
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Agent Cash</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
              <span className={`inline-flex items-center gap-1 ${isStoreOpen ? 'text-gray-600' : 'text-gray-400'}`}>
                {isStoreOpen ? 'Active' : 'Closed'}
              </span>
              <span>·</span>
              <span>Opened By {openedByName}</span>
              <span>·</span>
              <span>Float Dispatched: ₹{agentOutflow.toLocaleString()}</span>
              <span>·</span>
              <span>Collected: ₹{agentInflow.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Agent Inflow */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Agent Inflow</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{agentInflow.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <ArrowDownLeft size={22} strokeWidth={2.5} />
              </div>
            </div>

            {/* Agent Outflow */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Agent Outflow</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{agentOutflow.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <TrendingUp size={22} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Safe (Store Chest) (Screenshot 2) */}
      {headerTab === 'Safe' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Store Chest (Safe)</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
                <span className={`inline-flex items-center gap-1 ${isStoreOpen ? 'text-gray-600' : 'text-gray-400'}`}>
                  {isStoreOpen ? 'Active' : 'Closed'}
                </span>
                <span>·</span>
                <span>Opened By {openedByName}</span>
                <span>·</span>
                <span>Safe Balance: ₹{safeBalance.toLocaleString()}</span>
                <span>·</span>
                <span>Transferred: ₹{bankTransferredAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {can('CASH', 'CREATE', 'SAFE_CONTROL') && (
                <button
                  onClick={() => {
                    setBankData(prev => ({ ...prev, adminId: user?.id, depositedBy: user?.name || '' }));
                    setShowBankModal(true);
                  }}
                  className="bg-[#0e8345] hover:bg-[#0c6f3a] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  Bank Transfer
                </button>
              )}
              {can('CASH', 'CREATE', 'SAFE_CONTROL') && (
                <button
                  onClick={() => {
                    setSafeMovementData({ amount: '', type: 'DEPOSIT', description: '', denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 } });
                    setShowSafeMovementModal(true);
                  }}
                  className="bg-[#0e8345] hover:bg-[#0c6f3a] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  Move to Safe
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Safe Balance */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Safe Balance</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{safeBalance.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <Wallet size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Counter Cash Available */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Counter Cash Available</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{counterCashAvailable.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#fef3e7] flex items-center justify-center text-[#f2994a]">
                <CreditCard size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total Cash */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total Cash</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{(safeBalance + counterCashAvailable).toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <Wallet size={20} strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POS Sales Summary (Screenshot 3) */}
      {headerTab === 'POS' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs animate-in fade-in duration-300">
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Aggregate Daily Sales Summary (POS)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total Pos UPI */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total Pos UPI</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{posUpi.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <Wallet size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total POS Cash */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total POS Cash</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{posCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#edf2fe] flex items-center justify-center text-[#5873e8]">
                <Coins size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total POS Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total POS Card</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{posCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <CreditCard size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total POS Credit */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total POS Credit</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{posCredit.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#f3e8ff] flex items-center justify-center text-[#9333ea]">
                <CreditCard size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Grand Total Sales */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Grand Total Sales</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{posGrandTotal.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <TrendingUp size={20} strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Online Orders Summary (Screenshot 4) */}
      {headerTab === 'Online Orders' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs animate-in fade-in duration-300">
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Online Sales Sales Summary</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total Online UPI */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total Online UPI</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{onlineUpi.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <Wallet size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total Online Cash */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total Online Cash</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{onlineCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#edf2fe] flex items-center justify-center text-[#5873e8]">
                <Coins size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total Online Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total Online Card</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{onlineCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <CreditCard size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Total Online Credit */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Total Online Credit</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{onlineCredit.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#f3e8ff] flex items-center justify-center text-[#9333ea]">
                <CreditCard size={20} strokeWidth={2} />
              </div>
            </div>

            {/* Grand Total Sales */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-medium text-gray-500">Grand Total Sales</span>
                <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                  ₹{onlineGrandTotal.toLocaleString()}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#e8f8f0] flex items-center justify-center text-[#0e8345]">
                <TrendingUp size={20} strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSafeHeader;
