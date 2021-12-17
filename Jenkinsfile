// this will need to be pipeline-library@master when the pr merges
@Library('pipeline-library') _

webappPipeline {
    slaveLabel = 'dev_v2'
    nodeVersion = '14.17.5'
    useArtifactoryRepo = false
    projectName = 'vendor-headsets'
    manifest = directoryManifest('dist')
    buildType = { (env.BRANCH_NAME == 'master' || env.BRANCH_NAME.startsWith('release/')) ? 'MAINLINE' : 'FEATURE' }
    publishPackage = { 'prod' }
    testJob = null

    buildStep = {
        sh('''
            export CDN_URL="$(npx cdn --ecosystem pc --name \$APP_NAME --build \$BUILD_ID --version \$VERSION)"
            echo "CDN_URL: \$CDN_URL"
            npm run install:all && npm run compile:module && npm run build && npm run lint
        ''')
    }

    snykConfig = {
        return [
            organization: 'genesys-client-media-webrtc',
            project: 'softphone-vendor-headsets'
        ]
    }

    cmConfig = {
        return [
            managerEmail: 'purecloud-client-media@genesys.com',
            rollbackPlan: 'Patch version with fix',
            testResults: 'https://jenkins.ininica.com/job/valve-webrtcsdk-tests-test/',
            qaId: '5d41d9195ca9700dac0ef53a'
        ]
    }

    shouldTagOnRelease = { true }

    postReleaseStep = {
        sshagent(credentials: [constants.credentials.github.inin_dev_evangelists]) {
            sh("""
                # patch to prep for the next version
                npm version patch --no-git-tag-version
                git commit -am "Prep next version"
                git push origin HEAD:master --tags
            """)
        }
    }
}
