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
  getDoc,
  updateDoc, // Tambahkan ini untuk update dokumen
} from 'firebase/firestore';
import { auth, app } from '../firebase';
import { MdDelete } from "react-icons/md";
import { MdEdit } from "react-icons/md";

import { v4 as uuidv4 } from 'uuid';

import Modal from 'react-modal';
import VoteResults from './VoteResults';

Modal.setAppElement('#root');

const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // State untuk ID Pesan yang akan Diedit
  const [editedMessage, setEditedMessage] = useState(''); // State untuk Pesan yang akan Diedit

  const [modalIsOpen, setModalIsOpen] = useState(false);

  const [pollSubject, setPollSubject] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  const [selectedPollOptions, setSelectedPollOptions] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [optionsPool, setOptionsPool] = useState([]);
  
  const customStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
      width: '50%',
      margin: 'auto',
    },
  };

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

  useEffect(() => {
    const pollMsg = messages.find(message => message.data.text === 'Polling');
    if(pollMsg) {
      const userVotedOptions = Object.values(pollMsg.data.options || {});
      const foundOption = userVotedOptions.find(option => (option.voters || []).includes(user.displayName));
      const foundOptionId = foundOption ? foundOption.id : null;
      setSelectedPollOptions(foundOptionId);
    }
  },[]);

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

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handlePollSubmit = async () => {
    try {
      const pollRef = await addDoc(collection(db, 'messages'), {
        uid: user.uid, 
        photoURL: user.photoURL,
        displayName: user.displayName,
        text: "Polling",
        subject: pollSubject,
        options: pollOptions.reduce((acc, option) => {
          if (option.trim() !== '') {
            const optionId = uuidv4();
            acc[optionId] = {
              id: optionId,
              text: option.trim(),
              voters: [] 
            };
          }
          return acc;
        }, {}),
        timestamp: serverTimestamp(),
      });
      setPollSubject('');
      setPollOptions(['', '']);
      closeModal();
    } catch (error) {
      console.error('Error adding poll:', error);
    }
    closeModal();
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

 const handlePollOptionClick = async (messageId, optionId) => {
  if (selectedMessage === null) {
    try {
      const messageToUpdate = messages.find((msg) => msg.id === messageId);
      const userVotedOption = messageToUpdate.data.options?.[optionId]?.voters || [];
      const userVotedOptions = Object.values(messageToUpdate.data.options || {}).map(option => option.voters || []).flat();
      
      if(userVotedOptions.includes(user.displayName)) {
        const userVotedOptions2 = Object.values(messageToUpdate.data.options || {});
        const foundOption = userVotedOptions2.find(option => (option.voters || []).includes(user.displayName));
        const foundOptionId = foundOption ? foundOption.id : null;
        setSelectedPollOptions(foundOptionId);

        const userVotedOptionDel = messageToUpdate.data.options[foundOptionId].voters || [];
        const updatedVoters = userVotedOptionDel.filter((voter) => voter !== user.displayName);
        if(selectedPollOptions !== optionId){
          await updateDoc(doc(db, 'messages', messageId), {
            [`options.${foundOptionId}.voters`]: updatedVoters,
          });
        }
      } else {
        if (selectedPollOptions !== optionId) {
          await updateDoc(doc(db, 'messages', messageId), {
            [`options.${optionId}.voters`]: [...userVotedOption, user.displayName],
          });

          setSelectedPollOptions(optionId);

          showVoteResults(messageId);
        }
      }
    } catch (error) {
      console.error('Error updating selected option: ', error);
    }
  }
};

const showVoteResults = async(messageId) => {
    try {
      const pollSnapshot = await getDoc(doc(db, 'messages', messageId));
      const pollData = pollSnapshot.data();

      setOptionsPool(Object.values(pollData.options));
    } catch (error) {
      console.error('Error fetching poll data:', error);
    }
  };
  console.log(messages);
  return (
    
    <div className="container py-5" style={{ backgroundImage: 'url(/img/bg.jpg)', backgroundSize: 'cover', width: '1000px' }}>
      {user ? (
        <div className="w-75 mx-auto">
          <h1 style={{ color: 'white' }}>
            Group Chat{' '}
            <img className="rounded-circle me-2" src={user.photoURL} width="50" height="50" />
          </h1>
          <div className="text-white mb-4">Hello, {user.displayName}! </div>
          
          <div className="max-w-700">
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
                    {msg.data.uid === user.uid && selectedMessage === msg.id && msg.data.text !== "Polling" &&(
                      <React.Fragment>
                        <button onClick={() => deleteMessage(msg.id)} className="btn btn-primary me-2">
                          <MdDelete color='red' size={24}/>
                        </button>
                        <button onClick={() => setEditingMessageId(msg.id)} className="btn btn-primary">
                          <MdEdit color='black' size={24} />
                        </button>
                      </React.Fragment>
                    )}
                    {msg.data.uid === user.uid && selectedMessage === msg.id && msg.data.text === "Polling" &&(
                      <React.Fragment>
                        <button onClick={() => deleteMessage(msg.id)} className="btn btn-primary me-2">
                          <MdDelete color='red' size={24}/>
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
                      {msg.data.text === "Polling" ? (
                        <div className="poll-container">
                          <p className="poll-subject">{msg.data.subject}</p>
                          <ul className="poll-options">
                            {Object.values(msg.data.options).map((option) => (
                              <li key={option.id} className="poll-option">
                                <input
                                  type="radio"
                                  className="poll-radio"
                                  id={`option-${option.id}`}
                                  name={`poll-options-${msg.id}`}
                                  checked={selectedPollOptions === option.id}
                                  onClick={() => handlePollOptionClick(msg.id, option.id)}
                                />
                                <label className="poll-label" htmlFor={`option-${option.id}`}>
                                  {option.text}
                                </label>
                              </li>
                            ))}
                          </ul>
                          <button 
                              className="btn btn-primary" 
                              onClick={() => {
                                setShowResults(prevState => !prevState);
                                showVoteResults(msg.id);
                              }}
                            >
                            Hasil Vote
                          </button>
                          {showResults && (
                            <VoteResults options={optionsPool} />
                          )}
                        </div>
                        
                      ) : (
                        <React.Fragment>
                          <span style={{ wordWrap: 'break-word', width: '100%' }}>{msg.data.text}</span>
                          <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
                            {msg.data.timestamp && new Date(msg.data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </React.Fragment>
                      )}
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
            <button onClick={openModal}>Create Poll</button>
      
          </div>
          <button className="btn btn-secondary mt-3" onClick={() => auth.signOut()}>
            Logout
          </button>
          {/* Modal untuk Polling */}
          <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            contentLabel="Example Modal"
            style={customStyles}
          >
            <h2>Create Poll</h2>
            <div>
              <label>Ajukan Pertanyaan</label>
              <input
                type="text"
                value={pollSubject}
                onChange={(e) => setPollSubject(e.target.value)}
              />
            </div>
            <div>
              <label>Options:</label>
              {pollOptions.map((option, index) => (
                <div key={index}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                </div>
              ))}
              <button onClick={handleAddOption}>Add Option</button>
            </div>
            <button onClick={handlePollSubmit}>Submit Poll</button>
            <button onClick={closeModal}>Close</button>
          </Modal>
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
