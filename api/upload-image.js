const https = require('https');
const crypto = require('crypto');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'k483yjqc';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'cpl_uploads';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file, folder } = req.body || {};
    if (!file) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const targetFolder = folder || 'cpl_uploads/documents';
    const timestamp = Math.floor(Date.now() / 1000);

    let postParams = {};

    if (CLOUDINARY_API_SECRET && CLOUDINARY_API_KEY) {
      // Signed upload
      const stringToSign = `folder=${targetFolder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      postParams = {
        file: file,
        api_key: CLOUDINARY_API_KEY,
        timestamp: timestamp,
        signature: signature,
        folder: targetFolder
      };
    } else {
      // Unsigned upload fallback using backend preset (credentials never exposed on client)
      postParams = {
        file: file,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        folder: targetFolder
      };
    }

    const postData = JSON.stringify(postParams);

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const cReq = https.request(options, (cRes) => {
      let data = '';
      cRes.on('data', (chunk) => { data += chunk; });
      cRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (cRes.statusCode >= 200 && cRes.statusCode < 300) {
            return res.status(200).json({
              secure_url: parsed.secure_url,
              public_id: parsed.public_id,
              bytes: parsed.bytes,
              format: parsed.format
            });
          } else {
            return res.status(cRes.statusCode || 500).json({
              error: parsed.error?.message || 'Cloudinary upload failed'
            });
          }
        } catch (e) {
          return res.status(500).json({ error: 'Failed parsing Cloudinary response' });
        }
      });
    });

    cReq.on('error', (err) => {
      return res.status(500).json({ error: err.message });
    });

    cReq.write(postData);
    cReq.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
