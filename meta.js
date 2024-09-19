import { jsonData } from './constant.js'; // Import JSON from the JS file

function extractJsonMetadata(json) {
  const metadata = {
    totalKeys: Object.keys(json).length,
    keys: Object.keys(json),
    types: Object.keys(json).map(key => typeof json[key]),
    structure: Object.entries(json).map(([key, value]) => ({
      key,
      type: Array.isArray(value) ? 'array' : typeof value,
      valueLength: Array.isArray(value) ? value.length : (typeof value === 'object' ? Object.keys(value).length : null)
    }))
  };

  return metadata;
}

const metadata = extractJsonMetadata(jsonData);
console.log(metadata);
