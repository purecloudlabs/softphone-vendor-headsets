const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const plantronics = require('./plantronics/router');
// const sennheiser = require('./sennheiser').router;

const app = express();

app.use(logger('dev'));
app.use(express.json());

app.options('*', cors());
app.use('/plantronics', plantronics);
// app.use('/sennheiser', sennheiser);

app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
});

app.listen(3000);

console.info('Server running and ready');
module.exports = app;