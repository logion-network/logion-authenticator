import { DateTime } from "luxon";
import PeerId from "peer-id";
import { KeyObject } from "crypto";
import { SignJWT, decodeJwt, jwtVerify, JWTPayload } from "jose";
import { JWTVerifyResult } from "jose/dist/types/types";

import { AuthenticatorConfig } from "./Config.js";
import { NodeSigner } from "./NodeSigner.js";
import { AuthenticatedUser } from "./AuthenticatedUser.js";
import { SignedSession } from "./Session.js";
import { SignatureType } from "./Signature.js";
import { AccountId, AccountType } from "@logion/node-api";

export interface Token extends AccountId {
    readonly value: string;
    readonly expiredOn: DateTime;
}

export class Authenticator {

    async createTokens(signedSession: SignedSession, issuedAt: DateTime): Promise<Token[]> {
        const tokens: Token[] = [];
        for (const sessionSignature of signedSession.signatures) {
            const address: AccountId = {
                type: this.toAddressType(sessionSignature.type),
                address: sessionSignature.address
            }
            tokens.push(await this._createToken(address, issuedAt));
        }
        return tokens;
    }

    private async _createToken(address: AccountId, issuedAt: DateTime): Promise<Token> {
        const now = Math.floor(issuedAt.toSeconds());
        const expiredOn = now + this.config.jwtTimeToLive.as("seconds");
        const payload = {
            addressType: address.type
        }
        const encodedToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: Authenticator.ALGORITHM })
            .setIssuedAt(now)
            .setExpirationTime(expiredOn)
            .setIssuer(this.config.nodePeerId.toB58String())
            .setSubject(address.address)
            .sign(this.privateKey);
        return {
            ...address,
            value: encodedToken,
            expiredOn: DateTime.fromSeconds(expiredOn),
        };
    }

    private toAddressType(signatureType: SignatureType): AccountType {
        if (signatureType === "POLKADOT") {
            return "Polkadot";
        } else if (signatureType === "MULTIVERSX") {
            return "Bech32";
        } else { // *ETHEREUM
            return "Ethereum";
        }
    }

    async ensureAuthenticatedUserOrThrow(jwtToken: string): Promise<AuthenticatedUser> {
        const account = await this.validTokenOrThrow(jwtToken);
        return new AuthenticatedUser(
            account,
            this.config.nodeOwner,
            this.config.authorityService,
            this.config.errorFactory
        );
    }

    private async validTokenOrThrow(jwtToken: string): Promise<AccountId> {
        let payload: JWTPayload;
        try {
            payload = decodeJwt(jwtToken)
        } catch (error) {
            throw this.config.errorFactory.unauthorized("" + error)
        }
        const issuer = payload.iss ? PeerId.createFromB58String(payload.iss) : undefined;
        if (!issuer || ! await this.config.authorityService.isLegalOfficerNode(issuer)) {
            throw this.config.errorFactory.unauthorized("Invalid issuer");
        }

        const publicKey = this.signer.buildPublicJsonWebKey(issuer);
        let result: JWTVerifyResult;
        try {
            result = await jwtVerify(jwtToken, publicKey, { algorithms: [ Authenticator.ALGORITHM ] });
        } catch (error) {
            throw this.config.errorFactory.unauthorized("" + error)
        }
        const address = result.payload.sub;
        if (!address) {
            throw this.config.errorFactory.unauthorized("Unable to find issuer in payload");
        }
        return {
            address,
            type: this.validAddressTypeOrThrow(payload.addressType),
        }
    }

    validAddressTypeOrThrow(addressType: unknown): AccountType {
        if (addressType === "Polkadot" || addressType === "Ethereum" || addressType === "Bech32") {
            return addressType;
        }
        throw this.config.errorFactory.unauthorized("Unable to find supported address type in payload");
    }

    async refreshToken(jwtToken: string): Promise<Token> {
        const address = await this.validTokenOrThrow(jwtToken);
        return await this._createToken(address, DateTime.now());
    }

    constructor(config: AuthenticatorConfig) {
        this.config = config;
        this.signer = new NodeSigner();
        this.privateKey = this.signer.buildPrivateJsonWebKey(
            config.nodePeerId,
            config.nodeKey,
        );
    }

    static readonly ALGORITHM = "EdDSA";

    private readonly privateKey: KeyObject;
    private readonly config: AuthenticatorConfig;
    private readonly signer: NodeSigner;
}
