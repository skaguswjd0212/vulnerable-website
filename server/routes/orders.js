const express = require('express');
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Order } = require("../models/Order");
const { Product } = require("../models/Product");
const { Refund } = require("../models/Refund");
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
                            price: product ? product.price : 0,
                            quantity: item.quantity
                        };
                    })
                );
                order._doc.products = productsWithDetails;
            }
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
                        price: product ? product.price : 0,
                        quantity: item.quantity
                    };
                })
            );
            order._doc.products = productsWithDetails;
        }

        res.status(200).json({ success: true, order });

    } catch (error) {
        console.error('주문 상세 조회 에러:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 환불 요청 API
router.post('/:orderId/refund', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { productId, quantity, reason } = req.body;
        
        // 1. 주문 조회
        const order = await Order.findById(req.params.orderId).session(session);
        
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: '주문을 찾을 수 없습니다.' 
            });
        }
        
        // 2. 권한 확인
        if (order.userId.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ 
                success: false, 
                message: '권한이 없습니다.' 
            });
        }
        
        // 3. 필수 파라미터 검증
        if (!productId || !quantity || quantity <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: '상품 정보와 수량을 확인해주세요.' 
            });
        }
        
        // 4. 주문에 해당 상품이 있는지 확인
        const orderItem = order.items.find(
            item => item.productId.toString() === productId
        );
        
        if (!orderItem) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: '주문에 해당 상품이 없습니다.' 
            });
        }
        
        // 5. 환불 수량 검증
        if (quantity > orderItem.quantity) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: `환불 수량은 최대 ${orderItem.quantity}개까지 가능합니다.` 
            });
        }
        
        // 6. 상품 정보 조회
        const product = await Product.findById(productId);
        if (!product) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: '상품 정보를 찾을 수 없습니다.' 
            });
        }
        
        const refundAmount = product.price * quantity;
        
        // 7. 이미 환불 요청된 상품인지 확인 (레이스 컨디션 방지!)
        const existingRefund = await Refund.findOne({ 
            orderId: req.params.orderId,
            productId: productId
        }).session(session);
        
        if (existingRefund) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: '이미 환불 요청된 상품입니다.' 
            });
        }
        
        // 8. 전체 환불 금액 검증
        const allRefunds = await Refund.find({ 
            orderId: req.params.orderId
        }).session(session);
        
        const totalRefunded = allRefunds.reduce((sum, r) => sum + r.amount, 0);
        
        if (totalRefunded + refundAmount > order.amount) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: `환불 가능 금액을 초과했습니다. (남은 금액: ${(order.amount - totalRefunded).toLocaleString()}원)` 
            });
        }
        
        // 9. DB 처리 시뮬레이션 (레이스 컨디션 테스트용 - 나중에 제거 가능)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 10. 환불 생성
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
        await Order.findByIdAndUpdate(
        req.params.orderId, 
        { status: 'Cancelled' },
        { session }
        );
        // 11. 트랜잭션 커밋
        await session.commitTransaction();
        
        res.status(200).json({ 
            success: true, 
            refund,
            message: '환불 요청이 접수되었습니다.'
        });
        
    } catch (error) {
        await session.abortTransaction();
        console.error('환불 처리 에러:', error);
        
        // 중복 키 에러 처리
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
        
        res.json({ 
            success: true, 
            refunds,
            totalRefunded,
            orderAmount: order.amount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;