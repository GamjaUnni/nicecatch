import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import GameLayout from '../../atoms/GameLayout/GameLayout';
import './LoginPage.scss';
import Draw from '../DrawPage/DrawPage';
import Chat from '../ChatPage/ChatPage';
import Quiz from '../QuizPage/QuizPage';

const socket = io.connect('http://localhost:3001');

const Login = () => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  const onQuiz = () => setQuizMode((prev) => !prev);

  const joinRoom = () => {
    if (username !== '' && room !== '') {
      socket.emit('join_room', { username, room });
      setShowChat(true);
    }
  };

  useEffect(() => {
    socket.on('fullRoom', (response) => {
      console.log(response);
    });
  }, []);

  return (
    <div className="home">
      {!showChat ? (
        <div className="join_chat_container">
          <h3>Nice Catch</h3>
          <input
            type="text"
            placeholder="닉네임을 입력해주세요"
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
          <input
            type="text"
            placeholder="방 아이디를 입력해주세요"
            onChange={(e) => {
              setRoom(e.target.value);
            }}
          />
          <button onClick={joinRoom}>입장하기</button>
          <button onClick={onQuiz}>{quizMode ? '퀴즈게임' : '대전게임'}</button>
        </div>
      ) : (
        <GameLayout socket={socket} username={username} room={room}>
          <div className="game_box">
            {quizMode ? <Quiz /> : <Draw />}
            <Chat socket={socket} username={username} room={room} />
          </div>
        </GameLayout>
      )}
    </div>
  );
};
export default Login;
