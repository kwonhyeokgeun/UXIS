//출처 https://www.youtube.com/watch?v=JfQBaLHLX5w&list=PLlSZlNj22M7Tx7NS-wVaC93imHMFPabDW


const path = require('path'); //server파일과 index파일이 다른 dir에 있으므로 path를 알려주기 위함
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');

const publicPath = path.join(__dirname, '../public'); //__dirname 은 현재 dir을 나타내고 path.join으로 두 인자를 합쳐줘서 public의 주소를 publicPath에 저장

let app = express(); //이러면 app에 서버가 만들어짐

app.use(express.static(publicPath)); //express라는 서버가 publicPath를 아규먼트로 서버 가동

let server = http.createServer(app);   //callback function대신에 위에 만든 app을 넣어서 서버 만드

server.listen(3000,function (){
    console.log('Server is running...');
});

let io = socketIO(server);  //io는 브라우저가 '서버'에 전달하는 모든 event처리

io.on('connection', (socket)=>{  //on으로 들으면서 connection이 발생하면 callback을 실행
    console.log('A new browser has connected to this server');

    socket.emit('Welcome',{ message: 'Welcome to server.'});  //브라우저가 켜지면 해당 브라우저에게만 Welcome이라는 이벤트를 보냄

    socket.on('disconnect', ()=>{  //socket이 disconnect 됬을때
        console.log('The brower was disconnected.');
    });
    socket.on('Msg',function (message){  //client에게서 Msg라는 event가 오면 message를 터미널로 보여줌 
        console.log(message);  
        //socket.broadcast.emit('MsgFromServer',message);
        socket.broadcast.emit('MsgFromServer',message);
    });
    
});

/* socket.emit : 소켓을 전달해준 브라우저(클라이언트)에 이벤트를 보내는것
io.emit : 현재 서버에 접속해 있는 모든 클라이언트에게 이벤트를 보냄
socket.broadcast.emit : 이벤트를 만들어낸 브라우저를 제외한 다른 브라우저에서 이벤트를 보내는것
*/ 