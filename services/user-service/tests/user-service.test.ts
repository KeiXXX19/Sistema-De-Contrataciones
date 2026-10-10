import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import {
  InMemoryUserRepository,
  RegisterUserUseCase,
  LoginUseCase,
  VerifyUserUseCase,
  GetUserProfileUseCase,
  ListUsersUseCase,
  BlockUserUseCase,
  UnblockUserUseCase,
  LoginWithGoogleUseCase,
  UserController,
} from '../src/index.js';

describe('User & Auth Service - Hexagonal Unit Tests', () => {
  let userRepo: InMemoryUserRepository;
  let eventBroker: InMemoryEventBroker;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUseCase;
  let verifyUseCase: VerifyUserUseCase;
  let getProfileUseCase: GetUserProfileUseCase;
  let controller: UserController;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    eventBroker = new InMemoryEventBroker();
    registerUseCase = new RegisterUserUseCase(userRepo, eventBroker);
    loginUseCase = new LoginUseCase(userRepo, eventBroker);
    verifyUseCase = new VerifyUserUseCase(userRepo, eventBroker);
    getProfileUseCase = new GetUserProfileUseCase(userRepo);
    controller = new UserController(registerUseCase, loginUseCase, verifyUseCase, getProfileUseCase);
  });

  it('debe registrar un cliente correctamente y emitir UserRegisteredEvent', async () => {
    const result = await registerUseCase.execute({
      name: 'Carlos Cliente',
      email: 'carlos@ejemplo.com',
      role: 'CLIENT',
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Carlos Cliente');
    expect(result.email).toBe('carlos@ejemplo.com');
    expect(result.role).toBe('CLIENT');
    expect(result.isVerified).toBe(false);

    expect(eventBroker.publishedEvents.length).toBe(1);
    expect(eventBroker.publishedEvents[0].eventName).toBe('user.registered');
    expect(eventBroker.publishedEvents[0].payload.name).toBe('Carlos Cliente');
  });

  it('debe registrar un prestador y verificar su identidad (KYC)', async () => {
    const registered = await registerUseCase.execute({
      name: 'Ana Desarrolladora',
      email: 'ana@ejemplo.com',
      role: 'PROVIDER',
    });

    expect(registered.isVerified).toBe(false);

    const verified = await verifyUseCase.execute(registered.id);
    expect(verified.isVerified).toBe(true);

    expect(eventBroker.publishedEvents.length).toBe(2);
    expect(eventBroker.publishedEvents[1].eventName).toBe('user.verified');
  });

  it('no debe permitir registrar emails duplicados', async () => {
    await registerUseCase.execute({
      name: 'Juan Perez',
      email: 'juan@ejemplo.com',
      role: 'CLIENT',
    });

    await expect(
      registerUseCase.execute({
        name: 'Otro Juan',
        email: 'juan@ejemplo.com',
        role: 'PROVIDER',
      })
    ).rejects.toThrow(/ya está registrado/);
  });

  it('el controlador HTTP debe manejar respuestas con códigos de estado adecuados', async () => {
    const res = await controller.handleRegister({
      name: 'Mario Dev',
      email: 'mario@dev.com',
      role: 'PROVIDER',
    });

    expect(res.statusCode).toBe(201);
    expect(res.data?.name).toBe('Mario Dev');

    // Error por duplicado
    const duplicateRes = await controller.handleRegister({
      name: 'Mario Dev',
      email: 'mario@dev.com',
      role: 'PROVIDER',
    });

    expect(duplicateRes.statusCode).toBe(400);
    expect(duplicateRes.error).toBeDefined();
  });
});

