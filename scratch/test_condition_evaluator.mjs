import {
  getNestedProperty,
  evaluateComparison,
  evaluateConditionNode,
  ALLOWED_OPERATORS
} from '../server/services/workflow/conditionEvaluator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== FlowForge AI: Condition Evaluator Service Tests ===\n');

// 1. Prototype Pollution & Unsafe Access Tests
console.log('--- 1. Prototype Pollution & Unsafe Access Tests ---');
const testObj = {
  user: {
    name: 'Alice',
    role: 'member'
  },
  items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]
};

assert(getNestedProperty(testObj, '__proto__') === undefined, 'Blocks direct __proto__ access');
assert(getNestedProperty(testObj, '__proto__.polluted') === undefined, 'Blocks nested __proto__ property access');
assert(getNestedProperty(testObj, 'constructor.prototype') === undefined, 'Blocks constructor.prototype access');
assert(getNestedProperty(testObj, 'prototype') === undefined, 'Blocks direct prototype access');
assert(getNestedProperty(testObj, 'user.__proto__.admin') === undefined, 'Blocks nested object __proto__');

// Verify Prototype was not polluted
assert(Object.prototype.polluted === undefined, 'Object.prototype remains unpolluted');

// 2. Nested Field Resolution Tests
console.log('\n--- 2. Nested Field Resolution Tests ---');
assert(getNestedProperty(testObj, 'user.name') === 'Alice', 'Resolves dot-notation field');
assert(getNestedProperty(testObj, 'user.role') === 'member', 'Resolves nested field');
assert(getNestedProperty(testObj, 'items[0].name') === 'Item 1', 'Resolves bracket-notation array index');
assert(getNestedProperty(testObj, 'items[1].id') === 2, 'Resolves second array element');
assert(getNestedProperty(testObj, 'items.0.name') === 'Item 1', 'Resolves dot-notation array index');
assert(getNestedProperty(testObj, 'nonExistent') === undefined, 'Returns undefined for missing root property');
assert(getNestedProperty(testObj, 'user.profile.bio') === undefined, 'Returns undefined for missing deep property');
assert(getNestedProperty(null, 'user.name') === undefined, 'Handles null source safely');
assert(getNestedProperty(undefined, 'user.name') === undefined, 'Handles undefined source safely');

// 3. Comparison Operator Unit Tests
console.log('\n--- 3. Comparison Operator Unit Tests ---');
// Equals & Strict Equals
assert(evaluateComparison(200, 'equals', 200) === true, 'equals: 200 == 200');
assert(evaluateComparison('200', 'equals', 200) === true, 'equals: "200" == 200 (loose numeric string)');
assert(evaluateComparison(200, 'equals', '200') === true, 'equals: 200 == "200"');
assert(evaluateComparison(200, 'equals', 404) === false, 'equals: 200 != 404');
assert(evaluateComparison('true', 'equals', true) === true, 'equals: "true" == true');
assert(evaluateComparison('200', 'strict_equals', 200) === false, 'strict_equals: "200" !== 200');
assert(evaluateComparison(200, 'strict_equals', 200) === true, 'strict_equals: 200 === 200');

// Not Equals
assert(evaluateComparison(200, 'not_equals', 404) === true, 'not_equals: 200 != 404');
assert(evaluateComparison(200, 'not_equals', 200) === false, 'not_equals: 200 != 200 is false');

// Relational
assert(evaluateComparison(300, 'greater_than', 200) === true, 'greater_than: 300 > 200');
assert(evaluateComparison('300', 'greater_than', 200) === true, 'greater_than: "300" > 200 (string number)');
assert(evaluateComparison(200, 'greater_than', 200) === false, 'greater_than: 200 > 200 is false');
assert(evaluateComparison(200, 'greater_than_or_equal', 200) === true, 'greater_than_or_equal: 200 >= 200');
assert(evaluateComparison(100, 'less_than', 200) === true, 'less_than: 100 < 200');
assert(evaluateComparison(200, 'less_than', 200) === false, 'less_than: 200 < 200 is false');
assert(evaluateComparison(200, 'less_than_or_equal', 200) === true, 'less_than_or_equal: 200 <= 200');

