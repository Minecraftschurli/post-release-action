import {parseMarkdownTable, updateReadme} from "../src/functions";
import {expect, test} from "@jest/globals";

const table = `
| Minecraft Version | Latest Mod Version | Supported | Download |
|:-----------------:|:------------------:|:---------:|:--------:|
|      1.18.1       |       0.1.5        |     ❌     | [CurseForge](https://mc-mods.cf/ars-magica-legacy/files/3656337) |
|      1.18.2       |       1.2.4        |     ✅     | [CurseForge](https://mc-mods.cf/ars-magica-legacy/files/4343592) / [Modrinth](https://modrinth.com/mod/ars-magica-legacy/version/1.18.2-1.2.4) |
|      1.19.2       |       1.2.4        |     ✅     | [CurseForge](https://mc-mods.cf/ars-magica-legacy/files/4341463) / [Modrinth](https://modrinth.com/mod/ars-magica-legacy/version/1.19.2-1.2.4) |
`

const table2 = `
| Minecraft Version | Latest Mod Version | Supported |                                                                    Download                                                                    |
|:-----------------:|:------------------:|:---------:|:----------------------------------------------------------------------------------------------------------------------------------------------:|
|      1.18.1       |       0.1.5        |     ❌     |                                        [CurseForge](https://mc-mods.cf/ars-magica-legacy/files/3656337)                                        |
|      1.18.2       |       1.2.4        |     ✅     | [CurseForge](https://mc-mods.cf/ars-magica-legacy/files/4343592) / [Modrinth](https://modrinth.com/mod/ars-magica-legacy/version/1.18.2-1.2.4) |
|      1.19.2       |       1.2.5        |     ✅     |                                                                                                                                                |
`

test("test parseMarkdownTable", () => {
  const parsed = parseMarkdownTable(table);
  expect(parsed).not.toBeNull();
  expect(parsed).toHaveLength(5);
  expect(parsed![0]).toEqual(["Minecraft Version", "Latest Mod Version", "Supported", "Download"]);
  expect(parseMarkdownTable("")).toBeNull();
});


test("test updateReadme", () => {
  const updated = updateReadme({version: {mcVersion: "1.19.2", modVersion: "1.2.5"}, links: []}, table, "\n{{versionTable}}\n");
  expect(updated).toEqual(table2);
});