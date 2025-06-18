const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCall = document.getElementById("startCall");

let localStream;
let peerConnection;
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

startCall.onclick = async () => {
  const room = "room123"; // static room
  socket.emit("join", room);

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice-candidate", { room, candidate: e.candidate });
    }
  };

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { room, offer });
};

socket.on("offer", async ({ offer }) => {
  peerConnection = new RTCPeerConnection(config);

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice-candidate", { room: "room123", candidate: e.candidate });
    }
  };

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { room: "room123", answer });
});

socket.on("answer", async ({ answer }) => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on("ice-candidate", async ({ candidate }) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (e) {
    console.error("Error adding ICE candidate", e);
  }
});
