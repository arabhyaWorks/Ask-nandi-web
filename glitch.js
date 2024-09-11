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
import database from "./firebaseConfig.js";
import {
  set,
  ref,
  getDatabase,
  push,
  update,
  onValue,
  child,
} from "firebase/database";

const port = process.env.PORT || 3000;

dotenv.config();

const app = express();
app.use(bodyParser.json());

const WHATSAPP_TOKEN = process.env.GRAPH_API_TOKEN;
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
let userName = "";
let userNumber = "";

let selectedLanguageCode = "";
let userStates = {};

app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
    userName =
      req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.profile?.name ||
      "";
    userNumber =
      req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.phone_number || "";
    const userLanguage =
      req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.profile?.locale ||
      "en";
    const userState =
      userStates[req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.id] ||
      {};

    for (const entry of body.entry) {
      const changes = entry.changes;
      for (const change of changes) {
        if (change.value && change.value.messages && change.value.messages[0]) {
          const message = change.value.messages[0];
          const senderId = message.from;

          if (message?.type === "text") {
            const messageText = message.text.body.toLowerCase();
            console.log("User said : ", messageText);
            console.log("Message object: ", message);
            console.log(userName, message.from, userLanguage);

            if (userStates[senderId] && userStates[senderId].isAskingQuestion) {
              userStates[senderId].isAskingQuestion = false;
              await sendQuestionToAPI(
                messageText,
                message.from,
                business_phone_number_id,
                selectedLanguageCode,
                message
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              userStates[senderId] &&
              userStates[senderId].isAskingFeedback
            ) {
              userStates[senderId].isAskingFeedback = false;
              let txt = await textToTextTranslationNMT(
                "Thankyou for your feedback",
                selectedLanguageCode
              );
              await sendMessage(
                business_phone_number_id,
                message.from,
                txt,
                message.id
              );
              await goBackToMainMenu(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            }
            // else{
            //  if (
            //   [
            //     "hi",
            //     "hello",
            //     "hey",
            //     "नमस्ते",
            //     "नमस्कार",
            //     "हैलो",
            //     "mamaste",
            //     "hii",
            //     "hiii",
            //     "hiiii",
            //     "hellow",
            //   ].includes(messageText)
            // )
            else {
              storeData(userName, message.from, messageText);
              await sendWelcomeMessage(
                business_phone_number_id,
                message,
                userName
              );
            }
          } else if (
            message?.type === "interactive" &&
            message?.interactive?.type === "list_reply" &&
            message?.interactive?.list_reply?.id.startsWith("lang_")
          ) {
            selectedLanguageCode = message.interactive.list_reply.id.slice(5);
            await selectService(
              business_phone_number_id,
              selectedLanguageCode,
              message
            );

            await markMessageAsRead(business_phone_number_id, message.id);
          } else if (
            message?.type === "interactive" &&
            message?.interactive?.type === "list_reply"
          ) {
            if (message?.interactive?.list_reply?.id === "sugam_darshan") {
              storeServices(message.from, "sugam_darshan");
              await serviceResponse(
                business_phone_number_id,
                message,
                "sugam_darshan",
                selectedLanguageCode
              );
            } else if (
              message?.interactive?.list_reply?.id === "pooja_booking"
            ) {
              storeServices(message.from, "pooja_booking");
              await serviceResponse(
                business_phone_number_id,
                message,
                "pooja_booking",
                selectedLanguageCode
              );
            } else if (
              message?.interactive?.list_reply?.id === "making_donation"
            ) {
              storeServices(message.from, "making_donation");
              await serviceResponse(
                business_phone_number_id,
                message,
                "making_donation",
                selectedLanguageCode
              );
            } else if (
              message?.interactive?.list_reply?.id === "ask_question"
            ) {
              storeServices(message.from, "ask_question");
              let txt = await textToTextTranslationNMT(
                "Please type your question",
                selectedLanguageCode
              );
              await sendMessage(
                business_phone_number_id,
                message.from,
                txt,
                message.id
              );
              userStates[senderId] = { isAskingQuestion: true };
            } else if (
              message?.interactive?.list_reply?.id === "give_feedback"
            ) {
              storeServices(message.from, "give_feedback");
              let txt = await textToTextTranslationNMT(
                "Please type feedback",
                selectedLanguageCode
              );
              await sendMessage(
                business_phone_number_id,
                message.from,
                txt,
                message.id
              );
              userStates[senderId] = { isAskingFeedback: true };
            } else if (
              message?.interactive?.list_reply?.id === "temple_timing"
            ) {
              storeServices(message.from, "temple_timing");
              let temple_timing =
                responseLabels.temple_timing[selectedLanguageCode].header[0];
              await sendMessage(
                business_phone_number_id,
                message.from,
                temple_timing,
                message.id
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.list_reply?.id === "temple_facilities"
            ) {
              storeServices(message.from, "temple_facilities");
              let temple_facilities =
                responseLabels.temple_facilities[selectedLanguageCode]
                  .header[0];
              await sendMessage(
                business_phone_number_id,
                message.from,
                temple_facilities,
                message.id
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.list_reply?.id === "temple_helpdesk"
            ) {
              storeServices(message.from, "temple_helpdesk");
              let temple_helpdesk =
                responseLabels.temple_helpdesk[selectedLanguageCode].header[0];
              await sendMessage(
                business_phone_number_id,
                message.from,
                temple_helpdesk,
                message.id
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.list_reply?.id === "how_to_reach"
            ) {
              storeServices(message.from, "how_to_reach");
              let how_to_reach =
                responseLabels.how_to_reach[selectedLanguageCode].header[0];
              await sendMessage(
                business_phone_number_id,
                message.from,
                how_to_reach,
                message.id
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (message?.interactive?.list_reply?.id === "foreign_oci") {
              storeServices(message.from, "foreign_oci");
              let foreign_oci =
                responseLabels.foreign_oci[selectedLanguageCode].header[0];
              await sendMessage(
                business_phone_number_id,
                message.from,
                foreign_oci,
                message.id
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.list_reply?.id === "temple_services"
            ) {
              storeServices(message.from, "temple_services");
              await templeServices(
                business_phone_number_id,
                selectedLanguageCode,
                message
              );

              await goBackToMainMenu(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (message?.interactive?.list_reply?.id === "Souvenir") {
              storeServices(message.from, "souvenir");
              let souvenir =
                responseLabels["souvenir"][selectedLanguageCode].header;
              await sendMessage(
                business_phone_number_id,
                message.from,
                souvenir[0],
                message.id
              );
              await sendMessage(
                business_phone_number_id,
                message.from,
                souvenir[1],
                null
              );
              await askMoreQuestions(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.list_reply?.id === "about_temple"
            ) {
              storeServices(message.from, "about_temple");
              let about_temple =
                responseLabels.about_temple[selectedLanguageCode];
              await sendImage(business_phone_number_id, message.from, {
                type: "image",
                image: {
                  link:
                    "https://shrikashidham.com/wp-content/uploads/2023/08/1-3.jpg",
                  caption: about_temple.header[0],
                },
              });
              const delay = (ms) =>
                new Promise((resolve) => setTimeout(resolve, ms));

              await delay(2000); // Delay for 1 second (1000 milliseconds)
              await buttons(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                about_temple.buttons
              );
            }
          } else if (
            message?.type === "interactive" &&
            message?.interactive?.type === "button_reply"
          ) {
            if (message?.interactive?.button_reply?.id === "ask_yes") {
              let txt = await textToTextTranslationNMT(
                "Please type your question",
                selectedLanguageCode
              );
              await sendMessage(
                business_phone_number_id,
                message.from,
                txt,
                message.id
              );
              userStates[senderId] = { isAskingQuestion: true };
            } else if (message?.interactive?.button_reply?.id === "main_menu") {
              await selectService(
                business_phone_number_id,
                selectedLanguageCode,
                message
              );
            } else if (
              message?.interactive?.button_reply?.id === "temple_history"
            ) {
              storeServices(message.from, "temple_history");
              let temple_history =
                responseLabels.about_temple[selectedLanguageCode]
                  .temple_history;
              for (let i = 0; i < temple_history.length; i++) {
                await sendMessage(
                  business_phone_number_id,
                  message.from,
                  temple_history[i],
                  i === 0 ? message.id : null
                );
              }
              await goBackToMainMenu(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.button_reply?.id === "about_skvt"
            ) {
              storeServices(message.from, "about_skvt");
              let about_skvt =
                responseLabels.about_temple[selectedLanguageCode].about_skvt;
              for (let i = 0; i < about_skvt.length; i++) {
                await sendMessage(
                  business_phone_number_id,
                  message.from,
                  about_skvt[i],
                  i === 0 ? message.id : null
                );
              }
              await goBackToMainMenu(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            } else if (
              message?.interactive?.button_reply?.id === "trust_officials"
            ) {
              storeServices(message.from, "trust_officials");
              let trust_officials =
                responseLabels.about_temple[selectedLanguageCode]
                  .trust_officials;
              for (let i = 0; i < trust_officials.length; i++) {
                await sendMessage(
                  business_phone_number_id,
                  message.from,
                  trust_officials[i],
                  i === 0 ? message.id : null
                );
              }
              await goBackToMainMenu(
                business_phone_number_id,
                message.from,
                selectedLanguageCode,
                message.id
              );
            }
          }
        }
      }
    }
  }
  res.sendStatus(200);
});

async function sendMessage(
  business_phone_number_id,
  to,
  text,
  contextMessageId = null
) {
  const data = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: text },
  };
  if (contextMessageId) {
    data.context = { message_id: contextMessageId };
  }

  console.log("\n\n-------                 -------");
  console.log("Replying to :", userName, to);
  console.log(text);
  console.log("-------                 -------\n\n");

  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: data,
  }).catch((error) => {
    console.error(
      "Error sending message:",
      error.response ? error.response.data : error.message
    );
  });
}

async function sendImage(
  business_phone_number_id,
  to,
  text,
  contextMessageId = null
) {
  const data = {
    messaging_product: "whatsapp",
    to: to,
    ...text,
  };
  if (contextMessageId) {
    data.context = { message_id: contextMessageId };
  }

  // console.log("Sending message with data:", data); // Log the data being sent

  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: data,
  }).catch((error) => {
    console.error(
      "Error sending message:",
      error.response ? error.response.data : error.message
    );
  });
}

async function sendWelcomeMessage(business_phone_number_id, message, userName) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: message.from,
      text: {
        body: `🙏 हर हर महादेव 🙌🏻 *${userName}*, मैं  *नंदी* हूं | *श्री काशी विश्वनाथ मंदिर* में आपका स्वागत है।\n\n🙏 Har har Mahadev 🙌🏻 *${userName}*, I am *Nandi* welcome to *Shri Kashi Vishwanath Temple*.`,
      },
    },
  });

  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: message.from,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "",
        },
        body: {
          text:
            "Please select a language from the following:\n\nकृपया भाषा का चयन करें:",
        },
        footer: {
          text: "Tap to select a language",
        },
        action: {
          button: "Select Language",
          sections: [
            {
              title: "Language Selection",
              rows: languages,
            },
          ],
        },
      },
    },
  });
}

