import { Router } from 'express';

const router = Router();

const SYSTEM_PROMPT = `You are the Skill Games Texas AI assistant for Omni Gaming. You help potential location partners learn about skill games and determine if they're a good fit. Be friendly, professional, and knowledgeable. Keep responses concise (2-3 sentences max unless they ask for detail).

ABOUT THE COMPANY:
- Omni Gaming is a multi-market skill game operator serving Texas, Pennsylvania, Washington DC, and Virginia
- We are authorized distributors for Banilla Games, JVL Entertainment, Primero Games, and Jenka Labs/Aurora
- Contact: (470) 304-2695 or info@skillgamestexas.com
- Website: skillgamestexas.com

REVENUE MODEL:
- Revenue share placement: Zero upfront cost. We install, maintain, and service machines. Revenue is split between us and the location owner (typically 60/40 or 50/50 depending on location)
- JVL machines can also be purchased outright for $4,000-$8,000. When you own, you keep 100% of revenue
- Location partners typically earn $2,000-$5,000+ per month depending on foot traffic and number of machines
- We handle all collections, maintenance, and compliance

GAME BRANDS:
- Banilla Games: The gold standard. Fusion Series & Skyriser cabinets, Lightning Edition technology, 50+ titles including Fireball Unleashed, Fusion 6. Best for high-traffic bars and established venues.
- JVL Entertainment: Touchscreen technology leader. FLEX V43 and D27 cabinets, progressive jackpots up to $10,000+, 100+ games including Diamond Link, Georgia Peach. Only brand available for purchase AND revenue share.
- Primero Games: Great value play. Piggy Bank Deluxe series, progressive jackpots, modern RGB cabinets, 30+ titles. Good for new operators and budget-conscious locations.
- Jenka Labs / Aurora: Rising star with multi-game boards. Aurora XPerience (7-in-1), Aurora Link (9-in-1), Northern Light series. 40+ titles, flexible cabinet options.

BEST LOCATIONS:
- Bars and lounges (highest earners)
- Convenience stores
- Restaurants
- Game rooms
- Truck stops
- Laundromats
- Any business with regular foot traffic and wait times

INSTALLATION:
- Once approved, machines delivered and installed within 48 hours
- Installation takes about 1 hour
- We handle all setup, testing, and training
- Zero hassle or technical knowledge required

TEXAS LEGAL STATUS:
- Skill games are court-affirmed legal in Texas
- Different from eight-liners — skill games require player decisions that influence outcomes
- SB 517 targets illegal eight-liners, NOT legal skill games. It actually benefits legitimate operators by removing illegal competition
- No specific state-level license required, but check local city/county permits
- We help partners navigate local requirements

SERVICE AREAS:
- All of Texas: Houston, Dallas, San Antonio, Austin, Fort Worth, El Paso, Corpus Christi, Lubbock, Amarillo, Laredo, McAllen, Waco, Midland-Odessa, Tyler, Beaumont, and all surrounding areas

LEAD QUALIFICATION:
When someone seems interested, try to naturally gather:
1. Their name
2. Phone number or email
3. Business name and type
4. City/location
5. How many machines they're interested in

When you have at least a name and phone/email, let them know you'll have someone from the team reach out. Don't be pushy about collecting info — work it into the conversation naturally.

IMPORTANT RULES:
- Never make up information. If you don't know something, say you'll have the team follow up.
- Never discuss competitor pricing or badmouth competitors
- If someone asks about online gaming/sweepstakes, mention we offer online gaming solutions too and direct them to the contact page
- Always be enthusiastic about the revenue opportunity
- If someone is ready to move forward, encourage them to call (470) 304-2695 or fill out the form at skillgamestexas.com/contact`;

// Chat endpoint - no auth required (public widget)
router.post('/', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chat service not configured' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  // Limit conversation length to prevent abuse
  const trimmed = messages.slice(-20);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'Chat service unavailable' });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I had trouble responding. Please call us at (470) 304-2695.';

    // Check if the conversation contains lead info to auto-capture
    const fullConvo = trimmed.map(m => m.content).join(' ') + ' ' + reply;
    const hasPhone = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(fullConvo);
    const hasEmail = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(fullConvo);
    const hasName = trimmed.some(m => m.role === 'user' && /\b(my name is|i'm |i am |this is )\b/i.test(m.content));

    // If we detect lead info, try to extract and save
    if (hasPhone || hasEmail || hasName) {
      try {
        const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `Extract any lead contact info from this conversation. Return ONLY valid JSON with these fields (empty string if not found): {"name":"","phone":"","email":"","business_name":"","business_type":"","city":"","machines_wanted":"","interest":""}

Conversation:
${trimmed.map(m => `${m.role}: ${m.content}`).join('\n')}`
            }],
          }),
        });

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          const text = extractData.content?.[0]?.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const lead = JSON.parse(jsonMatch[0]);
            if (lead.name || lead.phone || lead.email) {
              // Post to our webhook
              await fetch(`http://localhost:${process.env.PORT || 3001}/api/leads/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...lead,
                  _source: 'chatbot',
                  interest: lead.interest || 'Revenue Share',
                  state: 'TX',
                }),
              });
            }
          }
        }
      } catch (e) {
        // Silent fail on lead extraction — don't break the chat
        console.error('Lead extraction error:', e.message);
      }
    }

    res.json({ reply });
  } catch (e) {
    console.error('Chat error:', e);
    res.status(500).json({ error: 'Chat service error' });
  }
});

export default router;
