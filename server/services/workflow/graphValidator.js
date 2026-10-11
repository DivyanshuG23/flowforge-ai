/**
 * Graph Validation and Deterministic Topological Sorting for FlowForge AI
 */

/**
 * Validates a workflow graph and computes a deterministic topological execution order
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {{ isValid: boolean, error?: string, executionOrder?: Array }}
 */
export const validateWorkflowGraph = (nodes, edges = []) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      isValid: false,
      error: 'Cannot execute empty workflow. The graph must contain at least one node.'
    };
  }

  if (!Array.isArray(edges)) {
    return {
      isValid: false,
      error: 'Edges must be an array of connection objects.'
    };
  }

  // 1. Validate node integrity and check for duplicates
  const nodeMap = new Map();
  const inDegree = new Map();
  const adjacency = new Map();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || typeof node !== 'object') {
      return {
        isValid: false,
        error: `Invalid node structure encountered at index ${i}.`
      };
    }

    if (!node.id || typeof node.id !== 'string' || !node.id.trim()) {
      return {
        isValid: false,
        error: `Node at index ${i} is missing a valid identifier.`
      };
    }

    const nodeId = node.id.trim();

    if (nodeMap.has(nodeId)) {
      return {
        isValid: false,
        error: `Duplicate node ID detected: "${nodeId}". Every node must have a unique identifier.`
      };
    }

    nodeMap.set(nodeId, node);
    inDegree.set(nodeId, 0);
    adjacency.set(nodeId, []);
  }

  // 2. Validate edge integrity and construct adjacency graph
  const seenEdges = new Set();

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!edge || typeof edge !== 'object') {
      return {
        isValid: false,
        error: `Invalid edge structure encountered at index ${i}.`
      };
    }

    const source = edge.source?.trim?.();
    const target = edge.target?.trim?.();

    if (!source || !target) {
      return {
        isValid: false,
        error: `Edge at index ${i} must specify both source and target node identifiers.`
      };
    }

    if (source === target) {
      return {
        isValid: false,
        error: `Self-referencing loop detected on node "${source}". A node cannot connect to itself.`
      };
    }

    if (!nodeMap.has(source)) {
      return {
        isValid: false,
        error: `Edge references non-existent source node "${source}".`
      };
    }

    if (!nodeMap.has(target)) {
      return {
        isValid: false,
        error: `Edge references non-existent target node "${target}".`
      };
    }

    // Avoid duplicate parallel edges affecting in-degree calculations
    const edgeKey = `${source}->${target}`;
    if (!seenEdges.has(edgeKey)) {
      seenEdges.add(edgeKey);
      adjacency.get(source).push(target);
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }

  // 3. Deterministic Kahn's Algorithm for Topological Sorting & Cycle Detection
  // Collect all nodes with in-degree 0 (supports multiple start nodes)
  const availableQueue = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      availableQueue.push(nodeId);
    }
  }

  // Sort initially for deterministic ordering
  availableQueue.sort();

  const sortedNodeIds = [];

  while (availableQueue.length > 0) {
    // Pick the next available node deterministically
    availableQueue.sort();
    const currentId = availableQueue.shift();
    sortedNodeIds.push(currentId);

    const neighbors = adjacency.get(currentId) || [];
    for (const neighborId of neighbors) {
      const updatedDegree = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, updatedDegree);
      if (updatedDegree === 0) {
        availableQueue.push(neighborId);
      }
    }
  }

  // 4. Verify no cycles exist
  if (sortedNodeIds.length !== nodes.length) {
    return {
      isValid: false,
      error: 'Graph contains a cycle or circular dependency. Workflows must be Directed Acyclic Graphs (DAG).'
    };
  }

  // Map sorted IDs back to original node objects
  const executionOrder = sortedNodeIds.map((id) => nodeMap.get(id));

  return {
    isValid: true,
    executionOrder
  };
};
