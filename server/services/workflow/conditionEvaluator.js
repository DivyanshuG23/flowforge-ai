/**
 * Safe Backend Condition Evaluator Service for FlowForge AI
 *
 * Evaluates node branching conditions deterministically without eval(),
 * new Function(), or arbitrary code execution. Provides strict prototype pollution
 * guards and safe nested field extraction.
 */

// Explicit allowlist of supported operators and their canonical names
export const ALLOWED_OPERATORS = Object.freeze({
  equals: 'equals',
  eq: 'equals',
  '==': 'equals',

  strict_equals: 'strict_equals',
  '===': 'strict_equals',

  not_equals: 'not_equals',
  neq: 'not_equals',
  '!=': 'not_equals',
  '!==': 'not_equals',

  greater_than: 'greater_than',
  gt: 'greater_than',
  '>': 'greater_than',

  greater_than_or_equal: 'greater_than_or_equal',
  gte: 'greater_than_or_equal',
  '>=': 'greater_than_or_equal',

  less_than: 'less_than',
  lt: 'less_than',
  '<': 'less_than',

  less_than_or_equal: 'less_than_or_equal',
  lte: 'less_than_or_equal',
  '<=': 'less_than_or_equal',

  contains: 'contains',
  not_contains: 'not_contains',

  starts_with: 'starts_with',
  ends_with: 'ends_with',

  is_empty: 'is_empty',
  is_not_empty: 'is_not_empty',

  is_true: 'is_true',
  is_false: 'is_false'
});

// Prohibited property access tokens to prevent prototype pollution
const FORBIDDEN_PROPERTY_TOKENS = new Set([
  '__proto__',
  'prototype',
  'constructor'
]);

/**
 * Safely extracts nested property from object using dot or bracket notation
 * e.g. "data.user.role", "items[0].id", "status"
 *
 * @param {any} source - Input object/payload to traverse
 * @param {string} path - Property path string
 * @returns {any} Value at path, or undefined if missing / unsafe
 */
export const getNestedProperty = (source, path) => {
  if (source === null || source === undefined || typeof path !== 'string') {
    return undefined;
  }

  const cleanPath = path.trim();
  if (!cleanPath) return undefined;

  // Split into tokens handling both dot and bracket syntax: a.b[0].c, steps['node-ai'].output -> ['steps', 'node-ai', 'output']
  const rawTokens = cleanPath
    .replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
    .split('.')
    .map((token) => token.trim())
    .filter(Boolean);

  if (rawTokens.length === 0) return undefined;

  // Block prototype pollution tokens immediately
  for (const token of rawTokens) {
    if (FORBIDDEN_PROPERTY_TOKENS.has(token.toLowerCase())) {
      return undefined;
    }
  }

  let current = source;

  // Direct lookup first if path exists directly on source (e.g. key has dots)
  if (typeof source === 'object' && Object.prototype.hasOwnProperty.call(source, cleanPath)) {
    return source[cleanPath];
  }

  // Traversal loop
  for (const token of rawTokens) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (FORBIDDEN_PROPERTY_TOKENS.has(token.toLowerCase())) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(token, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else if (typeof current === 'object') {
      if (Object.prototype.hasOwnProperty.call(current, token)) {
        current = current[token];
      } else {
        // Fallback for inherited non-polluting properties or undefined
        current = current[token];
      }
    } else {
      return undefined;
    }
  }

  return current;
};

/**
 * Compares two values for equality, handling numeric string coercion and primitives safely
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
const compareLooseEquality = (a, b) => {
  if (a === b) return true;

  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  // Number comparison: e.g. "200" == 200
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && typeof a !== 'boolean' && typeof b !== 'boolean') {
    return numA === numB;
  }

  // Boolean string comparison: e.g. "true" == true
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    const boolA = typeof a === 'boolean' ? a : (String(a).toLowerCase() === 'true');
    const boolB = typeof b === 'boolean' ? b : (String(b).toLowerCase() === 'true');
    return boolA === boolB;
  }

  // String comparison case-sensitive fallback
  return String(a) === String(b);
};

/**
 * Compares two numeric or string values relationally
 * @param {any} a
 * @param {any} b
 * @param {(na: number|string, nb: number|string) => boolean} comparator
 * @returns {boolean}
 */
const compareRelational = (a, b, comparator) => {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }

  const numA = Number(a);
  const numB = Number(b);

  if (!isNaN(numA) && !isNaN(numB)) {
    return comparator(numA, numB);
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return comparator(a, b);
  }

  return false;
};

/**
 * Evaluates a single comparison rule deterministically
 *
 * @param {any} actualValue - Extracted value from upstream input
 * @param {string} canonicalOperator - Normalized operator key from ALLOWED_OPERATORS
 * @param {any} targetValue - Target operand from node configuration
 * @returns {boolean}
 */
