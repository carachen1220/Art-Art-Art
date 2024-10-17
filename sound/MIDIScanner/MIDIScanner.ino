// Rough and ready 2.4 GHz band scanner using nRF24L01+ module with 128x64 graphic OLED display
// 
// ceptimus.  November 2016.

#include "SSD1X06.h"

/* nRF24L01+ module connections
 *  
 * module   Arduino
 * 1 GND ---- GND
 * 2 VCC ---- 3.3V  Note: 5V on VCC will destroy module (but other pins are 5V tolerant)
 * 3 CE ----- D9
 * 4 CSN ---- D10
 * 5 SCK ---- D13 (SCK)
 * 6 MOSI --- D11 (MOSI)
 * 7 MISO --- D12 (MISO)
 * 8 IRQ ---- not connected
 */

// the nRF24L01+ can tune to 128 channels with 1 MHz spacing from 2.400 GHz to 2.527 GHz.
#define CHANNELS 128

// SPI definitions and macros
#define CE_pin    9
#define CS_pin   10
#define MOSI_pin 11
#define MISO_pin 12
#define SCK_pin  13

#define  CE_on    PORTB |= 0x02
#define  CE_off   PORTB &= 0xFD
#define  CS_on    PORTB |= 0x04
#define  CS_off   PORTB &= 0xFB
#define  MOSI_on  PORTB |= 0x08
#define  MOSI_off PORTB &= 0xF7
#define  MISO_on  (PINB & 0x10)  // input
#define  SCK_on   PORTB |= 0x20
#define  SCK_off  PORTB &= 0xDF



// define the MIDI pins used
#define VS1053_RX  2 // This is the pin that connects to the RX pin on VS1053

#define VS1053_RESET 9 // This is the pin that connects to the RESET pin on VS1053
// If you have the Music Maker shield, you don't need to connect the RESET pin!

// If you're using the VS1053 breakout:
// Don't forget to connect the GPIO #0 to GROUND and GPIO #1 pin to 3.3V
// If you're using the Music Maker shield:
// Don't forget to connect the GPIO #1 pin to 3.3V and the RX pin to digital #2

// See http://www.vlsi.fi/fileadmin/datasheets/vs1053.pdf Pg 31
#define VS1053_BANK_DEFAULT 0x00
#define VS1053_BANK_DRUMS1 0x78
#define VS1053_BANK_DRUMS2 0x7F
#define VS1053_BANK_MELODY 0x79

// See http://www.vlsi.fi/fileadmin/datasheets/vs1053.pdf Pg 32 for more!
#define VS1053_GM1_OCARINA 80

#define MIDI_NOTE_ON  0x90
#define MIDI_NOTE_OFF 0x80
#define MIDI_CHAN_MSG 0xB0
#define MIDI_CHAN_BANK 0x00
#define MIDI_CHAN_VOLUME 0x07
#define MIDI_CHAN_PROGRAM 0xC0

#if defined(__AVR_ATmega328__) || defined(__AVR_ATmega328P__)
  #include <SoftwareSerial.h>
  SoftwareSerial VS1053_MIDI(0, 2); // TX only, do not use the 'rx' side
#else
  // on a Mega/Leonardo you may have to change the pin to one that 
  // software serial support uses OR use a hardware serial port!
  #define VS1053_MIDI Serial1
#endif




