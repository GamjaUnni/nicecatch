import { useEffect, useRef, useState, useCallback } from 'react';

import movie from '../../../assets/video/movie.mp4';
import sticker01 from '../../../assets/images/icons/sticker_01.png';
import sticker02 from '../../../assets/images/icons/sticker_02.png';
import sticker03 from '../../../assets/images/icons/sticker_03.png';
import sticker04 from '../../../assets/images/icons/sticker_04.png';
import sticker05 from '../../../assets/images/icons/sticker_08.png';
import sticker06 from '../../../assets/images/icons/sticker_10.png';
import './Profile.scss';

const sample = [
  {
    win: 4,
    image: sticker02,
    name: '잠자는 사자의 코털',
  },
  {
    win: 2,
    image: sticker03,
    name: '잠자는 코털',
  },
  {
    win: 5,
    image: sticker04,
    name: 'hyub',
  },
  {
    win: 3,
    image: sticker05,
    name: 'gamja',
  },
  {
    win: 1,
    image: sticker06,
    name: 'ggomi',
  },
];

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

const Profile = ({ socket, username, room }) => {
  const meVideoRef = useRef();
  const remoteVideoRef = useRef();
  // const remoteRef = useRef({});
  const rtcPeerConnectionRef = useRef();
  const localStreamRef = useRef();
  const remoteStreamRef = useRef();
  const [myRoomUsers, setMyRoomUsers] = useState([]);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const getUserInfo = async () => {
    const data = { room: room };
    await socket?.emit('myRoomInfo', data);
  };

  const addLocalTracks = (rtcPeerConnection) => {
    localStreamRef.current?.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, localStreamRef.current);
    });
  };

  // 원격지 미디어 정보 세팅
  const settingRemoteStreamFn = (event) => {
    console.log('settingRemoteStreamFn');
    console.log(remoteVideoRef.current);
    console.log(event.streams);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
      remoteStreamRef.current = event.stream;
    }
  };

  // 로컬 미디어 정보 세팅
  const settingLocalStreamFn = async () => {
    const mediaConstraints = {
      audio: true,
      video: true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints,
      );
      localStreamRef.current = stream;
      meVideoRef.current.srcObject = stream;
    } catch (e) {
      console.warn('에러가 발생했습니다', e);
    }
  };

  // createOffer: 새로운 WebRTC세션을 시작하고 원격 피어와 연결을 설정을 시작
  const createOffer = useCallback(async () => {
    let sessionDescription;
    try {
      sessionDescription = await rtcPeerConnectionRef.current.createOffer();
      // setLocalDescription:
      // setRemoteDescription:
      // 각각 로컬 및 원격 세션 설명을 설정하는데 사용
      console.log(sessionDescription);
      rtcPeerConnectionRef.current.setLocalDescription(sessionDescription);
    } catch (error) {
      console.error(error);
    }

    socket?.emit('webrtcOffer', {
      type: 'webrtc_offer',
      sdp: sessionDescription,
      room,
    });
  }, [room, socket]);

  const createAnswer = async (rtcPeerConnection) => {
    let sessionDescription;
    try {
      sessionDescription = await rtcPeerConnection.createAnswer();
      rtcPeerConnection.setLocalDescription(sessionDescription);
    } catch (error) {
      console.error(error);
    }

    socket?.emit('webrtcAnswer', {
      type: 'webrtc_answer',
      sdp: sessionDescription,
      room,
    });
  };

  // const createAnswer = useCallback(
  //   async (rtcPeerConnection) => {
  //     let sessionDescription;
  //     try {
  //       sessionDescription = await rtcPeerConnection.createAnswer();
  //       rtcPeerConnection.setLocalDescription(sessionDescription);
  //     } catch (error) {
  //       console.error(error);
  //     }

  //     socket?.emit('webrtcAnswer', {
  //       type: 'webrtcAnswer',
  //       sdp: sessionDescription,
  //       room,
  //     });
  //   },
  //   [room, socket],
  // );

  const sendIceCandidate = useCallback(
    (event) => {
      console.log('sendIceCandidate');
      console.log(event);
      if (event.candidate) {
        socket?.emit('webrtcIceCandidate', {
          room,
          label: event.candidate.sdpMLineIndex,
          candidate: event.candidate.candidate,
        });
      }
    },
    [room, socket],
  );

  // 소켓 정보받기
  useEffect(() => {
    // 유저정보 받기
    socket?.on('myRoomUserInfo', (response) => {
      console.log('Socket event callback: myRoomUserInfo');
      const { data } = response;
      const userInfo = data.map((x) =>
        x.id === socket?.id ? { ...x, type: 'me' } : { ...x, type: 'other' },
      );
      setMyRoomUsers(userInfo);
      setIsRoomCreator(userInfo.length > 0 ? true : false);
    });

    // 화상연결 접근
    socket?.on('videoChatConnectInit', () => {
      console.log('Socket event callback: videoChatConnectInit');
      settingLocalStreamFn();
    });

    socket?.on('videoChatConnect', () => {
      console.log('Socket event callback: videoChatConnect');
      settingLocalStreamFn();
      socket?.emit('startCall', room);
    });
    // 사용자간 화상연결 시작
    socket?.on('startCall', async () => {
      console.log('Socket event callback: startCall');
      if (isRoomCreator) {
        rtcPeerConnectionRef.current = new RTCPeerConnection(iceServers);
        addLocalTracks(rtcPeerConnectionRef.current);
        rtcPeerConnectionRef.current.ontrack = settingRemoteStreamFn;
        rtcPeerConnectionRef.current.onicecandidate = sendIceCandidate;
        await createOffer(rtcPeerConnectionRef.current);
      }
    });

    socket?.on('webrtcOffer', async (event) => {
      console.log('Socket event callback: webrtcOffer');
      if (!isRoomCreator) {
        rtcPeerConnectionRef.current = new RTCPeerConnection(iceServers);
        addLocalTracks(rtcPeerConnectionRef.current);
        rtcPeerConnectionRef.current.ontrack = settingRemoteStreamFn;
        rtcPeerConnectionRef.current.onicecandidate = sendIceCandidate;
        rtcPeerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(event),
        );
        await createAnswer(rtcPeerConnectionRef.current);
      }
    });

    socket?.on('webrtcAnswer', (event) => {
      console.log('Socket event callback: webrtcAnswer');
      rtcPeerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(event),
      );
    });

    socket?.on('webrtcIceCandidate', (event) => {
      console.log('Socket event callback: webrtcIceCandidate');
      // ICE candidate configuration.
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate,
      });
      rtcPeerConnectionRef.current.addIceCandidate(candidate);
    });
  }, [socket, room, createAnswer, createOffer, sendIceCandidate]);

  // 처음 프로필 컴포넌트 접근시 유저정보 받아오기
  useEffect(() => {
    setTimeout(() => {
      getUserInfo();
    }, 100);
  }, []);

  return (
    <ul className="profile_area">
      {myRoomUsers.map((info, i) => (
        <li key={info.id} className={info.type}>
          <div className="profile">
            {info.type === 'me' ? (
              <video ref={meVideoRef} autoPlay />
            ) : (
              <video ref={remoteVideoRef} autoPlay />
              // <video
              //   ref={(element) => (remoteRef.current[i] = element)}
              //   autoPlay
              // />
            )}
            <em>0</em>
          </div>
          <p>{info.username}</p>
        </li>
      ))}
    </ul>
  );
};

export default Profile;
