const WebSocket = require('ws');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const wss = new WebSocket.Server({ port: 8080 });

const port = new SerialPort('COM3', { // Change 'COM3' to your actual COM port
  baudRate: 115200
});

const parser = port.pipe(new Readline({ delimiter: '\n' }));

parser.on('data', (data) => {
  const parsedData = parseArduinoData(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(parsedData));
    }
  });
});

wss.on('connection', (ws) => {
  console.log('Client connected');
});

console.log('WebSocket server is running on ws://localhost:8080');


function parseArduinoData(data) {
  const result = {};

  // 解析时间戳
  const timestampMatch = data.match(/Timestamp: (\d+)/);
  if (timestampMatch) {
    result.timestamp = parseInt(timestampMatch[1]);
  }

  // 解析信道数据
  result.channels = [];
  const channelMatches = data.match(/Channel \d+: \d+/g);
  if (channelMatches) {
    channelMatches.forEach(channelData => {
      const [channel, strength] = channelData.split(': ').map(Number);
      result.channels.push(strength);
    });
  }

  return result;
}
