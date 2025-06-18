const socket = io();
let localStream;
let remoteStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function joinCall() {
  const username = document.getElementById('username').value;
  const room = document.getElementById('room').value;
  const enableVideo = document.getElementById('videoCheck').checked;
  const enableAudio = document.getElementById('audioCheck').checked;

  if (!username || !room) return alert('Please fill in all fields.');

  document.getElementById('join-screen').classList.add('hidden');
  document.getElementById('chat-screen').classList.remove('hidden');

  navigator.mediaDevices.getUserMedia({ video: enableVideo, audio: enableAudio }).then(stream => {
    localStream = stream;
    document.getElementById('local').innerHTML = '';
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    document.getElementById('local').appendChild(video);

    socket.emit('join', room);
  });
}

socket.on('offer', (id, description) => {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => {
    document.getElementById('remote').innerHTML = '';
    const video = document.createElement('video');
    video.srcObject = e.streams[0];
    video.autoplay = true;
    document.getElementById('remote').appendChild(video);
  };
  peerConnection.setRemoteDescription(description).then(() =>
    peerConnection.createAnswer()
  ).then(answer => {
    peerConnection.setLocalDescription(answer);
    socket.emit('answer', id, answer);
  });
});

socket.on('answer', description => {
  peerConnection.setRemoteDescription(description);
});

socket.on('candidate', candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('ready', id => {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit('candidate', id, e.candidate);
  };

  peerConnection.ontrack = e => {
    document.getElementById('remote').innerHTML = '';
    const video = document.createElement('video');
    video.srcObject = e.streams[0];
    video.autoplay = true;
    document.getElementById('remote').appendChild(video);
  };

  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit('offer', id, offer);
  });
});

function toggleMic() {
  localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
}

function toggleVideo() {
  localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
}

function shareScreen() {
  navigator.mediaDevices.getDisplayMedia({ video: true }).then(screenStream => {
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
    sender.replaceTrack(screenTrack);
  });
}

function leaveCall() {
  if (peerConnection) peerConnection.close();
  window.location.reload();
}
