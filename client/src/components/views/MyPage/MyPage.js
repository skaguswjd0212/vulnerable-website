import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyPage.css';

function MyPage() {
    const [orders, setOrders] = useState([]);
    const [refunds, setRefunds] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('단순 변심');
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);

    useEffect(() => {
        fetchMyOrders();
    }, []);

    const fetchMyOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/orders', {
                withCredentials: true
            });
            
            if (response.data.success) {
                setOrders(response.data.orders);
                response.data.orders.forEach(order => {
                    fetchRefunds(order._id);
                });
            } else {
                setError('주문 내역을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('주문 내역 조회 실패:', error);
            setError(error.response?.data?.message || '주문 내역을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRefunds = async (orderId) => {
        try {
            const response = await axios.get(`/api/orders/${orderId}/refunds`, {
                withCredentials: true
            });
            
            if (response.data.success) {
                setRefunds(prev => ({
                    ...prev,
                    [orderId]: {
                        list: response.data.refunds,
                        total: response.data.totalRefunded,
                        orderAmount: response.data.orderAmount
                    }
                }));
            }
        } catch (error) {
            console.error('환불 내역 조회 실패:', error);
        }
    };

    const openRefundModal = (order) => {
        setSelectedOrder(order);
        setRefundAmount('');
        setRefundReason('단순 변심');
        setShowRefundModal(true);
    };

    const handleRefundRequest = async () => {
    const fullAmount = selectedOrder.amount;
    
    // 첫 번째 상품 정보 가져오기
    const firstProduct = selectedOrder.products[0];
    
    try {
        setRefundLoading(true);
        const response = await axios.post(
            `/api/orders/${selectedOrder._id}/refund`,
            {
                productId: firstProduct.productId,
                quantity: firstProduct.quantity,
                reason: refundReason
            },
            { withCredentials: true }
        );

            if (response.data.success) {
                alert(response.data.message);
                setShowRefundModal(false);
                await fetchRefunds(selectedOrder._id);
                await fetchMyOrders();
            }
        } catch (error) {
            console.error('환불 요청 실패:', error);
            alert(error.response?.data?.message || '환불 요청에 실패했습니다.');
        } finally {
            setRefundLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">주문 내역을 불러오는 중...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="order-history-container">
            <h1>주문 내역</h1>

            {orders.length === 0 ? (
                <div className="empty-orders">
                    <p>주문 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => {
                        const refundData = refunds[order._id];
                        
                        return (
                            <div key={order._id} className="order-card">
                                <div className="order-header">
                                    <div className="order-info">
                                        <span className="order-date">
                                            {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="order-id">주문번호 {order._id}</span>
                                    </div>
                                    <span className={`status-badge ${order.status}`}>
                                        {order.status === 'Payment Completed' && '결제완료'}
                                        {order.status === 'Shipped' && '배송중'}
                                        {order.status === 'Delivered' && '배송완료'}
                                        {order.status === 'Cancelled' && '환불완료'}
                                    </span>
                                </div>

                                <div className="order-products">
                                    {order.products && order.products.length > 0 ? (
                                        order.products.map((product, idx) => (
                                            <div key={idx} className="product-row">
                                                <div className="product-info">
                                                    <span className="product-name">{product.name}</span>
                                                    <span className="product-quantity">수량: {product.quantity}개</span>
                                                </div>
                                                <span className="product-price">
                                                    {(product.price * product.quantity).toLocaleString()}원
                                                </span>
                                            </div>
                                        ))
                                    ) : order.items ? (
                                        order.items.map((item, idx) => (
                                            <div key={idx} className="product-row">
                                                <div className="product-info">
                                                    <span className="product-name">상품</span>
                                                    <span className="product-quantity">수량: {item.quantity}개</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p>상품 정보 없음</p>
                                    )}
                                </div>

                                <div className="order-summary">
                                    <div className="summary-row total">
                                        <span>총 결제금액</span>
                                        <strong className="amount">
                                            {order.amount?.toLocaleString()}원
                                        </strong>
                                    </div>
                                    {refundData && refundData.total > 0 && (
                                        <>
                                            <div className="summary-row">
                                                <span>환불 금액</span>
                                                <span className="refund-amount">
                                                    -{refundData.total.toLocaleString()}원
                                                </span>
                                            </div>
                                            <div className="summary-row final">
                                                <span>최종 금액</span>
                                                <strong className="final-amount">
                                                    {(order.amount - refundData.total).toLocaleString()}원
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="order-actions">
                                    {order.status === 'Cancelled' ? (
                                        <button className="btn-disabled" disabled>
                                            환불 완료
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn-primary"
                                            onClick={() => openRefundModal(order)}
                                        >
                                            환불 신청
                                        </button>
                                    )}
                                </div>

                                {refundData && refundData.list.length > 0 && (
                                    <div className="refund-section">
                                        <h3>환불 내역</h3>
                                        <div className="refund-list">
                                            {refundData.list.map((refund, idx) => (
                                                <div key={idx} className="refund-item">
                                                    <div className="refund-info">
                                                        <div className="refund-main">
                                                            <span className="refund-date">
                                                                {new Date(refund.createdAt).toLocaleDateString('ko-KR')}
                                                            </span>
                                                            <span className={`refund-status ${refund.status}`}>
                                                                {refund.status === 'pending' && '처리중'}
                                                                {refund.status === 'approved' && '완료'}
                                                                {refund.status === 'rejected' && '거부'}
                                                            </span>
                                                        </div>
                                                        <div className="refund-detail">
                                                            <span className="refund-reason">{refund.reason}</span>
                                                        </div>
                                                    </div>
                                                    <span className="refund-amount-text">
                                                        {refund.amount.toLocaleString()}원
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showRefundModal && (
                <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>환불 신청</h2>
                            <button 
                                className="modal-close"
                                onClick={() => setShowRefundModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="info-box">
                                <div className="info-row">
                                    <span className="info-label">주문 금액</span>
                                    <span className="info-value">
                                        {selectedOrder?.amount.toLocaleString()}원
                                    </span>
                                </div>
                                {refunds[selectedOrder?._id]?.total > 0 && (
                                    <div className="info-row">
                                        <span className="info-label">환불 완료</span>
                                        <span className="info-value refunded">
                                            {refunds[selectedOrder._id].total.toLocaleString()}원
                                        </span>
                                    </div>
                                )}
                                <div className="info-row highlight">
                                    <span className="info-label">환불 가능 금액</span>
                                    <span className="info-value">
                                        {((selectedOrder?.amount || 0) - (refunds[selectedOrder?._id]?.total || 0)).toLocaleString()}원
                                    </span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>환불 사유</label>
                                <select 
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                >
                                    <option value="단순 변심">단순 변심</option>
                                    <option value="상품 불량">상품 불량</option>
                                    <option value="배송 지연">배송 지연</option>
                                    <option value="상품 정보 상이">상품 정보 상이</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>

                            <div className="notice-box">
                                <p>• 환불 신청 후 영업일 기준 3-5일 내에 처리됩니다.</p>
                                <p>• 환불 금액은 결제하신 수단으로 반환됩니다.</p>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="btn-cancel"
                                onClick={() => setShowRefundModal(false)}
                                disabled={refundLoading}
                            >
                                취소
                            </button>
                            <button 
                                className="btn-submit"
                                onClick={handleRefundRequest}
                                disabled={refundLoading}
                            >
                                {refundLoading ? '처리중...' : '환불 신청'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyPage;