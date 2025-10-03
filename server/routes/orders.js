const express = require('express');
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Order } = require("../models/Order");
const { Product } = require("../models/Product");
const { Refund } = require("../models/Refund");
const { Coupon } = require("../models/Coupon");
const mongoose = require('mongoose');

// 주문 내역 조회
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        
        for (let order of orders) {
            if (order.items && order.items.length > 0) {
                const productsWithDetails = await Promise.all(
                    order.items.map(async (item) => {
                        const product = await Product.findById(item.productId);
                        return {
                            productId: item.productId,
                            name: product ? product.name : '알 수 없는 상품',
                            price: item.paidPrice,
                            quantity: item.quantity,
                            refundedQuantity: item.refundedQuantity || 0
                        };
                    })
                );
                order._doc.products = productsWithDetails;
            }
            
            // ✅ 총 결제금액 계산 추가
            const totalPaidPrice = order.items.reduce((sum, item) => {
                return sum + (item.paidPrice * item.quantity);
            }, 0);
            order._doc.paidPrice = totalPaidPrice;
        }
        
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 주문 상세 조회
router.get("/:orderId", auth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
        }
        
        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "권한이 없습니다." });
        }
        
        if (order.items && order.items.length > 0) {
            const productsWithDetails = await Promise.all(
                order.items.map(async (item) => {
                    const product = await Product.findById(item.productId);
                    return {
                        productId: item.productId,
                        name: product ? product.name : '알 수 없는 상품',
                        price: item.paidPrice,
                        quantity: item.quantity,
                        refundedQuantity: item.refundedQuantity || 0
                    };
                })
            );
            order._doc.products = productsWithDetails;
        }
        
        // 총 결제금액 계산 추가
        const totalPaidPrice = order.items.reduce((sum, item) => {
            return sum + (item.paidPrice * item.quantity);
        }, 0);
        order._doc.paidPrice = totalPaidPrice;

        res.status(200).json({ success: true, order });

    } catch (error) {
        console.error('주문 상세 조회 에러:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 환불 요청
router.post('/:orderId/refund', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { productId, quantity, reason } = req.body;
        
        const order = await Order.findById(req.params.orderId).session(session);
        
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: '주문을 찾을 수 없습니다.' 
            });
        }
        
        if (order.userId.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ 
                success: false, 
                message: '권한이 없습니다.' 
            });
        }
        
        if (!productId || !quantity || quantity <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: '상품 정보와 수량을 확인해주세요.' 
            });
        }
        
        const orderItem = order.items.find(item => item.productId.toString() === productId);
        
        if (!orderItem) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: '주문에 해당 상품이 없습니다.' 
            });
        }
        
        const refundedQuantity = orderItem.refundedQuantity || 0;
        const refundableQuantity = orderItem.quantity - refundedQuantity;
        
        if (quantity > refundableQuantity) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: `환불 가능 수량은 최대 ${refundableQuantity}개입니다.` 
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: '상품 정보를 찾을 수 없습니다.' 
            });
        }

        // 환불 금액 = paidPrice * 수량
        const refundAmount = orderItem.paidPrice * quantity;
        
        const existingPendingRefund = await Refund.findOne({ 
            orderId: req.params.orderId,
            productId: productId,
            status: 'pending'
        }).session(session);
        
        if (existingPendingRefund) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: '해당 상품에 대한 환불이 처리 중입니다.' 
            });
        }
        
        const refund = new Refund({
            orderId: req.params.orderId,
            userId: req.user._id,
            productId: productId,
            productName: product.name,
            quantity: quantity,
            amount: refundAmount,
            reason: reason || '단순 변심',
            status: 'pending'
        });
        
        await refund.save({ session });
        
        await Order.updateOne(
            { 
                _id: req.params.orderId,
                'items.productId': productId 
            },
            { 
                $inc: { 'items.$.refundedQuantity': quantity }
            },
            { session }
        );
        
        const updatedOrder = await Order.findById(req.params.orderId).session(session);
        
        const allItemsFullyRefunded = updatedOrder.items.every(item => {
            const refunded = item.refundedQuantity || 0;
            return refunded >= item.quantity;
        });
        
        let newStatus;
        if (allItemsFullyRefunded) {
            newStatus = 'Cancelled';
            
            // 전체 환불 시에만 쿠폰 복구
            if (order.couponCode) {
                await Coupon.findOneAndUpdate(
                    { code: order.couponCode },
                    {
                        usedAt: null,
                        userId: null
                    },
                    { session }
                );
            }
        } else {
            newStatus = 'Partially Refunded';
            // ✅ 부분 환불 시 쿠폰 복구 안함 (현실 로직)
        }
        
        await Order.findByIdAndUpdate(
            req.params.orderId,
            { status: newStatus },
            { session }
        );
        
        await session.commitTransaction();
        
        res.status(200).json({ 
            success: true, 
            refund,
            message: '환불 요청이 접수되었습니다.',
            orderStatus: newStatus
        });
        
    } catch (error) {
        await session.abortTransaction();
        console.error('환불 처리 에러:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: '이미 환불 요청된 상품입니다.' 
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
});

// 환불 내역 조회
router.get('/:orderId/refunds', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' });
        }
        
        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: '권한이 없습니다.' });
        }
        
        const refunds = await Refund.find({ orderId: req.params.orderId }).sort({ createdAt: -1 });
        const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);
        
        // 총 결제금액 계산
        const orderAmount = order.items.reduce((sum, item) => {
            return sum + (item.paidPrice * item.quantity);
        }, 0);
        
        res.json({ 
            success: true, 
            refunds,
            totalRefunded,
            orderAmount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;