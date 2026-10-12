import assert from 'node:assert/strict';
import bcrypt from '../server/node_modules/bcryptjs/index.js';
import { getProfile, updateProfile } from '../server/controllers/authController.js';
import { BUILT_IN_TEMPLATES } from '../client/src/data/templatesData.js';

console.log('🧪 Starting Phase 8A Automated Verification Suite...\n');

// Mock User database store for testing controllers in isolation
const createMockUser = (initialData = {}) => {
  const userRecord = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: bcrypt.hashSync('ExistingSecret123!', 10),
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...initialData,
    async save() {
      this.updatedAt = new Date();
      return this;
    }
  };
  return userRecord;
};

// Test Suite 1: Built-in Templates Schema & Validity
console.log('--- Test Suite 1: Built-in Templates Schema & Architecture ---');
{
  assert(Array.isArray(BUILT_IN_TEMPLATES), 'BUILT_IN_TEMPLATES must be an array');
  assert.equal(BUILT_IN_TEMPLATES.length, 5, 'Must contain exactly 5 production templates');

  const validTypes = new Set(['trigger', 'action', 'ai', 'condition', 'api', 'output']);
  const seenIds = new Set();

  for (const template of BUILT_IN_TEMPLATES) {
    assert(template.id, `Template missing id: ${template.name}`);
    assert(!seenIds.has(template.id), `Duplicate template id: ${template.id}`);
    seenIds.add(template.id);

    assert(template.name, `Template ${template.id} missing name`);
    assert(template.category, `Template ${template.id} missing category`);
    assert(template.description, `Template ${template.id} missing description`);
    assert(template.workflowData, `Template ${template.id} missing workflowData`);

    const { nodes, edges } = template.workflowData;
    assert(Array.isArray(nodes) && nodes.length > 0, `Template ${template.id} has invalid nodes`);
    assert(Array.isArray(edges) && edges.length > 0, `Template ${template.id} has invalid edges`);

    const nodeIds = new Set(nodes.map(n => n.id));

    // Verify all nodes have valid types
    for (const node of nodes) {
      assert(node.id, `Node in ${template.id} missing id`);
      assert(node.data && node.data.type, `Node ${node.id} in ${template.id} missing data.type`);
      assert(validTypes.has(node.data.type), `Node ${node.id} has invalid type: ${node.data.type}`);
      assert(node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number',
        `Node ${node.id} has invalid position coordinates`);
    }

    // Verify all edges connect existing nodes
    for (const edge of edges) {
      assert(nodeIds.has(edge.source), `Edge ${edge.id} references non-existent source: ${edge.source}`);
      assert(nodeIds.has(edge.target), `Edge ${edge.id} references non-existent target: ${edge.target}`);
    }

    // For condition nodes, verify true/false branching handles
    const conditionNodes = nodes.filter(n => n.data.type === 'condition');
    for (const condNode of conditionNodes) {
      const trueEdge = edges.find(e => e.source === condNode.id && e.sourceHandle === 'true');
      const falseEdge = edges.find(e => e.source === condNode.id && e.sourceHandle === 'false');
      assert(trueEdge, `Condition node ${condNode.id} in ${template.id} missing outgoing true branch edge`);
      assert(falseEdge, `Condition node ${condNode.id} in ${template.id} missing outgoing false branch edge`);
    }

    console.log(`  ✓ Verified blueprint: [${template.id}] "${template.name}" (${nodes.length} nodes, ${edges.length} edges)`);
  }
  console.log('✅ Test Suite 1 Passed: All 5 templates adhere to production architecture.\n');
}

// Test Suite 2: Profile Retrieval (getProfile)
console.log('--- Test Suite 2: Profile Retrieval (getProfile) ---');
{
  const mockUser = createMockUser();

  // Mock User.findById for testing
  import('../server/models/User.js').then(async (module) => {
    const User = module.default;
    const origFindById = User.findById;

    try {
      User.findById = (id) => ({
        select: (projection) => {
          assert.equal(id, mockUser._id);
          assert.equal(projection, '-password', 'Must exclude password from query');
          // Return user without password
          const { password, ...safeUser } = mockUser;
          return Promise.resolve(safeUser);
        }
      });

      const req = { user: { id: mockUser._id } };
      let responseStatus = 200;
      let responseData = null;
      const res = {
        status(code) {
          responseStatus = code;
          return this;
        },
        json(data) {
          responseData = data;
          return this;
        }
      };

      await getProfile(req, res);

      assert.equal(responseStatus, 200);
      assert.equal(responseData.success, true);
      assert.equal(responseData.user.name, 'Ada Lovelace');
      assert.equal(responseData.user.email, 'ada@example.com');
      assert.equal(responseData.user.role, 'user');
      assert.equal(responseData.user.password, undefined, 'Must not return password');
      console.log('  ✓ getProfile correctly returns sanitized user profile without password hash');
    } finally {
      User.findById = origFindById;
    }

    // Test Suite 3: Profile Updates & Tamper Resistance
    console.log('\n--- Test Suite 3: Profile Updates & Tamper Resistance (updateProfile) ---');
    await runUpdateProfileTests(User);
  }).catch((err) => {
    console.error('Failed to run test suite:', err);
    process.exit(1);
  });
}

