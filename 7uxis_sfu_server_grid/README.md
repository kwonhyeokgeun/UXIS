5번과 기능은 동일하다.
![image](https://user-images.githubusercontent.com/49871871/121628880-14b17e80-cab5-11eb-9650-6acb1ee1e4a4.png)

5번과 마찬가지로 mysql에 대화내용을 기록하여 늦게 접속한 사람도 모든 대화내용을 볼 수 있다.
하지만 5번에서는 방마다 각자의 table을 가졌는데 table이 많아지는 것은 관리에 매우 안좋음을 알고 하나의 table로 관리하되 where 조건에 roomTime이라는 값을 이용하여 현재 방의 대화를 불러온다.
