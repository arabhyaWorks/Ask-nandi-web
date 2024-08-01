import express from 'express';
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { textToTextTranslationNMT } from "./bhashini.js";
import { textToEnglish } from "./ttsEnglish.js";
import { languages, languageKey, responseLabels, labels, labels2 } from "./constants.js";
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const port = 5000;

// Middleware to generate or validate session ID
app.use((req, res, next) => {
    let sessionId = req.headers['session-id'];
    if (!sessionId) {
        sessionId = uuidv4();
        res.setHeader('Session-Id', sessionId);
    }
    req.sessionId = sessionId;
    next();
});

// Main Endpoint
app.post('/api/flow', async (req, res, next) => {
    try {
        const { userName, messageType, messageContent, userState, userLanguage } = req.body;

        if (!userName || !messageType || !messageContent) {
            throw new Error('Required fields missing');
        }

        let responseMessages = [];

        if (messageType === 'text') {
            const messageText = messageContent.toLowerCase();
            console.log('User said:', messageText);
            console.log(userName, userLanguage);

            if (userState && userState.isAskingQuestion) {
                userState.isAskingQuestion = false;
                responseMessages.push(await sendQuestionToAPI(req.sessionId, messageText, userLanguage));
                responseMessages.push(await askMoreQuestions(req.sessionId, userLanguage));
            } else if (userState && userState.isAskingFeedback) {
                userState.isAskingFeedback = false;
                responseMessages.push(await textToTextTranslationNMT('Thank you for your feedback', userLanguage));
                responseMessages.push(await goBackToMainMenu(req.sessionId, userLanguage));
            } else {
                responseMessages = await sendWelcomeMessage(req.sessionId, userName, userLanguage);
            }
        } else if (messageType === "interactive" && messageContent.type === "list_reply") {
            if (messageContent.list_reply?.id.startsWith("lang_")) {
                const selectedLanguageCode = messageContent.list_reply.id.slice(5);
                responseMessages = await selectService(req.sessionId, selectedLanguageCode, messageContent);
            } else {
                const serviceId = messageContent.list_reply?.id;
                switch (serviceId) {
                    case "sugam_darshan":
                    case "pooja_booking":
                    case "making_donation":
                    case "ask_question":
                    case "give_feedback":
                    case "temple_timing":
                    case "temple_facilities":
                    case "temple_helpdesk":
                    case "how_to_reach":
                    case "foreign_oci":
                        responseMessages = await handleService(req.sessionId, serviceId, messageContent, userLanguage);
                        break;
                    case "temple_services":
                        responseMessages = await templeServices(req.sessionId, messageContent);
                        responseMessages.push(await goBackToMainMenu(req.sessionId, userLanguage));
                        break;
                    case "Souvenir":
                        responseMessages = await handleSouvenir(req.sessionId, messageContent);
                        break;
                    case "about_temple":
                        responseMessages = await handleAboutTemple(req.sessionId, messageContent);
                        break;
                    default:
                        responseMessages.push('Unsupported list reply ID');
                        break;
                }
            }
        } else if (messageType === "interactive" && messageContent.type === "button_reply") {
            switch (messageContent.button_reply?.id) {
                case "ask_yes":
                    responseMessages.push(await textToTextTranslationNMT("Please type your question", userLanguage));
                    userState.isAskingQuestion = true;
                    break;
                case "main_menu":
                    responseMessages = await selectService(req.sessionId, userLanguage, messageContent);
                    break;
                case "temple_history":
                case "about_skvt":
                case "trust_officials":
                    responseMessages = await handleButtonReply(req.sessionId, messageContent);
                    break;
                default:
                    responseMessages.push('Unsupported button reply ID');
                    break;
            }
        } else {
            responseMessages.push('Unsupported message type');
        }

        console.log(responseMessages);
        res.json({ messages: responseMessages, languages });
    } catch (error) {
        next(error);
    }
});

