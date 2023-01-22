import {NamedLink, sendWebhookMessage, updateReadmeFile, Webhook, GitHub} from "./functions";
import {getInput} from "@actions/core";
import * as gh from "@actions/github";

interface Inputs {
  github?: GitHub;
  webhook?: Webhook;
}

function getInputs(): Inputs {
  const [mcVersion, modVersion] = getInput("version", {
    required: true,
    trimWhitespace: true
  }).split("-", 2);
  const version = {mcVersion, modVersion};
  const webhookUrl = getInput("webhook-url", {
    required: false,
    trimWhitespace: true
  });
  const githubToken = getInput("github-token", {
    required: false,
    trimWhitespace: true
  });
  const links: NamedLink[] = getInput("published-to", {
    required: true,
    trimWhitespace: true
  })
    .split(",")
    .map((s: string) => s.trim())
    .map((name: string) => {
      const link = getInput(`${name}-link`, {
        required: true,
        trimWhitespace: true
      });
      return {
        name,
        link
      };
    });
  const webhookName = getInput("webhook-name", {
    required: false,
    trimWhitespace: true
  });
  const webhookAvatar = getInput("webhook-avatar", {
    required: false,
    trimWhitespace: true
  });
  const title =
    getInput("webhook-title", {
      required: false,
      trimWhitespace: true
    }) ?? "New version {version} released!";
  let webhook: Webhook | undefined;
  if (webhookUrl) {
    const description = getInput("webhook-message", {
      required: true,
      trimWhitespace: true
    });
    webhook = {
      url: webhookUrl,
      name: webhookName,
      avatar: webhookAvatar,
      message: {
        version,
        title,
        description,
        fields: links.map(f => ({name: f.name, value: `[Download](${f.link})`}))
      }
    };
  }
  let github: GitHub | undefined;
  if (githubToken) {
    const readmeTemplateFile = getInput("readme-template", {
      required: true,
      trimWhitespace: true
    });
    const updateMessage =
      getInput("github-update-message", {
        required: false,
        trimWhitespace: true
      }) ?? "Update README.md for Release {version}";
    github = {
      updateMessage,
      readmeTemplateFile,
      links,
      version,
      context: gh.context,
      getOctokit: () => gh.getOctokit(githubToken)
    };
  }
  if (!github && !webhook) {
    throw new Error("No inputs provided");
  }
  return {github, webhook};
}

export async function run(): Promise<void> {
  const {github, webhook} = getInputs();
  if (webhook) {
    await sendWebhookMessage(webhook);
  }
  if (github) {
    await updateReadmeFile(github);
  }
}
