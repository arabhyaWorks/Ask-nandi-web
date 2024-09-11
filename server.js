import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { textToTextTranslationNMT } from "./bhashini.js";
import { textToEnglish } from "./ttsEnglish.js";
import {
  languages,
  languageKey,
  responseLabels,
  labels,
  labels2,
} from "./constants.js";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

import database from "./firebase.js";
import { set, ref, push, update, child, onValue, get } from "firebase/database";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const port = process.env.PORT || 5001;

// Middleware to generate or validate session ID
app.use((req, res, next) => {
  let sessionId = req.headers["session-id"];
  if (!sessionId) {
    sessionId = uuidv4();
    res.setHeader("Session-Id", sessionId);
  }
  req.sessionId = sessionId;
  next();
});

// Main Endpoint
app.post("/api/flow", async (req, res, next) => {
  console.log(" ");
  console.log("--------Backend hit--------");
  console.log(" ");

  try {
    const {
      userName,
      messageType,
      messageContent,
      userState,
      userLanguage,
    } = req.body;

    if (!userName || !messageType || !messageContent) {
      throw new Error("Required fields missing");
    }

    let responseMessages = [];

    if (messageType === "text") {
      const messageText = messageContent.toLowerCase();
      console.log(" ");

      console.log("User said:", messageText);
      console.log("Language: ", userLanguage);
      console.log(" ");

      if (userState && userState.isAskingQuestion) {
        userState.isAskingQuestion = false;
        responseMessages.push(
          await sendMessage(
            req.sessionId,
            await sendQuestionToAPI(req.sessionId, messageText, userLanguage)
          )
        );
        responseMessages.push(
          ...(await goBackToMainMenu(req.sessionId, userLanguage))
        );
      } else if (userState && userState.isAskingFeedback) {
        userState.isAskingFeedback = false;
        responseMessages.push(
          await textToTextTranslationNMT(
            "Thank you for your feedback",
            userLanguage
          )
        );
        responseMessages.push(
          await goBackToMainMenu(req.sessionId, userLanguage)
        );
      } else {
        responseMessages = await sendWelcomeMessage(
          req.sessionId,
          userName,
          userLanguage
        );
      }
    } else if (
      messageType === "interactive" &&
      messageContent.type === "list_reply"
    ) {
      if (messageContent.list_reply?.id.startsWith("lang_")) {
        const selectedLanguageCode = messageContent.list_reply.id.slice(5);
        responseMessages = await selectService(
          req.sessionId,
          selectedLanguageCode
        );
      } else {
        const serviceId = messageContent.list_reply?.id;
        storeServices(null, serviceId);

        switch (serviceId) {
          case "sugam_darshan":
          case "pooja_booking":
          case "making_donation":
          case "give_feedback":
          case "temple_timing":
          case "temple_facilities":
          case "temple_helpdesk":
          case "how_to_reach":
          case "foreign_oci":
          case "souvenir":
            responseMessages = await handleService(
              req.sessionId,
              serviceId,
              messageContent,
              userLanguage
            );
            // break;
            // responseMessages = await selectTempleService(req.sessionId, userLanguage);
            // break;
            // responseMessages = await handleSouvenir(req.sessionId, userLanguage);
            break;
          case "temple_services":
            // third
            // storeServices(null, serviceId);
            responseMessages = await selectTempleService(
              req.sessionId,
              userLanguage
            );
            break;
          case "about_temple":
            // fourth
            // storeServices(null, serviceId);
            responseMessages = await handleAboutTemple(
              req.sessionId,
              messageContent,
              userLanguage
            );
            break;
          case "ask_yes":
            userState.isAskingQuestion = true;
            responseMessages.push(
              await sendMessage(
                req.sessionId,
                await textToTextTranslationNMT(
                  "Please type your question",
                  userLanguage
                )
              )
            );
            break;
          case "main_menu":
            responseMessages = await selectService(req.sessionId, userLanguage);
            break;
          case "temple_history":
          case "about_skvt":
          case "trust_officials":
            // console.log("sdadasdas");

            responseMessages = await handleButtonReply(
              req.sessionId,
              serviceId,
              messageContent,
              userLanguage
            );
            break;
          default:
            responseMessages.push("Unsupported list reply ID");
            break;
        }
      }
    } else {
      responseMessages.push("Unsupported message type");
    }

    // console.log(responseMessages);
    res.json({ messages: responseMessages });
  } catch (error) {
    next(error);
  }
});

