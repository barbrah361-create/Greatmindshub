
const ROOM_ID = '"EJS"';
const IS_HOST = "EJS";
const CURRENT_USER = {
  id: '"EJS"',
  username: '"EJS"',
  avatar: '"EJS"'
};

let isCoHostActive = false;
let myGuestStream = null;
let currentMediaStream = null;
let isMicMuted = false;
let pcOut = {};
let pcIn = {}; // Separate incoming and outgoing PCs

// ── WebRTC Configuration ──
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// ── Socket.io Connection ──
const socket = io('"EJS"');
socket.emit('join-room', {
  roomId: ROOM_ID,
  userId: CURRENT_USER.id,
  username: CURRENT_USER.username,
  avatar: CURRENT_USER.avatar,
  isHost: IS_HOST
});

// Viewers count & live participants registry
socket.on('viewer-count', (data) => {
  const el = document.getElementById('viewerCount');
  if (el) el.textContent = data.count;
  const countEl = document.getElementById('modalParticipantsCount');
  if (countEl) countEl.textContent = data.count;
});

// Receive updated room participants list
socket.on('room-participants', (data) => {
  if (data && data.participants) {
    roomViewers = data.participants;
    renderParticipantsModalList();
    renderActiveViewersList();
  }
});

function openParticipantsModal() {
  document.getElementById('liveParticipantsModal').classList.remove('hidden');
  socket.emit('get-participants', { roomId: ROOM_ID });
  renderParticipantsModalList();
}

function closeParticipantsModal() {
  document.getElementById('liveParticipantsModal').classList.add('hidden');
}

