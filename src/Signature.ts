import { recoverAddress } from "@ethersproject/transactions";
import { stringToHex } from "@polkadot/util";
import { signatureVerify } from "@polkadot/util-crypto";
import { waitReady } from "@polkadot/wasm-crypto";
import crypto from 'crypto';
import { sha3 } from "web3-utils";
import { ethers } from "ethers";
import { SignableMessage } from "@multiversx/sdk-core";
import { UserVerifier } from "@multiversx/sdk-wallet";
import { UserAddress } from "@multiversx/sdk-wallet/out/userAddress.js";

export type SignatureType = "ETHEREUM" | "POLKADOT" | "CROSSMINT_ETHEREUM" | "MULTIVERSX";

export interface VerifyParams {
    signature: string;
    address: string;
    resource: string;
    operation: string;
    timestamp: string;
    attributes: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface VerifyParamsV2 {
    signature: string;
    address: string;
    timestamp: string;
    sessionId: string;
}

export interface VerifyFunctionParams {
    signature: string;
    address: string;
    message: string;
}

export type VerifyFunction = (params: VerifyFunctionParams) => Promise<boolean>;

export class SignatureService {

    private readonly verifier: VerifyFunction;

    constructor(verifier: VerifyFunction) {
        this.verifier = verifier;
    }

    buildMessage(params: VerifyParams): string {
        const allAttributes = [
            params.resource,
            params.operation,
            this.sanitizeDateTime(params.timestamp)
        ];
        params.attributes.forEach(attribute => this.pushOrExpand(allAttributes, attribute));
        return sha256(allAttributes);
    }

    buildMessageV2(params: VerifyParamsV2): string {
        return `logion-auth: ${ params.sessionId } on ${ this.sanitizeDateTime(params.timestamp) }`
    }

    async verify(params: VerifyParams): Promise<boolean> {
        const message = this.buildMessage(params);

        const {
            address,
            signature,
        } = params;

        return this.verifier({ message, signature, address })
    }

    async verifyV2(params: VerifyParamsV2): Promise<boolean> {
        const message = this.buildMessageV2(params);
        const {
            address,
            signature,
        } = params;

        return this.verifier({ message, signature, address })
    }

    private sanitizeDateTime(dateTime: string): string {
        if (dateTime.endsWith("Z")) {
            return dateTime.substring(0, dateTime.length - 1);
        } else {
            return dateTime;
        }
    }

    private pushOrExpand(allAttributes: any[], attribute: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Array.isArray(attribute)) {
            attribute.forEach(subAttribute => this.pushOrExpand(allAttributes, subAttribute));
        } else {
            allAttributes.push(attribute);
        }
    }
}

export class PolkadotSignatureService extends SignatureService {

    constructor() {
        super(PolkadotSignatureService.verify);
    }

    private static async verify(params: VerifyFunctionParams): Promise<boolean> {
        await waitReady();
        const message = `<Bytes>${ params.message }</Bytes>`;
        return signatureVerify(message, params.signature, params.address).isValid;
    }
}

export class EthereumSignatureService extends SignatureService {

    constructor() {
        super(EthereumSignatureService.verify);
    }

    private static async verify(params: VerifyFunctionParams): Promise<boolean> {
        const { message, signature, address } = params;
        // sha3 must be applied when using Polkadot extension MetaMask compatibility layer
        // @see https://github.com/polkadot-js/extension/blob/master/packages/extension-compat-metamask/src/bundle.ts#L80
        const digest = sha3(stringToHex(message));
        if(digest) {
            const recoveredAddress = recoverAddress(digest, signature);
            return Promise.resolve(recoveredAddress.toLowerCase() === address.toLowerCase());
        } else {
            throw new Error("Unable to digest message");
        }
    }
}

function sha256(attributes: any[]): string { // eslint-disable-line @typescript-eslint/no-explicit-any
    return hash("sha256", attributes);
}

function hash(algorithm: string, attributes: any[]): string { // eslint-disable-line @typescript-eslint/no-explicit-any
    const hash = crypto.createHash(algorithm);
    attributes.forEach(attribute => hash.update(Buffer.from(attribute.toString(), 'utf8')));
    return hash.digest('base64');
}

export class CrossmintSignatureService extends SignatureService {

    constructor() {
        super(CrossmintSignatureService.verify);
    }

    private static async verify(params: VerifyFunctionParams): Promise<boolean> {
        const { message, signature, address } = params;

        const hexMessage = stringToHex(message);
        const digest = ethers.hashMessage(hexMessage);
        const recoveredAddress = recoverAddress(digest, signature);
        return Promise.resolve(recoveredAddress.toLowerCase() === address.toLowerCase());
    }
}

export class MultiversxSignatureService extends SignatureService {

    constructor() {
        super(MultiversxSignatureService.verify);
    }

    private static async verify(params: VerifyFunctionParams): Promise<boolean> {
        const { message, address } = params;
        const verifier = UserVerifier.fromAddress(UserAddress.fromBech32(address));
        const serializedMessage = new SignableMessage({
            message: Buffer.from(message)
        }).serializeForSigning();
        const signature = Buffer.from(params.signature.substring(2), "hex"); // Prefix "0x" dropped
        return verifier.verify(serializedMessage, signature);
    }
}
