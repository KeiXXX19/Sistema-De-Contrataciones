import { AggregateRoot, DomainEvent, UniqueEntityID, IEventBroker } from '@platform/shared-kernel';

// ==========================================
// 1. DOMINIO: VALUE OBJECTS & ENTIDADES
// ==========================================
export type UserRole = 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'USER';

export class Email {
  private readonly _value: string;

  constructor(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value)) {
      throw new Error(`Email inválido: ${value}`);
    }
    this._value = value.toLowerCase().trim();
  }

  get value(): string {
    return this._value;
  }
}

export class PasswordHash {
  private constructor(private readonly _value: string) {}

  static async fromPlain(password: string): Promise<PasswordHash> {
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

  get value(): string {
    return this._value;
  }

  equals(other: PasswordHash): boolean {
    return this._value === other._value;
  }
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

export class UserRegisteredEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'user.registered';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      userId: string;
      name: string;
      email: string;
      role: UserRole;
      isVerified: boolean;
    }
  ) {}
}

export class UserVerifiedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'user.verified';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      userId: string;
      email: string;
      verifiedAt: Date;
    }
  ) {}
}

export class UserLoggedInEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'user.logged_in';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      userId: string;
      email: string;
      role: UserRole;
      loggedAt: Date;
    }
  ) {}
}

export class UserBlockedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'user.blocked';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      userId: string;
      email: string;
      actorId: string;
      reason?: string;
      blockedAt: Date;
    }
  ) {}
}

export class UserUnblockedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'user.unblocked';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      userId: string;
      email: string;
      actorId: string;
      unblockedAt: Date;
    }
  ) {}
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  static create(
    props: { name: string; email: string; role: UserRole; passwordHash?: PasswordHash },
    id?: UniqueEntityID
  ): User {
    if (!props.name || props.name.trim().length < 2) {
      throw new Error('El nombre de usuario debe tener al menos 2 caracteres');
    }

    const emailVO = new Email(props.email);
    const user = new User(
      {
        name: props.name.trim(),
        email: emailVO,
        role: props.role,
        isVerified: false,
        isBlocked: false,
        createdAt: new Date(),
        passwordHash: props.passwordHash,
      },
      id
    );

    user.addDomainEvent(
      new UserRegisteredEvent(user.id.toString(), {
        userId: user.id.toString(),
        name: user.name,
        email: user.email.value,
        role: user.role,
        isVerified: user.isVerified,
      })
    );

    return user;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isVerified(): boolean {
    return this.props.isVerified;
  }

  get isBlocked(): boolean {
    return this.props.isBlocked;
  }

  get blockedReason(): string | undefined {
    return this.props.blockedReason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  hasCredentials(): boolean {
    return this.props.passwordHash !== undefined;
  }

  matchesPassword(hash: PasswordHash): boolean {
    return this.props.passwordHash ? this.props.passwordHash.equals(hash) : false;
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.addDomainEvent(
      new UserLoggedInEvent(this.id.toString(), {
        userId: this.id.toString(),
        email: this.email.value,
        role: this.role,
        loggedAt: new Date(),
      })
    );
  }

  verifyIdentity(): void {
    if (this.props.isVerified) {
      throw new Error('El usuario ya se encuentra verificado');
    }
    this.props.isVerified = true;
    this.addDomainEvent(
      new UserVerifiedEvent(this.id.toString(), {
        userId: this.id.toString(),
        email: this.email.value,
        verifiedAt: new Date(),
      })
    );
  }

  assignRole(newRole: UserRole): void {
    this.props.role = newRole;
  }

  block(actorId: string, reason?: string): void {
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
    this.addDomainEvent(
      new UserBlockedEvent(this.id.toString(), {
        userId: this.id.toString(),
        email: this.email.value,
        actorId,
        reason: this.props.blockedReason,
        blockedAt: new Date(),
      })
    );
  }

  unblock(actorId: string): void {
    if (!this.props.isBlocked) {
      throw new Error('El usuario no se encuentra bloqueado');
    }
    if (!actorId) {
      throw new Error('Se requiere identificar al administrador que desbloquea');
    }
    this.props.isBlocked = false;
    this.props.blockedReason = undefined;
    this.addDomainEvent(
      new UserUnblockedEvent(this.id.toString(), {
        userId: this.id.toString(),
        email: this.email.value,
        actorId,
        unblockedAt: new Date(),
      })
    );
  }
}

// ==========================================
// 2. PUERTOS (IN & OUT)
// ==========================================
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

// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: RegisterUserDTO): Promise<UserResponseDTO> {
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
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: LoginDTO): Promise<UserResponseDTO> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !user.hasCredentials()) {
      throw new Error('Credenciales inválidas');
    }

    let intentHash: PasswordHash;
    try {
      intentHash = await PasswordHash.fromPlain(dto.password);
    } catch {
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
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: LoginWithGoogleDTO): Promise<UserResponseDTO> {
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
    } else {
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
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(userId: string): Promise<UserResponseDTO> {
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
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<UserResponseDTO> {
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
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(): Promise<UserResponseDTO[]> {
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

export interface AdminUserActionDTO {
  userId: string;
  adminId: string;
  reason?: string;
}

export class BlockUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: AdminUserActionDTO): Promise<UserResponseDTO> {
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
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: Omit<AdminUserActionDTO, 'reason'>): Promise<UserResponseDTO> {
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
export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id.toString(), user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.value === cleanEmail) {
        return user;
      }
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  clear(): void {
    this.users.clear();
  }
}

export class UserController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyUseCase: VerifyUserUseCase,
    private readonly getProfileUseCase: GetUserProfileUseCase,
    private readonly listUsersUseCase?: ListUsersUseCase,
    private readonly blockUserUseCase?: BlockUserUseCase,
    private readonly unblockUserUseCase?: UnblockUserUseCase,
    private readonly loginWithGoogleUseCase?: LoginWithGoogleUseCase
  ) {}

  async handleGoogleLogin(body: LoginWithGoogleDTO) {
    if (!this.loginWithGoogleUseCase) {
      return { statusCode: 501, error: 'Inicio de sesión con Google no configurado' };
    }
    try {
      const user = await this.loginWithGoogleUseCase.execute(body);
      return { statusCode: 200, data: user };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleRegister(body: RegisterUserDTO) {
    try {
      const user = await this.registerUseCase.execute(body);
      return { statusCode: 201, data: user };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleLogin(body: LoginDTO) {
    try {
      const user = await this.loginUseCase.execute(body);
      return { statusCode: 200, data: user };
    } catch (err: any) {
      return { statusCode: 401, error: err.message };
    }
  }

  async handleVerify(userId: string) {
    try {
      const user = await this.verifyUseCase.execute(userId);
      return { statusCode: 200, data: user };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleGetProfile(userId: string) {
    try {
      const user = await this.getProfileUseCase.execute(userId);
      return { statusCode: 200, data: user };
    } catch (err: any) {
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
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleBlock(body: AdminUserActionDTO) {
    if (!this.blockUserUseCase) {
      return { statusCode: 501, error: 'Bloqueo de usuarios no configurado' };
    }
    try {
      const user = await this.blockUserUseCase.execute(body);
      return { statusCode: 200, data: user };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleUnblock(body: { userId: string; adminId: string }) {
    if (!this.unblockUserUseCase) {
      return { statusCode: 501, error: 'Desbloqueo de usuarios no configurado' };
    }
    try {
      const user = await this.unblockUserUseCase.execute(body);
      return { statusCode: 200, data: user };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }
}
