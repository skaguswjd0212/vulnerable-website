// client/src/components/views/OrderHistoryPage/OrderHistoryPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderHistoryPage.css';

function OrderHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMyOrders();
    }, []);

    // 일반적인 내 주문 내역 조회
    const fetchMyOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/orders', {
                withCredentials: true
            });
            
            if (response.data.success) {
                setOrders(response.data.orders);
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

    if (loading) {
        return <div className="loading">주문 내역을 불러오는 중...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="order-history-container">
            <h1>내 주문 내역</h1>

            {orders.length === 0 ? (
                <div className="empty-orders">
                    <p>주문 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="orders-list">
                    <table>
                        <thead>
                            <tr>
                                <th>주문 ID</th>
                                <th>주문 상품</th>
                                <th>총 금액</th>
                                <th>주문 상태</th>
                                <th>주문일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td className="order-id">{order._id}</td>
                                    <td>
                                        {order.products && order.products.length > 0 ? (
                                            <div className="products-list">
                                                {order.products.map((product, idx) => (
                                                    <div key={idx} className="product-item">
                                                        {product.name} x {product.quantity}
                                                        <span className="product-price">
                                                            ({product.price.toLocaleString()}원)
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : order.items ? (
                                            <div className="products-list">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="product-item">
                                                        상품 ID: {item.productId} x {item.quantity}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            '상품 정보 없음'
                                        )}
                                    </td>
                                    <td className="amount">
                                        {order.amount?.toLocaleString()}원
                                    </td>
                                    <td>
                                        <span className={`status-badge ${order.status}`}>
                                            {order.status === 'Payment Completed' && '결제완료'}
                                            {order.status === 'Shipped' && '배송중'}
                                            {order.status === 'Delivered' && '배송완료'}
                                            {order.status === 'Cancelled' && '취소완료'}
                                        </span>
                                    </td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default OrderHistoryPage;