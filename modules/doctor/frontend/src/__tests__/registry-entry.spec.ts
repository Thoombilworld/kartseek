import * as path from 'node:path';
import { expectRegistryEntry } from '../../../../../apps/web/test/zone-config.cjs';

expectRegistryEntry(path.resolve(__dirname, '..', '..'));
