/**
 * Configuração central de identidade do Nokotuber.
 * Edite este arquivo para trocar nome, criador, contatos, cores e etc.
 */

export const APP_NAME    = "Nokotuber";
export const APP_TAGLINE = "Ferramenta de PNGTuber para streamers";
export const APP_VERSION = "0.2.0";

export const APP_CREATOR = {
  name: "Campos",
  role: "Desenvolvedor & Designer",
};

export const APP_CONTACT = {
  email:     "nokonokodraw@gmail.com",
  discord:   "https://discord.gg/yWSTraeDJy",
  instagram: "nokonoko_art",
};

export const APP_PARTNERSHIP = {
  enabled:      true,
  title:        "Parcerias e propaganda",
  description:  "Quer divulgar sua marca, produto ou serviço dentro do Nokotuber? Entre em contato para discutirmos espaços patrocinados, parcerias com criadores e oportunidades comerciais.",
  ctaLabel:     "Contato comercial",
};

export const APP_COLORS = {
  bgDeep:    "#261f1f",   // fundo mais profundo (sidebar)
  bgPanel:   "#27282c",   // painéis principais
  bgPanel2:  "#1f2024",   // painel alternativo
  bgHover:   "#3a2c2c",   // hover de elementos
  border:    "#583535",   // bordas e divisores
  accent:    "#a21837",   // botões principais, destaques
  accentHi:  "#c41f44",   // hover do acento
  accentLo:  "#4a1018",   // background sutil do acento
  textHi:    "#f4ebe8",   // texto principal
  textMd:    "#b8a8a4",   // texto secundário
  textLo:    "#7a6664",   // texto desabilitado
  success:   "#4caf82",
  warning:   "#e8a94a",
  danger:    "#c41f44",
} as const;