// Function to send a welcome message
async function sendWelcomeMessage(sessionId, userName, userLanguage) {
  const welcomeMessage = `🙏 हर हर महादेव 🙌🏻 भक्त, मैं नंदी हूं |श्री काशी विश्वनाथ मंदिर में आपका स्वागत है।\n\n🙏 Har har Mahadev 🙌🏻 Devotee, I am Nandi welcome to Shri Kashi Vishwanath Temple.`;
  const languageSelectionMessage =
    "Please select a language from the following:\n\nकृपया भाषा का चयन करें:";

  const welcomeMsg = await sendMessage(sessionId, welcomeMessage);
  const languageMsg = await sendMessage(sessionId, languageSelectionMessage);
  const RadioLanguages = await sendRadio(sessionId, languages);

  return [welcomeMsg, languageMsg, RadioLanguages];
}

// Function to handle selecting a service
async function selectService(sessionId, languageCode) {
  const serviceOptions = labels[languageCode].options;

  const headerPromise = sendMessage(sessionId, labels[languageCode].header);
  const bodyPromise = sendMessage(sessionId, labels[languageCode].body);
  const footerPromise = sendMessage(sessionId, labels[languageCode].footer);
  const btnPromise = sendMessage(sessionId, labels[languageCode].btn);
  const radioPromise = sendRadio(sessionId, serviceOptions);

  // Wait for all promises to resolve
  const [
    headerMessage,
    bodyMessage,
    footerMessage,
    btnMessage,
    radioMessage,
  ] = await Promise.all([
    headerPromise,
    bodyPromise,
    footerPromise,
    btnPromise,
    radioPromise,
  ]);

  return [headerMessage, bodyMessage, footerMessage, btnMessage, radioMessage];
}

async function selectTempleService(sessionId, languageCode) {
  const { header, body, footer, btn } = labels2[languageCode];
  const serviceOptions = labels2[languageCode].options;

  // Create promises for each message and radio options
  const headerPromise = sendMessage(sessionId, header);
  const bodyPromise = sendMessage(sessionId, body);
  const footerPromise = sendMessage(sessionId, footer);
  const btnPromise = sendMessage(sessionId, btn);
  const radioPromise = sendRadio(sessionId, serviceOptions);

  // Wait for all promises to resolve
  const [
    headerMessage,
    bodyMessage,
    footerMessage,
    btnMessage,
    radioMessage,
  ] = await Promise.all([
    headerPromise,
    bodyPromise,
    footerPromise,
    btnPromise,
    radioPromise,
  ]);

  // Return all messages and radio options
  return [headerMessage, bodyMessage, footerMessage, btnMessage, radioMessage];
}

// Function to send a question to an API
async function sendQuestionToAPI(sessionId, question, userLanguage) {
  try {
    const translatedQuestion = await textToEnglish(question, userLanguage);
    const response = await axios.post(
      "http://ec2-3-86-240-66.compute-1.amazonaws.com/ask",
      { question: translatedQuestion },
      { headers: { "Content-Type": "application/json" } }
    );
    const answer = response.data.answer
      ? await textToTextTranslationNMT(response.data.answer, userLanguage)
      : await textToTextTranslationNMT(
          "Sorry, I couldn't find an answer.",
          userLanguage
        );

    writeData(question, answer, null, userLanguage);

    return [answer];
  } catch (error) {
    console.error(
      "Error querying API:",
      error.response ? error.response.data : error.message
    );
    return [
      await textToTextTranslationNMT(
        "There was an error processing your question. Please try again later.",
        userLanguage
      ),
    ];
  }
}

// Function to provide a response for selected services
async function serviceResponse(sessionId, serviceId, userLanguage) {
  let msg;

  if (responseLabels[serviceId][userLanguage].header) {
    msg = responseLabels[serviceId][userLanguage].header;
  } else {
    msg = responseLabels[serviceId][userLanguage];
  }

  if (serviceId === "making_donation") {
    return [
      await sendMessage(sessionId, msg),
      await sendImage(sessionId, {
        type: "image",
        image: {
          link: "https://shrikashivishwanath.org/files/skvt-qr.png",
        },
      }),
    ];
  } else {
    return await sendMessage(sessionId, msg);
  }
}

// Function to handle various services
async function handleService(
  sessionId,
  serviceId,
  messageContent,
  userLanguage
) {
  let messages = [];
  switch (serviceId) {
    case "sugam_darshan":
    case "pooja_booking":
    case "give_feedback":
    case "temple_timing":
    case "temple_facilities":
    case "temple_helpdesk":
    case "how_to_reach":
    case "foreign_oci":
    case "temple_services":
    case "souvenir":
      // first
      // storeServices(null, serviceId);

      messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
      messages.push(...(await goBackToMainMenu(sessionId, userLanguage)));
      break;
    case "making_donation":
      // second
      // storeServices(null, serviceId);

      messages.push(
        ...(await serviceResponse(sessionId, serviceId, userLanguage))
      );
      messages.push(...(await goBackToMainMenu(sessionId, userLanguage)));
      break;
    default:
      console.log("Unsupported service ID:", serviceId);
      messages.push("Unsupported service ID");
      break;
  }
  return messages;
}