async function runUpdateProfileTests(User) {
  const origFindById = User.findById;

  try {
    // 3A: Name Update
    {
      const mockUser = createMockUser();
      User.findById = (id) => Promise.resolve(mockUser);

      const req = {
        user: { id: mockUser._id },
        body: { name: 'Ada King, Countess of Lovelace' }
      };
      let responseData = null;
      const res = {
        status() { return this; },
        json(data) { responseData = data; return this; }
      };

      await updateProfile(req, res);

      assert.equal(responseData.success, true);
      assert.equal(mockUser.name, 'Ada King, Countess of Lovelace', 'User name must be updated');
      assert.equal(responseData.user.name, 'Ada King, Countess of Lovelace');
      console.log('  ✓ updateProfile successfully updates user name');
    }

    // 3B: Reject Name Validation Errors (Empty or Out of bounds)
    {
      const mockUser = createMockUser();
      User.findById = (id) => Promise.resolve(mockUser);

      let statusCode = 200;
      let responseData = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { responseData = data; return this; }
      };

      // Empty name
      await updateProfile({ user: { id: mockUser._id }, body: { name: '   ' } }, res);
      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert.equal(responseData.message, 'Name cannot be empty.');

      // Too short name (< 2 chars)
      await updateProfile({ user: { id: mockUser._id }, body: { name: 'A' } }, res);
      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert.equal(responseData.message, 'Name must be between 2 and 50 characters.');

      // Too long name (> 50 chars)
      await updateProfile({ user: { id: mockUser._id }, body: { name: 'A'.repeat(51) } }, res);
      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert.equal(responseData.message, 'Name must be between 2 and 50 characters.');
      console.log('  ✓ updateProfile rejects invalid names (empty, < 2 or > 50 characters)');
    }

    // 3C: Privilege Escalation & Role Tampering Protection
    {
      const mockUser = createMockUser({ role: 'user' });
      User.findById = (id) => Promise.resolve(mockUser);

      const req = {
        user: { id: mockUser._id },
        body: {
          name: 'Attacker Operator',
          role: 'admin',
          email: 'admin@system.local',
          _id: 'malicious_id'
        }
      };
      let responseData = null;
      const res = {
        status() { return this; },
        json(data) { responseData = data; return this; }
      };

      await updateProfile(req, res);

      assert.equal(responseData.success, true);
      assert.equal(mockUser.name, 'Attacker Operator');
      assert.equal(mockUser.role, 'user', 'ROLE MUST REMAIN IMMUTABLE');
      assert.equal(mockUser.email, 'ada@example.com', 'EMAIL MUST REMAIN IMMUTABLE');
      assert.equal(mockUser._id, '507f1f77bcf86cd799439011', 'ID MUST REMAIN IMMUTABLE');
      console.log('  ✓ updateProfile strictly ignores role and email tampering attempts');
    }

    // 3D: Password Update Validation (Incorrect Current Password)
    {
      const mockUser = createMockUser();
      User.findById = (id) => Promise.resolve(mockUser);

      let statusCode = 200;
      let responseData = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { responseData = data; return this; }
      };

      const req = {
        user: { id: mockUser._id },
        body: {
          currentPassword: 'WrongPassword!',
          newPassword: 'BrandNewSecurePassword123!'
        }
      };

      await updateProfile(req, res);

      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert.equal(responseData.message, 'Current password is incorrect.');
      console.log('  ✓ updateProfile rejects password update if current password does not match');
    }

    // 3E: Password Update Validation (Short New Password)
    {
      const mockUser = createMockUser();
      User.findById = (id) => Promise.resolve(mockUser);

      let statusCode = 200;
      let responseData = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { responseData = data; return this; }
      };

      const req = {
        user: { id: mockUser._id },
        body: {
          currentPassword: 'ExistingSecret123!',
          newPassword: '123'
        }
      };

      await updateProfile(req, res);

      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert(responseData.message.includes('New password must be at least 6 characters'));
      console.log('  ✓ updateProfile rejects new password shorter than 6 characters');
    }

    // 3F: Successful Password Update with Bcrypt Salt
    {
      const mockUser = createMockUser();
      const oldHash = mockUser.password;
      User.findById = (id) => Promise.resolve(mockUser);

      let statusCode = 200;
      let responseData = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { responseData = data; return this; }
      };

      const req = {
        user: { id: mockUser._id },
        body: {
          currentPassword: 'ExistingSecret123!',
          newPassword: 'BrandNewSecurePassword123!'
        }
      };

      await updateProfile(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseData.success, true);
      assert.notEqual(mockUser.password, oldHash, 'Password hash must change');
      assert(bcrypt.compareSync('BrandNewSecurePassword123!', mockUser.password),
        'New password must be verified by bcrypt');
      console.log('  ✓ updateProfile hashes and saves new password with verified bcrypt salt');
    }

    console.log('\n🎉 ALL PHASE 8A AUTOMATED VERIFICATION TESTS PASSED!\n');
  } finally {
    User.findById = origFindById;
  }
}
