const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// set port
const port = new SerialPort({
  // set your port
  path: 'COM10',  
  baudRate: 9600
});

// set parser
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// WebSocket server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

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
  const result = { channels: [] };
  const parts = data.split(', ');  
  parts.forEach(part => {
    if (part.startsWith('Timestamp')) {
      result.timestamp = parseInt(part.split(': ')[1]);
    } else {
      const channelData = part.split(': ');
      const channelIndex = parseInt(channelData[0].split(' ')[1]);
      const channelValue = parseInt(channelData[1]);
      result.channels[channelIndex] = channelValue;
    }
  });
  return result;
}

