const express = require('express')
const app = express()
const port = 5000
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const config = require("./config/dev")

const { Coupon } = require("./models/Coupon");
const { User } = require("./models/User");
const { auth } = require('./middleware/auth')

//DB 연결
mongoose.connect(config.mongoURI).then(() => console.log('MongoDB Connected...'))
.catch(err => console.log(err))

//Middleware 설정
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cookieParser());

// 라우터 연결
app.use('/api/orders', require('./routes/orders'));

app.post('/api/users/register', (req, res) => {
    const user = new User(req.body)
    user.save()
    .then((userInfo) => res.status(200).json({success: true})).catch((err)=>res.json({success: false, err}));
})

app.post('/api/users/login', (req, res) => {
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          return res.json({
            loginSuccess: false,
            message: "제공된 이메일에 해당하는 유저가 없습니다."
          });
        }

        user.comparePassword(req.body.password, (err, isMatch) => {
            if(!isMatch)
                return res.json({ loginSuccess: false, message: "비밀번호가 틀렸습니다." })

            user.generateToken((err, user) => {
                if (err) return res.status(400).send(err);
                res.cookie("x_auth", user.token)
                .status(200)
                .json({ loginSuccess: true, userId: user._id })
            })
        })
    })
})

app.get('/api/users/auth', auth, (req, res) => {
    //auth == True
    res.status(200).json({
        _id: req.user._id,
        // role == 0 : 일반 유저, 아니면 관리자
        isAdmin: req.user.role == 0 ? false : true,
        isAuth: true,
        email: req.user.email,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image
    })
})


app.get('/api/users/logout', auth, (req, res) => {
    User.findOneAndUpdate({ _id: req.user._id }, { token: "" })
        .then(() => {
            return res.status(200).send({
                success: true
            });
        })
        .catch(err => {
            return res.json({ success: false, err });
        });
});

// 쿠폰 조회
app.get('/api/coupons/:code', auth, async (req, res) => {
    try {
        const coupon = await Coupon.findOne({code: req.params.code});
        
        if(!coupon) {
            return res.json({success: false, message: '유효하지 않은 쿠폰'});
        }
        
        if(coupon.usedAt) {
            return res.json({success: false, message: '이미 사용된 쿠폰'});
        }
        
        res.json({success: true, coupon});
    } catch(err) {
        res.json({success: false, error: err.message});
    }
});

app.listen(port, () => console.log('Example app listening on port ${port}!'))