exports.default = function (context) {
    // Skip if not mac
    if (process.platform !== 'darwin') {
        return;
    }

    // VMP sign via EVS
    const {execSync} = require('child_process');
    console.log('  • VMP signing start');
    execSync('python -m castlabs_evs.vmp sign-pkg ' + context.appOutDir);
    console.log('  • VMP signing complete');
};
