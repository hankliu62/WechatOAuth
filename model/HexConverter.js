'use strict';
class HexConverter {
  static encode (string, base = 16) {
    if (!string) {
      return ''
    }

    if (typeof string === 'string') {
      const hexs = string.split('').map((charAt, index) => string.charCodeAt(index).toString(base))
      return hexs.join('')
    }
  }

  static decode (hexStr, base = 16) {
     function splitByCount (string, count = 2) {
      const splitRegStr = '.{' + count + '}';
      const splitReg = new RegExp(splitRegStr, 'g');

      const array = string.match(splitReg) || [];
      if (array.join('').length !== string.length) {
        array.push(string.substring(array.join('').length));
      }
      return array
    }

    const hexs = splitByCount(hexStr);
    const chars = hexs.map(hex => String.fromCharCode(parseInt(hex, base)))
    return chars.join('')
  }
}

module.exports = HexConverter;
