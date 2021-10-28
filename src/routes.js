module.exports = app => {
    require('./controllers/authController')(app);
    require('./controllers/restrictedController')(app);
};