// nRF24 Register map
enum {
    NRF24L01_00_CONFIG      = 0x00,
    NRF24L01_01_EN_AA       = 0x01,
    NRF24L01_02_EN_RXADDR   = 0x02,
    NRF24L01_03_SETUP_AW    = 0x03,
    NRF24L01_04_SETUP_RETR  = 0x04,
    NRF24L01_05_RF_CH       = 0x05,
    NRF24L01_06_RF_SETUP    = 0x06,
    NRF24L01_07_STATUS      = 0x07,
    NRF24L01_08_OBSERVE_TX  = 0x08,
    NRF24L01_09_CD          = 0x09,
    NRF24L01_0A_RX_ADDR_P0  = 0x0A,
    NRF24L01_0B_RX_ADDR_P1  = 0x0B,
    NRF24L01_0C_RX_ADDR_P2  = 0x0C,
    NRF24L01_0D_RX_ADDR_P3  = 0x0D,
    NRF24L01_0E_RX_ADDR_P4  = 0x0E,
    NRF24L01_0F_RX_ADDR_P5  = 0x0F,
    NRF24L01_10_TX_ADDR     = 0x10,
    NRF24L01_11_RX_PW_P0    = 0x11,
    NRF24L01_12_RX_PW_P1    = 0x12,
    NRF24L01_13_RX_PW_P2    = 0x13,
    NRF24L01_14_RX_PW_P3    = 0x14,
    NRF24L01_15_RX_PW_P4    = 0x15,
    NRF24L01_16_RX_PW_P5    = 0x16,
    NRF24L01_17_FIFO_STATUS = 0x17,
    NRF24L01_1C_DYNPD       = 0x1C,
    NRF24L01_1D_FEATURE     = 0x1D,
    //Instructions
    NRF24L01_61_RX_PAYLOAD  = 0x61,
    NRF24L01_A0_TX_PAYLOAD  = 0xA0,
    NRF24L01_E1_FLUSH_TX    = 0xE1,
    NRF24L01_E2_FLUSH_RX    = 0xE2,
    NRF24L01_E3_REUSE_TX_PL = 0xE3,
    NRF24L01_50_ACTIVATE    = 0x50,
    NRF24L01_60_R_RX_PL_WID = 0x60,
    NRF24L01_B0_TX_PYLD_NOACK = 0xB0,
    NRF24L01_FF_NOP         = 0xFF,
    NRF24L01_A8_W_ACK_PAYLOAD0 = 0xA8,
    NRF24L01_A8_W_ACK_PAYLOAD1 = 0xA9,
    NRF24L01_A8_W_ACK_PAYLOAD2 = 0xAA,
    NRF24L01_A8_W_ACK_PAYLOAD3 = 0xAB,
    NRF24L01_A8_W_ACK_PAYLOAD4 = 0xAC,
    NRF24L01_A8_W_ACK_PAYLOAD5 = 0xAD,
};

// Bit mnemonics
enum {
    NRF24L01_00_MASK_RX_DR  = 6,
    NRF24L01_00_MASK_TX_DS  = 5,
    NRF24L01_00_MASK_MAX_RT = 4,
    NRF24L01_00_EN_CRC      = 3,
    NRF24L01_00_CRCO        = 2,
    NRF24L01_00_PWR_UP      = 1,
    NRF24L01_00_PRIM_RX     = 0,

    NRF24L01_07_RX_DR       = 6,
    NRF24L01_07_TX_DS       = 5,
    NRF24L01_07_MAX_RT      = 4,

    NRF2401_1D_EN_DYN_ACK   = 0,
    NRF2401_1D_EN_ACK_PAY   = 1,
    NRF2401_1D_EN_DPL       = 2,
};

enum TXRX_State {
    TXRX_OFF,
    TX_EN,
    RX_EN,
};

uint16_t signalStrength[CHANNELS]; // smooths signal strength with numerical range 0 - 0x7FFF

void setup() {
  SSD1X06::start();
  delay(300);
  SSD1X06::fillDisplay(' ');
  SSD1X06::displayString6x8(1, 4, F("2.4 GHz band scanner"), 0);
  SSD1X06::displayString6x8(4, 4, F("By ceptimus. Nov '16"), 0);
  // prepare 'bit banging' SPI interface
  pinMode(MOSI_pin, OUTPUT);
  pinMode(SCK_pin, OUTPUT);
  pinMode(CS_pin, OUTPUT);
  pinMode(CE_pin, OUTPUT);
  pinMode(MISO_pin, INPUT);
  CS_on;
  CE_on;
  MOSI_on;
  SCK_on;
  delay(70);
  CS_off;
  CE_off;
  MOSI_off;
  SCK_off;
  delay(100);
  CS_on;
  delay(10);
      
  NRF24L01_Reset();
  delay(150);

  NRF24L01_WriteReg(NRF24L01_01_EN_AA, 0x00); // switch off Shockburst mode
  NRF24L01_WriteReg(NRF24L01_06_RF_SETUP, 0x0F); // write default value to setup register
  NRF24L01_SetTxRxMode(RX_EN); // switch to receive mode
  Serial.begin(9600); // debugging without lcd display

  // MIDI uses a 'strange baud rate'
  VS1053_MIDI.begin(31250);

  pinMode(VS1053_RESET, OUTPUT);
  digitalWrite(VS1053_RESET, LOW);
  delay(10);
  digitalWrite(VS1053_RESET, HIGH);
  delay(10);
  
  midiSetChannelBank(0, VS1053_BANK_MELODY);
  midiSetInstrument(0, VS1053_GM1_OCARINA);
  midiSetChannelVolume(0, 127);


  
  for (int x = 0; x < 128; x++) {
    uint8_t b = 0x01;  // baseline
    if (!(x % 10)) {
      b |= 0x06; // graduation tick every 10 MHz
    }
    if (x == 10 || x == 60 || x == 110) {
      b |= 0xF8; // scale markers at 2.41, 2.46, and 2.51 GHz 
    }
    SSD1X06::displayByte(6, x, b);
  }
  SSD1X06::displayString6x8(7, 0, F("2.41"), 0);
  SSD1X06::displayString6x8(7, 50, F("2.46"), 0);
  SSD1X06::displayString6x8(7, 100, F("2.51"), 0);
  delay(500); // start up message
}

