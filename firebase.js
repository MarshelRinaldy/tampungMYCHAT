// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMliBBvgw18K0GWl4XeSGyMoWEJixrCNo",
  authDomain: "mychatapp-63a4e.firebaseapp.com",
  projectId: "mychatapp-63a4e",
  storageBucket: "mychatapp-63a4e.appspot.com",
  messagingSenderId: "655550433239",
  appId: "1:655550433239:web:6dc77514c4dadc87bcad92",
  measurementId: "G-4PKP1S563T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {auth, app}