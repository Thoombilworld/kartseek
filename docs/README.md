# KARTSEEK documentation

Start with the [root README](../README.md) for setup and
[ARCHITECTURE.md](../ARCHITECTURE.md) for the shape of the system. This folder
holds everything else, split by what you are trying to do.

| Folder                           | Read it when you want to…                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [`guides/`](guides/)             | do a task: run services, test, migrate a database, seed data, handle secrets, fix a broken local setup, follow the conventions  |
| [`architecture/`](architecture/) | understand how a part of the system is built: the service list, data ownership, messaging, the frontend zones, mobile, security |
| [`adr/`](adr/)                   | know why a decision was made (Architecture Decision Records)                                                                    |
| [`product/`](product/)           | know what the product must do — the specification the platform is built against                                                 |
| [`audits/`](audits/)             | read a dated finding from an earlier review; history, not current state                                                         |
| [`archive/`](archive/)           | read superseded material kept for its reasoning                                                                                 |
| [`superpowers/`](superpowers/)   | read the design specs and implementation plans behind larger changes                                                            |

## Guides

- [Local setup](guides/local-setup.md) — clone to running platform
- [Running services](guides/running-services.md) — which command starts what, ports, `SKIP_DB`
- [Testing](guides/testing.md) — unit, integration, e2e, Postman, the smoke test
- [Database migrations](guides/database-migrations.md)
- [Seeding](guides/seeding.md)
- [Secrets](guides/secrets.md)
- [Troubleshooting](guides/troubleshooting.md)
- [Conventions](guides/conventions.md) — naming, layout, commits, where new code goes

## Architecture

- [Services](architecture/services.md) — generated from `services.yaml`
- [Data ownership](architecture/data-ownership.md)
- [Messaging](architecture/messaging.md)
- [Frontend zones](architecture/frontend-zones.md)
- [Mobile](architecture/mobile.md)
- [Security](architecture/security.md)

## Decisions

See [adr/](adr/README.md) for the index.
