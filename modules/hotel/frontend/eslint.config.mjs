// Delegates to the shell's shared config so a rule added there reaches this
// zone without anyone remembering to copy it here.
import { nextAppConfig } from '../../../apps/web/eslint.base.mjs';

export default nextAppConfig();
