import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
  apiKey: "AIzaSyC3Tm714fkNEMbPagNOm07eZH5DHEj8tik",
  authDomain: "nagarnigamayodhya-2fb11.firebaseapp.com",
  databaseURL: "https://nagarnigamayodhya-2fb11-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nagarnigamayodhya-2fb11",
  storageBucket: "nagarnigamayodhya-2fb11.appspot.com",
  messagingSenderId: "172526456587",
  appId: "1:172526456587:web:ef93305ffe604323dd5c0e",
  measurementId: "G-627JN1JJ2Y"
};

// Initialize Firebase
const database = initializeApp(firebaseConfig);
export default database;