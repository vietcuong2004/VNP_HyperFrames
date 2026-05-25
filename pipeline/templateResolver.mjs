import path from "path";

const SAFE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

function assertSafeName(value, label) {
  if (!SAFE_NAME_PATTERN.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

export function resolveTemplatePaths({
  appRoot,
  templateName,
  subtemplateName,
  templateVariant,
}) {
  const resolvedTemplateName = templateName || "G3_web";
  const variantName = subtemplateName || templateVariant || "template1";

  assertSafeName(resolvedTemplateName, "template name");
  assertSafeName(variantName, "template variant");

  const templateDir = path.join(appRoot, "templates", resolvedTemplateName, variantName);

  return {
    templateName: resolvedTemplateName,
    variantName,
    templateDir,
    templateFilePath: path.join(templateDir, "template.mjs"),
    templateImportPath: `file://${path.join(templateDir, "template.mjs").replace(/\\/g, "/")}`,
    stylePath: path.join(templateDir, "style.css"),
  };
}
