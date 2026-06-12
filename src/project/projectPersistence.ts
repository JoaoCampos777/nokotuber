import { get } from "svelte/store";
import { project, loadProject } from "./projectStore";
import { expressionState, applyExpressions, resetProjectState } from "./expressionStore";
import { room, applyRoom, resetRoom } from "../room/roomStore";
import { audioRouting, applyAudioRouting, defaultAudioRouting } from "../audio/audioBindingStore";
import { participantEffects, applyParticipantEffects } from "../effects/participantEffectsStore";
import { companionRoom, applyCompanionRoom, resetCompanionRoom } from "../companion/companionStore";


/** Monta o objeto completo salvo no .noko: projeto + sala + áudio + efeitos + expressões. */
export function collectProjectFile(): any {
  return {
    ...get(project),
    room:              get(room),
    audioRouting:      get(audioRouting),
    participantEffects: get(participantEffects),
    expressions:       get(expressionState),
    companionRoom:     get(companionRoom),
  };

}

/** Carrega um .noko: aplica o núcleo (com migração) e distribui as seções extras. */
export function loadProjectFile(content: string, path: string): void {
  let raw: any;
  try { raw = JSON.parse(content); }
  catch { throw new Error("Arquivo inválido: não é um JSON válido."); }
  if (!raw || typeof raw !== "object") throw new Error("Arquivo inválido: estrutura desconhecida.");

  // Separa as seções novas do núcleo do projeto (que mantém o formato antigo).
  const { room: rawRoom, audioRouting: rawRouting, participantEffects: rawEffects, expressions: rawExpr, companionRoom: rawCompanion, ...core } = raw;

  // Núcleo: valida imagens, migra view/effects, define currentProjectPath.
  loadProject(JSON.stringify(core), path);

  // Seções extras — só aplica o que existir no arquivo (projetos antigos preservam o estado atual,
  // sem zerar sala/expressões que você já tenha em memória).
  // Ordem: sala por ÚLTIMO, para os "ensure" reconciliarem contra routing/efeitos já aplicados.
  if (rawRouting !== undefined) applyAudioRouting(rawRouting);
  if (rawEffects !== undefined) applyParticipantEffects(rawEffects);
  if (rawExpr    !== undefined) applyExpressions(rawExpr);
  if (rawRoom    !== undefined) applyRoom(rawRoom);
  if (rawCompanion !== undefined) applyCompanionRoom(rawCompanion);
}

/** Reseta as seções para um projeto novo (o núcleo é resetado por newProject no chamador). */
export function resetProjectFile(): void {
  audioRouting.set(defaultAudioRouting());
  participantEffects.set([]);
  resetProjectState();
  resetCompanionRoom();
  resetRoom();   // por último → recria bindings/efeitos padrão para os participantes padrão
}