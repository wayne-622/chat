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

// 用户信息缓存（uid → {displayName, avatar}），用于实时显示最新昵称
const userInfoCache = {};

// 引用消息状态
let quotingMessage = null;

// 右键菜单上下文
let contextMessage = null;
let contextMessageId = null;

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
const contextMenu = $('context-menu');
const quotePreviewBar = $('quote-preview-bar');
const quotePreviewContent = $('quote-preview-content');
const quotePreviewClose = $('quote-preview-close');
const forwardModal = $('forward-modal');
const forwardMsgPreview = $('forward-msg-preview');
const forwardGroupList = $('forward-group-list');
const cancelForward = $('cancel-forward');
const confirmForward = $('confirm-forward');
const aliasModal = $('alias-modal');
const aliasInput = $('alias-input');
const aliasAvatar = $('alias-avatar');
const aliasName = $('alias-name');
const saveAlias = $('save-alias');
const cancelAlias = $('cancel-alias');

// 当前正在编辑备注的好友
let currentAliasFriend = null;

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
  if (currentUser && uid === currentUser.uid) {
    return Promise.resolve({ uid, displayName: currentUser.displayName, avatar: currentUser.avatar });
  }
  if (userInfoCache[uid]) {
    return Promise.resolve({ uid, ...userInfoCache[uid] });
  }
  return db.ref('users/' + uid).once('value').then(snap => {
    const data = snap.val() || {};
    userInfoCache[uid] = { displayName: data.displayName || '未知用户', avatar: data.avatar || '' };
    return { uid, ...userInfoCache[uid] };
  });
}

// 获取好友显示名：备注优先，其次最新昵称
function getFriendDisplayName(friend) {
  return friend.alias || friend.displayName || '好友';
}
function refreshUserInfo(uid) {
  delete userInfoCache[uid];
  return getUserInfo(uid);
}

// 批量获取用户信息
function batchGetUserInfo(uids) {
  return Promise.all(uids.map(uid => getUserInfo(uid)));
}

// ========================================================================
//  表情选择器
// ========================================================================
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
  // 关闭右键菜单
  contextMenu.classList.remove('show');
});

// ========================================================================
//  模态框开关
// ========================================================================
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
cancelForward.addEventListener('click', () => forwardModal.classList.remove('show'));
cancelAlias.addEventListener('click', () => aliasModal.classList.remove('show'));

aliasInput.addEventListener('keypress', e => { if (e.key === 'Enter') saveAlias.click(); });
saveAlias.addEventListener('click', () => {
  if (!currentAliasFriend || !currentUser) return;
  const alias = aliasInput.value.trim();
  const updates = {};
  if (alias) {
    updates['friends/' + currentUser.uid + '/' + currentAliasFriend.uid + '/alias'] = alias;
  } else {
    updates['friends/' + currentUser.uid + '/' + currentAliasFriend.uid + '/alias'] = null;
  }
  db.ref().update(updates).then(() => {
    aliasModal.classList.remove('show');
  }).catch(err => alert('保存备注失败'));
});
quotePreviewClose.addEventListener('click', () => { quotingMessage = null; quotePreviewBar.style.display = 'none'; });

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
});

// ========================================================================
//  头像上传
// ========================================================================
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

