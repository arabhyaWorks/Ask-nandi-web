/* eslint-disable no-unused-vars */
import express from 'express';
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
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

const port = 5000;

app.post('/api/flow', async (req, res, next) => {
    try {
        const { userName, messageType, messageContent, userState, userLanguage } = req.body;

        if (!userName || !messageType || !messageContent) {
            throw new Error('Required fields missing');
        }

        let responseMessage = '';

        if (messageType === 'text') {
            const messageText = messageContent.toLowerCase();
            console.log('User said:', messageText);
            console.log(userName, userLanguage);

            if (userState && userState.isAskingQuestion) {
                userState.isAskingQuestion = false;
                responseMessage = await sendQuestionToAPI(messageText, userLanguage);
                await askMoreQuestions(messageText, userLanguage);
            } else if (userState && userState.isAskingFeedback) {
                userState.isAskingFeedback = false;
                responseMessage = await textToTextTranslationNMT('Thank you for your feedback', userLanguage);
                await goBackToMainMenu(messageText, userLanguage);
            } else {
                await sendWelcomeMessage();
            }
        } else if (
            messageType === "interactive" &&
            messageContent.type === "list_reply"
        ) {
            if (messageContent.list_reply?.id.startsWith("lang_")) {
                const selectedLanguageCode = messageContent.list_reply.id.slice(5);
                await selectService(selectedLanguageCode, messageContent);
            } else {
                const serviceId = messageContent.list_reply?.id;

                switch (serviceId) {
                    case "sugam_darshan": {
                        await handleService("sugam_darshan", messageContent);
                        break;
                    }
                    case "pooja_booking": {
                        await handleService("pooja_booking", messageContent);
                        break;
                    }
                    case "making_donation": {
                        await handleService("making_donation", messageContent);
                        break;
                    }
                    case "ask_question": {
                        await handleAskQuestion(messageContent);
                        break;
                    }
                    case "give_feedback": {
                        await handleGiveFeedback(messageContent);
                        break;
                    }
                    case "temple_timing":
                    case "temple_facilities":
                    case "temple_helpdesk":
                    case "how_to_reach":
                    case "foreign_oci": {
                        await handleTempleService(serviceId, messageContent);
                        break;
                    }
                    case "temple_services": {
                        await templeServices(messageContent);
                        await goBackToMainMenu(messageContent);
                        break;
                    }
                    case "Souvenir": {
                        await handleSouvenir(messageContent);
                        break;
                    }
                    case "about_temple": {
                        await handleAboutTemple(messageContent);
                        break;
                    }
                    default: {
                        responseMessage = 'Unsupported list reply ID';
                        break;
                    }
                }
            }
        } else if (
            messageType === "interactive" &&
            messageContent.type === "button_reply"
        ) {
            switch (messageContent.button_reply?.id) {
                case "ask_yes": {
                    let txt = await textToTextTranslationNMT("Please type your question", userLanguage);
                    responseMessage = txt;
                    userState.isAskingQuestion = true;
                    break;
                }
                case "main_menu": {
                    responseMessage = await selectService(userLanguage, messageContent);
                    break;
                }
                case "temple_history":
                case "about_skvt":
                case "trust_officials": {
                    await handleButtonReply(messageContent);
                    break;
                }
                default: {
                    responseMessage = 'Unsupported button reply ID';
                    break;
                }
            }
        } else {
            responseMessage = 'Unsupported message type';
        }

        res.json({ message: responseMessage, languages });
    } catch (error) {
        next(error);
    }
});

async function sendImage() {
}

async function sendWelcomeMessage() {
}

async function selectService(languageCode, message) {}

async function templeServices(message) {}

async function sendQuestionToAPI(question, userLanguage) {}

async function serviceResponse(serviceId, messageContent, userLanguage) {}

async function askMoreQuestions(messageText, userLanguage) {}

async function goBackToMainMenu(messageContent) {}

async function handleService(serviceId, messageContent) {}

async function handleAskQuestion(messageContent) {}

async function handleGiveFeedback(messageContent) {}

async function handleTempleService(serviceId, messageContent) {}

async function handleSouvenir(messageContent) {}

async function handleAboutTemple(messageContent) {}

async function handleButtonReply(messageContent) {}

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

