const socket = io('https://edu.uxis.co.kr', {secure: true});
//const socket = io('https://localhost', {secure: true});

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
	{
            urls: "stun:edu.uxis.co.kr"
        },
        {
            urls: "turn:edu.uxis.co.kr?transport=tcp",
                    "username": "webrtc",
                    "credential": "webrtc100!"
        }

    ],
}

let sendPC;
let receivePCs = {};
let infoOfReceivers = {};
let receiveVideos = {};
let localStream;
let selfStream;

const chat_img = "img/list_img01.jpg"  //임시

let userId;
let roomId;
let role;
let nextVideoPos = [70, 20];

function register(){
    document.getElementsByClassName('wrap')[0].style.display = "block";
    document.getElementsByClassName('login')[0].style.display = "none";

    userName = document.getElementById('userName').value;
    userId = document.getElementById('userId').value;
    roomId = document.getElementById('roomId').value;
    
    role = document.getElementById('role');
    role = role.options[role.selectedIndex].value;

    getUserMediaStream();
}

function setVideoPosition(role, userId){
    var video;

    video = document.createElement('video');
    video.className = 'video_' + userId;
    video.autoplay = true;
	video.playsinline = true;
    document.getElementsByClassName('video')[0].appendChild(video);
    
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
        
    var container = document.getElementsByClassName('students')[0];
        
    dd.appendChild(name_txt);
    dd.appendChild(id_txt);
    dl.appendChild(dt);
    dl.appendChild(dd);
    li.appendChild(txt_bubble);
    li.appendChild(dl);
    container.appendChild(li);

    return video;
}

function getUserMediaStream(){
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        })
        .then((stream) => {
            const myVideo = setVideoPosition(role, userId);
            selfStream = new MediaStream();
            selfStream.addTrack(stream.getTracks()[1]);
            myVideo.srcObject = selfStream;
            
            localStream = stream;

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
        		
            socket.emit("joinRoom", {
                userId: userId,
                senderSocketId: socket.id,
                roomId: roomId,
                role: role,
            });
		});
}

function stopStream() {
	localStream.getTracks()[1].stop();
}

function restartStream() {
	navigator.mediaDevices.getUserMedia({
	    video: true,
	})
	.then((stream) => {
		sendPC.addTrack(stream.getTracks()[0], stream);	
	})
	.catch((error) => {
	    console.error(error);
	})
}

function createSenderPeerConnection(socket, stream) {
    let pc = new RTCPeerConnection(pc_config);
/*
    pc.onicecandidate = (e) =>{
        console.log("onicecandidate!");
	if(e.candidate) {
            socket.emit("senderCandidate", {
                candidate: e.candidate,
                senderSocketId: socket.id,
            });
        }
    }
*/
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
/*
    pc.onicecandidate = (e) => {
        if(e.candidate) {
            socket.emit("receiverCandidate", {
                candidate: e.candidate,
                receiverSocketId: socket.id,
                senderSocketId: socketId,
            });
        }
    }
*/
    pc.oniceconnectionstatechange = (e) =>{
        //console.log(e);
    }

    pc.ontrack = (e) => {
        if(receiveVideos[socketId]) return;
        receiveVideos[socketId] = setVideoPosition(role, userId);
        receiveVideos[socketId].srcObject = e.streams[0];
        console.log(e.streams[0].getTracks());
    }

    return pc;
}