function renderParticipantsModalList() {
  const list = document.getElementById('modalParticipantsList');
  if (!list) return;

  const countEl = document.getElementById('modalParticipantsCount');
  if (countEl) countEl.textContent = roomViewers.length;

  if (roomViewers.length === 0) {
    list.innerHTML = '<div class="text-center py-8 text-gray-400 text-xs"><p>Loading participants...</p></div>';
    return;
  }

  list.innerHTML = '';
  roomViewers.forEach((p, idx) => {
    const isMe = p.userId === CURRENT_USER.id;
    const isRoomHost = p.role === 'host' || p.userId === '"EJS"';
    const isGuest = p.role === 'guest';

    const card = document.createElement('div');
    card.className = 'flex items-center justify-between bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl border border-white/5 transition-all';
    
    let badgeHtml = '';
    if (isRoomHost) {
      badgeHtml = '<span class="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">HOST</span>';
    } else if (isGuest) {
      badgeHtml = '<span class="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">GUEST</span>';
    } else {
      badgeHtml = '<span class="bg-white/10 text-gray-300 text-[8px] font-bold px-1.5 py-0.5 rounded">VIEWER</span>';
    }

    let actionsHtml = '';
    if (isMe) {
      actionsHtml = '<span class="text-[10px] text-gray-400 font-bold px-2 py-1 bg-white/5 rounded-lg">You</span>';
    } else {
      actionsHtml = '<div class="flex items-center gap-1.5">' +
        '<button onclick="toggleFollowUser(\'' + p.userId + '\', \'followBtn_' + idx + '\')" id="followBtn_' + idx + '" class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-1">' +
          '<i data-lucide="user-plus" class="w-2.5 h-2.5"></i> <span>+ Follow</span>' +
        '</button>' +
        (p.userId ? '<a href="/messages/' + p.userId + '" target="_blank" title="Direct Message" class="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-brand-pink"><i data-lucide="message-square" class="w-3.5 h-3.5"></i></a>' : '') +
        (IS_HOST ? '<button onclick="inviteViewerToCoHost(\'' + p.userId + '\', \'' + p.username + '\')" title="Invite on Stage" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-bold rounded-xl"><i data-lucide="video" class="w-3 h-3"></i></button>' : '') +
      '</div>';
    }

    card.innerHTML = '<div class="flex items-center gap-2.5 truncate">' +
      '<img src="' + (p.avatar || '/uploads/default-avatar.png') + '" class="w-9 h-9 rounded-full object-cover ring-1 ring-white/20 shrink-0" alt="">' +
      '<div class="truncate">' +
        '<div class="flex items-center gap-1.5 truncate">' +
          '<span class="text-xs font-bold text-white truncate">' + p.username + '</span>' +
          badgeHtml +
        '</div>' +
        '<p class="text-[9px] text-gray-400 font-mono">In room</p>' +
      '</div>' +
    '</div>' + actionsHtml;

    list.appendChild(card);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Likes count
socket.on('heart-received', (data) => {
  const el = document.getElementById('likesCount');
  if (el && data.likesCount) el.textContent = data.likesCount;
  spawnStreamHeart();
});

// User joined
socket.on('user-joined', (data) => {
  const feed = document.getElementById('liveChatFeed');
  if (!feed) return;
  const msg = document.createElement('div');
  msg.className = 'inline-flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-md px-3 py-1 rounded-2xl border border-blue-500/20';
  msg.innerHTML = '<img src="' + data.avatar + '" class="w-3.5 h-3.5 rounded-full">' +
    '<span class="text-blue-300 text-[11px] font-semibold">' + data.username + ' joined the live</span>';
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight;
  setTimeout(() => msg.remove(), 4000);

  if (data.socketId && data.socketId !== socket.id) {
    if (IS_HOST && currentMediaStream) {
      createPeerOffer(data.socketId, 'host', currentMediaStream);
    }
    if (isCoHostActive && myGuestStream) {
      createPeerOffer(data.socketId, 'guest', myGuestStream);
    }
  }
});

// Chat message
let selectedChatUser = { id: '', username: '', avatar: '' };

socket.on('chat-message', (data) => {
  const feed = document.getElementById('liveChatFeed');
  if (!feed) return;
  const msg = document.createElement('div');
  msg.className = 'inline-flex items-start gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 max-w-[90%] cursor-pointer hover:border-brand-pink/50 transition-colors';
  msg.onclick = () => openChatUserPopover(data.userId, data.username, data.avatar);
  msg.innerHTML = '<span class="text-amber-400 text-xs font-bold shrink-0 hover:underline">' + data.username + ':</span>' +
    '<span class="text-white text-xs leading-relaxed">' + data.message + '</span>';
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight;
});

function openChatUserPopover(userId, username, avatar) {
  if (!userId || userId === CURRENT_USER.id) return;
  selectedChatUser = { id: userId, username, avatar };
  document.getElementById('popoverAvatar').src = avatar || '/uploads/default-avatar.png';
  document.getElementById('popoverUsername').textContent = username;
  document.getElementById('popoverDmLink').href = '/messages/' + userId;
  const popover = document.getElementById('userProfilePopover');
  popover.style.left = '20px';
  popover.style.bottom = '110px';
  popover.classList.remove('hidden');
}

function handlePopoverFollow() {
  if (selectedChatUser.id) {
    toggleFollowUser(selectedChatUser.id, 'popoverFollowBtn');
  }
}

function handlePopoverInvite() {
  if (selectedChatUser.id) {
    inviteViewerToCoHost(selectedChatUser.id, selectedChatUser.username);
    document.getElementById('userProfilePopover').classList.add('hidden');
  }
}

function sendLiveComment(e) {
  e.preventDefault();
  const input = document.getElementById('liveChatInput');
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat-message', {
    roomId: ROOM_ID,
    userId: CURRENT_USER.id,
    username: CURRENT_USER.username,
    avatar: CURRENT_USER.avatar,
    message: text
  });
  input.value = '';
}

// ── WebRTC Media Stream Handlers (Broadcasting to Viewers) ──
async function createPeerOffer(targetSocketId, role = IS_HOST ? 'host' : 'guest', stream = currentMediaStream) {
  try {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcOut[targetSocketId] = pc;

    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice', { roomId: ROOM_ID, candidate: event.candidate, senderId: socket.id, targetId: targetSocketId, isOffer: true });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc-offer', { roomId: ROOM_ID, sdp: offer, senderId: socket.id, targetId: targetSocketId, role: role });
  } catch (err) {
    console.warn('WebRTC offer error:', err);
  }
}

