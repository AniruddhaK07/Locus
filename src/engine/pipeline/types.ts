/**
 * Locus Engine — Search Pipeline Types
 */

import type {
  AreaDetail,
  AreaId,
  AreaSummary,
  Preferences,
  SearchStage,
  SearchState
} from "../domain/types";

export interface PipelineCallbacks {
  onStateChange: (state: SearchState) => void;
}

export interface PipelineOptions {
  candidateLimit?: number;
  abortSignal?: AbortSignal;
}

export interface PipelineContext {
  id: string;
  preferences: Preferences;
  stage: SearchStage;
  progress: number;
  statusMessage: string;
  areas: AreaSummary[];
  areaDetails: Map<AreaId, AreaDetail>;
  totalCandidates: number;
  errors: string[];
  localityErrors: Record<AreaId, string>;
  isComplete: boolean;
}
