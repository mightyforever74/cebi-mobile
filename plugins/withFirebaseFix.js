const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function findPostInstallBlockEndIndex(podfile) {
  const start = podfile.search(/^\s*post_install\s+do\s+\|installer\|\s*$/m);
  if (start === -1) return { start: -1, end: -1 };

  const lines = podfile.slice(start).split("\n");
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const code = line.replace(/#.*/, "");
    const doCount = (code.match(/\bdo\b/g) || []).length;
    const endCount = (code.match(/\bend\b/g) || []).length;
    depth += doCount;
    depth -= endCount;

    if (i > 0 && depth === 0) {
      const prefix = podfile.slice(0, start);
      const scanned = lines.slice(0, i).join("\n");
      const endLineOffset = prefix.length + scanned.length + 1;
      return { start, end: endLineOffset };
    }
  }
  return { start, end: -1 };
}

module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (
        podfile.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"
        )
      ) {
        return config;
      }

      const firebaseFix = `
  # Firebase non-modular header fix (RNFB + use_frameworks)
  installer.pods_project.targets.each do |target|
    if target.name.start_with?('RNFB')
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      end
    end
  end
`;

      const { start, end } = findPostInstallBlockEndIndex(podfile);

      if (start !== -1 && end !== -1) {
        podfile = podfile.slice(0, end) + firebaseFix + podfile.slice(end);
      } else {
        podfile += `

post_install do |installer|
  react_native_post_install(installer)
${firebaseFix}
end
`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