async function selectService(
  business_phone_number_id,
  selectedLanguageCode,
  message
) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: message.from,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: labels[selectedLanguageCode].header,
        },
        body: {
          text: labels[selectedLanguageCode].body,
        },
        footer: {
          text: labels[selectedLanguageCode].footer,
        },
        action: {
          button: labels[selectedLanguageCode].btn,
          sections: [
            {
              title: "Services",
              rows: labels[selectedLanguageCode].options,
            },
          ],
        },
      },
    },
  });
}

async function templeServices(
  business_phone_number_id,
  selectedLanguageCode,
  message
) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: message.from,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: labels2[selectedLanguageCode].header,
        },
        body: {
          text: labels2[selectedLanguageCode].body,
        },
        footer: {
          text: labels2[selectedLanguageCode].footer,
        },
        action: {
          button: labels2[selectedLanguageCode].btn,
          sections: [
            {
              title: "Services",
              rows: labels2[selectedLanguageCode].options,
            },
          ],
        },
      },
    },
  });
}

async function markMessageAsRead(business_phone_number_id, messageId) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
  });
}

const sendQuestionToAPI = async (
  question,
  user,
  business_phone_number_id,
  selectedLanguageCode,
  message
) => {
  console.log("-------Called sendQuestionToAPI-------");
  question = question.trim();
  let ques = await textToEnglish(question, selectedLanguageCode);
  let noResponse = await textToTextTranslationNMT(
    "Sorry, I couldn't find an answer.",
    selectedLanguageCode
  );
  try {
    const response = await axios.post(
      "http://ec2-3-86-240-66.compute-1.amazonaws.com/ask",
      {
        question: ques,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const answer = response.data.answer
      ? await textToTextTranslationNMT(
          response.data.answer,
          selectedLanguageCode
        )
      : noResponse;

    writeData(
      userName,
      message.from,
      ques,
      response.data.answer,
      message,
      selectedLanguageCode
    );
    await sendMessage(business_phone_number_id, user, answer);
  } catch (error) {
    console.error(
      "Error querying API:",
      error.response ? error.response.data : error.message
    );
    let err = await textToTextTranslationNMT(
      "There was an error processing your question. Please try again later.",
      selectedLanguageCode
    );
    await sendMessage(business_phone_number_id, user, err);
  }
};

async function serviceResponse(
  business_phone_number_id,
  message,
  serviceId,
  selectedLanguageCode
) {
  let msg = responseLabels[serviceId][selectedLanguageCode];
  for (let i = 0; i < msg.length; i++) {
    await sendMessage(
      business_phone_number_id,
      message.from,
      msg[i],
      i === 0 ? message.id : null
    );
  }

  if (serviceId === "making_donation") {
    await sendImage(business_phone_number_id, message.from, {
      type: "image",
      image: {
        link: "https://shrikashivishwanath.org/files/skvt-qr.png",
      },
    });
  }

  await goBackToMainMenu(
    business_phone_number_id,
    message.from,
    selectedLanguageCode,
    message.id
  );
}

async function askMoreQuestions(
  business_phone_number_id,
  to,
  selectedLanguageCode,
  messageId
) {
  

  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: await textToTextTranslationNMT(
            "Ask a question?",
            selectedLanguageCode
          ),
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "ask_yes",
                title: await textToTextTranslationNMT(
                  "Ask question",
                  selectedLanguageCode
                ),
              },
            },
            {
              type: "reply",
              reply: {
                id: "main_menu",
                title: await textToTextTranslationNMT(
                  "Main Menu",
                  selectedLanguageCode
                ),
              },
            },
          ],
        },
      },
    },
  });
}

