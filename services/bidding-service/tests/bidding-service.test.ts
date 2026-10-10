import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import {
  InMemoryProposalRepository,
  SubmitProposalUseCase,
  AcceptProposalUseCase,
  ProposalController,
} from '../src/index.js';

describe('Bidding & Proposal Service - Hexagonal Unit Tests', () => {
  let repo: InMemoryProposalRepository;
  let broker: InMemoryEventBroker;
  let submitUseCase: SubmitProposalUseCase;
  let acceptUseCase: AcceptProposalUseCase;
  let controller: ProposalController;

  beforeEach(() => {
    repo = new InMemoryProposalRepository();
    broker = new InMemoryEventBroker();
    submitUseCase = new SubmitProposalUseCase(repo, broker);
    acceptUseCase = new AcceptProposalUseCase(repo, broker);
    controller = new ProposalController(submitUseCase, acceptUseCase, repo);
  });

  it('debe enviar una propuesta y emitir ProposalSubmittedEvent', async () => {
    const proposal = await submitUseCase.execute({
      jobId: 'job-101',
      providerId: 'provider-1',
      proposedAmountDecimal: 450.0,
      estimatedDays: 7,
      coverLetter: 'Cuento con 5 años de experiencia en desarrollo de microservicios.',
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('SUBMITTED');
    expect(proposal.proposedAmount).toBe(450.0);
    expect(proposal.estimatedDays).toBe(7);

    expect(broker.publishedEvents.length).toBe(1);
    expect(broker.publishedEvents[0].eventName).toBe('proposal.submitted');
  });

  it('no debe permitir al mismo prestador enviar 2 ofertas activas para el mismo trabajo', async () => {
    await submitUseCase.execute({
      jobId: 'job-101',
      providerId: 'provider-1',
      proposedAmountDecimal: 450.0,
      estimatedDays: 7,
      coverLetter: 'Primera oferta detallada para el trabajo.',
    });

    await expect(
      submitUseCase.execute({
        jobId: 'job-101',
        providerId: 'provider-1',
        proposedAmountDecimal: 400.0,
        estimatedDays: 5,
        coverLetter: 'Segunda oferta que debería ser rechazada.',
      })
    ).rejects.toThrow(/oferta activa/);
  });

  it('al aceptar una propuesta, debe cambiar a ACCEPTED y rechazar las demás ofertas competidoras', async () => {
    const prop1 = await submitUseCase.execute({
      jobId: 'job-200',
      providerId: 'provider-A',
      proposedAmountDecimal: 300.0,
      estimatedDays: 4,
      coverLetter: 'Puedo entregarlo en 4 días garantizado.',
    });

    const prop2 = await submitUseCase.execute({
      jobId: 'job-200',
      providerId: 'provider-B',
      proposedAmountDecimal: 350.0,
      estimatedDays: 3,
      coverLetter: 'Tengo experiencia similar comprobable.',
    });

    // Cliente acepta la propuesta del prestador A
    const accepted = await acceptUseCase.execute(prop1.id);
    expect(accepted.status).toBe('ACCEPTED');

    // Comprobamos que la propuesta B fue rechazada automáticamente
    const otherProp = await repo.findById(prop2.id);
    expect(otherProp?.status).toBe('REJECTED');

    const acceptedEvent = broker.publishedEvents.find((e) => e.eventName === 'proposal.accepted');
    expect(acceptedEvent).toBeDefined();
    expect(acceptedEvent?.payload.providerId).toBe('provider-A');
  });
});
