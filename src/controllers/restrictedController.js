const express = require('express');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// verify if the user is logged
router.use(authMiddleware);

router.get('/', async (req, res) => {
    try{
        return res.send({ message: "Welcome to the restricted area, id: " + req.userId});
    }catch(err){
        return res.status(400).send({ error: 'A error occurred during processing'});
    }
});

module.exports = app => app.use('/restrictedAccess', router);