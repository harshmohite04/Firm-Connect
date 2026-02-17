const organizationInvitationTemplate = (orgName, adminName, password, loginLink) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 40px 30px;
        }
        .info-box {
            background-color: #f1f5f9;
            border-left: 4px solid #0f172a;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .credentials {
             background-color: #e2e8f0;
             padding: 15px;
             border-radius: 6px;
             margin: 15px 0;
             font-family: monospace;
             font-size: 16px;
        }
        .btn {
            display: inline-block;
            background-color: #0f172a;
            color: #ffffff;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to LawFirmConnect</h1>
        </div>
        <div class="content">
            <h2>You have been invited to join ${orgName}</h2>
            <p>Hello,</p>
            <p><strong>${adminName}</strong> has created an account for you to join their organization on LawFirmConnect.</p>
            
            <div class="info-box">
                <p><strong>Organization:</strong> ${orgName}</p>
                <p><strong>Role:</strong> Attorney</p>
            </div>

            <p>Here are your temporary credentials to log in:</p>
            <div class="credentials">
                <strong>Password:</strong> ${password}
            </div>
            
            <p>Please log in and change your password immediately.</p>
            
            <div style="text-align: center;">
                <a href="${loginLink}" class="btn">Login to Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};

const organizationExistingUserTemplate = (orgName, adminName, loginLink) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .btn { background: #0f172a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>New Organization Access</h1>
        <p>Hello,</p>
        <p><strong>${adminName}</strong> has added you to the organization <strong>${orgName}</strong>.</p>
        <p>You can now access the organization's workspace using your existing credentials.</p>
        <br>
        <a href="${loginLink}" class="btn">Go to Dashboard</a>
    </div>
</body>
</html>
    `;
};

module.exports = { organizationInvitationTemplate, organizationExistingUserTemplate };