// Function to handle Souvenir information
async function handleSouvenir(sessionId, userLanguage) {
  const souvenirMessage = responseLabels.souvenir[userLanguage];
  return [await sendMessage(sessionId, souvenirMessage)];
}

// Function to handle About Temple information
async function handleAboutTemple(sessionId, messageContent, userLanguage) {
  let aboutTemple = responseLabels.about_temple[userLanguage];
  //   console.log(aboutTemple);

  return [
    await sendMessage(sessionId, aboutTemple.header[0]),
    await sendImage(sessionId, {
      type: "image",
      image: {
        link: aboutTemple.image,
      },
    }),
    await sendRadio(sessionId, aboutTemple.buttons),
    ...(await goBackToMainMenu(sessionId, userLanguage)),
  ];
}

// Function to handle button replies
async function handleButtonReply(
  sessionId,
  caseID,
  messageContent,
  userLanguage
) {
  const buttonReplyMessage = responseLabels.about_temple[userLanguage][caseID];
  // console.log(buttonReplyMessage);
  return [await sendMessage(sessionId, buttonReplyMessage)];
}

// Function to ask more questions
async function askMoreQuestions(sessionId, userLanguage) {
  const questionPrompt = await textToTextTranslationNMT(
    "Ask a question?",
    userLanguage
  );
  return [await sendMessage(sessionId, questionPrompt)];
}

// Function to go back to the main menu
async function goBackToMainMenu(sessionId, userLanguage) {
  const mainMenuMessage = await textToTextTranslationNMT(
    "Do you want to go back to the main menu?",
    userLanguage
  );
  const buttons = [
    {
      type: "reply",
      reply: {
        id: "main_menu",
        title: "Main Menu",
      },
    },
    {
      type: "reply",
      reply: {
        id: "ask_yes",
        title: "Ask question",
      },
    },
  ];
  return [
    await sendMessage(sessionId, mainMenuMessage),
    await sendRadio(sessionId, buttons),
  ];
}

// Function to send a text message
async function sendMessage(sessionId, text) {
  // console.log(" ")
  // console.log(" ")
  // console.log("--------sendMessage--------");
  // console.log(text);
  // console.log("--------sendMessage--------");
  // console.log(" ")
  // console.log(" ")

  const message = {
    sessionId: sessionId,
    type: "text",
    text: { body: text },
  };
  return message; // Return the message object for the front end
}

// Function to send an image
async function sendImage(sessionId, imageData) {
  const message = {
    sessionId: sessionId,
    type: "image",
    image: {
      link: imageData.image.link,
    },
  };
  return message; // Return the image message object for the front end
}

async function sendRadio(sessionId, RadioOptions) {
  const standardizedOptions = RadioOptions.map((option) => {
    if (option.type && option.reply) {
      return option; // Already in the desired format
    } else {
      return {
        type: "reply",
        reply: {
          id: option.id,
          title: option.title,
        },
      };
    }
  });

  const message = {
    radio: standardizedOptions,
  };
  return message;
}

// async function sendButtons(sessionId, ButtonOptions) {
//   const message = {
//     buttons: ButtonOptions
//   };
//   return message;
// }

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function writeData(ques, answer, message, selectedLanguageCode) {
  const data = {
    question: ques,
    answer: answer,
    language: selectedLanguageCode,
    time: new Date().toLocaleString("hi-IN", { timeZone: "Asia/Kolkata" }),
  };
  const newPostKey = push(child(ref(database), "ask_nandi_web/query/")).key;
  set(ref(database, "ask_nandi_web/query/" + newPostKey), data);
}

function storeData(messageText) {
  const data = {
    message: messageText,
    time: new Date().toLocaleString("hi-IN", { timeZone: "Asia/Kolkata" }),
  };
  const key = push(ref(database, "ask_nandi_web/messages/"), data).key;
  set(ref(database, "ask_nandi_web/messages/" + key), data);
}

function storeServices(userNumber, options) {
  const dbRef = ref(database);
  var data = [];

  get(child(dbRef, `ask_nandi_web/services/${options}`))
    .then((snapshot) => {
      if (snapshot.exists()) {
        const value = parseInt(snapshot.val());
        console.log(`${options} value:`, value);
        data.push(value + 1);
        console.log(
          "increasing: ",
          value + 1,
          " array: ",
          data,
          "length :",
          data.length,
          "last element: ",
          data[data.length - 1]
        );

        console.log("perfoming actions");
        console.log("data:", data);
        if (data.length > 0) {
          set(
            ref(database, `ask_nandi_web/services/${options}`),
            data[data.length - 1]
          );
        } else {
          set(ref(database, `ask_nandi_web/services/${options}`), 1);
        }
      } else {
        set(ref(database, `ask_nandi_web/services/${options}`), 1);
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

// souvenir
// making_donation
// temple services
// about_temple