socket.on('webrtc-offer', async (data) => {
  if (IS_HOST && data.role === 'host') return;
  if (data.senderId === socket.id) return;
  try {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcIn[data.senderId] = pc;

    pc.ontrack = (event) => {
      const videoId = data.role === 'host' ? 'liveVideoFeed' : 'guestVideoFeed';
      const video = document.getElementById(videoId);
      if (video && event.streams[0]) {
        video.srcObject = event.streams[0];
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          video.play();
          if (data.role === 'host') document.getElementById('unmuteAudioBanner').classList.remove('hidden');
        });
        if (data.role === 'guest') {
          let guestName = 'Co-Host';
          const guestObj = roomViewers.find(v => v.socketId === data.senderId);
          if (guestObj) guestName = guestObj.username;
          setupDualSplitScreen(guestName);
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice', { roomId: ROOM_ID, candidate: event.candidate, senderId: socket.id, targetId: data.senderId, isOffer: false });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    if (pc.iceQueue) {
      for (const candidate of pc.iceQueue) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
      }
      pc.iceQueue = [];
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc-answer', { roomId: ROOM_ID, sdp: answer, senderId: socket.id, targetId: data.senderId, role: data.role });
  } catch (err) {
    console.warn('WebRTC receive offer error:', err);
  }
});

socket.on('webrtc-answer', async (data) => {
  const pc = pcOut[data.senderId];
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    if (pc.iceQueue) {
      for (const candidate of pc.iceQueue) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
      }
      pc.iceQueue = [];
    }
  }
});

socket.on('webrtc-ice', async (data) => {
  if (data.senderId === socket.id) return;
  const pc = data.isOffer ? pcIn[data.senderId] : pcOut[data.senderId];
  if (pc && data.candidate) {
    try {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        if (!pc.iceQueue) pc.iceQueue = [];
        pc.iceQueue.push(data.candidate);
      }
    } catch (e) {
      console.warn('ICE add error:', e);
    }
  }
});

// Enable audio when viewer taps unmute banner
function enableViewerAudio() {
  const video = document.getElementById('liveVideoFeed');
  if (video) {
    video.muted = false;
    document.getElementById('unmuteAudioBanner').classList.add('hidden');
  }
}

// ── Real-Time Audio Activity Meter & Web Audio Analyser ──
let audioContext = null;
let audioAnalyser = null;
let audioDataArray = null;
let isLoopbackActive = false;
let loopbackNode = null;

function initAudioAnalyser(stream) {
  try {
    if (!stream || stream.getAudioTracks().length === 0) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    audioContext = new AudioCtx();
    const source = audioContext.createMediaStreamSource(stream);
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 64;
    audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    source.connect(audioAnalyser);

    monitorAudioLevels();
  } catch (err) {
    console.warn('Audio analyser init error:', err);
  }
}

function monitorAudioLevels() {
  if (!audioAnalyser || !audioDataArray) return;
  audioAnalyser.getByteFrequencyData(audioDataArray);

  let sum = 0;
  for (let i = 0; i < audioDataArray.length; i++) {
    sum += audioDataArray[i];
  }
  const averageVolume = sum / audioDataArray.length;

  const hostWave = document.getElementById('hostSpeakingIndicator');
  const hostLabel = document.getElementById('hostMicLabel');

  if (averageVolume > 15 && !isMicMuted) {
    if (hostWave) hostWave.classList.remove('opacity-40');
    if (hostLabel) hostLabel.textContent = 'Speaking 🟢';
  } else {
    if (hostWave) hostWave.classList.add('opacity-40');
    if (hostLabel) hostLabel.textContent = isMicMuted ? 'Muted' : 'Mic Ready';
  }

  requestAnimationFrame(monitorAudioLevels);
}

// Hear Myself / Voice Loopback Monitor
function toggleVoiceLoopback() {
  const stream = currentMediaStream || myGuestStream;
  if (!stream || stream.getAudioTracks().length === 0) {
    showCameraToast('Please enable camera/microphone first.');
    return;
  }

  const btn = document.getElementById('voiceLoopbackBtn');
  const icon = document.getElementById('loopbackIcon');

  if (!isLoopbackActive) {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      loopbackNode = audioContext.createGain();
      loopbackNode.gain.value = 0.8;
      source.connect(loopbackNode);
      loopbackNode.connect(audioContext.destination);

      isLoopbackActive = true;
      btn.className = 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transition-all ring-2 ring-blue-400';
      showCameraToast('🎧 Mic Monitor ON: You can now hear your own voice (Use headphones to prevent echo)');
    } catch (err) {
      alert('Could not start voice monitor.');
    }
  } else {
    if (loopbackNode) {
      loopbackNode.disconnect();
      loopbackNode = null;
    }
    isLoopbackActive = false;
    btn.className = 'w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-all';
    showCameraToast('🎧 Mic Monitor OFF');
  }
}

