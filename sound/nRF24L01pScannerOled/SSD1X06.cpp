#include "SSD1X06.h"
#include <Wire.h>

void cmd(uint8_t c) {
  Wire.beginTransmission(SSD1X06_I2C_ADDRESS);
  Wire.write(0);
  Wire.write(c);
  Wire.endTransmission();
}

void SSD1X06::fillDisplay(uint8_t c) {
  for (uint8_t row = 0; row < SSD1X06_CHARHEIGHT; row++) {
    for (uint8_t x = 0; x < SSD1X06_LCDWIDTH; x += 6) {
      displayChar6x8(row, x, c);
    }
  }
}

void SSD1X06::start(void) {
  Wire.begin();
  Wire.setClock(400000L);

#ifdef SSD1306
  cmd(SSD1X06_SETMULTIPLEX); cmd(0x3F);
  cmd(SSD1X06_SETDISPLAYOFFSET); cmd(0x00);
  cmd(SSD1X06_SETSTARTLINE);
  cmd(SSD1X06_SEGREMAP | 0x01);
  cmd(SSD1X06_COMSCANDEC);
  cmd(SSD1X06_SETCOMPINS); cmd(0x12);
  cmd(SSD1X06_SETCONTRAST); cmd(0xFF);
  cmd(SSD1X06_DISPLAYALLON_RESUME);
  cmd(SSD1X06_NORMALDISPLAY);
  cmd(SSD1X06_SETDISPLAYCLOCKDIV); cmd(0x80);
  cmd(SSD1X06_CHARGEPUMP); cmd(0x14);
  cmd(SSD1X06_SETPRECHARGE); cmd(0x22);
  cmd(SSD1X06_MEMORYMODE); cmd(0x01);
  cmd(SSD1X06_SETVCOMDETECT); cmd(0x20);
  cmd(SSD1X06_DISPLAYON);
#endif

#ifdef SSD1106
  cmd(0xAE);

  cmd(0x02);
  cmd(0x10);

  cmd(0x40);

  cmd(0xB0);

  cmd(0x81);
  cmd(0x80);

  cmd(0xA1);

  cmd(0xA6);

  cmd(0xA8);
  cmd(0x3F);

  cmd(0xad);
  cmd(0x8b);

  cmd(0x30);

  cmd(0xC8);

  cmd(0xD3);
  cmd(0x00);

  cmd(0xD5);
  cmd(0x80);

  cmd(0xD9);
  cmd(0x1f);

  cmd(0xDA);
  cmd(0x12);

  cmd(0xdb);
  cmd(0x40);

  cmd(0xAF);
#endif
}

void SSD1X06::displayString6x8(uint8_t row, uint8_t x, const char *s, uint8_t rvsField) {
  if (row > SSD1X06_CHARHEIGHT - 1) {
    row = SSD1X06_CHARHEIGHT - 1;
  }
  if (rvsField) { rvsField = 0x80; }
  
  while (uint8_t c = *s++) {
    displayChar6x8(row, x, c ^ rvsField);
    x += 6;
  }
}

void SSD1X06::displayString6x8(uint8_t row, uint8_t x, const __FlashStringHelper *s, uint8_t rvsField) {
  if (rvsField) { rvsField = 0x80; }
  uint8_t PROGMEM *p = (uint8_t PROGMEM *)s;
  while (uint8_t c = pgm_read_byte_near(p++)) {
    displayChar6x8(row, x, c ^ rvsField);
    x += 6;
  }
}

void SSD1X06::displayByte(uint8_t row, uint8_t x, uint8_t b) {
#ifdef SSD1306
  cmd(SSD1X06_PAGEADDR);
  cmd(row);
  cmd(row);
  cmd(SSD1X06_COLUMNADDR);
  cmd(x);
  cmd(x < SSD1X06_LCDWIDTH - 6 ? x + 5 : SSD1X06_LCDWIDTH - 1);
#endif

#ifdef SSD1106
  cmd(0xB0 + row);
  x += 2;
  cmd(x & 0x0F);
  cmd(((x >> 4) & 0x0F) | 0x10);
#endif

  Wire.beginTransmission(SSD1X06_I2C_ADDRESS);
  Wire.write(0x40);
  Wire.write(b);
  Wire.endTransmission();
}

void SSD1X06::displayChar6x8(uint8_t row, uint8_t x, uint8_t c) {
  uint8_t xorMask = c & 0x80 ? 0xFF : 0x00;

#ifdef SSD1306
  cmd(SSD1X06_PAGEADDR);
  cmd(row);
  cmd(row);
  cmd(SSD1X06_COLUMNADDR);
  cmd(x);
  cmd(x < SSD1X06_LCDWIDTH - 6 ? x + 5 : SSD1X06_LCDWIDTH - 1);
#endif

#ifdef SSD1106
  cmd(0xB0 + row);
  x += 2;
  cmd(x & 0x0F);
  cmd(((x >> 4) & 0x0F) | 0x10);
#endif

  Wire.beginTransmission(SSD1X06_I2C_ADDRESS);
  Wire.write(0x40);
  Wire.write(xorMask);
 
  uint16_t p = ((c & 0x7F) - 32) * 5;
  for (uint16_t i = 2; i < 7; i++ ) {
    Wire.write(pgm_read_byte_near(font + p++) ^ xorMask);
  }
  Wire.endTransmission();
}
