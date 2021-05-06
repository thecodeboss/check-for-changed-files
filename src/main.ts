import * as core from "@actions/core";
import * as github from "@actions/github";
import * as gh from "./gh";
import * as matching from "./matching";

export function repr(str: string): string {
  return JSON.stringify(str);
}

export function formatFailureMessage(
  template: string,
  prereqPattern: string,
  filePattern: string,
  skipLabel: string
): string {
  return template
    .replace("${prereq-pattern}", repr(prereqPattern))
    .replace("${file-pattern}", repr(filePattern))
    .replace("${skip-label}", repr(skipLabel));
}

export async function main(): Promise<void> {
  try {
    core.info("Started");
    const payload = gh.pullRequestPayload();
    if (payload === undefined) {
      core.info(
        `${repr(
          github.context.eventName
        )} is not a pull request event; skipping`
      );
      return;
    }

    core.info("1");

    const skipLabel = core.getInput("skip-label");
    const prLabels = gh.pullRequestLabels(payload);
    if (matching.hasLabelMatch(prLabels, skipLabel)) {
      core.info(`the skip label ${repr(skipLabel)} is set`);
      return;
    }

    core.info("2");

    const filePaths = await gh.changedFiles(payload);
    const prereqPattern =
      core.getInput("prereq-pattern") || matching.defaultPrereqPattern;
    if (!matching.anyFileMatches(filePaths, prereqPattern)) {
      core.info(
        `the prerequisite ${repr(
          prereqPattern
        )} file pattern did not match any changed files of the pull request`
      );
      return;
    }

    core.info("3");

    const filePattern = core.getInput("file-pattern", { required: true });
    if (matching.anyFileMatches(filePaths, filePattern)) {
      core.info(
        `the ${repr(
          filePattern
        )} file pattern matched the changed files of the pull request`
      );
      return;
    }

    core.info("4");

    const failureMessage = core.getInput("failure-message");

    core.setFailed(
      formatFailureMessage(
        failureMessage,
        prereqPattern,
        filePattern,
        skipLabel
      )
    );

    core.info("5");
  } catch (error) {
    core.info("6");
    core.setFailed(JSON.stringify(error, undefined, 2));
  }
}