// ── Follow & Follow Back System on Live ──
async function toggleFollowUser(targetUserId, btnId) {
  if (!CURRENT_USER.id) {
    alert('Please sign in to follow creators.');
    return;
  }
  const btn = document.getElementById(btnId);
  try {
    const res = await fetch('/authors/' + targetUserId + '/follow', {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    if (data && data.success) {
      if (data.isFollowing) {
        btn.className = btn.className.replace(/bg-red-600|hover:bg-red-700/g, 'bg-green-600 hover:bg-green-700');
        btn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i> <span>✓ Following</span>';
        showCameraToast('❤️ You are now following this creator!');
      } else {
        btn.className = btn.className.replace(/bg-green-600|hover:bg-green-700/g, 'bg-red-600 hover:bg-red-700');
        btn.innerHTML = '<i data-lucide="user-plus" class="w-3 h-3"></i> <span>+ Follow</span>';
        showCameraToast('Unfollowed creator.');
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  } catch (err) {
    // Fallback POST
    fetch('/authors/' + targetUserId + '/follow', { method: 'POST' });
    btn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i> <span>✓ Following</span>';
  }
}

let currentGuestUserId = '';
function toggleFollowGuest() {
  if (currentGuestUserId) {
    toggleFollowUser(currentGuestUserId, 'guestFollowBtn');
  }
}

// ── Guest Manager & Host Direct Invitation ──
let roomViewers = [];

function toggleGuestManager() {
  const modal = document.getElementById('guestManagerModal');
  if (modal) modal.classList.toggle('hidden');
  renderActiveViewersList();
}

function renderActiveViewersList() {
  const list = document.getElementById('activeViewersList');
  if (!list) return;

  if (roomViewers.length === 0) {
    list.innerHTML = '<div class="text-center py-6 text-gray-400 text-xs"><p>No other audience members joined yet.</p></div>';
    return;
  }

  list.innerHTML = '';
  roomViewers.forEach(v => {
    if (v.userId === CURRENT_USER.id) return;
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between bg-white/10 p-2.5 rounded-2xl';
    card.innerHTML = '<div class="flex items-center gap-2.5 truncate">' +
      '<img src="' + (v.avatar || '/uploads/default-avatar.png') + '" class="w-8 h-8 rounded-full object-cover">' +
      '<span class="text-xs font-bold text-white truncate">' + v.username + '</span>' +
    '</div>' +
    '<div class="flex items-center gap-1.5">' +
      '<button onclick="inviteViewerToCoHost(\'' + v.userId + '\', \'' + v.username + '\')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-bold rounded-xl transition-all">' +
        'Invite on Stage' +
      '</button>' +
    '</div>';
    list.appendChild(card);
  });
}

function inviteViewerToCoHost(userId, username) {
  socket.emit('co-host-invite', {
    roomId: ROOM_ID,
    targetUserId: userId,
    hostName: '"EJS"'
  });
  showCameraToast('📨 Invitation sent to ' + username + ' to join stage!');
  document.getElementById('guestManagerModal').classList.add('hidden');
}

// Viewers receive host invitation
socket.on('co-host-invite', (data) => {
  if (data.targetUserId === CURRENT_USER.id) {
    document.getElementById('guestJoinStageModal').classList.remove('hidden');
  }
});

// Demo / Simulated Co-Host (Lets host test split screen anytime)
function startSimulatedCoHost() {
  document.getElementById('guestManagerModal').classList.add('hidden');
  setupDualSplitScreen('Poet Amina (Guest)');
  showCameraToast('🌟 Split-Screen Co-Host Stage is active!');
}

// ── Microphone Toggle (Host & Guest) ──
function toggleMicrophone() {
  const stream = currentMediaStream || myGuestStream;
  if (!stream) {
    showCameraToast('No active microphone found.');
    return;
  }

  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    isMicMuted = !isMicMuted;
    audioTrack.enabled = !isMicMuted;

    const btn = document.getElementById('micToggleBtn');
    const micText = document.getElementById('micStatusText');
    const hostWave = document.getElementById('hostSpeakingIndicator');
    const hostMuted = document.getElementById('hostMutedBadge');

    if (isMicMuted) {
      btn.className = 'px-3 py-1.5 rounded-full bg-red-600/80 hover:bg-red-600 border border-red-400 flex items-center gap-1.5 text-xs text-white font-bold transition-all shadow-md';
      btn.innerHTML = '<i data-lucide="mic-off" class="w-3.5 h-3.5"></i> <span id="micStatusText" class="hidden sm:inline">Muted</span>';
      if (hostWave) hostWave.classList.add('hidden');
      if (hostMuted) hostMuted.classList.remove('hidden');
      showCameraToast('🔇 Microphone Muted (Audio paused for audience)');
    } else {
      btn.className = 'px-3 py-1.5 rounded-full bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 flex items-center gap-1.5 text-xs text-green-400 font-bold transition-all shadow-md';
      btn.innerHTML = '<i data-lucide="mic" class="w-3.5 h-3.5 text-green-400"></i> <span id="micStatusText" class="hidden sm:inline">Mic On</span>';
      if (hostWave) hostWave.classList.remove('hidden');
      if (hostMuted) hostMuted.classList.add('hidden');
      showCameraToast('🎤 Microphone Active (Speaking live)');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// Keyboard shortcut 'M' for quick mute/unmute
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (activeTag === 'input' || activeTag === 'textarea') return;
  if (e.key === 'm' || e.key === 'M') {
    toggleMicrophone();
  }
});

// ── Co-Host / Multi-Guest Stage Management ──
let pendingCoHostUserId = '';

// Viewer sends request
function requestToJoinLive() {
  if (!CURRENT_USER.id) { alert('Please sign in to request join!'); return; }
  socket.emit('co-host-request', {
    roomId: ROOM_ID,
    userId: CURRENT_USER.id,
    username: CURRENT_USER.username,
    avatar: CURRENT_USER.avatar
  });
  const btn = document.getElementById('coHostRequestBtn');
  if (btn) {
    btn.innerHTML = '<i data-lucide="check" class="w-5 h-5 text-green-400"></i>';
    btn.disabled = true;
    showCameraToast('✋ Join request sent to host!');
  }
}

// Host receives request
socket.on('co-host-request', (data) => {
  if (!IS_HOST) return;
  pendingCoHostUserId = data.userId;
  const modal = document.getElementById('coHostRequestModal');
  document.getElementById('coHostAvatarImg').src = data.avatar;
  document.getElementById('coHostRequesterName').textContent = data.username;
  modal.classList.remove('hidden');
});

// Host accepts request
function acceptCoHost() {
  socket.emit('co-host-accept', {
    roomId: ROOM_ID,
    userId: pendingCoHostUserId,
    username: document.getElementById('coHostRequesterName').textContent
  });
  document.getElementById('coHostRequestModal').classList.add('hidden');
}

// Host rejects request
function rejectCoHost() {
  socket.emit('co-host-reject', { roomId: ROOM_ID, userId: pendingCoHostUserId });
  document.getElementById('coHostRequestModal').classList.add('hidden');
}

function dismissCoHostModal() {
  document.getElementById('coHostRequestModal').classList.add('hidden');
}

// Viewer is notified they were accepted as co-host
socket.on('co-host-accepted', (data) => {
  if (data.userId === CURRENT_USER.id) {
    document.getElementById('guestJoinStageModal').classList.remove('hidden');
  } else {
    // Show split-screen guest container for all users
    setupDualSplitScreen(data.username);
  }
});

socket.on('co-host-rejected', (data) => {
  if (data.userId === CURRENT_USER.id) {
    showCameraToast('Your join request was declined by host.');
    const btn = document.getElementById('coHostRequestBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="hand" class="w-5 h-5 text-amber-400"></i>'; }
  }
});

// Viewer confirms joining stage as Co-Host
async function confirmJoinAsGuest() {
  try {
    const guestStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: true
    });
    myGuestStream = guestStream;
    isCoHostActive = true;

    if (roomViewers && roomViewers.length > 0) {
      roomViewers.forEach(v => {
        if (v.socketId && v.socketId !== socket.id) {
          createPeerOffer(v.socketId, 'guest', guestStream);
        }
      });
    }

    // Show local guest feed
    const guestVideo = document.getElementById('guestVideoFeed');
    guestVideo.srcObject = guestStream;
    await guestVideo.play();

    document.getElementById('guestJoinStageModal').classList.add('hidden');
    document.getElementById('leaveStageBtn').classList.remove('hidden');

    setupDualSplitScreen(CURRENT_USER.username);
    showCameraToast('🎉 You are now LIVE on stage with host!');
  } catch (err) {
    alert('Please allow camera & mic permissions to step on stage.');
  }
}

function declineGuestInvitation() {
  document.getElementById('guestJoinStageModal').classList.add('hidden');
}

function setupDualSplitScreen(guestName) {
  const guestWrapper = document.getElementById('guestVideoWrapper');
  const stage = document.getElementById('videoStageContainer');
  if (guestWrapper) {
    guestWrapper.classList.remove('hidden');
    document.getElementById('guestStageName').textContent = guestName || 'Co-Host';
  }
}

// Host drops guest
function dropCurrentGuest() {
  if (!confirm('Drop the current guest from the live stage?')) return;
  socket.emit('co-host-drop', { roomId: ROOM_ID, guestId: pendingCoHostUserId });
  removeDualSplitScreen();
}

// Guest leaves stage
function leaveCoHostStage() {
  if (myGuestStream) {
    myGuestStream.getTracks().forEach(t => t.stop());
  }
  socket.emit('co-host-leave', { roomId: ROOM_ID, guestId: CURRENT_USER.id });
  removeDualSplitScreen();
}

socket.on('co-host-dropped', (data) => {
  if (data.guestId === CURRENT_USER.id) {
    if (myGuestStream) myGuestStream.getTracks().forEach(t => t.stop());
    showCameraToast('You stepped down from the live stage.');
  }
  removeDualSplitScreen();
});

socket.on('co-host-left', (data) => {
  removeDualSplitScreen();
  showCameraToast(data.guestName ? data.guestName + ' left the live stage' : 'Guest left the live stage');
});

function removeDualSplitScreen() {
  const guestWrapper = document.getElementById('guestVideoWrapper');
  if (guestWrapper) guestWrapper.classList.add('hidden');
  const leaveBtn = document.getElementById('leaveStageBtn');
  if (leaveBtn) leaveBtn.classList.add('hidden');
}

// ── Likes, Hearts, Gifts & Beauty Engine ──
const HEART_COLORS = ['#EF4444', '#EC4899', '#F43F5E', '#D946EF', '#F59E0B', '#FB7185'];

function triggerLiveLike() {
  socket.emit('send-heart', { roomId: ROOM_ID });
  spawnStreamHeart();
}

function handleDoubleTapLike(e) {
  triggerLiveLike();
  const container = document.getElementById('doubleTapHeartsContainer');
  if (!container) return;
  const ripple = document.createElement('div');
  ripple.className = 'tap-ripple-heart';
  ripple.style.left = e.clientX + 'px';
  ripple.style.top = e.clientY + 'px';
  const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
  ripple.innerHTML = '<svg width="70" height="70" viewBox="0 0 24 24" fill="' + color + '">' +
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' +
  '</svg>';
  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);
}

function spawnStreamHeart() {
  const container = document.getElementById('heartsStreamContainer');
  if (!container) return;
  const heart = document.createElement('div');
  heart.className = 'flying-heart-particle';
  const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
  const size = 20 + Math.floor(Math.random() * 18);
  heart.style.left = (Math.random() * 40) + 'px';
  heart.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + color + '">' +
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' +
  '</svg>';
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 2200);
}

