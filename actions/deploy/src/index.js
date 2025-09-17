var AWS = require('aws-sdk')
const yaml = require('js-yaml')
const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/rest");

const ENV = process.env.ENV || "dev"
const VERTICAL = process.env.VERTICAL || "ltk"
const REGION = process.env.AWS_DEFAULT_REGION
const LIFECYCLE = process.env.LIFECYCLE

console.log("ENV: ", ENV)
console.log("REGION: ", REGION)
console.log("LIFECYCLE: ", LIFECYCLE)


const githubToken = core.getInput("GITHUB_TOKEN");
const octokit = new Octokit({ auth: githubToken })
const githubClient = octokit.rest
const repoContext = github.context.repo;
const ref = github.context.ref
const SHA = github.context.sha
const { owner, repo } = repoContext

console.log("repoContext: ", repoContext)
console.log("ref: ", ref)

var CLOUDFORMATION;


async function deploy(lifecycle) {

    let parameters = await getParameters(owner, repo, ref, lifecycle)
    console.log("Parameter: ", parameters)

    let template = await getTemplate(owner, repo, ref, lifecycle)


    let isValidParameter = await validateInfrastructureParameters(repo, ref, ENV, VERTICAL, lifecycle)
    if (!isValidParameter) {
        core.setFailed("Parameter Invalid");
        return
    }


    let isValidCloudformation = await validateMasterCloudFormation(parameters, template, repo, ref, lifecycle)
    if (!isValidCloudformation) {
        core.setFailed("Template or Parameter Invalid");
        return
    }


    let StackName = `${ENV}-${repo}-${lifecycle}`

    let isExists = await isExistStack(StackName)
    var params = {
        StackName: StackName, /* required */
        Parameters: parameters,
        Capabilities: [
            'CAPABILITY_NAMED_IAM',
            'CAPABILITY_AUTO_EXPAND'
        ],
        Tags: [
            {
                Key: 'DEPLOYER',
                Value: 'ltk_ops'
            },
            {
                Key: 'Environment',
                Value: ENV
            },
            {
                Key: 'env',
                Value: ENV
            },
        ],
        TemplateBody: template
    }
    try {
        if (!isExists) {
            console.log('CREATING stack ... ')
            await CLOUDFORMATION.createStack(params).promise()
        } else {
            console.log('UPDATING stack ... ')
            await CLOUDFORMATION.updateStack(params).promise()
        }

    } catch (e) {
        console.log('Error executing AWS CloudFormation:', e)
        console.log('CF parameters:', JSON.stringify(parameters))
        if (!e.message.includes("No updates are to be performed")) {
            core.setFailed(`Error executing AWS CloudFormation Code: ${e.code}`, e.message);
        }
        return
    }

    isDone = await isStackComplete(StackName)
    if (isDone) {
        console.log(`Deploy complete stack: ${StackName}`)
    }

}

const validateInfrastructureParameters = async function (repo, ref, environment, vertical, lifecycle = 'app') {

    let paths = [
        `/cloudformation/${environment}.json`,
        `/cloudformation/${environment}.yml`,
        `/cloudformation/${environment}-${vertical}.json`,
        `/cloudformation/${environment}-${vertical}.yml`,
        `/cloudformation/${lifecycle}/${environment}.json`,
        `/cloudformation/${lifecycle}/${environment}.yml`,
        `/cloudformation/${lifecycle}/${environment}-${vertical}.json`,
        `/cloudformation/${lifecycle}/${environment}-${vertical}.yml`
    ];


    let violations = await performValidations(repo, ref, paths);
    if (violations && Object.keys(violations).length > 0) {
        return false
    }

    return true;
}

const validateMasterCloudFormation = async (parameters, template, repo, ref, lifecycle = 'app') => {
    let paths = [
        '/cloudformation/template.yml',
        `/cloudformation/${lifecycle}/template.yml`
    ];
    let violations = await performValidations(repo, ref, paths);
    if (violations && Object.keys(violations).length > 0) {
        return false
    }

    try {
        let validateTemplate = await CLOUDFORMATION.validateTemplate({ TemplateBody: template }).promise()
        let templateParameters = validateTemplate["Parameters"]
        templateParameters.forEach(param => {
            if (param["DefaultValue"]) {
                return
            }
            console.log("validateMasterCloudFormation::ParameterKey: ", param["ParameterKey"])
            let paramResult = findParameterKey(parameters, param["ParameterKey"])
            console.log("validateMasterCloudFormation::paramResult: ", paramResult)
            if (!paramResult) {
                throw new Error()
            }
        })

    } catch (e) {
        console.log("validateMasterCloudFormation::exception: ", e.message)
        return false
    }

    return true;
}

const findParameterKey = (parameters, key) => {
    let parameter = null
    const paramFilter = parameters.filter(param => param["ParameterKey"] == key)
    if (paramFilter.length > 0) {
        parameter = paramFilter[0]
    }
    return parameter
}

const performValidations = async function (repo, ref, paths) {
    let violations = {};
    console.log('Performing validations on', repo, ref, paths);
    for (let i = 0; i < paths.length; i++) {
        var p = paths[i];
        try {
            console.log('Ensuring pinned gitsha template versions in', p, '...');
            let fileData = await githubClient.repos.getContent({
                owner: 'hoanghungbk93', repo: repo, ref: ref, path: p
            });

            // https://developer.github.com/v3/repos/contents/#get-contents
            // contents must be decoded
            let data = Buffer.from(fileData.data.content, 'base64').toString();

            let found = await ensurePinnedTemplateVersions(data);
            if (found.length > 0) { violations[p] = found; }
            // console.log('...', 'found', found.length, 'violations in', p);
        } catch (e) {
            console.log('...', 'No such file', p, 'in', repo + ':' + ref, ', skipping ...');
            continue;
        }
    }

    console.log("performValidations::violations:  ", violations)

    return violations;
}

