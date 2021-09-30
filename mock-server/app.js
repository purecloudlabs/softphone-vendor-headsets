const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const plantronics = require('./plantronics/router');
const sennheiser = require('./sennheiser').router;

const app = express();
app.use(cors());

app.use(logger('dev'));
app.use(express.json());

// app.options('*', cors());
app.use('/plantronics', plantronics);
app.use('/sennheiser', sennheiser);

app.listen(3000);

console.info('Server running and ready');
module.exports = app;