function toggleGiftTray() {
  document.getElementById('giftTrayModal').classList.toggle('hidden');
}

function sendLiveGift(type, label, emoji, points) {
  if (!CURRENT_USER.id) { alert('Please sign in to send gifts!'); return; }
  socket.emit('send-gift', {
    roomId: ROOM_ID,
    userId: CURRENT_USER.id,
    username: CURRENT_USER.username,
    avatar: CURRENT_USER.avatar,
    giftType: type
  });
  document.getElementById('giftTrayModal').classList.add('hidden');
}

socket.on('gift-received', (data) => {
  const center = document.getElementById('bigGiftCelebration');
  if (center) {
    const banner = document.createElement('div');
    banner.className = 'gift-popup-banner text-center flex flex-col items-center';
    banner.innerHTML = '<div class="text-7xl sm:text-8xl mb-2 drop-shadow-2xl animate-bounce">' + data.emoji + '</div>' +
      '<div class="bg-black/85 backdrop-blur-xl border border-amber-400/50 px-5 py-2.5 rounded-full shadow-2xl">' +
        '<span class="text-amber-400 font-bold text-sm">' + data.username + '</span>' +
        '<span class="text-white text-xs ml-1">sent ' + data.label + '! (+' + data.points + ' pts)</span>' +
      '</div>';
    center.appendChild(banner);
    setTimeout(() => banner.remove(), 2500);
  }

  const feed = document.getElementById('liveChatFeed');
  if (feed) {
    const msg = document.createElement('div');
    msg.className = 'inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-amber-500/30';
    msg.innerHTML = '<span class="text-amber-400 font-bold text-xs">🎁 ' + data.username + '</span>' +
      '<span class="text-white text-xs">sent ' + data.emoji + ' ' + data.label + ' (+' + data.points + ' pts)</span>';
    feed.appendChild(msg);
    feed.scrollTop = feed.scrollHeight;
  }
});

