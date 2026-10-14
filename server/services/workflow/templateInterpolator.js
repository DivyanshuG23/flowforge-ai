import { getNestedProperty } from './conditionEvaluator.js';

/**
 * FlowForge AI — Dynamic Template & Upstream Variable Interpolator
 *
 * Provides safe, deterministic variable interpolation across workflow nodes without eval().
 * Supports {{trigger.payload.field}}, {{ai.structured.field}}, {{nodeId.output.field}},
 * and {{input.field}} with type preservation and strict prototype pollution protection.
 */

// Regex for template tags: {{ path.to.variable }}, {{ steps['node-ai'].output }}
const TEMPLATE_TAG_REGEX = /\{\{\s*([a-zA-Z0-9_.[\]'"-]+)\s*\}\}/g;
const SINGLE_EXACT_TAG_REGEX = /^\{\{\s*([a-zA-Z0-9_.[\]'"-]+)\s*\}\}$/;

/**
 * Builds a clean, prototype-safe context map aggregating outputs from all prior nodes
 *
 * @param {Object} params
 * @param {Array} [params.nodes=[]] - Workflow node definitions
 * @param {Map} [params.nodeOutputs=new Map()] - Outputs of previously executed nodes
 * @param {Object} [params.currentNode=null] - Currently executing node
 * @param {any} [params.incomingInput=null] - Aggregated input from parent node(s)
 * @param {Object} [params.options={}] - Pipeline runtime options
 * @returns {Object} Clean context dictionary
 */
export const buildWorkflowContext = ({
  nodes = [],
  nodeOutputs = new Map(),
  currentNode = null,
  incomingInput = null,
  options = {}
} = {}) => {
  const context = Object.create(null);

  // 1. Direct incoming input
  context.input = incomingInput;

  // 2. Direct property exposure from incomingInput if it is a plain object
  if (incomingInput && typeof incomingInput === 'object' && !Array.isArray(incomingInput)) {
    for (const [k, v] of Object.entries(incomingInput)) {
      const lower = k.toLowerCase();
      if (!['__proto__', 'constructor', 'prototype'].includes(lower)) {
        context[k] = v;
      }
    }
  }

  // 3. Node outputs keyed by exact node ID and steps[nodeId]
  const steps = Object.create(null);
  for (const [nodeId, output] of nodeOutputs.entries()) {
    context[nodeId] = output;
    steps[nodeId] = { output };
  }
  context.steps = steps;

  // 4. Convenience shortcuts by node type (e.g. context.trigger, context.ai, context.api)
  if (Array.isArray(nodes)) {
    for (const n of nodes) {
      const type = n.data?.type || n.type;
      if (type && nodeOutputs.has(n.id)) {
        const out = nodeOutputs.get(n.id);
        context[type] = out;
      }
    }
  }

  // 5. Trigger options fallback if trigger node output hasn't been set yet
  if (options && options.triggerPayload !== undefined) {
    if (!context.trigger) {
      context.trigger = { payload: options.triggerPayload };
    } else if (context.trigger.payload === undefined) {
      context.trigger.payload = options.triggerPayload;
    }
  }

  return context;
};

/**
 * Resolves a single path expression against context
 *
 * @param {string} expression - Path to resolve (e.g. "trigger.payload.service")
 * @param {Object} context - Execution context
 * @returns {any} Resolved value or undefined
 */
export const interpolateExpression = (expression, context) => {
  if (!expression || typeof expression !== 'string' || !context) {
    return undefined;
  }

  const cleanExpr = expression.trim();
  if (!cleanExpr) return undefined;

  // 1. Try resolving against root context
  let val = getNestedProperty(context, cleanExpr);

  // 2. Try resolving against context[type].data or context[type].payload (e.g. action.targetSystem -> action.data.targetSystem)
  if (val === undefined && cleanExpr.includes('.')) {
    const parts = cleanExpr.split('.');
    const head = parts[0];
    const tail = parts.slice(1).join('.');
    const headObj = context[head];
    if (headObj && typeof headObj === 'object') {
      if (headObj.data && typeof headObj.data === 'object') {
        val = getNestedProperty(headObj.data, tail);
      }
      if (val === undefined && headObj.payload && typeof headObj.payload === 'object') {
        val = getNestedProperty(headObj.payload, tail);
      }
      if (val === undefined && headObj.output && typeof headObj.output === 'object') {
        val = getNestedProperty(headObj.output, tail);
      }
    }
  }

  // 3. Fallback: try resolving against context.input if not explicitly prefixed
  if (val === undefined && context.input && typeof context.input === 'object') {
    if (!cleanExpr.startsWith('input.') && !cleanExpr.startsWith('steps.')) {
      val = getNestedProperty(context.input, cleanExpr);
      if (val === undefined && context.input.data && typeof context.input.data === 'object') {
        val = getNestedProperty(context.input.data, cleanExpr);
      }
      if (val === undefined && context.input.payload && typeof context.input.payload === 'object') {
        val = getNestedProperty(context.input.payload, cleanExpr);
      }
    }
  }

  // 4. Fallback: search across prior step outputs (context.steps) for bare variable names
  if (val === undefined && context.steps && typeof context.steps === 'object') {
    for (const stepKey of Object.keys(context.steps)) {
      const step = context.steps[stepKey];
      const out = step?.output;
      if (out && typeof out === 'object') {
        val = getNestedProperty(out, cleanExpr);
        if (val === undefined && out.data && typeof out.data === 'object') {
          val = getNestedProperty(out.data, cleanExpr);
        }
        if (val === undefined && out.payload && typeof out.payload === 'object') {
          val = getNestedProperty(out.payload, cleanExpr);
        }
        if (val !== undefined) {
          break;
        }
      }
    }
  }

  return val;
};

/**
 * Interpolates template strings containing {{ expression }}
 * Preserves native types (objects, arrays, numbers, booleans) when the string is a single exact tag.
 *
 * @param {any} template - String template or primitive
 * @param {Object} context - Resolution context
 * @returns {any} Interpolated result
 */
export const interpolateTemplate = (template, context) => {
  if (typeof template !== 'string' || !template.includes('{{') || !context) {
    return template;
  }

  // Handle backslash-escaped braces: \{{ text }} or \{{ text \}} -> preserve as literal {{ text }}
  const hasEscapedBraces = template.includes('\\{{');
  let workingTemplate = template;
  if (hasEscapedBraces) {
    workingTemplate = workingTemplate
      .replace(/\\\{\{/g, '__FF_ESC_OPEN__')
      .replace(/\\\}\}/g, '__FF_ESC_CLOSE__');
  }

  // If the entire template is a single exact tag (e.g. "{{ ai.structured }}"), preserve the resolved value's type
  const trimmed = workingTemplate.trim();
  const singleMatch = trimmed.match(SINGLE_EXACT_TAG_REGEX);
  if (singleMatch) {
    const expr = singleMatch[1];
    const resolved = interpolateExpression(expr, context);
    return resolved !== undefined ? resolved : undefined;
  }

  // Embedded tags in a string: replace each match with stringified representation
  let result = workingTemplate.replace(TEMPLATE_TAG_REGEX, (match, expr) => {
    const val = interpolateExpression(expr, context);
    if (val === undefined || val === null) {
      return '';
    }
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  });

  // Restore escaped braces to literal {{ and }}
  if (hasEscapedBraces) {
    result = result
      .replace(/__FF_ESC_OPEN__/g, '{{')
      .replace(/__FF_ESC_CLOSE__/g, '}}');
  }

  return result;
};

/**
 * Recursively interpolates templates across nested objects and arrays
 *
 * @param {any} target - Data structure to interpolate
 * @param {Object} context - Resolution context
 * @returns {any} Deeply interpolated clone
 */
export const interpolateObject = (target, context) => {
  if (target === null || target === undefined || !context) {
    return target;
  }

  if (typeof target === 'string') {
    return interpolateTemplate(target, context);
  }

  if (Array.isArray(target)) {
    return target.map((item) => interpolateObject(item, context));
  }

  if (typeof target === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(target)) {
      const interpolatedKey = interpolateTemplate(key, context);
      const safeKey = typeof interpolatedKey === 'string' ? interpolatedKey : key;
      const lower = safeKey.toLowerCase();
      if (!['__proto__', 'constructor', 'prototype'].includes(lower)) {
        result[safeKey] = interpolateObject(value, context);
      }
    }
    return result;
  }

  return target;
};

/**
 * Deterministically executes an Action node with support for:
 * 1. JSON Transform / Mapping: Evaluates template/mapping with upstream variables
 * 2. Field Filter: Extracts an allowlist of fields from input
 * 3. Passthrough: Preserves input data unmodified (backward compatible default)
 *
 * @param {Object} node - Action node definition
 * @param {any} incomingInput - Aggregated parent node input
 * @param {Object} context - Workflow resolution context
 * @returns {{ success: boolean, output: Object }}
 */
export const executeActionNode = (node, incomingInput, context) => {
  const nodeData = node.data || {};
  const operation = (nodeData.operation || nodeData.actionType || 'passthrough').toLowerCase().trim();

  // 1. JSON Transformation / Mapping mode
  const rawMapping = nodeData.mapping ?? nodeData.payload ?? nodeData.template;
  if (['transform', 'mapping', 'json_transform'].includes(operation) || (rawMapping && operation !== 'passthrough')) {
    let parsedTemplate = rawMapping;
    if (typeof rawMapping === 'string' && rawMapping.trim()) {
      try {
        parsedTemplate = JSON.parse(rawMapping);
      } catch {
        // Retain as string template if not JSON
        parsedTemplate = rawMapping;
      }
    }

    let transformedData;
    if (parsedTemplate !== undefined && parsedTemplate !== null) {
      transformedData = interpolateObject(parsedTemplate, context);
    } else {
      transformedData = incomingInput ?? null;
    }

    return {
      success: true,
      output: {
        operation: 'transform',
        processedAt: new Date().toISOString(),
        data: transformedData,
        ...(typeof transformedData === 'object' && transformedData !== null && !Array.isArray(transformedData)
          ? transformedData
          : {})
      }
    };
  }

  // 2. Field Filter mode
  if (operation === 'filter' || nodeData.selectedFields) {
    const rawFields = nodeData.selectedFields;
    const fields = Array.isArray(rawFields)
      ? rawFields
      : typeof rawFields === 'string'
      ? rawFields.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const source = incomingInput && typeof incomingInput === 'object' ? incomingInput : {};
    const filtered = {};
    for (const f of fields) {
      const val = getNestedProperty(source, f);
      if (val !== undefined) {
        filtered[f] = val;
      }
    }

    return {
      success: true,
      output: {
        operation: 'filter',
        processedAt: new Date().toISOString(),
        data: filtered,
        ...filtered
      }
    };
  }

  // 3. Default Passthrough mode (100% backward compatible)
  return {
    success: true,
    output: {
      operation: 'passthrough_transform',
      processedAt: new Date().toISOString(),
      data: incomingInput ?? { message: 'Initialized without upstream input' },
      ...(incomingInput && typeof incomingInput === 'object' && !Array.isArray(incomingInput) ? incomingInput : {})
    }
  };
};