// Function to send a welcome message
async function sendWelcomeMessage(sessionId, userName, userLanguage) {
    const welcomeMessage = `🙏 हर हर महादेव 🙌🏻 *${userName}*, मैं  *नंदी* हूं | *श्री काशी विश्वनाथ मंदिर* में आपका स्वागत है।\n\n🙏 Har har Mahadev 🙌🏻 *${userName}*, I am *Nandi* welcome to *Shri Kashi Vishwanath Temple*.`;
    const languageSelectionMessage = "Please select a language from the following:\n\nकृपया भाषा का चयन करें:";

    const welcomeMsg = await sendMessage(sessionId, welcomeMessage);
    const languageMsg = await sendMessage(sessionId, languageSelectionMessage);

    return [welcomeMsg, languageMsg];
}

// Function to handle selecting a service
async function selectService(sessionId, languageCode, message) {
    const serviceOptions = labels[languageCode].options;
    return [await sendMessage(sessionId, serviceOptions)];
}

// Function to send information about temple services
async function templeServices(sessionId, message) {
    const templeServicesMessage = "Here are the temple services we offer:";
    return [await sendMessage(sessionId, templeServicesMessage)];
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
            : await textToTextTranslationNMT("Sorry, I couldn't find an answer.", userLanguage);
        return [answer];
    } catch (error) {
        console.error("Error querying API:", error.response ? error.response.data : error.message);
        return [await textToTextTranslationNMT("There was an error processing your question. Please try again later.", userLanguage)];
    }
}

// Function to provide a response for selected services
async function serviceResponse(sessionId, serviceId, userLanguage) {
    let msg = responseLabels[serviceId][userLanguage];
    
  
    if (serviceId === "making_donation") {
      await sendImage(sessionId, {
        type: "image",
        image: {
          link: "https://shrikashivishwanath.org/files/skvt-qr.png",
        },
      });
    }
    await goBackToMainMenu(sessionId, userLanguage);
    return msg;
  }

// Function to handle various services
async function handleService(sessionId, serviceId, messageContent, userLanguage) {
    let messages = [];
    switch (serviceId) {
        case "sugam_darshan":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "pooja_booking":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "ask_question":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "give_feedback":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "temple_timing":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "temple_facilities":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "temple_helpdesk":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "how_to_reach":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
        break;
        case "making_donation":
            messages.push(await serviceResponse(sessionId, serviceId, userLanguage));
            messages.push(await sendImage(sessionId, {
                type: "image",
                image: {
                    link: "https://shrikashivishwanath.org/files/skvt-qr.png",
                },
            }));
            break;
        default:
            console.log('Unsupported service ID:', serviceId);
            messages.push('Unsupported service ID');
            break;
    }
    return messages;
}

// Function to handle Souvenir information
async function handleSouvenir(sessionId, messageContent) {
    const souvenirMessage = "Here is the information about the available souvenirs.";
    return [await sendMessage(sessionId, souvenirMessage)];
}

// Function to handle About Temple information
async function handleAboutTemple(sessionId, messageContent) {
    const aboutTempleMessage = "This temple has a rich history and cultural significance.";
    return [await sendMessage(sessionId, aboutTempleMessage)];
}

// Function to handle button replies
async function handleButtonReply(sessionId, messageContent) {
    const buttonReplyMessage = "Here is more information based on your selection.";
    return [await sendMessage(sessionId, buttonReplyMessage)];
}

// Function to ask more questions
async function askMoreQuestions(sessionId, userLanguage) {
    const questionPrompt = await textToTextTranslationNMT("Ask a question?", userLanguage);
    return [await sendMessage(sessionId, questionPrompt)];
}

// Function to go back to the main menu
async function goBackToMainMenu(sessionId, userLanguage) {
    const mainMenuMessage = await textToTextTranslationNMT("Do you want to go back to the main menu?", userLanguage);
    return [await sendMessage(sessionId, mainMenuMessage)];
}

// Function to send a text message
async function sendMessage(sessionId, text) {
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
