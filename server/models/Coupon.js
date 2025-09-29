const mongoose = require('mongoose');

const couponSchema = mongoose.Schema({
    code: {
        type: String,
        unique: true
    },
    discountAmount: {
        type: Number,
        required: true
    },
    ownerId: {
        // 이 쿠폰의 주인이 누구인지 User 모델과 연결합니다.
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        default: 'active' // 'active' (사용 가능) | 'used' (사용 완료)
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = { Coupon };