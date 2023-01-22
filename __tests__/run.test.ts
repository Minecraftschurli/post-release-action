import {expect, test, beforeAll} from "@jest/globals"
import {load} from "js-yaml"
import {readFileSync} from "fs";
import {getInputs, run} from "../src/run";

beforeAll(() => {
  const workflow = load(readFileSync("./.github/workflows/test.yml", "utf8")) as any;
  const parameters = workflow.jobs.test.steps[1].with;
  Object.entries(parameters).forEach(([key, value]) => {
    if ((value as string).startsWith("${{") && process.env["TEST_WEBHOOK_URL"]) {
      value = (value as string).replace("${{ secrets.TEST_WEBHOOK_URL }}", process.env["TEST_WEBHOOK_URL"])
    }
    process.env[`INPUT_${key.toUpperCase()}`] = value as string;
  });
});

test("test getInputs", () => {

  const inputs = getInputs();

  expect(inputs.github).toBeUndefined();
  expect(inputs.webhook).toBeDefined();
  expect(inputs.webhook?.url).toBe(process.env["TEST_WEBHOOK_URL"] ?? "${{ secrets.TEST_WEBHOOK_URL }}");
  expect(inputs.webhook?.name).toBe("Test Webhook");
  expect(inputs.webhook?.message).toBeDefined();
  expect(inputs.webhook?.message?.version).toStrictEqual({mcVersion: "1.1.1", modVersion: "1.0.0"});
  expect(inputs.webhook?.message?.fields).toBeDefined();
  expect(inputs.webhook?.message?.fields?.length).toBe(2);
  expect(inputs.webhook?.message?.fields?.[0].name).toBe("Modrinth");
  expect(inputs.webhook?.message?.fields?.[1].name).toBe("CurseForge");
  expect(inputs.webhook?.name).toBeUndefined();
  expect(inputs.webhook?.avatar).toBeUndefined();
  expect(inputs.webhook?.message?.title).toBe("Test Message for {version}");
  expect(inputs.webhook?.message?.description).toBe("This is a test message for {version}");
});

test("test run", async () => {
  await expect(run()).resolves.toBeUndefined();
});
