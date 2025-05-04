const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 사용자 인증을 위한 JSON 파일 로드
let userCredentials;

fs.readFile('userCredentials.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading user credentials:', err);
        return;
    }
    userCredentials = JSON.parse(data);
});

// 대기자 명단과 완료 명단 초기화
let queue = [];
let completed = [];

// 사용자 등록 및 확인
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 사용자 ID 등록
    socket.on('register_user', (userId) => {
        console.log(`User registered: ${userId}`);
        socket.userId = userId;  // 연결된 소켓에 사용자 ID 추가
    });

    // 학생 인증 및 비밀번호 확인
    socket.on('confirm_student', ({ name, userId, password }) => {
        const user = userCredentials.users.find(user => user.id === userId && user.password === password);
        if (user) {
            // 비밀번호가 맞는 경우
            socket.emit('student_confirmed', { name, email: user.email });
        } else {
            // 비밀번호가 틀리거나 사용자가 존재하지 않는 경우
            socket.emit('error', '비밀번호가 틀리거나 사용자가 존재하지 않습니다.');
        }
    });

    // 손들기 이벤트 처리
    socket.on('raise_hand', (studentName) => {
        queue.push({ id: socket.id, name: studentName });
        io.emit('update_queue', queue);
    });

    // 학생 확인 및 대기자 명단 업데이트
    socket.on('confirm_student_queue', (studentName) => {
        const index = queue.findIndex(student => student.name === studentName);
        if (index !== -1) {
            const removedStudent = queue.splice(index, 1)[0]; // 학생 제거
            completed.push(removedStudent.name); // 완료 명단에 추가
            io.emit('update_queue', queue); // 대기자 명단 업데이트
            io.emit('remove_student', removedStudent.name); // 클라이언트에 제거된 이름 전송
        }
    });

    // 연결 종료 시 대기자 명단에서 사용자 제거
    socket.on('disconnect', () => {
        queue = queue.filter(user => user.id !== socket.id);
        io.emit('update_queue', queue);
    });
});

// 루트 경로에 대한 요청 처리
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// 교사 페이지 요청 처리
app.get('/teacher', (req, res) => {
    res.sendFile(__dirname + '/public/teacher.html');
});



// 서버 리스닝
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});