// Firebase配置
const firebaseConfig = {
  apiKey: "AIzaSyCGLQ0wzn3355fi2RQEF3AyXplej0Lr5y8",
  authDomain: "wayne-chat.firebaseapp.com",
  projectId: "wayne-chat",
  storageBucket: "wayne-chat.firebasestorage.app",
  messagingSenderId: "18461747473",
  appId: "1:18461747473:web:e5bec51f24e7608ebf04b0",
  measurementId: "G-75HB9F9QYJ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 全局变量
let currentUser = null;
let currentChat = null;
let chats = [];
let friends = [];

// 监听器跟踪
let activeMessagesRef = null;
let activeMessagesCallback = null;
const unreadListeners = {};
let chatsListenerRef = null;
let chatsListenerCallback = null;
let friendsListenerRef = null;
let friendsListenerCallback = null;
let requestsListenerRef = null;
let requestsListenerCallback = null;

// 用户信息缓存（uid → {displayName, avatar}），用于已读列表实时显示最新昵称
const userInfoCache = {};

// ====== DOM ======
const $ = id => document.getElementById(id);
const chatMessages = $('chat-messages');
const chatInput = $('chat-input');
const sendBtn = $('send-btn');
const emojiBtn = $('emoji-btn');
const emojiPicker = $('emoji-picker');
const createGroupBtn = $('create-group-btn');
const groupModal = $('group-modal');
const groupNameInput = $('group-name');
const createGroupSubmit = $('create-group-submit');
const cancelGroup = $('cancel-group');
const settingsBtn = $('settings-btn');
const settingsModal = $('settings-modal');
const nicknameInput = $('nickname-input');
const saveSettings = $('save-settings');
const cancelSettings = $('cancel-settings');
const groupChats = $('group-chats');
const friendsList = $('friends-list');
const avatarUpload = $('avatar-upload');
const avatarImg = $('avatar-img');
const addFriendBtn = $('add-friend-btn');
const addFriendModal = $('add-friend-modal');
const friendSearchInput = $('friend-search-input');
const friendSearchBtn = $('friend-search-btn');
const friendSearchResults = $('friend-search-results');
const cancelAddFriend = $('cancel-add-friend');
const friendRequestsBtn = $('friend-requests-btn');
const friendRequestsModal = $('friend-requests-modal');
const friendRequestsList = $('friend-requests-list');
const cancelFriendRequests = $('cancel-friend-requests');
const groupFriendList = $('group-friend-list');
const requestBadge = $('request-badge');
const chatInputArea = $('chat-input-area');
const groupInfoBar = $('group-info-bar');
const groupInfoName = $('group-info-name');
const groupInfoCount = $('group-info-count');
const toggleMgmtBtn = $('toggle-mgmt-btn');
const groupMgmtPanel = $('group-mgmt-panel');
const mgmtMemberCount = $('mgmt-member-count');
const mgmtMembersList = $('mgmt-members-list');
const mgmtInviteList = $('mgmt-invite-list');
const mgmtDeleteSection = $('mgmt-delete-section');
const deleteGroupBtn = $('delete-group-btn');
const readStatusModal = $('read-status-modal');
const readCountDisplay = $('read-count-display');
const unreadCountDisplay = $('unread-count-display');
const readMembersList = $('read-members-list');
const unreadMembersList = $('unread-members-list');
const cancelReadStatus = $('cancel-read-status');
const deleteConfirmModal = $('delete-confirm-modal');
const cancelDelete = $('cancel-delete');
const confirmDelete = $('confirm-delete');

// ====== 工具函数 ======
function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function getAvatarUrl(user) {
  return (user && user.avatar) || 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png';
}

function uidFromName(name) {
  return 'user_' + btoa(name).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

// 获取用户信息（带缓存，优先返回 Firebase 最新数据）
function getUserInfo(uid) {
  // 如果是当前用户，直接返回
  if (currentUser && uid === currentUser.uid) {
    return Promise.resolve({ uid, displayName: currentUser.displayName, avatar: currentUser.avatar });
  }
  // 缓存命中直接返回
  if (userInfoCache[uid]) {
    return Promise.resolve({ uid, ...userInfoCache[uid] });
  }
  return db.ref('users/' + uid).once('value').then(snap => {
    const data = snap.val() || {};
    userInfoCache[uid] = { displayName: data.displayName || '未知用户', avatar: data.avatar || '' };
    return { uid, ...userInfoCache[uid] };
  });
}

// 批量获取用户信息
function batchGetUserInfo(uids) {
  return Promise.all(uids.map(uid => getUserInfo(uid)));
}

// ====== 表情选择器 ======
const emojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'];

function initEmojiPicker() {
  emojis.forEach(emoji => {
    const item = document.createElement('div');
    item.className = 'emoji-item';
    item.textContent = emoji;
    item.addEventListener('click', () => {
      chatInput.value += emoji;
      emojiPicker.classList.remove('show');
    });
    emojiPicker.appendChild(item);
  });
}

emojiBtn.addEventListener('click', e => { e.stopPropagation(); emojiPicker.classList.toggle('show'); });
document.addEventListener('click', e => {
  if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) emojiPicker.classList.remove('show');
});

// ====== 模态框开关 ======
addFriendBtn.addEventListener('click', () => { friendSearchInput.value = ''; friendSearchResults.innerHTML = ''; addFriendModal.classList.add('show'); });
cancelAddFriend.addEventListener('click', () => addFriendModal.classList.remove('show'));
friendRequestsBtn.addEventListener('click', () => { renderFriendRequests(); friendRequestsModal.classList.add('show'); });
cancelFriendRequests.addEventListener('click', () => friendRequestsModal.classList.remove('show'));
createGroupBtn.addEventListener('click', () => { groupNameInput.value = ''; renderGroupFriendPicker(); groupModal.classList.add('show'); });
cancelGroup.addEventListener('click', () => groupModal.classList.remove('show'));
settingsBtn.addEventListener('click', () => { if (currentUser) { nicknameInput.value = currentUser.displayName; avatarImg.src = getAvatarUrl(currentUser); } settingsModal.classList.add('show'); });
cancelSettings.addEventListener('click', () => settingsModal.classList.remove('show'));
cancelReadStatus.addEventListener('click', () => readStatusModal.classList.remove('show'));
cancelDelete.addEventListener('click', () => deleteConfirmModal.classList.remove('show'));

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
});

