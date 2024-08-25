const WebSocket = require('ws');
const fs = require('fs');

// 连接到 WebSocket 服务器
const ws = new WebSocket('ws://localhost:8080');

// 打开文件流，将数据保存到 data.txt 文件中
const fileStream = fs.createWriteStream('data.txt', { flags: 'a' });

ws.on('open', () => {
    console.log('Connected to WebSocket server');
});

ws.on('message', (data) => {
    // 将接收到的数据写入文件
    fileStream.write(data + '\n');
    console.log('Received and saved data:', data);
});

ws.on('close', () => {
    console.log('Disconnected from WebSocket server');
    fileStream.end(); // 关闭文件流
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    fileStream.end(); // 关闭文件流
});
