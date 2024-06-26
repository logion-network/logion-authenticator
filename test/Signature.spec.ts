import { It, Mock } from "moq.ts";
import {
    CrossmintSignatureService,
    EthereumSignatureService,
    PolkadotSignatureService,
    SignatureService,
    VerifyFunction,
    VerifyFunctionParams,
    MultiversxSignatureService
} from "../src/index.js";

describe('SignatureService', () => {

    it('verifies with valid input', async () => testVerify({
        expectedResult: true,
        expectedMessage: "SdPF9uK+K2RNcs0m0OYPXTTNUhJ06/+v8CcZrv9f8jo=",
        attributes: ["abcd"],
    }));

    it('rejects with invalid input', async () => testVerify({
        expectedResult: false,
        expectedMessage: "",
        attributes: ["abcd"],
    }));

    it('verifies with no attributes', async () => testVerify({
        expectedResult: true,
        expectedMessage: "CjwOkiDFvZWqt+uZYPktkdggygroB60g0mVn7QxyZm8=",
        attributes: [],
    }));

    it('rejects with no message nor attributes', async () => testVerify({
        expectedResult: false,
        expectedMessage: "",
        attributes: [],
    }));

    it('verifies with mixed attributes', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: ["abc", 123, true],
    }));

    it('verifies with mixed attributes and full nesting', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: [["abc", 123, true]],
    }));

    it('verifies with mixed attributes and partial nesting 1', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: [["abc", 123], true],
    }));

    it('verifies with mixed attributes and partial nesting 2', async () => testVerify({
        expectedResult: true,
        expectedMessage: MIXED_ATTRIBUTES_MESSAGE,
        attributes: ["abc", [123, true]],
    }));

    it('verifies with valid input', async () => testVerifyV2({
        expectedResult: true,
        expectedMessage: "logion-auth: a24921dc-5c72-4823-a13b-746a5dad0707 on 2021-05-10T00:00",
        sessionId: "a24921dc-5c72-4823-a13b-746a5dad0707",
        timestamp: "2021-05-10T00:00",
    }));

    it('rejects with invalid input', async () => testVerifyV2({
        expectedResult: false,
        expectedMessage: "",
        sessionId: "a24921dc-5c72-4823-a13b-746a5dad0707",
        timestamp: "2021-05-10T00:00",
    }));
});

const MIXED_ATTRIBUTES_MESSAGE = "FtvKwzH/OdYXynVMDeOh6WD77O5gYD8LtDzs5qqDf2U=";
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

async function testVerify(params: {
    expectedResult: boolean;
    expectedMessage: string;
    attributes: any[];
}) {
    const verifier = new Mock<VerifyFunction>();
    const signature = "signature";
    const expectedMessage = params.expectedMessage;
    verifier.setup(instance => instance(It.Is<VerifyFunctionParams>(params =>
            params.signature === signature
            && params.address === BOB
            && params.message === expectedMessage
        )
    )).returns(Promise.resolve(true));
    const service = new SignatureService(verifier.object());

    const result = await service.verify({
        signature,
        address: BOB,
        operation: "operation",
        resource: "resource",
        timestamp: "2021-05-10T00:00",
        attributes: params.attributes
    })

    expect(result || false).toBe(params.expectedResult);
}

async function testVerifyV2(params: {
    expectedResult: boolean;
    expectedMessage: string;
    sessionId: string;
    timestamp: string;
}) {
    const verifier = new Mock<VerifyFunction>();
    const signature = "signature";
    const { expectedMessage, timestamp, sessionId } = params;
    verifier.setup(instance => instance(It.Is<VerifyFunctionParams>(params =>
            params.signature === signature
            && params.address === BOB
            && params.message === expectedMessage
        )
    )).returns(Promise.resolve(true));
    const service = new SignatureService(verifier.object());

    const result = await service.verifyV2({
        signature,
        address: BOB,
        timestamp ,
        sessionId,
    })

    expect(result || false).toBe(params.expectedResult);
}

