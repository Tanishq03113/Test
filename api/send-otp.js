module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, otp, stage } = req.body || {};
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Missing phone or OTP parameter' });
  }

  // Format recipient number (strip non-digits, ensure 91 prefix)
  let cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  const TOKEN = process.env.META_WA_TOKEN;
  const PHONE_ID = process.env.META_WA_PHONE_ID;

  if (!TOKEN || !PHONE_ID) {
    return res.status(500).json({ 
      error: 'Environment variables META_WA_TOKEN or META_WA_PHONE_ID missing on Vercel.' 
    });
  }

  const url = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

  // Payload sending dynamic text message with the actual OTP
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: `Your Maid Attendance ${stage || 'SERVICE'} OTP is: *${otp}*`
    }
  };

  try {
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await metaRes.json();

    if (!metaRes.ok) {
      return res.status(metaRes.status).json({ error: data.error || data });
    }

    return res.status(200).json({ success: true, metaResponse: data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Fetch failed' });
  }
};