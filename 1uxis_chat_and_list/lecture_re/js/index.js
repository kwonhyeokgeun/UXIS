var socket = io()
var room
var chat_img = "img/list_img01.jpg"  //임시
var is_leader = false   //임시
var id_txt
var partc_num //자신의 방에서의 인덱스
var preappend = false  //처음 접속할때 이미 들어와있는 참가자들을 딱 한번 불러오기위한 boolean

/* 접속 되었을 때 실행 */
socket.on('connect', function() {
  /* 이름을 입력받고 */
  var name = prompt('이름을 입력해주세요.', '')
  socket.name=name
  id_txt = prompt('id를 입력해주세요.', '')
  room = prompt('입장할 방 번호를 입력해주세요.', '')
  join_room(name, room); //해당 방에 입장

  /* 이름이 빈칸인 경우 */
  if(!name) {
    name = '익명'
  }
  
  /* 서버에 새로운 유저가 왔다고 알림리고 이름과 방 저장 */
  socket.emit('newUser', name, room, id_txt, chat_img)
  
})

socket.on('update', function(data) {
    const chat_inner = document.getElementById('chat_inners');
    if(data.is_leader = true){
        chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${data.img} /></div><span>${data.name}</span></dt><dd>${data.message}</dd></dl>`;
    }
    else
        chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${data.chat_img} /></div><span>${data.name}</span></dt><dd>${data.message}</dd></dl>`;

})



socket.on('list_append', function(data,partc_info) {
    const lists = document.getElementById('partc_lists');
    const lists_li = document.getElementsByClassName('partc_lists_li');

    /*유저의 인덱스번호 지정*/
    var num = data.partc_num 

    /*해당 참가자가 처음 접속했을 때 이미 들와있는 참가자들을 partc_lists에 추가하는 작업*/
    console.log("pre partc_num:",num)
    if(num >0 && preappend === false){  //이미 들어와있는 사람이 있고 아직 preappend를 안한 경우 
        preappend=true//한번만 하면 되므로 true로 바꾸기 
        for(var i =0; i<num; i++){   //이미 들어와있는 참가자들을 partc_lists에 추가
            lists.innerHTML +=`<li class="partc_lists_li"><div class="txt_bubble"><div><p>조금 쉬었다해도 될거같은데요 </p></div></div><dl><dt><img src=${partc_info[i].chat_img} /></dt><dd><p class="name_txt">${partc_info[i].name}</p><p class="id_txt">${partc_info[i].id_txt}</p></dd></dl></li>`;
        }
    }
    else if(preappend===false)
        preappend=true
    /*방금 참여한 사람을 part_lists에 추가하기*/  //말풍선 나중에 바꿔주기
    lists.innerHTML += `<li class="partc_lists_li"><div class="txt_bubble"><div><p>조금 쉬었다해도 될거같은데요 </p></div></div><dl><dt><img src=${data.chat_img} /></dt><dd><p class="name_txt">${data.name}</p><p class="id_txt">${data.id_txt}</p></dd></dl></li>`;
})

socket.on('list_delete', function(num) {
    const lists = document.getElementById('partc_lists');
    const lists_li = document.getElementsByClassName('partc_lists_li');
    
    list_length = lists_li.length
    console.log("나의 partc_num: ", partc_num, "나간사람의 num:",num, "list_len:",list_length)
    
    /*참여자가 나가면 해당 num의 참여자를 참여자리스트에서 제거*/
    lists_li[num].remove()

    /*나간 유저가 나보다 앞에 있으면 나의 partc_num줄이기*/
    if(num<partc_num){
        partc_num-=1
        console.log(socket.name, partc_num)
    }
    socket.emit('sync',socket.name,partc_num)//partc_num 동기화
})
socket.on('init',function(num){   //처음 접속했을때 partc_num을 받아옴
    partc_num=num
    console.log("init",socket.name,partc_num)
})

function send_msg() {
    // 입력되어있는 데이터 가져오기
    var message = document.getElementById('msg_box').value
    // 가져왔으니 데이터 빈칸으로 변경
    document.getElementById('msg_box').value = ''
  
    // 내가 전송할 메시지 클라이언트에게 표시
    const chat_inner = document.getElementById('chat_inners');
    if (is_leader = true)  //리더인경우
        chat_inner.innerHTML += `<dl><dt class="leader"><div class="chat_img"><img src=${chat_img} /></div><span>${socket.name}</span></dt><dd>${message}</dd></dl>`;
    else   //리더가 아닌경우 
        chat_inner.innerHTML += `<dl><dt><div class="chat_img"><img src=${chat_img} /></div><span>${socket.name}</span></dt><dd>${message}</dd></dl>`;
    // 서버로 message 이벤트 전달 + 데이터와 함께
    console.log(message)
    socket.emit('message', {type: 'message', message: message, leader: false, img : chat_img, id_txt : id_txt})
    
}
function join_room(name, room){
    console.log(name +  "님이 " + room + "방에 입장했습니다.")
    socket.emit('join_room',room)
}
function leave_room(name, room){
    console.log(name +  "님이 " + room + "방에서 나갔습니다.")
    socket.emit('leave_room',room)
}

function enterkey() { 
    if (window.event.keyCode == 13) {
         // 엔터키가 눌렸을 때 
         send_msg();
    } 
}