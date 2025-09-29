const express = require('express');
const router = express.Router();
const { auth } = require("../middleware/auth");
const { Coupon } = require("../models/Coupon");
const { Order } = require("../models/Order");

// 쿠폰 적용 API 엔드포인트
router.post("/apply-coupon", auth, async (req, res) => {
    
    // 클라이언트로부터 쿠폰 ID와 주문 ID를 받습니다.
    const { couponId, orderId } = req.body;

    try {
        const coupon = await Coupon.findOne({ _id: couponId, ownerId: req.user._id });

        if (coupon && coupon.status === 'active') {

            console.log(`[${new Date().toISOString()}] 쿠폰 적용 완료!`);
            
            await Order.updateOne({ _id: orderId }, { $inc: { amount: -coupon.discountAmount } });

            coupon.status = 'used';
            await coupon.save();

            console.log(`[${new Date().toISOString()}] 쿠폰 ${coupon._id} 사용 완료.`);
            return res.status(200).json({ success: true, message: "쿠폰이 성공적으로 적용되었습니다." });

        } else {
            return res.status(400).json({ success: false, message: "이미 사용되었거나 유효하지 않은 쿠폰입니다." });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ success: false, error });
    }
});

module.exports = router;