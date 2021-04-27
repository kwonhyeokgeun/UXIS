let socket = io();  //socket은 브라우저에서의 이벤트를 처리

socket.on('disconnect',()=>{
    console.log('Disconnected from server'); //이 console.log는 브라우저에서 나오는거임
});
socket.on('connect',()=>{
    console.log('Connected from server'); 
});
