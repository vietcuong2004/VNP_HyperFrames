import assert from "node:assert/strict";
import { test } from "node:test";

import { selectTemplateVariant } from "../pipeline/main_generateContent.js";

test("GitHub formats map to distinct template variants", () => {
  assert.equal(selectTemplateVariant("github", "repo_overview_with_use_cases"), "template1");
  assert.equal(selectTemplateVariant("github", "knowledge_map_resource_digest"), "template2");
  assert.equal(selectTemplateVariant("github", "dataset_explainer"), "template2");
  assert.equal(selectTemplateVariant("github", "developer_integration_brief"), "template3");
  assert.equal(selectTemplateVariant("github", "tool_review_quick_demo"), "template3");
});

test("Docker formats map to distinct template variants", () => {
  assert.equal(selectTemplateVariant("docker", "container_overview"), "template1");
  assert.equal(selectTemplateVariant("docker", "container_quick_start"), "template1");
  assert.equal(selectTemplateVariant("docker", "self_host_setup_guide"), "template2");
  assert.equal(selectTemplateVariant("docker", "dev_workflow_image_brief"), "template3");
});

test("Web formats map to distinct template variants", () => {
  assert.equal(selectTemplateVariant("web", "web_context_digest"), "template1");
  assert.equal(selectTemplateVariant("web", "web_docs_explainer"), "template2");
  assert.equal(selectTemplateVariant("web", "web_article_digest"), "template2");
  assert.equal(selectTemplateVariant("web", "web_tool_overview"), "template3");
  assert.equal(selectTemplateVariant("web", "web_product_brief"), "template3");
});

test("unknown platform or format falls back to template1", () => {
  assert.equal(selectTemplateVariant("unknown", "whatever"), "template1");
  assert.equal(selectTemplateVariant("github", "new_future_format"), "template1");
});