export const evaluateComparison = (actualValue, canonicalOperator, targetValue) => {
  switch (canonicalOperator) {
    case 'equals':
      return compareLooseEquality(actualValue, targetValue);

    case 'strict_equals':
      return actualValue === targetValue;

    case 'not_equals':
      return !compareLooseEquality(actualValue, targetValue);

    case 'greater_than':
      return compareRelational(actualValue, targetValue, (x, y) => x > y);

    case 'greater_than_or_equal':
      return compareRelational(actualValue, targetValue, (x, y) => x >= y);

    case 'less_than':
      return compareRelational(actualValue, targetValue, (x, y) => x < y);

    case 'less_than_or_equal':
      return compareRelational(actualValue, targetValue, (x, y) => x <= y);

    case 'contains': {
      if (actualValue === null || actualValue === undefined) return false;
      const targetStr = String(targetValue ?? '').toLowerCase();

      if (Array.isArray(actualValue)) {
        return actualValue.some((item) =>
          compareLooseEquality(item, targetValue) ||
          String(item).toLowerCase().includes(targetStr)
        );
      }

      return String(actualValue).toLowerCase().includes(targetStr);
    }

    case 'not_contains': {
      if (actualValue === null || actualValue === undefined) return true;
      return !evaluateComparison(actualValue, 'contains', targetValue);
    }

    case 'starts_with': {
      if (actualValue === null || actualValue === undefined) return false;
      const actStr = String(actualValue);
      const tarStr = String(targetValue ?? '');
      return actStr.toLowerCase().startsWith(tarStr.toLowerCase());
    }

    case 'ends_with': {
      if (actualValue === null || actualValue === undefined) return false;
      const actStr = String(actualValue);
      const tarStr = String(targetValue ?? '');
      return actStr.toLowerCase().endsWith(tarStr.toLowerCase());
    }

    case 'is_empty': {
      if (actualValue === null || actualValue === undefined) return true;
      if (typeof actualValue === 'string' && actualValue.trim() === '') return true;
      if (Array.isArray(actualValue) && actualValue.length === 0) return true;
      if (typeof actualValue === 'object' && Object.keys(actualValue).length === 0) return true;
      return false;
    }

    case 'is_not_empty': {
      return !evaluateComparison(actualValue, 'is_empty', targetValue);
    }

    case 'is_true': {
      if (actualValue === true) return true;
      if (typeof actualValue === 'string' && actualValue.toLowerCase() === 'true') return true;
      if (actualValue === 1 || actualValue === '1') return true;
      return false;
    }

    case 'is_false': {
      if (actualValue === false) return true;
      if (typeof actualValue === 'string' && actualValue.toLowerCase() === 'false') return true;
      if (actualValue === 0 || actualValue === '0') return true;
      return false;
    }

    default:
      return false;
  }
};

/**
 * Evaluates a Condition Node definition against incoming execution inputs
 *
 * @param {Object} node - React Flow node definition
 * @param {any} incomingInput - Aggregated outputs from upstream node(s)
 * @returns {{ success: boolean, result?: boolean, output?: Object, error?: string }}
 */
export const evaluateConditionNode = (node, incomingInput, workflowContext = null) => {
  if (!node || typeof node !== 'object') {
    return {
      success: false,
      error: 'Invalid node definition provided to condition evaluator.'
    };
  }

  const nodeData = node.data || {};
  const nodeId = node.id || 'unknown';

  // 1. Resolve configuration (support direct node.data and nested node.data.condition)
  const rawField = nodeData.field ?? nodeData.condition?.field ?? '';
  const rawOperator = nodeData.operator ?? nodeData.condition?.operator ?? 'equals';
  const targetValue = nodeData.value ?? nodeData.condition?.value ?? '';

  // 2. Validate field path configuration
  if (typeof rawField !== 'string' || !rawField.trim()) {
    return {
      success: false,
      error: `Condition node "${nodeId}" requires a valid field path to evaluate.`
    };
  }

  const field = rawField.trim();

  // 3. Validate and normalize operator
  if (typeof rawOperator !== 'string' || !rawOperator.trim()) {
    return {
      success: false,
      error: `Condition node "${nodeId}" is missing an operator.`
    };
  }

  const operatorKey = rawOperator.trim().toLowerCase();
  const canonicalOperator = ALLOWED_OPERATORS[operatorKey];

  if (!canonicalOperator) {
    const validList = Object.keys(ALLOWED_OPERATORS)
      .filter((k) => !['eq', '==', '===', 'neq', '!=', '!==', 'gt', '>', 'gte', '>=', 'lt', '<', 'lte', '<='].includes(k))
      .join(', ');

    return {
      success: false,
      error: `Condition node "${nodeId}" has unsupported operator: "${rawOperator}". Allowed operators: ${validList}.`
    };
  }

  // 4. Resolve field value from incoming data
  let actualValue = getNestedProperty(incomingInput, field);

  // If not found at root, and incomingInput is a multi-parent object { [parentId]: parentOutput },
  // check each parent output as fallback
  if (actualValue === undefined && incomingInput && typeof incomingInput === 'object' && !Array.isArray(incomingInput)) {
    for (const key of Object.keys(incomingInput)) {
      const candidateParent = incomingInput[key];
      if (candidateParent && typeof candidateParent === 'object') {
        const candidateValue = getNestedProperty(candidateParent, field);
        if (candidateValue !== undefined) {
          actualValue = candidateValue;
          break;
        }
      }
    }
  }

  // If still undefined, fallback to resolving from workflowContext if provided
  if (actualValue === undefined && workflowContext && typeof workflowContext === 'object') {
    actualValue = getNestedProperty(workflowContext, field);
  }

  // 5. Evaluate comparison
  const result = Boolean(evaluateComparison(actualValue, canonicalOperator, targetValue));

  // 6. Return structured telemetry
  return {
    success: true,
    result,
    output: {
      result,
      evaluatedBranch: result ? 'true' : 'false',
      field,
      operator: canonicalOperator,
      actualValue: actualValue !== undefined ? actualValue : null,
      fieldFound: actualValue !== undefined,
      targetValue: targetValue !== undefined ? targetValue : null,
      timestamp: new Date().toISOString()
    }
  };
};
