const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const dgram = require('dgram');
const udpClient = dgram.createSocket('udp4');

// Set ESP32 IP address and UDP port
const ESP32_IP = '192.168.4.1';  //to be determined
const ESP32_PORT = 4210;  // should be the same as the receiver(ESP-32)

// set port for arduino
const port = new SerialPort({
  // set your port
  path: 'COM10',  
  baudRate: 9600
});

// set parser
const arduinoParser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Set up the serial port for VS1053
const vs1053Port = new SerialPort({
  path: 'COM5',  // Set the appropriate port for VS1053
  baudRate: 31250 // MIDI uses 31250 baud rate
});

// WebSocket server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

arduinoParser.on('data', (data) => {
  const parsedData = parseArduinoData(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(parsedData));    }
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

