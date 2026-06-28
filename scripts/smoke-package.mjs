import { runSmokePackage } from './smoke-package-lib.mjs';

runSmokePackage({
    typecheckSubpaths: ['.'],
    runtimeChecks: [{ subpath: '.', exports: ['default'] }],
});
