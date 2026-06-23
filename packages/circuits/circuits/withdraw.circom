pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

// commitment   = Poseidon(nullifier, secret)
// nullifierHash = Poseidon(nullifier)
template CommitmentHasher() {
    signal input nullifier;
    signal input secret;
    signal output commitment;
    signal output nullifierHash;

    component commitmentHasher = Poseidon(2);
    component nullifierHasher = Poseidon(1);

    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    nullifierHasher.inputs[0] <== nullifier;

    commitment <== commitmentHasher.out;
    nullifierHash <== nullifierHasher.out;
}

// One Merkle level. pathIndex == 0 -> current node is the left child.
template MerkleLevel() {
    signal input in;
    signal input pathElement;
    signal input pathIndex;
    signal output out;

    // pathIndex is a bit
    pathIndex * (1 - pathIndex) === 0;

    signal left;
    signal right;
    left  <== in + pathIndex * (pathElement - in);
    right <== pathElement + pathIndex * (in - pathElement);

    component hasher = Poseidon(2);
    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;
    out <== hasher.out;
}

// Proves `leaf` is a member of the tree with the given `root`.
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component levelHashers[levels];
    for (var i = 0; i < levels; i++) {
        levelHashers[i] = MerkleLevel();
        levelHashers[i].pathElement <== pathElements[i];
        levelHashers[i].pathIndex <== pathIndices[i];
        if (i == 0) {
            levelHashers[i].in <== leaf;
        } else {
            levelHashers[i].in <== levelHashers[i - 1].out;
        }
    }

    root === levelHashers[levels - 1].out;
}

// Withdraw: prove knowledge of a (nullifier, secret) whose commitment is in the
// tree, reveal only the nullifierHash (to prevent double-spend) and bind the
// proof to a recipient. The secret never leaves the prover.
template Withdraw(levels) {
    // public
    signal input root;
    signal input nullifierHash;
    signal input recipient;

    // private
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;
    hasher.nullifierHash === nullifierHash;

    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // Bind `recipient` into the constraint system so a relayer cannot re-target
    // the proof to a different address (standard anti-tamper square).
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

component main {public [root, nullifierHash, recipient]} = Withdraw(20);
