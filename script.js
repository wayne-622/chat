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
const userSearch = document.getElementById('user-search');
const searchBtn = document.getElementById('search-btn');
const groupChats = document.getElementById('group-chats');
const privateChats = document.getElementById('private-chats');
const avatarUpload = document.getElementById('avatar-upload');
const avatarImg = document.getElementById('avatar-img');

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

// 头像上传预览
avatarUpload.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = (event) => {
      avatarImg.src = event.target.result;
      if (currentUser) {
        currentUser.avatar = event.target.result;
        localStorage.setItem('userAvatar', event.target.result);
      }
    };
    reader.readAsDataURL(e.target.files[0]);
  }
});

// 打开设置模态框
settingsBtn.addEventListener('click', () => {
  if (currentUser) {
    nicknameInput.value = currentUser.displayName;
    if (currentUser.avatar) {
      avatarImg.src = currentUser.avatar;
    } else {
      avatarImg.src = 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png';
    }
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
    localStorage.setItem('userNickname', newNickname);
    if (currentUser.avatar) {
      localStorage.setItem('userAvatar', currentUser.avatar);
    }
    settingsModal.classList.remove('show');
  }
});

// 搜索用户
searchBtn.addEventListener('click', () => {
  const searchTerm = userSearch.value.trim();
  if (searchTerm && currentUser) {
    // 基于用户名生成固定的用户ID，避免重复创建
    const foundUserUid = 'user_' + btoa(searchTerm).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // 模拟搜索用户（实际项目中应该从Firebase数据库中查询）
    const foundUser = {
      uid: foundUserUid,
      displayName: searchTerm,
      avatar: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png'
    };
    
    // 检查是否已存在私聊（基于用户名查找）
    const existingChat = chats.find(chat => 
      chat.type === 'private' && 
      chat.name === searchTerm &&
      chat.members.includes(currentUser.uid)
    );
    
    if (existingChat) {
      selectChat(existingChat);
    } else {
      // 创建新的私聊
      const newPrivateChat = {
        type: 'private',
        name: foundUser.displayName,
        members: [currentUser.uid, foundUser.uid],
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      db.ref('chats').push(newPrivateChat).then((snapshot) => {
        const chat = newPrivateChat;
        chat.id = snapshot.key;
        chats.push(chat);
        renderChatList();
        selectChat(chat);
      });
    }
    
    userSearch.value = '';
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
    // 检查是否包含图片URL
    const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
    const imageMatch = messageText.match(imageRegex);
    
    // 检查是否包含链接
    const linkRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/i;
    
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
      // 只添加当前用户有权限的聊天
      // 群聊：所有用户都可以看到
      // 私聊：只有成员可以看到
      if ((chat.type === 'group') || 
          (chat.type === 'private' && chat.members && chat.members.includes(currentUser.uid))) {
        chats.push(chat);
      }
    });
    // 如果没有聊天，创建默认群聊
    if (chats.length === 0) {
      const defaultGroup = {
        name: '世界群聊',
        type: 'group',
        members: [currentUser.uid],
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      db.ref('chats').push(defaultGroup);
    }
    renderChatList();
  });
}

// 渲染聊天列表
function renderChatList() {
  groupChats.innerHTML = '';
  privateChats.innerHTML = '';
  
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
    
    if (chat.type === 'group') {
      groupChats.appendChild(chatItem);
    } else {
      privateChats.appendChild(chatItem);
    }
    
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
      // 检查当前用户是否有权限查看此消息
      // 群聊：所有用户都可以看到
      // 私聊：只有消息发送者和接收者可以看到
      if (currentChat.type === 'group' || 
          (currentChat.type === 'private' && 
           (message.senderId === currentUser.uid || 
            (currentChat.members && currentChat.members.includes(currentUser.uid)))) {


        renderMessage(message);
      }
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// 渲染消息
function renderMessage(message) {
  const isSent = message.senderId === currentUser.uid;
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
  
  // 处理消息内容，支持图片和链接
  let messageContent = message.text;
  
  // 处理图片URL
  const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
  messageContent = messageContent.replace(imageRegex, '<img src="$1" alt="图片">');
  
  // 处理普通链接
  const linkRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/i;
  messageContent = messageContent.replace(linkRegex, '<a href="$1" target="_blank">$1</a>');
  
  // 群聊显示已读未读人数，私聊显示已读/未读状态
  let readStatus = '';
  if (isSent) {
    if (currentChat && currentChat.type === 'group') {
      // 群聊：显示已读未读人数
      const readCount = message.readBy ? Object.keys(message.readBy).length : 0;
      const totalMembers = currentChat.members ? currentChat.members.length : 1;
      const unreadCount = totalMembers - readCount;
      readStatus = `<div class="message-read-status">${readCount}已读 ${unreadCount}未读</div>`;
    } else {
      // 私聊：显示已读/未读
      const isReadByOther = message.readBy && Object.keys(message.readBy).some(uid => uid !== currentUser.uid);
      readStatus = `<div class="message-status">${isReadByOther ? '已读' : '未读'}</div>`;
    }
  }
  
  // 获取头像（自己的消息显示自己的头像，别人的消息显示发送者的头像）
  const avatarUrl = isSent ? (currentUser.avatar || 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png') : 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png';
  
  messageElement.innerHTML = `
    <div class="message-avatar">
      <img src="${avatarUrl}" alt="头像">
    </div>
    <div class="message-body">
      <div class="message-sender">${message.senderName}</div>
      <div class="message-content-wrapper">
        ${isSent ? readStatus : ''}
        <div class="message-content">${messageContent}</div>
      </div>
    </div>
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
  // 从本地存储读取用户信息
  let savedUid = localStorage.getItem('userUid');
  const savedNickname = localStorage.getItem('userNickname');
  const savedAvatar = localStorage.getItem('userAvatar');
  
  // 如果没有保存的UID，生成一个新的并保存
  if (!savedUid) {
    savedUid = 'user_' + Date.now();
    localStorage.setItem('userUid', savedUid);
  }
  
  // 模拟用户信息
  currentUser = {
    uid: savedUid,
    displayName: savedNickname || '用户' + Math.floor(Math.random() * 1000),
    avatar: savedAvatar || 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/Image_to_url_V2/-----2026-03-26-101455-imagetourl.cloud-1774491309403-grw8d7.png'
  };
  
  // 初始化默认群聊
  const defaultGroup = {
    id: 'default',
    name: '世界群聊',
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