const pattern = /s3\.amazonaws\.com\/cloudformation\.liketoknow\.it\/templates\/master(?:\/|"|'|\s*$)/i;

async function ensurePinnedTemplateVersions(data) {
    var found = [];
    const re = new RegExp(pattern);

    data.split(/\n/).forEach(function (line) {
        if (!re.test(line)) { return; }
        found.push(line);
    });

    console.log("ensurePinnedTemplateVersions::found: ", found)

    return found;
}

// this.stack.StackStatus
// "CREATE_IN_PROGRESS"
// "CREATE_FAILED"
// "CREATE_COMPLETE"
// "ROLLBACK_IN_PROGRESS"
// "ROLLBACK_FAILED"
// "ROLLBACK_COMPLETE"
// "DELETE_IN_PROGRESS"
// "DELETE_FAILED"
// "DELETE_COMPLETE"
// "UPDATE_IN_PROGRESS"
// "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS"
// "UPDATE_COMPLETE"
// "UPDATE_ROLLBACK_IN_PROGRESS"
// "UPDATE_ROLLBACK_FAILED"
// "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS"
// "UPDATE_ROLLBACK_COMPLETE"
// "REVIEW_IN_PROGRESS"
async function isStackComplete(StackName, retry = 0) {
    try {
        let matcher = /PROGRESS/
        var result = await CLOUDFORMATION.describeStacks({ StackName }).promise()
        let stacks = result.Stacks;
        var stack;


        if (stacks && stacks.length > 0) {
            for (var tmpStack of stacks) {
                if (tmpStack.StackName == StackName) {
                    stack = tmpStack;
                }
            }
        }

        if (!stack) {
            return false
        }

        console.log("isStackComplete::StackStatus: ", stack.StackStatus)
        if (stack.StackStatus.match(matcher)) {
            await delay(5000)
            return await isStackComplete(StackName, retry + 1)
        }

        if (!isStackSuccess(stack.StackStatus)) {
            core.setFailed('Failed to deploy');
            console.log("Log  stack =========>: ", stack)
            console.log("Log  stack <=========")
            core.setOutput("STACK_STATUS_FAILED", stack.StackStatus);
            var resultStackEvent = await CLOUDFORMATION.describeStackEvents({ StackName }).promise()
            console.log("Log  resultStackEvent =========>: ", resultStackEvent)
            console.log("Log  resultStackEvent <=========")
            // core.exportVariable("STACK_STATUS_FAILED", stack.StackStatus);
            return false
        }
        console.log("Stack Outputs: ", JSON.stringify(stack.Outputs))
        console.log("Stack Tags: ", JSON.stringify(stack.Tags))
        return true
    } catch (e) {
        console.log("isStackComplete::exception: ", e)
        return false
    }
}


const isStackSuccess = function (StackStatus) {
    if (StackStatus == 'CREATE_COMPLETE' || StackStatus == 'UPDATE_COMPLETE') {
        return true
    } else {
        return false
    }
}
const delay = ms => new Promise(res => setTimeout(res, ms));

async function isExistStack(StackName) {
    var params = {
        StackName
    }

    console.log("StackName params: ", params)

    try {
        var result = await CLOUDFORMATION.describeStacks(params).promise()
        console.log("isExistStack::result: ", result)
        return true
    } catch (e) {
        return false
    }
}

async function getConfigFileData(owner, repo, ref, file_path_without_extension) {
    const extensions = ["json", "yml"]
    let fileData = null
    let last_err = null

    for (let extension of extensions) {
        try {
            fileData = await githubClient.repos.getContent({
                owner: owner,
                repo: repo,
                ref: ref,
                path: `${file_path_without_extension}.${extension}`
            })
        } catch (e) {
            last_err = e
        }
    }

    if (fileData === null && last_err !== null) {
        throw (last_err)
    }

    return fileData
}

async function getTemplate(owner, repo, ref, lifecycle) {
    let fileData = await githubClient.repos.getContent({
        owner,
        repo,
        ref,
        path: `/cloudformation/${lifecycle}/template.yml`
    })
    return Buffer.from(fileData.data.content, 'base64').toString()

}

async function getParameters(owner, repo, ref, lifecycle) {
    let fileData = await getConfigFileData(owner, repo, ref, `/cloudformation/${lifecycle}/${ENV}`)
    let infrastructureParameters = Buffer.from(fileData.data.content, 'base64').toString()
    let parsed = await parsedInfrastructureParameters(infrastructureParameters)
    return parsed
}

async function parsedInfrastructureParameters(infrastructureParameters, safe = false) {
    var parsed = yaml.safeLoad(infrastructureParameters)

    for (var pair of parsed) {
        if (pair.ParameterKey == 'QuayTag') {
            pair.ParameterValue = SHA
        } else if (pair.ParameterKey == 'VerticalName') {
            pair.ParameterValue = VERTICAL
        } else if (pair.ParameterKey == 'GitSha') {
            pair.ParameterValue = SHA
        }
    }

    return parsed
}


module.exports = (async () => {
    var credentials = new AWS.Credentials({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })

    if (ENV === "dev" || ENV === "prod") {
        console.log("Set environment from qa or prod")
        CLOUDFORMATION = new AWS.CloudFormation({ credentials: credentials, region: REGION })
    }
    else {
        core.setFailed('Failed action to deploy');
        return false
    }

    await deploy(LIFECYCLE)

})()