// ── Beauty Studio Engine ──
let activeBeautyPreset = 'glam';
const BEAUTY_PRESETS = {
  glam:    { smooth: 65, brightness: 115, saturation: 125, contrast: 108, sepia: 5, hue: 0, label: 'Glam Glow' },
  golden:  { smooth: 50, brightness: 110, saturation: 135, contrast: 112, sepia: 22, hue: -8, label: 'Golden Hour' },
  romance: { smooth: 60, brightness: 112, saturation: 125, contrast: 106, sepia: 12, hue: 325, label: 'Rosy Blush' },
  studio:  { smooth: 45, brightness: 135, saturation: 105, contrast: 115, sepia: 0, hue: 0, label: 'Studio Light' },
  vibrant: { smooth: 30, brightness: 108, saturation: 155, contrast: 120, sepia: 0, hue: 0, label: 'Vibrant Pop' },
  noir:    { smooth: 40, brightness: 105, saturation: 0, contrast: 130, sepia: 0, hue: 0, grayscale: 100, label: 'Vintage Noir' },
  natural: { smooth: 0, brightness: 100, saturation: 100, contrast: 100, sepia: 0, hue: 0, label: 'Natural HD' }
};

function toggleBeautyPanel() {
  const modal = document.getElementById('beautyPanelModal');
  if (modal) modal.classList.toggle('hidden');
}

