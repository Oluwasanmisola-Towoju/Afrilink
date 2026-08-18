const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const { connectDB, disconnectDB } = require('./config/dbHandler');
const apiRoutes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middleware/error.middleware');

const app = express();
app.set('trust proxy', 1); // trust first proxy

app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:3000',
        process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health check endpoint
app.get(`/api/check`, (req, res) => res.json({
    status: 'ok',
    uptime: process.uptime()
}));

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

let server;

async function start() {
    await connectDB();

    server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    // close the database connection and exit the process
    server.close(async () => {
        await disconnectDB();
        //exit
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // close the database connection and exit the process
    server.close(async () => {
        await disconnectDB();
        //exit
        process.exit(1);
    });
});

// graceful shutdown on SIGTERM or SIGINT
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });       
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });
});