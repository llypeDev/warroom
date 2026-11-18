import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "WARROOM",
  version: packageJson.version,
  copyright: `© ${currentYear}, WARROOM.`,
  meta: {
    title: "WARROOM — Console de pentest autônomo",
    description: "Console do sistema de pentest autônomo orientado por LLM",
  },
};
