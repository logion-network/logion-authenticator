import { AuthorityService, ErrorFactory } from "./Config.js";
import { ValidAccountId, AnyAccountId, AccountId } from "@logion/node-api";
import { AccountType } from "@logion/node-api/dist/types/Types";

export class AuthenticatedUser implements AccountId {

    constructor(
        accountId: AccountId,
        nodeOwner: ValidAccountId | undefined,
        authorityService: AuthorityService,
        errorFactory: ErrorFactory,
    ) {
        this.validAccountId = new AnyAccountId(accountId.address, accountId.type).toValidAccountId();
        this.nodeOwner = nodeOwner;
        this.authorityService = authorityService;
        this.errorFactory = errorFactory;
    }

    isPolkadot(): boolean {
        return this.type === "Polkadot";
    }

    isNodeOwner(): boolean {
        return this.isPolkadot() && this.nodeOwner?.equals(this) || false;
    }

    async isLegalOfficer(): Promise<boolean> {
        return this.isPolkadot() && await this.authorityService.isLegalOfficer(this.validAccountId);
    }

    is(validAccountId: ValidAccountId | undefined | null): boolean {
        return this.validAccountId.equals(validAccountId);
    }

    require(predicate: (check: AuthenticatedUser) => boolean, message?: string): AuthenticatedUser {
        if(!predicate(this)) {
            throw this.errorFactory.unauthorized(message || "Unauthorized");
        }
        return this;
    }

    async requireLegalOfficerOnNode(message?: string): Promise<AuthenticatedUser> {
        if (! (this.isPolkadot() && await this.authorityService.isLegalOfficerOnNode(this.validAccountId))) {
            throw this.errorFactory.unauthorized(message || "Authenticated User is not Legal Officer on this node.");
        }
        return this;
    }

    isOneOf(accountIds: (ValidAccountId | undefined | null)[]): boolean {
        return accountIds.some(accountId => this.is(accountId));
    }

    get address(): string {
        return this.validAccountId.address;
    }

    get type(): AccountType {
        return this.validAccountId.type;
    }

    readonly validAccountId: ValidAccountId;
    private readonly nodeOwner?: ValidAccountId;
    private readonly authorityService: AuthorityService;
    private readonly errorFactory: ErrorFactory;
}