uint8_t refresh;
int previousNote[CHANNELS];  
int previousVelocity[CHANNELS];

void loop() {

      unsigned long timestamp = millis();
    // Serial.print("Timestamp: ");
    // Serial.print(timestamp);
  for (uint8_t MHz = 0; MHz < CHANNELS; MHz++ ) { \


    
    
    
    
     // tune to frequency (2400 + MHz) so this loop covers 2.400 - 2.527 GHz (maximum range module can handle) when channels is set to 128.
    NRF24L01_WriteReg(NRF24L01_05_RF_CH, MHz);
    CE_on; // start receiving
    delayMicroseconds(random(130, 230)); // allow receiver time to tune and start receiving 130 uS seems to be the minimum time.  Random additional delay helps prevent strobing effects with frequency-hopping transmitters.
    CE_off; // stop receiving - one bit is now set if received power was > -64 dBm at that instant
    if (NRF24L01_ReadReg(NRF24L01_09_CD)) { // signal detected so increase signalStrength unless already maxed out
      // Serial.print("Signal detected at ");
      // Serial.print(2400 + MHz);
      // Serial.println(" MHz");
      signalStrength[MHz] += (0x7FFF - signalStrength[MHz]) >> 5; // increase rapidly when previous value was low, with increase reducing exponentially as value approaches maximum
    } else { // no signal detected so reduce signalStrength unless already at minimum
      signalStrength[MHz] -= signalStrength[MHz] >> 5; // decrease rapidly when previous value was high, with decrease reducing exponentially as value approaches zero
    }
    // Serial.print((signalStrength[MHz] + 0x0100) >> 9, HEX); // debugging without lcd display
    // Serial.print(" "); // debugging without lcd display

    // Serial.print(", Channel ");
    // Serial.print(MHz);
    // Serial.print(": ");
    // Serial.print(signalStrength[MHz]);


    if (!--refresh) { // don't refresh whole display every scan (too slow)
      refresh = 19; // speed up by only refreshing every n-th frequency loop - reset number should be relatively prime to CHANNELS
      int strength = (signalStrength[MHz] + 0x0040) >> 7;
      if (strength > 48) {
        strength = 48; // limit to maximum height that fits display
      }
      
      for (uint8_t row = 0; row < 6; row++) { // loop down 6 rows of display (6 x 8 pixels)
        uint8_t b = 0x00;
        if (strength > (6 - row) << 3) { // all 8 pixels on this row of display to be set
          b = 0xFF;  
        } else if (strength > (5 - row) << 3) { // some pixels on this row to be set
          b = 0xFF << (((6 - row) << 3) - strength);
        }
        SSD1X06::displayByte(row, MHz, b);
      }
    }


     int maxSignal = 0;
     for (uint8_t MHz = 0; MHz < CHANNELS; MHz++) {
      if (signalStrength[MHz] > maxSignal) {
       maxSignal = signalStrength[MHz];
      }
    }

    // the maximum value that can show on the oled board is (48px*128-0x0040(64)=6080)
    // midiNoteOn(0,MHz,signalStrength[MHz]*128/6080);
    // midiNoteOn(0,MHz,signalStrength[MHz]*127/maxSignal);
    // midiSetChannelVolume(MHz, 95+0.25*signalStrength[MHz]*127/maxSignal);
    midiSetChannelVolume(MHz, 127);
    // midiSetChannelVolume(MHz, signalStrength[MHz]*127/maxSignal);
    // delay(2000);
    // midiNoteOff(0, MHz, signalStrength[MHz]%128);

    // int velocity = signalStrength[MHz] * 128 / 6080;

    // 3008 is the edge of blue and yellow

    int velocity;
    if (signalStrength[MHz] > 3008) {
            velocity = 128;  // over 3008 use max velocity
        } else {
            velocity = signalStrength[MHz] * 128 / 3008;  // scale 
        }

   if (previousVelocity[MHz] != velocity) {
           
            midiNoteOnGradual(0, MHz, previousVelocity[MHz], velocity);

          
            previousVelocity[MHz] = velocity;
        }

  }
  // Serial.print("\n"); // debugging without lcd display



}

