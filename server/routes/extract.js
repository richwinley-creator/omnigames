import { Router } from 'express';

const router = Router();

// POST /api/extract — proxy image to Anthropic Vision API
router.post('/', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'API key not configured',
      message: 'Set ANTHROPIC_API_KEY in .env to enable AI meter reading extraction'
    });
  }

  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'image (base64) required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/png',
                data: image
              }
            },
            {
              type: 'text',
              text: `Extract meter reading data from this image. This is a COAM (Coin Operated Amusement Machine) meter reading screenshot.

Return a JSON object with this exact structure:
{
  "location": "location name from the image",
  "date": "YYYY-MM-DD format",
  "machines": [
    {
      "machine_name": "name of machine",
      "prev_in": 0,
      "curr_in": 0,
      "prev_out": 0,
      "curr_out": 0
    }
  ]
}

Notes:
- "In" columns = credits inserted (revenue)
- "Out" columns = credits paid out (payouts)
- "Previous" = last reading, "Current" = this reading
- Look for column headers like "Perivous In", "Previous In", "Pervious Out", etc. (may have typos)
- Machine names are in the first column
- Return ONLY the JSON, no explanation`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Anthropic API error', details: err });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(422).json({ error: 'Could not parse extraction result', raw: text });
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Extraction failed', message: err.message });
  }
});

export default router;