function selectBeautyPreset(presetKey, label) {
  activeBeautyPreset = presetKey;
  const cfg = BEAUTY_PRESETS[presetKey] || BEAUTY_PRESETS.natural;
  document.getElementById('smoothSlider').value = cfg.smooth;
  document.getElementById('brightSlider').value = cfg.brightness;
  document.getElementById('satSlider').value = cfg.saturation;
  document.getElementById('smoothValLabel').textContent = cfg.smooth + '%';
  document.getElementById('brightValLabel').textContent = cfg.brightness + '%';
  document.getElementById('satValLabel').textContent = cfg.saturation + '%';
  const statusEl = document.getElementById('currentActiveFilterStatus');
  if (statusEl) statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span> Active Look: ' + (label || cfg.label);
  applyCustomFilterStyle(cfg);
}

function updateCustomBeautyFilters() {
  const smooth = parseInt(document.getElementById('smoothSlider').value) || 0;
  const bright = parseInt(document.getElementById('brightSlider').value) || 100;
  const sat = parseInt(document.getElementById('satSlider').value) || 100;
  document.getElementById('smoothValLabel').textContent = smooth + '%';
  document.getElementById('brightValLabel').textContent = bright + '%';
  document.getElementById('satValLabel').textContent = sat + '%';
  const baseCfg = BEAUTY_PRESETS[activeBeautyPreset] || BEAUTY_PRESETS.glam;
  applyCustomFilterStyle({ ...baseCfg, smooth, brightness: bright, saturation: sat });
}

function applyCustomFilterStyle(cfg) {
  const video = document.getElementById('liveVideoFeed');
  if (!video) return;
  const blurAmount = (cfg.smooth / 100) * 0.4;
  const brightness = cfg.brightness / 100;
  const contrast = (cfg.contrast || 100) / 100;
  const saturation = (cfg.saturation || 100) / 100;
  const sepia = (cfg.sepia || 0) / 100;
  const hue = cfg.hue || 0;
  const grayscale = cfg.grayscale ? 'grayscale(' + cfg.grayscale + '%)' : '';
  let filterStr = 'brightness(' + brightness + ') contrast(' + contrast + ') saturate(' + saturation + ')';
  if (blurAmount > 0) filterStr += ' blur(' + blurAmount.toFixed(2) + 'px)';
  if (sepia > 0) filterStr += ' sepia(' + sepia.toFixed(2) + ')';
  if (hue !== 0) filterStr += ' hue-rotate(' + hue + 'deg)';
  if (grayscale) filterStr += ' ' + grayscale;
  video.style.filter = filterStr;
}

