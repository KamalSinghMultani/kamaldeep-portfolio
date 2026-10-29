// Use the real geometry, transforms, joints and animation in Node, without a
// browser image decoder. Only material/texture references are removed IN MEMORY.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

exports.loadGeometry = async function loadGeometry(filename) {
  const { GLTFLoader } = await import(pathToFileURL(path.resolve('site/vendor/GLTFLoader.js')).href);
  const bytes = fs.readFileSync(filename);
  const originalJSONLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + originalJSONLength));
  delete json.images; delete json.textures; delete json.samplers;
  delete json.extensions; delete json.extensionsRequired; delete json.extensionsUsed;
  json.materials = (json.materials || []).map(material => ({ name: material.name, doubleSided: material.doubleSided }));
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(padded);
  const binaryChunk = bytes.subarray(20 + originalJSONLength);
  const result = Buffer.alloc(20 + padded.length + binaryChunk.length);
  result.write('glTF'); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded.length, 12); result.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(result, 20); binaryChunk.copy(result, 20 + padded.length);
  return new Promise((resolve, reject) => new GLTFLoader().parse(result.buffer, '', resolve, reject));
};
