import { AggregateRoot } from '@platform/shared-kernel';
export class Email {
    _value;
    constructor(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value)) {
            throw new Error(`Email inválido: ${value}`);
        }
        this._value = value.toLowerCase().trim();
    }
    get value() {
        return this._value;
    }
}
export class PasswordHash {
    _value;
    constructor(_value) {
        this._value = _value;
    }
    static async fromPlain(password) {
        if (!password || password.length < 8) {
            throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
        const data = new TextEncoder().encode(password);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const hash = Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
        return new PasswordHash(hash);
    }
    get value() {
        return this._value;
    }
    equals(other) {
        return this._value === other._value;
    }
}
export class UserRegisteredEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'user.registered';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class UserVerifiedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'user.verified';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class UserLoggedInEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'user.logged_in';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class UserBlockedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'user.blocked';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class UserUnblockedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'user.unblocked';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class User extends AggregateRoot {
    constructor(props, id) {
        super(props, id);
    }
    static create(props, id) {
        if (!props.name || props.name.trim().length < 2) {
            throw new Error('El nombre de usuario debe tener al menos 2 caracteres');
        }
        const emailVO = new Email(props.email);
        const user = new User({
            name: props.name.trim(),
            email: emailVO,
            role: props.role,
            isVerified: false,
            isBlocked: false,
            createdAt: new Date(),
            passwordHash: props.passwordHash,
        }, id);
        user.addDomainEvent(new UserRegisteredEvent(user.id.toString(), {
            userId: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
        }));
        return user;
    }
    get name() {
        return this.props.name;
    }
    get email() {
        return this.props.email;
    }
    get role() {
        return this.props.role;
    }
    get isVerified() {
        return this.props.isVerified;
    }
    get isBlocked() {
        return this.props.isBlocked;
    }
    get blockedReason() {
        return this.props.blockedReason;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get lastLoginAt() {
        return this.props.lastLoginAt;
    }
    hasCredentials() {
        return this.props.passwordHash !== undefined;
    }
    matchesPassword(hash) {
        return this.props.passwordHash ? this.props.passwordHash.equals(hash) : false;
    }
    recordLogin() {
        this.props.lastLoginAt = new Date();
        this.addDomainEvent(new UserLoggedInEvent(this.id.toString(), {
            userId: this.id.toString(),
            email: this.email.value,
            role: this.role,
            loggedAt: new Date(),
        }));
    }
    verifyIdentity() {
        if (this.props.isVerified) {
            throw new Error('El usuario ya se encuentra verificado');
        }
        this.props.isVerified = true;
        this.addDomainEvent(new UserVerifiedEvent(this.id.toString(), {
            userId: this.id.toString(),
            email: this.email.value,
            verifiedAt: new Date(),
        }));
    }
    assignRole(newRole) {
        this.props.role = newRole;
    }
    block(actorId, reason) {
        if (this.props.role === 'ADMIN') {
            throw new Error('No se puede bloquear a un usuario administrador');
        }
        if (this.props.isBlocked) {
            throw new Error('El usuario ya se encuentra bloqueado');
        }
        if (!actorId) {
            throw new Error('Se requiere identificar al administrador que bloquea');
        }
        this.props.isBlocked = true;
        this.props.blockedReason = reason?.trim() || undefined;
        this.addDomainEvent(new UserBlockedEvent(this.id.toString(), {
            userId: this.id.toString(),
            email: this.email.value,
            actorId,
            reason: this.props.blockedReason,
            blockedAt: new Date(),
        }));
    }
    unblock(actorId) {
        if (!this.props.isBlocked) {
            throw new Error('El usuario no se encuentra bloqueado');
        }
        if (!actorId) {
            throw new Error('Se requiere identificar al administrador que desbloquea');
        }
        this.props.isBlocked = false;
        this.props.blockedReason = undefined;
        this.addDomainEvent(new UserUnblockedEvent(this.id.toString(), {
            userId: this.id.toString(),
            email: this.email.value,
            actorId,
            unblockedAt: new Date(),
        }));
    }
}
// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class RegisterUserUseCase {
    userRepo;
    eventBroker;
    constructor(userRepo, eventBroker) {
        this.userRepo = userRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const existing = await this.userRepo.findByEmail(dto.email);
        if (existing) {
            throw new Error(`El email ${dto.email} ya está registrado`);
        }
        const passwordHash = dto.password ? await PasswordHash.fromPlain(dto.password) : undefined;
        const user = User.create({
            name: dto.name,
            email: dto.email,
            role: dto.role,
            passwordHash,
        });
        await this.userRepo.save(user);
        await this.eventBroker.publishAll(user.domainEvents);
        user.clearDomainEvents();
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
export class LoginUseCase {
    userRepo;
    eventBroker;
    constructor(userRepo, eventBroker) {
        this.userRepo = userRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const user = await this.userRepo.findByEmail(dto.email);
        if (!user || !user.hasCredentials()) {
            throw new Error('Credenciales inválidas');
        }
        let intentHash;
        try {
            intentHash = await PasswordHash.fromPlain(dto.password);
        }
        catch {
            throw new Error('Credenciales inválidas');
        }
        if (!user.matchesPassword(intentHash)) {
            throw new Error('Credenciales inválidas');
        }
        if (user.isBlocked) {
            throw new Error('La cuenta está bloqueada. Comuníquese con el administrador.');
        }
        user.recordLogin();
        await this.userRepo.save(user);
        await this.eventBroker.publishAll(user.domainEvents);
        user.clearDomainEvents();
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
export class LoginWithGoogleUseCase {
    userRepo;
    eventBroker;
    constructor(userRepo, eventBroker) {
        this.userRepo = userRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const emailNorm = dto.email.toLowerCase().trim();
        const esAdminPrincipal = emailNorm === 'hkeiner663@gmail.com';
        let user = await this.userRepo.findByEmail(dto.email);
        if (user) {
            if (user.isBlocked) {
                throw new Error('La cuenta está bloqueada. Comuníquese con el administrador.');
            }
            if (esAdminPrincipal && user.role !== 'ADMIN') {
                user.assignRole('ADMIN');
            }
            if (!user.isVerified) {
                user.verifyIdentity();
            }
        }
        else {
            user = User.create({
                name: dto.name || (esAdminPrincipal ? 'Keiner (Admin Principal)' : dto.email.split('@')[0]),
                email: dto.email,
                role: esAdminPrincipal ? 'ADMIN' : (dto.role || 'CLIENT'),
            });
            user.verifyIdentity();
        }
        user.recordLogin();
        await this.userRepo.save(user);
        await this.eventBroker.publishAll(user.domainEvents);
        user.clearDomainEvents();
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
export class VerifyUserUseCase {
    userRepo;
    eventBroker;
    constructor(userRepo, eventBroker) {
        this.userRepo = userRepo;
        this.eventBroker = eventBroker;
    }
    async execute(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error(`Usuario con ID ${userId} no encontrado`);
        }
        user.verifyIdentity();
        await this.userRepo.save(user);
        await this.eventBroker.publishAll(user.domainEvents);
        user.clearDomainEvents();
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
export class GetUserProfileUseCase {
    userRepo;
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async execute(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error(`Usuario con ID ${userId} no encontrado`);
        }
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
export class ListUsersUseCase {
    userRepo;
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async execute() {
        const users = await this.userRepo.findAll();
        return users.map((user) => ({
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        }));
    }
}
export class BlockUserUseCase {
    userRepo;
    eventBroker;
    constructor(userRepo, eventBroker) {
        this.userRepo = userRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        if (dto.adminId === dto.userId) {
            throw new Error('El administrador no puede bloquear su propia cuenta');
        }
        const user = await this.userRepo.findById(dto.userId);
        if (!user) {
            throw new Error(`Usuario con ID ${dto.userId} no encontrado`);
        }
        user.block(dto.adminId, dto.reason);
        await this.userRepo.save(user);
        await this.eventBroker.publishAll(user.domainEvents);
        user.clearDomainEvents();
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
export class UnblockUserUseCase {
    userRepo;
    eventBroker;
    constructor(userRepo, eventBroker) {
        this.userRepo = userRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const user = await this.userRepo.findById(dto.userId);
        if (!user) {
            throw new Error(`Usuario con ID ${dto.userId} no encontrado`);
        }
        user.unblock(dto.adminId);
        await this.userRepo.save(user);
        await this.eventBroker.publishAll(user.domainEvents);
        user.clearDomainEvents();
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email.value,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };
    }
}
// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryUserRepository {
    users = new Map();
    async save(user) {
        this.users.set(user.id.toString(), user);
    }
    async findById(id) {
        return this.users.get(id) || null;
    }
    async findByEmail(email) {
        const cleanEmail = email.toLowerCase().trim();
        for (const user of this.users.values()) {
            if (user.email.value === cleanEmail) {
                return user;
            }
        }
        return null;
    }
    async findAll() {
        return Array.from(this.users.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    clear() {
        this.users.clear();
    }
}
export class UserController {
    registerUseCase;
    loginUseCase;
    verifyUseCase;
    getProfileUseCase;
    listUsersUseCase;
    blockUserUseCase;
    unblockUserUseCase;
    loginWithGoogleUseCase;
    constructor(registerUseCase, loginUseCase, verifyUseCase, getProfileUseCase, listUsersUseCase, blockUserUseCase, unblockUserUseCase, loginWithGoogleUseCase) {
        this.registerUseCase = registerUseCase;
        this.loginUseCase = loginUseCase;
        this.verifyUseCase = verifyUseCase;
        this.getProfileUseCase = getProfileUseCase;
        this.listUsersUseCase = listUsersUseCase;
        this.blockUserUseCase = blockUserUseCase;
        this.unblockUserUseCase = unblockUserUseCase;
        this.loginWithGoogleUseCase = loginWithGoogleUseCase;
    }
    async handleGoogleLogin(body) {
        if (!this.loginWithGoogleUseCase) {
            return { statusCode: 501, error: 'Inicio de sesión con Google no configurado' };
        }
        try {
            const user = await this.loginWithGoogleUseCase.execute(body);
            return { statusCode: 200, data: user };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleRegister(body) {
        try {
            const user = await this.registerUseCase.execute(body);
            return { statusCode: 201, data: user };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleLogin(body) {
        try {
            const user = await this.loginUseCase.execute(body);
            return { statusCode: 200, data: user };
        }
        catch (err) {
            return { statusCode: 401, error: err.message };
        }
    }
    async handleVerify(userId) {
        try {
            const user = await this.verifyUseCase.execute(userId);
            return { statusCode: 200, data: user };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleGetProfile(userId) {
        try {
            const user = await this.getProfileUseCase.execute(userId);
            return { statusCode: 200, data: user };
        }
        catch (err) {
            return { statusCode: 404, error: err.message };
        }
    }
    async handleListUsers() {
        if (!this.listUsersUseCase) {
            return { statusCode: 501, error: 'Listado de usuarios no configurado' };
        }
        try {
            const users = await this.listUsersUseCase.execute();
            return { statusCode: 200, data: users };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleBlock(body) {
        if (!this.blockUserUseCase) {
            return { statusCode: 501, error: 'Bloqueo de usuarios no configurado' };
        }
        try {
            const user = await this.blockUserUseCase.execute(body);
            return { statusCode: 200, data: user };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleUnblock(body) {
        if (!this.unblockUserUseCase) {
            return { statusCode: 501, error: 'Desbloqueo de usuarios no configurado' };
        }
        try {
            const user = await this.unblockUserUseCase.execute(body);
            return { statusCode: 200, data: user };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
}