async function createSenderOffer(socket){
    try {
        let sdp = await sendPC.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await sendPC.setLocalDescription(new RTCSessionDescription(sdp));
	console.log("1");
        socket.emit("senderOffer", {
            sdp,
            senderSocketId: socket.id,
            roomId: roomId,
        });
	
    	sendPC.onicecandidate = (e) =>{
			console.log("onicecandidate");
        	if(e.candidate) {
            	socket.emit("senderCandidate", {
                	candidate: e.candidate,
                	senderSocketId: socket.id,
            	});
        	}
    	}
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
        await pc.setLocalDescription(new RTCSessionDescription(sdp));
        socket.emit("receiverOffer", {
            sdp,
            receiverSocketId: socket.id,
            senderSocketId: senderSocketId,
            roomId: roomId,
        });
							
    	pc.onicecandidate = (e) => {
    	    if(e.candidate) {
    	        socket.emit("receiverCandidate", {
    	            candidate: e.candidate,
    	            receiverSocketId: socket.id,
    	            senderSocketId: senderSocketId,
    	        });
    	    }
    	}
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
    socket.emit('message', {type: 'message', message: message, role: role, chat_img : chat_img, roomId : roomId, userName : userName})

    //스크롤 밑으로 내리기
    var chat_scroll = document.getElementById('mCSB_2_container');  
    //console.log("scroll height:",chat_scroll.scrollHeight) //전체 스크롤 크기
    //console.log("style height:",chat_scroll.style.top)  //현재 스크롤 위치
    var scroll_down=-chat_scroll.scrollHeight -189
    chat_scroll.style.top = `${scroll_down}px`
    //print("style height2:",scroll_down)
    
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
    } catch (error) {
        console.log(error);
    }
});

socket.on("getSenderCandidate", (message) => {
    try{
        if(!message.candidate) return;
        sendPC.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
        console.error(error);
    }
});

socket.on("getSenderAnswer", (message) => {
    try {	
    	console.log("getSenderAnswer");
        sendPC.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
        console.error(error);
    }
});

socket.on("getReceiverAnswer", async (message) => {
    try {
        let pc = receivePCs[message.id];
        if(pc.signalingState === 'stable') return;
        console.log(pc.signalingState);
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
        console.error(error);
    }
});

socket.on("userEnter", (message) => {
    try {
        console.log("userEnter!!!!!!!!!!!!");
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
    exitUserElement = document.getElementsByClassName(message.userId)[0];
    exitUserVideo = document.getElementsByClassName('video_' + message.userId)[0];
    exitUserElement.parentNode.removeChild(exitUserElement);
    exitUserVideo.parentNode.removeChild(exitUserVideo);
});

socket.on("allUsers", (message) => {
    let len = message.users.length;
    for(let i=0; i<len; i++) {
        let pc = createReceiverPeerConnection(message.users[i].id, socket, message.users[i].role, message.users[i].userId);
        createReceiverOffer(pc, socket, message.users[i].id, message.users[i].roomId);
    }
});


socket.on('update', function(data) {  //메시지가 온경우 
    const chat_inner = document.getElementById('chat_inners');
    if(data.role == 'teacher'){
        chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${data.chat_img} /></div><span>${data.userName}</span></dt><dd>${data.message}</dd></dl>`;
    }
    else
        chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${data.chat_img} /></div><span>${data.userName}</span></dt><dd>${data.message}</dd></dl>`;

    //스크롤 밑으로 내리기
    var chat_scroll = document.getElementById('mCSB_2_container');  
    //console.log("scroll height:",chat_scroll.scrollHeight) //전체 스크롤 크기
    //console.log("style height:",chat_scroll.style.top)  //현재 스크롤 위치
    var scroll_down=-chat_scroll.scrollHeight -189
    chat_scroll.style.top = `${scroll_down}px`
    //print("style height2:",scroll_down)
})

socket.on('get_chat', function(data) {
    console.log("get_chat!!!")
    const chat_inner = document.getElementById('chat_inners');
    /*이전 대화목록 받아오기*/
    for(var i=0; i<data.length; i++){
        if(data[i].isTeacher == 'teacher'){
            chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${data[i].chat_img} /></div><span>${data[i].userName}</span></dt><dd>${data[i].msg}</dd></dl>`;
        }
        else
            chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${data[i].chat_img} /></div><span>${data[i].userName}</span></dt><dd>${data[i].msg}</dd></dl>`;
    }
    var chat_scroll = document.getElementById('mCSB_2_container');  //스크롤 밑으로 내리기
    
    var scroll_down=-chat_scroll.scrollHeight -189
    chat_scroll.style.top = `${scroll_down}px`
})