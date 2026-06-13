function parseCSV(csvText) {
  let text = csvText.replace(/^\uFEFF/, '');
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        row.push(current);
        current = '';
        if (row.length > 0 && row.some(c => c !== '')) {
          rows.push(row);
        }
        row = [];
      } else if (ch === '\n') {
        row.push(current);
        current = '';
        if (row.length > 0 && row.some(c => c !== '')) {
          rows.push(row);
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }

  row.push(current);
  if (row.length > 0 && row.some(c => c !== '')) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < rows[r].length ? rows[r][c].trim() : '';
    }
    result.push(obj);
  }
  return result;
}

function parseJSON(jsonText) {
  const items = JSON.parse(jsonText);
  if (!Array.isArray(items)) {
    throw new Error('JSON数据必须是数组');
  }
  return items;
}

function parseByFormat(format, data) {
  if (format === 'json') {
    return parseJSON(data);
  } else if (format === 'csv') {
    return parseCSV(data);
  } else {
    throw new Error('不支持的格式');
  }
}

module.exports = {
  parseCSV,
  parseJSON,
  parseByFormat
};
