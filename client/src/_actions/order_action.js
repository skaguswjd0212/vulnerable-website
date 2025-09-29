import axios from 'axios';
import { GET_ORDERS, GET_ORDER_DETAIL } from './types';

export function getOrders(adminView = false) {
    const params = adminView ? { adminView: 'true' } : {};
    const request = axios.get('/api/orders', { params })
        .then(response => response.data);

    return {
        type: GET_ORDERS,
        payload: request
    }
}

export function getOrderDetail(orderId) {
    const request = axios.get(`/api/orders/${orderId}`)
        .then(response => response.data);

    return {
        type: GET_ORDER_DETAIL,
        payload: request
    }
}