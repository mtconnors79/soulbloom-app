const express = require('express');
const router = express.Router();

// Crisis resources - hardcoded essential resources
const CRISIS_RESOURCES = {
  hotlines: [
    {
      id: 'suicide-lifeline',
      name: '988 Suicide & Crisis Lifeline',
      description: 'Free, confidential support 24/7 for people in distress',
      phone: '988',
      type: 'hotline',
      available: '24/7',
      priority: 1,
    },
    {
      id: 'crisis-text',
      name: 'Crisis Text Line',
      description: 'Text HOME to 741741 for free crisis counseling',
      phone: '741741',
      smsKeyword: 'HOME',
      type: 'text',
      available: '24/7',
      priority: 2,
    },
    {
      id: 'emergency',
      name: 'Emergency Services',
      description: 'For immediate life-threatening emergencies',
      phone: '911',
      type: 'emergency',
      available: '24/7',
      priority: 0,
    },
    {
      id: 'samhsa',
      name: 'SAMHSA National Helpline',
      description: 'Free treatment referrals and information service',
      phone: '1-800-662-4357',
      type: 'hotline',
      available: '24/7',
      priority: 3,
    },
  ],
  therapyLinks: [
    {
      id: 'betterhelp',
      name: 'BetterHelp',
      description: 'Online therapy with licensed counselors',
      url: 'https://www.betterhelp.com',
      type: 'online_therapy',
    },
    {
      id: 'talkspace',
      name: 'Talkspace',
      description: 'Connect with a therapist from anywhere',
      url: 'https://www.talkspace.com',
      type: 'online_therapy',
    },
    {
      id: 'psychology-today',
      name: 'Psychology Today',
      description: 'Find a therapist near you',
      url: 'https://www.psychologytoday.com/us/therapists',
      type: 'therapist_finder',
    },
  ],
  supportMessage: 'You are not alone. Help is available. Reaching out is a sign of strength.',
};

// GET /api/resources/crisis - Get crisis resources
router.get('/crisis', (req, res) => {
  res.json({
    success: true,
    resources: CRISIS_RESOURCES,
  });
});

module.exports = router;