describe("EthereumSignatureService", () => {

    const params = {
        address: "0x6ef154673a6379b2CDEDeD6aF1c0d705c3c8272a",
        resource: "authentication",
        operation: "login",
        timestamp: "2022-07-21T15:42:36.653+02:00",
        attributes: [ "a0a9c8f5-743a-458e-8592-dd702bd9b58b" ]
    };

    const signatureService = new EthereumSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x38fe0c82e7f0fbdcb4c66467fb65360af6ed6384f375968913befe4d2663769f5e8a82982431ef4e0e51186e9a569f2fa485f534b90ba791676ac4f9083456e51c",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })
});

describe("PolkadotSignatureService", () => {

    const params = {
        address: "5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn",
        resource: "authentication",
        operation: "login",
        timestamp: "2022-07-21T15:42:36.653Z",
        attributes: [ "a0a9c8f5-743a-458e-8592-dd702bd9b58b" ]
    };

    const signatureService = new PolkadotSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x2c88db66ecf845896e1ba4c9fd02ebcb5ab5b84007b45edca6f0836007763c3fb1239824f07372dd41696e1f6558a700cd2c1a7b15fdb06e2041dd3b9878b988",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })

    const paramsV2 = {
        address: "5DPLBrBxniGbGdFe1Lmdpkt6K3aNjhoNPJrSJ51rwcmhH2Tn",
        timestamp: "2022-07-21T15:42:36.653Z",
        sessionId: "a0a9c8f5-743a-458e-8592-dd702bd9b58b",
    }

    it("verifies valid signature V2", async () => {
        expect(await signatureService.verifyV2({
            ...paramsV2,
            signature: "0x6e8387fb70a5375b1986180f771bdc93de1c90a04dd88ff0ca190ed5c365e65289a79ae2240fcf4429759677ff410669e120eaf6430db039a63d2825cbe43f88",
        })).toBeTrue();
    })

    it("fails to verify invalid signature V2", async () => {
        expect(await signatureService.verifyV2({
            ...paramsV2,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })
});

describe("CrossmintSignatureService", () => {

    const params = {
        address: "0xb21edd3dc671484F34075B038a68A76F6362F980",
        resource: "authentication",
        operation: "login",
        timestamp: "2022-09-21T16:31:38.464+02:00",
        attributes: [ "2afe2730-08ad-4409-8ea4-265ea28a699b" ]
    };

    const signatureService = new CrossmintSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x4ce607efd5f846bcb3a5e09393c78f9444f82b846db8350040180f007434fc0d721c82eee2e6d61e9631b4948daa398113c4177f775b8a3cb0fe95ade4cedebb1c",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b61c",
        })).toBeFalse();
    })
});

describe("MultiversxSignatureService", () => {

    const params = {
        address: "erd1urwqlj8rp3xlpqvu7stcsjsxyhs3skgy0exvly3hr7g92yjeey3sqpvkyx",
        resource: "authentication",
        operation: "login",
        timestamp: "2023-06-30T17:03:36.606+02:00",
        attributes: [ "f7cdd2dd-3dfc-438c-a4a5-ea7a945f5c54" ]
    };

    const signatureService = new MultiversxSignatureService();

    it("verifies valid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0xacc3df4c471b3d1604c3b1a284997f03bceee6255f5583e4cb843d2ab9068dee5ce60dccd5d27eb450b5fa737d231d57f068a792ef9d686d0c88e07b26f9a908",
        })).toBeTrue();
    })

    it("fails to verify invalid signature", async () => {
        expect(await signatureService.verify({
            ...params,
            signature: "0x8807227a68aecb8012994fa6197b36ffa50fe8510edb6ce3f78073deed022da05c272ec6f330f67b1fe6729eb3b66129daa506c18e8ab5eec96b8420711150b6",
        })).toBeFalse();
    })
});
