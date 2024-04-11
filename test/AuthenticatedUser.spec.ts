import { It, Mock } from "moq.ts";
import { AuthenticatedUser, AuthorityService } from "../src/index.js";
import { AccountType, ValidAccountId, AnyAccountId } from "@logion/node-api";

const ALICE = ValidAccountId.polkadot("vQx5kESPn8dWyX4KxMCKqUyCaWUwtui1isX6PVNcZh2Ghjitr");
const USER_POLKADOT_ADDRESS = "vQxHAE33LeJYV69GCB4o4YcCgnDu8y99u5hy2751fRdxjX9kz"
const USER_ETHEREUM_ADDRESS = "0x590E9c11b1c2f20210b9b84dc2417B4A7955d4e6"
const SOME_OTHER_USER = "5E4cdkKrh19n75jUrDDrs3RBc1yvt4XqYZux8piEXnsc1Et7";

describe('AuthenticatedUser', () => {

    it('does not authenticate user different from token', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(newValidAccountId(SOME_OTHER_USER))).toBe(false);
    })

    it('does not authenticate null user', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(null)).toBe(false);
    })

    it('does not authenticate undefined user', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.is(undefined)).toBe(false);
    })

    it('detects not in white list', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isOneOf([ newValidAccountId(SOME_OTHER_USER) ])).toBe(false);
    })

    it('detects in white list', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isOneOf([ newValidAccountId(USER_POLKADOT_ADDRESS) ])).toBe(true);
        expect(authenticatedUser.isPolkadot()).toBe(true);
    })

    it('authenticates legal officer based on token', async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: ALICE.address,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.isNodeOwner()).toBe(true);
    })

    it('detects Ethereum Address', () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ETHEREUM_ADDRESS,
            isWellKnownNode: true,
            addressType: "Ethereum"
        });
        expect(authenticatedUser.isOneOf([ newValidAccountId(USER_ETHEREUM_ADDRESS, "Ethereum") ])).toBe(true);
        expect(authenticatedUser.isPolkadot()).toBe(false);
        expect(authenticatedUser.type).toBe("Ethereum");

    })

    it("builds valid Account ID for Ethereum address", async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_ETHEREUM_ADDRESS,
            isWellKnownNode: true,
            addressType: "Ethereum"
        });
        expect(authenticatedUser.validAccountId.type).toEqual("Ethereum");
        expect(authenticatedUser.validAccountId.address).toEqual(USER_ETHEREUM_ADDRESS);
    })

    it("builds valid Account ID for Polkadot address", async () => {
        const authenticatedUser = buildAuthenticatedUser({
            address: USER_POLKADOT_ADDRESS,
            isWellKnownNode: true,
        });
        expect(authenticatedUser.validAccountId.type).toEqual("Polkadot");
        expect(authenticatedUser.validAccountId.address).toEqual(USER_POLKADOT_ADDRESS);
    })
})

function buildAuthenticatedUser(args: {
    address: string,
    isWellKnownNode?: boolean,
    addressType?: AccountType,
}): AuthenticatedUser {
    const { address, isWellKnownNode, addressType } = args;
    return new AuthenticatedUser(
        newValidAccountId(address, addressType),
        ALICE,
        mockAuthorityService(false, isWellKnownNode),
        {
            unauthorized: (message: string) => new Error(message),
        },
    );
}

function newValidAccountId(address: string, addressType: AccountType = "Polkadot"): ValidAccountId {
    return new AnyAccountId(address, addressType).toValidAccountId();
}

function mockAuthorityService(isLegalOfficer?: boolean, isWellKnownNode = true): AuthorityService {
    const authority = new Mock<AuthorityService>();
    authority.setup(instance => instance.isLegalOfficer(It.IsAny<string>()))
        .returns(Promise.resolve(isLegalOfficer ? isLegalOfficer : false))
        authority.setup(instance => instance.isLegalOfficerNode(It.IsAny<string>()))
        .returns(Promise.resolve(isWellKnownNode))
    return authority.object();
}
