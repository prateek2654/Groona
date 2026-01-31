const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const path = require('path');

// Load Env
dotenv.config({ path: path.join(__dirname, '../.env') });

const checkNotifications = async () => {
    try {
        await connectDB();
        console.log('MongoDB Connected');

        const Models = require('../models/SchemaDefinitions');
        const Notification = Models.Notification;
        const User = Models.User;

        const validAlert = await Notification.findOne({ type: 'timesheet_missing_alert' });
        console.log('\n--- VALID (timesheet_missing_alert) ---');
        console.log(JSON.stringify(validAlert, null, 2));

        const myAlert = await Notification.findOne({ type: 'task_overdue_alert' });
        console.log('\n--- MINE (task_overdue_alert) ---');
        console.log(JSON.stringify(myAlert, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkNotifications();
