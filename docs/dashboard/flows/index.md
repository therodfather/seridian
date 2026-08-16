# Multi-step flows

Guided flows appear only where create / setup / publish is multi-part. List pages stay as lists.

| Flow | Steps | Code |
|------|-------|------|
| [Get started checklist](./setup-checklist.md) | Telnyx → IVR → Publish → Client → Knowledge | `SetupChecklist` |
| [New engagement](./new-engagement.md) | Client → Proposal → Deal | `NewEngagementFlow` |
| [Knowledge setup](./knowledge-setup.md) | Create space → Import → Open wiki | `KnowledgeSetupFlow` |
| [Client create/edit](./clients.md) | Basics → Contacts → Review | `ClientForm` |
| [Proposal create/edit](./proposals.md) | Client → Scope → Pricing → Review | `ProposalForm` |
| [Deal create/edit](./sales.md) | Details → Value & stage → Review | `DealForm` |
| [Booking create/edit](./bookings.md) | Details → Schedule | `BookingForm` |
| [Contract create/edit](./contracts.md) | (existing MultiStepForm steps) | `ContractForm` |
| [IVR builder](./ivr.md) | Name → Tree → Publish → Assign number (gated) | `IvrBuilder` |
| [Telnyx connect](./telnyx.md) | API key → Public key → Confirm | `TelnyxConnectCard` |
| [Health Check report](./health-check.md) | Client → Findings → 30/60/90 → Print | `HealthCheckReport` |
| Channel / Template / Case study | existing MultiStepForm | respective forms |

Shared chrome: [`FlowSteps`](../kit.md) inside [`MultiStepForm`](../../../src/components/ui/form/MultiStepForm.tsx) or `PageFlow`.

**Navbar note:** Primary nav is hubs only; nested list pages are reached from Business / Knowledge hubs or Overview — see [dashboard IA](../index.md).

Back → [Dashboard index](../index.md)