// Contains & Not Contains
assert(evaluateComparison('Hello World', 'contains', 'World') === true, 'contains: string substring');
assert(evaluateComparison('Hello World', 'contains', 'world') === true, 'contains: case-insensitive match');
assert(evaluateComparison('Hello World', 'contains', 'Foo') === false, 'contains: negative match');
assert(evaluateComparison(['admin', 'editor'], 'contains', 'admin') === true, 'contains: array member');
assert(evaluateComparison(['admin', 'editor'], 'contains', 'viewer') === false, 'contains: array member missing');
assert(evaluateComparison('Hello World', 'not_contains', 'Foo') === true, 'not_contains: true when absent');
assert(evaluateComparison('Hello World', 'not_contains', 'World') === false, 'not_contains: false when present');

// Starts With & Ends With
assert(evaluateComparison('Bearer secret123', 'starts_with', 'bearer') === true, 'starts_with: match prefix');
assert(evaluateComparison('Bearer secret123', 'starts_with', 'token') === false, 'starts_with: mismatch prefix');
assert(evaluateComparison('report.pdf', 'ends_with', '.pdf') === true, 'ends_with: match suffix');
assert(evaluateComparison('report.pdf', 'ends_with', '.png') === false, 'ends_with: mismatch suffix');

// Is Empty & Is Not Empty
assert(evaluateComparison(null, 'is_empty', '') === true, 'is_empty: null is empty');
assert(evaluateComparison(undefined, 'is_empty', '') === true, 'is_empty: undefined is empty');
assert(evaluateComparison('', 'is_empty', '') === true, 'is_empty: empty string is empty');
assert(evaluateComparison([], 'is_empty', '') === true, 'is_empty: empty array is empty');
assert(evaluateComparison({}, 'is_empty', '') === true, 'is_empty: empty object is empty');
assert(evaluateComparison('valid', 'is_empty', '') === false, 'is_empty: non-empty string is not empty');
assert(evaluateComparison([1], 'is_empty', '') === false, 'is_empty: non-empty array is not empty');
assert(evaluateComparison({ a: 1 }, 'is_empty', '') === false, 'is_empty: non-empty object is not empty');
assert(evaluateComparison('valid', 'is_not_empty', '') === true, 'is_not_empty: true for populated value');
assert(evaluateComparison(null, 'is_not_empty', '') === false, 'is_not_empty: false for null');

// Is True & Is False
assert(evaluateComparison(true, 'is_true', '') === true, 'is_true: boolean true');
assert(evaluateComparison('true', 'is_true', '') === true, 'is_true: string "true"');
assert(evaluateComparison(1, 'is_true', '') === true, 'is_true: numeric 1');
assert(evaluateComparison(false, 'is_true', '') === false, 'is_true: boolean false is not true');
assert(evaluateComparison(false, 'is_false', '') === true, 'is_false: boolean false');
assert(evaluateComparison('false', 'is_false', '') === true, 'is_false: string "false"');
assert(evaluateComparison(0, 'is_false', '') === true, 'is_false: numeric 0');
assert(evaluateComparison(true, 'is_false', '') === false, 'is_false: boolean true is not false');

// 4. Missing Fields & Null Value Handling
console.log('\n--- 4. Missing Fields & Null Value Handling ---');
const emptyPayload = { status: null };

// Missing field with equals
const missingEquals = evaluateConditionNode(
  { id: 'c_miss', data: { field: 'user.age', operator: 'equals', value: 25 } },
  emptyPayload
);
assert(missingEquals.success === true, 'Missing field executes safely without crashing');
assert(missingEquals.result === false, 'Missing field against value evaluates to false');
assert(missingEquals.output.fieldFound === false, 'Output telemetry flags fieldFound as false');
assert(missingEquals.output.actualValue === null, 'Output telemetry records actualValue as null');