async function buttons(
  business_phone_number_id,
  to,
  selectedLanguageCode,
  buttonsArray
) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: await textToTextTranslationNMT(
            "Please select from the following:",
            selectedLanguageCode
          ),
        },
        action: {
          buttons: buttonsArray,
        },
      },
    },
  });
}

async function goBackToMainMenu(
  business_phone_number_id,
  to,
  selectedLanguageCode,
  messageId
) {
  await axios({
    method: "POST",
    url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: await textToTextTranslationNMT(
            "Do you want to go back to the main menu?",
            selectedLanguageCode
          ),
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "main_menu",
                title: await textToTextTranslationNMT(
                  "Go back to Main Menu",
                  selectedLanguageCode
                ),
              },
            },
          ],
        },
      },
    },
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log("Server is running on port " + port);
});

function writeData(name, number, ques, answer, message, selectedLanguageCode) {
  const db = getDatabase();
  console.log(message.id);
  const data = {
    question: ques,
    answer: answer,
    language: selectedLanguageCode,
    time: new Date().toLocaleString("hi-IN", { timeZone: "Asia/Kolkata" }),
    name: name,
    number: number,
  };

  const newPostKey = push(child(ref(db), "ask_nandi_v2/query/")).key;

  set(ref(db, "ask_nandi_v2/query/" + newPostKey), data);
}

function storeData(userName, userNumber, messageText) {
  const data = {
    message: messageText,
    time: new Date().toLocaleString("hi-IN", { timeZone: "Asia/Kolkata" }),
    name: userName,
    number: userNumber,
  };
  const db = getDatabase();
  //   const key = push(ref(db, "ask_nandi_v2/messages/"), data);
  const key = push(ref(db, "ask_nandi_v2/messages/"), data).key;

  set(ref(db, "ask_nandi_v2/messages/" + key), data);
}

function storeServices(userNumber, options) {
  const db = getDatabase();
  let data = null;
  onValue(ref(db, "ask_nandi_v2/services/" + options+"/"), (snapshot) => {
    data = snapshot.val();

    console.log("this is data:", data);
  });

  set(ref(db, "ask_nandi_v2/services/" + options + "/"), data + 1);
}
