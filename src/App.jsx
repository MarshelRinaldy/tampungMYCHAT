import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import {
  getFirestore,
  onSnapshot,
  collection,
  addDoc,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc, // Tambahkan ini untuk update dokumen
} from 'firebase/firestore';
import { auth, app } from '../firebase';
import { MdDelete } from "react-icons/md";
import { MdEdit } from "react-icons/md";

const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // State untuk ID Pesan yang akan Diedit
  const [editedMessage, setEditedMessage] = useState(''); // State untuk Pesan yang akan Diedit

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }))
      );
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        setMessages([]);
      }
    });
  }, []);

  const sendMessage = async () => {
    await addDoc(collection(db, 'messages'), {
      uid: user.uid,
      photoURL: user.photoURL,
      displayName: user.displayName,
      text: newMessage,
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  const deleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message: ', error);
    }
  };

  const toggleDelete = (messageId) => {
    setSelectedMessage(selectedMessage === messageId ? null : messageId);
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.log(error);
    }
  };

  const saveEditedMessage = async (messageId) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        text: editedMessage,
      });
      setEditedMessage('');
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error updating message: ', error);
    }
  };

  return (
    <div className="container py-5" style={{ backgroundImage: 'url(/img/bg.jpg)', backgroundSize: 'cover', width: '1000px' }}>
      {user ? (
        <div className="w-75 mx-auto">
          <h1 style={{ color: 'white' }}>
            Group Chat{' '}
            <img className="rounded-circle me-2" src={user.photoURL} width="50" height="50" />
          </h1>
          <div className="text-white mb-4">Hello, {user.displayName}! </div>
          
          <div className="w-100">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message d-flex ${
                  msg.data.uid === user.uid ? 'justify-content-end' : 'justify-content-start'
                }`}
              >
                {msg.data.uid !== user.uid && (
                  <img
                    className="rounded-circle me-2 align-self-center"
                    src={msg.data.photoURL}
                    alt={msg.data.displayName}
                    width="50"
                    height="50"
                  />
                )}
                <div
                  className={`message-box p-3 rounded-3 mt-3 ${
                    msg.data.uid === user.uid
                      ? 'bg-primary text-white align-self-end'
                      : 'bg-light align-self-start'
                  }`}
                  style={{ maxWidth: '100%' }}
                  onClick={() => toggleDelete(msg.id)}
                >
                  <div className="d-flex align-items-center">
                    {msg.data.uid === user.uid && selectedMessage === msg.id && (
                      <React.Fragment>
                        <button onClick={() => deleteMessage(msg.id)} className="btn btn-primary me-2">
                          <MdDelete color='red' size={24}/>
                        </button>
                        <button onClick={() => setEditingMessageId(msg.id)} className="btn btn-primary">
                          <MdEdit color='black' size={24} />
                        </button>
                      </React.Fragment>
                    )}
                    {editingMessageId && editingMessageId === msg.id && (
                      <div className="d-flex w-100 mt-2">
                        <input
                          style={{width:'900px'}}
                          className="form-control me-2"
                          value={editedMessage}
                          onChange={(e) => setEditedMessage(e.target.value)}
                          placeholder="edit your massage"
                        />
                        <button className="btn btn-success" onClick={() => saveEditedMessage(msg.id)}>
                          Save
                        </button>
                        <button className="btn btn-secondary ms-2" onClick={() => setEditingMessageId(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                    {!editingMessageId && (
                      <React.Fragment>
                        <span style={{ wordWrap: 'break-word', width: '100%' }}>{msg.data.text}</span>
                        <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
                          {msg.data.timestamp && new Date(msg.data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </React.Fragment>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="d-flex w-100 mt-4">
            <input
              className="form-control me-2"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button className="btn btn-primary" onClick={sendMessage}>
              Send
            </button>
          </div>
          <button className="btn btn-secondary mt-3" onClick={() => auth.signOut()}>
            Logout
          </button>
        </div>
      ) : (
        <button style={{backgroundColor: 'white'}} className="btn btn-primary" onClick={handleGoogleLogin}>
          <img style={{width:'20px'}} src="img/googleLogo.png" alt="" />
        </button>
      )}
    </div>
  );
}

export default App;
