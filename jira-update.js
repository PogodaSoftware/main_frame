// const https = require('https');
const axios = require('axios');

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
// const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const ISSUE_KEY = process.env.ISSUE_KEY;
const PULL_REQUEST_URL = process.env.PULL_REQUEST_URL;
const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE;

const commentBody = { 
  "body": 
  { 
    "content": [ 
      { 
        "content": [ 
        { 
          "text": `Pull request merged: [${PULL_REQUEST_URL}]\nLatest commit: ${COMMIT_MESSAGE}`, 
          "type": "text" 
        } ], 
        "type": "paragraph" 
      } ], 
      "type": "doc", "version": 1 
      }, 
   };
// console.log("JIRA_BASE_URL:",JIRA_BASE_URL);
const BASE_URL = `jpogodasoftware.atlassian.net`
// JIRA_BASE_URL.replace('https://', '');
axios.post(
  `https://${BASE_URL}/rest/api/3/issue/${ISSUE_KEY}/comment`,
  commentBody,
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
    },
  }
)
  .then(() => {
    console.log(`Successfully updated Jira issue: ${ISSUE_KEY}`);
  })
  .catch((error) => {
    if (error.response) { 
      // The request was made and the server responded with a status code 
      // that falls out of the range of 2xx 
      console.error("Response data:", error.response.data); 
      console.error("Response status:", error.response.status); 
      console.error("Response headers:", error.response.headers); 
    } 
    else if (error.request) { 
      // The request was made but no response was received 
      console.error("Request data:", error.request); 
    }
    else { 
      // Something happened in setting up the request that triggered an Error 
      console.error("Error message:", error.message); 
    } 
    console.error("Config:", error.config);
    process.exit(1);
  });

// const JIRA_EMAIL = process.env.JIRA_EMAIL;
// const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
// const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
// const ISSUE_KEY = process.env.ISSUE_KEY;
// const PULL_REQUEST_URL = process.env.PULL_REQUEST_URL;
// const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE;

// const commentBody = `Pull request merged: [${PULL_REQUEST_URL}]\nLatest commit: ${COMMIT_MESSAGE}`;
// const data = JSON.stringify({ body: commentBody });

// const options = {
//   hostname: JIRA_BASE_URL.replace('https://', ''),
//   path: `/rest/api/3/issue/${ISSUE_KEY}/comment`,
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`
//   }
// };
// console.log("options:",options);

// const req = https.request(options, (res) => {
//   let responseData = '';
//   res.on('data', (chunk) => {
//     responseData += chunk;
//   });
//   res.on('end', () => {
//     if (res.statusCode === 201 || res.statusCode === 200) {
//       console.log(`Successfully updated Jira issue: ${ISSUE_KEY}`);
//     } else {
//       console.error(`Error updating Jira issue: ${responseData}`);
//       process.exit(1);
//     }
//   });
// });

// req.on('error', (error) => {
//   console.error(`Request error: ${error.message}`);
//   process.exit(1);
// });

// req.write(data);
// req.end();
