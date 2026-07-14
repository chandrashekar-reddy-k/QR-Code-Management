import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Package, User, MapPin, Phone, CreditCard,
  Clock, CheckCircle, XCircle, Loader2, Truck, Tag, Hash,
  AlertTriangle,
} from 'lucide-react';
import erpApi from './erpApi';
import { ERPOrder, ERPOrderItem } from './erpTypes';
import {
  getStatusStyle, getStatusLabel, formatCurrency, formatDate,
  getCreatedAt, minutesSince, getSLAUrgency,
} from './erpUtils';

interface ERPOrderDetailProps {
  order: ERPOrder;
  onBack: () => void;
  onNavigate: (screen: string, data?: unknown) => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
      <span style={{ fontSize: 12, color: '#AAA', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#333', flex: 1 }}>{value}</span>
    </div>
  );
}

export default function ERPOrderDetail({ order: initialOrder, onBack, onNavigate }: ERPOrderDetailProps) {
  const [order, setOrder] = useState<ERPOrder>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFull = useCallback(async () => {
    try {
      const res = await erpApi.get(`/orders/${initialOrder.id}`);
      if (res.data) setOrder(res.data);
    } catch (err) {
      console.error('[ERP OrderDetail] fetch error', err);
    }
  }, [initialOrder.id]);

  useEffect(() => {
    fetchFull();
  }, [fetchFull]);

  const handleAction = async (action: 'accept' | 'reject' | 'status', statusValue?: string) => {
    const key = action;
    setActionLoading(key);
    try {
      if (action === 'accept') {
        await erpApi.put(`/orders/${order.id}/accept`);
      } else if (action === 'reject') {
        await erpApi.put(`/orders/${order.id}/reject`);
      } else if (action === 'status' && statusValue) {
        await erpApi.put(`/orders/${order.id}/status`, { status: statusValue });
      }
      await fetchFull();
    } catch (err) {
      console.error('[ERP OrderDetail] action error', err);
    } finally {
      setActionLoading(null);
    }
  };

  const st = getStatusStyle(order.status);
  const elapsed = minutesSince(order.shopkeeper_accepted_at ?? getCreatedAt(order));
  const urgency = getSLAUrgency(elapsed, order.sla_minutes ?? 30);
  const urgencyColor = { ok: '#00891D', warn: '#F57F17', danger: '#C62828' }[urgency];
  const items: ERPOrderItem[] = order.items ?? [];

  return (
    <div>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid #E8E8E8', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="#555" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            Order #{order.order_number}
          </h1>
          <p style={{ fontSize: 13, color: '#999', margin: 0, marginTop: 2 }}>
            {formatDate(getCreatedAt(order))}
          </p>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            background: st.bg, color: st.color, border: `1px solid ${st.border}`,
            borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 700,
          }}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* SLA Strip */}
      {order.shopkeeper_accepted_at && (
        <div
          style={{
            background: urgency === 'danger' ? '#FFEBEE' : urgency === 'warn' ? '#FFF3E0' : '#E8F5E9',
            border: `1px solid ${urgency === 'danger' ? '#EF9A9A' : urgency === 'warn' ? '#FFE082' : '#A5D6A7'}`,
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {urgency === 'danger' ? <AlertTriangle size={16} color={urgencyColor} /> : <Clock size={16} color={urgencyColor} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: urgencyColor }}>
            {urgency === 'danger'
              ? `SLA Breached! ${elapsed}m elapsed (limit: ${order.sla_minutes}m)`
              : `${Math.max(0, (order.sla_minutes ?? 30) - elapsed)}m remaining of ${order.sla_minutes}m SLA`
            }
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Order Info */}
        <div
          style={{
            background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0',
            padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, marginBottom: 12 }}>
            Order Info
          </h3>
          <InfoRow label="Order Type" value={order.order_type} />
          <InfoRow label="Payment" value={order.payment_method} />
          <InfoRow label="Total Amount" value={formatCurrency(order.total_value)} />
          <InfoRow label="SLA" value={`${order.sla_minutes} minutes`} />
          {order.tray_number && <InfoRow label="Tray Number" value={`#${order.tray_number}`} />}
          <InfoRow label="Priority" value={order.priority} />
        </div>

        {/* Customer Info */}
        <div
          style={{
            background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0',
            padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, marginBottom: 12 }}>
            Customer
          </h3>
          <InfoRow label="Name" value={order.customer_name} />
          <InfoRow label="Phone" value={order.customer_phone} />
          <InfoRow label="Address" value={order.customer_address} />
          {order.rider_name && <InfoRow label="Rider" value={order.rider_name} />}
          {order.rider_phone && <InfoRow label="Rider Phone" value={order.rider_phone} />}
        </div>
      </div>

      {/* Items */}
      <div
        style={{
          background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 16,
        }}
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
            Items ({items.length})
          </h3>
          <span style={{ fontSize: 12, color: '#888' }}>
            {items.filter((i) => i.isPicked).length} picked · {items.filter((i) => i.isRejected).length} rejected
          </span>
        </div>

        {items.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: '#AAA', fontSize: 13 }}>No items found</p>
        ) : (
          <div>
            {items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < items.length - 1 ? '1px solid #F7F7F7' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: item.isPicked ? '#F9FFF9' : item.isRejected ? '#FFF5F5' : '#fff',
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8, background: '#F5F5F5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 13, fontWeight: 700, color: '#AAA',
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: item.isRejected ? '#AAA' : '#1A1A1A', margin: 0 }}>
                    {item.productName}
                    {item.variantName && <span style={{ color: '#999', fontWeight: 400 }}> · {item.variantName}</span>}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#777' }}>Qty: {item.quantity} {item.unit ?? ''}</span>
                    {item.sku && <span style={{ fontSize: 11, color: '#CCC' }}>SKU: {item.sku}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: item.isRejected ? '#CCC' : '#00891D', margin: 0 }}>
                    {formatCurrency(item.price)}
                  </p>
                  <div style={{ marginTop: 2 }}>
                    {item.isPicked && <span style={{ fontSize: 11, color: '#2E7D32', fontWeight: 600 }}>✓ Picked</span>}
                    {item.isRejected && <span style={{ fontSize: 11, color: '#C62828', fontWeight: 600 }}>✗ Rejected</span>}
                    {!item.isPicked && !item.isRejected && (
                      <span style={{ fontSize: 11, color: '#AAA' }}>Pending</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Total row */}
            <div
              style={{
                padding: '12px 20px', background: '#F9F9F9',
                borderTop: '1px solid #F0F0F0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>Order Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>
                {formatCurrency(order.total_value)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons based on status */}
      <div
        style={{
          background: '#fff', borderRadius: 14, border: '1px solid #F0F0F0',
          padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex', gap: 10, flexWrap: 'wrap',
        }}
      >
        {order.status === 'new' && (
          <>
            <button
              onClick={() => handleAction('reject')}
              disabled={!!actionLoading}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #EF9A9A',
                background: '#FFEBEE', color: '#C62828', fontWeight: 700, fontSize: 13,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading === 'reject' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
              Reject Order
            </button>
            <button
              onClick={() => handleAction('accept')}
              disabled={!!actionLoading}
              style={{
                flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                background: '#00891D', color: '#fff', fontWeight: 700, fontSize: 13,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading === 'accept' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
              Accept Order
            </button>
          </>
        )}
        {order.status === 'accepted' && (
          <button
            onClick={() => handleAction('status', 'picking')}
            disabled={!!actionLoading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
              background: '#F57F17', color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            {actionLoading === 'status' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Package size={14} />}
            Start Picking
          </button>
        )}
        {(order.status === 'picking' || order.status === 'packing') && (
          <button
            onClick={() => onNavigate('picking')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
              background: '#F57F17', color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Package size={14} />
            Go to Picking Queue →
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => handleAction('status', 'dispatched')}
            disabled={!!actionLoading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
              background: '#00695C', color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            {actionLoading === 'status' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={14} />}
            Mark as Dispatched
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