uint8_t _spi_write(uint8_t command)
{
    uint8_t result=0;
    uint8_t n=8;
    SCK_off;
    MOSI_off;
    while(n--) {
        if(command & 0x80)
            MOSI_on;
        else
            MOSI_off;
        if(MISO_on)
            result |= 0x01;
        SCK_on;
        _NOP();
        SCK_off;
        command = command << 1;
        result = result << 1;
    }
    MOSI_on;
    return result;
}

void _spi_write_address(uint8_t address, uint8_t data)
{
    CS_off;
    _spi_write(address);
    _NOP();
    _spi_write(data);
    CS_on;
}

uint8_t _spi_read()
{
    uint8_t result=0;
    uint8_t i;
    MOSI_off;
    _NOP();
    for(i = 0; i < 8; i++) {
        if(MISO_on) // if MISO is HIGH
            result = (result << 1) | 0x01;
        else
            result = result << 1;
        SCK_on;
        _NOP();
        SCK_off;
        _NOP();
    }
    return result;
}

uint8_t _spi_read_address(uint8_t address)
{
    uint8_t result;
    CS_off;
    _spi_write(address);
    result = _spi_read();
    CS_on;
    return(result);
}

/* Instruction Mnemonics */
#define R_REGISTER    0x00
#define W_REGISTER    0x20
#define REGISTER_MASK 0x1F
#define ACTIVATE      0x50
#define R_RX_PL_WID   0x60
#define R_RX_PAYLOAD  0x61
#define W_TX_PAYLOAD  0xA0
#define W_ACK_PAYLOAD 0xA8
#define FLUSH_TX      0xE1
#define FLUSH_RX      0xE2
#define REUSE_TX_PL   0xE3
#define NOP           0xFF

uint8_t NRF24L01_WriteReg(uint8_t address, uint8_t data)
{
    CS_off;
    _spi_write_address(address | W_REGISTER, data);
    CS_on;
    return 1;
}

uint8_t NRF24L01_FlushTx()
{
    return Strobe(FLUSH_TX);
}

uint8_t NRF24L01_FlushRx()
{
    return Strobe(FLUSH_RX);
}

static uint8_t Strobe(uint8_t state)
{
    uint8_t result;
    CS_off;
    result = _spi_write(state);
    CS_on;
    return result;
}

uint8_t NRF24L01_ReadReg(uint8_t reg)
{
    CS_off;
    uint8_t data = _spi_read_address(reg);
    CS_on;
    return data;
}

