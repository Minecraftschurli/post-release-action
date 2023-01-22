import {expect, test} from "@jest/globals"
import {load} from "js-yaml"
import {readFileSync} from "fs";
import {getInputs} from "../src/run";

test("test getInputs", () => {
  const workflow = load(readFileSync("./.github/workflows/test.yml", "utf8")) as any;
  const parameters = workflow.jobs.test.steps[1].with;
  Object.entries(parameters).forEach(([key, value]) => {
    process.env[`INPUT_${key.toUpperCase()}`] = value as string;
  });
  const inputs = getInputs();
  expect(inputs.github).toBeUndefined();
  expect(inputs.webhook).toBeDefined();
  expect(inputs.webhook?.url).toBe("${{ secrets.TEST_WEBHOOK_URL }}");
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
})
