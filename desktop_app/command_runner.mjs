import { spawnSync } from "child_process";

function needsCmdShim(command, platform) {
  return platform === "win32" && /\.cmd$/i.test(command);
}

export function createSpawnCommand(command, args = [], options = {}) {
  const platform = options.platform ?? process.platform;
  if (!needsCmdShim(command, platform)) {
    return { command, args, shell: false };
  }

  return {
    command: String(command).replace(/\//g, "\\"),
    args,
    shell: true,
  };
}

export function runCommand(command, args = [], options = {}) {
  const spawnCommand = createSpawnCommand(command, args, options);
  const result = spawnSync(spawnCommand.command, spawnCommand.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    encoding: options.encoding,
    shell: spawnCommand.shell,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Command ${command} failed with exit code ${result.status}${output ? `\n${output}` : ""}`);
  }
  return result;
}
