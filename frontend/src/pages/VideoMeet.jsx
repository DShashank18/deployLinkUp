import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState(false);

    let [isScreenSharing, setIsScreenSharing] = useState(false);

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }
    // Full-screen function
    // const enterFullScreen = (element) => {
    //     if (element.requestFullscreen) {
    //         element.requestFullscreen();
    //     } else if (element.mozRequestFullScreen) { // Firefox
    //         element.mozRequestFullScreen();
    //     } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
    //         element.webkitRequestFullscreen();
    //     } else if (element.msRequestFullscreen) { // IE/Edge
    //         element.msRequestFullscreen();
    //     }
    // };
    const enterFullScreen = (element) => {
    if (!element) {
        console.error("Invalid element passed to enterFullScreen");
        return;
    }
    if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => console.error("Error entering fullscreen:", err));
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    } else {
        console.error("Fullscreen API is not supported by this browser.");
    }
};


    // Exit full-screen function
    const exitFullScreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    };

    useEffect(() => {
        console.log("HELLO")
        getPermissions();

    })

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);

        }


    }, [video, audio])
    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();

    }




    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);
        // getUserMedia();
    }
    let handleAudio = () => {
        setAudio(!audio)
        // getUserMedia();
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    let handleScreen = () => {
    // setScreen(!screen);
    // setIsScreenSharing(!screen);
    console.log("handleScreen triggered, screen =", screen);
    if (!screen) {
            // Start screen sharing
            startScreenShare();
            setScreen(true);
            setIsScreenSharing(true);
            enterFullScreen(document.documentElement); // Enter full screen when sharing starts
        } 
    else {
            // Stop screen sharing
            stopScreenShare();
            setScreen(false);
            setIsScreenSharing(false);
            exitFullScreen(); // Exit full screen when sharing stops
        }
    }
    // Mock start screen share function
    const startScreenShare = () => {
        console.log('Screen sharing started');
        // Add your actual screen sharing logic here
    };

    // Mock stop screen share function
    const stopScreenShare = () => {
        console.log('Screen sharing stopped');
        // Add your actual stop screen sharing logic here
    };
    // Start screen share function
// const startScreenShare = async () => {
//     try {
//         // Request to get the display media (screen)
//         const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

//         // Set the screen stream to the local video reference
//         localVideoref.current.srcObject = screenStream;

//         // Add the screen stream to all peer connections
//         for (let id in connections) {
//             if (id === socketIdRef.current) continue;

//             // Add the screen stream to the connection
//             connections[id].addStream(screenStream);

//             // Create an offer and send it to the other user
//             connections[id].createOffer().then((description) => {
//                 connections[id].setLocalDescription(description).then(() => {
//                     socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
//                 }).catch(e => console.log(e));
//             }).catch(e => console.log(e));
//         }

//         // Handle track ending event
//         screenStream.getVideoTracks()[0].onended = () => {
//             stopScreenShare(); // Stop screen sharing if the track ends
//         };

//         setIsScreenSharing(true); // Update the state to indicate screen sharing is active
//     } catch (error) {
//         console.error("Error starting screen share:", error);
//     }
// };

// // Stop screen share function
// const stopScreenShare = () => {
//     // Stop all tracks in the screen stream
//     const tracks = localVideoref.current.srcObject.getTracks();
//     tracks.forEach(track => track.stop());

//     // Reset the video source to the local stream
//     if (window.localStream) {
//         localVideoref.current.srcObject = window.localStream;
//     }

//     // Notify all peers that screen sharing has stopped
//     for (let id in connections) {
//         if (id === socketIdRef.current) continue;

//         // Create an offer to reset the connection
//         connections[id].addStream(window.localStream);
//         connections[id].createOffer().then((description) => {
//             connections[id].setLocalDescription(description).then(() => {
//                 socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
//             }).catch(e => console.log(e));
//         }).catch(e => console.log(e));
//     }

//     setIsScreenSharing(false); // Update the state to indicate screen sharing is stopped
// };

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }


    return (
    <div>
        {askForUsername === true ? (
            <div>
                <h2>Enter into Lobby </h2>
                <TextField 
                    id="outlined-basic" 
                    label="Username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    variant="outlined" 
                />
                <Button variant="contained" onClick={connect}>Connect</Button>

                <div>
                    <video ref={localVideoref} autoPlay muted></video>
                </div>
            </div>
        ) : (
            <div className={styles.meetVideoContainer}>
                {showModal && (
                    <div className={styles.chatRoom}>
                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>
                            <div className={styles.chattingDisplay}>
                                {messages.length !== 0 ? messages.map((item, index) => (
                                    <div style={{ marginBottom: "20px" }} key={index}>
                                        <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                        <p>{item.data}</p>
                                    </div>
                                )) : <p>No Messages Yet</p>}
                            </div>

                            <div className={styles.chattingArea}>
                                <TextField 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    id="outlined-basic" 
                                    label="Enter Your chat" 
                                    variant="outlined" 
                                />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.buttonContainers}>
                    <IconButton onClick={handleVideo} style={{ color: "white" }}>
                        {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                    </IconButton>
                    <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                        <CallEndIcon />
                    </IconButton>
                    <IconButton onClick={handleAudio} style={{ color: "white" }}>
                        {audio === true ? <MicIcon /> : <MicOffIcon />}
                    </IconButton>

                    {screenAvailable === true && (
                        <IconButton onClick={handleScreen} style={{ color: "white" }}>
                            {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                        </IconButton>
                    )}

                    <Badge badgeContent={newMessages} max={999} color='orange'>
                        <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                            <ChatIcon />
                        </IconButton>
                    </Badge>
                </div>

                <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

                <div className={`${styles.conferenceView} ${isScreenSharing ? styles.hasScreenShare : ''}`}>
                    {videos.map((video) => (
                         <video
            key={video.socketId}
            data-socket={video.socketId}
            ref={ref => {
                if (ref && video.stream) {
                    ref.srcObject = video.stream;
                }
            }}
            autoPlay
        />
                    ))}
                </div>
            </div>
        )}
    </div>
);
}
