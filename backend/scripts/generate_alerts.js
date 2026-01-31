const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const path = require('path');

// Load Env
dotenv.config({ path: path.join(__dirname, '../.env') });

const runChecks = async () => {
    try {
        await connectDB();
        const Models = require('../models/SchemaDefinitions');
        const Notification = Models.Notification;
        const User = Models.User;
        const UserActivityLog = Models.UserActivityLog;

        console.log('\n=== MISSING TIMESHEET CHECK (24h Rule | Assigned vs Submitted) ===');

        const users = await User.find({
            status: { $ne: 'inactive' },
            role: 'member',
            custom_role: 'viewer'
        });
        console.log(`Checking ${users.length} active VIEWER users...`);

        // Cleanup stale alerts for non-viewers
        const allOpenMissingAlerts = await Notification.find({ type: 'timesheet_missing_alert', status: 'OPEN' });
        for (const alert of allOpenMissingAlerts) {
            const user = await User.findById(alert.user_id);
            if (!user || user.status === 'inactive' || user.custom_role !== 'viewer') {
                await Notification.updateOne({ _id: alert._id }, { status: 'RESOLVED', updated_at: new Date() });
            }
        }

        const now = new Date();
        // TESTING MODE: Check logs from TODAY to verify specific 2-minute rules quickly.
        // PRODUCTION: Should use "yesterday" logic below.

        // --- TEST MODE (Today) ---
        //const targetDate = new Date(now);
        //const startOfTarget = new Date(targetDate.setHours(0, 0, 0, 0));
        //const endOfTarget = new Date(targetDate.setHours(23, 59, 59, 999));

        // --- PRODUCTION MODE (Yesterday) ---
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfTarget = new Date(yesterday.setHours(0, 0, 0, 0));
        const endOfTarget = new Date(yesterday.setHours(23, 59, 59, 999));

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

            // 2. Determine "Start Work Time" and Deadline
            let startHour = 10;
            let startMinute = 0;

            if (activityLog.scheduled_working_start) {
                const parts = activityLog.scheduled_working_start.split(':');
                if (parts.length >= 2) {
                    startHour = parseInt(parts[0], 10);
                    startMinute = parseInt(parts[1], 10);
                }
            }

            // Construct the timestamp when they STARTED working on the target date
            const workStartTime = new Date(activityLog.timestamp);
            workStartTime.setHours(startHour, startMinute, 0, 0);

            // Deadline calculation
            // TESTING: 2 Minutes grace period
            const deadline = new Date(workStartTime.getTime() + (2 * 60 * 1000));

            // PRODUCTION: 24 Hours grace period
            // const deadline = new Date(workStartTime.getTime() + (24 * 60 * 60 * 1000));

            // 3. Check if we are past the deadline
            if (now > deadline) {
                // 4. Check Compliance: Submitted Matches Assigned
                const assigned = activityLog.total_assigned_tasks || 0;
                const submitted = activityLog.submitted_timesheets_count || 0;

                console.log(`[CHECK] ${user.email} - Assigned: ${assigned}, Submitted: ${submitted}`);
                console.log(`        Deadline was: ${deadline.toLocaleString()} (Now: ${now.toLocaleString()})`);

                if (submitted < assigned) {
                    console.log(`   -> [ALERT] Incomplete! Submitted (${submitted}) < Assigned (${assigned}).`);

                    const existingAlert = await Notification.findOne({
                        user_id: user._id,
                        type: 'timesheet_missing_alert',
                        status: 'OPEN'
                    });

                    if (!existingAlert) {
                        await Notification.create({
                            tenant_id: user.tenant_id || 'default',
                            recipient_email: user.email,
                            user_id: user._id,
                            rule_id: 'TIMESHEET_MISSING_ASSIGNED',
                            scope: 'user',
                            status: 'OPEN',
                            type: 'timesheet_missing_alert',
                            category: 'alert',
                            title: 'Incomplete Timesheet Submission',
                            // Updated message for clarity regarding the deadline logic
                            message: `No entry for 24 hrs missing timesheet Log pending hours & Submit before EOD`,
                            read: false,
                            created_date: new Date()
                        });
                        console.log(`      -> Created Notif`);
                    } else {
                        console.log(`      -> Alert already active. INCREMENTING IGNORE COUNT.`);
                        // Increment ignored count on the Activity Log
                        const currentIgnored = activityLog.ignored_alert_count || 0;
                        await UserActivityLog.updateOne(
                            { _id: activityLog._id },
                            { $set: { ignored_alert_count: currentIgnored + 1 } }
                        );
                        console.log(`      -> Ignored Count Updated: ${currentIgnored + 1}`);
                    }

                } else {
                    console.log(`   -> [OK] Compliant (${submitted}/${assigned}).`);
                    // Auto-resolve
                    const openAlert = await Notification.findOne({
                        user_id: user._id,
                        type: 'timesheet_missing_alert',
                        status: 'OPEN'
                    });
                    if (openAlert) {
                        await Notification.updateOne({ _id: openAlert._id }, { status: 'RESOLVED', updated_at: new Date() });
                        console.log(`      -> Resolved Alert`);
                    }
                }

            } else {
                console.log(`[WAIT] ${user.email} - Still within 24h grace period. Deadline: ${deadline.toLocaleString()}`);
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
