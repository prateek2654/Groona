const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/groona_dev';
const REWORK_THRESHOLD_PERCENT = 15; // 15%
const LOOKBACK_DAYS = 7;

// --- MODEL LOADING HELPER ---
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
            console.log(`✅ Model Loaded: ${modelDef.name}`);
        }
    });
};

const runChecks = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');

        loadModels();
        const User = mongoose.model('User');
        const Timesheet = mongoose.model('Timesheet');
        const Notification = mongoose.model('Notification');

        console.log(`\n=== REWORK ALARM CHECK (Threshold: >${REWORK_THRESHOLD_PERCENT}% in last ${LOOKBACK_DAYS} days) ===`);

        // Get all active members
        const users = await User.find({ role: 'member', status: 'active' });
        console.log(`Checking ${users.length} active members...`);

        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - LOOKBACK_DAYS);
        startDate.setHours(0, 0, 0, 0);

        for (const user of users) {
            // Fetch ALL timesheets for the user (Date format in DB is string "Mon Jan...", so DB query $gte fails)
            const timesheets = await Timesheet.find({
                user_email: user.email
            });

            // Filter in memory
            const recentTimesheets = timesheets.filter(t => {
                if (!t.date) return false;
                const tDate = new Date(t.date); // JS can parse "Mon Jan 19 2026..."
                return tDate >= startDate;
            });

            if (recentTimesheets.length === 0) {
                console.log(`User: ${user.email} | No timesheets in last ${LOOKBACK_DAYS} days.`);
                continue;
            }

            let totalMinutes = 0;
            let reworkMinutes = 0;

            recentTimesheets.forEach(t => {
                const mins = (t.hours * 60) + (t.minutes || 0);
                totalMinutes += mins;
                if (t.work_type === 'rework') {
                    reworkMinutes += mins;
                }
            });

            if (totalMinutes === 0) {
                console.log(`User: ${user.email} | Total Hours: 0 (Skipping)`);
                continue;
            }

            const reworkPercent = (reworkMinutes / totalMinutes) * 100;
            const formattedPercent = reworkPercent.toFixed(1);

            console.log(`User: ${user.email} | Total: ${(totalMinutes / 60).toFixed(1)}h | Rework: ${(reworkMinutes / 60).toFixed(1)}h | Ratio: ${formattedPercent}%`);

            // --- LOG ACTIVITY ---
            try {
                const UserActivityLog = mongoose.model('UserActivityLog');
                await UserActivityLog.create({
                    user_id: user.id || user._id,
                    email: user.email,
                    tenant_id: user.tenant_id,
                    event_type: 'rework_check',
                    rework_percentage: parseFloat(formattedPercent),
                    timestamp: new Date()
                });
                console.log(`   -> [LOG] Rework percentage logged.`);
            } catch (logErr) {
                console.error(`   -> [ERROR] Failed to log rework activity:`, logErr.message);
            }
            // --------------------

            if (reworkPercent > 25) {
                console.log(`   -> [FLAG] CRITICAL REWORK (> 25%)`);

                // Check if active HIGH alarm exists
                const existingAlarm = await Notification.findOne({
                    recipient_email: user.email,
                    type: 'high_rework_alarm',
                    status: { $in: ['OPEN', 'APPEALED'] }
                });

                // Also check if normal alarm exists (to upgrade it later if needed, but for now just create new high)
                // Ideally we should close the 'rework_alarm' if we upgrade to 'high_rework_alarm' to avoid duplicates?
                // For simplicity, let's just create high alarm.

                if (existingAlarm) {
                    console.log('   -> High Rework Alarm already exists. Skipping.');
                } else {
                    console.log('   -> Creating CRITICAL High Rework Alarm (Freeze Activated)...');
                    await Notification.create({
                        tenant_id: user.tenant_id,
                        recipient_email: user.email,
                        type: 'high_rework_alarm', // New Type
                        category: 'alarm',
                        title: 'Critical Rework Detected',
                        message: `Your rework time is at ${formattedPercent}%, exceeding the 25% threshold. Task assignments are frozen. Peer review required.`,
                        entity_type: 'user',
                        entity_id: user.id,
                        scope: 'user',
                        status: 'OPEN',
                        sender_name: 'Groona Bot'
                    });
                    console.log('   -> High Alarm Created ✅');
                }

            } else if (reworkPercent > REWORK_THRESHOLD_PERCENT) {
                console.log(`   -> [FLAG] HIGH REWORK (> ${REWORK_THRESHOLD_PERCENT}%)`);

                // Check if active alarm exists
                const existingAlarm = await Notification.findOne({
                    recipient_email: user.email,
                    type: { $in: ['rework_alarm', 'high_rework_alarm'] }, // Don't downgrade if high exists?
                    status: { $in: ['OPEN', 'APPEALED'] }
                });

                if (existingAlarm) {
                    console.log('   -> Alarm already exists. Skipping.');
                } else {
                    console.log('   -> Creating NEW Rework Alarm...');
                    await Notification.create({
                        tenant_id: user.tenant_id,
                        recipient_email: user.email,
                        type: 'rework_alarm',
                        category: 'alarm',
                        title: 'High Rework Detected',
                        message: `Your rework time is at ${formattedPercent}%, exceeding the ${REWORK_THRESHOLD_PERCENT}% threshold. Peer review is recommended.`,
                        entity_type: 'user',
                        entity_id: user.id,
                        scope: 'user',
                        status: 'OPEN',
                        sender_name: 'Groona Bot'
                    });
                    console.log('   -> Alarm Created ✅');
                }
            }
        }

        console.log('\nChecks complete.');
        process.exit(0);

    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
};

runChecks();
