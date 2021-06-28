const socket = io('https://localhost', {secure: true});

window.addEventListener('load', () => {
    document.getElementsByClassName('wrap')[0].style.display = "none";
});

window.addEventListener('beforeunload', () => {
    socket.emit("disconnect");
});

const pc_config = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
    ],
}

let sendPC = new RTCPeerConnection(pc_config);
let receivePCs = {};
let infoOfReceivers = {};
let receiveVideos = {};

const chat_img = "img/list_img01.jpg"  //임시

let userId;
let roomId;
let role;
let userName;
var roomTime;


function register(){
    document.getElementsByClassName('wrap')[0].style.display = "block";
    document.getElementsByClassName('login')[0].style.display = "none";

    userName = document.getElementById('userName').value;
    userId = document.getElementById('userId').value;
    roomId = document.getElementById('roomId').value;
    
    role = document.getElementById('role');
    role = role.options[role.selectedIndex].value;
    
    if(role == 'teacher') {
        var today = new Date();
        //console.log("time : ", today.getTime());
        roomTime = today.getTime();
        socket.emit("set_roomTime",{time:today.getTime(), roomId : roomId});
    }
    else{
        socket.emit("req_roomTime",{roomId : roomId});
    }
    

    getUserMediaStream();
}

function setVideoPosition(role, userId){
    var video;
    if(role === 'teacher') {
        video = document.createElement('video');
        video.className = 'teacher_video';
        video.autoplay = true;
        document.getElementsByClassName('video')[0].appendChild(video);
    } else if(role === 'student') {
        var li = document.createElement('li');
        li.className = userId;
        var dt = document.createElement('dt');
        var dd = document.createElement('dd');
        var dl = document.createElement('dl');
        var txt_bubble = document.createElement('div');
        txt_bubble.className = 'txt_bubble';
        var name_txt = document.createElement('p');
        name_txt.className = 'name_txt';
        name_txt.innerText = userId;
        var id_txt = document.createElement('p');
        id_txt.className = 'id_txt';
        id_txt.innerText = userId;
        video = document.createElement('video');
        video.className = 'student_video';
        video.autoplay = true;
        
        var container = document.getElementsByClassName('students')[0];
        
        dt.appendChild(video);
        dd.appendChild(name_txt);
        dd.appendChild(id_txt);
        dl.appendChild(dt);
        dl.appendChild(dd);
        li.appendChild(txt_bubble);
        li.appendChild(dl);
        container.appendChild(li);
    }
    return video;
}

function getUserMediaStream(){
    navigator.mediaDevices
        .getUserMedia({
            video: true,
        })
        .then((stream) => {
            const myVideo = setVideoPosition(role, userId);
            myVideo.srcObject = stream;

            var localStream = stream;

            sendPC = createSenderPeerConnection(socket, localStream);
            createSenderOffer(socket);

            socket.emit("joinRoom", {
                userId: userId,
                senderSocketId: socket.id,
                roomId: roomId,
                role: role,
            });
        })
        .catch(error => {
            console.error(`getUserMedia error: ${error}`);
        })
}

function createSenderPeerConnection(socket, stream) {
    let pc = new RTCPeerConnection(pc_config);

    pc.onicecandidate = (e) =>{
        if(e.candidate) {
            socket.emit("senderCandidate", {
                candidate: e.candidate,
                senderSocketId: socket.id,
            });
        }
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    if(stream) {
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });
    } else {
        console.log("no localStream");
    }

    return pc;
}

function createReceiverPeerConnection(socketId, socket, role, userId) {
    let pc = new RTCPeerConnection(pc_config);
    
    receivePCs[socketId] = pc;

    pc.onicecandidate = (e) => {
        if(e.candidate) {
            socket.emit("receiverCandidate", {
                candidate: e.candidate,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
            });
        }
    }

    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    pc.ontrack = (e) => {
        if(receiveVideos[socketId]) return;
        receiveVideos[socketId] = setVideoPosition(role, userId);
        receiveVideos[socketId].srcObject = e.streams[0];
        console.log(e.streams[0]);
    }

    return pc;
}

async function createSenderOffer(socket){
    try {
        let sdp = await sendPC.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        })
        await sendPC.setLocalDescription(new RTCSessionDescription(sdp));

        socket.emit("senderOffer", {
            sdp,
            senderSocketId: socket.id,
            roomId: roomId,
        });
    } catch(error) {
        console.log(error);
    }
}