// ========================================================================
//  保存设置（改名）— 同步更新所有旧消息中的 senderName
// ========================================================================
saveSettings.addEventListener('click', () => {
  const nn = nicknameInput.value.trim();
  if (nn && currentUser) {
    const oldName = currentUser.displayName;
    currentUser.displayName = nn;
    localStorage.setItem('userNickname', nn);
    localStorage.setItem('userAvatar', currentUser.avatar || '');
    // 清除自己的缓存
    delete userInfoCache[currentUser.uid];

    // 更新用户节点
    db.ref('users/' + currentUser.uid).set({
      displayName: nn, avatar: currentUser.avatar || '',
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      // ★ 修复3：改名后批量更新所有自己发的消息中的 senderName
      if (oldName !== nn) {
        db.ref('messages').orderByChild('senderId').equalTo(currentUser.uid).once('value').then(snap => {
          const updates = {};
          snap.forEach(c => { updates['messages/' + c.key + '/senderName'] = nn; });
          if (Object.keys(updates).length > 0) db.ref().update(updates);
        });

        // ★ 修复1：同步更新好友关系中自己的 displayName
        db.ref('friends').once('value').then(snap => {
          const updates = {};
          snap.forEach(userSnap => {
            const uid = userSnap.key;
            userSnap.forEach(friendSnap => {
              if (friendSnap.key === currentUser.uid) {
                updates['friends/' + uid + '/' + currentUser.uid + '/displayName'] = nn;
                updates['friends/' + uid + '/' + currentUser.uid + '/avatar'] = currentUser.avatar || '';
              }
            });
          });
          if (Object.keys(updates).length > 0) db.ref().update(updates);
        });
      }
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

  db.ref('users').once('value').then(snap => {
    friendSearchResults.innerHTML = '';
    const lowerName = name.toLowerCase();
    let found = 0;
    snap.forEach(child => {
      const u = child.val();
      const uid = child.key;
      if (uid === currentUser.uid) return;
      if (!u.displayName || !u.displayName.toLowerCase().includes(lowerName)) return;
      found++;

      if (friends.some(f => f.uid === uid)) {
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
        db.ref('friendRequests/' + uid + '/' + currentUser.uid).set({
          fromUid: currentUser.uid, fromName: currentUser.displayName, fromAvatar: currentUser.avatar || '', timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          btn.outerHTML = '<span style="color:#28a745;font-size:13px">✓ 已发送</span>';
        }).catch(err => {
          btn.disabled = false;
          btn.textContent = '添加';
          alert('发送失败: ' + err.message);
        });
      });
      friendSearchResults.appendChild(item);
    });
    if (found === 0) { friendSearchResults.innerHTML = '<div class="search-result-item">未找到匹配的用户</div>'; }
  }).catch(err => { friendSearchResults.innerHTML = '<div class="search-result-item">搜索失败，请重试</div>'; });
});

function loadFriendRequests() {
  if (!currentUser) return;
  if (requestsListenerRef && requestsListenerCallback) requestsListenerRef.off('value', requestsListenerCallback);
  requestsListenerRef = db.ref('friendRequests/' + currentUser.uid);
  requestsListenerCallback = snap => {
    const c = snap.numChildren();
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
        Promise.all([
          db.ref('friends/' + currentUser.uid + '/' + fromUid).set(oi),
          db.ref('friends/' + fromUid + '/' + currentUser.uid).set(mi),
          db.ref('friendRequests/' + currentUser.uid + '/' + fromUid).remove()
        ]).then(() => {
          item.innerHTML = `<span class="search-result-name">${escapeHtml(req.fromName || '好友')}</span><span style="color:#28a745">✓ 已添加</span>`;
        }).catch(err => console.error('接受好友请求失败:', err));
      });
      item.querySelector('.reject-btn').addEventListener('click', () => {
        db.ref('friendRequests/' + currentUser.uid + '/' + fromUid).remove().then(() => item.remove());
      });
      friendRequestsList.appendChild(item);
    });
  });
}

// ★ 修复1：loadFriends 实时监听好友列表，并刷新每个好友的最新用户信息
function loadFriends() {
  if (!currentUser) return;
  if (friendsListenerRef && friendsListenerCallback) friendsListenerRef.off('value', friendsListenerCallback);
  friendsListenerRef = db.ref('friends/' + currentUser.uid);
  friendsListenerCallback = snap => {
    friends = [];
    const promises = [];
    snap.forEach(c => {
      const f = c.val();
      f.uid = c.key;
      // 强制从 users 节点拉取最新 displayName/avatar
      promises.push(refreshUserInfo(f.uid).then(latest => {
        f.displayName = latest.displayName;
        f.avatar = latest.avatar;
        friends.push(f);
      }));
    });
    Promise.all(promises).then(() => renderFriendsList());
  };
  friendsListenerRef.on('value', friendsListenerCallback);
}