// Missing field with is_empty
const missingEmpty = evaluateConditionNode(
  { id: 'c_miss_empty', data: { field: 'user.profile', operator: 'is_empty' } },
  emptyPayload
);
assert(missingEmpty.success === true, 'Missing field with is_empty succeeds');
assert(missingEmpty.result === true, 'Missing field evaluates to TRUE for is_empty');

// Missing field with is_not_empty
const missingNotEmpty = evaluateConditionNode(
  { id: 'c_miss_not_empty', data: { field: 'user.profile', operator: 'is_not_empty' } },
  emptyPayload
);
assert(missingNotEmpty.success === true, 'Missing field with is_not_empty succeeds');
assert(missingNotEmpty.result === false, 'Missing field evaluates to FALSE for is_not_empty');

// Null field with relational comparison
const nullRelational = evaluateConditionNode(
  { id: 'c_null_rel', data: { field: 'status', operator: 'greater_than', value: 0 } },
  emptyPayload
);
assert(nullRelational.success === true, 'Null field with relational operator does not throw');
assert(nullRelational.result === false, 'Null field with greater_than evaluates safely to false');

// Multi-parent fallback resolution
const multiParentInput = {
  upstream_api: { status: 200, data: { active: true } },
  upstream_trig: { event: 'webhook' }
};
const multiParentRes = evaluateConditionNode(
  { id: 'c_multi', data: { field: 'status', operator: 'equals', value: 200 } },
  multiParentInput
);
assert(multiParentRes.success === true && multiParentRes.result === true, 'Resolves field from parent object in multi-parent input');

// 5. Invalid Configuration Handling
console.log('\n--- 5. Invalid Configuration & Malformed Input Handling ---');

// Missing field configuration
const noFieldNode = { id: 'c_no_field', data: { operator: 'equals', value: 200 } };
const noFieldRes = evaluateConditionNode(noFieldNode, { status: 200 });
assert(noFieldRes.success === false, 'Fails when field configuration is missing');
assert(noFieldRes.error.includes('requires a valid field path'), 'Returns clear field error message');

// Empty string field configuration
const emptyFieldNode = { id: 'c_empty_field', data: { field: '   ', operator: 'equals', value: 200 } };
const emptyFieldRes = evaluateConditionNode(emptyFieldNode, { status: 200 });
assert(emptyFieldRes.success === false, 'Fails when field configuration is empty whitespace');

// Unsupported operator
const badOpNode = { id: 'c_bad_op', data: { field: 'status', operator: 'eval_code', value: 200 } };
const badOpRes = evaluateConditionNode(badOpNode, { status: 200 });
assert(badOpRes.success === false, 'Fails when operator is unsupported');
assert(badOpRes.error.includes('unsupported operator: "eval_code"'), 'Returns clear operator error message');

// Malformed node input
assert(evaluateConditionNode(null, {}).success === false, 'Rejects null node definition');
assert(evaluateConditionNode('not an object', {}).success === false, 'Rejects non-object node definition');

// 6. Structured Output Telemetry Verification
console.log('\n--- 6. Telemetry Output Format Verification ---');
const validNode = {
  id: 'cond_telemetry_test',
  data: {
    field: 'status',
    operator: 'equals',
    value: 200
  }
};
const telemetryRes = evaluateConditionNode(validNode, { status: 200 });
assert(telemetryRes.success === true, 'Valid node returns success: true');
assert(telemetryRes.result === true, 'Result is true');
assert(telemetryRes.output?.evaluatedBranch === 'true', 'evaluatedBranch is "true"');
assert(telemetryRes.output?.field === 'status', 'Records field path');
assert(telemetryRes.output?.operator === 'equals', 'Records canonical operator');
assert(telemetryRes.output?.actualValue === 200, 'Records actualValue');
assert(telemetryRes.output?.targetValue === 200, 'Records targetValue');
assert(typeof telemetryRes.output?.timestamp === 'string', 'Includes ISO timestamp');

console.log('\n========================================');
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
