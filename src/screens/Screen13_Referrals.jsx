import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  Users,
  Award,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const Screen13_Referrals = () => {
  const { qrCodes, setTestScanModal, showToast } = useQR();

  const referralQrs = qrCodes.filter((q) => q.type === 'Referral');

  const totalReferralScans = referralQrs.reduce((a, b) => a + (b.metrics?.scans || 0), 0);
  const totalReferralRegs = referralQrs.reduce((a, b) => a + (b.metrics?.verifiedRegistrations || 0), 0);
  const totalReferralOrders = referralQrs.reduce((a, b) => a + (b.metrics?.firstOrders || 0), 0);
  const totalRewardsDisbursed = referralQrs.reduce((a, b) => a + (b.metrics?.earnedRewards || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Referral Flow Rule Banner */}
      <div className="vk-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Referral QR & Customer Acquisition</h2>
            <p className="vk-card-subtitle">
              Connects QR scanning to Village Gramin Executives (VGEs) and customer referral commission tracking
            </p>
          </div>
          <span className="badge badge-active">Anti-Fraud Engine Active</span>
        </div>

        {/* Visual Referral Flow */}
        <div style={{
          marginTop: '16px',
          padding: '14px',
          background: '#E8F5EA',
          border: '1px solid #C8E6C9',
          borderRadius: '10px',
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#006B17', textTransform: 'uppercase', marginBottom: '8px' }}>
            Verified Referral Milestone Sequence:
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '12.5px',
            color: '#111827',
          }}>
            <span>1. QR Scan</span>
            <ArrowRight size={14} color="#00891D" />
            <span>2. Referral Landing Page</span>
            <ArrowRight size={14} color="#00891D" />
            <span>3. App Install / Open</span>
            <ArrowRight size={14} color="#00891D" />
            <span>4. Customer Registration</span>
            <ArrowRight size={14} color="#00891D" />
            <span>5. First Grocery Order</span>
            <ArrowRight size={14} color="#00891D" />
            <span style={{ fontWeight: 700, color: '#00891D' }}>6. Verified Incentive Disbursal</span>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11.5px', color: '#4B5563' }}>
            * Anti-fraud policy: Scans alone never generate rewards. Incentives require verified delivery of customer first order.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Referral Partners</span>
            <div className="kpi-icon"><Users size={18} /></div>
          </div>
          <div className="kpi-value">{referralQrs.length} VGEs</div>
          <div className="kpi-trend trend-up">
            <span>Verified field executives</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Referral Scans</span>
            <div className="kpi-icon"><Smartphone size={18} /></div>
          </div>
          <div className="kpi-value">{totalReferralScans.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span>Customer assisted scans</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Verified App Registrations</span>
            <div className="kpi-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="kpi-value">{totalReferralRegs.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span>{((totalReferralRegs / (totalReferralScans || 1)) * 100).toFixed(1)}% Conversion</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Incentives Disbursed</span>
            <div className="kpi-icon"><Award size={18} /></div>
          </div>
          <div className="kpi-value">₹{totalRewardsDisbursed.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span>{totalReferralOrders} Completed first orders</span>
          </div>
        </div>
      </div>

      {/* Referral Records Table */}
      <div className="vk-card">
        <div className="vk-card-header">
          <h3 className="vk-card-title">Referral Partner Performance Table</h3>
        </div>

        <div className="vk-table-container">
          <table className="vk-table">
            <thead>
              <tr>
                <th>Referral Code & QR ID</th>
                <th>Partner Name & Role</th>
                <th>Assigned Hub & Village</th>
                <th>Status</th>
                <th>Scans</th>
                <th>Verified Reg.</th>
                <th>First Orders</th>
                <th>Eligible Commission</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referralQrs.map((ref) => (
                <tr key={ref.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#00891D', fontFamily: 'monospace' }}>
                      {ref.referralCode || 'VGE-REF-902'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{ref.id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{ref.owner}</div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{ref.referralRole || 'VGE Field Agent'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ref.hubName}</div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{ref.village}</div>
                  </td>
                  <td>
                    <span className="badge badge-active">{ref.status}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{(ref.metrics?.scans || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: '#00891D' }}>
                    {(ref.metrics?.verifiedRegistrations || 0).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 700, color: '#00A322' }}>
                    {(ref.metrics?.firstOrders || 0).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#111827' }}>
                      ₹{(ref.metrics?.earnedRewards || (ref.metrics?.firstOrders || 0) * 50).toLocaleString()}
                    </span>
                    <div style={{ fontSize: '10.5px', color: '#00891D', fontWeight: 600 }}>Eligible & Disbursed</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setTestScanModal({ isOpen: true, qrCode: ref })}
                      className="btn btn-secondary btn-sm"
                    >
                      <Smartphone size={13} color="#00891D" />
                      Test Scan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