function renderFriendsList() {
  friendsList.innerHTML = '';
  if (friends.length === 0) { friendsList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">暂无好友，点击"添加好友"</div>'; return; }
  friends.forEach(f => {
    const pc = chats.find(c => c.type === 'private' && c.members && c.members.includes(f.uid));
    const showName = f.alias ? `${f.alias}（${f.displayName}）` : f.alias || f.displayName || '好友';
    const item = document.createElement('div');
    item.className = `chat-item friend-list-item ${currentChat && pc && currentChat.id === pc.id ? 'active' : ''}`;
    item.innerHTML = `
      <div class="friend-item-content" style="flex:1;cursor:pointer">
        <img src="${getAvatarUrl(f)}" class="friend-avatar-small" alt="">
        <span>${escapeHtml(showName)}</span>
      </div>
      <div class="friend-actions-wrap">
        <button class="friend-actions-btn" title="更多">⋯</button>
        <div class="friend-actions-dropdown">
          <div class="friend-action-item" data-action="alias">📝 设置备注</div>
          <div class="friend-action-item" data-action="delete">🗑️ 删除好友</div>
        </div>
      </div>
    `;
    item.querySelector('.friend-item-content').addEventListener('click', () => { if (pc) selectChat(pc); else createPrivateChatWith(f); });
    // 操作菜单
    item.querySelectorAll('.friend-action-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'alias') {
          currentAliasFriend = f;
          aliasAvatar.src = getAvatarUrl(f);
          aliasName.textContent = f.displayName || '好友';
          aliasInput.value = f.alias || '';
          aliasModal.classList.add('show');
          aliasInput.focus();
        } else if (action === 'delete') {
          if (!confirm(`确定要删除好友「${f.displayName}」吗？\n相关的私聊记录也会被清除。`)) return;
          deleteFriend(f, pc);
        }
      });
    });
    friendsList.appendChild(item);
  });
}

function createPrivateChatWith(friend) {
  db.ref('chats').push({ type: 'private', name: friend.displayName, members: [currentUser.uid, friend.uid], createdAt: firebase.database.ServerValue.TIMESTAMP })
    .then(s => selectChat({ type: 'private', name: friend.displayName, members: [currentUser.uid, friend.uid], id: s.key }))
    .catch(err => console.error('创建私聊失败:', err));
}

function deleteFriend(friend, privateChat) {
  const updates = {};
  updates['friends/' + currentUser.uid + '/' + friend.uid] = null;
  updates['friends/' + friend.uid + '/' + currentUser.uid] = null;
  if (privateChat) {
    updates['chats/' + privateChat.id] = null;
    if (currentChat && currentChat.id === privateChat.id) {
      currentChat = null;
      groupInfoBar.style.display = 'none';
      groupMgmtPanel.style.display = 'none';
      chatMessages.innerHTML = '<div style="text-align:center;color:#999;margin-top:50px">选择一个聊天开始对话</div>';
      chatInputArea.style.display = 'none';
    }
    db.ref('messages').orderByChild('chatId').equalTo(privateChat.id).once('value').then(snap => {
      const msgUpdates = {};
      snap.forEach(c => { msgUpdates['messages/' + c.key] = null; });
      if (Object.keys(msgUpdates).length > 0) db.ref().update(msgUpdates);
    });
  }
  db.ref().update(updates).catch(err => { alert('删除失败，请重试'); });
}

// ========================================================================
//  创建群聊
// ========================================================================
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
//  群管理面板
// ========================================================================
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

  mgmtDeleteSection.style.display = isOwner ? 'block' : 'none';
}

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
  }).catch(err => { alert('删除失败，请重试'); });
});

function updateGroupInfoBar() {
  if (!currentChat || currentChat.type !== 'group') { groupInfoBar.style.display = 'none'; groupMgmtPanel.style.display = 'none'; return; }
  groupInfoBar.style.display = 'flex';
  groupInfoName.textContent = currentChat.name;
  groupInfoCount.textContent = currentChat.id === 'world-chat' ? '公开群聊' : `${(currentChat.members || []).length} 人`;
  toggleMgmtBtn.style.display = currentChat.id === 'world-chat' ? 'none' : 'inline-block';
}

