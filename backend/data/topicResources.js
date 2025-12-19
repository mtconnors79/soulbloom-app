/**
 * Topic detection patterns and corresponding resources
 * Each topic has keywords for detection and a helpful resource
 */

const TOPIC_PATTERNS = {
  domestic_violence: {
    keywords: [
      'hit me', 'hits me', 'hitting me',
      'abusive', 'abuse', 'abused',
      'scared of partner', 'scared of him', 'scared of her',
      'controlling', 'controls me', 'won\'t let me',
      'threatens me', 'threatened me', 'threatening',
      'hurts me', 'hurt me', 'violent',
      'beats me', 'beat me', 'beating',
      'chokes me', 'choked me', 'strangled'
    ],
    resource: {
      name: 'National Domestic Violence Hotline',
      description: 'Free, confidential support 24/7 for anyone experiencing domestic violence',
      phone: '1-800-799-7233',
      url: 'https://www.thehotline.org',
      text_option: 'Text START to 88788'
    }
  },

  substance_abuse: {
    keywords: [
      'drinking too much', 'drinking again', 'can\'t stop drinking',
      'using again', 'started using', 'relapsed',
      'drugs', 'drug use', 'getting high',
      'alcohol', 'alcoholic', 'drunk',
      'addiction', 'addicted', 'addict',
      'withdrawal', 'detox', 'sober',
      'pills', 'opioids', 'cocaine', 'meth',
      'can\'t quit', 'need to use'
    ],
    resource: {
      name: 'SAMHSA National Helpline',
      description: 'Free, confidential treatment referrals and support 24/7',
      phone: '1-800-662-4357',
      url: 'https://www.samhsa.gov/find-help/national-helpline',
      text_option: null
    }
  },

  eating_disorder: {
    keywords: [
      'purging', 'purge', 'throwing up food',
      'starving myself', 'not eating', 'restricting',
      'binge', 'bingeing', 'binge eating',
      'restrict', 'restricting food',
      'calories', 'counting calories obsessively',
      'anorexia', 'anorexic',
      'bulimia', 'bulimic',
      'laxatives', 'diet pills',
      'too fat', 'hate my body', 'body image',
      'afraid to eat', 'scared to eat'
    ],
    resource: {
      name: 'National Eating Disorders Association (NEDA)',
      description: 'Support, resources, and treatment options for eating disorders',
      phone: '1-800-931-2237',
      url: 'https://www.nationaleatingdisorders.org',
      text_option: 'Text NEDA to 741741'
    }
  },

  financial_stress: {
    keywords: [
      'debt', 'in debt', 'drowning in debt',
      'can\'t pay rent', 'can\'t afford rent',
      'homeless', 'losing my home', 'no place to live',
      'eviction', 'evicted', 'being evicted',
      'bankrupt', 'bankruptcy', 'going bankrupt',
      'can\'t pay bills', 'bills piling up',
      'no money', 'broke', 'financial trouble',
      'losing everything', 'foreclosure'
    ],
    resource: {
      name: '211 Community Resources',
      description: 'Connect to local financial assistance, housing help, and community resources',
      phone: '211',
      url: 'https://www.211.org',
      text_option: 'Text your ZIP code to 898211'
    }
  },

  grief: {
    keywords: [
      'died', 'death', 'passed away',
      'lost my', 'losing my', 'lost someone',
      'funeral', 'memorial',
      'grieving', 'grief', 'mourning',
      'miss them', 'miss him', 'miss her',
      'gone forever', 'never see again',
      'widow', 'widower', 'orphan',
      'terminal', 'dying'
    ],
    resource: {
      name: 'GriefShare',
      description: 'Support groups and resources for those grieving the loss of a loved one',
      phone: '1-800-395-5755',
      url: 'https://www.griefshare.org',
      text_option: null
    }
  },

  self_harm: {
    keywords: [
      'cutting', 'cut myself', 'cutting myself',
      'hurting myself', 'hurt myself', 'self-harm',
      'burn myself', 'burning myself',
      'scratching myself', 'scratch myself',
      'hitting myself', 'punching walls',
      'want to hurt myself', 'harming myself',
      'self-injury', 'self injury'
    ],
    resource: {
      name: 'Crisis Text Line',
      description: 'Free, confidential support via text message, available 24/7',
      phone: null,
      url: 'https://www.crisistextline.org',
      text_option: 'Text HOME to 741741'
    }
  },

  lgbtq_support: {
    keywords: [
      'coming out', 'closeted', 'in the closet',
      'gay', 'lesbian', 'bisexual', 'transgender', 'trans',
      'queer', 'lgbtq', 'lgbt',
      'gender identity', 'sexual orientation',
      'not accepted', 'family doesn\'t accept',
      'conversion', 'pray away'
    ],
    resource: {
      name: 'The Trevor Project',
      description: 'Crisis intervention and suicide prevention for LGBTQ+ young people',
      phone: '1-866-488-7386',
      url: 'https://www.thetrevorproject.org',
      text_option: 'Text START to 678-678'
    }
  },

  veteran_support: {
    keywords: [
      'veteran', 'military', 'served',
      'combat', 'deployment', 'deployed',
      'ptsd', 'post-traumatic',
      'service member', 'armed forces',
      'war', 'battlefield', 'tour of duty'
    ],
    resource: {
      name: 'Veterans Crisis Line',
      description: 'Free, confidential support for Veterans and their loved ones 24/7',
      phone: '988 (then press 1)',
      url: 'https://www.veteranscrisisline.net',
      text_option: 'Text 838255'
    }
  }
};

/**
 * Detect topics from check-in text using keyword matching
 * @param {string} text - The check-in text to analyze
 * @returns {Array} Array of detected topics with their resources
 */
const detectTopics = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lowerText = text.toLowerCase();
  const detectedTopics = [];

  for (const [topicId, topicData] of Object.entries(TOPIC_PATTERNS)) {
    const hasMatch = topicData.keywords.some(keyword => {
      // Use word boundary matching for single words, substring for phrases
      if (keyword.includes(' ')) {
        return lowerText.includes(keyword);
      } else {
        // Match whole words only for single-word keywords
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerText);
      }
    });

    if (hasMatch) {
      detectedTopics.push({
        topic_id: topicId,
        topic_name: formatTopicName(topicId),
        resource: topicData.resource
      });
    }
  }

  return detectedTopics;
};

/**
 * Format topic ID into human-readable name
 */
const formatTopicName = (topicId) => {
  const nameMap = {
    domestic_violence: 'relationship safety',
    substance_abuse: 'substance use',
    eating_disorder: 'eating and body image',
    financial_stress: 'financial challenges',
    grief: 'loss and grief',
    self_harm: 'self-harm',
    lgbtq_support: 'LGBTQ+ identity',
    veteran_support: 'veteran experiences'
  };

  return nameMap[topicId] || topicId.replace(/_/g, ' ');
};

/**
 * Get a specific resource by topic ID
 */
const getResourceByTopic = (topicId) => {
  const topic = TOPIC_PATTERNS[topicId];
  return topic ? topic.resource : null;
};

/**
 * Get all available topics and their resources
 */
const getAllTopics = () => {
  return Object.entries(TOPIC_PATTERNS).map(([topicId, topicData]) => ({
    topic_id: topicId,
    topic_name: formatTopicName(topicId),
    resource: topicData.resource
  }));
};

module.exports = {
  detectTopics,
  getResourceByTopic,
  getAllTopics,
  TOPIC_PATTERNS
};