function resetBeautyFilters() {
  selectBeautyPreset('natural', 'Natural HD');
}

// ── Multi-Camera Support & Camera Switcher ──
let availableCameras = [];
let currentCameraIndex = 0;

async function loadCameraDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter(d => d.kind === 'videoinput');
    const builtInIndex = availableCameras.findIndex(d => 
      d.label.toLowerCase().includes('integrated') || 
      d.label.toLowerCase().includes('built-in') || 
      d.label.toLowerCase().includes('hd') ||
      (d.label.toLowerCase().includes('webcam') && !d.label.toLowerCase().includes('iriun'))
    );
    if (builtInIndex > 0) currentCameraIndex = builtInIndex;
  } catch (err) {
    console.warn('Could not enumerate camera devices:', err);
  }
}

async function startLiveCamera(deviceId = null) {
  try {
    const video = document.getElementById('liveVideoFeed');
    const modal = document.getElementById('cameraStartModal');
    if (currentMediaStream) currentMediaStream.getTracks().forEach(t => t.stop());

    const videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
    if (deviceId) videoConstraints.deviceId = { exact: deviceId };
    else if (availableCameras.length > 0 && availableCameras[currentCameraIndex]) {
      videoConstraints.deviceId = { exact: availableCameras[currentCameraIndex].deviceId };
    } else {
      videoConstraints.facingMode = "user";
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true });
    currentMediaStream = stream;
    video.srcObject = stream;

    if (IS_HOST && roomViewers && roomViewers.length > 0) {
      roomViewers.forEach(v => {
        if (v.socketId && v.socketId !== socket.id) {
          createPeerOffer(v.socketId, 'host', stream);
        }
      });
    }
    video.muted = true;
    initAudioAnalyser(stream); // Local host is muted locally to prevent echo feedback
    await video.play();

    if (modal) modal.classList.add('hidden');
    await loadCameraDevices();

    const currentDevice = availableCameras[currentCameraIndex];
    if (currentDevice && currentDevice.label) {
      showCameraToast('📹 Camera: ' + currentDevice.label);
    }
  } catch (err) {
    console.error('Camera access error:', err);
    try {
      const video = document.getElementById('liveVideoFeed');
      const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      currentMediaStream = fallback;
      video.srcObject = fallback;
      video.muted = true;
      await video.play();
      const modal = document.getElementById('cameraStartModal');
      if (modal) modal.classList.add('hidden');
    } catch (e) {
      alert('Please allow camera & microphone permissions in your browser.');
    }
  }
}

async function switchCamera() {
  await loadCameraDevices();
  if (availableCameras.length <= 1) {
    showCameraToast('Re-checking camera devices...');
    await startLiveCamera();
    return;
  }
  currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
  await startLiveCamera(availableCameras[currentCameraIndex].deviceId);
}

let isMirrored = true;
function toggleMirror() {
  const video = document.getElementById('liveVideoFeed');
  if (!video) return;
  isMirrored = !isMirrored;
  if (isMirrored) video.classList.add('-scale-x-100');
  else video.classList.remove('-scale-x-100');
}

let teleprompterOpen = false;
function toggleTeleprompter() {
  const drawer = document.getElementById('teleprompterDrawer');
  if (!drawer) return;
  teleprompterOpen = !teleprompterOpen;
  drawer.style.transform = teleprompterOpen ? 'translateY(0)' : 'translateY(100%)';
}

function showCameraToast(text) {
  const feed = document.getElementById('liveChatFeed');
  if (!feed) return;
  const msg = document.createElement('div');
  msg.className = 'inline-flex items-center gap-1.5 bg-amber-500/25 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-amber-500/30 text-amber-300 text-xs font-bold';
  msg.textContent = text;
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight;
  setTimeout(() => msg.remove(), 4000);
}

function followHost() {
  if (CURRENT_USER.id) {
    fetch('/users/"EJS"/follow', { method: 'POST' });
  }
}

// Auto attempt camera if host
window.addEventListener('DOMContentLoaded', async () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  await loadCameraDevices();
  if (IS_HOST) {
    startLiveCamera();
  }
});
