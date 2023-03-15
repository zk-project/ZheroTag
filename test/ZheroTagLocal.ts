import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { int } from "hardhat/internal/core/params/argumentTypes";
import { BigNumber } from "ethers";
import { groth16 } from "snarkjs";
import fs from "fs";

const MOVE_WASM_FILE_PATH = "circuits/move.wasm";
const MOVE_ZKEY_FILE_PATH = "circuits/move.zkey";
const MOVE_VKEY_FILE_PATH = "circuits/move.vkey.json";

const PSI1_WASM_FILE_PATH = "circuits/psi1.wasm";
const PSI1_ZKEY_FILE_PATH = "circuits/psi1.zkey";
const PSI1_VKEY_FILE_PATH = "circuits/psi1.vkey.json";

const PSI2_WASM_FILE_PATH = "circuits/psi2.wasm";
const PSI2_ZKEY_FILE_PATH = "circuits/psi2.zkey";
const PSI2_VKEY_FILE_PATH = "circuits/psi2.vkey.json";

const PSI3_WASM_FILE_PATH = "circuits/psi3.wasm";
const PSI3_ZKEY_FILE_PATH = "circuits/psi3.zkey";
const PSI3_VKEY_FILE_PATH = "circuits/psi3.vkey.json";

import { generateProof } from "./utils/snark-utils";
import { assert } from "console";

// x: 0 y: 0 salt: 12345
// 2321794270632629049109131152230501273451975640760836008986566812209223148844
// x: 1 y: 0 salt: 12345
// 2959444125066675432505877021605296368289181919986985689368402150235280573778
// x: 5 y: 5 salt: 12345
// 9435539296313397007849595282098379346206722261888911142952399734225356376203


describe("ZheroTagLocal", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function fixture() {
        console.log("Running the fixture");
    }
  
    describe("Move", function () {
        it("Basic move", async function () {

            // player 1 starts by making a move
            const moveCircuitInputs = {
                xOld: 0,
                yOld: 0,
                saltOld: 12345,
                posHashOld: BigInt("2321794270632629049109131152230501273451975640760836008986566812209223148844"),
                xNew: 1,
                yNew: 0,
                saltNew: 12345
            }
            const [moveProof, movePublicSignals] = await generateProof(
                moveCircuitInputs,
                MOVE_WASM_FILE_PATH,
                MOVE_ZKEY_FILE_PATH
            );

            //console.log(movePublicSignals);

            // player 2 verifies that player 1's move was valid

            const movevKey = JSON.parse(fs.readFileSync(MOVE_VKEY_FILE_PATH, 'utf-8'));
            const moveres = await groth16.verify(movevKey, movePublicSignals, moveProof);

            assert(moveres === true);

            // ***** start MPC *****

            // PSI1
            const psi1CircuitInputs = {
                x: 1,
                y: 0,
                salt: 12345,
                posHash: BigInt("2959444125066675432505877021605296368289181919986985689368402150235280573778"),
                alpha: BigInt("31475184")
            }
            const [psi1Proof, psi1PublicSignals] = await generateProof(
                psi1CircuitInputs,
                PSI1_WASM_FILE_PATH,
                PSI1_ZKEY_FILE_PATH
            );

            console.log(psi1PublicSignals);

            // player 1 sends psi1PublicSignals to player 2
            // player 2 receives psi1PublicSignals and verifies the proof
            const psi1vKey = JSON.parse(fs.readFileSync(PSI1_VKEY_FILE_PATH, 'utf-8'));
            const psi1res = await groth16.verify(psi1vKey, psi1PublicSignals, psi1Proof);

            assert(psi1res === true);

            // PSI2
            const set1 = psi1PublicSignals.slice(0, 8);

            const psi2CircuitInputs = {
                x: 5,
                y: 5,
                salt: 12345,
                posHash: BigInt("9435539296313397007849595282098379346206722261888911142952399734225356376203"),
                beta: BigInt("18549853174"),
                set1: set1
            }
            const [psi2Proof, psi2PublicSignals] = await generateProof(
                psi2CircuitInputs,
                PSI2_WASM_FILE_PATH,
                PSI2_ZKEY_FILE_PATH
            );

            console.log(psi2PublicSignals);

            // player 2 sends psi2PublicSignals to player 1
            // player 1 receives psi1PublicSignals and verifies the proof
            const psi2vKey = JSON.parse(fs.readFileSync(PSI2_VKEY_FILE_PATH, 'utf-8'));
            const psi2res = await groth16.verify(psi2vKey, psi2PublicSignals, psi2Proof);
            // player 1 also verifies that player 2 reexponentiated the right set
            // ^^^ TODO
            assert(psi2res === true);

            // PSI 3
            const set1_prime = psi2PublicSignals.slice(0, 8);
            const set2 = psi2PublicSignals.slice(8, 9);

            const psi3CircuitInputs = {
                alpha: BigInt("31475184"),
                set1_prime: set1_prime,
                set2: set2
            }
            const [psi3Proof, psi3PublicSignals] = await generateProof(
                psi3CircuitInputs,
                PSI3_WASM_FILE_PATH,
                PSI3_ZKEY_FILE_PATH
            );

            console.log(psi3PublicSignals);

            // player 1 sends psi3PublicSignals to player 2
            // player 2 receives psi1PublicSignals and verifies the proof
            // player 1 and 2 learn whether the game wsa finished or not
            const psi3vKey = JSON.parse(fs.readFileSync(PSI3_VKEY_FILE_PATH, 'utf-8'));
            const psi3res = await groth16.verify(psi3vKey, psi3PublicSignals, psi3Proof);

            assert(psi3res === true);

        });
    
        it("Should set the right owner", async function () {
    
            //expect(await lock.owner()).to.equal(owner.address);
        });
    
        it("Should receive and store the funds to lock", async function () {
    

        });
    });
});
  



// sources: https://betterprogramming.pub/zero-knowledge-proofs-using-snarkjs-and-circom-fac6c4d63202
//          ^^^^ for groth16.verify