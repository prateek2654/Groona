const mongoose = require('mongoose');
require('dotenv').config();
const SchemaDefinitions = require('../models/SchemaDefinitions');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/groona_dev';

const loadModels = () => {
    const fs = require('fs');
    const path = require('path');
    const definitionsPath = path.join(__dirname, '../models/definitions');

    const convertType = (field) => {
        let schemaType = {};
        if (field.type === 'string') {
            if (field.format === 'date' || field.format === 'date-time') schemaType.type = Date;
            else schemaType.type = String;
        } else if (field.type === 'number' || field.type === 'integer') {
            schemaType.type = Number;
        } else if (field.type === 'boolean') {
            schemaType.type = Boolean;
        } else if (field.type === 'array') {
            schemaType.type = [mongoose.Schema.Types.Mixed];
        } else {
            schemaType.type = mongoose.Schema.Types.Mixed;
        }
        if (field.default !== undefined) schemaType.default = field.default;
        return schemaType;
    };

    if (fs.existsSync(definitionsPath)) {
        fs.readdirSync(definitionsPath).forEach(file => {
            if (file.endsWith('.json')) {
                const def = require(path.join(definitionsPath, file));
                const schemaObj = {};
                if (def.properties) {
                    Object.keys(def.properties).forEach(prop => {
                        schemaObj[prop] = convertType(def.properties[prop]);
                    });
                }
                const schema = new mongoose.Schema(schemaObj, { strict: false });
                if (!mongoose.models[def.name]) {
                    mongoose.model(def.name, schema);
                }
            }
        });
    }
};

const runDebug = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');
        loadModels();

        const User = mongoose.model('User');
        const Timesheet = mongoose.model('Timesheet');

        const users = await User.find({ role: 'member', status: 'active' });
        console.log(`Found ${users.length} active members.`);

        for (const user of users) {
            console.log(`\nUser: ${user.email} (${user.full_name})`);

            const timesheets = await Timesheet.find({ user_email: user.email }).sort({ date: -1 }).limit(10);
            if (timesheets.length === 0) {
                console.log('  No timesheets found.');
                continue;
            }

            console.log(`  Found ${timesheets.length} recent entries:`);
            const hoursByDate = {};
            timesheets.forEach(ts => {
                const d = new Date(ts.date).toISOString().split('T')[0];
                hoursByDate[d] = (hoursByDate[d] || 0) + (ts.hours || 0);
                console.log(`    - Date: ${d}, Hours: ${ts.hours}, Type: ${ts.work_type}`);
            });

            console.log('  Daily Totals:');
            Object.entries(hoursByDate).forEach(([date, total]) => {
                console.log(`    ${date}: ${total}h`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runDebug();
