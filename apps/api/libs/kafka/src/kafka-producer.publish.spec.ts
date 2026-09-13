import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * publish() is fire-and-forget, but it must report what the broker did:
 * "Published" only after the emit completes, an ERROR naming the topic when
 * it fails — and the one failure an operator can act on (a topic the broker
 * does not know) says so in words.
 */
function producerWith(emit: () => unknown) {
  const client = { emit } as any;
  const service = new KafkaProducerService(client, 'spec-service');
  (service as any).connected = true;
  const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  return { service, debug, error };
}

afterEach(() => jest.restoreAllMocks());

describe('KafkaProducerService.publish', () => {
  it('logs "Published" only once the emit completes', async () => {
    const { service, debug, error } = producerWith(() => of(undefined));
    await service.publish('listing.approved', { id: 'l1' });
    expect(debug).toHaveBeenCalledWith(expect.stringContaining('Published to listing.approved'));
    expect(error).not.toHaveBeenCalled();
  });

  it('reports a broker refusal as an error naming the topic, and never "Published"', async () => {
    const { service, debug, error } = producerWith(() =>
      throwError(() => new Error('This server does not host this topic-partition')),
    );
    await service.publish('listing.approved', { id: 'l1' });
    expect(debug).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(
        /Failed to publish to listing\.approved: This server does not host this topic-partition \(the topic does not exist on the broker/,
      ),
    );
  });

  it('survives an emit that throws synchronously', async () => {
    const { service, error } = producerWith(() => {
      throw new Error('boom');
    });
    await expect(service.publish('x.y', { id: '1' })).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('Failed to publish to x.y: boom');
  });

  it('skips silently when not connected', async () => {
    const emit = jest.fn();
    const { service } = producerWith(emit);
    (service as any).connected = false;
    await service.publish('x.y', { id: '1' });
    expect(emit).not.toHaveBeenCalled();
  });
});
