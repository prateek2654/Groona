const mongoose = require('mongoose');
require('dotenv').config();
const SchemaDefinitions = require('../models/SchemaDefinitions');

// --- 1. CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/groona_dev';
const IGNORE_THRESHOLD = 3;

// --- 2. SETUP MODELS ---
// We need to register ALL models to avoid MissingSchemaError if there are refs
const models = SchemaDefinitions;
Object.keys(models).forEach(modelName => {
    if (!mongoose.models[modelName]) {
        if (modelName === 'User' || modelName === 'UserActivityLog' || modelName === 'Notification') {
            // These are the ones we really use, but register all for safety
        }
        // Load schema
        const schemaDef = models[modelName];
        // We need to reconstruct the schema logic roughly or just trust the file loading
        // For simplicity in this script, we will just load the specific schemas we need manually 
        // OR rely on Mongoose's ability if we had the standard loader.
        // But since we are requiring SchemaDefinitions, let's see how it exports.
        // It exports an OBJECT of schemas. Wait, no.
        // SchemaDefinitions.js exports a dictionary of Schema DEFINITIONS (JSON-like), 
        // NOT Mongoose Models directly unless we run the conversion logic.
    }
});

// Since SchemaDefinitions.js returns the raw definitions (judging by previous view_file),
// we need to instantiate the Mongoose models here similar to how `server.js` or `generate_alerts.js` does it.
// Let's assume generate_alerts.js has the correct model loading logic.
// I will copy the model loading logic from generate_alerts.js.

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
                    console.log(`✅ Model Loaded: ${def.name}`);
                }
            }
        });
    }
};

const runChecks = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');

        loadModels();

        const User = mongoose.model('User');
        const UserActivityLog = mongoose.model('UserActivityLog');
        const Notification = mongoose.model('Notification');

        console.log('\n=== IGNORED ALERT ALARM CHECK (Threshold: >3) ===');

        // 1. Get Viewers
        const users = await User.find({
            role: 'member',
            custom_role: 'viewer' // STRICTLY TARGET VIEWERS
        });

        console.log(`Checking ${users.length} active VIEWER users...`);

        const now = new Date();
        // Check logs for recent activity (e.g., today/yesterday) 
        // The requirement is "ignoring >3 ignored alerts count". 
        // This count is stored on the UserActivityLog for a specific day.
        // We should check the LATEST activity log or check RECENT ones?
        // Let's check the log for TODAY (Test Mode) or YESTERDAY (Production).
        // For consistency with generate_alerts.js TEST MODE, we check TODAY.

        const targetDate = new Date(now);
        const startOfTarget = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfTarget = new Date(targetDate.setHours(23, 59, 59, 999));

        for (const user of users) {
            // 1. Query UserActivityLog for TARGET DATE
            const activityLog = await UserActivityLog.findOne({
                user_id: user._id,
                timestamp: { $gte: startOfTarget, $lte: endOfTarget }
            });

            if (!activityLog) {
                console.log(`[SKIP] ${user.email} - No activity log found for target date.`);
                continue;
            }

            const ignoredCount = activityLog.ignored_alert_count || 0;
            console.log(`[CHECK] ${user.email} - Ignored Count: ${ignoredCount}`);

            if (ignoredCount >= IGNORE_THRESHOLD) {
                console.log(`   -> [ALARM] Threshold Reached/Exceeded! (${ignoredCount} >= ${IGNORE_THRESHOLD})`);

                // Check for existing Lockout Alarm
                const existingAlarm = await Notification.findOne({
                    user_id: user._id,
                    type: 'timesheet_lockout_alarm',
                    status: 'OPEN'
                });

                if (!existingAlarm) {
                    await Notification.create({
                        tenant_id: user.tenant_id || 'default',
                        recipient_email: user.email,
                        user_id: user._id,
                        rule_id: 'TIMESHEET_LOCKOUT_MAX_IGNORES',
                        scope: 'user',
                        status: 'OPEN',
                        type: 'timesheet_lockout_alarm', // user-requested specific trigger type
                        category: 'alarm', // Higher severity than 'alert'
                        title: '🚨 Account Locked: Non-Compliance',
                        message: `You have ignored the timesheet alert ${ignoredCount} times. Your account is locked until Manager Approval.`,
                        read: false,
                        created_date: new Date()
                    });
                    console.log(`      -> Created LOCKOUT Alarm`);
                } else {
                    console.log(`      -> Lockout Alarm already active.`);
                }
            } else {
                console.log(`   -> [OK] Count within limits.`);
            }
        }

        console.log('=== CHECK COMPLETE ===');
        process.exit(0);

    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
};

runChecks();