describe('User & Auth Service - Login', () => {
  let userRepo: InMemoryUserRepository;
  let eventBroker: InMemoryEventBroker;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUseCase;
  let controller: UserController;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    eventBroker = new InMemoryEventBroker();
    registerUseCase = new RegisterUserUseCase(userRepo, eventBroker);
    loginUseCase = new LoginUseCase(userRepo, eventBroker);
    controller = new UserController(
      registerUseCase,
      loginUseCase,
      new VerifyUserUseCase(userRepo, eventBroker),
      new GetUserProfileUseCase(userRepo)
    );
  });

  it('debe iniciar sesión con credenciales correctas y emitir UserLoggedInEvent', async () => {
    await registerUseCase.execute({
      name: 'Lucía Pérez',
      email: 'lucia@ejemplo.com',
      role: 'CLIENT',
      password: 'secreto123',
    });

    const session = await loginUseCase.execute({
      email: 'lucia@ejemplo.com',
      password: 'secreto123',
    });

    expect(session.email).toBe('lucia@ejemplo.com');
    expect(session.role).toBe('CLIENT');

    const loginEvents = eventBroker.publishedEvents.filter((e) => e.eventName === 'user.logged_in');
    expect(loginEvents.length).toBe(1);
    expect(loginEvents[0].payload.email).toBe('lucia@ejemplo.com');
  });

  it('debe rechazar el login con contraseña incorrecta', async () => {
    await registerUseCase.execute({
      name: 'Lucía Pérez',
      email: 'lucia@ejemplo.com',
      role: 'CLIENT',
      password: 'secreto123',
    });

    await expect(
      loginUseCase.execute({ email: 'lucia@ejemplo.com', password: 'otra-clave-99' })
    ).rejects.toThrow(/Credenciales inválidas/);
  });

  it('debe rechazar el login con email inexistente y usuarios sin contraseña', async () => {
    await expect(
      loginUseCase.execute({ email: 'fantasma@ejemplo.com', password: 'secreto123' })
    ).rejects.toThrow(/Credenciales inválidas/);

    await registerUseCase.execute({
      name: 'Usuario Legado',
      email: 'legado@ejemplo.com',
      role: 'CLIENT',
    });

    await expect(
      loginUseCase.execute({ email: 'legado@ejemplo.com', password: 'secreto123' })
    ).rejects.toThrow(/Credenciales inválidas/);
  });

  it('no debe permitir registrar contraseñas de menos de 8 caracteres', async () => {
    await expect(
      registerUseCase.execute({
        name: 'Clave Corta',
        email: 'corta@ejemplo.com',
        role: 'CLIENT',
        password: 'abc123',
      })
    ).rejects.toThrow(/al menos 8 caracteres/);
  });

  it('el controlador debe responder 200 en login exitoso y 401 en credenciales inválidas', async () => {
    await registerUseCase.execute({
      name: 'Mario Dev',
      email: 'mario@dev.com',
      role: 'PROVIDER',
      password: 'demo1234',
    });

    const ok = await controller.handleLogin({ email: 'mario@dev.com', password: 'demo1234' });
    expect(ok.statusCode).toBe(200);
    expect(ok.data?.email).toBe('mario@dev.com');

    const bad = await controller.handleLogin({ email: 'mario@dev.com', password: 'incorrecta99' });
    expect(bad.statusCode).toBe(401);
    expect(bad.error).toBeDefined();
  });
});

