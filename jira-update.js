const https = require('https');

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const ISSUE_KEY = process.env.ISSUE_KEY;
const PULL_REQUEST_URL = process.env.PULL_REQUEST_URL;
const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE;

const commentBody = `Pull request merged: [${PULL_REQUEST_URL}]\nLatest commit: ${COMMIT_MESSAGE}`;
const data = JSON.stringify({ body: commentBody });

const options = {
  hostname: JIRA_BASE_URL.replace('https://', '').replace('http://', ''),
  path: `/rest/api/3/issue/${ISSUE_KEY}/comment`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log(`Successfully updated Jira issue: ${ISSUE_KEY}`);
    } else {
      console.error(`Error updating Jira issue: ${responseData}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`Request error: ${error.message}`);
  process.exit(1);
});

req.write(data);
req.end();