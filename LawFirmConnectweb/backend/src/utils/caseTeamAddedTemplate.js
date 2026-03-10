const caseTeamAddedTemplate = (adderName, caseName, caseCategory, viewCaseLink) => {
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
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
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
        .content h2 {
            color: #1e293b;
            font-size: 20px;
            margin-top: 0;
        }
        .case-info {
            background-color: #f1f5f9;
            border-left: 4px solid #2563eb;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .case-info p {
            margin: 8px 0;
        }
        .case-info strong {
            color: #1e293b;
        }
        .buttons {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 14px 32px;
            margin: 0 10px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s;
        }
        .btn-primary {
            background-color: #2563eb;
            color: #ffffff;
        }
        .btn-primary:hover {
            background-color: #1e40af;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Added to Case Team</h1>
        </div>
        <div class="content">
            <h2>You've been added to a case team!</h2>
            <p>Hello,</p>
            <p><strong>${adderName}</strong> has added you to their legal team for the following case:</p>

            <div class="case-info">
                <p><strong>Case Name:</strong> ${caseName}</p>
                ${caseCategory ? `<p><strong>Category:</strong> ${caseCategory}</p>` : ''}
                <p><strong>Added By:</strong> ${adderName}</p>
            </div>

            <p>As a team member, you'll have access to case documents, communications, and updates. You can collaborate with other team members and the lead attorney throughout the case lifecycle.</p>

            <div class="buttons">
                <a href="${viewCaseLink}" class="btn btn-primary">View Case</a>
            </div>

            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you have any questions, please contact ${adderName} directly or reach out to our support team.
            </p>
        </div>
        <div class="footer">
            <p><strong>LawFirmAI</strong></p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 LawFirmAI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = caseTeamAddedTemplate;
