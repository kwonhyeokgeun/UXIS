const express = require('express')
const socket = require('socket.io')
const http = require('http')
const fs = require('fs')
const app = express()
const server = http.createServer(app)

/* 생성된 서버를 socket.io에 바인딩 */
const io = socket(server)

app.use('/css', express.static('./css'))
app.use('/js', express.static('./js'))
app.use('/fonts', express.static('./fonts'))
app.use('/img', express.static('./img'))



/* Get 방식으로 / 경로에 접속하면 실행 됨 */
app.get('/', function(request, response) {
    fs.readFile('index.html', function(err, data) {
        if(err) {
            response.send('에러')
        } else {
            response.writeHead(200, {'Content-Type':'text/html'})
            response.write(data)
            response.end()
        }
    })
})

var partc_info =[{}] //이미 들어와있는 참가자의 정보
var partc_num={}  //해당 방의 유저의 수

io.sockets.on('connection', function(socket) {
    
    /* 새로운 유저가 접속했을 경우 다른 소켓에게도 알려줌 */
    socket.on('newUser', function(name, room, id_txt, chat_img) {
        console.log(name + '님이 접속하였습니다.')
        if(partc_num[room]===undefined){  //방에 아무도 없는경우 초기화 작업 
            partc_num[room]=0
            partc_info[room] = {name: name, id_txt: id_txt, chat_img : chat_img}
        }
        console.log("num", partc_num[room])
      /* 소켓에 이름 저장해두기 */
        socket.name = name
        socket.room = room
        socket.partc_num=partc_num[room] //해당 방에서 유저의 인덱스번호
        socket.emit('init',partc_num[room])  //방금 접속한 socket에만 init을 보내서 partc_num을 init함

        //console.log("socket.partc_num:",socket.partc_num)
        console.log("partc_num:", partc_num[room])
      /* 모든 소켓에게 전송 접속유저를 채팅에 띄우기*/
        //io.sockets.to(room).emit('update', {type: 'connect', name: 'SERVER', room : room ,message: name + '님이 방에 접속하였습니다.'})
        
        /*해당방의 배열에 접속한사람의 정보 추가*/
        partc_info[room][partc_num[room]] = {name: name, id_txt: id_txt, chat_img : chat_img}

      /* 모든 소켓에게 전송 접속유저를 참여 리스트에 추가하기*/
        io.sockets.to(room).emit('list_append', {name: name, id_txt: id_txt, chat_img : chat_img, partc_num: partc_num[room]}, partc_info[room])
        partc_num[room] = partc_num[room]+1
    })


    socket.on('message', function(data) {
        /* 받은 데이터에 누가 보냈는지 이름을 추가 */
        if(data.message !== ""){
            data.name = socket.name
            
            console.log(data)
        
            /* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
            socket.broadcast.to(socket.room).emit('update', data);
            
        }
    })

    socket.on('join_room', function (room){
        console.log('join room : ' + room)
        socket.join(room)
    })
    socket.on('disconnect', function() {
        console.log(socket.name + '님이 나가셨습니다.')
        console.log("parc_num:", socket.partc_num, "room", socket.room)
        /* 나가는 사람을 제외한 나머지 유저에게 메시지 전송 */
        //socket.broadcast.to(socket.room).emit('update', {type: 'disconnect', name: 'SERVER', message: socket.name + '님이 나가셨습니다.'});
        
        /* 나가는 사람을 제외한 나머지 유저의 partc_lists 변경하도록 emit */
        socket.broadcast.to(socket.room).emit('list_delete', socket.partc_num);

        var room=socket.room
        //유저가 나갔으니 partc_info를 나간 유저부터 한칸씩 땡김
        for (var i=socket.partc_num; i<partc_num[socket.room]-1; i++){
            partc_info[room][i] = partc_info[room][i+1]
        }
        


        delete partc_info[room][partc_num[room]-1]//한칸씩 땡겼으니 마지막 요소 삭제
        
        
        partc_num[room]=partc_num[room]-1  //partc_num 1줄여주기
        console.log(partc_info[room], partc_info[room].length)
    })

    socket.on('leave_room', function (room){
        console.log('leave room : ' + room)
        socket.leave(room)
    })//아직 사용안함 
    
    socket.on('sync',function(name, num){
        //console.log("test name, num: ",name,num)
        socket.partc_num=num
        //console.log("test2 name num", socket.name, socket.partc_num)
    })
    

})




  /* 서버를 8080 포트로 listen */
server.listen(3000, function() {
    console.log('서버 실행 중..')
})