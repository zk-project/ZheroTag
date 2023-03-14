include "../node_modules/circomlib/circuits/poseidon.circom";

template Move() {
    signal input xOld;
    signal input yOld;
    signal input saltOld;
    signal input posHashOld;

    signal input xNew;
    signal input yNew;
    signal input saltNew;
    signal output posHashNew;

    component oldHashChecker = Poseidon(3);
    oldHashChecker.inputs[0] <== xOld;
    oldHashChecker.inputs[1] <== yOld;
    oldHashChecker.inputs[2] <== saltOld;
    posHashOld === oldHashChecker.out;

    component newHashGenerator = Poseidon(3);
    newHashGenerator.inputs[0] <== xNew;
    newHashGenerator.inputs[1] <== yNew;
    newHashGenerator.inputs[2] <== saltNew;
    posHashNew <== newHashGenerator.out;
}

component main {public [posHashOld]} = Move();