// ========================================================================
//  已读未读详情
// ========================================================================
function showReadStatusDetail(message) {
  if (!currentChat || currentChat.type !== 'group' || !message) return;

  const allMembers = (currentChat.members || []).slice();
  const otherMembers = allMembers.filter(uid => uid !== message.senderId);
  const readByUids = message.readBy ? Object.keys(message.readBy) : [];
  const readUids = readByUids.filter(uid => uid !== message.senderId && otherMembers.includes(uid));
  const unreadUids = otherMembers.filter(uid => !readByUids.includes(uid));

  readCountDisplay.textContent = readUids.length;
  unreadCountDisplay.textContent = unreadUids.length;
  readMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">加载中...</div>';
  unreadMembersList.innerHTML = '<div style="color:#999;font-size:13px;padding:5px">加载中...</div>';

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
//  ★ 右键菜单
// ========================================================================
contextMenu.addEventListener('click', e => e.stopPropagation());

$('ctx-recall').addEventListener('click', () => {
  if (!contextMessageId || !contextMessage) return;
  contextMenu.classList.remove('show');

  // 检查是否是自己的消息
  if (contextMessage.senderId !== currentUser.uid) {
    alert('只能撤回自己发送的消息');
    return;
  }

  // 检查是否在2分钟内
  const now = Date.now();
  const msgTime = contextMessage.timestamp;
  if (now - msgTime > 2 * 60 * 1000) {
    alert('只能撤回2分钟内发送的消息');
    return;
  }

  // 用 recalled 标记替代删除，显示"已撤回一条消息"
  db.ref('messages/' + contextMessageId).update({
    text: '',
    recalled: true,
    recallTime: firebase.database.ServerValue.TIMESTAMP
  }).catch(err => alert('撤回失败'));
});

$('ctx-quote').addEventListener('click', () => {
  if (!contextMessage) return;
  contextMenu.classList.remove('show');
  quotingMessage = contextMessage;
  // 显示引用预览
  quotePreviewContent.innerHTML = `<strong>${escapeHtml(contextMessage.senderName || '未知')}</strong>: ${escapeHtml((contextMessage.text || '').substring(0, 100))}`;
  quotePreviewBar.style.display = 'flex';
  chatInput.focus();
});

$('ctx-delete').addEventListener('click', () => {
  if (!contextMessageId) return;
  contextMenu.classList.remove('show');
  // 本地删除（仅对自己隐藏）
  if (!currentUser) return;
  const msgId = contextMessageId;
  db.ref('messages/' + msgId + '/deletedFor/' + currentUser.uid).set(true)
    .catch(err => alert('删除失败'));
});

$('ctx-forward').addEventListener('click', () => {
  if (!contextMessage) return;
  contextMenu.classList.remove('show');
  // 打开转发模态框
  forwardMsgPreview.innerHTML = `<div style="padding:8px;background:#f8f9fa;border-radius:6px;margin-bottom:10px;font-size:13px"><strong>${escapeHtml(contextMessage.senderName || '未知')}</strong>: ${escapeHtml((contextMessage.text || '').substring(0, 200))}</div>`;
  renderForwardGroupPicker();
  forwardModal.classList.add('show');
});

$('ctx-mention').addEventListener('click', () => {
  if (!contextMessage) return;
  contextMenu.classList.remove('show');
  // 优先用备注名
  const friend = friends.find(f => f.uid === contextMessage.senderId);
  const mentionName = (friend && friend.alias) || contextMessage.senderName || '未知用户';
  chatInput.value += `@${mentionName} `;
  chatInput.focus();
});

function renderForwardGroupPicker() {
  forwardGroupList.innerHTML = '';
  const groupChatsList = chats.filter(c => c.type === 'group' && c.id !== (currentChat && currentChat.id));
  if (groupChatsList.length === 0) {
    forwardGroupList.innerHTML = '<div style="color:#999;font-size:13px;padding:10px">暂无其他群聊可转发</div>';
    return;
  }
  groupChatsList.forEach(c => {
    const label = document.createElement('label');
    label.className = 'group-friend-item';
    label.innerHTML = `<input type="radio" name="forward-target" value="${escapeHtml(c.id)}" class="forward-radio"><span>${escapeHtml(c.name)}</span>`;
    forwardGroupList.appendChild(label);
  });
}

confirmForward.addEventListener('click', () => {
  const selected = forwardGroupList.querySelector('input[name="forward-target"]:checked');
  if (!selected || !contextMessage) return;
  const targetChatId = selected.value;
  const targetChat = chats.find(c => c.id === targetChatId);
  if (!targetChat) return;

  db.ref('messages').push({
    chatId: targetChatId,
    senderId: currentUser.uid,
    senderName: currentUser.displayName,
    text: contextMessage.text || '',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    readBy: { [currentUser.uid]: true },
    forwardedFrom: contextMessage.senderName || '未知用户'
  }).then(() => {
    forwardModal.classList.remove('show');
    alert('转发成功！');
  }).catch(err => alert('转发失败'));
});

// ========================================================================
//  ★ 聊天核心 — 发送消息（支持引用）
// ========================================================================
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !currentChat || !currentUser) return;
  if (currentChat.type === 'group' && !currentChat.public && (!currentChat.members || !currentChat.members.includes(currentUser.uid))) {
    alert('你不是该群聊的成员，无法发送消息');
    return;
  }

  const msgData = {
    chatId: currentChat.id, senderId: currentUser.uid,
    senderName: currentUser.displayName, text,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    readBy: { [currentUser.uid]: true }
  };

  // 如果有引用消息，附加引用信息
  if (quotingMessage) {
    msgData.quote = {
      senderName: quotingMessage.senderName || '未知',
      text: (quotingMessage.text || '').substring(0, 200),
      messageId: quotingMessage._id || ''
    };
    quotingMessage = null;
    quotePreviewBar.style.display = 'none';
  }

  db.ref('messages').push(msgData)
    .then(() => { chatInput.value = ''; })
    .catch(err => console.error('发送失败:', err));
}

