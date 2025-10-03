import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyPage.css';

function MyPage() {
    const [orders, setOrders] = useState([]);
    const [refunds, setRefunds] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [refundQuantity, setRefundQuantity] = useState(1);
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

    const openRefundModal = (order, product) => {
        const refundedQty = product.refundedQuantity || 0;
        const maxRefundable = product.quantity - refundedQty;
        
        if (maxRefundable <= 0) {
            return;
        }
        
        setSelectedOrder(order);
        setSelectedProduct(product);
        setRefundQuantity(Math.min(1, maxRefundable));
        setRefundReason('단순 변심');
        setShowRefundModal(true);
    };

    const handleRefundRequest = async () => {
        if (!selectedProduct) {
            alert('상품 정보가 없습니다.');
            return;
        }

        try {
            setRefundLoading(true);
            const response = await axios.post(
                `/api/orders/${selectedOrder._id}/refund`,
                {
                    productId: selectedProduct.productId,
                    quantity: refundQuantity,
                    reason: refundReason
                },
                { withCredentials: true }
            );

            if (response.data.success) {
                alert(response.data.message);
                setShowRefundModal(false);
                
                setOrders(prevOrders => 
                    prevOrders.map(order => {
                        if (order._id === selectedOrder._id) {
                            const updatedProducts = order.products.map(p => {
                                if (p.productId === selectedProduct.productId) {
                                    return {
                                        ...p,
                                        refundedQuantity: (p.refundedQuantity || 0) + refundQuantity
                                    };
                                }
                                return p;
                            });
                            
                            return {
                                ...order,
                                products: updatedProducts,
                                status: response.data.orderStatus
                            };
                        }
                        return order;
                    })
                );
                
                await fetchRefunds(selectedOrder._id);
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
            <h1>주문/환불 내역</h1>

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
                                    <span className={`status-badge ${order.status.replace(/\s+/g, '-')}`}>
                                        {order.status === 'Payment Completed' && '결제완료'}
                                        {order.status === 'Shipped' && '배송중'}
                                        {order.status === 'Delivered' && '배송완료'}
                                        {order.status === 'Cancelled' && '환불완료'}
                                        {order.status === 'Partially Refunded' && '부분환불'}
                                    </span>
                                </div>

                                <div className="order-products">
                                    {order.products && order.products.length > 0 ? (
                                        order.products.map((product, idx) => {
                                            const refundedQty = product.refundedQuantity || 0;
                                            const remainingQty = product.quantity - refundedQty;
                                            const isFullyRefunded = remainingQty <= 0;
                                            const canRefund = !isFullyRefunded && order.status !== 'Cancelled';
                                            
                                            return (
                                                <div key={idx} className="product-row">
                                                    <div className="product-info">
                                                        <span className="product-name">{product.name}</span>
                                                        <span className="product-quantity">
                                                            수량: {product.quantity}개
                                                            {refundedQty > 0 && (
                                                                <span className="refunded-info">
                                                                    {' '}(환불: {refundedQty}개)
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="product-right">
                                                        <span className="product-price">
                                                            {(product.price * product.quantity).toLocaleString()}원
                                                        </span>
                                                        {isFullyRefunded ? (
                                                            <span className="product-refund-badge refunded">
                                                                환불완료
                                                            </span>
                                                        ) : canRefund ? (
                                                            <button 
                                                                className="product-refund-badge active"
                                                                onClick={() => openRefundModal(order, product)}
                                                            >
                                                                환불 ({remainingQty}개 가능)
                                                            </button>
                                                        ) : (
                                                            <span className="product-refund-badge disabled">
                                                                환불완료
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p>상품 정보 없음</p>
                                    )}
                                </div>

                                <div className="order-summary">
                                    {order.couponCode && (
                                        <div className="summary-row coupon">
                                            <span>사용 쿠폰</span>
                                            <span className="coupon-code">{order.couponCode}</span>
                                        </div>
                                    )}
                                    {order.discountAmount > 0 && (
                                        <div className="summary-row discount">
                                            <span>쿠폰 할인</span>
                                            <span className="discount-amount">
                                                -{order.discountAmount.toLocaleString()}원
                                            </span>
                                        </div>
                                    )}
                                    <div className="summary-row total">
                                        <span>총 결제금액</span>
                                        <strong className="amount">
                                            {order.paidPrice?.toLocaleString()}원
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
                                                    {(order.paidPrice - refundData.total).toLocaleString()}원
                                                </strong>
                                            </div>
                                        </>
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
                                                            <span className="refund-product-name">
                                                                {refund.productName}
                                                            </span>
                                                            <span className="refund-quantity-badge">
                                                                {refund.quantity}개
                                                            </span>
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

            {showRefundModal && selectedProduct && (
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
                                    <span className="info-label">상품명</span>
                                    <span className="info-value">
                                        {selectedProduct.name}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">상품 가격</span>
                                    <span className="info-value">
                                        {selectedProduct.price.toLocaleString()}원
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">주문 수량</span>
                                    <span className="info-value">
                                        {selectedProduct.quantity}개
                                    </span>
                                </div>
                                {selectedProduct.refundedQuantity > 0 && (
                                    <div className="info-row">
                                        <span className="info-label">환불 완료</span>
                                        <span className="info-value refunded">
                                            {selectedProduct.refundedQuantity}개
                                        </span>
                                    </div>
                                )}
                                <div className="info-row highlight">
                                    <span className="info-label">환불 가능 수량</span>
                                    <span className="info-value">
                                        {selectedProduct.quantity - (selectedProduct.refundedQuantity || 0)}개
                                    </span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>환불 수량</label>
                                <input 
                                    type="number"
                                    min="1"
                                    max={selectedProduct.quantity - (selectedProduct.refundedQuantity || 0)}
                                    value={refundQuantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        const max = selectedProduct.quantity - (selectedProduct.refundedQuantity || 0);
                                        setRefundQuantity(Math.min(Math.max(1, val), max));
                                    }}
                                />
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

                            <div className="refund-amount-preview">
                                <span>환불 예정 금액</span>
                                <strong>{(selectedProduct.price * refundQuantity).toLocaleString()}원</strong>
                            </div>

                            <div className="notice-box">
                                <p>• 환불 신청 후 영업일 기준 3-5일 내에 처리됩니다.</p>
                                <p>• 환불 금액은 결제하신 수단으로 반환됩니다.</p>
                                <p>• 부분 환불 시 쿠폰은 복구되지 않습니다.</p>
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