const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCall = document.getElementById('startCall');
const shareScreen = document.getElementById('shareScreen');
const toggleMic = document.getElementById('toggleMic');
const toggleCam = document.getElementById('toggleCam');
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');

let room = 'webrtc_room';
let localStream, peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Auto-reconnect on reload
if (sessionStorage.getItem('joined')) {
  startCall.click();
}

// EVENTS
startCall.onclick = async () => {
  await setupMedia();
  socket.emit('join', room);
  sessionStorage.setItem('joined', '1');
  startCall.disabled = true;
  startCall.textContent = 'In Call';
};

shareScreen.onclick = async () => {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const screenTrack = screenStream.getVideoTracks()[0];
  const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
  sender.replaceTrack(screenTrack);
  screenTrack.onended = () => sender.replaceTrack(localStream.getVideoTracks()[0]);
};

toggleMic.onclick = () => {
  const track = localStream.getAudioTracks()[0];
  track.enabled = !(track.enabled);
  toggleMic.textContent = track.enabled ? 'Mute Mic' : 'Unmute Mic';
};

toggleCam.onclick = () => {
  const track = localStream.getVideoTracks()[0];
  track.enabled = !(track.enabled);
  toggleCam.textContent = track.enabled ? 'Stop Cam' : 'Start Cam';
};

chatInput.onkeydown = e => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    socket.emit('chat-message', { room, msg: chatInput.value });
    addChat('Me: ' + chatInput.value);
    chatInput.value = '';
  }
};

socket.on('chat-message', ({ msg }) => addChat('Peer: ' + msg));
socket.on('user-left', () => location.reload());

socket.on('offer', async data => {
  await setupMedia(false);
  await peerConnection.setRemoteDescription(data.offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', { room, answer });
});

socket.on('answer', data => peerConnection.setRemoteDescription(data.answer));

socket.on('ice-candidate', data => peerConnection.addIceCandidate(data.candidate));

// Helper to add messages
function addChat(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Common function to setup media & peer connection
async function setupMedia(isOffer = true) {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit('ice-candidate', { room, candidate: e.candidate });
  };
  peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];

  if (isOffer) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room, offer });
  }
}
