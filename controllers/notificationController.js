require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;
var admin = require("firebase-admin");
var serviceAccount = require("../dbbb/ltsicon2025-db871-firebase-adminsdk-fbsvc-69cfd71598.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const messaging = admin.messaging();
const schedule = require("node-schedule");
const dtt = require("date-and-time");

//ADMIN SEND NOTIFICATION

const adminSendNotification = async (req, res) => {
  try {
    var usr = req.body.getUser;



    var title ="notification title";
    var body ="notification body ";
    var userId=1;

        const fcmUser = {
        fcmIosToken: "cNBgcVqKH0xdrbC3jAJxbJ:APA91bFstPNb3-2AhWkV-WBtoBAXJh6yYgiKRHGUL1wZgP8JStf6dGZKGMW6iIKjRtphWPflh5RwR7ZguWpMrKDkJCppMXOkjAu9gD-LnNh4_p8NRkeoQVQ",
        iosLogin:1
        };

            // Array to store the tokens
            var tokens = [];
            // Assuming userDetail[0] is defined
         
            console.log('fcmUser',fcmUser);
            if (fcmUser.fcmAndToken && fcmUser.andLogin === 1) {
              tokens.push(fcmUser.fcmAndToken);
            }

            if (fcmUser.fcmIosToken && fcmUser.iosLogin === 1) {
              tokens.push(fcmUser.fcmIosToken);
            }

            if (tokens.length > 0) {
              const pushMessage = {
                notification: {
                  title: title,
                  body: body,
                },
                data: {
                  userId: String(userId),
                  orderId: "Order",
                  orderProductId: "Demo",
                  type: "General",
                }, // Optional payload
              };
              //console.log("pushMessage",pushMessage);
              // Retry logic for each token
              var maxRetries = 3;

              for (let i = 0; i < tokens.length; i++) {
                let token = tokens[i];
                var attempts = 0;
                var sentSuccessfully = false;

                while (attempts < maxRetries && !sentSuccessfully) {
                  attempts++;
                  console.log(
                    `Attempt ${attempts}: Sending notification to token ${token}...`
                  );

                  try {
                    // Send notification to the current token
                    let response = await messaging.send({
                      token: token,
                      ...pushMessage,
                    });

                    console.log(
                      `Notification sent successfully to token ${token}.`
                    );
                    sentSuccessfully = true; // Mark as successful to stop retrying
                  } catch (error) {
                    console.error(
                      `Attempt ${attempts}: Error sending notification to token ${token}:`,
                      error
                    );

                    if (attempts < maxRetries) {
                      console.log(
                        `Retrying due to error... (${attempts}/${maxRetries})`
                      );
                    }
                  }
                }

                if (!sentSuccessfully) {
                  console.log(
                    `Failed to send notification to token ${token} after ${maxRetries} attempts.`
                  );
                }
              }
            } else {
              console.log("No valid tokens to send notifications.");
            }
          
         
                
           
        
       
   
  } catch (e) {
    console.log(e);
  }
};




module.exports = { adminSendNotification };
