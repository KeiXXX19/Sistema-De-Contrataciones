import { AggregateRoot, DomainEvent, UniqueEntityID, IEventBroker } from '@platform/shared-kernel';
export type UserRole = 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'USER';
export declare class Email {
    private readonly _value;
    constructor(value: string);
    get value(): string;
}
export declare class PasswordHash {
    private readonly _value;
    private constructor();
    static fromPlain(password: string): Promise<PasswordHash>;
    get value(): string;
    equals(other: PasswordHash): boolean;
}
export interface UserProps {
    name: string;
    email: Email;
    role: UserRole;
    isVerified: boolean;
    isBlocked: boolean;
    blockedReason?: string;
    createdAt: Date;
    passwordHash?: PasswordHash;
    lastLoginAt?: Date;
}
export declare class UserRegisteredEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        userId: string;
        name: string;
        email: string;
        role: UserRole;
        isVerified: boolean;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "user.registered";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        userId: string;
        name: string;
        email: string;
        role: UserRole;
        isVerified: boolean;
    });
}
export declare class UserVerifiedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        userId: string;
        email: string;
        verifiedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "user.verified";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        userId: string;
        email: string;
        verifiedAt: Date;
    });
}
export declare class UserLoggedInEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        userId: string;
        email: string;
        role: UserRole;
        loggedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "user.logged_in";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        userId: string;
        email: string;
        role: UserRole;
        loggedAt: Date;
    });
}
export declare class UserBlockedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        userId: string;
        email: string;
        actorId: string;
        reason?: string;
        blockedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "user.blocked";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        userId: string;
        email: string;
        actorId: string;
        reason?: string;
        blockedAt: Date;
    });
}
export declare class UserUnblockedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        userId: string;
        email: string;
        actorId: string;
        unblockedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "user.unblocked";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        userId: string;
        email: string;
        actorId: string;
        unblockedAt: Date;
    });
}
export declare class User extends AggregateRoot<UserProps> {
    private constructor();
    static create(props: {
        name: string;
        email: string;
        role: UserRole;
        passwordHash?: PasswordHash;
    }, id?: UniqueEntityID): User;
    get name(): string;
    get email(): Email;
    get role(): UserRole;
    get isVerified(): boolean;
    get isBlocked(): boolean;
    get blockedReason(): string | undefined;
    get createdAt(): Date;
    get lastLoginAt(): Date | undefined;
    hasCredentials(): boolean;
    matchesPassword(hash: PasswordHash): boolean;
    recordLogin(): void;
    verifyIdentity(): void;
    assignRole(newRole: UserRole): void;
    block(actorId: string, reason?: string): void;
    unblock(actorId: string): void;
}
export interface IUserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(): Promise<User[]>;
}
export interface RegisterUserDTO {
    name: string;
    email: string;
    role: UserRole;
    password?: string;
}
export interface LoginDTO {
    email: string;
    password: string;
}
export interface LoginWithGoogleDTO {
    name: string;
    email: string;
    role?: UserRole;
}
export interface UserResponseDTO {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    isBlocked: boolean;
    createdAt: Date;
}
export declare class RegisterUserUseCase {
    private readonly userRepo;
    private readonly eventBroker;
    constructor(userRepo: IUserRepository, eventBroker: IEventBroker);
    execute(dto: RegisterUserDTO): Promise<UserResponseDTO>;
}
export declare class LoginUseCase {
    private readonly userRepo;
    private readonly eventBroker;
    constructor(userRepo: IUserRepository, eventBroker: IEventBroker);
    execute(dto: LoginDTO): Promise<UserResponseDTO>;
}
export declare class LoginWithGoogleUseCase {
    private readonly userRepo;
    private readonly eventBroker;
    constructor(userRepo: IUserRepository, eventBroker: IEventBroker);
    execute(dto: LoginWithGoogleDTO): Promise<UserResponseDTO>;
}
export declare class VerifyUserUseCase {
    private readonly userRepo;
    private readonly eventBroker;
    constructor(userRepo: IUserRepository, eventBroker: IEventBroker);
    execute(userId: string): Promise<UserResponseDTO>;
}
export declare class GetUserProfileUseCase {
    private readonly userRepo;
    constructor(userRepo: IUserRepository);
    execute(userId: string): Promise<UserResponseDTO>;
}
export declare class ListUsersUseCase {
    private readonly userRepo;
    constructor(userRepo: IUserRepository);
    execute(): Promise<UserResponseDTO[]>;
}
export interface AdminUserActionDTO {
    userId: string;
    adminId: string;
    reason?: string;
}
export declare class BlockUserUseCase {
    private readonly userRepo;
    private readonly eventBroker;
    constructor(userRepo: IUserRepository, eventBroker: IEventBroker);
    execute(dto: AdminUserActionDTO): Promise<UserResponseDTO>;
}
export declare class UnblockUserUseCase {
    private readonly userRepo;
    private readonly eventBroker;
    constructor(userRepo: IUserRepository, eventBroker: IEventBroker);
    execute(dto: Omit<AdminUserActionDTO, 'reason'>): Promise<UserResponseDTO>;
}
export declare class InMemoryUserRepository implements IUserRepository {
    private users;
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    clear(): void;
}
export declare class UserController {
    private readonly registerUseCase;
    private readonly loginUseCase;
    private readonly verifyUseCase;
    private readonly getProfileUseCase;
    private readonly listUsersUseCase?;
    private readonly blockUserUseCase?;
    private readonly unblockUserUseCase?;
    private readonly loginWithGoogleUseCase?;
    constructor(registerUseCase: RegisterUserUseCase, loginUseCase: LoginUseCase, verifyUseCase: VerifyUserUseCase, getProfileUseCase: GetUserProfileUseCase, listUsersUseCase?: ListUsersUseCase | undefined, blockUserUseCase?: BlockUserUseCase | undefined, unblockUserUseCase?: UnblockUserUseCase | undefined, loginWithGoogleUseCase?: LoginWithGoogleUseCase | undefined);
    handleGoogleLogin(body: LoginWithGoogleDTO): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleRegister(body: RegisterUserDTO): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleLogin(body: LoginDTO): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleVerify(userId: string): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleGetProfile(userId: string): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleListUsers(): Promise<{
        statusCode: number;
        data: UserResponseDTO[];
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleBlock(body: AdminUserActionDTO): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleUnblock(body: {
        userId: string;
        adminId: string;
    }): Promise<{
        statusCode: number;
        data: UserResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
}
