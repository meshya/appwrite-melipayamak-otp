import { Client, Users, Account } from 'node-appwrite';
import { fetch } from 'undici';
var soap = require('soap');


const MELIPAYAMAK_USERNAME = process.env.MELIPAYAMAK_USERNAME;
const MELIPAYAMAK_PASSWORD = process.env.MELIPAYAMAK_PASSWORD;
const MELIPAYAMAK_PATTERN_KEY = process.env.MELIPAYAMAK_PHONE;

// Ensure that the environment variables are set
if (!MELIPAYAMAK_USERNAME || !MELIPAYAMAK_PASSWORD || !MELIPAYAMAK_PATTERN_KEY) {
  throw new Error("MELIPAYAMAK_USERNAME, MELIPAYAMAK_PASSWORD, and MELIPAYAMAK_PATTERN_KEY must be set");
}

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  // For this example, we're using the Users service
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  
  const users = new Users(client);
  const account = new Account(client);

  const userId = req.headers['x-appwrite-user-id'] ?? 'unique()';
  const userPhone = req.headers['x-appwrite-user-phone'] ?? 'unknown';

  const token = await users.createToken(
    userId,
    4,
    60*3 // 4 chars, valid for 3 minutes
  );

  // Log the token to the console (for debugging purposes)
  log(`Generated token for user ${userId}: ${token.secret}`);
  // You can also use the token to authenticate further requests
  
  soap.createClientAsync(
    'https://api.payamak-panel.com/post/send.asmx?wsdl',
  ).then((client) => {
    return client.sendSmsAsync({
      username: MELIPAYAMAK_USERNAME,
      password: MELIPAYAMAK_PASSWORD,
      to: userPhone, // Ensure 'to' is provided in the request body
      text: token.secret, // Ensure 'text' is provided in the request body
      bodyId: MELIPAYAMAK_PATTERN_KEY, // Ensure 'bodyId' is provided in the request body
    });
  }).then((result) => {
    log(`SMS sent successfully: ${JSON.stringify(result)}`);
  }).catch((err) => {
    error(`Error sending SMS: ${err.message}`);
  });


  return res.json({
    status: 'ok'
  });
};
