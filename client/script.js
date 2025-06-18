const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callBtn = document.getElementById('callBtn');
const shareScreenBtn = document.getElementById('shareScreenBtn');
const muteBtn = document.getElementById('muteBtn');
const cameraBtn = document.getElementById('cameraBtn');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let localStream;
let remoteStream;
let peerConnection;
let isAudio = true;
let isVideo = true;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  });

callBtn.onclick = () => {
  socket.emit('join', 'room');
};

shareScreenBtn.onclick = async () => {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const screenTrack = screenStream.getVideoTracks()[0];
  const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
  sender.replaceTrack(screenTrack);

  screenTrack.onended = () => {
    sender.replaceTrack(localStream.getVideoTracks()[0]);
  };
};

muteBtn.onclick = () => {
  isAudio = !isAudio;
  localStream.getAudioTracks()[0].enabled = isAudio;
  muteBtn.innerText = isAudio ? 'Unmute Mic' : 'Mute Mic';
};

cameraBtn.onclick = () => {
  isVideo = !isVideo;
  localStream.getVideoTracks()[0].enabled = isVideo;
  cameraBtn.innerText = isVideo ? 'Stop Cam' : 'Start Cam';
};

sendBtn.onclick = () => {
  const msg = messageInput.value;
  appendMessage('Me', msg);
  socket.emit('message', msg);
  messageInput.value = '';
};

function appendMessage(sender, msg) {
  chatBox.innerHTML += `<p><b>${sender}:</b> ${msg}</p>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

socket.on('message', msg => appendMessage('Peer', msg));

socket.on('offer', async offer => {
  peerConnection = createPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', answer => peerConnection.setRemoteDescription(new RTCSessionDescription(answer)));

socket.on('candidate', candidate => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)));

socket.on('ready', async () => {
  peerConnection = createPeerConnection();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
});

function createPeerConnection() {
  const pc = new RTCPeerConnection(config);
  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };
  pc.onicecandidate = e => {
    if (e.candidate) socket.emit('candidate', e.candidate);
  };
  return pc;
}
