const WebSocket = require('ws');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const wss = new WebSocket.Server({ port: 8080 });

const port = new SerialPort('COM3', { // Change 'COM3' to your actual COM port
  baudRate: 115200
});

const parser = port.pipe(new Readline({ delimiter: '\n' }));

parser.on('data', (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
});

wss.on('connection', (ws) => {
  console.log('Client connected');
});

console.log('WebSocket server is running on ws://localhost:8080');
