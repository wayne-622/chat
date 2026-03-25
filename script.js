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

// 初始化Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// 全局变量
let currentUser = null;
let currentChat = null;
let chats = [];

// DOM元素
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const createGroupBtn = document.getElementById('create-group-btn');
const groupModal = document.getElementById('group-modal');
const groupNameInput = document.getElementById('group-name');
const createGroupSubmit = document.getElementById('create-group-submit');
const cancelGroup = document.getElementById('cancel-group');
const chatSidebar = document.getElementById('chat-sidebar');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const nicknameInput = document.getElementById('nickname-input');
const saveSettings = document.getElementById('save-settings');
const cancelSettings = document.getElementById('cancel-settings');

// 表情符号列表
const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

// 初始化表情选择器
function initEmojiPicker() {
  emojis.forEach(emoji => {
    const emojiItem = document.createElement('div');
    emojiItem.className = 'emoji-item';
    emojiItem.textContent = emoji;
    emojiItem.addEventListener('click', () => {
      chatInput.value += emoji;
      emojiPicker.classList.remove('show');
    });
    emojiPicker.appendChild(emojiItem);
  });
}

// 切换表情选择器显示状态
emojiBtn.addEventListener('click', () => {
  emojiPicker.classList.toggle('show');
});

// 点击其他地方关闭表情选择器
document.addEventListener('click', (e) => {
  if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
    emojiPicker.classList.remove('show');
  }
});

// 打开创建群聊模态框
createGroupBtn.addEventListener('click', () => {
  groupModal.classList.add('show');
});

// 关闭创建群聊模态框
cancelGroup.addEventListener('click', () => {
  groupModal.classList.remove('show');
  groupNameInput.value = '';
});

// 打开设置模态框
settingsBtn.addEventListener('click', () => {
  if (currentUser) {
    nicknameInput.value = currentUser.displayName;
  }
  settingsModal.classList.add('show');
});

// 关闭设置模态框
cancelSettings.addEventListener('click', () => {
  settingsModal.classList.remove('show');
});

// 保存设置
saveSettings.addEventListener('click', () => {
  const newNickname = nicknameInput.value.trim();
  if (newNickname && currentUser) {
    currentUser.displayName = newNickname;
    // 这里可以将新昵称保存到Firebase或本地存储
    localStorage.setItem('userNickname', newNickname);
    settingsModal.classList.remove('show');
  }
});

// 创建群聊
createGroupSubmit.addEventListener('click', () => {
  const groupName = groupNameInput.value.trim();
  if (groupName) {
    const newGroup = {
      id: Date.now().toString(),
      name: groupName,
      type: 'group',
      members: [currentUser.uid],
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    db.ref('chats').push(newGroup).then(() => {
      groupModal.classList.remove('show');
      groupNameInput.value = '';
    });
  }
});

// 发送消息
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const messageText = chatInput.value.trim();
  if (messageText && currentChat && currentUser) {
    const message = {
      id: Date.now().toString(),
      chatId: currentChat.id,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: messageText,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      readBy: {}
    };
    
    message.readBy[currentUser.uid] = true;
    
    db.ref('messages').push(message).then(() => {
      chatInput.value = '';
    });
  }
}

// 加载聊天列表
function loadChats() {
  db.ref('chats').on('value', (snapshot) => {
    chats = [];
    snapshot.forEach((childSnapshot) => {
      const chat = childSnapshot.val();
      chat.id = childSnapshot.key;
      chats.push(chat);
    });
    renderChatList();
  });
}

// 渲染聊天列表
function renderChatList() {
  chatSidebar.innerHTML = '<h2>聊天</h2>';
  chats.forEach(chat => {
    const chatItem = document.createElement('div');
    chatItem.className = `chat-item ${currentChat && currentChat.id === chat.id ? 'active' : ''}`;
    chatItem.innerHTML = `
      <span>${chat.name}</span>
      <span class="unread-count" id="unread-${chat.id}">0</span>
    `;
    chatItem.addEventListener('click', () => {
      selectChat(chat);
    });
    chatSidebar.appendChild(chatItem);
    updateUnreadCount(chat.id);
  });
}

// 选择聊天
function selectChat(chat) {
  currentChat = chat;
  renderChatList();
  loadMessages();
  markChatAsRead();
}

// 加载消息
function loadMessages() {
  if (!currentChat) return;
  
  chatMessages.innerHTML = '';
  db.ref('messages').orderByChild('chatId').equalTo(currentChat.id).on('value', (snapshot) => {
    chatMessages.innerHTML = '';
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      renderMessage(message);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// 渲染消息
function renderMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
  
  const isRead = message.readBy && message.readBy[currentUser.uid];
  const statusClass = message.senderId === currentUser.uid ? (isRead ? 'read' : 'sent') : '';
  
  messageElement.innerHTML = `
    <div class="message-sender">${message.senderName}</div>
    <div class="message-content">${message.text}</div>
    ${message.senderId === currentUser.uid ? `<div class="message-status">${isRead ? '已读' : '已发送'}</div>` : ''}
  `;
  
  chatMessages.appendChild(messageElement);
}

// 更新未读消息计数
function updateUnreadCount(chatId) {
  if (!currentUser) return;
  
  db.ref('messages').orderByChild('chatId').equalTo(chatId).on('value', (snapshot) => {
    let unreadCount = 0;
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.senderId !== currentUser.uid && (!message.readBy || !message.readBy[currentUser.uid])) {
        unreadCount++;
      }
    });
    const unreadElement = document.getElementById(`unread-${chatId}`);
    if (unreadElement) {
      unreadElement.textContent = unreadCount;
      unreadElement.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  });
}

// 标记聊天为已读
function markChatAsRead() {
  if (!currentChat || !currentUser) return;
  
  db.ref('messages').orderByChild('chatId').equalTo(currentChat.id).once('value', (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.senderId !== currentUser.uid) {
        const updates = {};
        if (!message.readBy) {
          updates['readBy'] = {};
        }
        updates[`readBy/${currentUser.uid}`] = true;
        childSnapshot.ref.update(updates);
      }
    });
  });
}

// 模拟用户登录（实际项目中应该使用Firebase Auth）
function simulateLogin() {
  // 从本地存储读取用户昵称
  const savedNickname = localStorage.getItem('userNickname');
  
  // 模拟用户信息
  currentUser = {
    uid: 'user_' + Date.now(),
    displayName: savedNickname || '用户' + Math.floor(Math.random() * 1000)
  };
  
  // 初始化默认群聊
  const defaultGroup = {
    id: 'default',
    name: '默认群聊',
    type: 'group',
    members: [currentUser.uid],
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  
  db.ref('chats').once('value', (snapshot) => {
    if (!snapshot.exists()) {
      db.ref('chats').push(defaultGroup);
    }
  });
  
  loadChats();
}

// 初始化应用
function initApp() {
  initEmojiPicker();
  simulateLogin();
}

// 页面加载完成后初始化
window.onload = initApp;
