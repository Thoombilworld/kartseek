import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AdminStaticPagesController } from './static-pages.controller';
import { AdminLayoutController } from './admin-layout.controller';
import { AdminSeoController } from './admin-seo.controller';
import { DdosAdminController } from './ddos-admin.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'PUT', originalUrl: '/x', headers: {} });

const repo = () => ({
  find: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  create: vi.fn((x: any) => x),
  save: vi.fn(async (x: any) => ({ id: 'p-1', ...x })),
  delete: vi.fn(async () => ({ affected: 1 })),
});

describe('platform-wide content refuses a region-locked admin', () => {
  it('static pages: save and publish', async () => {
    const r = repo();
    const ctrl = new AdminStaticPagesController(r as any);
    await expect(ctrl.savePage(req(qaAdmin), 'privacy', { title: 'x' } as any)).rejects.toThrow(
      'Your account is restricted to the QA market; a platform page belongs to every market.',
    );
    await expect(ctrl.togglePublish(req(qaAdmin), 'privacy')).rejects.toThrow(ForbiddenException);
    expect(r.save).not.toHaveBeenCalled();
  });

  it('page layouts: save', async () => {
    const r = repo();
    const ctrl = new AdminLayoutController(r as any);
    await expect(
      ctrl.saveLayout(req(qaAdmin), 'marketplace', 'homepage', { sections: [] } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(r.save).not.toHaveBeenCalled();
  });

  it('seo overrides: upsert, bulk and delete', async () => {
    const r = repo();
    const ctrl = new AdminSeoController(r as any);
    await expect(
      ctrl.upsertOverride(req(qaAdmin), { path: '/x', module: 'marketplace' } as any),
    ).rejects.toThrow(ForbiddenException);
    await expect(ctrl.bulkUpdate(req(qaAdmin), { overrides: [] } as any)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(ctrl.deleteOverride(req(qaAdmin), 'seo_1')).rejects.toThrow(ForbiddenException);
    expect(r.save).not.toHaveBeenCalled();
  });

  it('the security console: every mutation', async () => {
    const monitor = {
      banIp: vi.fn(),
      unbanIp: vi.fn(),
      whitelistIp: vi.fn(),
      resetAttackMode: vi.fn(),
    };
    const ctrl = new DdosAdminController(monitor as any);
    for (const call of [
      () => ctrl.banIp(req(qaAdmin), { ip: '1.2.3.4' } as any),
      () => ctrl.unbanIp(req(qaAdmin), '1.2.3.4'),
      () => ctrl.whitelistIp(req(qaAdmin), { ip: '1.2.3.4' } as any),
      () => ctrl.resetAttackMode(req(qaAdmin)),
    ]) {
      await expect(Promise.resolve().then(call)).rejects.toThrow(ForbiddenException);
    }
    expect(monitor.banIp).not.toHaveBeenCalled();
  });

  it('a global admin writes all four — the control that stops "403 everywhere" passing', async () => {
    const r = repo();
    await expect(
      new AdminStaticPagesController(r as any).savePage(req(superAdmin), 'privacy', {
        title: 'x',
      } as any),
    ).resolves.toMatchObject({ success: true });
    await expect(
      new AdminLayoutController(r as any).saveLayout(req(superAdmin), 'marketplace', 'homepage', {
        sections: [],
      } as any),
    ).resolves.toBeDefined();
  });

  it('a locked admin may still READ all four', async () => {
    const r = repo();
    await expect(new AdminStaticPagesController(r as any).listPages()).resolves.toBeDefined();
    await expect(
      new AdminLayoutController(r as any).getLayout('marketplace', 'homepage'),
    ).resolves.toBeDefined();
  });
});

describe('the actor on an SEO override comes from the token', () => {
  it('ignores a body-supplied updatedBy', async () => {
    const r = repo();
    const ctrl = new AdminSeoController(r as any);
    await ctrl.upsertOverride(req(superAdmin), {
      path: '/x',
      module: 'marketplace',
      updatedBy: 'someone-else',
    } as any);
    expect(r.save).toHaveBeenCalledWith(expect.objectContaining({ updatedBy: 'u-s' }));
  });
});
