const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/groona_dev';

const loadModels = () => {
    const modelsPath = path.join(__dirname, '../models/definitions');
    const files = fs.readdirSync(modelsPath);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const modelDef = require(path.join(modelsPath, file));
            const schema = new mongoose.Schema(modelDef.properties, {
                timestamps: true,
                strict: false
            });
            mongoose.model(modelDef.name, schema);
        }
    });
};

const runDebug = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');
        loadModels();
        const Timesheet = mongoose.model('Timesheet');

        // Fetch last 5 timesheets to see date format
        const timesheets = await Timesheet.find().sort({ createdAt: -1 }).limit(5);

        console.log('\n=== RECENT TIMESHEETS DATE DEBUG ===');
        timesheets.forEach(t => {
            console.log(`ID: ${t._id} | Date: ${t.date} (Type: ${typeof t.date}) | User: ${t.user_email} | WorkType: ${t.work_type}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Debug failed:', error);
        process.exit(1);
    }
};

runDebug();
