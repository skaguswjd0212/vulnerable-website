const express = require('express');
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Order } = require("../models/Order");
const { Product } = require("../models/Product");

/**
 * 🎯 수직 권한 상승 (Admin Access) 취약점
 * 일반 사용자가 쿼리 파라미터를 조작해 관리자처럼 모든 주문을 조회하는 API
 */
router.get('/', auth, async (req, res) => {
    try {
        let orders;
        // 클라이언트가 보낸 쿼리 파라미터 'isAdmin' 값을 검증 없이 신뢰함
        if (req.query.isAdmin === 'true') {
            // isAdmin=true 쿼리가 있으면 권한 검사 없이 모든 주문 내역을 반환
            console.log(`[보안 로그] 관리자 권한으로 주문 조회 시도 - 사용자: ${req.user.name}`);
            orders = await Order.find({}).populate('userId', 'name email').sort({ createdAt: -1 }); // DB의 모든 Order를 조회
        } else {
            // 일반적인 경우, 로그인한 사용자의 주문 내역만 반환
            orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        // items 배열의 productId를 실제 상품 정보로 변환
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
        }
        
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


/**
 * 🎯 수평 권한 상승 (IDOR - Insecure Direct Object Reference) 취약점
 * 특정 주문 ID로 주문 상세 내역을 조회하는 API
 */
router.get("/:orderId", auth, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // 데이터베이스에서 orderId로 주문을 바로 조회함.
        // 이 주문이 현재 로그인한 사용자(req.user._id)의 것인지 확인하는 절차가 없음!
        const order = await Order.findById(orderId).populate('userId', 'name email');

        if (!order) {
            return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
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

        // 다른 사람의 주문이라도 조회가 성공하면 그대로 반환
        res.status(200).json({ success: true, order });

    } catch (error) {
        // 잘못된 형식의 ID가 들어오면 에러 발생 가능
        console.error('주문 상세 조회 에러:', error);
        res.status(500).json({ success: false, error });
    }
});

module.exports = router;