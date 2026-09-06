import * as path from 'node:path';
import { expectRegistryEntry } from '../../test/zone-config.cjs';

expectRegistryEntry(path.resolve(__dirname, '..', '..'));