// ====== 头像上传 ======
avatarUpload.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      avatarImg.src = ev.target.result;
      if (currentUser) { currentUser.avatar = ev.target.result; localStorage.setItem('userAvatar', ev.target.result); }
    };
    reader.readAsDataURL(e.target.files[0]);
  }
});

// ====== 保存设置 ======
saveSettings.addEventListener('click', () => {
  const nn = nicknameInput.value.trim();
  if (nn && currentUser) {
    currentUser.displayName = nn;
    localStorage.setItem('userNickname', nn);
    localStorage.setItem('userAvatar', currentUser.avatar || '');
    // 清除自己的缓存，确保已读列表刷新时显示新名字
    delete userInfoCache[currentUser.uid];
    db.ref('users/' + currentUser.uid).set({
      displayName: nn, avatar: currentUser.avatar || '',
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).catch(err => console.error('保存设置失败:', err));
    settingsModal.classList.remove('show');
  }
});

// ========================================================================
//  好友系统
// ========================================================================
friendSearchBtn.addEventListener('click', () => {
  const name = friendSearchInput.value.trim();
  if (!name || !currentUser) return;

  friendSearchResults.innerHTML = '<div class="search-result-item">搜索中...</div>';

  // 按 displayName 模糊查询（不区分大小写）
  db.ref('users').once('value').then(snap => {
    friendSearchResults.innerHTML = '';
    const lowerName = name.toLowerCase();
    let found = 0;
    snap.forEach(child => {
      const u = child.val();
      const uid = child.key;
      if (uid === currentUser.uid) return; // 跳过自己
      if (!u.displayName || !u.displayName.toLowerCase().includes(lowerName)) return; // 不匹配
      found++;

      if (friends.some(f => f.uid === uid)) {
        // 已是好友
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<img src="${getAvatarUrl(u)}" class="search-result-avatar" alt=""><span class="search-result-name">${escapeHtml(u.displayName)}</span><span style="color:#999;font-size:13px">已是好友</span>`;
        friendSearchResults.appendChild(item);
        return;
      }

      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `<img src="${getAvatarUrl(u)}" class="search-result-avatar" alt=""><span class="search-result-name">${escapeHtml(u.displayName)}</span><button class="modal-btn create send-request-btn">添加</button>`;
      item.querySelector('.send-request-btn').addEventListener('click', () => {
        const btn = item.querySelector('.send-request-btn');
        btn.disabled = true;
        btn.textContent = '发送中...';
        console.log('[好友请求] 发送到:', 'friendRequests/' + uid + '/' + currentUser.uid);
        db.ref('friendRequests/' + uid + '/' + currentUser.uid).set({
          fromUid: currentUser.uid, fromName: currentUser.displayName, fromAvatar: currentUser.avatar || '', timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          console.log('[好友请求] 发送成功');
          btn.outerHTML = '<span style="color:#28a745;font-size:13px">✓ 已发送</span>';
        }).catch(err => {
          console.error('[好友请求] 发送失败:', err);
          btn.disabled = false;
          btn.textContent = '添加';
          alert('发送失败: ' + err.message);
        });
      });
      friendSearchResults.appendChild(item);
    });
    if (found === 0) { friendSearchResults.innerHTML = '<div class="search-result-item">未找到匹配的用户</div>'; }
  }).catch(err => { console.error('搜索用户失败:', err); friendSearchResults.innerHTML = '<div class="search-result-item">搜索失败，请重试</div>'; });
});

function loadFriendRequests() {
  if (!currentUser) return;
  if (requestsListenerRef && requestsListenerCallback) requestsListenerRef.off('value', requestsListenerCallback);
  requestsListenerRef = db.ref('friendRequests/' + currentUser.uid);
  console.log('[好友请求] 监听路径:', 'friendRequests/' + currentUser.uid);
  requestsListenerCallback = snap => {
    const c = snap.numChildren();
    console.log('[好友请求] 收到更新, 数量:', c, '数据:', snap.val());
    requestBadge.textContent = c;
    requestBadge.style.display = c > 0 ? 'inline' : 'none';
  };
  requestsListenerRef.on('value', requestsListenerCallback);
}

function renderFriendRequests() {
  if (!currentUser) return;
  friendRequestsList.innerHTML = '<div style="text-align:center;color:#999">加载中...</div>';
  db.ref('friendRequests/' + currentUser.uid).once('value').then(snap => {
    friendRequestsList.innerHTML = '';
    if (!snap.exists() || snap.numChildren() === 0) { friendRequestsList.innerHTML = '<div style="text-align:center;color:#999;padding:20px">暂无好友请求</div>'; return; }
    snap.forEach(child => {
      const req = child.val(), fromUid = child.key;
      const item = document.createElement('div');
      item.className = 'request-item';
      item.innerHTML = `<img src="${getAvatarUrl(req)}" class="search-result-avatar" alt=""><span class="search-result-name">${escapeHtml(req.fromName || '未知用户')}</span><button class="modal-btn create accept-btn">接受</button><button class="modal-btn cancel reject-btn">拒绝</button>`;
      item.querySelector('.accept-btn').addEventListener('click', () => {
        const mi = { uid: currentUser.uid, displayName: currentUser.displayName, avatar: currentUser.avatar || '' };
        const oi = { uid: fromUid, displayName: req.fromName || '', avatar: req.fromAvatar || '' };
        Promise.all([db.ref('friends/' + currentUser.uid + '/' + fromUid).set(oi), db.ref('friends/' + fromUid + '/' + currentUser.uid).set(mi), db.ref('friendRequests/' + currentUser.uid + '/' + fromUid).remove()])
          .then(() => { item.innerHTML = `<span class="search-result-name">${escapeHtml(req.fromName || '好友')}</span><span style="color:#28a745">✓ 已添加</span>`; })
          .catch(err => console.error('接受好友请求失败:', err));
      });
      item.querySelector('.reject-btn').addEventListener('click', () => { db.ref('friendRequests/' + currentUser.uid + '/' + fromUid).remove().then(() => item.remove()); });
      friendRequestsList.appendChild(item);
    });
  });
}

function loadFriends() {
  if (!currentUser) return;
  if (friendsListenerRef && friendsListenerCallback) friendsListenerRef.off('value', friendsListenerCallback);
  friendsListenerRef = db.ref('friends/' + currentUser.uid);
  friendsListenerCallback = snap => { friends = []; snap.forEach(c => { const f = c.val(); f.uid = c.key; friends.push(f); }); renderFriendsList(); };
  friendsListenerRef.on('value', friendsListenerCallback);
}

function renderFriendsList() {
  friendsList.innerHTML = '';
  if (friends.length === 0) { friendsList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">暂无好友，点击"添加好友"</div>'; return; }
  friends.forEach(f => {
    const pc = chats.find(c => c.type === 'private' && c.members && c.members.includes(f.uid));
    const item = document.createElement('div');
    item.className = `chat-item ${currentChat && pc && currentChat.id === pc.id ? 'active' : ''}`;
    item.innerHTML = `<div class="friend-item-content"><img src="${getAvatarUrl(f)}" class="friend-avatar-small" alt=""><span>${escapeHtml(f.displayName || '好友')}</span></div>`;
    item.addEventListener('click', () => { if (pc) selectChat(pc); else createPrivateChatWith(f); });
    friendsList.appendChild(item);
  });
}

function createPrivateChatWith(friend) {
  db.ref('chats').push({ type: 'private', name: friend.displayName, members: [currentUser.uid, friend.uid], createdAt: firebase.database.ServerValue.TIMESTAMP })
    .then(s => selectChat({ type: 'private', name: friend.displayName, members: [currentUser.uid, friend.uid], id: s.key }))
    .catch(err => console.error('创建私聊失败:', err));
}

// ====== 创建群聊 ======
function renderGroupFriendPicker() {
  groupFriendList.innerHTML = '';
  if (friends.length === 0) { groupFriendList.innerHTML = '<div style="color:#999;font-size:13px;padding:10px">暂无好友，请先添加好友</div>'; return; }
  friends.forEach(f => {
    const label = document.createElement('label');
    label.className = 'group-friend-item';
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(f.uid)}" class="friend-checkbox"><img src="${getAvatarUrl(f)}" class="friend-avatar-small" alt=""><span>${escapeHtml(f.displayName || '好友')}</span>`;
    groupFriendList.appendChild(label);
  });
}

createGroupSubmit.addEventListener('click', () => {
  const gn = groupNameInput.value.trim();
  if (!gn) return;
  const checked = groupFriendList.querySelectorAll('.friend-checkbox:checked');
  const members = [currentUser.uid, ...Array.from(checked).map(cb => cb.value)];
  db.ref('chats').push({ name: gn, type: 'group', members, createdBy: currentUser.uid, createdAt: firebase.database.ServerValue.TIMESTAMP })
    .then(s => { groupModal.classList.remove('show'); groupNameInput.value = ''; selectChat({ name: gn, type: 'group', members, createdBy: currentUser.uid, id: s.key }); })
    .catch(err => console.error('创建群聊失败:', err));
});

// ========================================================================
//  群管理面板（统一管理：成员、邀请、删除）
// ========================================================================

// 切换群管理面板
toggleMgmtBtn.addEventListener('click', () => {
  if (!currentChat || currentChat.type !== 'group') return;
  const show = groupMgmtPanel.style.display === 'none';
  groupMgmtPanel.style.display = show ? 'block' : 'none';
  if (show) renderGroupMgmtPanel();
});

function renderGroupMgmtPanel() {
  if (!currentChat || currentChat.type !== 'group') return;
  const members = currentChat.members || [];
  const isOwner = currentChat.createdBy === currentUser.uid;

  mgmtMemberCount.textContent = `(${members.length} 人)`;

  // 渲染成员列表
  mgmtMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">加载中...</div>';
  batchGetUserInfo(members).then(infos => {
    mgmtMembersList.innerHTML = '';
    infos.forEach(m => {
      const isMe = m.uid === currentUser.uid;
      const isCreator = m.uid === currentChat.createdBy;
      const canRemove = isOwner && !isMe && !isCreator;
      const item = document.createElement('div');
      item.className = 'mgmt-member-item';
      item.innerHTML = `
        <img src="${getAvatarUrl(m)}" class="friend-avatar-small" alt="">
        <span class="member-name">${escapeHtml(m.displayName || '未知用户')}${isMe ? ' (我)' : ''}${isCreator ? ' 👑' : ''}</span>
        ${canRemove ? '<button class="mgmt-remove-btn">移除</button>' : ''}
      `;
      if (canRemove) {
        item.querySelector('.mgmt-remove-btn').addEventListener('click', () => {
          const newMembers = members.filter(uid => uid !== m.uid);
          db.ref('chats/' + currentChat.id + '/members').set(newMembers)
            .then(() => { currentChat.members = newMembers; renderGroupMgmtPanel(); updateGroupInfoBar(); })
            .catch(err => console.error('移除失败:', err));
        });
      }
      mgmtMembersList.appendChild(item);
    });
  });

  // 渲染邀请列表（不在群内的好友）
  const invitable = friends.filter(f => !members.includes(f.uid));
  mgmtInviteList.innerHTML = '';
  if (invitable.length === 0) {
    mgmtInviteList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">所有好友都已在群聊中</div>';
  } else {
    invitable.forEach(f => {
      const item = document.createElement('div');
      item.className = 'mgmt-member-item';
      item.innerHTML = `<img src="${getAvatarUrl(f)}" class="friend-avatar-small" alt=""><span class="member-name">${escapeHtml(f.displayName || '好友')}</span><button class="mgmt-invite-btn">邀请</button>`;
      item.querySelector('.mgmt-invite-btn').addEventListener('click', () => {
        const nm = [...members, f.uid];
        db.ref('chats/' + currentChat.id + '/members').set(nm)
          .then(() => { currentChat.members = nm; renderGroupMgmtPanel(); updateGroupInfoBar(); })
          .catch(err => console.error('邀请失败:', err));
      });
      mgmtInviteList.appendChild(item);
    });
  }

  // 删除按钮（仅群主可见）
  mgmtDeleteSection.style.display = isOwner ? 'block' : 'none';
}

// 删除群聊
deleteGroupBtn.addEventListener('click', () => {
  if (!currentChat || currentChat.createdBy !== currentUser.uid) { alert('只有群主才能删除群聊'); return; }
  deleteConfirmModal.classList.add('show');
});

confirmDelete.addEventListener('click', () => {
  if (!currentChat) return;
  const chatId = currentChat.id;
  const updates = { ['chats/' + chatId]: null };
  db.ref('messages').orderByChild('chatId').equalTo(chatId).once('value').then(snap => {
    snap.forEach(c => { updates['messages/' + c.key] = null; });
    return db.ref().update(updates);
  }).then(() => {
    deleteConfirmModal.classList.remove('show');
    currentChat = null;
    groupInfoBar.style.display = 'none';
    groupMgmtPanel.style.display = 'none';
    chatMessages.innerHTML = '<div style="text-align:center;color:#999;margin-top:50px">群聊已删除</div>';
    chatInputArea.style.display = 'none';
    renderChatList(); renderFriendsList();
  }).catch(err => { console.error('删除失败:', err); alert('删除失败，请重试'); });
});

// 更新群信息栏
function updateGroupInfoBar() {
  if (!currentChat || currentChat.type !== 'group') { groupInfoBar.style.display = 'none'; groupMgmtPanel.style.display = 'none'; return; }
  groupInfoBar.style.display = 'flex';
  groupInfoName.textContent = currentChat.name;
  groupInfoCount.textContent = currentChat.id === 'world-chat' ? '公开群聊' : `${(currentChat.members || []).length} 人`;
  // 世界群聊隐藏管理按钮
  toggleMgmtBtn.style.display = currentChat.id === 'world-chat' ? 'none' : 'inline-block';
}

// ========================================================================
//  已读未读详情（实时拉取最新昵称）
// ========================================================================

cancelReadStatus.addEventListener('click', () => readStatusModal.classList.remove('show'));

function showReadStatusDetail(message) {
  if (!currentChat || currentChat.type !== 'group' || !message) return;

  const allMembers = (currentChat.members || []).slice();
  // 发送者不参与已读/未读判定
  const otherMembers = allMembers.filter(uid => uid !== message.senderId);
  const readByUids = message.readBy ? Object.keys(message.readBy) : [];
  // 已读 = readBy 中除了发送者之外的成员
  const readUids = readByUids.filter(uid => uid !== message.senderId && otherMembers.includes(uid));
  const unreadUids = otherMembers.filter(uid => !readByUids.includes(uid));

  readCountDisplay.textContent = readUids.length;
  unreadCountDisplay.textContent = unreadUids.length;
  readMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">加载中...</div>';
  unreadMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">加载中...</div>';

  // 实时从 Firebase 拉取最新昵称
  batchGetUserInfo(readUids).then(infos => {
    readMembersList.innerHTML = '';
    if (infos.length === 0) { readMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">暂无</div>'; return; }
    infos.forEach(m => {
      const item = document.createElement('div');
      item.className = 'read-member-item';
      item.innerHTML = `<img src="${getAvatarUrl(m)}" class="friend-avatar-small" alt=""><span>${escapeHtml(m.displayName || '未知用户')}</span>`;
      readMembersList.appendChild(item);
    });
  });

  batchGetUserInfo(unreadUids).then(infos => {
    unreadMembersList.innerHTML = '';
    if (infos.length === 0) { unreadMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">全部已读</div>'; return; }
    infos.forEach(m => {
      const item = document.createElement('div');
      item.className = 'read-member-item';
      item.innerHTML = `<img src="${getAvatarUrl(m)}" class="friend-avatar-small" alt=""><span>${escapeHtml(m.displayName || '未知用户')}</span>`;
      unreadMembersList.appendChild(item);
    });
  });

  readStatusModal.classList.add('show');
}

// ========================================================================
//  聊天核心
// ========================================================================
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !currentChat || !currentUser) return;
  // 权限校验：非公开群聊必须是成员才能发消息
  if (currentChat.type === 'group' && !currentChat.public && (!currentChat.members || !currentChat.members.includes(currentUser.uid))) {
    alert('你不是该群聊的成员，无法发送消息');
    return;
  }
  db.ref('messages').push({
    chatId: currentChat.id, senderId: currentUser.uid,
    senderName: currentUser.displayName, text,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    readBy: { [currentUser.uid]: true }
  }).then(() => { chatInput.value = ''; }).catch(err => console.error('发送失败:', err));
}

function loadChats() {
  if (chatsListenerRef && chatsListenerCallback) chatsListenerRef.off('value', chatsListenerCallback);
  chatsListenerRef = db.ref('chats');
  chatsListenerCallback = snap => {
    const nc = [];
    snap.forEach(c => { const ch = c.val(); ch.id = c.key; if ((ch.type === 'group' && (ch.public || (ch.members && ch.members.includes(currentUser.uid)))) || (ch.type === 'private' && ch.members && ch.members.includes(currentUser.uid))) nc.push(ch); });
    // 世界群聊常驻，始终排在第一位
    nc.unshift({ id: 'world-chat', name: '世界群聊', type: 'group', public: true, members: [] });
    chats = nc;
    renderChatList(); renderFriendsList();
    if (currentChat && currentChat.type === 'group') { const u = chats.find(c => c.id === currentChat.id); if (u) { currentChat = u; updateGroupInfoBar(); } }
  };
  chatsListenerRef.on('value', chatsListenerCallback);
}

function renderChatList() {
  groupChats.innerHTML = '';
  chats.filter(c => c.type === 'group').forEach(chat => {
    const item = document.createElement('div');
    item.className = `chat-item ${currentChat && currentChat.id === chat.id ? 'active' : ''}`;
    item.innerHTML = `<span>${escapeHtml(chat.name)}</span><span class="unread-count" id="unread-${chat.id}" style="display:none">0</span>`;
    item.addEventListener('click', () => selectChat(chat));
    groupChats.appendChild(item);
    updateUnreadCount(chat.id);
  });
}

function selectChat(chat) {
  currentChat = chat;
  renderChatList(); renderFriendsList();
  loadMessages(); markChatAsRead(); updateGroupInfoBar();
  groupMgmtPanel.style.display = 'none'; // 切换聊天时收起管理面板
}

function loadMessages() {
  if (!currentChat || !currentUser) return;
  if (activeMessagesRef && activeMessagesCallback) { activeMessagesRef.off('value', activeMessagesCallback); activeMessagesRef = null; activeMessagesCallback = null; }
  chatMessages.innerHTML = '';
  chatInputArea.style.display = 'flex';

  const queryRef = db.ref('messages').orderByChild('chatId').equalTo(currentChat.id);
  activeMessagesCallback = snap => {
    if (!currentChat) return;
    chatMessages.innerHTML = '';
    snap.forEach(c => { const m = c.val(); if (m) renderMessage(m); });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };
  activeMessagesRef = queryRef;
  queryRef.on('value', activeMessagesCallback);
}

function renderMessage(message) {
  if (!message || !currentUser) return;
  const isSent = message.senderId === currentUser.uid;
  const el = document.createElement('div');
  el.className = `message ${isSent ? 'sent' : 'received'}`;

  let content = escapeHtml(message.text || '');
  content = content.replace(/(https?:\/\/[^\s"']*\.(?:png|jpg|jpeg|gif|webp))/gi, '<img src="$1" alt="图片">');
  content = content.replace(/(https?:\/\/[^\s"']+)/gi, m => m.includes('<img') ? m : `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);

  let readStatusHtml = '';
  if (currentChat && currentChat.type === 'group') {
    // ★ 修复：发送者不计入已读数
    const allMembers = currentChat.members || [];
    const otherMembers = allMembers.filter(uid => uid !== message.senderId);
    const readByUids = message.readBy ? Object.keys(message.readBy) : [];
    const readCount = readByUids.filter(uid => uid !== message.senderId && otherMembers.includes(uid)).length;
    const unreadCount = otherMembers.length - readCount;

    if (isSent) {
      // 自己的消息：可点击查看详情
      readStatusHtml = `<div class="message-read-status clickable-read" data-msg='${escapeHtml(JSON.stringify({senderId:message.senderId, readBy:message.readBy||{}}))}'>${readCount}已读 ${unreadCount}未读</div>`;
    } else {
      // 别人的消息：只显示已读标记
      const iRead = readByUids.includes(currentUser.uid);
      readStatusHtml = `<div class="message-status">${iRead ? '已读' : '未读'}</div>`;
    }
  } else if (currentChat && currentChat.type === 'private' && isSent) {
    const readByOthers = message.readBy && Object.keys(message.readBy).some(u => u !== currentUser.uid);
    readStatusHtml = `<div class="message-status">${readByOthers ? '已读' : '未读'}</div>`;
  }

  el.innerHTML = `
    <div class="message-avatar"><img src="${isSent ? getAvatarUrl(currentUser) : getAvatarUrl(message)}" alt="头像"></div>
    <div class="message-body">
      <div class="message-sender">${escapeHtml(message.senderName || '未知用户')}</div>
      <div class="message-content-wrapper">${readStatusHtml}<div class="message-content">${content}</div></div>
    </div>
  `;

  // 绑定已读详情点击事件
  const readEl = el.querySelector('.clickable-read');
  if (readEl) {
    readEl.addEventListener('click', () => showReadStatusDetail(message));
  }

  chatMessages.appendChild(el);
}

function updateUnreadCount(chatId) {
  if (!currentUser) return;
  if (unreadListeners[chatId]) unreadListeners[chatId].ref.off('value', unreadListeners[chatId].callback);
  const ref = db.ref('messages').orderByChild('chatId').equalTo(chatId);
  const cb = snap => {
    let count = 0;
    snap.forEach(c => { const m = c.val(); if (m.senderId !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])) count++; });
    const el = document.getElementById(`unread-${chatId}`);
    if (el) { el.textContent = count; el.style.display = count > 0 ? 'flex' : 'none'; }
  };
  unreadListeners[chatId] = { ref, callback: cb };
  ref.on('value', cb);
}

function markChatAsRead() {
  if (!currentChat || !currentUser) return;
  db.ref('messages').orderByChild('chatId').equalTo(currentChat.id).once('value', snap => {
    snap.forEach(c => { const m = c.val(); if (m.senderId !== currentUser.uid) { const u = {}; if (!m.readBy) u['readBy'] = {}; u[`readBy/${currentUser.uid}`] = true; c.ref.update(u).catch(err => console.error('标记已读失败:', err)); } });
  }).catch(err => console.error('获取消息失败:', err));
}

// ========================================================================
//  登录 & 初始化
// ========================================================================
function simulateLogin() {
  let uid = localStorage.getItem('userUid');
  const nn = localStorage.getItem('userNickname'), av = localStorage.getItem('userAvatar');
  if (!uid) { uid = 'user_' + Date.now(); localStorage.setItem('userUid', uid); }

  currentUser = { uid, displayName: nn || '用户' + Math.floor(Math.random() * 1000), avatar: av || 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png' };

  db.ref('users/' + uid).set({ displayName: currentUser.displayName, avatar: currentUser.avatar, lastSeen: firebase.database.ServerValue.TIMESTAMP })
    .catch(err => console.error('注册失败:', err));

  loadChats(); loadFriends(); loadFriendRequests();
}

function initApp() { initEmojiPicker(); simulateLogin(); }
window.onload = initApp;