async function createReceiverOffer(pc, socket, senderSocketId, roomId) {
    try {
        let sdp = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        pc.setLocalDescription(new RTCSessionDescription(sdp));
        socket.emit("receiverOffer", {
            sdp,
            receiverSocketId: socket.id,
            senderSocketId: senderSocketId,
            roomId: roomId,
        });
    } catch (error) {
        console.error(error);
    }
}
function send_msg() {
    // 입력되어있는 데이터 가져오기
    var message = document.getElementById('msg_box').value
    // 가져왔으니 데이터 빈칸으로 변경
    document.getElementById('msg_box').value = ''
  
    // 내가 전송할 메시지 클라이언트에게 표시
    const chat_inner = document.getElementById('chat_inners');
    if (role == 'teacher')  //리더인경우
        chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${chat_img} /></div><span>${userName}</span></dt><dd>${message}</dd></dl>`;
    else   //리더가 아닌경우 
        chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${chat_img} /></div><span>${userName}</span></dt><dd>${message}</dd></dl>`;
    // 서버로 message 이벤트 전달 + 데이터와 함께
    console.log("message:",message)
    socket.emit('message', {type: 'message', message: message, role: role, chat_img : chat_img, roomId : roomId, userName : userName, roomTime:roomTime})

    var chat_scroll = document.getElementById('mCSB_2_container');  //스크롤 밑으로 내리기
    //console.log("scroll height:",chat_scroll.scrollHeight)
    //console.log("chat height:",chat_scroll.style.top)
    var scroll_down=-chat_scroll.scrollHeight -189
    chat_scroll.style.top = `${scroll_down}px`
    //print("chat height2:",h)
    
}
function enterkey() { 
    if (window.event.keyCode == 13) {
         // 엔터키가 눌렸을 때 
         send_msg();
    } 
}


socket.on("getReceiverCandidate", (message) => {
    try {
        let pc = receivePCs[message.id];
        if(!message.candidate) return;
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log("receiver candidate 등록 완료");
    } catch (error) {
        console.log(error);
    }
});

socket.on("getSenderCandidate", (message) => {
    try{
        if(!message.candidate) return;
        sendPC.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log("sender candidate 등록 완료");
    } catch (error) {
        console.error(error);
    }
});

socket.on("getSenderAnswer", (message) => {
    try {
        sendPC.setRemoteDescription(new RTCSessionDescription(message.sdp));
        console.log("getSenderAnswer Success");
    } catch (error) {
        console.error(error);
    }
});

socket.on("getReceiverAnswer", async (message) => {
    try {
        let pc = receivePCs[message.id];
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        console.log("getReceiverAnswer Success");
    } catch (error) {
        console.error(error);
    }
});

socket.on("userEnter", (message) => {
    try {
        let pc = createReceiverPeerConnection(message.id, socket, message.role, message.userId);
        createReceiverOffer(pc, socket, message.id, roomId);
        infoOfReceivers[message.id] = {
            userId: message.userId,
            role: message.role,
        };
    } catch (error) {
        console.error(error);
    }
});

socket.on("userExit", (message) => {
    receivePCs[message.id].close();
    delete receivePCs[message.id];
    var exitUserElement;
    if(message.role === "teacher"){
        exitUserElement = document.getElementsByClassName('teacher_video')[0];
    } else if(message.role === "student") {
        exitUserElement = document.getElementsByClassName(message.userId)[0];
    }
    exitUserElement.parentNode.removeChild(exitUserElement);
})

socket.on("allUsers", (message) => {
    let len = message.users.length;
    for(let i=0; i<len; i++) {
        let pc = createReceiverPeerConnection(message.users[i].id, socket, message.users[i].role, message.users[i].userId);
        createReceiverOffer(pc, socket, message.users[i].id, message.users[i].roomId);
    }
})

socket.on('update', function(data) {  //메시지가 온경우 
    const chat_inner = document.getElementById('chat_inners');
    if(data.role == 'teacher'){
        chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${data.chat_img} /></div><span>${data.userName}</span></dt><dd>${data.message}</dd></dl>`;
    }
    else
        chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${data.chat_img} /></div><span>${data.userName}</span></dt><dd>${data.message}</dd></dl>`;

    var chat_scroll = document.getElementById('mCSB_2_container');  //스크롤 밑으로 내리기
    //console.log("scroll height:",chat_scroll.scrollHeight)
    //console.log("chat height:",chat_scroll.style.top)
    var scroll_down=-chat_scroll.scrollHeight -189
    chat_scroll.style.top = `${scroll_down}px`
    //print("chat height2:",h)
})

socket.on('get_chat', function(data) {
    console.log("get_chat!!!")
    const chat_inner = document.getElementById('chat_inners');
    /*이전 대화목록 받아오기*/
    for(var i=0; i<data.length; i++){
        if(data[i].role == 'teacher'){
            chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${data[i].chat_img} /></div><span>${data[i].userName}</span></dt><dd>${data[i].msg}</dd></dl>`;
        }
        else
            chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${data[i].chat_img} /></div><span>${data[i].userName}</span></dt><dd>${data[i].msg}</dd></dl>`;
    }
    var chat_scroll = document.getElementById('mCSB_2_container');  //스크롤 밑으로 내리기
    
    var scroll_down=-chat_scroll.scrollHeight -189
    chat_scroll.style.top = `${scroll_down}px`
})
socket.on('get_roomTime', function(data) {
    roomTime=data.time
    console.log("roomTime: ",roomTime)
})
