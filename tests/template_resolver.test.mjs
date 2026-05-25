import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { resolveTemplatePaths } from "../pipeline/templateResolver.mjs";

const appRoot = path.resolve(".");

test("resolveTemplatePaths defaults group templates to template1", () => {
  const result = resolveTemplatePaths({ appRoot, templateName: "G1_github" });

  assert.equal(result.templateName, "G1_github");
  assert.equal(result.variantName, "template1");
  assert.equal(result.templateDir, path.join(appRoot, "templates", "G1_github", "template1"));
  assert.equal(result.templateFilePath, path.join(appRoot, "templates", "G1_github", "template1", "template.mjs"));
  assert.equal(result.stylePath, path.join(appRoot, "templates", "G1_github", "template1", "style.css"));
});

test("resolveTemplatePaths uses explicit subtemplate", () => {
  const result = resolveTemplatePaths({
    appRoot,
    templateName: "G2_docker",
    subtemplateName: "template3",
  });

  assert.equal(result.variantName, "template3");
  assert.equal(result.templateDir, path.join(appRoot, "templates", "G2_docker", "template3"));
});

test("resolveTemplatePaths accepts template_variant as an alias", () => {
  const result = resolveTemplatePaths({
    appRoot,
    templateName: "G3_web",
    templateVariant: "template2",
  });

  assert.equal(result.variantName, "template2");
  assert.equal(result.templateDir, path.join(appRoot, "templates", "G3_web", "template2"));
});

test("resolveTemplatePaths rejects unsafe names", () => {
  assert.throws(
    () => resolveTemplatePaths({ appRoot, templateName: "../G1_github" }),
    /Invalid template name/,
  );

  assert.throws(
    () => resolveTemplatePaths({ appRoot, templateName: "G1_github", subtemplateName: "../template1" }),
    /Invalid template variant/,
  );
});