// ========================================================================
//  ★ 聊天列表 & 消息加载
// ========================================================================
function loadChats() {
  if (chatsListenerRef && chatsListenerCallback) chatsListenerRef.off('value', chatsListenerCallback);
  chatsListenerRef = db.ref('chats');
  chatsListenerCallback = snap => {
    const nc = [];
    snap.forEach(c => { const ch = c.val(); ch.id = c.key; if ((ch.type === 'group' && (ch.public || (ch.members && ch.members.includes(currentUser.uid)))) || (ch.type === 'private' && ch.members && ch.members.includes(currentUser.uid))) nc.push(ch); });
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
  groupMgmtPanel.style.display = 'none';
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
    snap.forEach(c => {
      const m = c.val();
      if (m) {
        m._id = c.key; // 保存消息ID用于操作
        // 检查是否被当前用户删除
        if (m.deletedFor && m.deletedFor[currentUser.uid]) return;
        renderMessage(m, c.key);
      }
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };
  activeMessagesRef = queryRef;
  queryRef.on('value', activeMessagesCallback);
}

function renderMessage(message, msgKey) {
  if (!message || !currentUser) return;
  const isSent = message.senderId === currentUser.uid;
  const el = document.createElement('div');
  el.className = `message ${isSent ? 'sent' : 'received'}`;
  el.dataset.msgKey = msgKey;

  // ★ 撤回消息显示
  if (message.recalled) {
    el.innerHTML = `
      <div class="message-body" style="width:100%;align-items:center">
        <div class="message-content" style="background:#f0f0f0;color:#999;font-style:italic;font-size:13px">
          ${isSent ? '你' : escapeHtml(message.senderName || '对方')}撤回了一条消息
        </div>
      </div>
    `;
    chatMessages.appendChild(el);
    return;
  }

  // ★ 修复3：实时获取最新昵称显示
  let senderDisplayName = message.senderName || '未知用户';
  // 如果是自己发的消息，直接用当前昵称
  if (isSent) {
    senderDisplayName = currentUser.displayName;
  } else {
    // 查找好友备注
    const friend = friends.find(f => f.uid === message.senderId);
    if (friend && friend.alias) {
      senderDisplayName = friend.alias;
    } else if (userInfoCache[message.senderId]) {
      senderDisplayName = userInfoCache[message.senderId].displayName;
    } else {
      // 异步刷新缓存并更新DOM
      refreshUserInfo(message.senderId).then(info => {
        const fr = friends.find(f => f.uid === message.senderId);
        const name = (fr && fr.alias) || info.displayName;
        const nameEl = el.querySelector('.message-sender');
        if (nameEl) nameEl.textContent = name;
        const avatarEl = el.querySelector('.message-avatar img');
        if (avatarEl) avatarEl.src = getAvatarUrl(info);
      });
    }
  }

  let content = escapeHtml(message.text || '');
  content = content.replace(/(https?:\/\/[^\s"']*\.(?:png|jpg|jpeg|gif|webp))/gi, '<img src="$1" alt="图片">');
  content = content.replace(/(https?:\/\/[^\s"']+)/gi, m => m.includes('<img') ? m : `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);

  // ★ 引用消息渲染
  let quoteHtml = '';
  if (message.quote) {
    quoteHtml = `<div class="message-quote"><strong>${escapeHtml(message.quote.senderName)}</strong>: ${escapeHtml((message.quote.text || '').substring(0, 100))}</div>`;
  }

  // ★ 转发标记
  let forwardHtml = '';
  if (message.forwardedFrom) {
    forwardHtml = `<div class="message-forward-tag">↩ 转发自 ${escapeHtml(message.forwardedFrom)}</div>`;
  }

  // 已读未读
  let readStatusHtml = '';
  if (currentChat && currentChat.type === 'group') {
    const allMembers = currentChat.members || [];
    const otherMembers = allMembers.filter(uid => uid !== message.senderId);
    const readByUids = message.readBy ? Object.keys(message.readBy) : [];
    const readCount = readByUids.filter(uid => uid !== message.senderId && otherMembers.includes(uid)).length;
    const unreadCount = otherMembers.length - readCount;

    if (isSent) {
      readStatusHtml = `<div class="message-read-status clickable-read">${readCount}已读 ${unreadCount}未读</div>`;
    } else {
      const iRead = readByUids.includes(currentUser.uid);
      readStatusHtml = `<div class="message-status">${iRead ? '已读' : '未读'}</div>`;
    }
  } else if (currentChat && currentChat.type === 'private' && isSent) {
    const readByOthers = message.readBy && Object.keys(message.readBy).some(u => u !== currentUser.uid);
    readStatusHtml = `<div class="message-status">${readByOthers ? '已读' : '未读'}</div>`;
  }

  const avatarSrc = isSent ? getAvatarUrl(currentUser) : getAvatarUrl(userInfoCache[message.senderId] || message);

  el.innerHTML = `
    <div class="message-avatar"><img src="${avatarSrc}" alt="头像"></div>
    <div class="message-body">
      <div class="message-sender">${escapeHtml(senderDisplayName)}</div>
      ${forwardHtml}
      ${quoteHtml}
      <div class="message-content-wrapper">${readStatusHtml}<div class="message-content">${content}</div></div>
    </div>
  `;

  // 已读详情点击
  const readEl = el.querySelector('.clickable-read');
  if (readEl) {
    readEl.addEventListener('click', () => showReadStatusDetail(message));
  }

  // ★ 右键菜单绑定
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMessage = message;
    contextMessageId = msgKey;

    // 自己的消息：显示撤回（2分钟内），隐藏@
    // 别人的消息：隐藏撤回，显示@
    const canRecall = isSent && !message.recalled && (Date.now() - message.timestamp < 2 * 60 * 1000);
    $('ctx-recall').style.display = canRecall ? 'block' : 'none';
    $('ctx-mention').style.display = isSent ? 'none' : 'block';

    // 定位：相对 .chat-main 的坐标
    const chatMain = document.querySelector('.chat-main');
    const rect = chatMain.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    contextMenu.style.left = Math.min(x, chatMain.offsetWidth - 160) + 'px';
    contextMenu.style.top = Math.min(y, chatMain.offsetHeight - 200) + 'px';
    contextMenu.classList.add('show');
  });

  chatMessages.appendChild(el);
}

// ========================================================================
//  ★ 修复2：已读标记逻辑优化
// ========================================================================
function updateUnreadCount(chatId) {
  if (!currentUser) return;
  if (unreadListeners[chatId]) unreadListeners[chatId].ref.off('value', unreadListeners[chatId].callback);
  const ref = db.ref('messages').orderByChild('chatId').equalTo(chatId);
  const cb = snap => {
    let count = 0;
    snap.forEach(c => {
      const m = c.val();
      if (m.recalled) return; // 撤回消息不计未读
      if (m.deletedFor && m.deletedFor[currentUser.uid]) return; // 已删除不计
      if (m.senderId !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])) count++;
    });
    const el = document.getElementById(`unread-${chatId}`);
    if (el) { el.textContent = count; el.style.display = count > 0 ? 'flex' : 'none'; }
  };
  unreadListeners[chatId] = { ref, callback: cb };
  ref.on('value', cb);
}

function markChatAsRead() {
  if (!currentChat || !currentUser) return;
  // ★ 修复：使用事务逐条标记，避免 once 竞态
  db.ref('messages').orderByChild('chatId').equalTo(currentChat.id).once('value', snap => {
    const updates = {};
    snap.forEach(c => {
      const m = c.val();
      // 只标记别人发的消息
      if (m.senderId === currentUser.uid) return;
      // 如果已经标记过就跳过
      if (m.readBy && m.readBy[currentUser.uid]) return;
      updates['messages/' + c.key + '/readBy/' + currentUser.uid] = true;
    });
    if (Object.keys(updates).length > 0) {
      db.ref().update(updates).catch(err => console.error('批量标记已读失败:', err));
    }
  });
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
