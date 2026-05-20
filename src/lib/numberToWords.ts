export function numberToWordsVN(total: number): string {
  if (total === 0) return 'Không đồng';
  if (total < 0) return 'Số tiền âm';

  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, isLast: boolean): string {
    let res = '';
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;

    if (hundreds > 0 || !isLast) {
      res += digits[hundreds] + ' trăm ';
    }

    if (tens > 0) {
      if (tens === 1) res += 'mười ';
      else res += digits[tens] + ' mươi ';
    } else if (hundreds > 0 && ones > 0) {
      res += 'lẻ ';
    }

    if (ones > 0) {
      if (tens > 1 && ones === 1) res += 'mốt ';
      else if (tens > 0 && ones === 5) res += 'lăm ';
      else if (tens === 0 && ones === 5 && hundreds > 0) res += 'lăm ';
      else res += digits[ones];
    }

    return res.trim();
  }

  let str = '';
  let i = 0;
  let remaining = total;

  while (remaining > 0) {
    const part = remaining % 1000;
    if (part > 0) {
      const partStr = readThreeDigits(part, remaining < 1000);
      str = partStr + units[i] + (str ? ' ' + str : '');
    }
    remaining = Math.floor(remaining / 1000);
    i++;
  }

  const result = str.trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
}
