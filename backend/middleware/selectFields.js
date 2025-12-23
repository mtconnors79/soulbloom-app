/**
 * Field Selection Middleware
 *
 * Allows clients to request only needed fields from API responses.
 * Reduces bandwidth and improves mobile performance.
 *
 * Usage:
 *   GET /api/mood?fields=id,rating,date
 *   GET /api/checkins?fields=id,mood_rating,created_at
 *
 * Only works with array responses. Object responses are returned as-is.
 */

const selectFields = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json
  res.json = (data) => {
    // Only process if fields query param exists
    const fieldsParam = req.query.fields;

    if (!fieldsParam) {
      return originalJson(data);
    }

    // Parse requested fields
    const requestedFields = fieldsParam
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (requestedFields.length === 0) {
      return originalJson(data);
    }

    // If data is an array, filter each item
    if (Array.isArray(data)) {
      const filteredData = data.map(item => filterObject(item, requestedFields));
      return originalJson(filteredData);
    }

    // If data has a nested array property (common pattern: { items: [...] })
    if (data && typeof data === 'object') {
      const filteredData = { ...data };

      // Common response wrapper patterns
      const arrayProps = ['items', 'data', 'results', 'entries', 'checkins', 'goals', 'moodEntries', 'connections'];

      for (const prop of arrayProps) {
        if (Array.isArray(data[prop])) {
          filteredData[prop] = data[prop].map(item => filterObject(item, requestedFields));
        }
      }

      return originalJson(filteredData);
    }

    // For non-array data, return as-is
    return originalJson(data);
  };

  next();
};

/**
 * Filter an object to only include specified fields
 * Supports nested field access with dot notation (e.g., "user.name")
 */
const filterObject = (obj, fields) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const filtered = {};

  for (const field of fields) {
    // Handle dot notation for nested fields
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = obj;
      let target = filtered;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i === parts.length - 1) {
          // Last part - set the value
          if (value && value[part] !== undefined) {
            target[part] = value[part];
          }
        } else {
          // Intermediate part - traverse
          if (value && value[part] !== undefined) {
            value = value[part];
            target[part] = target[part] || {};
            target = target[part];
          } else {
            break;
          }
        }
      }
    } else {
      // Simple field
      if (obj[field] !== undefined) {
        filtered[field] = obj[field];
      }
    }
  }

  return filtered;
};

module.exports = selectFields;