void NRF24L01_SetTxRxMode(uint8_t mode)
{
    if(mode == TX_EN) {
        CE_off;
        NRF24L01_WriteReg(NRF24L01_07_STATUS, 
                    (1 << NRF24L01_07_RX_DR)    // reset the flag(s)
                  | (1 << NRF24L01_07_TX_DS)
                  | (1 << NRF24L01_07_MAX_RT));
        NRF24L01_WriteReg(NRF24L01_00_CONFIG, 
                    (1 << NRF24L01_00_EN_CRC)   // switch to TX mode
                  | (1 << NRF24L01_00_CRCO)
                  | (1 << NRF24L01_00_PWR_UP));
        delayMicroseconds(130);
        CE_on;
    } else if (mode == RX_EN) {
        CE_off;
        NRF24L01_WriteReg(NRF24L01_07_STATUS, 0x70);        // reset the flag(s)
        NRF24L01_WriteReg(NRF24L01_00_CONFIG, 0x0F);        // switch to RX mode
        NRF24L01_WriteReg(NRF24L01_07_STATUS,
                    (1 << NRF24L01_07_RX_DR)    //reset the flag(s)
                  | (1 << NRF24L01_07_TX_DS)
                  | (1 << NRF24L01_07_MAX_RT));
        NRF24L01_WriteReg(NRF24L01_00_CONFIG,
                    (1 << NRF24L01_00_EN_CRC)   // switch to RX mode
                  | (1 << NRF24L01_00_CRCO)
                  | (1 << NRF24L01_00_PWR_UP)
                  | (1 << NRF24L01_00_PRIM_RX));
        delayMicroseconds(130);
        CE_on;
    } else {
        NRF24L01_WriteReg(NRF24L01_00_CONFIG, (1 << NRF24L01_00_EN_CRC)); // PowerDown
        CE_off;
    }
}

uint8_t NRF24L01_Reset()
{
    NRF24L01_FlushTx();
    NRF24L01_FlushRx();
    uint8_t status1 = Strobe(0xFF); // NOP
    uint8_t status2 = NRF24L01_ReadReg(0x07);
    NRF24L01_SetTxRxMode(TXRX_OFF);
    return (status1 == status2 && (status1 & 0x0f) == 0x0e);
}




// MIDI helper method
void midiSetInstrument(uint8_t chan, uint8_t inst) {
  if (chan > 15) return;
  inst --; // page 32 has instruments starting with 1 not 0 :(
  if (inst > 127) return;
  
  VS1053_MIDI.write(MIDI_CHAN_PROGRAM | chan);  
  VS1053_MIDI.write(inst);
}


void midiSetChannelVolume(uint8_t chan, uint8_t vol) {
  if (chan > 15) return;
  if (vol > 127) return;
  
  VS1053_MIDI.write(MIDI_CHAN_MSG | chan);
  VS1053_MIDI.write(MIDI_CHAN_VOLUME);
  VS1053_MIDI.write(vol);
}

void midiSetChannelBank(uint8_t chan, uint8_t bank) {
  if (chan > 15) return;
  if (bank > 127) return;
  
  VS1053_MIDI.write(MIDI_CHAN_MSG | chan);
  VS1053_MIDI.write((uint8_t)MIDI_CHAN_BANK);
  VS1053_MIDI.write(bank);
}

void midiNoteOn(uint8_t chan, uint8_t n, uint8_t vel) {
  if (chan > 15) return;
  if (n > 127) return;
  if (vel > 127) return;
  
  VS1053_MIDI.write(MIDI_NOTE_ON | chan);
  VS1053_MIDI.write(n);
  VS1053_MIDI.write(vel);
}

void midiNoteOnGradual(uint8_t chan, uint8_t n, uint8_t currentVel, uint8_t targetVel) {
    if (chan > 15) return;
    if (n > 127) return;
    if (targetVel > 127) return;

      if (currentVel < targetVel) {
        while (currentVel < targetVel) {
            midiNoteOn(chan, n, currentVel); 
            currentVel++; 
            delay(5); 
        }
    }

    else if (currentVel > targetVel) {
        while (currentVel > targetVel) {
            midiNoteOn(chan, n, currentVel); 
            currentVel--;  
            delay(5); 
        }
    }
}

void midiNoteOff(uint8_t chan, uint8_t n, uint8_t vel) {
  if (chan > 15) return;
  if (n > 127) return;
  if (vel > 127) return;
  
  VS1053_MIDI.write(MIDI_NOTE_OFF | chan);
  VS1053_MIDI.write(n);
  VS1053_MIDI.write(vel);
}

void midiAllNotesOff(uint8_t chan) {
  if (chan > 15) return; // MIDI channels range from 0 to 15
  
  VS1053_MIDI.write(MIDI_CHAN_MSG | chan);  // Send control change message on the specified channel
  VS1053_MIDI.write(0x7B);  // 0x7B is the "All Notes Off" controller code
  VS1053_MIDI.write((uint8_t)0);     // The value for this controller (usually 0)
}