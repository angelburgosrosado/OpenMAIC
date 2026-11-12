import { createLogger } from '@/lib/logger';
import { generateClassroom, type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import {
  markClassroomGenerationJobFailed,
  markClassroomGenerationJobRunning,
  markClassroomGenerationJobSucceeded,
  updateClassroomGenerationJobProgress,
} from '@/lib/server/classroom-job-store';
import { recordMediaUsage, type EntitlementKey } from '@/lib/server/monetization/entitlements';

const log = createLogger('ClassroomJob');
const runningJobs = new Map<string, Promise<void>>();

export function runClassroomGenerationJob(
  jobId: string,
  input: GenerateClassroomInput,
  baseUrl: string,
  entitlement?: EntitlementKey,
): Promise<void> {
  const existing = runningJobs.get(jobId);
  if (existing) {
    return existing;
  }

  const jobPromise = (async () => {
    try {
      await markClassroomGenerationJobRunning(jobId);

      let imagesGenerated = 0;
      let videoSecondsGenerated = 0;

      const result = await generateClassroom(input, {
        baseUrl,
        onProgress: async (progress) => {
          await updateClassroomGenerationJobProgress(jobId, progress);
        },
        onMediaGenerated: (generated) => {
          if (generated.type === 'image') {
            imagesGenerated += 1;
          } else {
            videoSecondsGenerated += generated.seconds;
          }
        },
      });

      if (entitlement && (imagesGenerated > 0 || videoSecondsGenerated > 0)) {
        try {
          await recordMediaUsage(entitlement, {
            images: imagesGenerated,
            videoSeconds: videoSecondsGenerated,
          });
        } catch (usageError) {
          log.error(`Failed to record media usage for job ${jobId}:`, usageError);
        }
      }

      await markClassroomGenerationJobSucceeded(jobId, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Classroom generation job ${jobId} failed:`, error);
      try {
        await markClassroomGenerationJobFailed(jobId, message);
      } catch (markFailedError) {
        log.error(`Failed to persist failed status for job ${jobId}:`, markFailedError);
      }
    } finally {
      runningJobs.delete(jobId);
    }
  })();

  runningJobs.set(jobId, jobPromise);
  return jobPromise;
}
