socket.io를 이용하여 동일한 room으로 접속한 경우 해당 클라이언트간의 메시지를 실시간으로 전달할 수 있도록 만들었습니다. 클라이언트와 서버 모두 .on을 통해 이벤트에 대한 반응을 정의했고 .emit을 통해서 이벤트를 발생시키며 그에 따라 각각 미리 정의해둔 반응을 하도록 해두었습니다. 클라이언트가 메시지를 입력하면 서버로 해당 메시지와 사용자의 정보가 전달이 되고 서버는 받은 메시지와 사용자 정보를 .to(room).emit로 해당 room의 모든 클라이언트에게 전달되는 방식으로 구현하였습니다.


node app.js로 서버를 실행시키고

![image](https://user-images.githubusercontent.com/49871871/117598703-4d42fd00-b183-11eb-80a8-782bcc0665e5.png)
이렇게 alert로 이름, 학번, 룸 번호를 입력하면 해당 방에 입장이 됩니다.


![image](https://user-images.githubusercontent.com/49871871/117598869-9d21c400-b183-11eb-9c92-1b05974969f0.png)
방에 입장하면 참가자 리스트에 참여한 사람들이 뜨게되고 밑에 채팅창으로 참가자들과 채팅이 가능합니다.
사진은 임시로 모두 동일한 사진을 사용했고 배경에 영상이 나오도록 구현해야하는 과제가 남았습니다.
