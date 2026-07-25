const { generateSecret, verifySync, generateURI } = require('otplib');
const QRCode = require('qrcode');

function createSecret() {
  return generateSecret();
}

function verifyToken(secret, token) {
  if (!secret || !token) return false;
  const code = String(token).replace(/\s/g, '');
  const result = verifySync({ secret, token: code, epochTolerance: 1 });
  if (typeof result === 'boolean') return result;
  return result?.valid === true;
}

function keyUri(email, secret, issuer = 'BuildPlan AI') {
  return generateURI({
    issuer,
    label: email,
    secret,
  });
}

async function qrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 });
}

module.exports = { generateSecret: createSecret, verifyToken, keyUri, qrDataUrl };
