import {APIEmbed, APIEmbedField, APIMessage} from "discord-api-types/v10";
import {WebhookClient, WebhookCreateMessageOptions} from "discord.js";
import * as gh from "@actions/github";

export interface Version {
  mcVersion: string;
  modVersion: string;
}

export interface WebhookMessage {
  version: Version;
  title: string;
  description?: string;
  fields: APIEmbedField[];
}

export interface Webhook {
  url: string;
  name?: string;
  avatar?: string;
  message: WebhookMessage;
}

export interface GitHub {
  updateMessage: string;
  version: Version;
  links: NamedLink[];
  readmeTemplateFile: string;
  context: typeof gh.context;
  getOctokit: () => ReturnType<typeof gh.getOctokit>;
}

export interface NamedLink {
  name: string;
  link: string;
}

export interface VersionTableRow {
  mcVersion: string;
  modVersion: string;
  supported: boolean;
  links: NamedLink[];
}

export async function sendWebhookMessage(webhook: Webhook): Promise<APIMessage> {
  const webhookClient = new WebhookClient({url: webhook.url});
  const version = `${webhook.message.version.mcVersion}-${webhook.message.version.modVersion}`;
  let author: APIEmbed["author"] | undefined;
  if (webhook.name) {
    author = {
      name: webhook.name,
      icon_url: webhook.avatar
    };
  }
  const title = webhook.message.title.replace("{version}", version);
  const description = webhook.message.description?.replace?.("{version}", version);
  const color = 0x00ff00;
  const fields = webhook.message.fields.map((f, _, a) => ({...f, inline: a.length <= 3}));
  return await webhookClient.send({
    username: webhook.name,
    avatarURL: webhook.avatar,
    embeds: [
      {
        author,
        title,
        description,
        color,
        fields
      }
    ]
  } as WebhookCreateMessageOptions);
}

export function parseMarkdownTable(markdown: string): string[][] | null {
  const tableRegex = /\|(?:([^\r\n|]*)\|)+\r?\n\|(?:(:?-+:?)\|)+\r?\n(\|(?:([^\r\n|]*)\|)+\r?\n)+/gm;
  const table = markdown.match(tableRegex);

  const rowMapper = (row: string): string[] => {
    return row
      .split("|")
      .slice(1, -1)
      .map(s => s.trim());
  };

  return table?.[0]?.split?.("\n")?.slice?.(0, -1)?.map?.(rowMapper) ?? null;
}

export function deconstructLink(markdownLink: string): NamedLink {
  const match = /\[(.*)]\((.*)\)/.exec(markdownLink);
  if (!match) {
    throw new Error(`Invalid link: ${markdownLink}`);
  }
  return {
    name: match[1],
    link: match[2]
  };
}

export function constructLink(published: NamedLink): string {
  return `[${published.name}](${published.link})`;
}

export function constructTableRow(row: VersionTableRow): string[] {
  return [row.mcVersion, row.modVersion, row.supported ? "✅" : "❌", row.links.map(constructLink).join(" / ")];
}

export function formatMarkdownTable(data: string[][], headings: string[]): string {
  const maxLengths = headings.map(heading => heading.length);
  for (const row of data) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      maxLengths[i] = Math.max(maxLengths[i], cell.length);
    }
  }

  const formatCell = (cell: string, i: number): string => {
    return cell.padStart(Math.floor((maxLengths[i] - cell.length) / 2) + cell.length + 1).padEnd(maxLengths[i] + 2);
  };

  const formatRow = (row: string[]): string => `|${row.map(formatCell).join("|")}|`;

  const formatSpacer = (len: number): string => `:${"-".repeat(len)}:`;

  return `${formatRow(headings)}\n|${maxLengths.map(formatSpacer).join("|")}|\n${data.map(formatRow).join("\n")}`;
}

export function parseVersionTable(versionTable: string[][]): [string[], Map<string, VersionTableRow>] {
  const versionMap = new Map<string, VersionTableRow>();
  for (const [mcVersion, modVersion, supported, links] of versionTable.slice(2)) {
    versionMap.set(mcVersion, {
      mcVersion,
      modVersion,
      supported: supported === "✅",
      links: links.split(" / ").map(deconstructLink)
    });
  }
  return [versionTable[0], versionMap];
}

export function updateReadme(
  {links, version}: Pick<GitHub, "links" | "version">,
  oldReadme: string,
  readmeTemplate: string
): string {
  const oldVersionTable = parseMarkdownTable(oldReadme);
  if (!oldVersionTable) {
    throw new Error("Could not parse version table");
  }
  const [headerRow, versionMap] = parseVersionTable(oldVersionTable);
  versionMap.set(version.mcVersion, {
    ...version,
    supported: true,
    links
  });
  const newVersionTable = Array.from(versionMap.values()).map(constructTableRow);
  return readmeTemplate.replace(/\{\{versionTable}}/g, formatMarkdownTable(newVersionTable, headerRow));
}

export async function updateFile(github: GitHub, file: string, updater: (oldContent: string) => string): Promise<void> {
  const octokit = github.getOctokit();
  const repo = github.context.repo;
  const {
    data: {content: oldFileBase64, sha: fileSha}
  } = (await octokit.rest.repos.getContent({
    ...repo,
    path: file
  })) as {data: {content: string; sha: string}};
  const oldFile = Buffer.from(oldFileBase64, "base64").toString("utf8");
  const newFile = updater(oldFile);
  await octokit.rest.repos.createOrUpdateFileContents({
    ...repo,
    path: file,
    message: github.updateMessage.replace("{version}", `${github.version.mcVersion}-${github.version.modVersion}`),
    content: Buffer.from(newFile).toString("base64"),
    sha: fileSha
  });
}

export async function updateReadmeFile(github: GitHub): Promise<void> {
  const octokit = github.getOctokit();
  const repo = github.context.repo;
  const {
    data: {content: readmeTemplateBase64}
  } = (await octokit.rest.repos.getContent({
    ...repo,
    path: github.readmeTemplateFile
  })) as {data: {content: string}};
  const readmeTemplate = Buffer.from(readmeTemplateBase64, "base64").toString("utf8");
  await updateFile(github, "README.md", oldReadme => updateReadme(github, oldReadme, readmeTemplate));
}
