const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const path = require('path');
const wrtc = require('wrtc');

//app.set('view engine','ejs');
//app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname));

const options = {
    key: fs.readFileSync('./keys/private.key'),
    cert: fs.readFileSync('./keys/cert.crt')
};

const server = https.createServer(options, app).listen(443, () => {
    console.log("Create HTTPS Server");
});

app.get('/', (request, response) => {
    response.render('index.html');
});

//----------------------------------------------------

const io = require('socket.io')(server);

let receivers = {};
let senders = {};
let users = {};
let socketToRoom = {};
let infoOfUsers = {};

let ontrackSwitch = false;

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

io.on('connection', function(socket) {
    console.log("connection");

    socket.on("senderOffer", async (message) => {  //sdp, senderSocketId,roomId
        try {
            socketToRoom[message.senderSocketId] = message.roomId;
        
            let pc = createReceiverPeerConnection(message.senderSocketId, socket, message.roomId);
            await pc.setRemoteDescription(message.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(sdp);

            socket.join(message.roomId);
            io.to(message.senderSocketId).emit("getSenderAnswer", { sdp });
            console.log("senderOffer Success");
        } catch (error) {
            console.error(error);
        }
    });

    socket.on("receiverOffer", async (message) => {
        try {
            console.log("receiverOffer");
            let pc = createSenderPeerConnection(
                message.receiverSocketId,
                message.senderSocketId,
                socket,
                message.roomId,
            );
            await pc.setRemoteDescription(message.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            });
            await pc.setLocalDescription(sdp);
            io.to(message.receiverSocketId).emit("getReceiverAnswer", {
                id: message.senderSocketId,
                sdp,
            });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on("senderCandidate", (message) => {
        try {
            let pc = receivers[message.senderSocketId];
            pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error(error);
        }
    });

    socket.on("receiverCandidate", async (message) => {
        try {
            let senderPC = senders[message.senderSocketId];
            await senderPC[0].pc.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
        } catch (error) {
            console.log("여긴가?" + error);
        }
    });

    socket.on("joinRoom", (message) => {
        try {
            let allUsers = getOtherUsersInRoom(message.senderSocketId, message.roomId);
            io.to(message.senderSocketId).emit("allUsers", { users: allUsers });
            infoOfUsers[message.senderSocketId] = {
                userId: message.userId,
                role: message.role,
                userName : message.userName
            };
        } catch (error) {
            console.error(error);
        }
    });

    socket.on("disconnect", () => {
        try {
            let roomId = socketToRoom[socket.id];

            deleteUser(socket.id, roomId);
            closeReceiverPC(socket.id);
            closeSenderPCs(socket.id);

            console.log(infoOfUsers);
            console.log(socket.id);

            if(!infoOfUsers[socket.id]) return;

            socket.broadcast.to(roomId).emit("userExit", { 
                id: socket.id,
                userId: infoOfUsers[socket.id].userId,
                role: infoOfUsers[socket.id].role,
                userName : infoOfUsers[socket.id].userName
            });
            
            delete infoOfUsers[socket.id];
        } catch (error) {
            console.error(error);
        }
    });
    
    socket.on('message', function(data) {
        /* 받은 데이터에 누가 보냈는지 이름을 추가 */
        if(data.message !== ""){
            console.log(data)
            /* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
            socket.broadcast.to(data.roomId).emit('update', data);
            
        }
    })
});

function getOtherUsersInRoom(senderSocketId, roomId) {
    let allUsers = [];

    if(!users[roomId]) return allUsers;

    let len = users[roomId].length;
    for(let i=0; i<len; i++) {
        if(users[roomId][i].id === senderSocketId) continue;
        allUsers.push({
            id: users[roomId][i].id,
            role: infoOfUsers[users[roomId][i].id].role,
            userId: infoOfUsers[users[roomId][i].id].userId,
            roomId: roomId,
            userName:userName
        });
    }
    return allUsers;
}

function createSenderPeerConnection(receiverSocketId, senderSocketId, socket, roomId) {
    let pc = new wrtc.RTCPeerConnection(pc_config);

    if(senders[senderSocketId]) {
        senders[senderSocketId].filter(user => user.id !== receiverSocketId)
        senders[senderSocketId].push({ id: receiverSocketId, pc: pc })
    } else {
        senders[senderSocketId] = [{
            id: receiverSocketId,
            pc: pc,
        }];
    }

    pc.onicecandidate = (e) => {
        io.to(receiverSocketId).emit("getReceiverCandidate", {
            id: senderSocketId,
            candidate: e.candidate,
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    const sendUser = users[roomId].filter(user => user.id === senderSocketId);
    sendUser[0].stream.getTracks().forEach((track => {
        pc.addTrack(track, sendUser[0].stream);
    }));

    return pc;
}

function createReceiverPeerConnection(socketId, socket, roomId) {
    let pc = new wrtc.RTCPeerConnection(pc_config);

    receivers[socketId] = pc;
    
    pc.onicecandidate = (e) => {
        io.to(socketId).emit("getSenderCandidate", {
            candidate: e.candidate,
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    pc.ontrack = (e) => {
        if(!ontrackSwitch) {
            ontrackSwitch = true;
            return;
        }
        if(users[roomId]) {
            console.log(users[roomId]);
            console.log(users[roomId].filter(user => user.id == socketId));
            if(users[roomId].filter(user => user.id == socketId) == []) return;
            users[roomId].push({
                id: socketId,
                stream: e.streams[0],
            });
        } else {
            users[roomId] = [
                {
                    id: socketId,
                    stream: e.streams[0],
                }
            ];
        }
        
        console.log("ontrackkkkkkkkkkkkkk");

        socket.broadcast.to(roomId).emit("userEnter", { 
            id: socketId,
            userId: infoOfUsers[socketId].userId,
            role: infoOfUsers[socketId].role,
            roomId: roomId,
            userName : userName
        });
        ontrackSwitch = false;
    }

    return pc;
}

function deleteUser(socketId, roomId) {
    let roomUsers = users[roomId];
    if(!roomUsers) return;
    roomUsers = roomUsers.filter(user => user.id !== socketId);
    users[roomId] = roomUsers;
    if(roomUsers.length === 0) {
        delete users[roomId];
    }
    delete socketToRoom[socketId];
}

function closeReceiverPC(socketId) {
    if (!receivers[socketId]) return;

    receivers[socketId].close();
    delete receivers[socketId];
}

function closeSenderPCs(socketId) {
    if (!senders[socketId]) return;

    let len = senders[socketId].length;
    for (let i = 0; i < len; i++) {
        senders[socketId][i].pc.close();
        let _senders = senders[senders[socketId][i].id];
        let sender = _senders.filter(sPC => sPC.id === socketId);
        if (sender[0]) {
            sender[0].pc.close();
            senders[senders[socketId][i].id] = _senders.filter(
                sPC => sPC.id !== socketId
            );
        }
    }

    delete senders[socketId];
}