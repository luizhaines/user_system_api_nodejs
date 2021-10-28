const express = require('express');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const mailer = require('../modules/mailer');

const authConfig = require('../config/auth');
const authMiddleware = require('../middlewares/auth');
const authMiddlewareReset = require('../middlewares/auth_reset_password');

const { noReplyEmail } = require('../config/mail.json');

const User = require('../models/User');

const router = express.Router();

// by default, expires in 1 day
function generateToken(params = {}, expiresIn = 86400){
    return jwt.sign(
        params,
        authConfig.secret,
        {expiresIn}
    );
}

// Create user
router.post('/', async (req, res) => {

    try{
        const { email } = req.body;

        // on the catch, the unique constraint is verified only if to pass through others verifications
        // because that, i keep this verification here
        // i want that this verification return first
        if(await User.findOne({ where: { email } }))
            return res.status(400).send({ error: 'User already exists' });

        const { name, password } = req.body;

        const user = await User.create({
            name,
            email,
            password,
        });

        // don't return this informations to user
        user.password = undefined;
        user.verify_email_token = undefined;
        user.password_reset_token = undefined;
        user.password_reset_expires = undefined;

        return res.send({
            user,
            token: generateToken({ id: user.id })
        });

    }catch(err){
        let errors = [];
        err.errors.forEach((i) => {
            if(i.constructor.name === 'ValidationErrorItem'){
                if(i.validatorName === 'isEmail'){
                    errors.push('Email not valid');
                }else if(i.path === 'password' && i.validatorName === 'len'){
                    errors.push('Password length not valid');
                }
            }
        });
        if(errors.length >= 1)
            return res.status(400).send({ error: (errors.length == 1) ? errors[0] : errors});
        return res.status(400).send({ error: 'Registration failed' });
    }
});

// Sign in
router.post('/authenticate', async (req, res) => {
    try{
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email }});

        if(!user)
            return res.status(400).send({ error: 'User not found' });

        if(!await user.validPassword(password))
            return res.status(400).send({ error: 'Invalid password'});

        user.password = undefined;
        user.verify_email_token = undefined;
        user.password_reset_token = undefined;
        user.password_reset_expires = undefined;

        return res.send({
            user,
            token: generateToken({ id: user.id })
        });
    }catch(err){
        return res.status(400).send({ error: 'Authenticate failed' });
    }
});

// Forgot password
// generate otp code
router.post('/forgotPassword', async (req, res) => {
    try{
        const { email } = req.body;

        const user = await User.findOne({ where: { email }});

        if(!user)
            res.status(400).send({ error: 'User not found' });

        // create a expiration time to the token (expires in 1 hour)
        const now = new Date();
        now.setHours(now.getHours() + 1);

        user.password_reset_expires = now;
        user.password_reset_token = otpGenerator.generate(4, {alphabets: false, upperCase: false, specialChars: false});

        await user.save();

        // send email
        mailer.sendMail({
            to: email,
            from: noReplyEmail,
            template: 'auth/forgot_password',
            subject: 'Forgot password',
            context: { code: user.password_reset_token},
        }, (err) => {
            if(err)
                // account created, but a error occurred while sending confirmation email
                return res.status(400).send({ error: 'Cannot send email'});

            // if is all ok, return status 200
            return res.send({
                expirationTime: user.password_reset_expires,
                token: generateToken({ email: email }, 3600) // expires in 1 hour
            });

        });

    }catch(err){
        return res.status(400).send({ error: 'Reset password failure' });
    }
});

// Validate OTP reset password
router.post('/validateOtpResetPassword', authMiddlewareReset, async (req, res) => {
    try{

        const user = await User.findOne({ where: { email: req.email } })

        // user not found
        if(!user)
            throw new Error();

        if(user.password_reset_expires < new Date())
            return res.status(400).send({ error: 'This OTP code has expired' });
            
        if(user.password_reset_token == req.body.otp){

            // generate a new token, with the info that the otp code was verified
            return res.send({
                token: generateToken(
                    {
                        email: req.email,
                        verified_otp: true,
                    },
                    3600
                ),
            });

        }

        // token invalid or already used
        return res.status(400).send({ error: 'This OTP code is invalid' });

    }catch(err){
        return res.status(400).send({ error: 'A error occurred' });
    }
});

// Reset password
router.post('/resetPassword', authMiddlewareReset, async (req, res) => {
    try{

        if(!req.verified_otp)
            return res.status(400).send({ error: 'A error occurred' });

        const user = await User.findOne({ where: { email: req.email } })

        // user not found
        if(!user)
            throw new Error();

        if(user.password_reset_expires < new Date())
            return res.status(400).send({ error: 'This OTP code has expired' });

        user.password = req.body.password;
        user.password_reset_token = null;
        user.password_reset_expires = null;
        if(!user.verified_email){
            user.verified_email = true;
            user.verify_email_token = null;
        }
        await user.save();
        
        return res.send();

    }catch(err){
        return res.status(400).send({ error: 'A error occurred' });
    }
});

// verify email
// generate otp code
router.get('/verifyEmail', authMiddleware, async (req, res) => {
    try{

        const user = await User.findOne({ where: { id: req.userId }});

        if(!user)
            res.status(400).send({ error: 'User not found' });

        user.verify_email_token = otpGenerator.generate(4, {alphabets: false, upperCase: false, specialChars: false});

        await user.save();

        // send email
        mailer.sendMail({
            to: user.email,
            from: noReplyEmail,
            template: 'auth/verify_email',
            subject: 'Verify email',
            context: { code: user.verify_email_token},
        }, (err) => {
            if(err)
                // account created, but a error occurred while sending confirmation email
                return res.status(400).send({ error: 'Cannot send email'});

            // if is all ok, return status 200
            return res.send();

        });

    }catch(err){
        return res.status(400).send({ error: 'Verify email failure' });
    }
});

// Validate OTP verify email
router.post('/validateOtpEmail', authMiddleware, async (req, res) => {
    try{

        const user = await User.findOne({ where: { id: req.userId } })

        // user not found
        if(!user)
            throw new Error();

        if(user.verified_email)
            return res.status(400).send({ error: 'Email already confirmed' });
            
        if(user.verify_email_token == req.body.otp){

            user.verified_email = true;
            user.verify_email_token = null;
            await user.save();

            return res.send();

        }

        // token invalid or already used
        return res.status(400).send({ error: 'This OTP code is invalid' });

    }catch(err){
        return res.status(400).send({ error: 'A error occurred' });
    }
});


module.exports = app => app.use('/auth', router);