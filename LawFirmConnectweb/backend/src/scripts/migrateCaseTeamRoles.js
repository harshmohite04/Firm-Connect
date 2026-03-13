/**
 * One-time migration: normalize freeform case team role strings to uppercase enums.
 * Run: node backend/src/scripts/migrateCaseTeamRoles.js
 *
 * Normalizes:
 * - Case.teamMembers[].role: "Member" / freeform → "MEMBER", "Viewer" → "VIEWER", etc.
 * - CaseTeamInvitation.role: same
 * - CaseTeamRequest.role: same
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const VALID_INVITE_ROLES = ['MEMBER', 'VIEWER'];
const VALID_TEAM_ROLES = ['LEAD_ATTORNEY', 'MEMBER', 'VIEWER'];

async function migrate() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI not set in .env');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // --- Normalize Case.teamMembers[].role ---
    const cases = db.collection('cases');
    const caseResult = await cases.updateMany(
        { 'teamMembers.role': { $nin: VALID_TEAM_ROLES } },
        [
            {
                $set: {
                    teamMembers: {
                        $map: {
                            input: '$teamMembers',
                            as: 'tm',
                            in: {
                                $mergeObjects: [
                                    '$$tm',
                                    {
                                        role: {
                                            $switch: {
                                                branches: [
                                                    { case: { $in: ['$$tm.role', VALID_TEAM_ROLES] }, then: '$$tm.role' },
                                                    { case: { $eq: [{ $toLower: '$$tm.role' }, 'viewer'] }, then: 'VIEWER' },
                                                    { case: { $eq: [{ $toLower: '$$tm.role' }, 'lead_attorney'] }, then: 'LEAD_ATTORNEY' }
                                                ],
                                                default: 'MEMBER'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]
    );
    console.log(`Cases with teamMembers updated: ${caseResult.modifiedCount}`);

    // --- Normalize CaseTeamInvitation.role ---
    const invitations = db.collection('caseteaminvitations');
    const invResult = await invitations.updateMany(
        { role: { $nin: VALID_INVITE_ROLES } },
        [
            {
                $set: {
                    role: {
                        $switch: {
                            branches: [
                                { case: { $eq: [{ $toLower: '$role' }, 'viewer'] }, then: 'VIEWER' }
                            ],
                            default: 'MEMBER'
                        }
                    }
                }
            }
        ]
    );
    console.log(`CaseTeamInvitations updated: ${invResult.modifiedCount}`);

    // --- Normalize CaseTeamRequest.role ---
    const requests = db.collection('caseteamrequests');
    const reqResult = await requests.updateMany(
        { role: { $nin: VALID_INVITE_ROLES } },
        [
            {
                $set: {
                    role: {
                        $switch: {
                            branches: [
                                { case: { $eq: [{ $toLower: '$role' }, 'viewer'] }, then: 'VIEWER' }
                            ],
                            default: 'MEMBER'
                        }
                    }
                }
            }
        ]
    );
    console.log(`CaseTeamRequests updated: ${reqResult.modifiedCount}`);

    await mongoose.disconnect();
    console.log('Migration complete.');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
