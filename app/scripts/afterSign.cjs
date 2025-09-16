const {notarize} = require('@electron/notarize');
const fs = require('fs');
const path = require('path');
const {build} = require('../package.json');

exports.default = async function (context) {
    if (process.platform === 'darwin') {
        const env = process.env;

        if (!(env.APPLE_ID && env.APPLE_ID_PASSWORD && env.APPLE_TEAM_ID)) {
            console.log(
                '  • Skipping notarizing step. APPLE_ID, APPLE_ID_PASSWORD and APPLE_TEAM_ID env variables must be set'
            );
            return;
        }

        const {appId} = build;
        const {appOutDir} = context;
        const appName = context.packager.appInfo.productFilename;
        const appPath = path.join(appOutDir, `${appName}.app`);

        if (!fs.existsSync(appPath)) {
            throw new Error(`Notarize: Cannot find application at: ${appPath}`);
        }

        console.log(`  • Notarizing ${appId} found at ${appPath}`);

        try {
            await notarize({
                appBundleId: appId,
                appPath: appPath,
                appleId: env.APPLE_ID,
                appleIdPassword: env.APPLE_ID_PASSWORD,
                teamId: env.APPLE_TEAM_ID,
            });

            console.log('  • Notarization complete.');
        } catch (err) {
            console.log('  • Notarization error.');
            console.error(err);
        }
    } else if (process.platform === 'win32') {
        // VMP sign via EVS
        const {execSync} = require('child_process');
        console.log('  • VMP signing start');
        execSync('python -m castlabs_evs.vmp sign-pkg ./dist/win-unpacked');
        console.log('  • VMP signing complete');
    }
};
