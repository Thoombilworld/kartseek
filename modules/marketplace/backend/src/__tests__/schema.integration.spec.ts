import { Test, type TestingModule } from '@nestjs/testing';
import { type DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { MarketplaceModule } from '../marketplace.module';
import { ConfigModule } from '@nestjs/config';

describe('Marketplace Schema Isolation (Integration)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        // Ensure env variables don't prevent testing
        ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
        MarketplaceModule,
      ],
    }).compile();

    dataSource = moduleRef.get<DataSource>(getDataSourceToken());
    // Jest's default 5s hook timeout is not enough to stand the whole module up:
    // this compiles MarketplaceModule for real, which opens Postgres, Redis and
    // Kafka connections. It fits comfortably when the spec runs alone and does
    // not when the rest of the suite is competing for the same database, so the
    // suite failed intermittently on a spec that was doing nothing wrong.
  }, 60_000);

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should enforce the "marketplace" schema on all entities in this microservice', () => {
    expect(dataSource).toBeDefined();

    // The DataSource metadata contains the mapped table config for each entity
    const metadatas = dataSource.entityMetadatas;

    // Verify there are actually entities loaded
    expect(metadatas.length).toBeGreaterThan(0);

    const violatingEntities = metadatas.filter(meta => meta.schema !== 'marketplace');
    
    // If any entity does not have the 'marketplace' schema, the test fails.
    if (violatingEntities.length > 0) {
      const names = violatingEntities.map(meta => meta.name).join(', ');
      throw new Error(`Schema Isolation Violation! The following entities are NOT bound to the "marketplace" schema: ${names}`);
    }
    
    expect(violatingEntities.length).toBe(0);
  });
});