describe('User & Auth Service - Administración (bloqueo y listado)', () => {
  let userRepo: InMemoryUserRepository;
  let eventBroker: InMemoryEventBroker;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUseCase;
  let listUsersUseCase: ListUsersUseCase;
  let blockUseCase: BlockUserUseCase;
  let unblockUseCase: UnblockUserUseCase;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    eventBroker = new InMemoryEventBroker();
    registerUseCase = new RegisterUserUseCase(userRepo, eventBroker);
    loginUseCase = new LoginUseCase(userRepo, eventBroker);
    listUsersUseCase = new ListUsersUseCase(userRepo);
    blockUseCase = new BlockUserUseCase(userRepo, eventBroker);
    unblockUseCase = new UnblockUserUseCase(userRepo, eventBroker);
  });

  it('debe bloquear un usuario, emitir user.blocked y rechazar su login', async () => {
    const user = await registerUseCase.execute({
      name: 'Pedro Problemático',
      email: 'pedro@ejemplo.com',
      role: 'PROVIDER',
      password: 'clave12345',
    });
    const admin = await registerUseCase.execute({
      name: 'Admin Root',
      email: 'admin@ejemplo.com',
      role: 'ADMIN',
      password: 'admin1234',
    });

    const blocked = await blockUseCase.execute({
      userId: user.id,
      adminId: admin.id,
      reason: 'Conducta fraudulenta',
    });

    expect(blocked.isBlocked).toBe(true);
    const blockedEvents = eventBroker.publishedEvents.filter((e) => e.eventName === 'user.blocked');
    expect(blockedEvents.length).toBe(1);
    expect(blockedEvents[0].payload.actorId).toBe(admin.id);

    await expect(
      loginUseCase.execute({ email: 'pedro@ejemplo.com', password: 'clave12345' })
    ).rejects.toThrow(/bloqueada/);
  });

  it('debe desbloquear un usuario y permitir el login de nuevo', async () => {
    const user = await registerUseCase.execute({
      name: 'Pedro Problemático',
      email: 'pedro@ejemplo.com',
      role: 'PROVIDER',
      password: 'clave12345',
    });
    const admin = await registerUseCase.execute({
      name: 'Admin Root',
      email: 'admin@ejemplo.com',
      role: 'ADMIN',
      password: 'admin1234',
    });

    await blockUseCase.execute({ userId: user.id, adminId: admin.id });
    const unblocked = await unblockUseCase.execute({ userId: user.id, adminId: admin.id });

    expect(unblocked.isBlocked).toBe(false);
    expect(
      eventBroker.publishedEvents.filter((e) => e.eventName === 'user.unblocked').length
    ).toBe(1);

    const session = await loginUseCase.execute({ email: 'pedro@ejemplo.com', password: 'clave12345' });
    expect(session.email).toBe('pedro@ejemplo.com');
  });

  it('no debe permitir bloquear administradores ni bloquear dos veces', async () => {
    const admin = await registerUseCase.execute({
      name: 'Admin Root',
      email: 'admin@ejemplo.com',
      role: 'ADMIN',
      password: 'admin1234',
    });
    const user = await registerUseCase.execute({
      name: 'Usuario Normal',
      email: 'normal@ejemplo.com',
      role: 'CLIENT',
      password: 'clave12345',
    });

    await expect(blockUseCase.execute({ userId: admin.id, adminId: user.id })).rejects.toThrow(
      /administrador/
    );

    await blockUseCase.execute({ userId: user.id, adminId: admin.id });
    await expect(blockUseCase.execute({ userId: user.id, adminId: admin.id })).rejects.toThrow(
      /ya se encuentra bloqueado/
    );
  });

  it('debe listar todos los usuarios con su estado de bloqueo', async () => {
    await registerUseCase.execute({
      name: 'Admin Root',
      email: 'admin@ejemplo.com',
      role: 'ADMIN',
      password: 'admin1234',
    });
    await registerUseCase.execute({
      name: 'Cliente Uno',
      email: 'cliente@ejemplo.com',
      role: 'CLIENT',
      password: 'clave12345',
    });

    const users = await listUsersUseCase.execute();
    expect(users.length).toBe(2);
    expect(users.every((u) => typeof u.isBlocked === 'boolean')).toBe(true);
    expect(users.some((u) => u.role === 'ADMIN')).toBe(true);
  });

  describe('LoginWithGoogleUseCase', () => {
    it('debe registrar y loguear automáticamente a un nuevo usuario con Google', async () => {
      const googleUseCase = new LoginWithGoogleUseCase(userRepo, eventBroker);
      const res = await googleUseCase.execute({
        name: 'Google User',
        email: 'googleuser@gmail.com',
        role: 'CLIENT',
      });

      expect(res.id).toBeDefined();
      expect(res.name).toBe('Google User');
      expect(res.email).toBe('googleuser@gmail.com');
      expect(res.role).toBe('CLIENT');
      expect(res.isVerified).toBe(true);

      const eventos = eventBroker.publishedEvents.map((e) => e.eventName);
      expect(eventos).toContain('user.registered');
      expect(eventos).toContain('user.verified');
      expect(eventos).toContain('user.logged_in');
    });

    it('debe iniciar sesión a un usuario existente y verificarlo si no lo estaba', async () => {
      await registerUseCase.execute({
        name: 'Existente',
        email: 'existente@gmail.com',
        role: 'PROVIDER',
        password: 'password123',
      });

      const googleUseCase = new LoginWithGoogleUseCase(userRepo, eventBroker);
      const res = await googleUseCase.execute({
        name: 'Existente Google',
        email: 'existente@gmail.com',
      });

      expect(res.name).toBe('Existente');
      expect(res.isVerified).toBe(true);
      expect(eventBroker.publishedEvents.map((e) => e.eventName)).toContain('user.logged_in');
    });

    it('no debe permitir iniciar sesión con Google a un usuario bloqueado', async () => {
      const reg = await registerUseCase.execute({
        name: 'Bloqueado',
        email: 'bloqueado@gmail.com',
        role: 'CLIENT',
        password: 'password123',
      });

      const admin = await registerUseCase.execute({
        name: 'Admin',
        email: 'admin2@ejemplo.com',
        role: 'ADMIN',
        password: 'admin1234',
      });

      const blockUseCase = new BlockUserUseCase(userRepo, eventBroker);
      await blockUseCase.execute({ userId: reg.id, adminId: admin.id, reason: 'Violación de TOS' });

      const googleUseCase = new LoginWithGoogleUseCase(userRepo, eventBroker);
      await expect(
        googleUseCase.execute({
          name: 'Bloqueado',
          email: 'bloqueado@gmail.com',
        })
      ).rejects.toThrow(/cuenta está bloqueada/);
    });

    it('debe asignar automáticamente el rol ADMIN a hkeiner663@gmail.com', async () => {
      const googleUseCase = new LoginWithGoogleUseCase(userRepo, eventBroker);
      const res = await googleUseCase.execute({
        name: 'Keiner',
        email: 'hkeiner663@gmail.com',
        role: 'CLIENT', // Aunque intente CLIENT, debe ser forzado a ADMIN
      });

      expect(res.role).toBe('ADMIN');
      expect(res.email).toBe('hkeiner663@gmail.com');
      expect(res.isVerified).toBe(true);
    });
  });
});

