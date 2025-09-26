const mongoose = require('mongoose');
const bcyrpt = require('bcrypt');
const saltRounds = 10
const jwt = require('jsonwebtoken')

const userSchema = mongoose.Schema({
    name: {
        type: String,
        maxlength: 50
    },
    email: {
        type: String,
        trim: true,
        unique: 1
    },
    password: {
        type: String,
        minlength: 5
    },
    lastname: {
        type: String,
        maxlength: 50
    },
    role: {
        type: Number,
        default: 0
    },
    image: String,
    token: {
        type: String
    },
    tokenExp: {
        type: Number
    }
})

userSchema.pre('save', function(next){
    var user = this;
    //비밀번호 암호화

    if(user.isModified('password')){
    bcyrpt.genSalt(saltRounds, function(err, salt){
        if (err) return next(err)
        bcyrpt.hash(user.password, salt, function(err, hash){
            if (err) return next(err)
            user.password = hash
            next()
        })
    })
    } else {
        next()
    }
})

userSchema.methods.comparePassword = function(plainPassword, cb) {
    bcyrpt.compare(plainPassword, this.password, function(err, isMatch){
        if (err) return cb(err);
        cb(null, isMatch)
    })
}

userSchema.methods.generateToken = function(cb) {
    var user = this;
    var token = jwt.sign(user._id.toHexString(), 'secretToken');

    user.token = token;
    user.save()
      .then(savedUser => {
        cb(null, savedUser);
      })
      .catch(err => {
        cb(err);
      });
};

userSchema.statics.findByToken = function( token, cb) {
    var user = this;
    // jwt.verify는 콜백을 사용합니다.
    jwt.verify(token, 'secretToken', function(err, decoded){
        if (err) return cb(err);
        
        // findOne()을 Promise 기반으로 수정
        user.findOne({ "_id": decoded, "token": token})
            .then(foundUser => {
                cb(null, foundUser); // 성공 시 콜백 호출
            })
            .catch(error => {
                cb(error); // 실패 시 콜백 호출
            });
    });
};

const User = mongoose.model('User', userSchema)

module.exports= {User}