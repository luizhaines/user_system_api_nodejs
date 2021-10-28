const express = require('express');
require('../src/database/index');

const serverConfig = require('./config/server.json');

const app = express();

app.use(express.json());

require('./routes')(app);

app.listen(serverConfig.port);